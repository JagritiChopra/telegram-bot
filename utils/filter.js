'use strict';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Role keyword mapping retained for compatibility and display
const ROLE_KEYWORDS = {
  'Software Engineer': ['software engineer', 'software developer', 'developer', 'sde', 'backend', 'frontend', 'fullstack', 'full stack', 'full-stack'],
  'Frontend Developer': ['frontend developer', 'front end developer', 'react developer', 'angular developer', 'vue developer', 'ui developer'],
  'Backend Developer': ['backend developer', 'back end developer', 'api developer', 'node developer', 'java developer', 'python developer'],
  'Full Stack Developer': ['full stack developer', 'full-stack developer', 'mern developer', 'mean developer', 'web developer'],
  'Mobile App Developer': ['android developer', 'ios developer', 'mobile developer', 'flutter developer', 'react native developer', 'mobile app developer', 'app developer'],
  'Data Analyst': ['data analyst', 'data science', 'data scientist', 'business intelligence', 'bi analyst'],
  'Data Scientist': ['data scientist', 'machine learning', 'artificial intelligence', 'predictive analytics'],
  'Machine Learning Engineer': ['machine learning engineer', 'ml engineer', 'deep learning', 'nlp engineer', 'ai engineer'],
  'Product Manager': ['product manager', 'product owner', 'product lead'],
  'UI/UX Designer': ['ui designer', 'ux designer', 'product designer', 'visual designer'],
  'Graphic Designer': ['graphic designer', 'brand designer', 'communication designer', 'illustrator'],
  'DevOps Engineer': ['devops', 'cloud engineer', 'platform engineer', 'site reliability', 'sre'],
  'QA / Test Engineer': ['qa engineer', 'test engineer', 'quality assurance', 'automation tester', 'manual tester'],
  'Cybersecurity Analyst': ['cybersecurity', 'security analyst', 'information security', 'soc analyst', 'penetration tester'],
  'Business Analyst': ['business analyst', 'business analysis', 'requirements analyst'],
  'Sales / Business Development': ['business development', 'sales executive', 'account executive', 'inside sales'],
  'Digital Marketing': ['digital marketing', 'growth marketing', 'performance marketing', 'seo', 'social media marketing'],
  'Content Writer': ['content writer', 'copywriter', 'editor', 'content creator'],
  'Finance / Accounts': ['finance', 'accounts', 'accounting', 'financial analyst'],
  'HR / Recruiter': ['hr', 'human resources', 'recruiter', 'talent acquisition', 'recruitment']
};

// Experience keyword mapping
const EXP_KEYWORDS = {
  'Fresher / Student (0 years)': ['internship', 'intern', 'fresher', '0 years', '0-1', 'entry level', 'graduate', 'trainee'],
  'Junior (0–2 years)': ['0-2 years', '0–2 years', 'junior', 'entry level', 'associate', '1-2 years'],
  'Mid-level (2–5 years)': ['2-5 years', '2–5 years', '3-5 years', 'mid level', 'mid-level', 'intermediate'],
  'Senior (5+ years)': ['5+ years', '5-8 years', 'senior', 'lead', 'principal', 'staff', 'manager']
};

const SOFTWARE_PRIMARY_PATTERNS = [
  /\bsoftware engineer\b/i,
  /\bsoftware developer\b/i,
  /\bsde(?:[-\s]?[1-4])?\b/i,
  /\bbackend developer\b/i,
  /\bbackend engineer\b/i,
  /\bfrontend developer\b/i,
  /\bfrontend engineer\b/i,
  /\bfull[\s-]?stack developer\b/i,
  /\bfull[\s-]?stack engineer\b/i,
  /\bweb developer\b/i,
  /\bapplication developer\b/i,
  /\bmobile developer\b/i,
  /\bapp developer\b/i,
  /\breact developer\b/i,
  /\bnode(?:\.js)? developer\b/i,
  /\bpython developer\b/i,
  /\bjava developer\b/i
];

const SOFTWARE_SUPPORTING_PATTERNS = [
  /\bsoftware\b/i,
  /\bapplication\b/i,
  /\bweb\b/i,
  /\bmobile\b/i,
  /\bbackend\b/i,
  /\bfrontend\b/i,
  /\bfull[\s-]?stack\b/i,
  /\bprogramming\b/i,
  /\bcoding\b/i,
  /\bcode\b/i,
  /\bjavascript\b/i,
  /\btypescript\b/i,
  /\bpython\b/i,
  /\bjava\b/i,
  /\breact\b/i,
  /\bnode(?:\.js)?\b/i
];

// Roles that are NOT software even if title has "engineer/developer"
const NON_SOFTWARE_TITLE_PATTERNS = [
  /\bmechanical\b/i, /\bcivil\b/i, /\belectrical\b/i, /\belectronics\b/i,
  /\baerospace\b/i, /\bchemical\b/i, /\bindustrial\b/i, /\bmanufacturing\b/i,
  /\bproduction\b/i, /\bautomotive\b/i, /\bstructural\b/i, /\bembedded\b/i,
  /\bmechatronics\b/i, /\binstrumentation\b/i, /\bprocess engineer\b/i,
  /\bsales engineer\b/i, /\bfield engineer\b/i, /\bservice engineer\b/i,
  /\bnetwork engineer\b/i, /\btelecom\b/i, /\bhardware engineer\b/i
];

const ROLE_MATCHERS = {
  'Software Engineer': (job) => {
    const title = normalizeText(job.title);

    // Hard reject: title clearly belongs to a non-software discipline
    if (NON_SOFTWARE_TITLE_PATTERNS.some(p => p.test(title))) return false;

    // Strong match: primary pattern hits the TITLE directly
    if (SOFTWARE_PRIMARY_PATTERNS.some(pattern => pattern.test(title))) return true;

    // Looser match: "developer" or "engineer" in title + software context in TITLE only
    // (not body — body is often missing and "software tools" in a mech JD would false-positive)
    const hasDeveloperOrEngineer = /\b(developer|engineer)\b/i.test(title);
    const titleHasSoftwareContext = SOFTWARE_SUPPORTING_PATTERNS.some(p => p.test(title));
    return hasDeveloperOrEngineer && titleHasSoftwareContext;
  },
  'Frontend Developer': createSimpleMatcher([
    /\bfrontend developer\b/i,
    /\bfront end developer\b/i,
    /\bfrontend engineer\b/i,
    /\bfront end engineer\b/i,
    /\breact developer\b/i,
    /\bangular developer\b/i,
    /\bvue developer\b/i,
    /\bui developer\b/i
  ]),
  'Backend Developer': createSimpleMatcher([
    /\bbackend developer\b/i,
    /\bback end developer\b/i,
    /\bbackend engineer\b/i,
    /\bback end engineer\b/i,
    /\bapi developer\b/i,
    /\bnode(?:\.js)? developer\b/i,
    /\bpython developer\b/i,
    /\bjava developer\b/i
  ]),
  'Full Stack Developer': createSimpleMatcher([
    /\bfull[\s-]?stack developer\b/i,
    /\bfull[\s-]?stack engineer\b/i,
    /\bmern developer\b/i,
    /\bmean developer\b/i,
    /\bweb developer\b/i,
    /\bweb development\b/i,
    /\bfrontend development\b/i,
    /\bfront end development\b/i,
    /\bbackend development\b/i,
    /\bback end development\b/i
  ]),
  'Mobile App Developer': createSimpleMatcher([
    /\bandroid developer\b/i,
    /\bios developer\b/i,
    /\bmobile developer\b/i,
    /\bflutter developer\b/i,
    /\breact native developer\b/i,
    /\bapp developer\b/i,
    /\bmobile app developer\b/i,
    /\bandroid development\b/i,
    /\bios development\b/i,
    /\bmobile app development\b/i
  ]),
  'Data Analyst': createSimpleMatcher([
    /\bdata analyst\b/i,
    /\bbusiness intelligence\b/i,
    /\bbi analyst\b/i,
    /\bdata scientist\b/i,
    /\banalytics engineer\b/i
  ]),
  'Data Scientist': createSimpleMatcher([
    /\bdata scientist\b/i,
    /\bapplied scientist\b/i,
    /\bartificial intelligence\b/i,
    /\bpredictive analytics\b/i
  ]),
  'Machine Learning Engineer': createSimpleMatcher([
    /\bmachine learning engineer\b/i,
    /\bml engineer\b/i,
    /\bai engineer\b/i,
    /\bdeep learning\b/i,
    /\bnlp engineer\b/i
  ]),
  'Product Manager': createSimpleMatcher([
    /\bproduct manager\b/i,
    /\bproduct owner\b/i,
    /\bproduct lead\b/i
  ]),
  'UI/UX Designer': createSimpleMatcher([
    /\bui(?:\/|\s)?ux designer\b/i,
    /\bui designer\b/i,
    /\bux designer\b/i,
    /\bproduct designer\b/i,
    /\bvisual designer\b/i
  ]),
  'Graphic Designer': createSimpleMatcher([
    /\bgraphic designer\b/i,
    /\bbrand designer\b/i,
    /\bcommunication designer\b/i,
    /\billustrator\b/i
  ]),
  'DevOps Engineer': createSimpleMatcher([
    /\bdevops\b/i,
    /\bsite reliability\b/i,
    /\bsre\b/i,
    /\bplatform engineer\b/i,
    /\bcloud engineer\b/i
  ]),
  'QA / Test Engineer': createSimpleMatcher([
    /\bqa engineer\b/i,
    /\btest engineer\b/i,
    /\bquality assurance\b/i,
    /\bautomation tester\b/i,
    /\bmanual tester\b/i,
    /\bsoftware tester\b/i
  ]),
  'Cybersecurity Analyst': createSimpleMatcher([
    /\bcybersecurity\b/i,
    /\bsecurity analyst\b/i,
    /\binformation security\b/i,
    /\bsoc analyst\b/i,
    /\bpenetration tester\b/i,
    /\bvapt\b/i
  ]),
  'Business Analyst': createSimpleMatcher([
    /\bbusiness analyst\b/i,
    /\brequirements analyst\b/i,
    /\bbusiness analysis\b/i
  ]),
  'Sales / Business Development': createSimpleMatcher([
    /\bbusiness development\b/i,
    /\bsales executive\b/i,
    /\baccount executive\b/i,
    /\binside sales\b/i,
    /\bclient acquisition\b/i
  ]),
  'Digital Marketing': createSimpleMatcher([
    /\bdigital marketing\b/i,
    /\bgrowth marketing\b/i,
    /\bperformance marketing\b/i,
    /\bseo\b/i,
    /\bsocial media marketing\b/i
  ]),
  'Content Writer': createSimpleMatcher([
    /\bcontent writer\b/i,
    /\bcopywriter\b/i,
    /\beditor\b/i,
    /\bcontent creator\b/i
  ]),
  'Finance \/ Accounts': createSimpleMatcher([
    /\bfinance\b/i,
    /\baccounts?\b/i,
    /\baccounting\b/i,
    /\bfinancial analyst\b/i
  ]),
  'HR \/ Recruiter': createSimpleMatcher([
    /\bhuman resources\b/i,
    /\brecruiter\b/i,
    /\btalent acquisition\b/i,
    /\brecruitment\b/i,
    /\bhr\b/i
  ])
};

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSimpleMatcher(patterns) {
  return (job) => {
    const text = normalizeText(`${job.title} ${job.description || ''}`);
    return patterns.some(pattern => pattern.test(text));
  };
}

/**
 * Filter jobs by user's selected roles
 * @param {Array} jobs - array of job objects
 * @param {Array} userRoles - user's selected role strings
 * @returns {Array} filtered jobs
 */
function filterByRoles(jobs, userRoles) {
  if (!userRoles || userRoles.length === 0) return jobs;

  return jobs.filter(job => {
    return userRoles.some(role => {
      const matcher = ROLE_MATCHERS[role];
      if (matcher) {
        return matcher(job);
      }

      const text = normalizeText(`${job.title} ${job.description || ''}`);
      const fallbackPattern = new RegExp(`\\b${escapeRegex(role.toLowerCase())}\\b`, 'i');
      return fallbackPattern.test(text);
    });
  });
}

/**
 * Filter jobs by experience level
 * @param {Array} jobs - array of job objects
 * @param {string} experience - user's experience level string
 * @returns {Array} filtered jobs
 */
// Patterns that clearly signal a SENIOR/EXPERIENCED requirement — used to hard-reject
// these jobs when the user has chosen Fresher or Junior.
const SENIOR_REQUIRED_PATTERNS = [
  /\b([3-9]|[1-9]\d+)\+?\s*years?\s*(of\s*)?experience\b/i,
  /\bminimum\s*([3-9]|[1-9]\d+)\s*years?\b/i,
  /\bat\s*least\s*([3-9]|[1-9]\d+)\s*years?\b/i,
  /\b([3-9]|[1-9]\d+)[-–]\d+\s*years?\s*(of\s*)?exp\b/i
];

const FRESHER_JUNIOR_LEVELS = [
  'Fresher / Student (0 years)',
  'Junior (0–2 years)'
];

function filterByExperience(jobs, experience) {
  if (!experience) return jobs;

  const keywords = EXP_KEYWORDS[experience] || [];
  if (keywords.length === 0) return jobs;

  const isFresherOrJunior = FRESHER_JUNIOR_LEVELS.includes(experience);

  return jobs.filter(job => {
    const hasDescription = job.description && job.description.trim().length > 0;
    const searchText = `${job.title} ${hasDescription ? job.description : ''}`.toLowerCase();
    const fullText = `${job.title} ${job.description || ''}`;

    // Hard-reject: if job explicitly requires 3+ years and user is fresher/junior
    if (isFresherOrJunior && SENIOR_REQUIRED_PATTERNS.some(p => p.test(fullText))) {
      return false;
    }

    // For fresher/junior users, keep the role-matched job unless it explicitly
    // demands senior experience. Many legitimate entry-level listings do not
    // contain words like "fresher" or "intern" in the title/description.
    if (isFresherOrJunior) {
      return true;
    }

    // If no description, rely only on the title for a positive keyword hit
    if (!hasDescription) {
      // Title must contain at least one experience keyword to be included
      // (avoids passing through obviously senior jobs that just lack description)
      const titleLower = job.title.toLowerCase();
      return keywords.some(kw => titleLower.includes(kw.toLowerCase()));
    }

    return keywords.some(kw => searchText.includes(kw.toLowerCase()));
  });
}

/**
 * Remove duplicate jobs by title+company combination
 * @param {Array} jobs
 * @returns {Array} deduplicated jobs
 */
function deduplicateJobs(jobs) {
  const seen = new Set();
  return jobs.filter(job => {
    const key = `${job.title?.toLowerCase().trim()}|${job.company?.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Check if a date string represents today
 * @param {string|Date} dateInput
 * @returns {boolean}
 */
function isToday(dateInput) {
  if (!dateInput) return false;
  try {
    const date = new Date(dateInput);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

/**
 * Convert relative time strings into an absolute timestamp
 * @param {string} value
 * @param {Date} now
 * @returns {Date|null}
 */
function parseRelativeDate(value, now = new Date()) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;

  if (text.includes('just now') || text.includes('today')) {
    return now;
  }

  const minuteMatch = text.match(/(\d+)\s*(minute|min)s?\s*ago?/);
  if (minuteMatch) {
    return new Date(now.getTime() - Number(minuteMatch[1]) * 60 * 1000);
  }

  const hourMatch = text.match(/(\d+)\s*(hour|hr)s?\s*ago?/);
  if (hourMatch) {
    return new Date(now.getTime() - Number(hourMatch[1]) * 60 * 60 * 1000);
  }

  const dayMatch = text.match(/(\d+)\s*day[s]?\s*ago?/);
  if (dayMatch) {
    return new Date(now.getTime() - Number(dayMatch[1]) * DAY_IN_MS);
  }

  const weekMatch = text.match(/(\d+)\s*week[s]?\s*ago?/);
  if (weekMatch) {
    return new Date(now.getTime() - Number(weekMatch[1]) * 7 * DAY_IN_MS);
  }

  return null;
}

/**
 * Parse a job timestamp from explicit fields or relative labels
 * @param {Object} job
 * @param {Date} now
 * @returns {Date|null}
 */
function getPostedAt(job, now = new Date()) {
  if (!job) return null;

  const candidates = [
    job.postedAt,
    job.pubDate,
    job.datePosted,
    job.postedDate,
    job.publishedAt
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      return candidate;
    }

    const relative = parseRelativeDate(candidate, now);
    if (relative) return relative;

    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/**
 * Check whether a job was posted within the last 24 hours
 * @param {Object} job
 * @param {Date} now
 * @returns {boolean}
 */
function isWithinLast24Hours(job, now = new Date()) {
  const postedAt = getPostedAt(job, now);
  if (!postedAt) return false;

  const age = now.getTime() - postedAt.getTime();
  return age >= 0 && age <= DAY_IN_MS;
}

/**
 * Keep only jobs with a parseable posting time inside the last 24 hours
 * @param {Array} jobs
 * @param {Date} now
 * @returns {Array}
 */
function filterByPostedWithin24Hours(jobs, now = new Date()) {
  return jobs
    .map(job => {
      const postedAt = getPostedAt(job, now);
      // Enrich with resolved timestamp when available; leave job intact otherwise
      return postedAt ? { ...job, postedAt: postedAt.toISOString() } : job;
    })
    .filter(job => {
      const postedAt = getPostedAt(job, now);
      // Strict mode: only keep jobs we can verify were posted in the last 24 hours.
      if (!postedAt) return false;
      const age = now.getTime() - postedAt.getTime();
      return age >= 0 && age <= DAY_IN_MS;
    });
}

/**
 * Full pipeline: filter by recency -> roles -> experience -> dedup -> top N
 * @param {Array} jobs
 * @param {Object} user - { roles, experience }
 * @param {number} limit
 * @param {Date} now
 * @returns {Array}
 */
function applyAllFilters(jobs, user, limit = 5, now = new Date()) {
  let results = [...jobs];

  console.log(`  Starting with ${results.length} total jobs`);

  results = filterByPostedWithin24Hours(results, now);
  console.log(`  After 24h filter: ${results.length} jobs`);

  results = filterByRoles(results, user.roles);
  console.log(`  After role filter: ${results.length} jobs`);

  results = filterByExperience(results, user.experience);
  console.log(`  After experience filter: ${results.length} jobs`);

  results = deduplicateJobs(results);
  console.log(`  After dedup: ${results.length} jobs`);

  return results.slice(0, limit);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  filterByRoles,
  filterByExperience,
  filterByPostedWithin24Hours,
  deduplicateJobs,
  isToday,
  isWithinLast24Hours,
  getPostedAt,
  applyAllFilters,
  ROLE_KEYWORDS,
  EXP_KEYWORDS
};
