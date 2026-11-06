'use strict';
/* ============ Dienstplan ============ */
const SNAP = 15;
const snapM = (m) => Math.round(m / SNAP) * SNAP;

function rangeOf() {
  const d = S.date;
  if (S.mode === 'day') return { from: d, to: d };
  if (S.mode === 'week') return { from: monday(d), to: addD(monday(d), 6) };
  const from = d.slice(0, 8) + '01';
  const nd = pd(from); nd.setMonth(nd.getMonth() + 1);
  return { from, to: addD(ymd(nd), -1) };
}
function movePlan(dir) {
  if (S.mode === 'day') S.date = addD(S.date, dir);
  else if (S.mode === 'week') S.date = addD(S.date, 7 * dir);
  else { const d = pd(S.date.slice(0, 8) + '01'); d.setMonth(d.getMonth() + dir); S.date = ymd(d); }
  render();
}

function planView() {
  const { from, to } = rangeOf();
  const emps = activeEmps();
  const title = S.mode === 'day' ? `${WD[dow(S.date)]}, ${fmtDMY(S.date)} · KW ${isoWeek(S.date)}`
    : S.mode === 'week' ? `KW ${isoWeek(from)} · ${fmtDM(from)} – ${fmtDMY(to)}`
      : `${MONTHS[pd(from).getMonth()]} ${from.slice(0, 4)}`;
  const nOpen = openTasks(S.date);
  const modeBtn = (m, l) => h('button', { class: 'btn' + (S.mode === m ? ' sel' : ''), onclick: () => { S.mode = m; render(); } }, l);

  const warns = analyze(from, to);
  const bar = h('div', { class: 'bar' },
    h('button', { class: 'btn', onclick: () => movePlan(-1) }, '◀'),
    h('button', { class: 'btn', onclick: () => movePlan(1) }, '▶'),
    h('button', { class: 'btn', onclick: () => { S.date = today(); render(); } }, 'Heute'),
    h('h2', { class: 'ptitle' }, title),
    h('div', { class: 'spacer' }),
    modeBtn('day', 'Tag'), modeBtn('week', 'Woche'), modeBtn('month', 'Monat'),
    h('span', { class: 'gap' }),
    h('button', { class: 'btn', onclick: suggestDialog }, '✨ Lücken füllen'),
    h('button', { class: 'btn', onclick: () => tasksDialog(S.date) }, nOpen ? `📋 Aufgaben (${nOpen})` : '📋 Aufgaben'),
    h('button', { class: 'btn', title: 'Wochenplan drucken', onclick: () => printWeek() }, '🖨 Drucken'));

  let body;
  if (!emps.length) body = h('div', { class: 'card empty' }, h('p', {}, 'Noch keine Mitarbeiter angelegt.'), h('button', { class: 'btn primary', onclick: () => go('staff') }, 'Zu den Mitarbeitern'));
  else body = S.mode === 'day' ? dayView(emps, S.date) : gridView(emps, from, diffD(from, to) + 1, S.mode === 'month', true);

  const warnBox = h('div', { class: 'card warns' },
    h('h3', {}, warns.length ? `Hinweise & Warnungen (${warns.length})` : 'Hinweise & Warnungen'),
    warns.length ? h('ul', {}, warns.map((w) => h('li', { class: w.lvl }, `${w.lvl === 'Fehler' ? '⛔' : '⚠'}  ${WD[dow(w.date)]} ${fmtDM(w.date)}   ${w.text}`)))
      : h('p', { class: 'ok' }, '✔  Keine Auffälligkeiten im angezeigten Zeitraum'));
  return h('div', { class: 'page' }, bar, body, warnBox);
}

