const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireRole } = require('../middleware/auth');

router.post('/', requireRole('student'), (req, res) => {
  const { job_id, cover_letter } = req.body;
  const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'open'").get(job_id);
  if (!job) {
    req.session.flash = { error: 'Job not found or is no longer accepting applications.' };
    return res.redirect('/jobs');
  }
  const existing = db.prepare('SELECT id FROM applications WHERE job_id = ? AND student_id = ?').get(job_id, req.session.userId);
  if (existing) {
    req.session.flash = { error: 'You have already applied to this job.' };
    return res.redirect(`/jobs/${job_id}`);
  }
  db.prepare('INSERT INTO applications (job_id, student_id, cover_letter) VALUES (?, ?, ?)').run(job_id, req.session.userId, cover_letter ? cover_letter.trim() : null);
  req.session.flash = { success: 'Application submitted successfully!' };
  res.redirect(`/jobs/${job_id}`);
});

router.post('/:id/status', requireRole('employer'), (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    req.session.flash = { error: 'Invalid status.' };
    return res.redirect('back');
  }
  const application = db.prepare(`
    SELECT applications.*, jobs.employer_id
    FROM applications
    LEFT JOIN jobs ON applications.job_id = jobs.id
    WHERE applications.id = ?
  `).get(req.params.id);
  if (!application || application.employer_id !== req.session.userId) {
    return res.status(403).render('error', { message: 'Access denied.' });
  }
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, application.id);
  req.session.flash = { success: `Application ${status}.` };
  res.redirect(`/jobs/${application.job_id}`);
});

module.exports = router;
