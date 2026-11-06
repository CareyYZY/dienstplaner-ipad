'use strict';
/* ============ Druck ============ */
function runPrint(node) {
  const box = $('#print');
  box.replaceChildren(node);
  const done = () => { box.replaceChildren(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 60);
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
