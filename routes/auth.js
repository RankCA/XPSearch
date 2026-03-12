const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/jobs');
  res.render('auth/login', { error: null });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('auth/login', { error: 'Please fill in all fields.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('auth/login', { error: 'Invalid email or password.' });
  }
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userRole = user.role;
  req.session.userCompanyName = user.company_name;
  req.session.flash = { success: `Welcome back, ${user.name}!` };
  res.redirect('/dashboard');
});

router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/jobs');
  res.render('auth/register', { error: null, formData: {} });
});

router.post('/register', async (req, res) => {
  const { name, email, password, role, year_group, company_name } = req.body;
  const formData = { name, email, role, year_group, company_name };

  if (!name || !email || !password || !role) {
    return res.render('auth/register', { error: 'Please fill in all required fields.', formData });
  }
  if (!['student', 'employer'].includes(role)) {
    return res.render('auth/register', { error: 'Invalid role selected.', formData });
  }
  if (role === 'student' && !['12', '13'].includes(year_group)) {
    return res.render('auth/register', { error: 'Please select a valid year group (12 or 13).', formData });
  }
  if (role === 'employer' && !company_name) {
    return res.render('auth/register', { error: 'Please enter your company name.', formData });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.render('auth/register', { error: 'Please enter a valid email address.', formData });
  }
  if (password.length < 8) {
    return res.render('auth/register', { error: 'Password must be at least 8 characters.', formData });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.render('auth/register', { error: 'An account with this email already exists.', formData });
  }

  const hashed = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role, year_group, company_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), email.trim().toLowerCase(), hashed, role, year_group || null, company_name ? company_name.trim() : null);

  req.session.userId = result.lastInsertRowid;
  req.session.userName = name.trim();
  req.session.userRole = role;
  req.session.userCompanyName = company_name ? company_name.trim() : null;
  req.session.flash = { success: `Welcome to XPSearch, ${name.trim()}!` };
  res.redirect('/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
