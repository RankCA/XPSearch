const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

router.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');
  const profile = db.prepare('SELECT id, name, email, role, year_group, company_name FROM users WHERE id = ?').get(req.session.userId);
  if (!profile) return res.redirect('/auth/login');
  res.render('profile', { profile, nameError: null, pwError: null });
});

router.post('/', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');
  const profile = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!profile) return res.redirect('/auth/login');

  const { action } = req.body;

  if (action === 'update_name') {
    const { name, company_name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.render('profile', { profile, nameError: 'Name must be at least 2 characters.', pwError: null });
    }
    if (profile.role === 'employer' && (!company_name || !company_name.trim())) {
      return res.render('profile', { profile, nameError: 'Company name is required.', pwError: null });
    }
    const newName = name.trim();
    const newCompany = profile.role === 'employer' ? company_name.trim() : profile.company_name;
    db.prepare('UPDATE users SET name = ?, company_name = ? WHERE id = ?')
      .run(newName, newCompany, req.session.userId);
    req.session.userName = newName;
    if (profile.role === 'employer') req.session.userCompanyName = newCompany;
    req.session.flash = { success: 'Profile updated successfully.' };
    return res.redirect('/profile');
  }

  if (action === 'change_password') {
    const { current_password, new_password } = req.body;
    if (!bcrypt.compareSync(current_password, profile.password)) {
      return res.render('profile', { profile, nameError: null, pwError: 'Current password is incorrect.' });
    }
    if (!new_password || new_password.length < 8) {
      return res.render('profile', { profile, nameError: null, pwError: 'New password must be at least 8 characters.' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.session.userId);
    req.session.flash = { success: 'Password changed successfully.' };
    return res.redirect('/profile');
  }

  res.redirect('/profile');
});

module.exports = router;
