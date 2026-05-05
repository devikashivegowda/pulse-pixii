# Pulse by Pixii

Pulse by Pixii is an AI-shopping readiness tool for Amazon sellers.

It helps a seller answer one high-stakes question:

> If a shopper asks an AI assistant what to buy, will my product be recommended?

The app lets a seller paste their Amazon listing URL, competitor URLs, and a shopper question such as:

```text
best magnesium supplement for seniors who want better sleep
```

Pulse then generates a seller-facing report with:

- predicted recommendation ranking
- recommendation likelihood score
- reasons the product wins or loses
- missing proof points
- shopper hesitation analysis
- Pixii-style creative brief for main images, lifestyle images, infographics, bullets, and A+ content

## Assessment Context

This project was built for the Pixii job assessment.

The assessment asked candidates to pick one project, use 2+ APIs/tools, build something that runs on its own, and explain the work from the user's perspective rather than only talking about code.

I chose the **Rufus reverse engineer / AI shopping assistant readiness** direction because it is closely connected to Pixii's business. Pixii helps Amazon sellers improve product visuals, listing content, and conversion. As Amazon shopping becomes more AI-assisted through systems like Rufus and COSMO, sellers will increasingly need to understand not just whether their listing looks good, but whether an AI shopping assistant can confidently recommend it.

## User Problem

Amazon sellers are used to optimizing for keywords, reviews, and images. But AI shopping assistants change the buying journey.

A shopper may no longer search only:

```text
magnesium supplement
```

They may ask:

```text
best magnesium supplement for seniors who want better sleep
```

That query has intent, audience, trust concerns, and comparison criteria inside it.

The seller's problem is:

> I do not know whether my listing gives enough evidence for an AI shopping assistant to recommend my product over competitors.

Pulse solves this by turning the shopper's question into a practical action plan.

## Why This Project Was Chosen

I chose this topic because it sits at the intersection of:

- Amazon listing optimization
- AI shopping behavior
- competitor analysis
- conversion-focused creative strategy
- Pixii's core product direction

Instead of building a generic AI image generator, I wanted to build something that helps a seller decide **what images and content should be generated in the first place**.

The useful output is not just a score. It is the bridge from diagnosis to creative execution:

- What should the main image communicate?
- What proof is missing?
- What should an infographic explain?
- Which competitor is more recommendable and why?
- What would an AI shopper say to the customer?

## What The App Does

1. The user enters their Amazon listing URL.
2. The user enters competitor listing URLs.
3. The user enters a shopper question.
4. The backend attempts to extract listing content through Jina Reader.
5. The app sends the listing evidence to two AI model providers when API keys are available.
6. The app generates a structured recommendation-readiness report.
7. If live model calls fail or keys are missing, the app still works using local intent-aware fallback logic.

## Demo Questions

These questions are useful for testing because each one triggers a different shopper intent:

```text
best magnesium supplement for seniors who want better sleep
best sunscreen for oily acne prone skin
affordable protein powder for lean muscle
cheap lunch box for office under 500
```

The report changes based on the question. For example, a senior sleep supplement query emphasizes safety, dosage, and tolerance proof, while a skincare query emphasizes skin type fit, irritation risk, and visible result claims.

## Tools And APIs Used

This project uses more than two APIs/tools beyond the AI assistant used for development:

- **Next.js + React**: full-stack web application
- **Vercel**: public deployment
- **Jina Reader**: public page/listing text extraction
- **Google Gemini API**: first AI-shopping simulation model
- **Groq API**: second AI-shopping simulation model
- **GitHub**: public repository and deployment source

The app is designed to run even if Gemini/Groq keys are unavailable, because assessment demos should not fail due to rate limits or temporary API errors.

## How It Works

The main API route is:

```text
app/api/audit/route.js
```

High-level flow:

```text
User input
  -> product URL + competitors + shopper question
  -> listing extraction with Jina Reader
  -> Gemini and Groq model calls
  -> JSON report normalization
  -> fallback rubric if live AI is unavailable
  -> frontend report rendering
```

The fallback mode is intentionally not a static canned response. It detects shopper intent categories such as:

- senior safety
- sleep support
- skincare results
- fitness performance
- budget/value
- general exact-need matching

This makes the app usable and demoable even without live model access.

## UI Direction

The UI is inspired by Pixii's clean, bold, ecommerce-focused feel:

- large black typography
- lime accent color
- off-white background
- compact product-style cards
- direct, seller-focused wording
- clear report sections instead of a chat interface

The goal was to make it feel like a focused Pixii product surface, not a generic AI wrapper.

## Local Setup

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Create a `.env` file locally:

```env
GEMINI_API_KEY=your_real_gemini_key
GROQ_API_KEY=your_real_groq_key
```

Do not commit `.env`.

`.env.example` only contains placeholders:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

## Deployment

This app is designed for Vercel.

Deployment steps:

1. Push the code to GitHub.
2. Import the GitHub repo into Vercel.
3. Set the framework preset to Next.js.
4. Add environment variables in Vercel:

```text
GEMINI_API_KEY
GROQ_API_KEY
```

5. Deploy.

If environment variables are missing, the app still runs in fallback mode.

## Running Checks

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

## Project Structure

```text
app/
  api/
    audit/
      route.js        Backend audit logic
  globals.css         Main visual system and responsive styling
  layout.js           App metadata and root layout
  page.js             Main UI and report rendering

.env.example          Safe environment variable template
eslint.config.mjs     ESLint flat config
next.config.mjs       Next.js config
package.json          Scripts and dependencies
README.md             Project documentation
```

## Current Limitations

This is a 4-6 hour assessment project, so some parts are intentionally lightweight:

- It does not perform deep authenticated Amazon scraping.
- It does not fetch 1000+ real reviews yet.
- It does not estimate revenue.
- It does not generate final images directly.
- Live model quality depends on Gemini/Groq key availability and rate limits.
- Jina Reader extraction can vary based on Amazon page accessibility.

The app is still useful because it demonstrates the product workflow: shopper question -> competitor evidence -> recommendation risk -> creative action plan.

## If There Was More Time

With more time, I would expand this into a stronger Pixii-style product:

- scrape and cluster real Amazon reviews
- identify top customer purchase criteria per category
- compare 10+ competitors automatically
- estimate monthly revenue and review velocity
- track weekly changes in AI recommendation ranking
- add saved reports for each ASIN
- generate image prompts directly for Pixii-style lifestyle photos
- create A/B creative briefs for main image, infographic, and A+ content
- add a browser extension for sellers viewing Amazon listings
- build a monitoring dashboard for "AI recommendation share of voice"
- integrate image generation so the app not only says what to fix, but produces first-draft creative assets

The larger product vision:

> Pulse becomes the AI search and creative strategy layer for Amazon sellers before they generate or update their listing content.

## 3-Minute Video Outline

Recommended structure:

1. Name, school, CGPA, and favorite accomplishment.
2. Explain the user problem: sellers do not know whether AI shopping assistants will recommend them.
3. Demo the app from the seller's perspective.
4. Show how the report changes for different shopper questions.
5. Explain why the design focuses on action, not just scores.
6. Mention the tools/APIs: Jina Reader, Gemini, Groq, Next.js, Vercel.
7. Close with what would be built next if there was more time.

The key framing for the video:

> I built this for the Amazon seller who needs to know why a competitor wins the AI recommendation and what creative or listing changes would help them win.
