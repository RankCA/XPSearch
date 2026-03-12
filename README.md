# XPSearch

> **The** platform connecting Year 12 & 13 A-Level students with paid and unpaid work experience opportunities across the UK.

---

## Table of Contents

1. [What is XPSearch?](#what-is-xpsearch)
2. [Features](#features)
3. [How do I access / host it?](#how-do-i-access--host-it)
   - [Option A — Railway (recommended, free)](#option-a--railway-recommended-free)
   - [Option B — Render (free)](#option-b--render-free)
   - [Option C — Run locally](#option-c--run-locally)
   - [Why not GitHub Pages?](#why-not-github-pages)
4. [Environment Variables](#environment-variables)
5. [Tech Stack](#tech-stack)

---

## What is XPSearch?

XPSearch is a web platform where:

- **Students** (Year 12 & 13) browse work experience listings, apply with a cover letter, and track their application status.
- **Employers** post paid or unpaid work experience opportunities, review student applications, and accept or reject applicants.

---

## Features

| Feature | Description |
|---|---|
| 🎓 Student accounts | Year group selection (Y12 / Y13), application tracking dashboard |
| 🏢 Employer accounts | Company profile, post listings, manage applicants |
| 💰 Paid / unpaid listings | Mark opportunities as paid with a salary/rate, or unpaid |
| 📝 Cover letters | Students can write a short cover letter when applying |
| ✅ Accept / Reject | Employers accept or decline applications with one click |
| 🔍 Search & filter | Search by keyword and filter by paid/unpaid |
| 👤 Profile page | Update your name, company name, and password |
| 🔒 Security | CSRF protection, bcrypt passwords, rate limiting, httpOnly cookies |

---

## How do I access / host it?

XPSearch is a **Node.js server-side application** with a SQLite database. This means:

> ❌ **GitHub Pages will not work** — GitHub Pages only hosts static HTML/CSS/JS files. It cannot run Node.js code or a database.

Here are your best options, from easiest to more advanced:

---

### Option A — Railway (recommended, free)

[Railway](https://railway.app) is the easiest way to deploy a Node.js app. It gives you a public HTTPS URL, handles the server for you, and has a generous free tier.

**Steps:**

1. Push your code to a GitHub repository (you've already done this!).
2. Go to [railway.app](https://railway.app) and sign in with GitHub.
3. Click **New Project → Deploy from GitHub repo** and select this repository.
4. Railway will auto-detect Node.js and run `npm start`.
5. Go to **Settings → Variables** and add these environment variables:
   ```
   SESSION_SECRET=<generate with: openssl rand -hex 32>
   CSRF_SECRET=<generate with: openssl rand -hex 32>
   NODE_ENV=production
   ```
6. Go to **Settings → Networking → Generate Domain** to get your public URL.

That's it — your site is live! 🎉

> **Persistent storage**: Railway provides a persistent filesystem for SQLite. Your database (`xpsearch.db`) will survive restarts.

---

### Option B — Render (free)

[Render](https://render.com) also has a free tier for Node.js apps.

**Steps:**

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New → Web Service** and connect your repository.
3. Set the following:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables in the **Environment** tab:
   ```
   SESSION_SECRET=<long random string>
   CSRF_SECRET=<long random string>
   NODE_ENV=production
   ```
5. Click **Create Web Service** — Render will give you a `*.onrender.com` URL.

> ⚠️ **Note**: Render's free tier spins down after 15 minutes of inactivity and takes ~30 seconds to wake up on the next request. Upgrade to a paid plan (~$7/month) for always-on hosting.

> ⚠️ **Disk**: Render free tier does **not** provide persistent disk storage. Your SQLite database will be reset on each deploy. For persistent data on Render, upgrade to a paid plan with a Disk add-on, or switch to Railway.

---

### Option C — Run locally

To run XPSearch on your own computer (for development):

```bash
# 1. Clone the repo
git clone https://github.com/RankCA/XPSearch.git
cd XPSearch

# 2. Install dependencies
npm install

# 3. Copy the example env file and fill in your values
cp .env.example .env
# Edit .env and set SESSION_SECRET and CSRF_SECRET to any long random strings

# 4. Start the server
npm start
# Or for auto-reload during development:
npm run dev
```

Then open **http://localhost:3000** in your browser.

> **Tip**: To generate secure random secrets, run:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

### Custom domain

Once deployed on Railway or Render, you can point any domain you own at your app:

1. Buy a domain from Namecheap, GoDaddy, Cloudflare Registrar, etc.
2. In your hosting provider's settings, add a **Custom Domain**.
3. Follow the instructions to add a CNAME or A record in your domain's DNS settings.

---

### Why not GitHub Pages?

GitHub Pages only serves **static files** (plain HTML, CSS, JavaScript). XPSearch is a **server-side application** that:

- Runs a Node.js/Express web server
- Uses a SQLite database to store users, jobs, and applications
- Handles authentication, sessions, and form submissions

These things require an actual server to run, which GitHub Pages doesn't provide. Use Railway or Render instead (both free).

---

## Environment Variables

| Variable | Required in production | Description |
|---|---|---|
| `SESSION_SECRET` | ✅ Yes | Secret key for signing session cookies. Use a long random string. |
| `CSRF_SECRET` | ✅ Yes | Secret key for CSRF token signing. Use a different long random string. |
| `NODE_ENV` | Recommended | Set to `production` to enable secure cookies and strict error handling. |
| `PORT` | No | Port to listen on. Defaults to `3000`. Hosting providers set this automatically. |

Generate secrets with:
```bash
openssl rand -hex 32
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Templates | EJS (server-side rendering) |
| Database | SQLite via `better-sqlite3` |
| Sessions | `express-session` + `connect-sqlite3` |
| Auth | `bcryptjs` (password hashing) |
| CSRF | `csrf-csrf` (double-submit cookie) |
| Rate limiting | `express-rate-limit` |
| CSS | Bootstrap 5 + custom CSS (Inter font) |

---

## Project Structure

```
XPSearch/
├── app.js                 # Main Express app, middleware, top-level routes
├── db/
│   └── database.js        # SQLite setup and schema (users, jobs, applications)
├── middleware/
│   └── auth.js            # requireAuth / requireRole middleware
├── routes/
│   ├── auth.js            # /auth/login, /auth/register, /auth/logout
│   ├── jobs.js            # /jobs CRUD
│   ├── applications.js    # /applications (apply, update status)
│   └── profile.js         # /profile (view, update name, change password)
├── views/
│   ├── partials/          # header.ejs, footer.ejs
│   ├── index.ejs          # Home page
│   ├── about.ejs          # About page
│   ├── profile.ejs        # Profile page
│   ├── error.ejs          # Error page
│   ├── auth/              # login.ejs, register.ejs
│   ├── jobs/              # index.ejs, show.ejs, new.ejs, edit.ejs
│   └── dashboard/         # student.ejs, employer.ejs
├── public/
│   └── css/
│       └── style.css      # Custom styles (loaded locally, not CDN)
├── .env.example           # Template for environment variables
├── Procfile               # For Railway / Heroku deployment
└── render.yaml            # For Render deployment
```
