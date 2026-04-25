'use strict';

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const http = require('http');
const path = require('path');

const { scrapeInternshala } = require('./scrapers/internshala');
const { scrapeUnstop } = require('./scrapers/unstop');
const { scrapeNaukri } = require('./scrapers/naukri');
const { scrapeJSearch } = require('./scrapers/jsearch');
const { applyAllFilters } = require('./utils/filter');
const { buildDigestMessageHTML } = require('./utils/formatter');

const TOKEN = process.env.TELEGRAM_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_TOKEN not set in environment. Create a .env file.');
  process.exit(1);
}

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PORT = Number(process.env.PORT || 10000);
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/telegram-webhook';
const IS_RENDER = process.env.RENDER === 'true' || !!process.env.RENDER_EXTERNAL_HOSTNAME;

function normalizeBaseUrl(url) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function resolveWebhookBaseUrl() {
  if (process.env.WEBHOOK_URL) return normalizeBaseUrl(process.env.WEBHOOK_URL);
  if (process.env.RENDER_EXTERNAL_URL) return normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL);
  if (process.env.RENDER_EXTERNAL_HOSTNAME) return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
  return '';
}

const bot = new TelegramBot(TOKEN, IS_RENDER ? {} : { polling: true });
console.log(IS_RENDER ? 'JobBot is starting in webhook mode...' : 'JobBot is running in polling mode...');

const ALL_ROLES = [
  { label: 'Software Engineer', callback: 'role_software_engineer' },
  { label: 'Frontend Developer', callback: 'role_frontend_developer' },
  { label: 'Backend Developer', callback: 'role_backend_developer' },
  { label: 'Full Stack Developer', callback: 'role_full_stack_developer' },
  { label: 'Mobile App Developer', callback: 'role_mobile_app_developer' },
  { label: 'Data Analyst', callback: 'role_data_analyst' },
  { label: 'Data Scientist', callback: 'role_data_scientist' },
  { label: 'Machine Learning Engineer', callback: 'role_machine_learning_engineer' },
  { label: 'Product Manager', callback: 'role_product_manager' },
  { label: 'UI/UX Designer', callback: 'role_ui_ux_designer' },
  { label: 'Graphic Designer', callback: 'role_graphic_designer' },
  { label: 'DevOps Engineer', callback: 'role_devops_engineer' },
  { label: 'QA / Test Engineer', callback: 'role_qa_test_engineer' },
  { label: 'Cybersecurity Analyst', callback: 'role_cybersecurity_analyst' },
  { label: 'Business Analyst', callback: 'role_business_analyst' },
  { label: 'Sales / Business Development', callback: 'role_sales_business_development' },
  { label: 'Digital Marketing', callback: 'role_digital_marketing' },
  { label: 'Content Writer', callback: 'role_content_writer' },
  { label: 'Finance / Accounts', callback: 'role_finance_accounts' },
  { label: 'HR / Recruiter', callback: 'role_hr_recruiter' }
];

const EXP_OPTIONS = [
  { label: 'Fresher / Student (0 years)', callback: 'exp_fresher', value: 'Fresher / Student (0 years)' },
  { label: 'Junior (0-2 years)', callback: 'exp_junior', value: 'Junior (0-2 years)' },
  { label: 'Mid-level (2-5 years)', callback: 'exp_mid', value: 'Mid-level (2-5 years)' },
  { label: 'Senior (5+ years)', callback: 'exp_senior', value: 'Senior (5+ years)' }
];

const sessions = {};

function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = { step: 'idle', selectedRoles: [], roleMessageId: null };
  }
  return sessions[chatId];
}

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return { users: [] };
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const users = Array.isArray(parsed?.users) ? parsed.users : [];

    return {
      users: users.map(user => ({
        username: null,
        first_name: null,
        last_name: null,
        last_seen_at: null,
        ...user
      }))
    };
  } catch {
    return { users: [] };
  }
}

function saveUsers(data) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function buildUserSnapshot(chat, from) {
  return {
    username: from?.username || null,
    first_name: from?.first_name || chat?.first_name || null,
    last_name: from?.last_name || chat?.last_name || null,
    last_seen_at: new Date().toISOString()
  };
}

