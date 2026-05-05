export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-1.5-flash";
const GROQ_MODEL = "llama-3.1-8b-instant";

export async function POST(request) {
  try {
    const body = await request.json();
    const productUrl = String(body.productUrl || "").trim();
    const shopperQuestion = String(body.shopperQuestion || "").trim();
    const competitorUrls = String(body.competitorUrls || "")
      .split(/\n|,/)
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!productUrl || !shopperQuestion) {
      return Response.json({ error: "Add your product URL and shopper question." }, { status: 400 });
    }

    const urls = [productUrl, ...competitorUrls];
    const listings = await Promise.all(
      urls.map((url, index) =>
        extractListing(url, index === 0 ? "Your listing" : `Competitor ${index}`)
      )
    );

    const prompt = buildPrompt({ shopperQuestion, listings });
    const [gemini, groq] = await Promise.allSettled([callGemini(prompt), callGroq(prompt)]);
    const modelOutputs = [
      gemini.status === "fulfilled" ? gemini.value : "",
      groq.status === "fulfilled" ? groq.value : ""
    ].filter(Boolean);

    const parsed = parseFirstJson(modelOutputs.join("\n"));
    const report = parsed || buildFallbackReport(shopperQuestion, listings, modelOutputs.length);

    return Response.json({
      ...normalizeReport(report, shopperQuestion),
      mode: modelOutputs.length ? `${modelOutputs.length} live model${modelOutputs.length > 1 ? "s" : ""}` : "demo fallback"
    });
  } catch (error) {
    return Response.json(
      {
        error:
          "The audit hit an unexpected issue. Try the demo inputs, or check your API keys if you are running live mode."
      },
      { status: 500 }
    );
  }
}

async function extractListing(url, label) {
  try {
    const realReaderUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
    const response = await fetch(realReaderUrl, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      throw new Error("reader failed");
    }

    const text = await response.text();
    return {
      label,
      url,
      text: cleanText(text).slice(0, 4500)
    };
  } catch {
    return {
      label,
      url,
      text: `${label} from ${url}. Listing text was not reachable in this run, so infer likely ecommerce evidence from the URL and make conservative recommendations.`
    };
  }
}

function cleanText(text) {
  return text
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrompt({ shopperQuestion, listings }) {
  return `You are simulating an AI shopping assistant for Amazon customers.

Shopper question: ${shopperQuestion}

Product listings:
${listings.map((item) => `${item.label}: ${item.url}\n${item.text}`).join("\n\n")}

Return only valid JSON with this shape:
{
  "headline": "short report headline",
  "score": 0-100,
  "bestFix": "single most useful action",
  "modelAgreement": "short consensus phrase",
  "ranking": [
    {"rank": 1, "name": "product name or label", "reason": "why", "verdict": "Winner|Risk|Weak"}
  ],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missingProof": ["..."],
  "creativeBrief": ["main image idea", "lifestyle image idea", "infographic idea", "copy/A+ idea"],
  "shopperAnswer": "one paragraph answer a shopper might receive"
}

Judge relevance, proof, review signals, benefit clarity, trust signals, and whether the listing content answers the shopper's exact use case.`;
}

async function callGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) return "";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, responseMimeType: "application/json" }
      }),
      signal: AbortSignal.timeout(18000)
    }
  );

  if (!response.ok) return "";
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callGroq(prompt) {
  if (!process.env.GROQ_API_KEY) return "";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "Return concise, valid JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.25
    }),
    signal: AbortSignal.timeout(18000)
  });

  if (!response.ok) return "";
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseFirstJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeReport(report, question) {
  const safeList = (value, fallback) =>
    Array.isArray(value) && value.length ? value.map(String).slice(0, 6) : fallback;

  return {
    headline: String(report.headline || "Your listing is not yet Rufus-ready"),
    score: Number.isFinite(Number(report.score)) ? Math.max(0, Math.min(100, Number(report.score))) : 62,
    question,
    bestFix: String(report.bestFix || "Add sharper proof for the shopper's exact use case."),
    modelAgreement: String(report.modelAgreement || "Models agree on proof and positioning gaps."),
    ranking:
      Array.isArray(report.ranking) && report.ranking.length
        ? report.ranking.slice(0, 6).map((item, index) => ({
            rank: Number(item.rank || index + 1),
            name: String(item.name || `Product ${index + 1}`),
            reason: String(item.reason || "Ranked by relevance and evidence."),
            verdict: String(item.verdict || (index === 0 ? "Winner" : "Risk"))
          }))
        : [],
    strengths: safeList(report.strengths, ["The listing has a clear product category and enough context for an AI assistant to classify it."]),
    weaknesses: safeList(report.weaknesses, ["The listing does not directly answer the shopper's use case with enough specific proof."]),
    missingProof: safeList(report.missingProof, ["Use-case specific benefits, safety/tolerance proof, review-backed claims, and comparison evidence."]),
    creativeBrief: safeList(report.creativeBrief, [
      "Main image: make the hero pack, core benefit, and target shopper legible at thumbnail size.",
      "Lifestyle image: show the product in the exact customer moment implied by the query.",
      "Infographic: compare dosage, form, benefits, and trust signals against alternatives.",
      "A+ block: turn the biggest objection into proof-led education."
    ]),
    shopperAnswer: String(
      report.shopperAnswer ||
        "I would compare the top options by relevance to the shopper's need, proof quality, and trust signals. The current listing needs more specific evidence before it becomes the confident recommendation."
    )
  };
}

