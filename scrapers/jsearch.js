'use strict';

const axios = require('axios');

/**
 * Fetch jobs from JSearch API via RapidAPI
 * @param {string[]} roles - user's selected roles
 * @param {string} experience - user's experience level
 * @returns {Promise<Array>}
 */
async function scrapeJSearch(roles = [], experience = '') {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    console.log('  [JSearch] RAPIDAPI_KEY not set — skipping');
    return [];
  }

  const allJobs = [];
  const searchRoles = roles.length > 0 ? roles : ['software engineer'];

  try {
    for (const role of searchRoles) {
      const searchQuery = `${role} India`;
      console.log(`  [JSearch] Searching for: "${searchQuery}"`);

      const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
        params: {
          query: searchQuery,
          page: '1',
          num_pages: '1',
          date_posted: 'today'
        },
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        timeout: 15000
      });

      const data = response.data;
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.log(`  [JSearch] No results returned for "${searchQuery}"`);
        continue;
      }

      for (const item of data.data) {
        try {
          allJobs.push({
            title: item.job_title || 'Untitled',
            company: item.employer_name || 'Unknown Company',
            location: item.job_city
              ? `${item.job_city}, ${item.job_country || 'India'}`
              : (item.job_country || 'India'),
            url: item.job_apply_link || item.job_google_link || 'https://jsearch.p.rapidapi.com',
            source: 'JSearch',
            description: item.job_description?.substring(0, 200) || '',
            postedAt: item.job_posted_at_datetime_utc || item.job_posted_at_datetime || item.job_offer_expiration_datetime_utc || null,
            postedDate: item.job_posted_human_readable || ''
          });
        } catch {
          // skip
        }
      }
    }

    console.log(`  [JSearch] Found ${allJobs.length} jobs`);
  } catch (err) {
    console.error(`  [JSearch] API call failed: ${err.message}`);
  }

  return allJobs;
}

module.exports = { scrapeJSearch };
