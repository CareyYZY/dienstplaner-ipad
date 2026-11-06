'use strict';
/* ============ Helfer ============ */
const $ = (s, r = document) => r.querySelector(s);

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  let value;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k === 'style') n.style.cssText = v;
      else if (k === 'value') value = v;
      else if (k === 'checked') n.checked = true;
      else if (k === 'disabled') n.disabled = true;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }
  const add = (k) => {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(add);
    else n.append(k instanceof Node ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  if (value !== undefined) n.value = value;
  return n;
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const dow = (s) => (pd(s).getDay() + 6) % 7; // Mo = 0
const monday = (s) => addD(s, -dow(s));
const dayNo = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const diffD = (a, b) => dayNo(b) - dayNo(a);
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WDL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MON3 = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const fmtDM = (s) => `${s.slice(8, 10)}.${s.slice(5, 7)}.`;
const fmtDMY = (s) => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
const isoWeek = (s) => {
  const d = pd(s);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
};
const T = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const parseT = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
const fh = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
const fsigned = (x) => (x > 0.04 ? '+' : '') + fh(x);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const PALETTE = [
  ['Rot', '#DC2626'], ['Dunkelrot', '#991B1B'], ['Orange', '#EA580C'], ['Bernstein', '#F59E0B'],
  ['Gelb', '#EAB308'], ['Hellgrün', '#84CC16'], ['Grün', '#16A34A'], ['Dunkelgrün', '#166534'],
  ['Smaragd', '#10B981'], ['Türkis', '#0D9488'], ['Cyan', '#06B6D4'], ['Himmelblau', '#0EA5E9'],
  ['Blau', '#2563EB'], ['Dunkelblau', '#1E3A8A'], ['Indigo', '#4F46E5'], ['Violett', '#7C3AED'],
  ['Lila', '#9333EA'], ['Magenta', '#C026D3'], ['Pink', '#DB2777'], ['Rosa', '#F472B6'],
  ['Braun', '#92400E'], ['Sand', '#A8895C'], ['Grau', '#6B7280'], ['Anthrazit', '#374151'],
];
const KIND_COLOR = { F: '#0EA5E9', M: '#16A34A', S: '#7C3AED' };
const KIND_NAME = { F: 'Früh', M: 'Mittel', S: 'Spät' };
const ABS_KINDS = ['Urlaub', 'Krank', 'Berufsschule', 'Sonstiges', 'Unbezahlt'];
const ABS_STATES = ['Beantragt', 'Genehmigt', 'Abgelehnt'];
const ABS_COLOR = { Urlaub: '#2563EB', Krank: '#DC2626', Berufsschule: '#0D9488', Unbezahlt: '#7C3AED', Sonstiges: '#6B7280' };
const absColor = (a) => (a.status === 'Beantragt' ? '#F59E0B' : ABS_COLOR[a.kind] || '#6B7280');

function onColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const y = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return y > 175 ? '#111' : '#fff';
}

/* ============ Daten ============ */
const KEY = 'dienstplaner-ipad-v1';
const defaults = () => ({
  v: 1, next: 1, emps: [], areas: [], shifts: [], abs: [], tasks: [], tmpls: [], done: {},
  set: {
    theme: 'auto', barColor: 'employee', openFrom: 300, openTo: 1200, minRest: 11,
    earlyBefore: 420, lateFrom: 660, cover: [{ from: 300, to: 1200, count: 1, days: 63 }],
  },
});
let DB = defaults();
function loadDB() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) DB = Object.assign(defaults(), JSON.parse(raw));
    DB.set = Object.assign(defaults().set, DB.set);
    DB.set.cover.forEach((r) => { if (r.full) { r.from = DB.set.openFrom; r.to = DB.set.openTo; } delete r.full; });
    DB.abs = DB.abs.filter((a) => a.status !== 'Abgelehnt'); DB.abs.forEach((a) => { a.status = 'Genehmigt'; });
  } catch (e) { DB = defaults(); }
}
function saveDB() {
  try { localStorage.setItem(KEY, JSON.stringify(DB)); }
  catch (e) { toast('Speichern fehlgeschlagen – bitte Daten exportieren!'); }
}
const nid = () => DB.next++;
function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}

