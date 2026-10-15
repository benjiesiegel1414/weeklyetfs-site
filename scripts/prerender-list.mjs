// Writes the weekly ETF list into index.html as plain HTML rows so search engines can read every fund.
// The page's own script still reloads the live sheet in the browser and replaces these rows.
import fs from 'node:fs';
const CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT1P00pQ6hNvYolxzrKYIuxC-AH1xFBpMtsn-NwC17W4vQazk3ql69ZmSmW8J-jp7OaUmKLV5v2KPI3/pub?gid=0&single=true&output=csv';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = s => { const v = parseFloat(String(s || '').replace(/[%,+]/g, '')); return isFinite(v) ? v : null; };
let res; try { res = await fetch(CSV + '&t=' + Date.now()); } catch (e) { console.log('::warning::sheet fetch failed ' + e.message); process.exit(0); }
if (!res.ok) { console.log('::warning::sheet fetch failed ' + res.status); process.exit(0); }
const rows = (await res.text()).split('\n').slice(1)
  .map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()))
  .filter(c => c[0] && /^[A-Z0-9.\-]{1,8}$/i.test(c[0]));
if (rows.length < 20) { console.log('::warning::only ' + rows.length + ' rows, leaving page as is'); process.exit(0); }
rows.sort((a, b) => (num(b[2]) ?? -1e9) - (num(a[2]) ?? -1e9));
const tr = rows.map(c => {
  const tot = c[4] || '-', cls = tot.includes('+') || num(tot) > 0 ? ' positive' : (tot.includes('-') && tot !== '-') || num(tot) < 0 ? ' negative' : '';
  return `<tr><td data-label="Symbol" class="symbol"><a href="etf.html?symbol=${encodeURIComponent(c[0])}">${esc(c[0])}</a></td><td data-label="ETF Name">${esc(c[1] || '-')}</td><td data-label="Dividend Yield" class="yield">${esc(c[2] || '-')}</td><td data-label="Price Decay" class="decay">${esc(c[3] || '-')}</td><td data-label="Total Return" class="${cls.trim()}">${esc(tot)}</td></tr>`;
}).join('\n');
let h = fs.readFileSync('index.html', 'utf8');
const block = `<!-- PRERENDER:START ${new Date().toISOString().slice(0, 10)} ${rows.length} funds -->\n${tr}\n<!-- PRERENDER:END -->`;
if (/<!-- PRERENDER:START[\s\S]*?<!-- PRERENDER:END -->/.test(h)) h = h.replace(/<!-- PRERENDER:START[\s\S]*?<!-- PRERENDER:END -->/, () => block);
else h = h.replace('<tbody id="etfBody"></tbody>', () => `<tbody id="etfBody">${block}</tbody>`);
h = h.replace('<table id="etfTable" style="display:none">', '<table id="etfTable">')
  .replace('<div class="loading" id="loading">', '<div class="loading" id="loading" style="display:none">');
if (!h.includes('/* prerender-link */')) h = h.replace('</style>', () => '    /* prerender-link */ #etfBody td.symbol a{color:inherit;text-decoration:none}\n</style>');
fs.writeFileSync('index.html', h);
console.log('prerendered', rows.length, 'funds');
