'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://unstop.com/'
};

function getPostedAtFromUnstopItem(item) {
  const candidates = [
    item?.published_at,
    item?.publishedAt,
    item?.date_posted,
    item?.posted_at,
    item?.created_at,
    item?.updated_at,
    item?.start_date,
    item?.public_date,
    item?.seo_details?.published_at
  ].filter(Boolean);

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

/**
 * Scrape jobs from Unstop
 * @param {string[]} roles - user's selected role labels (used for keyword filtering)
 * @param {string} experience - user's experience level string
 * @returns {Promise<Array>}
 */
async function scrapeUnstop(roles = [], experience = '') {
  const jobs = [];

  // Map experience level to Unstop's work_exp param
  const EXP_PARAM_MAP = {
    'Fresher / Student (0 years)': '0',
    'Junior (0\u20132 years)': '0-2',
    'Mid-level (2\u20135 years)': '2-5',
    'Senior (5+ years)': '5+'
  };

  // Build a plain text keyword from the first role, for the Unstop search query
  const ROLE_SEARCH_TERMS = {
    'Software Engineer': 'software engineer',
    'Frontend Developer': 'frontend developer',
    'Backend Developer': 'backend developer',
    'Full Stack Developer': 'full stack developer',
    'Mobile App Developer': 'mobile app developer',
    'Data Analyst': 'data analyst',
    'Data Scientist': 'data scientist',
    'Machine Learning Engineer': 'machine learning engineer',
    'Product Manager': 'product manager',
    'UI/UX Designer': 'ui ux designer',
    'Graphic Designer': 'graphic designer',
    'DevOps Engineer': 'devops',
    'QA / Test Engineer': 'qa engineer',
    'Cybersecurity Analyst': 'cybersecurity analyst',
    'Business Analyst': 'business analyst',
    'Sales / Business Development': 'business development',
    'Digital Marketing': 'digital marketing',
    'Content Writer': 'content writer',
    'Finance / Accounts': 'finance',
    'HR / Recruiter': 'human resources'
  };

  const searchKeyword = roles.length > 0 ? (ROLE_SEARCH_TERMS[roles[0]] || roles[0]) : '';
  const expParam = EXP_PARAM_MAP[experience] || '';

  try {
    console.log('  [Unstop] Fetching jobs...');

    // Try the API endpoint that Unstop's frontend uses
    const apiResponse = await axios.get('https://unstop.com/api/public/opportunity/search-result', {
      params: {
        opportunity: 'jobs',
        per_page: 20,
        oppstatus: 'open',
        page: 1,
        ...(searchKeyword ? { searchTerm: searchKeyword } : {}),
        ...(expParam ? { work_exp: expParam } : {})
      },
      headers: {
        ...HEADERS,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    });

    if (apiResponse.data && apiResponse.data.data && apiResponse.data.data.data) {
      const listings = apiResponse.data.data.data;
      for (const item of listings) {
        try {
          const title = item.title || item.job_title || 'Untitled';
          const company = item.organisation?.name || item.company_name || 'Unknown Company';
          const location = Array.isArray(item.city)
            ? item.city.join(', ')
            : item.location || 'India';
          const slug = item.seo_url || item.id;
          const url = slug ? `https://unstop.com/jobs/${slug}` : 'https://unstop.com/jobs';
          const postedAt = getPostedAtFromUnstopItem(item);

          jobs.push({ title, company, location, url, source: 'Unstop', postedAt });
        } catch {
          // skip
        }
      }
      console.log(`  [Unstop] Found ${jobs.length} jobs via API`);
    }

  } catch (apiErr) {
    console.log(`  [Unstop] API failed (${apiErr.message}), trying HTML scrape...`);

    // Fallback: HTML scraping
    try {
      await delay(2000);
      const response = await axios.get('https://unstop.com/jobs', {
        headers: HEADERS,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);

      // Unstop job cards
      $('[class*="job_card"], [class*="opportunity_card"], .single_profile').each((i, el) => {
        try {
          const title = $(el).find('[class*="title"], h2, h3').first().text().trim();
          const company = $(el).find('[class*="company"], [class*="org"]').first().text().trim();
          const location = $(el).find('[class*="location"], [class*="city"]').first().text().trim();
          const href = $(el).find('a').first().attr('href');
          const postedDate = $(el).find('[class*="time"], [class*="date"], [class*="posted"]').first().text().trim();

          if (!title) return;

          jobs.push({
            title,
            company: company || 'Unknown Company',
            location: location || 'India',
            url: href ? (href.startsWith('http') ? href : `https://unstop.com${href}`) : 'https://unstop.com/jobs',
            source: 'Unstop',
            postedDate
          });
        } catch {
          // skip
        }
      });

      console.log(`  [Unstop] Found ${jobs.length} jobs via HTML`);
    } catch (htmlErr) {
      console.error(`  [Unstop] HTML scrape also failed: ${htmlErr.message}`);
    }
  }

  return jobs;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeUnstop };
