'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
};

// Map role labels → Internshala URL slugs for both jobs and internships
const ROLE_SLUG_MAP = {
  'Software Engineer':        { job: 'computer-science-jobs',        intern: 'computer-science' },
  'Frontend Developer':       { job: 'computer-science-jobs',        intern: 'computer-science' },
  'Backend Developer':        { job: 'computer-science-jobs',        intern: 'computer-science' },
  'Full Stack Developer':     { job: 'computer-science-jobs',        intern: 'computer-science' },
  'Mobile App Developer':     { job: 'computer-science-jobs',        intern: 'computer-science' },
  'Data Analyst':             { job: 'data-science-analytics-jobs',  intern: 'data-science' },
  'Data Scientist':           { job: 'data-science-analytics-jobs',  intern: 'data-science' },
  'Machine Learning Engineer':{ job: 'data-science-analytics-jobs',  intern: 'data-science' },
  'Product Manager':          { job: 'product-management-jobs',      intern: 'product-management' },
  'UI/UX Designer':           { job: 'ui-ux-jobs',                   intern: 'ui-ux-design' },
  'Graphic Designer':         { job: 'graphic-design-jobs',          intern: 'graphic-design' },
  'DevOps Engineer':          { job: 'computer-science-jobs',        intern: 'computer-science' },
  'QA / Test Engineer':       { job: 'computer-science-jobs',        intern: 'computer-science' },
  'Cybersecurity Analyst':    { job: 'computer-science-jobs',        intern: 'computer-science' },
  'Business Analyst':         { job: 'business-development-jobs',    intern: 'business-development' },
  'Sales / Business Development': { job: 'business-development-jobs', intern: 'business-development' },
  'Digital Marketing':        { job: 'marketing-jobs',               intern: 'marketing' },
  'Content Writer':           { job: 'content-writing-jobs',         intern: 'content-writing' },
  'Finance / Accounts':       { job: 'finance-jobs',                 intern: 'finance' },
  'HR / Recruiter':           { job: 'hr-jobs',                      intern: 'human-resources' }
};

// Keywords per role — used for post-scrape title filtering
const ROLE_KEYWORDS = {
  'Software Engineer':   ['software engineer', 'software developer', 'application developer', 'programmer', 'sde'],
  'Frontend Developer':  ['frontend', 'front end', 'react', 'angular', 'vue', 'ui developer'],
  'Backend Developer':   ['backend', 'back end', 'node.js', 'nodejs', 'java developer', 'python developer', 'api developer'],
  'Full Stack Developer':['full stack', 'full-stack', 'mern', 'mean', 'web developer'],
  'Mobile App Developer':['android', 'ios', 'mobile app', 'flutter', 'react native', 'app developer'],
  'Data Analyst':        ['data analyst', 'data science', 'analytics', 'business intelligence', 'bi analyst', 'data engineer'],
  'Data Scientist':      ['data scientist', 'machine learning', 'ml', 'ai', 'predictive modeling'],
  'Machine Learning Engineer': ['machine learning engineer', 'ml engineer', 'artificial intelligence', 'deep learning', 'nlp'],
  'Product Manager':     ['product manager', 'product management', 'pm ', 'product owner'],
  'UI/UX Designer':      ['ui', 'ux', 'designer', 'figma', 'user experience', 'user interface', 'graphic design'],
  'Graphic Designer':    ['graphic designer', 'visual designer', 'brand designer', 'illustrator', 'photoshop'],
  'DevOps Engineer':     ['devops', 'cloud', 'infrastructure', 'sre', 'site reliability', 'kubernetes', 'docker', 'aws', 'azure'],
  'QA / Test Engineer':  ['qa engineer', 'test engineer', 'quality assurance', 'automation tester', 'manual tester', 'selenium'],
  'Cybersecurity Analyst': ['cybersecurity', 'security analyst', 'information security', 'soc analyst', 'vapt', 'penetration tester'],
  'Business Analyst':    ['business analyst', 'business development', 'strategy', 'operations analyst'],
  'Sales / Business Development': ['business development', 'sales', 'account executive', 'inside sales', 'client acquisition'],
  'Digital Marketing':   ['digital marketing', 'seo', 'social media', 'growth marketing', 'performance marketing', 'brand marketing'],
  'Content Writer':      ['content', 'writer', 'copywriter', 'blog', 'editor', 'technical writer'],
  'Finance / Accounts':  ['finance', 'accounts', 'accounting', 'chartered', 'ca ', 'cfa', 'financial analyst', 'audit'],
  'HR / Recruiter':      ['hr', 'human resource', 'recruiter', 'talent acquisition', 'people ops']
};

// Keywords that indicate senior/experienced roles — blocked for freshers
const SENIOR_KEYWORDS = [
  'senior', 'sr.', 'sr ', 'lead', 'manager', 'head of', 'director',
  'principal', 'staff engineer', 'architect', '5+ years', '6+ years',
  '7+ years', '8+ years', '10+ years'
];

/**
 * Check if a job title matches any of the selected roles
 */
function matchesRole(title, roles) {
  const lowerTitle = title.toLowerCase();
  for (const role of roles) {
    const keywords = ROLE_KEYWORDS[role] || [];
    if (keywords.some(kw => lowerTitle.includes(kw))) return true;
  }
  return false;
}

/**
 * Check if a job is appropriate for the given experience level
 */
function matchesExperience(title, experience) {
  const lowerTitle = title.toLowerCase();
  const lowerExp = (experience || '').toLowerCase();

  if (lowerExp.includes('fresher') || lowerExp.includes('0') || lowerExp.includes('entry')) {
    // Reject if title contains senior-level keywords
    if (SENIOR_KEYWORDS.some(kw => lowerTitle.includes(kw))) return false;
  }
  // For experienced users, allow everything
  return true;
}

/**
 * Scrape a single Internshala URL and return raw job entries
 */
async function scrapePage(url, source) {
  const results = [];
  try {
    console.log(`  [Internshala] Fetching: ${url}`);
    const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);

    $('.individual_internship').each((i, el) => {
      try {
        // Try multiple selectors to handle Internshala's HTML variations
        const title =
          $(el).find('.job-internship-name').text().trim() ||
          $(el).find('.profile').text().trim() ||
          $(el).find('h3').first().text().trim() ||
          $(el).find('[class*="title"]').first().text().trim();

        const company =
          $(el).find('.company-name').text().trim() ||
          $(el).find('.heading_4_5').text().trim() ||
          $(el).find('[class*="company"]').first().text().trim();

        const location =
          $(el).find('.location_link').text().trim() ||
          $(el).find('.locations a').map((j, a) => $(a).text().trim()).get().join(', ') ||
          $(el).find('[class*="location"]').first().text().trim() ||
          'India';

        const postedDate =
          $(el).find('.status-inactive').text().trim() ||
          $(el).find('.posted').text().trim() ||
          $(el).find('[class*="posted"]').first().text().trim();

        // Get the job detail link
        const relativeUrl =
          $(el).find('a.job-title-href').attr('href') ||
          $(el).find('a[href*="/job-detail/"]').attr('href') ||
          $(el).find('a[href*="/internship/detail"]').attr('href') ||
          $(el).find('h3 a').attr('href') ||
          $(el).find('a').first().attr('href');

        if (!title) return; // skip if we couldn't get a title at all

        results.push({
          title,
          company: company || 'Unknown Company',
          location,
          url: relativeUrl
            ? (relativeUrl.startsWith('http') ? relativeUrl : `https://internshala.com${relativeUrl}`)
            : url,
          source,
          postedDate
        });
      } catch (err) {
        // skip malformed card
      }
    });

    console.log(`  [Internshala] Found ${results.length} raw entries from ${url}`);
  } catch (err) {
    console.error(`  [Internshala] Failed to fetch ${url}: ${err.message}`);
  }
  return results;
}

/**
 * Main function — scrape Internshala filtered by role and experience
 * @param {boolean} includeInternships
 * @param {string[]} roles - selected role labels e.g. ['Software Engineer']
 * @param {string} experience - e.g. 'Fresher', '1-2 years', 'Experienced'
 * @returns {Promise<Array>}
 */
async function scrapeInternshala(includeInternships = false, roles = [], experience = '') {
  const allJobs = [];

  // Build job URLs from selected roles
  const jobSlugSet = new Set();
  const internSlugSet = new Set();

  for (const role of roles) {
    const slugs = ROLE_SLUG_MAP[role];
    if (slugs) {
      jobSlugSet.add(slugs.job);
      internSlugSet.add(slugs.intern);
    }
  }

  // Fallback if no roles matched
  const jobUrls = jobSlugSet.size > 0
    ? [...jobSlugSet].map(slug => `https://internshala.com/jobs/${slug}/`)
    : ['https://internshala.com/jobs/'];

  // Scrape jobs
  for (const url of jobUrls) {
    const results = await scrapePage(url, 'Internshala');
    allJobs.push(...results);
    await delay(1500);
  }

  // Scrape internships if requested
  if (includeInternships) {
    const internUrls = internSlugSet.size > 0
      ? [...internSlugSet].map(slug => `https://internshala.com/internships/${slug}-internship/`)
      : ['https://internshala.com/internships/'];

    for (const url of internUrls) {
      const results = await scrapePage(url, 'Internshala Internships');
      // Tag as internship if not already obvious from title
      results.forEach(job => {
        if (!job.title.toLowerCase().includes('intern')) {
          job.title = `${job.title} (Internship)`;
        }
      });
      allJobs.push(...results);
      await delay(1500);
    }
  }

  // ── POST-SCRAPE FILTERING ──────────────────────────────────────────────────

  const filtered = allJobs.filter(job => {
    // 1. Must match at least one selected role by title keywords
    if (roles.length > 0 && !matchesRole(job.title, roles)) {
      console.log(`  [Filter] Rejected (role mismatch): "${job.title}"`);
      return false;
    }

    // 2. Must match experience level
    if (!matchesExperience(job.title, experience)) {
      console.log(`  [Filter] Rejected (experience mismatch): "${job.title}"`);
      return false;
    }

    return true;
  });

  // Deduplicate by URL
  const seen = new Set();
  const deduplicated = filtered.filter(job => {
    if (seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });

  console.log(`\n  [Internshala] Total scraped: ${allJobs.length}`);
  console.log(`  [Internshala] After filtering (role + experience): ${deduplicated.length}`);

  return deduplicated;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { scrapeInternshala };