/* ============ Fachlogik ============ */
const emp = (id) => DB.emps.find((e) => e.id === id);
const area = (id) => DB.areas.find((a) => a.id === id);
const activeEmps = () => DB.emps.filter((e) => e.active !== false).sort((a, b) => a.sort - b.sort || a.id - b.id);
const empName = (e) => `${e.first} ${e.last}`.trim();
const empAreas = (e) => (e.areas || []).map(area).filter(Boolean);
const isAvail = (e, d) => (e.avail & (1 << dow(d))) !== 0;
const availCount = (e) => { let n = 0; for (let i = 0; i < 7; i++) if (e.avail & (1 << i)) n++; return Math.max(1, n); };
const dailyCredit = (e) => e.weekly / availCount(e);
const baseHex = (e) => e.color || (empAreas(e)[0] && empAreas(e)[0].color) || null;
const autoBreak = (dur) => (dur >= 600 ? 60 : dur >= 510 ? 45 : dur >= 360 ? 30 : 0);
const shiftHours = (s) => Math.max(0, (s.end - s.start - s.brk) / 60);
const kindOf = (s) => (s.start < DB.set.earlyBefore ? 'F' : s.start >= DB.set.lateFrom ? 'S' : 'M');
const barHex = (e, s) => (DB.set.barColor === 'employee' && e && baseHex(e)) || KIND_COLOR[kindOf(s)];
const shiftsIn = (from, to) => DB.shifts.filter((s) => s.date >= from && s.date <= to);
const shiftsOn = (d) => DB.shifts.filter((s) => s.date === d).sort((a, b) => a.start - b.start);
const absCovers = (a, d) => d >= a.start && d <= a.end;
const absOf = (e, d) => DB.abs.find((a) => a.emp === e.id && a.status !== 'Abgelehnt' && absCovers(a, d));
const absAbs = (s) => dayNo(s.date) * 1440 + s.start; // absolute Minuten
const absEnd = (s) => dayNo(s.date) * 1440 + s.end;

function absenceDays(e, a, from, to) {
  const out = [];
  const s = a.start > from ? a.start : from, en = a.end < to ? a.end : to;
  for (let d = s; d <= en; d = addD(d, 1)) if (isAvail(e, d)) out.push(d);
  return out;
}
function vacationDays(e, year, status) {
  return DB.abs.filter((a) => a.emp === e.id && a.kind === 'Urlaub' && a.status === status)
    .reduce((n, a) => n + absenceDays(e, a, `${year}-01-01`, `${year}-12-31`).length, 0);
}
function periodHours(e, from, to) {
  const planned = shiftsIn(from, to).filter((s) => s.emp === e.id).reduce((n, s) => n + shiftHours(s), 0);
  let credited = 0, reduction = 0;
  for (const a of DB.abs.filter((x) => x.emp === e.id && x.status === 'Genehmigt')) {
    const n = absenceDays(e, a, from, to).length * dailyCredit(e);
    if (a.kind === 'Unbezahlt') reduction += n; else credited += n;
  }
  const soll = (e.weekly * (diffD(from, to) + 1)) / 7 - reduction;
  return { planned, credited, ist: planned + credited, soll };
}

function coverReq(d) {
  const req = new Array(96).fill(0), k = dow(d);
  for (const r of DB.set.cover) {
    if (!(r.days & (1 << k))) continue;
    for (let q = Math.floor(r.from / 15); q < Math.ceil(r.to / 15) && q < 96; q++) req[q] = Math.max(req[q], r.count);
  }
  return req;
}
function staffPer(list) {
  const c = new Array(96).fill(0);
  for (const s of list) for (let q = Math.floor(s.start / 15); q < Math.ceil(Math.min(s.end, 1440) / 15); q++) c[q]++;
  return c;
}
function gaps(d, list) {
  const req = coverReq(d), cnt = staffPer(list), out = [];
  for (let q = 0; q < 96;) {
    if (cnt[q] < req[q]) {
      let r = q, lo = 99, need = 0;
      while (r < 96 && cnt[r] < req[r]) { lo = Math.min(lo, cnt[r]); need = Math.max(need, req[r]); r++; }
      out.push({ a: q * 15, b: r * 15, have: lo, need });
      q = r;
    } else q++;
  }
  return out;
}

