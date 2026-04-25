# 🤖 JobBot — Telegram Daily Job Alert Bot

A free, self-hosted Telegram bot that sends you a **personalized daily job digest** every morning at 8 AM IST. Built with Node.js, scrapes Internshala, Unstop, and Naukri — no paid services required.

---

## ✨ Features

- **Interactive onboarding** — Pick job roles & experience level via Telegram inline buttons
- **Personalized filtering** — Jobs are filtered by your roles and experience
- **Multi-source scraping** — Internshala (jobs + internships), Unstop, Naukri RSS, JSearch (optional)
- **Daily digest** — Automated via GitHub Actions at 8 AM IST
- **Multi-user** — Supports unlimited users, all stored in `data/users.json`
- **Free** — No database, no paid APIs (JSearch is optional)

---

## 📁 Project Structure

```
telegram-job-bot/
├── bot.js                    ← Onboarding bot (run locally)
├── digest.js                 ← Daily digest sender (GitHub Actions)
├── scrapers/
│   ├── internshala.js
│   ├── unstop.js
│   ├── naukri.js
│   └── jsearch.js
├── utils/
│   ├── filter.js             ← Role/experience filtering & dedup
│   └── formatter.js          ← Telegram message formatter
├── data/
│   └── users.json            ← User preferences (commit this!)
├── .github/workflows/
│   └── digest.yml            ← GitHub Actions cron job
├── .env.example
└── package.json
```

---

## 🚀 One-Time Setup

### Step 1 — Create a Telegram Bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the **bot token** (looks like `123456789:ABC-DEF1234...`)

### Step 2 — Get Your Chat ID (for testing)

1. Message **@userinfobot** on Telegram
2. It will reply with your `id` — that's your `TELEGRAM_CHAT_ID`

### Step 3 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/telegram-job-bot.git
cd telegram-job-bot
npm install
```

### Step 4 — Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
TELEGRAM_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here   # optional, for fallback testing
RAPIDAPI_KEY=your_key_here           # optional, skip if not using JSearch
```

---

## 🖥️ Running the Onboarding Bot Locally

> **Important:** Run `bot.js` locally — do NOT put it in GitHub Actions (polling doesn't work well there).

```bash
node bot.js
```

You'll see:
```
🤖 JobBot is running in polling mode...
✅ Bot ready. Send /start in Telegram to begin onboarding.
```

### Adding Yourself as the First User

1. Open Telegram and find your bot (the username you gave it in BotFather)
2. Send `/start`
3. Follow the interactive setup:
   - Select up to 3 job roles (tap to toggle, tap Done when ready)
   - Select your experience level
4. You'll get a confirmation message

Your preferences are now saved in `data/users.json`.

### Stop the bot

Press `Ctrl+C` in your terminal.

---

## Deploying On Render

Render web services should use webhooks instead of Telegram polling. If the bot uses polling on Render, Telegram can return:

```text
ETELEGRAM: 409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running
```

This project now handles both modes automatically:

- Local runs use polling
- Render runs use webhook mode

### Render setup

- Service type: `Web Service`
- Build command: `npm install`
- Start command: `npm start`
- Required env var: `TELEGRAM_TOKEN`
- Optional env var: `WEBHOOK_URL=https://your-service-name.onrender.com`

If `WEBHOOK_URL` is not set, the bot will try to use Render's public URL variables automatically.

### Health check

After deploy, these endpoints should respond:

```text
https://your-service-name.onrender.com/
https://your-service-name.onrender.com/health
```

Telegram updates are delivered to:

```text
https://your-service-name.onrender.com/telegram-webhook
```

---

## 📦 Committing users.json

After onboarding yourself (and any friends), commit `users.json` to the repo so GitHub Actions can read it:

```bash
git add data/users.json
git commit -m "Add user preferences"
git push
```

> **Note:** `users.json` contains Telegram chat IDs (numeric). These are not secret, but be mindful if your repo is public.

---

## 🔑 Setting GitHub Secrets

Go to your repository → **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `TELEGRAM_TOKEN` | Your bot token from BotFather |
| `RAPIDAPI_KEY` | *(optional)* Your RapidAPI key for JSearch |

---

## ⚙️ GitHub Actions Workflows

### Daily Digest (automatic)

The workflow at `.github/workflows/digest.yml` runs automatically:
- **Every day at 8:00 AM IST** (02:30 UTC)
- Reads `data/users.json`
- Scrapes jobs from all configured sources
- Sends personalized digests to each user

### Manual Test Run

1. Go to your GitHub repo
2. Click **Actions** tab
3. Click **Daily Job Digest** in the left sidebar
4. Click **Run workflow** → **Run workflow**

Watch the logs to see scraping progress and messages sent.

---

## 📱 Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Set up or update your job preferences |
| `/now` | Get today's jobs immediately |

---

## 🔧 Optional: JSearch API

JSearch provides higher-quality job data from LinkedIn, Indeed, etc.

1. Sign up at [RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
2. Subscribe to JSearch (free tier available)
3. Copy your RapidAPI key
4. Add it as `RAPIDAPI_KEY` in `.env` and GitHub Secrets

If `RAPIDAPI_KEY` is not set, JSearch is silently skipped — the bot still works.

---

## 🛠️ Troubleshooting

**Bot doesn't respond to /start**
- Make sure `TELEGRAM_TOKEN` is correct in `.env`
- Make sure `bot.js` is running locally (`node bot.js`)

**GitHub Actions fails**
- Check that `TELEGRAM_TOKEN` secret is set correctly
- Check the Actions logs for scraper errors (each scraper is independent — one failing won't crash others)

**No jobs in digest**
- Try `/now` after setting preferences
- Job sites sometimes block scrapers — the bot will still work if at least one source succeeds
- Try broadening your role selection via `/start`

---

## 📄 License

MIT
