'use strict';

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const { scrapeInternshala } = require('./scrapers/internshala');
const { scrapeUnstop } = require('./scrapers/unstop');
const { scrapeNaukri } = require('./scrapers/naukri');
const { scrapeJSearch } = require('./scrapers/jsearch');
const { applyAllFilters } = require('./utils/filter');
const { buildDigestMessageHTML } = require('./utils/formatter');

// ─── Config ───────────────────────────────────────────────────────────────────

const TOKEN = process.env.TELEGRAM_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_TOKEN not set. Exiting.');
  process.exit(1);
}

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Use sendMessage only (no polling) for digest
const bot = new TelegramBot(TOKEN);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    console.log('⚠️  users.json not found. Nothing to send.');
    return [];
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.users) ? data.users : [];
  } catch (err) {
    console.error('❌ Failed to parse users.json:', err.message);
    return [];
  }
}

async function scrapeAllSources(user) {
  const isFresher = user.experience && user.experience.includes('Fresher');

  const results = await Promise.allSettled([
    (async () => {
      try { return await scrapeInternshala(isFresher, user.roles || [], user.experience || ''); }
      catch (e) { console.error('  [Scraper] Internshala:', e.message); return []; }
    })(),
    (async () => {
      try { return await scrapeUnstop(user.roles || [], user.experience || ''); }
      catch (e) { console.error('  [Scraper] Unstop:', e.message); return []; }
    })(),
    (async () => {
      try { return await scrapeNaukri(user.roles || [], user.experience || ''); }
      catch (e) { console.error('  [Scraper] Naukri:', e.message); return []; }
    })(),
    (async () => {
      try { return await scrapeJSearch(user.roles, user.experience); }
      catch (e) { console.error('  [Scraper] JSearch:', e.message); return []; }
    })()
  ]);

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

async function sendDigestToUser(user) {
  const chatId = user.chat_id;
  console.log(`\n👤 Processing user ${chatId} | roles: ${(user.roles || []).join(', ')} | exp: ${user.experience}`);

  try {
    const rawJobs = await scrapeAllSources(user);
    console.log(`  📦 Total raw jobs fetched: ${rawJobs.length}`);

    const filteredJobs = applyAllFilters(rawJobs, user, 5);
    console.log(`  ✅ Filtered jobs to send: ${filteredJobs.length}`);

    const message = buildDigestMessageHTML(filteredJobs, user);

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    console.log(`  📤 Digest sent to ${chatId}`);
  } catch (err) {
    console.error(`  ❌ Failed to send digest to ${chatId}: ${err.message}`);
    // Continue to next user
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 JobBot Daily Digest starting...');
  console.log(`⏰ Run time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);

  const users = loadUsers();

  if (users.length === 0) {
    console.log('📭 No users found in users.json. Exiting.');
    process.exit(0);
  }

  console.log(`👥 Found ${users.length} user(s) to process`);

  for (const user of users) {
    await sendDigestToUser(user);
    // Small delay between users to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n✅ Daily digest complete!');
}

main().catch(err => {
  console.error('💥 Fatal error in digest.js:', err);
  process.exit(1);
});