function buildFallbackReport(question, listings, liveModelCount) {
  const profile = detectIntentProfile(question);
  const terms = extractImportantTerms(question);
  const scoredListings = scoreListings(listings, profile, terms);
  const yourListing = scoredListings.find((item) => item.original.label === "Your listing") || scoredListings[0];
  const winningListing = scoredListings[0];
  const score = Math.max(38, Math.min(86, yourListing.score));
  const rank = scoredListings.findIndex((item) => item.original.label === "Your listing") + 1;
  const category = extractProductPhrase(question, terms) || profile.category;

  return {
    headline:
      rank === 1
        ? `Your listing is close for ${profile.category} shoppers`
        : `You are losing the ${profile.category} shopper`,
    score: liveModelCount ? Math.min(90, score + 6) : score,
    bestFix: profile.bestFix(category),
    modelAgreement: liveModelCount
      ? "Live model output was partially available; fallback completed the report."
      : `Demo mode used local intent rules for ${profile.category}, audience fit, and keyword evidence.`,
    ranking: scoredListings.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      reason: item.reason,
      verdict: item.original.label === "Your listing" && index === 0 ? "Winner" : index === 0 ? "Winner" : "Risk"
    })),
    strengths: [
      profile.strength(category),
      `The audit found ${terms.slice(0, 3).join(", ") || profile.category} signals to anchor the recommendation logic.`,
      "The seller can improve ranking quickly because the shopper question is narrow and conversion-driven."
    ],
    weaknesses: profile.weaknesses(category, question),
    missingProof: profile.missingProof(category, question),
    creativeBrief: profile.creativeBrief(category),
    shopperAnswer: profile.shopperAnswer({
      category,
      question,
      rank,
      winner: winningListing.name,
      yourListing: yourListing.name
    })
  };
}

const INTENT_PROFILES = [
  {
    id: "seniors",
    category: "senior-safety",
    keywords: ["senior", "seniors", "elderly", "older", "ageing", "aging", "joint", "mobility"],
    bestFix: (category) => `Show safety, dosage clarity, and suitability proof for older shoppers looking for ${category}.`,
    strength: (category) => `The query includes a specific audience, so ${category} proof can create a strong recommendation edge.`,
    weaknesses: (category) => [
      `The listing must make senior suitability for ${category} visible before the shopper reads long bullets.`,
      "AI assistants will hesitate if dosage, side effects, contraindications, or usage timing are vague.",
      "A generic wellness claim is weaker than evidence framed around older shoppers."
    ],
    missingProof: (category, question) => [
      `Direct proof for: "${question}".`,
      "Clear dosage, tolerance, certifications, third-party testing, and who should consult a doctor.",
      `Review snippets from older buyers mentioning ${category}, comfort, ease of use, or repeat purchase.`
    ],
    creativeBrief: (category) => [
      `Main image: add a clean "senior-friendly" or "gentle daily support" benefit badge tied to ${category}.`,
      "Lifestyle image: show the product in a calm morning or evening routine for an older adult.",
      "Infographic: explain dosage, safety checks, and why this form is easier to trust.",
      "A+ block: address safety, interactions, and usage consistency in plain language."
    ],
    shopperAnswer: ({ question, winner, yourListing, rank }) =>
      `For "${question}", I would favor ${winner} if it gives clearer senior-specific proof. ${yourListing} ranks #${rank} because it may be relevant, but it needs stronger safety, dosage, and trust signals for older shoppers before it becomes the confident recommendation.`
  },
  {
    id: "sleep",
    category: "sleep-support",
    keywords: ["sleep", "insomnia", "night", "relax", "rest", "calm", "stress"],
    bestFix: (category) => `Connect ${category} to a believable night routine, dosage timing, and non-habit-forming proof.`,
    strength: (category) => `The shopper has a clear outcome in mind, so a focused ${category} claim can outperform broad wellness copy.`,
    weaknesses: (category) => [
      `The listing needs proof that the product helps with ${category}, not just general health.`,
      "AI assistants will look for timing, ingredients, tolerance, and review language around sleep quality.",
      "If the first image does not communicate the night-time use case, competitors can look more relevant."
    ],
    missingProof: (category, question) => [
      `A claim that directly answers: "${question}".`,
      "Usage timing, expected routine, ingredient mechanism, and review snippets mentioning sleep or calm.",
      `Comparison against alternatives that shoppers associate with ${category}.`
    ],
    creativeBrief: (category) => [
      `Main image: make ${category} visible with a simple "night routine" benefit cue.`,
      "Lifestyle image: bedside or evening routine scene with the target shopper.",
      "Infographic: show when to take it, why the form matters, and what results shoppers can reasonably expect.",
      "A+ block: explain the mechanism without overclaiming medical outcomes."
    ],
    shopperAnswer: ({ question, winner, yourListing, rank }) =>
      `For "${question}", I would recommend ${winner} if it most clearly proves night-time use, ingredient fit, and buyer trust. ${yourListing} ranks #${rank}; to move up, it needs sleep-specific evidence instead of broad supplement positioning.`
  },
  {
    id: "skin",
    category: "skin-results",
    keywords: ["skin", "acne", "glow", "wrinkle", "sunscreen", "pigmentation", "face", "serum"],
    bestFix: (category) => `Show skin type fit, visible result expectations, and proof that supports ${category}.`,
    strength: (category) => `Beauty shoppers compare by outcome, skin type, and trust, so ${category} positioning can be very specific.`,
    weaknesses: (category) => [
      `The listing needs to say which skin type and concern the ${category} claim is for.`,
      "Before/after style proof, texture cues, ingredient clarity, and dermatologist language are not obvious enough.",
      "AI assistants may prefer competitors with cleaner benefit hierarchy and fewer vague beauty claims."
    ],
    missingProof: (category, question) => [
      `Evidence that answers: "${question}".`,
      "Skin type compatibility, ingredient percentages, usage frequency, irritation risk, and review snippets.",
      `Visual proof showing texture, application, and expected ${category} outcome.`
    ],
    creativeBrief: (category) => [
      `Main image: add a precise ${category} claim plus skin type cue.`,
      "Lifestyle image: bathroom mirror or morning routine with visible product usage.",
      "Infographic: ingredient stack, who it is for, who should patch test, and timeline to results.",
      "A+ block: compare concerns like acne, dullness, wrinkles, or pigmentation."
    ],
    shopperAnswer: ({ question, winner, yourListing, rank }) =>
      `For "${question}", I would pick ${winner} if it best matches the skin concern and proves ingredient fit. ${yourListing} is #${rank} because beauty shoppers need skin-type clarity, result proof, and irritation guidance before trusting the recommendation.`
  },
  {
    id: "fitness",
    category: "fitness-performance",
    keywords: ["protein", "muscle", "gym", "workout", "fitness", "weight loss", "lean", "recovery"],
    bestFix: (category) => `Put macros, serving size, use case, and fitness outcome proof at the top for ${category}.`,
    strength: (category) => `The query has measurable decision factors, so ${category} can be scored with concrete specs.`,
    weaknesses: (category) => [
      "The listing should make protein, calories, sugar, serving size, and goal fit instantly scannable.",
      "AI assistants will punish vague fitness promises without nutrition facts or usage context.",
      "Competitors can win if they show clearer taste, mixability, and goal-specific proof."
    ],
    missingProof: (category, question) => [
      `Specific evidence for: "${question}".`,
      "Macros, ingredient quality, certifications, allergen notes, taste/mixability reviews, and routine fit.",
      `Comparison proof for shoppers choosing between ${category} alternatives.`
    ],
    creativeBrief: (category) => [
      "Main image: show macros and serving benefit in a thumbnail-readable badge.",
      "Lifestyle image: gym bag, shaker, or post-workout routine with the target user.",
      "Infographic: macros, ingredients, goal fit, and when to consume.",
      "A+ block: compare bulking, lean protein, recovery, and weight management use cases."
    ],
    shopperAnswer: ({ question, winner, yourListing, rank }) =>
      `For "${question}", I would recommend ${winner} if its macros, serving details, and goal fit are easiest to verify. ${yourListing} ranks #${rank}; stronger nutrition proof and fitness-specific imagery would improve confidence.`
  },
  {
    id: "budget",
    category: "value-for-money",
    keywords: ["cheap", "budget", "affordable", "value", "under", "price", "low cost", "deal"],
    bestFix: (category) => `Show cost-per-use, pack size, and value comparison so ${category} shoppers can justify the purchase.`,
    strength: (category) => `The query is price-sensitive, so a clear ${category} argument can win even against premium competitors.`,
    weaknesses: () => [
      "The listing must prove value, not simply claim affordability.",
      "AI assistants need pack size, servings, durability, or cost-per-use to compare fairly.",
      "If price/value is buried, a competitor with clearer economics may be recommended first."
    ],
    missingProof: (category, question) => [
      `A value argument that directly supports: "${question}".`,
      "Cost-per-serving, pack size, warranty, durability, refill economics, or bundle savings.",
      "Review snippets where buyers mention value, repeat purchase, or worth the price."
    ],
    creativeBrief: () => [
      "Main image: add pack quantity or cost-per-use cue without clutter.",
      "Lifestyle image: show the product in a practical repeat-use context.",
      "Infographic: compare servings, size, durability, or inclusions against common alternatives.",
      "A+ block: explain why the product is better value than cheaper-looking options."
    ],
    shopperAnswer: ({ question, winner, yourListing, rank }) =>
      `For "${question}", I would lean toward ${winner} if it makes value easiest to compare. ${yourListing} ranks #${rank}; cost-per-use, pack size, and value proof need to be more visible.`
  },
  {
    id: "default",
    category: "exact-need",
    keywords: [],
    bestFix: (category) => `Mirror the shopper's exact words around ${category} in the title, first image, and first two bullets.`,
    strength: (category) => `The question is specific enough to turn ${category} into a concrete listing improvement plan.`,
    weaknesses: (category) => [
      `The listing needs stronger benefit language tied to ${category}.`,
      "Trust signals are not obvious enough for an AI assistant to recommend it confidently.",
      "The creative should make the buyer use case visible before shoppers read details."
    ],
    missingProof: (category, question) => [
      `Evidence that directly supports: "${question}".`,
      "Review snippets, certifications, specs, comparison claims, and buyer-fit guidance.",
      `Clear explanation of who should buy this for ${category} and why.`
    ],
    creativeBrief: (category) => [
      `Main image: add a clean ${category} benefit badge readable at thumbnail size.`,
      "Lifestyle image: show the product in the exact customer moment implied by the query.",
      "Infographic: compare the main decision criteria against alternatives.",
      "A+ block: turn the biggest objection into proof-led education."
    ],
    shopperAnswer: ({ question, winner, yourListing, rank }) =>
      `For "${question}", I would recommend ${winner} if it proves the use case most clearly. ${yourListing} ranks #${rank}; it is a possible match, but needs sharper claim, proof, and creative alignment to become the confident recommendation.`
  }
];

function detectIntentProfile(question) {
  const text = question.toLowerCase();
  const rankedProfiles = INTENT_PROFILES.slice(0, -1)
    .map((profile) => ({
      profile,
      hits: profile.keywords.filter((keyword) => text.includes(keyword)).length
    }))
    .sort((a, b) => b.hits - a.hits);

  return rankedProfiles[0]?.hits > 0
    ? rankedProfiles[0].profile
    : INTENT_PROFILES.find((profile) => profile.id === "default");
}

function extractImportantTerms(question) {
  const stopWords = new Set([
    "best",
    "for",
    "the",
    "and",
    "with",
    "that",
    "this",
    "who",
    "want",
    "wants",
    "need",
    "needs",
    "under",
    "over",
    "good",
    "better",
    "which",
    "what",
    "amazon",
    "product",
    "affordable",
    "cheap",
    "budget",
    "value",
    "senior",
    "seniors",
    "oily",
    "prone"
  ]);

  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word))
    )
  ).slice(0, 8);
}

function extractProductPhrase(question, terms) {
  const text = question.toLowerCase();
  const phrases = [
    "protein powder",
    "magnesium supplement",
    "lunch box",
    "water bottle",
    "face serum",
    "sunscreen",
    "collagen powder",
    "running shoes",
    "office chair",
    "baby lotion"
  ];

  return phrases.find((phrase) => text.includes(phrase)) || terms[0];
}

function scoreListings(listings, profile, terms) {
  return listings
    .map((listing) => {
      const haystack = `${listing.url} ${listing.text}`.toLowerCase();
      const matchedTerms = terms.filter((term) => haystack.includes(term));
      const matchedIntent = profile.keywords.filter((keyword) => haystack.includes(keyword));
      const evidenceTerms = ["certified", "tested", "reviews", "rating", "organic", "clinically", "dermatologist", "dosage"];
      const evidenceHits = evidenceTerms.filter((term) => haystack.includes(term)).length;
      const relevanceHits = matchedTerms.length + matchedIntent.length;
      const score = 42 + matchedTerms.length * 7 + matchedIntent.length * 8 + (relevanceHits ? evidenceHits * 4 : 0);
      const name = listing.label === "Your listing" ? "Your listing" : readableNameFromUrl(listing.url, listing.label);

      return {
        original: listing,
        name,
        score,
        reason: buildRankingReason({
          label: listing.label,
          matchedTerms,
          matchedIntent,
          profile,
          score
        })
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildRankingReason({ label, matchedTerms, matchedIntent, profile, score }) {
  const ownership = label === "Your listing" ? "Your listing" : "This competitor";

  if (matchedTerms.length || matchedIntent.length) {
    const signals = [...new Set([...matchedTerms, ...matchedIntent])].slice(0, 4).join(", ");
    return `${ownership} shows stronger visible relevance for ${signals}, so an AI shopper is more likely to connect it to ${profile.category}.`;
  }

  if (score > 55) {
    return `${ownership} has some useful ecommerce evidence, but the connection to ${profile.category} is still indirect.`;
  }

  return `${ownership} may be in the right category, but the visible listing evidence does not strongly match the shopper's wording.`;
}

function readableNameFromUrl(url, fallback) {
  try {
    const parsed = new URL(url);
    const words = decodeURIComponent(parsed.pathname)
      .split(/[/-]+/)
      .filter((word) => word.length > 2)
      .filter((word) => !["www", "dp", "gp", "product", "amazon", "ref"].includes(word.toLowerCase()))
      .slice(0, 4);

    if (words.length) {
      return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
    }
  } catch {}

  return fallback;
}