function analyze(from, to) {
  const out = [];
  const act = activeEmps(), ids = new Set(act.map((e) => e.id));
  const sh = shiftsIn(addD(from, -1), to).filter((s) => ids.has(s.emp));
  for (const s of sh) {
    if (s.date < from) continue;
    const e = emp(s.emp);
    if (!isAvail(e, s.date)) out.push({ lvl: 'Warnung', date: s.date, text: `${empName(e)} ist am ${WDL[dow(s.date)]} nicht verfügbar` });
    const a = absOf(e, s.date);
    if (a && a.status === 'Genehmigt') out.push({ lvl: 'Fehler', date: s.date, text: `${empName(e)} hat Arbeitszeit trotz ${a.kind}` });
    if (shiftHours(s) > 10) out.push({ lvl: 'Warnung', date: s.date, text: `${empName(e)}: ${fh(shiftHours(s))} h an einem Tag (max. 10 h)` });
  }
  const rest = DB.set.minRest * 60;
  for (const e of act) {
    const list = sh.filter((s) => s.emp === e.id).sort((a, b) => absAbs(a) - absAbs(b));
    for (let i = 1; i < list.length; i++) {
      const p = list[i - 1], n = list[i];
      if (n.date < from) continue;
      const gap = absAbs(n) - absEnd(p);
      if (gap < 0) out.push({ lvl: 'Fehler', date: n.date, text: `${empName(e)}: Schichten überschneiden sich (${T(p.start)}–${T(p.end)} / ${T(n.start)}–${T(n.end)})` });
      else if (p.date !== n.date && gap < rest) out.push({ lvl: 'Warnung', date: n.date, text: `${empName(e)}: nur ${fh(gap / 60)} h Ruhezeit (min. ${fh(rest / 60)} h)` });
    }
  }
  for (let d = from; d <= to; d = addD(d, 1)) {
    for (const g of gaps(d, sh.filter((s) => s.date === d))) {
      out.push({ lvl: 'Warnung', date: d, text: `Unterbesetzung ${T(g.a)}–${T(g.b)}: ${g.have} statt ${g.need}` });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Frühester Arbeitsbeginn (Minuten ab 00:00 von Tag d) nach der Ruhezeit des Vortags, oder null. */
function restUntil(e, d) {
  const prev = DB.shifts.filter((s) => s.emp === e.id && s.date === addD(d, -1));
  if (!prev.length) return null;
  const free = Math.max(...prev.map(absEnd)) + DB.set.minRest * 60 - dayNo(d) * 1440;
  return free > 0 ? free : null;
}

/** Vorschläge für Lücken in einer Woche. */
function suggest(from) {
  const plan = DB.shifts.map((s) => ({ ...s }));
  const out = [], act = activeEmps();
  const rest = DB.set.minRest * 60;
  const { openFrom, openTo } = DB.set;
  for (let i = 0; i < 7; i++) {
    const d = addD(from, i);
    for (let guard = 0, q = 0; q < 96 && guard < 80; guard++) {
      const dayList = plan.filter((s) => s.date === d && act.some((e) => e.id === s.emp));
      const req = coverReq(d), cnt = staffPer(dayList);
      if (cnt[q] >= req[q]) { q++; continue; }
      let r = q; while (r < 96 && cnt[r] < req[r]) r++;
      let a = Math.max(q * 15, openFrom), b = Math.min(r * 15, openTo);
      if (b <= a) { q = r; continue; }
      const dur = clamp(Math.max(b - a, 420), 240, 570);
      let start = a, end = Math.min(openTo, a + dur);
      if (end - start < dur) start = Math.max(openFrom, end - dur);
      const brk = autoBreak(end - start), net = (end - start - brk) / 60;
      const cands = act.filter((e) => {
        if (!isAvail(e, d) || absOf(e, d)) return false;
        if (plan.some((s) => s.emp === e.id && s.date === d)) return false;
        const cand = { date: d, start, end };
        for (const o of plan.filter((s) => s.emp === e.id && Math.abs(dayNo(s.date) - dayNo(d)) === 1)) {
          if (o.date < d && absAbs(cand) - absEnd(o) < rest) return false;
          if (o.date > d && absAbs(o) - absEnd(cand) < rest) return false;
        }
        const ph = periodHours(e, from, addD(from, 6));
        const planned = plan.filter((s) => s.emp === e.id && s.date >= from && s.date <= addD(from, 6)).reduce((n, s) => n + shiftHours(s), 0);
        return planned + net <= ph.soll - ph.credited + 0.5;
      });
      if (!cands.length) { q = r; continue; }
      const load = (e) => {
        const ph = periodHours(e, from, addD(from, 6));
        const planned = plan.filter((s) => s.emp === e.id && s.date >= from && s.date <= addD(from, 6)).reduce((n, s) => n + shiftHours(s), 0);
        return planned / Math.max(1, ph.soll);
      };
      cands.sort((x, y) => load(x) - load(y));
      const s = { id: -(plan.length + 1), emp: cands[0].id, date: d, start, end, brk, note: '' };
      plan.push(s);
      out.push(s);
    }
  }
  return out;
}

/* ============ Aufgaben ============ */
function tasksOn(d) {
  const list = DB.tasks.filter((t) => t.date === d).map((t) => ({ ...t, rec: false }));
  for (const m of DB.tmpls) {
    if (m.active === false || d < m.from || !(m.days & (1 << dow(d)))) continue;
    list.push({ id: m.id, rec: true, title: m.title, date: d, time: m.time, emp: m.emp, area: m.area, note: m.note, done: !!DB.done[`${m.id}|${d}`], days: m.days });
  }
  return list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title));
}
const openTasks = (d) => tasksOn(d).filter((t) => !t.done).length;

/* ============ Theme ============ */
function applyTheme() {
  const t = DB.set.theme;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
