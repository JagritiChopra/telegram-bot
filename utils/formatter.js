'use strict';

/**
 * Format a single job entry for Telegram (Markdown)
 * @param {Object} job
 * @param {number} index - 1-based
 * @returns {string}
 */
function formatJob(job, index) {
  const lines = [];
  lines.push(`*${index}. ${escapeMarkdown(job.title || 'Untitled')}*`);
  if (job.company) lines.push(`Company: ${escapeMarkdown(job.company)}`);
  if (job.location) lines.push(`Location: ${escapeMarkdown(job.location)}`);
  if (job.url) lines.push(`Link: ${job.url}`);
  if (job.source) lines.push(`_via ${escapeMarkdown(job.source)}_`);
  return lines.join('\n');
}

/**
 * Build the full daily digest message
 * @param {Array} jobs
 * @param {Object} user - { roles, experience }
 * @returns {string}
 */
function buildDigestMessage(jobs, user) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const rolesText = (user.roles || []).join(', ');
  const expText = user.experience || 'Not specified';

  if (!jobs || jobs.length === 0) {
    return [
      'No jobs matching your profile from the last 24 hours.',
      `I searched for: *${escapeMarkdown(rolesText)}*`,
      'Try broadening your roles by sending /start'
    ].join('\n');
  }

  const header = [
    `*Your Daily Job Digest* ${today}`,
    `Found *${jobs.length}* job${jobs.length !== 1 ? 's' : ''} matching your profile from the last 24 hours.`,
    `Roles: ${escapeMarkdown(rolesText)} \\| Level: ${escapeMarkdown(expText)}`,
    '--------------------'
  ].join('\n');

  const jobBlocks = jobs.map((job, i) => formatJob(job, i + 1)).join('\n--------------------\n');
  const footer = '--------------------\n_To change preferences, send /start_';

  return `${header}\n${jobBlocks}\n${footer}`;
}

/**
 * Build the digest message using HTML parse mode (safer for special chars)
 * @param {Array} jobs
 * @param {Object} user
 * @returns {string}
 */
function buildDigestMessageHTML(jobs, user) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const rolesText = (user.roles || []).join(', ');
  const expText = user.experience || 'Not specified';

  if (!jobs || jobs.length === 0) {
    return [
      'No jobs matching your profile from the last 24 hours.',
      `I searched for: <b>${escapeHTML(rolesText)}</b>`,
      'Try broadening your roles by sending /start'
    ].join('\n');
  }

  const header = [
    `<b>Your Daily Job Digest</b> ${escapeHTML(today)}`,
    `Found <b>${jobs.length}</b> job${jobs.length !== 1 ? 's' : ''} matching your profile from the last 24 hours.`,
    `Roles: ${escapeHTML(rolesText)} | Level: ${escapeHTML(expText)}`,
    '--------------------'
  ].join('\n');

  const jobBlocks = jobs.map((job, i) => formatJobHTML(job, i + 1)).join('\n--------------------\n');
  const footer = '--------------------\n<i>To change preferences, send /start</i>';

  return `${header}\n${jobBlocks}\n${footer}`;
}

function formatJobHTML(job, index) {
  const lines = [];
  lines.push(`<b>${index}. ${escapeHTML(job.title || 'Untitled')}</b>`);
  if (job.company) lines.push(`Company: ${escapeHTML(job.company)}`);
  if (job.location) lines.push(`Location: ${escapeHTML(job.location)}`);
  if (job.url) lines.push(`Link: <a href="${job.url}">${escapeHTML(job.url)}</a>`);
  if (job.source) lines.push(`<i>via ${escapeHTML(job.source)}</i>`);
  return lines.join('\n');
}

/**
 * Escape special Markdown v2 characters
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  formatJob,
  buildDigestMessage,
  buildDigestMessageHTML,
  escapeMarkdown,
  escapeHTML
};
