'use strict';
/* ============ Druck ============ */
function isStandalone() {
  return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}
/* Als App vom Home-Bildschirm kann iOS window.print() oft nicht ausführen: dann wird eine eigene
   Druckseite geöffnet (mit Drucken-Knopf; alternativ Teilen-Symbol → Drucken). */
function openPrintPage(node) {
  const css = new URL('style.css', location.href).href;
  const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>Drucken</title><link rel="stylesheet" href="' + css + '">'
    + '<style>#app{display:none}#print{display:block!important;padding:10px;overflow:auto}html,body{height:auto}.pbar{position:sticky;top:0;left:0;background:#fff;color:#111;padding:8px 10px;border-bottom:1px solid #ccc;z-index:5;font:15px -apple-system,sans-serif}.pbar button{font:inherit;padding:10px 18px;border-radius:10px;border:1px solid #2563EB;background:#2563EB;color:#fff;margin-right:10px}@media print{.pbar{display:none}#print{padding:0}}</style>'
    + '</head><body><div class="pbar"><button onclick="window.print()">🖨 Drucken</button><span>oder Teilen-Symbol → Drucken</span></div>'
    + '<div id="print">' + node.outerHTML + '</div></body></html>';
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return !!w;
}
function runPrint(node) {
  const box = $('#print');
  box.replaceChildren(node);
  // Der Druck-Inhalt bleibt im (auf dem Bildschirm unsichtbaren) Bereich stehen: iOS meldet "afterprint"
  // teils sofort und würde ihn sonst vor dem Druck leeren. print() läuft direkt im Tippen, nicht verzögert.
  if (isStandalone()) {
    let ok = false;
    try { ok = openPrintPage(node); } catch (e) { ok = false; }
    if (ok) return;
  }
  try { window.print(); } catch (e) { toast('Drucken wird von diesem Browser nicht unterstützt.'); }
}

function printWeek() {
  const emps = activeEmps();
  if (!emps.length) { toast('Keine Mitarbeiter zum Drucken.'); return; }
  const from = monday(S.date);
  runPrint(h('div', { class: 'printdoc' },
    h('h1', {}, `Dienstplan · KW ${isoWeek(from)} · ${fmtDM(from)} – ${fmtDMY(addD(from, 6))}`),
    gridView(emps, from, 7, false, false),
    h('p', { class: 'foot' }, `Gedruckt am ${fmtDMY(today())}`)));
}

function printYear() {
  const emps = activeEmps();
  if (!emps.length) { toast('Keine Mitarbeiter zum Drucken.'); return; }
  const doc = h('div', { class: 'printdoc year' });
  const per = 12;
  for (let i = 0; i < emps.length; i += per) {
    doc.append(h('div', { class: 'pg' }, h('h1', {}, `Urlaubsplan ${S.year}`), yearGrid(emps.slice(i, i + per), S.year, false),
      h('div', { class: 'legend' }, [['#2563EB', 'Urlaub genehmigt'], ['#F59E0B', 'Beantragt'], ['#DC2626', 'Krank'], ['#0D9488', 'Berufsschule'], ['#7C3AED', 'Unbezahlt'], ['#6B7280', 'Sonstiges']]
        .map(([c, t]) => h('span', {}, h('i', { class: 'sq', style: { background: c } }), t))),
      h('p', { class: 'foot' }, `Gedruckt am ${fmtDMY(today())}`)));
  }
  runPrint(doc);
}

/* ============ Start ============ */
const VIEWS = { plan: planView, staff: staffView, abs: absView, set: settingsView };

function makeIcon() {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 180;
    const g = c.getContext('2d');
    g.fillStyle = '#2563EB'; g.fillRect(0, 0, 180, 180);
    g.fillStyle = '#fff'; g.fillRect(34, 44, 112, 100);
    g.fillStyle = '#1E3A8A'; g.fillRect(34, 44, 112, 24);
    g.fillStyle = '#F59E0B'; g.fillRect(46, 82, 40, 14); g.fillStyle = '#16A34A'; g.fillRect(52, 106, 70, 14);
    g.fillStyle = '#7C3AED'; g.fillRect(94, 82, 38, 14);
    const url = c.toDataURL('image/png');
    document.head.append(h('link', { rel: 'apple-touch-icon', href: url }), h('link', { rel: 'icon', href: url }));
  } catch (e) { /* Icon optional */ }
}

function boot() {
  loadDB();
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  makeIcon();
  const nav = h('nav', { id: 'nav' }, h('div', { class: 'brand' }, 'Dienst-\nplaner'),
    TABS.map(([k, ic, label]) => h('button', { 'data-tab': k, onclick: () => go(k) }, h('span', { class: 'ic' }, ic), h('span', {}, label))));
  $('#app').append(nav, h('main', { id: 'main' }));
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.addEventListener('DOMContentLoaded', boot);