/* ---------- Tagesansicht ---------- */
function dayView(emps, d) {
  const ids = new Set(emps.map((e) => e.id));
  const list = shiftsOn(d).filter((s) => ids.has(s.emp));
  let startH = Math.min(5, Math.floor(DB.set.openFrom / 60)), endH = Math.max(22, Math.ceil(DB.set.openTo / 60));
  for (const s of list) { startH = Math.min(startH, Math.floor(s.start / 60)); endH = Math.max(endH, Math.ceil(Math.min(s.end, 1440) / 60)); }
  endH = Math.min(endH, 24);
  const startMin = startH * 60, span = (endH - startH) * 60, hours = endH - startH;
  const pct = (m) => ((m - startMin) / span) * 100;
  const lines = { backgroundSize: `${100 / hours}% 100%` };

  const head = h('div', { class: 'tlrow head' }, h('div', { class: 'tlname' }, 'Mitarbeiter'),
    h('div', { class: 'tlcell', style: lines }, Array.from({ length: hours }, (_, i) => h('span', { class: 'hl', style: { left: (i / hours) * 100 + '%' } }, `${pad(startH + i)}:00`))));

  const req = coverReq(d), cnt = staffPer(list);
  const cov = h('div', { class: 'tlrow cov' }, h('div', { class: 'tlname' }, 'Besetzung'),
    h('div', { class: 'tlcell' }, Array.from({ length: hours }, (_, i) => {
      const hh = startH + i; let lo = 99, need = 0, low = false;
      for (let q = hh * 4; q < hh * 4 + 4 && q < 96; q++) { lo = Math.min(lo, cnt[q]); need = Math.max(need, req[q]); if (cnt[q] < req[q]) low = true; }
      return h('div', { class: 'cc ' + (low ? 'low' : need ? 'okc' : ''), style: { left: (i / hours) * 100 + '%', width: 100 / hours + '%' } },
        h('span', {}, need ? `${lo}/${need}` : `${lo}`));
    })));

  const rows = emps.map((e, i) => {
    const dayH = list.filter((s) => s.emp === e.id).reduce((n, s) => n + shiftHours(s), 0);
    const ph = periodHours(e, monday(d), addD(monday(d), 6));
    const a = absOf(e, d), blocked = a && a.status === 'Genehmigt';
    const cell = h('div', { class: 'tlcell touchy', style: lines, 'data-emp': e.id });
    const row = h('div', { class: 'tlrow' + (i % 2 ? ' alt' : ''), 'data-emp': e.id },
      h('div', { class: 'tlname' }, nameLine(e, 14), h('small', { class: Math.abs(ph.ist - ph.soll) < 0.05 ? 'okc' : ph.ist > ph.soll ? 'warnc' : '' }, `Heute ${fh(dayH)} h · Woche ${fh(ph.ist)} / ${fh(ph.soll)} h`)),
      cell);
    if (a || !isAvail(e, d)) cell.append(h('div', { class: 'band ' + (a ? 'abs-' + (a.kind === 'Urlaub' ? 'u' : a.kind === 'Krank' ? 'k' : 'o') : 'unav') }, a ? a.kind + (a.status === 'Beantragt' ? ' (beantragt)' : '') : 'nicht verfügbar'));
    const ru = restUntil(e, d);
    if (ru) cell.append(h('div', { class: 'restband', title: `Ruhezeit: frühestens ab ${T(ru)} wieder einsetzbar`, style: { width: clamp(pct(ru), 0, 100) + '%' } }));
    list.filter((s) => s.emp === e.id).forEach((s) => cell.append(shiftBar(s, e, cell, startMin, span)));
    attachCreate(cell, e, d, startMin, span, blocked);
    return row;
  });
  return h('div', { class: 'card flush tl' }, head, cov, rows);
}