function upsertUser(chatId, updates) {
  const data = loadUsers();
  const idx = data.users.findIndex(u => u.chat_id === chatId);
  if (idx >= 0) {
    data.users[idx] = { ...data.users[idx], ...updates };
  } else {
    data.users.push({ chat_id: chatId, joined_at: new Date().toISOString(), ...updates });
  }
  saveUsers(data);
}

function trackUserFromMessage(msg, extraUpdates = {}) {
  if (!msg?.chat?.id) return;
  upsertUser(msg.chat.id, {
    ...buildUserSnapshot(msg.chat, msg.from),
    ...extraUpdates
  });
}

function trackUserFromCallback(query, extraUpdates = {}) {
  if (!query?.message?.chat?.id) return;
  upsertUser(query.message.chat.id, {
    ...buildUserSnapshot(query.message.chat, query.from),
    ...extraUpdates
  });
}

function getUserById(chatId) {
  const data = loadUsers();
  return data.users.find(u => u.chat_id === chatId) || null;
}

function buildRoleKeyboard(selectedRoles) {
  const buttons = [];
  for (let i = 0; i < ALL_ROLES.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, ALL_ROLES.length); j++) {
      const role = ALL_ROLES[j];
      const isSelected = selectedRoles.includes(role.label);
      row.push({
        text: isSelected ? `Selected: ${role.label}` : role.label,
        callback_data: role.callback
      });
    }
    buttons.push(row);
  }
  buttons.push([{ text: 'Done selecting roles', callback_data: 'roles_done' }]);
  return { inline_keyboard: buttons };
}

function buildExpKeyboard() {
  return {
    inline_keyboard: EXP_OPTIONS.map(opt => [{ text: opt.label, callback_data: opt.callback }])
  };
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  session.step = 'selecting_roles';
  session.selectedRoles = [];
  session.roleMessageId = null;

  trackUserFromMessage(msg, {
    started_at: new Date().toISOString(),
    onboarding_status: 'started'
  });

  console.log(`/start from ${chatId}`);

  const text = [
    '*Welcome to JobBot!*',
    "I'll send you job listings from the last 24 hours every morning.",
    "Let's set up your preferences first.",
    '',
    '*Step 1 of 2: Choose your job roles*',
    "Select up to 3 roles you're interested in:",
    '_(tap to select, tap again to deselect)_'
  ].join('\n');

  const sent = await bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: buildRoleKeyboard([])
  });

  session.roleMessageId = sent.message_id;
});

