const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const cookieParser = require('cookie-parser');
const SqliteStore = require('connect-sqlite3')(session);
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

app.use(session({
  store: new SqliteStore({ db: 'sessions.db', dir: '.' }),
  secret: 'xpsearch-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => 'xpsearch-csrf-secret-change-in-production',
  getSessionIdentifier: (req) => req.sessionID || '',
  cookieName: 'xpsearch.csrf-token',
  cookieOptions: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  },
  size: 64,
  getCsrfTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token']
});

app.use((req, res, next) => {
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    name: req.session.userName,
    role: req.session.userRole,
    companyName: req.session.userCompanyName
  } : null;
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
});

app.use(doubleCsrfProtection);

app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/jobs', generalLimiter, require('./routes/jobs'));
app.use('/applications', generalLimiter, require('./routes/applications'));

app.get('/', generalLimiter, (req, res) => {
  const db = require('./db/database');
  const keyword = req.query.keyword || '';
  const paid = req.query.paid || '';

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
  if (paid === '1') {
    query += ` AND jobs.is_paid = 1`;
  } else if (paid === '0') {
    query += ` AND jobs.is_paid = 0`;
  }

  query += ` GROUP BY jobs.id ORDER BY jobs.created_at DESC LIMIT 12`;

  const jobs = db.prepare(query).all(...params);
  res.render('index', { jobs, keyword, paid });
});

app.get('/dashboard', generalLimiter, requireAuth, (req, res) => {
  const db = require('./db/database');
  if (req.session.userRole === 'student') {
    const applications = db.prepare(`
      SELECT applications.*, jobs.title AS job_title, jobs.location, jobs.is_paid, users.company_name
      FROM applications
      LEFT JOIN jobs ON applications.job_id = jobs.id
      LEFT JOIN users ON jobs.employer_id = users.id
      WHERE applications.student_id = ?
      ORDER BY applications.created_at DESC
    `).all(req.session.userId);
    res.render('dashboard/student', { applications });
  } else {
    const jobs = db.prepare(`
      SELECT jobs.*, COUNT(applications.id) AS apply_count
      FROM jobs
      LEFT JOIN applications ON jobs.id = applications.job_id
      WHERE jobs.employer_id = ?
      GROUP BY jobs.id
      ORDER BY jobs.created_at DESC
    `).all(req.session.userId);
    res.render('dashboard/employer', { jobs });
  }
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', { message: 'Invalid or missing CSRF token. Please go back and try again.' });
  }
  console.error(err.stack);
  res.status(500).render('error', { message: 'Something went wrong. Please try again.' });
});

app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`XPSearch running on http://localhost:${PORT}`);
});

module.exports = app;