function shiftBar(s, e, cell, startMin, span) {
  const col = barHex(e, s);
  const bar = h('div', { class: 'sbar', style: { left: ((s.start - startMin) / span) * 100 + '%', width: ((s.end - s.start) / span) * 100 + '%', background: col, color: onColor(col) } },
    h('i', { class: 'hdl l' }), h('span', { class: 'bt' }, `${T(s.start)}–${T(s.end)}`), h('small', {}, `${fh(shiftHours(s))} h${s.note ? ' · ' + s.note : ''}`), h('i', { class: 'hdl r' }));
  bar.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    ev.preventDefault();
    bar.setPointerCapture(ev.pointerId);
    const ppm = cell.getBoundingClientRect().width / span;
    const bw = bar.getBoundingClientRect(), rx = ev.clientX - bw.left;
    const mode = bw.width > 60 && rx < 18 ? 'l' : bw.width > 60 && bw.width - rx < 18 ? 'r' : 'm';
    const o = { start: s.start, end: s.end, emp: s.emp }, cur = { ...o };
    const x0 = ev.clientX, y0 = ev.clientY;
    let moved = false, target = null;
    const paint = () => {
      bar.style.left = ((cur.start - startMin) / span) * 100 + '%';
      bar.style.width = ((cur.end - cur.start) / span) * 100 + '%';
      bar.querySelector('.bt').textContent = `${T(cur.start)}–${T(cur.end)}`;
    };
    const mv = (e2) => {
      if (Math.abs(e2.clientX - x0) > 5 || Math.abs(e2.clientY - y0) > 5) moved = true;
      if (!moved) return;
      const dm = Math.round((e2.clientX - x0) / ppm / SNAP) * SNAP;
      if (mode === 'm') {
        const len = o.end - o.start;
        cur.start = clamp(o.start + dm, 0, 1440 - len); cur.end = cur.start + len;
        const row = document.elementsFromPoint(e2.clientX, e2.clientY).find((n) => n.classList && n.classList.contains('tlrow') && n.dataset.emp);
        document.querySelectorAll('.tlrow.drop').forEach((n) => n.classList.remove('drop'));
        if (row && +row.dataset.emp !== s.emp) { row.classList.add('drop'); target = +row.dataset.emp; } else target = null;
      } else if (mode === 'l') cur.start = clamp(o.start + dm, 0, o.end - SNAP);
      else cur.end = clamp(o.end + dm, o.start + SNAP, 1440);
      paint();
    };
    const fin = (e2) => {
      bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', fin); bar.removeEventListener('pointercancel', fin);
      document.querySelectorAll('.tlrow.drop').forEach((n) => n.classList.remove('drop'));
      if (e2.type === 'pointercancel') { render(); return; }
      if (!moved) { shiftDialog(s); return; }
      if (s.brk === autoBreak(o.end - o.start)) s.brk = autoBreak(cur.end - cur.start);
      s.start = cur.start; s.end = cur.end;
      if (target) s.emp = target;
      saveDB(); render();
    };
    bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', fin); bar.addEventListener('pointercancel', fin);
  });
  return bar;
}

function attachCreate(cell, e, d, startMin, span, blocked) {
  cell.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.sbar') || ev.button > 0) return;
    const rect = cell.getBoundingClientRect(), ppm = rect.width / span;
    const at = (x) => clamp(snapM(startMin + (x - rect.left) / ppm), startMin, 1440);
    const m0 = Math.floor((startMin + (ev.clientX - rect.left) / ppm) / SNAP) * SNAP, x0 = ev.clientX;
    let ghost = null, m1 = m0;
    const mv = (e2) => {
      if (Math.abs(e2.clientX - x0) < 8 && !ghost) return;
      m1 = at(e2.clientX);
      if (!ghost) { ghost = h('div', { class: 'ghost' }); cell.append(ghost); }
      const a = Math.min(m0, m1), b = Math.max(m0, m1, a + SNAP);
      ghost.style.left = ((a - startMin) / span) * 100 + '%'; ghost.style.width = ((b - a) / span) * 100 + '%';
      ghost.textContent = `${T(a)}–${T(b)}`;
    };
    const fin = (e2) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', fin); window.removeEventListener('pointercancel', fin);
      if (ghost) ghost.remove();
      if (e2.type === 'pointercancel') return;
      if (blocked && !confirm(`${empName(e)} hat an diesem Tag Abwesenheit. Trotzdem Arbeitszeit eintragen?`)) return;
      if (ghost) { const a = Math.min(m0, m1), b = Math.max(m0, m1, a + SNAP); DB.shifts.push({ id: nid(), emp: e.id, date: d, start: a, end: b, brk: autoBreak(b - a), note: '' }); saveDB(); render(); }
      else shiftDialog(null, { emp: e.id, date: d, start: clamp(m0, 0, 1440 - 480), end: clamp(m0, 0, 1440 - 480) + 480 });
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', fin); window.addEventListener('pointercancel', fin);
  });
}