bot.onText(/\/now/, async (msg) => {
  const chatId = msg.chat.id;
  trackUserFromMessage(msg);
  const user = getUserById(chatId);

  if (!user || !user.roles || user.roles.length === 0) {
    await bot.sendMessage(chatId, "You haven't set up your preferences yet. Send /start to get started.");
    return;
  }

  await bot.sendMessage(chatId, 'Fetching jobs for you right now. This may take a moment.');

  try {
    const jobs = await fetchJobsForUser(user);
    const message = buildDigestMessageHTML(jobs, user);
    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  } catch (err) {
    console.error(`[/now] Error for ${chatId}:`, err.message);
    await bot.sendMessage(chatId, 'Something went wrong while fetching jobs. Please try again later.');
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const session = getSession(chatId);

  trackUserFromCallback(query, {
    onboarding_status: session.step === 'done' ? 'completed' : 'in_progress'
  });

  if (data.startsWith('role_')) {
    const role = ALL_ROLES.find(r => r.callback === data);
    if (!role) {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    const alreadySelected = session.selectedRoles.includes(role.label);

    if (!alreadySelected && session.selectedRoles.length >= 3) {
      await bot.answerCallbackQuery(query.id, {
        text: 'Max 3 roles. Deselect one first.',
        show_alert: true
      });
      return;
    }

    if (alreadySelected) {
      session.selectedRoles = session.selectedRoles.filter(r => r !== role.label);
    } else {
      session.selectedRoles.push(role.label);
    }

    try {
      await bot.editMessageReplyMarkup(
        buildRoleKeyboard(session.selectedRoles),
        { chat_id: chatId, message_id: session.roleMessageId }
      );
    } catch {
      // Ignore edit races for unchanged markup.
    }

    await bot.answerCallbackQuery(query.id);
    return;
  }

  if (data === 'roles_done') {
    if (session.selectedRoles.length === 0) {
      await bot.answerCallbackQuery(query.id, {
        text: 'Please select at least 1 role before continuing.',
        show_alert: true
      });
      return;
    }

    session.step = 'selecting_experience';
    await bot.answerCallbackQuery(query.id);

    await bot.sendMessage(chatId, [
      '*Step 2 of 2: Your experience level*',
      'Select the option that best describes you:'
    ].join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: buildExpKeyboard()
    });
    return;
  }

  if (data.startsWith('exp_')) {
    const expOption = EXP_OPTIONS.find(e => e.callback === data);
    if (!expOption) {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    const experience = expOption.value;
    session.step = 'done';

    upsertUser(chatId, {
      ...buildUserSnapshot(query.message.chat, query.from),
      roles: session.selectedRoles,
      experience,
      onboarding_status: 'completed',
      preferences_updated_at: new Date().toISOString()
    });

    console.log(`Saved prefs for ${chatId}: roles=${session.selectedRoles.join(', ')}, exp=${experience}`);

    await bot.answerCallbackQuery(query.id);

    const rolesDisplay = session.selectedRoles.join(', ');
    await bot.sendMessage(chatId, [
      "*All set! Here's your profile:*",
      '',
      `*Roles:* ${rolesDisplay}`,
      `*Experience:* ${experience}`,
      '',
      "You'll receive your first job digest tomorrow at 8 AM IST.",
      'To update preferences anytime, send /start again.',
      '',
      'Want the latest 24-hour jobs right now? Send /now'
    ].join('\n'), { parse_mode: 'Markdown' });
    return;
  }

  await bot.answerCallbackQuery(query.id);
});

async function fetchJobsForUser(user) {
  const isFresher = user.experience && user.experience.includes('Fresher');

  const results = await Promise.allSettled([
    (async () => {
      try { return await scrapeInternshala(isFresher, user.roles || [], user.experience || ''); }
      catch (e) { console.error('[Scraper] Internshala error:', e.message); return []; }
    })(),
    (async () => {
      try { return await scrapeUnstop(user.roles || [], user.experience || ''); }
      catch (e) { console.error('[Scraper] Unstop error:', e.message); return []; }
    })(),
    (async () => {
      try { return await scrapeNaukri(user.roles || [], user.experience || ''); }
      catch (e) { console.error('[Scraper] Naukri error:', e.message); return []; }
    })(),
    (async () => {
      try { return await scrapeJSearch(user.roles, user.experience); }
      catch (e) { console.error('[Scraper] JSearch error:', e.message); return []; }
    })()
  ]);

  const allJobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  console.log(`[fetch] Total raw jobs: ${allJobs.length}`);
  return applyAllFilters(allJobs, user, 5);
}

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

async function startWebhookServer() {
  const webhookBaseUrl = resolveWebhookBaseUrl();
  if (!webhookBaseUrl) {
    console.error('Webhook mode requires WEBHOOK_URL, RENDER_EXTERNAL_URL, or RENDER_EXTERNAL_HOSTNAME.');
    process.exit(1);
  }

  const webhookUrl = `${webhookBaseUrl}${WEBHOOK_PATH}`;

  await bot.deleteWebHook({ drop_pending_updates: false });
  await bot.setWebHook(webhookUrl);

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('JobBot webhook server is running.');
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && req.url === WEBHOOK_PATH) {
      let body = '';

      req.on('data', chunk => {
        body += chunk;
      });

      req.on('end', () => {
        try {
          const update = JSON.parse(body || '{}');
          bot.processUpdate(update);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          console.error('Webhook processing error:', error.message);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false }));
        }
      });

      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(PORT, () => {
    console.log(`Webhook server listening on port ${PORT}`);
    console.log(`Telegram webhook set to ${webhookUrl}`);
    console.log('Bot ready. Send /start in Telegram to begin onboarding.');
  });
}

if (IS_RENDER) {
  startWebhookServer().catch((error) => {
    console.error('Failed to start webhook server:', error.message);
    process.exit(1);
  });
} else {
  console.log('Bot ready. Send /start in Telegram to begin onboarding.');
}
