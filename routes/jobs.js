const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', (req, res) => {
  const keyword = req.query.keyword || '';
  const paid = req.query.paid || '';
  const location = req.query.location || '';

  let query = `
    SELECT jobs.*, users.name AS employer_name, users.company_name,
           COUNT(applications.id) AS apply_count
    FROM jobs
    LEFT JOIN users ON jobs.employer_id = users.id
    LEFT JOIN applications ON jobs.id = applications.job_id
    WHERE jobs.status = 'open'
  `;
  const params = [];

  if (keyword) {
    query += ` AND (jobs.title LIKE ? OR jobs.description LIKE ? OR users.company_name LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (location) {
    query += ` AND jobs.location LIKE ?`;
    params.push(`%${location}%`);
  }
  if (paid === '1') {
    query += ` AND jobs.is_paid = 1`;
  } else if (paid === '0') {
    query += ` AND jobs.is_paid = 0`;
  }

  query += ` GROUP BY jobs.id ORDER BY jobs.created_at DESC`;
  const jobs = db.prepare(query).all(...params);
  res.render('jobs/index', { jobs, keyword, paid, location });
});

router.get('/new', requireRole('employer'), (req, res) => {
  res.render('jobs/new', { error: null, formData: {} });
});

router.post('/', requireRole('employer'), (req, res) => {
  const { title, description, requirements, location, is_paid, salary, deadline } = req.body;
  if (!title || !description || !location) {
    return res.render('jobs/new', { error: 'Please fill in all required fields.', formData: req.body });
  }
  if (title.trim().length > 200) {
    return res.render('jobs/new', { error: 'Job title must be 200 characters or fewer.', formData: req.body });
  }
  if (description.trim().length > 10000) {
    return res.render('jobs/new', { error: 'Description must be 10,000 characters or fewer.', formData: req.body });
  }
  if (requirements && requirements.trim().length > 5000) {
    return res.render('jobs/new', { error: 'Requirements must be 5,000 characters or fewer.', formData: req.body });
  }
  if (deadline && new Date(deadline) < new Date(new Date().toDateString())) {
    return res.render('jobs/new', { error: 'Deadline cannot be in the past.', formData: req.body });
  }
  const isPaid = is_paid === '1' ? 1 : 0;
  db.prepare(
    'INSERT INTO jobs (employer_id, title, description, requirements, location, is_paid, salary, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.session.userId, title.trim(), description.trim(), requirements ? requirements.trim() : null, location.trim(), isPaid, isPaid && salary ? salary.trim() : null, deadline || null);

  req.session.flash = { success: 'Job listing created successfully!' };
  res.redirect('/dashboard');
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.redirect('/dashboard');
});

router.get('/:id', (req, res) => {
  const job = db.prepare(`
    SELECT jobs.*, users.name AS employer_name, users.company_name, users.email AS employer_email
    FROM jobs LEFT JOIN users ON jobs.employer_id = users.id
    WHERE jobs.id = ?
  `).get(req.params.id);

  if (!job) return res.status(404).render('error', { message: 'Job not found.' });

  let application = null;
  let applications = [];

  if (req.session.userId) {
    if (req.session.userRole === 'student') {
      application = db.prepare('SELECT * FROM applications WHERE job_id = ? AND student_id = ?')
        .get(job.id, req.session.userId);
    }
    if (req.session.userRole === 'employer' && job.employer_id === req.session.userId) {
      applications = db.prepare(`
        SELECT applications.*, users.name AS student_name, users.email AS student_email, users.year_group
        FROM applications
        LEFT JOIN users ON applications.student_id = users.id
        WHERE applications.job_id = ?
        ORDER BY applications.created_at DESC
      `).all(job.id);
    }
  }

  res.render('jobs/show', { job, application, applications });
});

router.get('/:id/edit', requireRole('employer'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, req.session.userId);
  if (!job) return res.status(404).render('error', { message: 'Job not found or access denied.' });
  res.render('jobs/edit', { job, error: null });
});

router.put('/:id', requireRole('employer'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, req.session.userId);
  if (!job) return res.status(404).render('error', { message: 'Job not found or access denied.' });

  const { title, description, requirements, location, is_paid, salary, deadline, status } = req.body;
  if (!title || !description || !location) {
    return res.render('jobs/edit', { job: { ...job, ...req.body }, error: 'Please fill in all required fields.' });
  }
  if (title.trim().length > 200) {
    return res.render('jobs/edit', { job: { ...job, ...req.body }, error: 'Job title must be 200 characters or fewer.' });
  }
  if (description.trim().length > 10000) {
    return res.render('jobs/edit', { job: { ...job, ...req.body }, error: 'Description must be 10,000 characters or fewer.' });
  }
  if (requirements && requirements.trim().length > 5000) {
    return res.render('jobs/edit', { job: { ...job, ...req.body }, error: 'Requirements must be 5,000 characters or fewer.' });
  }
  const isPaid = is_paid === '1' ? 1 : 0;
  db.prepare(
    'UPDATE jobs SET title=?, description=?, requirements=?, location=?, is_paid=?, salary=?, deadline=?, status=? WHERE id=?'
  ).run(title.trim(), description.trim(), requirements ? requirements.trim() : null, location.trim(), isPaid, isPaid && salary ? salary.trim() : null, deadline || null, status || 'open', job.id);

  req.session.flash = { success: 'Job listing updated successfully!' };
  res.redirect(`/jobs/${job.id}`);
});

router.delete('/:id', requireRole('employer'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(req.params.id, req.session.userId);
  if (!job) return res.status(404).render('error', { message: 'Job not found or access denied.' });
  db.prepare('DELETE FROM applications WHERE job_id = ?').run(job.id);
  db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);
  req.session.flash = { success: 'Job listing deleted.' };
  res.redirect('/dashboard');
});

module.exports = router;