/* ---------- Arbeitszeit-Dialog ---------- */
function shiftDialog(s, pre) {
  const x = s || { emp: pre.emp, date: pre.date, start: pre.start, end: pre.end, brk: null, note: '' };
  const act = activeEmps();
  if (!act.some((e) => e.id === x.emp) && emp(x.emp)) act.push(emp(x.emp));
  const build = (v) => {
    const st = parseT(v.start); let en = parseT(v.end);
    if (en <= st) en += 1440;
    const dur = en - st;
    const brk = Number.isFinite(v.brk) ? Math.max(0, Math.round(v.brk)) : autoBreak(dur);
    return { emp: +v.emp, date: v.date, start: st, end: en, brk, note: v.note.trim() };
  };
  const check = (v) => {
    if (!v.date) return 'Bitte ein Datum wählen.';
    if (!v.start || !v.end) return 'Bitte Beginn und Ende angeben.';
    const b = build(v);
    if (b.end - b.start > 960) return 'Eine Arbeitszeit darf höchstens 16 Stunden lang sein.';
    if (b.brk >= b.end - b.start) return 'Die Pause muss kürzer als die Arbeitszeit sein.';
    return null;
  };
  openForm(s ? 'Arbeitszeit bearbeiten' : 'Neue Arbeitszeit', [
    { k: 'emp', label: 'Mitarbeiter', type: 'select', v: x.emp, opts: act.map((e) => [e.id, empName(e)]) },
    { k: 'date', label: 'Datum', type: 'date', v: x.date },
    { k: 'start', label: 'Beginn', type: 'time', v: T(x.start), step: 900 },
    { k: 'end', label: 'Ende', type: 'time', v: T(x.end), step: 900, hint: 'Liegt das Ende vor dem Beginn, geht die Arbeitszeit über Mitternacht.' },
    { k: 'brk', label: 'Pause (Minuten)', type: 'number', v: x.brk == null ? '' : x.brk, ph: 'automatisch', hint: 'Leer lassen = automatisch: ab 6 Std. 30 Min., ab 8,5 Std. 45 Min., ab 10 Std. 60 Min.' },
    { k: 'note', label: 'Notiz', type: 'text', v: x.note },
  ], {
    delNow: true,
    del: s ? () => { DB.shifts = DB.shifts.filter((y) => y !== s); saveDB(); render(); } : null,
    extra: s ? [{ label: '⧉ Auf Folgetag kopieren', fn: (v, m) => { const e = check(v); if (e) return e; DB.shifts.push({ id: nid(), ...build(v), date: addD(v.date, 1) }); saveDB(); m.close(); render(); } }] : [],
    save: (v) => {
      const e = check(v); if (e) return e;
      if (s) Object.assign(s, build(v)); else DB.shifts.push({ id: nid(), ...build(v) });
      saveDB(); render();
    },
  });
}

/* ---------- Wochen- und Monatsraster ---------- */
function gridView(emps, from, n, month, interactive) {
  const dates = Array.from({ length: n }, (_, i) => addD(from, i));
  const ids = new Set(emps.map((e) => e.id));
  const sh = shiftsIn(dates[0], dates[n - 1]);
  const t = today();
  const head = h('tr', {}, h('th', { class: 'nm' }, 'Mitarbeiter'),
    dates.map((d) => h('th', { class: 'dh' + (d === t ? ' today' : '') + (dow(d) >= 5 ? ' we' : ''), onclick: interactive ? () => { S.date = d; S.mode = 'day'; render(); } : null },
      h('div', { class: 'sub' }, WD[dow(d)]), h('div', {}, month ? d.slice(8) : fmtDM(d)))),
    h('th', { class: 'hrs' }, 'Ist / Soll'));
  const body = emps.map((e) => {
    const ph = periodHours(e, dates[0], dates[n - 1]);
    const cells = dates.map((d) => {
      const a = absOf(e, d);
      const cls = 'c' + (a ? ' abs-' + (a.kind === 'Urlaub' ? 'u' : a.kind === 'Krank' ? 'k' : 'o') : !isAvail(e, d) ? ' unav' : dow(d) >= 5 ? ' we' : '');
      const td = h('td', { class: cls });
      if (a) td.append(h('div', { class: 'albl' }, month ? a.kind[0] : a.kind + (a.status === 'Beantragt' ? ' (beantragt)' : '')));
      for (const s of sh.filter((x) => x.emp === e.id && x.date === d).sort((p, q) => p.start - q.start)) {
        const col = barHex(e, s);
        td.append(h('button', { class: 'chip', style: { background: col, color: onColor(col) }, title: `${empName(e)}\n${T(s.start)}–${T(s.end)} (${KIND_NAME[kindOf(s)]})\nPause ${s.brk} Min. · ${fh(shiftHours(s))} h`,
          onclick: interactive ? (ev) => { ev.stopPropagation(); shiftDialog(s); } : null }, month ? kindOf(s) : `${T(s.start)}–${T(s.end)}`));
      }
      if (interactive) td.addEventListener('click', () => {
        if (month) { S.date = d; S.mode = 'day'; render(); } else shiftDialog(null, { emp: e.id, date: d, start: 480, end: 960 });
      });
      return td;
    });
    return h('tr', {}, h('td', { class: 'nm' }, nameLine(e, month ? 12 : 14), month ? null : h('small', {}, `${e.model} · ${fh(e.weekly)} h`)),
      cells, h('td', { class: 'hrs ' + (Math.abs(ph.ist - ph.soll) < 0.05 ? 'okc' : ph.ist > ph.soll ? 'warnc' : ''), title: `Saldo: ${fsigned(ph.ist - ph.soll)} h` }, `${fh(ph.ist)} / ${fh(ph.soll)}`));
  });
  const cov = h('tr', { class: 'covrow' }, h('td', { class: 'nm' }, 'Besetzung'), dates.map((d) => {
    const day = sh.filter((s) => s.date === d && ids.has(s.emp));
    const low = gaps(d, day).length > 0;
    const txt = dow(d) === 6 && !day.length && !low ? '–' : month ? String(day.length) : `F ${day.filter((s) => kindOf(s) === 'F').length} · M ${day.filter((s) => kindOf(s) === 'M').length} · S ${day.filter((s) => kindOf(s) === 'S').length}`;
    return h('td', { class: low ? 'dangerc' : 'okc' }, txt);
  }), h('td', {}));
  return h('div', { class: 'card flush gridwrap' }, h('table', { class: 'grid' + (month ? ' month' : '') }, h('thead', {}, head), h('tbody', {}, body, cov)));
}

/* ---------- Lücken füllen ---------- */
function suggestDialog() {
  const from = monday(S.date);
  const props = suggest(from);
  if (!props.length) { toast('Keine Lücken, die sich regelkonform füllen lassen.'); return; }
  const opts = props.map((p, i) => [i, `${WD[dow(p.date)]} ${fmtDM(p.date)} · ${empName(emp(p.emp))} · ${T(p.start)}–${T(p.end)} (${fh(shiftHours(p))} h)`, barHex(emp(p.emp), p)]);
  openForm(`Lücken füllen · KW ${isoWeek(from)}`, [
    { label: '', type: 'custom', node: h('p', { class: 'hint' }, 'Vorschläge berücksichtigen Verfügbarkeit, Abwesenheit, Ruhezeit und Wochenstunden. Wähle aus, was übernommen werden soll.'), get: () => null },
    { k: 'sel', label: '', type: 'checks', v: props.map((_, i) => i), opts },
  ], {
    saveLabel: 'Übernehmen', wide: true,
    save: (v) => {
      v.sel.forEach((i) => { const p = props[i]; DB.shifts.push({ id: nid(), emp: p.emp, date: p.date, start: p.start, end: p.end, brk: p.brk, note: '' }); });
      saveDB(); toast(`${v.sel.length} Arbeitszeit(en) übernommen.`); render();
    },
  });
}
