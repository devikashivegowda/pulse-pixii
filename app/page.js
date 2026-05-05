"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileSearch,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  Wand2,
  Zap
} from "lucide-react";

const demoInput = {
  productUrl: "https://www.amazon.in/example-magnesium-glycinate-supplement",
  competitorUrls:
    "https://www.amazon.in/example-competitor-sleep-magnesium\nhttps://www.amazon.in/example-competitor-senior-mineral",
  shopperQuestion: "best magnesium supplement for seniors who want better sleep"
};

export default function Home() {
  const [form, setForm] = useState({
    productUrl: "",
    competitorUrls: "",
    shopperQuestion: ""
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const competitorCount = useMemo(
    () => form.competitorUrls.split(/\n|,/).filter(Boolean).length,
    [form.competitorUrls]
  );

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function runAudit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not generate report.");
      }
      setReport(data);
      setTimeout(() => {
        document.getElementById("report")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function loadDemo() {
    setForm(demoInput);
  }

  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">
          <span className="brandMark">
            <Sparkles size={18} />
          </span>
          Rufus Readiness Twin
        </div>
        <span className="navPill">For Amazon sellers</span>
      </nav>

      <section className="hero">
        <div>
          <div className="eyebrow">
            <Bot size={16} /> AI shopper simulation
          </div>
          <h1>Will Rufus recommend your product?</h1>
          <p className="lead">
            Paste your listing, compare it with competitors, and get a shopper-facing diagnosis:
            ranking risk, missing trust signals, and a Pixii-style creative brief for images,
            bullets, and A+ content.
          </p>
          <div className="proofRow">
            <span className="proof">
              <CheckCircle2 size={16} /> 2-model consensus
            </span>
            <span className="proof">
              <FileSearch size={16} /> Listing extraction
            </span>
            <span className="proof">
              <Wand2 size={16} /> Creative fixes
            </span>
          </div>
        </div>

        <form className="formPanel" onSubmit={runAudit}>
          <p className="formTitle">
            <Target size={20} /> Run a readiness audit
          </p>
          <div className="field">
            <label htmlFor="productUrl">Your Amazon listing URL</label>
            <input
              id="productUrl"
              name="productUrl"
              onChange={updateField}
              placeholder="https://www.amazon.in/your-product"
              required
              value={form.productUrl}
            />
          </div>
          <div className="field">
            <label htmlFor="competitorUrls">Competitor URLs, one per line</label>
            <textarea
              id="competitorUrls"
              name="competitorUrls"
              onChange={updateField}
              placeholder="https://www.amazon.in/competitor-one"
              rows={4}
              value={form.competitorUrls}
            />
          </div>
          <div className="field">
            <label htmlFor="shopperQuestion">Shopper question</label>
            <input
              id="shopperQuestion"
              name="shopperQuestion"
              onChange={updateField}
              placeholder="best magnesium supplement for seniors"
              required
              value={form.shopperQuestion}
            />
          </div>
          <button className="primary" disabled={loading} type="submit">
            {loading ? <Loader2 className="spin" size={18} /> : <Zap size={18} />}
            {loading ? "Building report..." : `Generate report${competitorCount ? ` vs ${competitorCount}` : ""}`}
          </button>
          <button className="secondary" onClick={loadDemo} type="button" style={{ marginTop: 10, width: "100%" }}>
            <Lightbulb size={17} /> Load demo inputs
          </button>
          {error ? <div className="error">{error}</div> : null}
        </form>
      </section>

      <section className="sampleStrip">
        <div className="miniCard">
          <Target size={22} />
          <strong>Rank like a shopper</strong>
          <p>Shows whether the seller wins the actual buying question, not a generic keyword score.</p>
        </div>
        <div className="miniCard">
          <Bot size={22} />
          <strong>Compare AI opinions</strong>
          <p>Gemini and Groq independently evaluate the same listing evidence, then the app reconciles the gaps.</p>
        </div>
        <div className="miniCard">
          <Wand2 size={22} />
          <strong>Turn diagnosis into creative</strong>
          <p>Every weakness becomes a concrete image, copy, or A+ content task a Pixii user would care about.</p>
        </div>
      </section>

      {report ? <Report data={report} /> : null}
    </main>
  );
}

function Report({ data }) {
  return (
    <section className="reportWrap" id="report">
      <div className="reportHead">
        <div>
          <div className="eyebrow">
            <Sparkles size={16} /> Diagnostic report
          </div>
          <h2>{data.headline}</h2>
        </div>
        <button className="secondary" onClick={() => window.print()} type="button">
          Print report <ArrowRight size={16} />
        </button>
      </div>

      <div className="reportGrid">
        <aside className="reportPanel">
          <div className="score">
            <span>{data.score}</span>
            <b>Recommendation likelihood</b>
            <small>{data.mode}</small>
          </div>
          <div className="metric">
            <b>Shopper question</b>
            <span>{data.question}</span>
          </div>
          <div className="metric">
            <b>Best immediate fix</b>
            <span>{data.bestFix}</span>
          </div>
          <div className="metric">
            <b>Model agreement</b>
            <span>{data.modelAgreement}</span>
          </div>
        </aside>

        <div className="resultGrid">
          <div className="resultCard wide">
            <div className="cardHead">
              <Target size={20} /> Predicted ranking
            </div>
            <div className="rankList">
              {data.ranking.map((item) => (
                <div className="rankItem" key={`${item.rank}-${item.name}`}>
                  <span className="rankNum">{item.rank}</span>
                  <div>
                    <b>{item.name}</b>
                    <div className="muted">{item.reason}</div>
                  </div>
                  <span className="tag">{item.verdict}</span>
                </div>
              ))}
            </div>
          </div>

          <ResultCard icon={<FileSearch size={20} />} title="Why shoppers hesitate" items={data.weaknesses} />
          <ResultCard icon={<CheckCircle2 size={20} />} title="What already works" items={data.strengths} />
          <ResultCard icon={<Sparkles size={20} />} title="Missing proof points" items={data.missingProof} />
          <ResultCard icon={<Wand2 size={20} />} title="Pixii creative brief" items={data.creativeBrief} />
          <ResultCard wide icon={<Bot size={20} />} title="AI shopper answer simulation" items={[data.shopperAnswer]} />
        </div>
      </div>
    </section>
  );
}

function ResultCard({ icon, items, title, wide = false }) {
  return (
    <div className={`resultCard ${wide ? "wide" : ""}`}>
      <div className="cardHead">
        {icon} {title}
      </div>
      <ul className="list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
