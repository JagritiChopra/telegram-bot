'use strict';

const assert = require('node:assert/strict');

const {
  applyAllFilters,
  filterByRoles,
  filterByPostedWithin24Hours,
  getPostedAt,
  isWithinLast24Hours
} = require('../utils/filter');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('filterByPostedWithin24Hours keeps only jobs from the last 24 hours', () => {
  const now = new Date('2026-04-24T12:00:00.000Z');
  const jobs = [
    { title: 'Fresh role', company: 'A', postedAt: '2026-04-24T10:00:00.000Z' },
    { title: 'Stale role', company: 'B', postedAt: '2026-04-23T10:59:59.000Z' },
    { title: 'Unknown role', company: 'C' }
  ];

  const result = filterByPostedWithin24Hours(jobs, now);

  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Fresh role');
});

runTest('getPostedAt parses relative timestamps', () => {
  const now = new Date('2026-04-24T12:00:00.000Z');
  const job = { postedDate: '3 hours ago' };

  const postedAt = getPostedAt(job, now);

  assert.ok(postedAt instanceof Date);
  assert.equal(postedAt.toISOString(), '2026-04-24T09:00:00.000Z');
});

runTest('getPostedAt parses week-based relative timestamps', () => {
  const now = new Date('2026-04-24T12:00:00.000Z');
  const job = { postedDate: '2 weeks ago' };

  const postedAt = getPostedAt(job, now);

  assert.ok(postedAt instanceof Date);
  assert.equal(postedAt.toISOString(), '2026-04-10T12:00:00.000Z');
});

runTest('isWithinLast24Hours rejects jobs older than one day', () => {
  const now = new Date('2026-04-24T12:00:00.000Z');

  assert.equal(
    isWithinLast24Hours({ postedAt: '2026-04-23T11:59:59.000Z' }, now),
    false
  );
  assert.equal(
    isWithinLast24Hours({ postedAt: '2026-04-23T12:00:00.000Z' }, now),
    true
  );
});

runTest('applyAllFilters enforces recency, role, and experience together', () => {
  const now = new Date('2026-04-24T12:00:00.000Z');
  const jobs = [
    {
      title: 'Software Engineer Intern',
      company: 'Acme',
      description: 'Entry level internship role',
      postedAt: '2026-04-24T08:00:00.000Z'
    },
    {
      title: 'Marketing Associate',
      company: 'Acme',
      description: 'Entry level role',
      postedAt: '2026-04-24T08:00:00.000Z'
    },
    {
      title: 'Software Engineer Intern',
      company: 'OldCo',
      description: 'Entry level internship role',
      postedAt: '2026-04-23T07:00:00.000Z'
    },
    {
      title: 'Software Engineer',
      company: 'MidCo',
      description: 'Requires 3-5 years experience',
      postedAt: '2026-04-24T08:00:00.000Z'
    }
  ];

  const result = applyAllFilters(
    jobs,
    {
      roles: ['Software Engineer'],
      experience: 'Fresher / Student (0 years)'
    },
    10,
    now
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].company, 'Acme');
});

runTest('filterByRoles rejects generic non-software engineer roles', () => {
  const jobs = [
    {
      title: 'Mechanical Engineer Intern',
      company: 'BuildCo',
      description: 'Hands-on manufacturing internship'
    },
    {
      title: 'Software Engineer Intern',
      company: 'CodeCo',
      description: 'Entry level software internship'
    },
    {
      title: 'Civil Engineer Trainee',
      company: 'InfraCo',
      description: 'Graduate trainee role'
    }
  ];

  const result = filterByRoles(jobs, ['Software Engineer']);

  assert.equal(result.length, 1);
  assert.equal(result[0].company, 'CodeCo');
});

runTest('fresher experience filter keeps generic entry-level software roles without explicit fresher keywords', () => {
  const now = new Date('2026-04-24T12:00:00.000Z');
  const jobs = [
    {
      title: 'Backend Developer',
      company: 'CodeCo',
      postedAt: '2026-04-24T08:00:00.000Z'
    },
    {
      title: 'Senior Backend Developer',
      company: 'SeniorCo',
      description: 'Requires 4 years of experience',
      postedAt: '2026-04-24T08:00:00.000Z'
    }
  ];

  const result = applyAllFilters(
    jobs,
    {
      roles: ['Backend Developer'],
      experience: 'Fresher / Student (0 years)'
    },
    10,
    now
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].company, 'CodeCo');
});

console.log('All tests passed.');
