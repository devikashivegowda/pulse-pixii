# Rufus Readiness Twin

Rufus Readiness Twin is a mini product for Amazon sellers. Paste your Amazon listing, competitor URLs, and a shopper question, then get an AI-shopping readiness report: predicted ranking, recommendation risk, missing proof points, and a Pixii-style creative brief.

## Why this exists

Amazon sellers do not only need prettier images. They need to understand whether AI shopping assistants will recommend their product when buyers ask natural-language questions like:

> best magnesium supplement for seniors who want better sleep

This app turns that question into an action plan for listing copy, main images, lifestyle photos, infographics, and A+ content.

## Tools and APIs

- Next.js + React for the app
- Jina Reader for public listing text extraction
- Google Gemini for one AI-shopping simulation
- Groq/Llama for a second AI-shopping simulation
- Vercel free tier for deployment

The app includes a deterministic fallback report, so it can still be demoed without API keys.

## Local setup

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` for live AI mode:

```bash
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

Then open:

```text
http://localhost:3000
```

## Deployment

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add `GEMINI_API_KEY` and `GROQ_API_KEY` in Vercel project environment variables.
4. Deploy.

## 3-minute video angle

Lead with the seller problem:

> Shoppers are asking AI what to buy. Sellers do not know whether their product will be recommended or why competitors win.

Demo flow:

1. Paste your listing and competitor URLs.
2. Ask a shopper question.
3. Show the predicted ranking.
4. Explain the most useful part: the creative and copy action plan.
5. Mention the tools: Jina Reader, Gemini, Groq, Vercel.

If there was more time, add review scraping, weekly monitoring, competitor alerts, and direct publishing of Pixii-generated image briefs.
