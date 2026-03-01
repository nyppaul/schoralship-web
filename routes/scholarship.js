const express = require('express');
const router = express.Router();

// Demo scholarships (used as fallback)
// Demo scholarships (used as fallback)
// Admin entries will be stored in memory and merged with the demo/remote data.
// In a production system you would persist these to a database or file.

const DEMO_SCHOLARSHIPS = [
  {
    id: '1',
    title: 'Harvard Global Excellence Scholarship',
    description: 'Fully funded scholarship for international students pursuing undergraduate or graduate degrees at Harvard University.',
    amount: 50000,
    awards: 10,
    deadline: '2026-04-30',
    start: '2024-03-01',
    isFree: false,
    timezone: 'America/New_York',
    price: 1500
  },
  {
    id: '2',
    title: 'MIT Presidential Fellowship',
    description: 'Prestigious scholarship covering full tuition, living expenses, and research funding for select candidates.',
    amount: 60000,
    awards: 5,
    deadline: '2026-03-15',
    start: '2024-02-01',
    isFree: false,
    timezone: 'America/New_York',
    price: 1500
  },
  {
    id: '3',
    title: 'Oxford University Rhodes Scholarship',
    description: 'Historic scholarship supporting leaders to make a difference in the world through education at Oxford.',
    amount: 45000,
    awards: 20,
    deadline: '2026-05-15',
    start: '2024-04-01',
    isFree: false,
    timezone: 'Europe/London',
    price: 1500
  },
  {
    id: '4',
    title: 'Stanford Knight-Hennessy Scholarship',
    description: 'Full-ride scholarship for graduate students with demonstrated leadership potential.',
    amount: 55000,
    awards: 15,
    deadline: '2026-06-30',
    start: '2024-05-15',
    isFree: false,
    timezone: 'America/Los_Angeles',
    price: 1500
  },
  {
    id: '5',
    title: 'Cambridge International Programme',
    description: 'Comprehensive scholarship for international students across all schools and colleges.',
    amount: 48000,
    awards: 25,
    deadline: '2026-04-15',
    start: '2024-03-15',
    isFree: false,
    timezone: 'Europe/London',
    price: 1500
  },
  {
    id: '6',
    title: 'Yale World Scholarship',
    description: 'Merit-based scholarship for exceptional international applicants to all degree programs.',
    amount: 52000,
    awards: 12,
    deadline: '2026-05-01',
    start: '2024-04-01',
    isFree: false,
    timezone: 'America/New_York',
    price: 1500
  },
  {
    id: '7',
    title: 'Columbia Global Fellowship',
    description: 'Scholarship supporting diversity and international perspectives in higher education.',
    amount: 50000,
    awards: 18,
    deadline: '2026-05-20',
    start: '2024-04-10',
    isFree: false,
    timezone: 'America/New_York',
    price: 1500
  },
  {
    id: '8',
    title: 'UC Berkeley Achievement Award',
    description: 'Scholarship for outstanding international students demonstrating academic excellence and leadership.',
    amount: 45000,
    awards: 20,
    deadline: '2026-06-01',
    start: '2024-05-01',
    isFree: false,
    timezone: 'America/Los_Angeles',
    price: 1500
  },
  {
    id: '9',
    title: 'Canadian Prime Minister Scholarship',
    description: 'Fully funded scholarship for Masters and PhD programs at leading Canadian universities.',
    amount: 40000,
    awards: 30,
    deadline: '2026-04-30',
    start: '2024-03-20',
    isFree: false,
    timezone: 'America/Toronto',
    price: 1500
  },
  {
    id: '10',
    title: 'NUS Singapore Excellence Scholarship',
    description: 'Prestigious scholarship for international students at the National University of Singapore.',
    amount: 35000,
    awards: 15,
    deadline: '2026-05-31',
    start: '2024-04-15',
    isFree: false,
    timezone: 'Asia/Singapore',
    price: 1500
  }
];

// in-memory admin entries
const adminEntries = [];


// GET /api/scholarships
// Fetches scholarships from ScholarshipOwl API, falls back to demo data if API fails
// Admin-created entries are appended to the result.
router.get('/scholarships', async (req, res) => {
  try {
    const apiKey = process.env.SCHOLARSHIP_API_Key;

    // If no API key, use demo data
    if (!apiKey) {
      console.log('No ScholarshipOwl API key configured. Using demo data.');
      const combined = DEMO_SCHOLARSHIPS.concat(adminEntries);
      return res.json({ success: true, source: 'demo', data: combined });
    }

    // Try to fetch from ScholarshipOwl API
    console.log('Fetching scholarships from ScholarshipOwl API...');
    
    const response = await fetch(
      'https://api.business.scholarshipowl.com/api/scholarship?page[size]=50',
      {
        method: 'GET',
        headers: {
          'SCHOLARSHIP-APP-API-Key': apiKey
        }
      }
    );

    // If API fails, fall back to demo data
    if (!response.ok) {
      console.warn(`ScholarshipOwl API error: ${response.status}. Falling back to demo data.`);
      return res.json({ success: true, source: 'demo', data: DEMO_SCHOLARSHIPS });
    }

    const data = await response.json();
    const scholarships = (data.data || []).map(s => ({
      id: s.id,
      title: s.attributes.title,
      description: s.attributes.description,
      amount: s.attributes.amount || 0,
      awards: s.attributes.awards || 0,
      deadline: s.attributes.deadline,
      start: s.attributes.start,
      isFree: s.attributes.isFree === true,
      timezone: s.attributes.timezone,
      expiredAt: s.attributes.expiredAt,
      price: 1500, // Fixed price: 1500 RWF
      links: s.links
    }));

    console.log(`Fetched ${scholarships.length} scholarships from ScholarshipOwl`);
    const combined = scholarships.concat(adminEntries);
    return res.json({ success: true, source: 'scholarshipowl', data: combined });
  } catch (err) {
    console.error('Scholarships API error:', err && err.message ? err.message : err);
    console.log('Using demo data instead.');
    // Always return demo data if there's any error
    return res.json({ success: true, source: 'demo', data: DEMO_SCHOLARSHIPS });
  }
});


// POST /api/admin/entries
// Allows an administrator to add a scholarship or visa entry manually. Simple header-based
// secret check prevents casual clients from abusing the endpoint. The entries live in
// memory so they will be lost when the server restarts; for production you'd write to a
// database.
router.post('/admin/entries', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'devsecret';
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { type, title, location, details, pictureUrl, url } = req.body;
  if (!type || !title || !details || !url) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const entry = {
    id: `admin-${Date.now()}`,
    type,
    title,
    location,
    description: details,
    pictureUrl,
    link: url,
    price: 1500
  };
  adminEntries.push(entry);
  console.log('Admin added entry:', entry);
  return res.json({ success: true, entry });
});

module.exports = router;
