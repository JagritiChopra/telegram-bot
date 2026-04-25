'use strict';

const axios = require('axios');
const xml2js = require('xml2js');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0; +https://github.com/your-repo)',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*'
};

// Naukri RSS feeds: generic + fresher
const RSS_FEEDS_ALL = [
  'https://www.naukri.com/rss/jobs-in-india.rss',
  'https://www.naukri.com/rss/freshers-jobs.rss'
];

/**
 * Parse XML string to JS object
 * @param {string} xml
 * @returns {Promise<Object>}
 */
async function parseXML(xml) {
  return xml2js.parseStringPromise(xml, { explicitArray: false, trim: true });
}

/**
 * Scrape jobs from Naukri RSS feed, filtered by user roles and experience
 * @param {string[]} roles - user's selected role labels
 * @param {string} experience - user's experience level string
 * @returns {Promise<Array>}
 */
async function scrapeNaukri(roles = [], experience = '') {
  // Always fetch the generic feed; add fresher feed when relevant
  const RSS_FEEDS = experience && experience.includes('Fresher')
    ? RSS_FEEDS_ALL
    : [RSS_FEEDS_ALL[0]];
  const allJobs = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      console.log(`  [Naukri] Fetching RSS: ${feedUrl}`);
      const response = await axios.get(feedUrl, {
        headers: HEADERS,
        timeout: 15000,
        responseType: 'text'
      });

      const parsed = await parseXML(response.data);
      const channel = parsed?.rss?.channel;
      if (!channel || !channel.item) {
        console.log(`  [Naukri] No items in feed: ${feedUrl}`);
        continue;
      }

      const items = Array.isArray(channel.item) ? channel.item : [channel.item];
      console.log(`  [Naukri] Processing ${items.length} RSS items from ${feedUrl}`);

      for (const item of items) {
        try {
          const title = item.title || '';
          const url = item.link || item.guid?._ || item.guid || '';
          const pubDate = item.pubDate || item['dc:date'] || '';
          const description = item.description || '';

          // Extract company from description or title
          let company = '';
          const companyMatch = description.match(/Company:\s*([^\n<]+)/i) ||
                               description.match(/Employer:\s*([^\n<]+)/i);
          if (companyMatch) company = companyMatch[1].trim();

          // Extract location
          let location = 'India';
          const locationMatch = description.match(/Location:\s*([^\n<]+)/i) ||
                                description.match(/City:\s*([^\n<]+)/i);
          if (locationMatch) location = locationMatch[1].trim();

          if (title) {
            allJobs.push({
              title: stripHTML(title),
              company: company || 'Unknown Company',
              location,
              url: url || 'https://www.naukri.com/jobs-in-india',
              source: 'Naukri',
              pubDate,
              postedAt: pubDate,
              description: stripHTML(description).substring(0, 200)
            });
          }
        } catch {
          // skip bad item
        }
      }

      await delay(2000);
    } catch (err) {
      console.error(`  [Naukri] Feed ${feedUrl} failed: ${err.message}`);
    }
  }
  console.log(`  [Naukri] Returning ${allJobs.length} jobs before shared filters`);
  return allJobs;
}

function stripHTML(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeNaukri };