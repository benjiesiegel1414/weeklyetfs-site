/**
 * WeeklyETFs.com — Programmatic SEO generator
 * Builds /yield/TICKER-yield-and-total-returns.html for every fund in the CSV,
 * plus /yield/index.html (hub) and sitemap-yield.xml.
 *
 * Usage:  node generate-yield-pages.js
 * Data:   Google Sheets published CSV (set CSV_URL below)
 */

const fs = require("fs");
const path = require("path");

/* ============================================================
   CONFIG — the only section you should need to touch
   ============================================================ */
const CSV_URL =
  process.env.CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1P00pQ6hNvYolxzrKYIuxC-AH1xFBpMtsn-NwC17W4vQazk3ql69ZmSmW8J-jp7OaUmKLV5v2KPI3/pub?gid=0&single=true&output=csv";

const SITE_URL = "https://weeklyetfs.com";
const OUT_DIR = path.join(__dirname, "yield"); // pages land in /yield/
const SITEMAP_PATH = path.join(__dirname, "sitemap-yield.xml");
const BRAND = "WeeklyETFs";
/* ============================================================ */

/* ---------- tiny dependency-free CSV parser (handles quotes) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((f) => f.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

/* ---------- flexible column detection ---------- */
function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

function findCol(headers, candidates) {
  const normed = headers.map(norm);
  for (const cand of candidates) {
    const idx = normed.indexOf(norm(cand));
    if (idx !== -1) return idx;
  }
  for (const cand of candidates) {
    const idx = normed.findIndex((h) => h.includes(norm(cand)));
    if (idx !== -1) return idx;
  }
  return -1;
}

/* Return-period columns: match things like "1M Return", "YTD", "1 Year Total Return" */
const RETURN_PATTERNS = [
  { key: "1M",  label: "1 Month",  rx: /^(1m|1mo|1month|onemonth|1monthreturn|1moreturn)/ },
  { key: "3M",  label: "3 Month",  rx: /^(3m|3mo|3month|threemonth|3monthreturn)/ },
  { key: "6M",  label: "6 Month",  rx: /^(6m|6mo|6month|sixmonth|6monthreturn)/ },
  { key: "YTD", label: "Year to Date", rx: /^(ytd|yeartodate)/ },
  { key: "1Y",  label: "1 Year",   rx: /^(1y|1yr|1year|oneyear|12m|12month)/ },
  { key: "3Y",  label: "3 Year",   rx: /^(3y|3yr|3year|threeyear)/ },
  { key: "5Y",  label: "5 Year",   rx: /^(5y|5yr|5year|fiveyear)/ },
  { key: "SI",  label: "Since Inception", rx: /^(si|sinceinception|inception)/ },
];

function detectReturnCols(headers) {
  const found = [];
  headers.forEach((h, i) => {
    const n = norm(h);
    for (const p of RETURN_PATTERNS) {
      if (p.rx.test(n) && !found.some((f) => f.key === p.key)) {
        found.push({ ...p, idx: i });
        return;
      }
    }
    // WeeklyETFs: all return figures are since inception, so any generic
    // "total return" / "return" column maps to Since Inception
    if (/return/.test(n) && !found.some((f) => f.key === "SI")) {
      found.push({ key: "SI", label: "Since Inception", idx: i });
    }
  });
  return found;
}

/* ---------- number helpers ---------- */
function toNum(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[%$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function fmtPct(n, dp = 2) { return n == null ? "—" : n.toFixed(dp) + "%"; }
function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- shared design system (matches network: emerald + gold) ---------- */
const CSS = `
html,body{margin:0;padding:0;overflow-x:hidden;width:100%}
:root{--navy:#001f3d;--red:#e74c3c;--green:#27ae60}
*{box-sizing:border-box}
body{font-family:'Lato',Arial,sans-serif;background:#f4f4f4;color:#333;line-height:1.65;font-size:17px}
a{color:var(--navy);text-decoration:none}a:hover{text-decoration:underline}
header.site{background:var(--navy);padding:8px 20px;text-align:center;width:100%;box-shadow:0 2px 5px rgba(0,0,0,.3);background-image:url('https://www.transparenttextures.com/patterns/noise.png');background-blend-mode:overlay;position:sticky;top:0;z-index:10}
.banner-img{max-width:440px;width:82%;height:auto;display:block;margin:0 auto}
.site-network-bar{width:100%;background:#fff;border-bottom:1px solid #ddd;padding:8px 0}
.site-network-track{max-width:1100px;margin:0 auto;padding:0 15px;display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
.site-network-track::-webkit-scrollbar{display:none}
.site-network-label{font-size:.68em;text-transform:uppercase;letter-spacing:.5px;color:#999;font-weight:900;flex-shrink:0;margin-right:2px}
.site-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;border:1px solid var(--navy);background:#fff;color:var(--navy);font-size:.8em;font-weight:700;text-decoration:none;flex-shrink:0;transition:background .15s,color .15s}
.site-pill:hover{background:var(--navy);color:#fff;text-decoration:none}
.site-pill.current{background:var(--navy);color:#fff;cursor:default}
.wrap{max-width:900px;margin:0 auto;padding:0 15px}
.crumbs{font-size:.85em;color:#777;padding:20px 0 0}
.crumbs a{color:#777}.crumbs a:hover{color:var(--navy)}
h1{font-size:1.7em;color:var(--navy);font-weight:900;line-height:1.3;margin:14px 0 4px;text-align:center}
.sub{color:#555;font-size:.95em;margin-bottom:24px;text-align:center}
.sub .upd{color:var(--red);font-weight:900}
.hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:18px}
.stat{background:#fff;border:3px solid var(--navy);border-radius:8px;padding:20px 22px;box-shadow:0 4px 15px rgba(0,0,0,.12);text-align:center}
.stat .lab{font-size:.72em;letter-spacing:.08em;text-transform:uppercase;color:#777;font-weight:900}
.stat .val{font-size:clamp(30px,6vw,42px);font-weight:900;margin-top:6px}
.stat .val.yld{color:var(--navy)}
.stat .val.pos{color:var(--green)}.stat .val.neg{color:var(--red)}
.stat .note{font-size:.8em;color:#777;margin-top:4px}
h2{font-size:1.25em;color:var(--navy);font-weight:900;margin:36px 0 14px}
table.ret{width:100%;border-collapse:collapse;background:#fff;border:3px solid var(--navy);border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.12)}
table.ret th{background:var(--navy);color:#fff;padding:12px 10px;font-size:.85em;text-align:left}
table.ret td{padding:12px 10px;font-size:.95em;border-bottom:1px solid #eee}
table.ret tr:nth-child(even){background:#f9f9f9}
td.num{font-weight:900;text-align:right}
td.pos,.positive{color:var(--green);font-weight:bold}td.neg,.negative{color:var(--red);font-weight:bold}
.bar{height:6px;border-radius:3px;background:#e8e8e8;position:relative;min-width:120px}
.bar i{position:absolute;top:0;height:6px;border-radius:3px;display:block}
p.body{margin:0 0 16px;color:#333}
.faq{background:#fff;border:3px solid var(--navy);border-radius:8px;padding:6px 22px;box-shadow:0 4px 15px rgba(0,0,0,.12)}
.faq h3{font-size:1em;margin:18px 0 6px;color:var(--navy);font-weight:900}
.faq p{margin:0 0 16px;font-size:.93em;color:#444}
.related{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
.rel{background:#fff;border:1px solid var(--navy);border-radius:8px;padding:14px 16px;display:block;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:all .2s}
.rel:hover{text-decoration:none;transform:translateY(-2px);box-shadow:0 6px 14px rgba(0,0,0,.15)}
.rel b{color:var(--navy);font-size:1.15em;font-weight:900}
.rel span{display:block;font-size:.8em;color:#666;margin-top:2px}
.rel .y{color:var(--navy);font-weight:900;font-size:.9em;margin-top:6px;display:block}
.pro-cta{margin:40px 0;background:linear-gradient(135deg,var(--navy) 0%,#003a63 100%);border-radius:14px;padding:30px 28px;box-shadow:0 8px 24px rgba(0,31,61,.25);position:relative;overflow:hidden}
.pro-cta::before{content:"";position:absolute;top:-40%;right:-10%;width:260px;height:260px;background:radial-gradient(circle,rgba(212,175,55,.18) 0%,transparent 70%);pointer-events:none}
.pro-badge{display:inline-block;background:#d4af37;color:var(--navy);font-size:.7em;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;margin-bottom:12px}
.pro-cta h3{color:#fff;font-size:1.35em;font-weight:900;margin:0 0 8px;line-height:1.3}
.pro-cta p.lead{color:#c9d8e8;font-size:.95em;margin:0 0 20px;max-width:520px}
.pro-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:24px}
.pro-feat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:12px 14px}
.pro-feat .ico{font-size:1.3em;display:block;margin-bottom:4px}
.pro-feat b{color:#fff;font-size:.85em;font-weight:900;display:block}
.pro-feat span{color:#a8bdd4;font-size:.78em;display:block;margin-top:2px}
.pro-btn{display:inline-flex;align-items:center;gap:8px;background:#d4af37;color:var(--navy);font-weight:900;font-size:1em;padding:13px 26px;border-radius:8px;text-decoration:none;box-shadow:0 4px 12px rgba(0,0,0,.25);transition:all .2s}
.pro-btn:hover{background:#e8c04a;transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.35);text-decoration:none}
.pro-btn .arrow{transition:transform .2s}
.pro-btn:hover .arrow{transform:translateX(3px)}
.disc{font-size:.82em;color:#666;margin:44px auto 30px;max-width:900px;line-height:1.55;text-align:center}
footer.site{margin-top:40px;padding:25px 15px;background:#fff;width:100%;text-align:center;font-size:.9em;color:#555;border-top:1px solid #ddd}
footer.site a{color:var(--navy);text-decoration:none;margin:0 12px;font-weight:700}
footer.site a:hover{text-decoration:underline}
footer.site .fine{margin-top:14px;font-size:.85em;color:#888}
table.hublist{width:100%;border-collapse:collapse;background:#fff;border:3px solid var(--navy);border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.12)}
table.hublist th{background:var(--navy);color:#fff;padding:12px 10px;font-size:.85em;text-align:left}
table.hublist td{padding:11px 10px;font-size:.95em;border-bottom:1px solid #eee}
table.hublist tr:nth-child(even){background:#f9f9f9}
table.hublist tr:hover{background:#e6f0ff}
table.hublist td.num{font-weight:900;text-align:right}
table.hublist a{font-weight:900;color:var(--navy);font-size:1.05em}
@media(max-width:640px){.hero{grid-template-columns:1fr}h1{font-size:1.35em}}
`;

const HEAD_SCRIPTS = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9929351005136304" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EG30PW49ZN"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-EG30PW49ZN');</script>`;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">`;

function header() {
  return `<header class="site"><a href="${SITE_URL}/"><img src="https://raw.githubusercontent.com/benjiesiegel1414/weeklyetfs-site/main/Weeklyftps%203.png" alt="WeeklyETFs.com Logo" class="banner-img"></a></header>
<div class="site-network-bar"><div class="site-network-track"><span class="site-network-label">Our Sites:</span><a href="https://topdividendetfs.com/" class="site-pill">💵 TopDividendETFs.com</a><span class="site-pill current">📅 WeeklyETFs.com</span><a href="https://monthlyetfs.com/" class="site-pill">🗓️ MonthlyETFs.com</a><a href="https://growthetfs.com/" class="site-pill">📈 GrowthETFs.com</a><a href="https://topspaceetfs.com/" class="site-pill">🚀 TopSpaceETFs.com</a><a href="https://etftotalreturns.com/" class="site-pill">📊 ETFTotalReturns.com</a></div></div>`;
}
function footer(year) {
  return `<footer class="site"><p><a href="${SITE_URL}/terms.html">Terms of Use</a> | <a href="${SITE_URL}/privacy.html">Privacy Policy</a> | <a href="${SITE_URL}/faq.html">FAQ</a> | <a href="${SITE_URL}/blog.html">Blog</a> | <a href="${SITE_URL}/weekly-dividend-calculator.html">Weekly Dividend Calculator</a> | <a href="https://topdividendetfs.com/" target="_blank" rel="noopener">Top Dividend ETFs</a><br><br><a href="https://topdividendtools.com/" target="_blank" rel="noopener">Top Dividend Tools 🛠️</a><br><br>Want To Sponsor WeeklyETFs.com? Contact email: <a href="mailto:Business@TopDividendETFs.com">Business@TopDividendETFs.com</a></p><div style="margin:20px 0"><a href="https://topdividendetfs.com/?layout=profile" target="_blank" style="display:inline-block;background:#2E5D54;color:#ffffff;font-weight:900;font-size:0.78em;padding:5px 12px;border-radius:5px;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.15)">See 100+ Top Dividend ETFs HERE!</a></div></footer>`;
}

/* ---------- per-ticker page ---------- */
function buildPage(fund, all, updated, year) {
  const t = fund.ticker;
  const name = fund.name || `${t} ETF`;
  const slug = `${t.toLowerCase()}-yield-and-total-returns`;
  const url = `${SITE_URL}/yield/${slug}.html`;
  const title = `${t} Yield and Total Returns (${name})`;
  const yieldStr = fmtPct(fund.yield);
  const si = fund.returns.find((r) => r.key === "SI");
  const headline = si || fund.returns[0] || null;

  const desc = `${t} current yield is ${yieldStr}${headline ? ` with a total return of ${fmtPct(headline.val)} since inception` : ""}. Live yield and total return data for ${name}, updated daily.`;

  // returns table rows with proportional bars
  const maxAbs = Math.max(1, ...fund.returns.map((r) => Math.abs(r.val ?? 0)));
  const rows = fund.returns.map((r) => {
    const cls = r.val == null ? "" : r.val >= 0 ? "pos" : "neg";
    const w = r.val == null ? 0 : Math.round((Math.abs(r.val) / maxAbs) * 100);
    const color = r.val == null ? "transparent" : r.val >= 0 ? "var(--green)" : "var(--red)";
    return `<tr><td>${esc(r.label)} Total Return</td><td><div class="bar"><i style="width:${w}%;background:${color}"></i></div></td><td class="num ${cls}">${fmtPct(r.val)}</td></tr>`;
  }).join("");

  // related funds: nearest by yield, excluding self
  const related = all
    .filter((f) => f.ticker !== t && f.yield != null)
    .sort((a, b) => Math.abs((a.yield ?? 0) - (fund.yield ?? 0)) - Math.abs((b.yield ?? 0) - (fund.yield ?? 0)))
    .slice(0, 4);
  const relHtml = related.map((f) =>
    `<a class="rel" href="${SITE_URL}/yield/${f.ticker.toLowerCase()}-yield-and-total-returns.html"><b>${esc(f.ticker)}</b><span>${esc(f.name || "")}</span><span class="y">${fmtPct(f.yield)} yield</span></a>`
  ).join("");

  // crawlable prose — this is what actually ranks, not the raw table
  const intro = `<p class="body"><strong>${esc(name)} (${t})</strong> currently yields <strong>${yieldStr}</strong>${fund.price != null ? ` at a share price of $${fund.price.toFixed(2)}` : ""} and pays distributions on a weekly schedule. ${headline ? `Since inception, ${t} has delivered a total return of <strong>${fmtPct(headline.val)}</strong>, which includes both price movement and all distributions paid.` : ""}</p>
<p class="body">Yield tells you what the fund is paying out right now. Total return since inception tells you what shareholders have actually earned over the fund's full life once price changes are factored in. For income ETFs, the two numbers together give a fuller picture than either one alone, which is why both are tracked side by side on this page and refreshed daily.</p>
<p class="body">One caveat when comparing funds: since-inception figures depend on each fund's launch date. A fund that launched into a bull market will show a stronger lifetime return than an identical strategy that launched a year later, so use the number to judge a fund against its own yield, not head-to-head against funds with different inception dates.</p>`;

  const faqItems = [
    {
      q: `What is ${t}'s current yield?`,
      a: `${t} currently yields ${yieldStr}. This figure is updated daily on WeeklyETFs from live fund data as distributions and prices change.`,
    },
    headline && {
      q: `What is ${t}'s total return since inception?`,
      a: `${t}'s total return since inception is ${fmtPct(headline.val)}. Total return includes both share price change and all distributions paid over the fund's full trading history.`,
    },
    {
      q: `How often does ${t} pay distributions?`,
      a: `${name} pays distributions on a weekly schedule.`,
    },
    fund.decay && {
      q: `Does ${t} have price decay?`,
      a: `${/yes/i.test(fund.decay) ? `Yes. ${t}'s share price is below where it started at inception. Price decay references share price only, which is why total return, which includes all distributions paid, is shown alongside it.` : `No. ${t}'s share price is at or above where it started at inception. Price decay references share price only.`}`,
    },
  ].filter(Boolean);

  const faqHtml = faqItems.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("");
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | ${BRAND}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${BRAND}">
<meta name="twitter:card" content="summary">
${HEAD_SCRIPTS}
${FONTS}
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "WeeklyETFs", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Yield & Total Returns", item: SITE_URL + "/yield/" },
      { "@type": "ListItem", position: 3, name: `${t} Yield and Total Returns`, item: url },
    ],
  })}</script>
</head>
<body>
${header()}
<main class="wrap">
<div class="crumbs"><a href="${SITE_URL}/">Home</a> › <a href="${SITE_URL}/yield/">Yield &amp; Total Returns</a> › ${t}</div>
<h1>${t} Yield and Total Returns</h1>
<p class="sub">${esc(name)} · Weekly payer · Data updated <span class="upd">${updated}</span> · <a href="${SITE_URL}/etf.html?symbol=${encodeURIComponent(t)}">Full ${t} Scorecard →</a></p>

<div class="hero">
<div class="stat"><div class="lab">Dividend Yield</div><div class="val yld">${yieldStr}</div><div class="note">Trailing distribution yield</div></div>
<div class="stat"><div class="lab">Total Return Since Inception</div><div class="val ${headline && headline.val != null && headline.val < 0 ? "neg" : "pos"}">${headline ? fmtPct(headline.val) : "—"}</div><div class="note">Price change plus all distributions</div></div>
${fund.decay ? `<div class="stat"><div class="lab">Price Decay</div><div class="val ${/yes/i.test(fund.decay) ? "neg" : "pos"}">${esc(fund.decay)}</div><div class="note">Share price vs inception</div></div>` : ""}
</div>

${intro}

<h2>${t} Total Return Since Inception</h2>
<table class="ret"><thead><tr><th>Period</th><th></th><th style="text-align:right">Total Return</th></tr></thead><tbody>${rows || `<tr><td colspan="3">Return data updating…</td></tr>`}</tbody></table>

<h2>${t} Yield vs Total Return: What It Means</h2>
<div class="faq">${faqHtml}</div>

<div class="pro-cta">
<span class="pro-badge">TopDividendETFs PRO</span>
<h3>Go beyond ${t}'s yield and total return</h3>
<p class="lead">The PRO Terminal covers every income ETF in one screen, with the data points that actually explain whether a payout holds up.</p>
<div class="pro-features">
<div class="pro-feat"><span class="ico">🏆</span><b>Fund Ratings</b><span>Grades on every income ETF</span></div>
<div class="pro-feat"><span class="ico">📉</span><b>Tax Efficiency</b><span>Grades by fund structure</span></div>
<div class="pro-feat"><span class="ico">💰</span><b>Expense Ratios</b><span>Full fee breakdowns</span></div>
<div class="pro-feat"><span class="ico">📊</span><b>Total Returns</b><span>Every holding period tracked</span></div>
<div class="pro-feat"><span class="ico">🗓️</span><b>Payout History</b><span>Full distribution records</span></div>
<div class="pro-feat"><span class="ico">🔍</span><b>Advanced Filtering</b><span>Screen the entire universe</span></div>
</div>
<a class="pro-btn" href="https://topdividendetfspro.com/" rel="noopener">Open the PRO Terminal <span class="arrow">→</span></a>
</div>

<h2>ETFs With Similar Yields</h2>
<div class="related">${relHtml}</div>

<p class="disc">Data is provided for informational and educational purposes only and is not investment advice or a recommendation to buy or sell any security. Yields and returns change daily and past performance does not guarantee future results. Verify all figures with the fund issuer before making investment decisions.</p>
</main>
${footer(year)}
</body>
</html>`;
}

/* ---------- hub page ---------- */
function buildHub(funds, updated, year) {
  const url = `${SITE_URL}/yield/`;
  const sorted = [...funds].sort((a, b) => (b.yield ?? -1) - (a.yield ?? -1));
  const rows = sorted.map((f) => {
    const si = f.returns.find((r) => r.key === "SI") || f.returns[0];
    const cls = si && si.val != null ? (si.val >= 0 ? "pos" : "neg") : "";
    return `<tr><td><a href="${SITE_URL}/yield/${f.ticker.toLowerCase()}-yield-and-total-returns.html">${esc(f.ticker)}</a></td><td>${esc(f.name || "")}</td><td class="num" style="color:var(--navy)">${fmtPct(f.yield)}</td><td style="text-align:center;font-weight:bold">${esc(f.decay || "—")}</td><td class="num ${cls}">${si ? fmtPct(si.val) : "—"}</td></tr>`;
  }).join("");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ETF Yield and Total Returns",
    itemListElement: sorted.slice(0, 100).map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${f.ticker} Yield and Total Returns`,
      url: `${SITE_URL}/yield/${f.ticker.toLowerCase()}-yield-and-total-returns.html`,
    })),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ETF Yield and Total Returns — Every Fund, Updated Daily | ${BRAND}</title>
<meta name="description" content="Current yield and total returns for ${funds.length} income ETFs, updated daily. Live yield and since-inception total return for every fund, side by side.">
<link rel="canonical" href="${url}">
<meta property="og:title" content="ETF Yield and Total Returns — Updated Daily">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
${HEAD_SCRIPTS}
${FONTS}
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(itemList)}</script>
</head>
<body>
${header()}
<main class="wrap">
<div class="crumbs"><a href="${SITE_URL}/">Home</a> › Yield &amp; Total Returns</div>
<h1>ETF Yield and Total Returns</h1>
<p class="sub">${funds.length} funds · Data updated <span class="upd">${updated}</span></p>
<p class="body">Yield is what a fund pays. Total return since inception is what shareholders have actually kept over the fund's full life. This index tracks both for every income ETF we cover, updated daily. Click any ticker for its full yield and return breakdown.</p>
<table class="hublist"><thead><tr><th>Ticker</th><th>Fund</th><th style="text-align:right">Yield</th><th style="text-align:center">Price Decay</th><th style="text-align:right">Return Since Inception</th></tr></thead><tbody>${rows}</tbody></table>
<p class="disc">Data is provided for informational and educational purposes only and is not investment advice. Verify all figures with the fund issuer.</p>
</main>
${footer(year)}
</body>
</html>`;
}

/* ---------- sitemap ---------- */
function buildSitemap(funds, dateISO) {
  const urls = [
    `${SITE_URL}/yield/`,
    ...funds.map((f) => `${SITE_URL}/yield/${f.ticker.toLowerCase()}-yield-and-total-returns.html`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u}</loc><lastmod>${dateISO}</lastmod><changefreq>daily</changefreq></url>`).join("\n")}
</urlset>`;
}

/* ---------- main ---------- */
async function main() {
  if (CSV_URL.startsWith("PASTE_")) {
    console.error("ERROR: Set CSV_URL at the top of generate-yield-pages.js (or via the CSV_URL env var).");
    process.exit(1);
  }
  console.log("Fetching CSV…");
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("CSV appears empty.");

  const headers = rows[0];
  const cTicker = findCol(headers, ["ticker", "symbol"]);
  const cName = findCol(headers, ["fund name", "etf name", "name", "fund"]);
  const cYield = findCol(headers, ["dividend yield", "distribution yield", "yield"]);
  const cPrice = findCol(headers, ["price", "share price", "nav"]);
  const cFreq = findCol(headers, ["frequency", "payout frequency", "distribution frequency", "schedule"]);
  const cDecay = findCol(headers, ["price decay", "decay"]);
  const retCols = detectReturnCols(headers);

  if (cTicker === -1) throw new Error(`No ticker column found. Headers: ${headers.join(", ")}`);
  console.log(`Columns → ticker:${headers[cTicker]}${cName > -1 ? " name:" + headers[cName] : ""}${cYield > -1 ? " yield:" + headers[cYield] : ""} returns:[${retCols.map((r) => headers[r.idx]).join(", ")}]`);

  const funds = rows.slice(1).map((r) => ({
    ticker: String(r[cTicker] || "").trim().toUpperCase().replace(/[^A-Z0-9.]/g, ""),
    name: cName > -1 ? String(r[cName] || "").trim() : "",
    yield: cYield > -1 ? toNum(r[cYield]) : null,
    price: cPrice > -1 ? toNum(r[cPrice]) : null,
    frequency: cFreq > -1 ? String(r[cFreq] || "").trim() : "",
    decay: cDecay > -1 ? String(r[cDecay] || "").trim() : "",
    returns: retCols.map((rc) => ({ key: rc.key, label: rc.label, val: toNum(r[rc.idx]) })),
  })).filter((f) => f.ticker.length >= 1 && f.ticker.length <= 6);

  // de-dupe by ticker
  const seen = new Set();
  const unique = funds.filter((f) => (seen.has(f.ticker) ? false : seen.add(f.ticker)));

  const now = new Date();
  const updated = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dateISO = now.toISOString().slice(0, 10);
  const year = now.getFullYear();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const f of unique) {
    const slug = `${f.ticker.toLowerCase()}-yield-and-total-returns.html`;
    fs.writeFileSync(path.join(OUT_DIR, slug), buildPage(f, unique, updated, year));
  }
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), buildHub(unique, updated, year));
  fs.writeFileSync(SITEMAP_PATH, buildSitemap(unique, dateISO));

  console.log(`Done. ${unique.length} ticker pages + hub written to /yield/, sitemap-yield.xml updated.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
