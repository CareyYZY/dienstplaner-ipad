'use strict';
/* ============ Urlaubsplan (Jahresansicht) ============ */

function absView() {
  const year = S.year;
  const emps = activeEmps();
  const newBtn = (kind, label) => h('button', { class: 'btn', onclick: () => absDialog(null, { kind }) }, label);
  const bar = h('div', { class: 'bar' },
    h('h1', {}, 'Urlaubsplan'),
    h('button', { class: 'btn', onclick: () => { S.year--; render(); } }, '◀'),
    h('b', { class: 'ylabel' }, String(year)),
    h('button', { class: 'btn', onclick: () => { S.year++; render(); } }, '▶'),
    h('button', { class: 'btn', onclick: () => { S.year = new Date().getFullYear(); render(); } }, 'Heute'),
    h('div', { class: 'spacer' }),
    newBtn('Urlaub', '＋ Urlaub'), newBtn('Krank', '＋ Krank'), newBtn('Berufsschule', '＋ Schule'),
    h('button', { class: 'btn', onclick: () => printYear() }, '🖨 Jahr drucken'));
  const legend = h('div', { class: 'legend' },
    [['#2563EB', 'Urlaub'], ['#DC2626', 'Krank'], ['#0D9488', 'Berufsschule'], ['#7C3AED', 'Unbezahlt'], ['#6B7280', 'Sonstiges']]
      .map(([c, t]) => h('span', {}, h('i', { class: 'sq', style: { background: c } }), t)));
  const body = emps.length ? yearGrid(emps, year, true) : h('div', { class: 'card empty' }, h('p', {}, 'Noch keine Mitarbeiter angelegt.'), h('button', { class: 'btn primary', onclick: () => go('staff') }, 'Zu den Mitarbeitern'));
  return h('div', { class: 'page' }, bar, legend, body);
}

function yearGrid(emps, year, interactive) {
  const jan1 = `${year}-01-01`, dec31 = `${year}-12-31`;
  const days = diffD(jan1, dec31) + 1;
  const pct = (d) => (diffD(jan1, d) / days) * 100;
  const wd1 = dow(jan1);
  const firstSat = (5 - wd1 + 7) % 7;

  const layer = h('div', { class: 'yrlayer' });
  if (wd1 === 6) layer.append(h('div', { class: 'we1', style: { left: 0, width: 100 / days + '%' } }));
  layer.append(h('div', { class: 'wes', style: { left: (firstSat / days) * 100 + '%', width: ((days - firstSat) / days) * 100 + '%', backgroundSize: (7 / (days - firstSat)) * 100 + '% 100%' } }));
  for (let m = 0; m < 12; m++) layer.append(h('div', { class: 'ml', style: { left: pct(`${year}-${pad(m + 1)}-01`) + '%' } }));
  if (today().slice(0, 4) === String(year)) layer.append(h('div', { class: 'tdl', style: { left: pct(today()) + '%' } }));

  const head = h('div', { class: 'yrrow head' }, h('div', { class: 'tlname' }, 'Mitarbeiter  (Urlaubstage)'),
    h('div', { class: 'yrcell' }, MON3.map((n, m) => h('span', { class: 'hl', style: { left: pct(`${year}-${pad(m + 1)}-01`) + '%' } }, n))));

  const rows = emps.map((e, i) => {
    const used = vacationDays(e, year, 'Genehmigt');
    const cell = h('div', { class: 'yrcell touchy', 'data-emp': e.id });
    const row = h('div', { class: 'yrrow' + (i % 2 ? ' alt' : ''), 'data-emp': e.id },
      h('div', { class: 'tlname' }, nameLine(e, 14), h('small', {}, `${used} von ${e.vac} Tagen genommen`)), cell);
    DB.abs.filter((a) => a.emp === e.id && a.start <= dec31 && a.end >= jan1).forEach((a) => {
      const s = a.start < jan1 ? jan1 : a.start, en = a.end > dec31 ? dec31 : a.end;
      const col = absColor(a);
      const b = h('div', { class: 'abar' + (a.status === 'Abgelehnt' ? ' rej' : ''), title: `${empName(e)}\n${a.kind} (${a.status})\n${fmtDMY(a.start)} – ${fmtDMY(a.end)}\n${absenceDays(e, a, a.start, a.end).length} Arbeitstage${a.note ? '\n' + a.note : ''}`,
        style: { left: pct(s) + '%', width: ((diffD(s, en) + 1) / days) * 100 + '%', background: col, color: onColor(col) } },
        h('i', { class: 'hdl l' }), h('span', {}, `${a.kind}`), h('i', { class: 'hdl r' }));
      if (interactive) absBarDrag(b, a, cell, days, jan1);
      cell.append(b);
    });
    if (interactive) absCreate(cell, e, days, jan1);
    return row;
  });
  return h('div', { class: 'card flush yr' }, h('div', { class: 'yrbody' }, layer, head, rows));
}

function absBarDrag(bar, a, cell, days, jan1) {
  bar.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    ev.preventDefault();
    bar.setPointerCapture(ev.pointerId);
    const ppd = cell.getBoundingClientRect().width / days;
    const bw = bar.getBoundingClientRect(), rx = ev.clientX - bw.left;
    const mode = bw.width > 50 && rx < 16 ? 'l' : bw.width > 50 && bw.width - rx < 16 ? 'r' : 'm';
    const o = { start: a.start, end: a.end }, cur = { ...o }, x0 = ev.clientX;
    let moved = false;
    const mv = (e2) => {
      if (Math.abs(e2.clientX - x0) > 5) moved = true;
      if (!moved) return;
      const dd = Math.round((e2.clientX - x0) / ppd);
      if (mode === 'm') { cur.start = addD(o.start, dd); cur.end = addD(o.end, dd); }
      else if (mode === 'l') { cur.start = addD(o.start, dd); if (cur.start > o.end) cur.start = o.end; }
      else { cur.end = addD(o.end, dd); if (cur.end < o.start) cur.end = o.start; }
      bar.style.left = (diffD(jan1, cur.start) / days) * 100 + '%';
      bar.style.width = ((diffD(cur.start, cur.end) + 1) / days) * 100 + '%';
    };
    const fin = (e2) => {
      bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', fin); bar.removeEventListener('pointercancel', fin);
      if (e2.type === 'pointercancel') { render(); return; }
      if (!moved) { absDialog(a); return; }
      a.start = cur.start; a.end = cur.end; saveDB(); render();
    };
    bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', fin); bar.addEventListener('pointercancel', fin);
  });
}

function absCreate(cell, e, days, jan1) {
  cell.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.abar') || ev.button > 0) return;
    const rect = cell.getBoundingClientRect(), ppd = rect.width / days;
    const dayAt = (x) => addD(jan1, clamp(Math.floor((x - rect.left) / ppd), 0, days - 1));
    const d0 = dayAt(ev.clientX), x0 = ev.clientX;
    let ghost = null, d1 = d0;
    const mv = (e2) => {
      if (Math.abs(e2.clientX - x0) < 8 && !ghost) return;
      d1 = dayAt(e2.clientX);
      if (!ghost) { ghost = h('div', { class: 'ghost' }); cell.append(ghost); }
      const a = d0 < d1 ? d0 : d1, b = d0 < d1 ? d1 : d0;
      ghost.style.left = (diffD(jan1, a) / days) * 100 + '%'; ghost.style.width = ((diffD(a, b) + 1) / days) * 100 + '%';
      ghost.textContent = `${fmtDM(a)} – ${fmtDM(b)}`;
    };
    const fin = (e2) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', fin); window.removeEventListener('pointercancel', fin);
      if (ghost) ghost.remove();
      if (e2.type === 'pointercancel') return;
      const a = d0 < d1 ? d0 : d1, b = d0 < d1 ? d1 : d0;
      absDialog(null, { emp: e.id, start: a, end: b, kind: 'Urlaub' });
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', fin); window.addEventListener('pointercancel', fin);
  });
}

function absDialog(a, pre = {}) {
  const act = activeEmps();
  const x = a || { emp: pre.emp || (act[0] && act[0].id), kind: pre.kind || 'Urlaub', status: 'Genehmigt', start: pre.start || `${S.year}-${today().slice(5)}`, end: pre.end || pre.start || `${S.year}-${today().slice(5)}`, note: '' };
  if (!act.length) { toast('Bitte zuerst Mitarbeiter anlegen.'); return; }
  if (!act.some((e) => e.id === x.emp) && emp(x.emp)) act.push(emp(x.emp));
  openForm(a ? 'Abwesenheit bearbeiten' : 'Neue Abwesenheit', [
    { k: 'emp', label: 'Mitarbeiter', type: 'select', v: x.emp, opts: act.map((e) => [e.id, empName(e)]) },
    { k: 'kind', label: 'Art', type: 'select', v: x.kind, opts: ABS_KINDS.map((k) => [k, k]) },
    { k: 'start', label: 'Von', type: 'date', v: x.start },
    { k: 'end', label: 'Bis', type: 'date', v: x.end },
    { k: 'note', label: 'Notiz', type: 'text', v: x.note },
    ...(a
      ? (a.series ? [{ label: '', type: 'custom', get: () => null, node: h('p', { class: 'hint' }, `Teil einer Serie (${DB.abs.filter((y) => y.series === a.series).length} Termine). Änderungen gelten nur für diesen Termin.`) }] : [])
      : [
        { k: 'rep', label: 'Wiederholen', type: 'select', v: '0', opts: [['0', 'Nicht wiederholen'], ['1', 'Jede Woche'], ['2', 'Alle 2 Wochen'], ['3', 'Alle 3 Wochen'], ['4', 'Alle 4 Wochen']] },
        { k: 'wd', label: 'An diesen Wochentagen', type: 'days', v: 0, hint: 'Leer = Wochentag des Von-Datums. Mehrere Tage möglich. Gilt nur bei Wiederholung.' },
        { k: 'until', label: 'Wiederholen bis', type: 'date', v: `${x.start.slice(0, 4)}-12-31`, hint: 'Gilt nur bei Wiederholung.' },
      ]),
  ], {
    extra: a && a.series ? [{ label: 'Ganze Serie löschen', fn: (v, m) => {
      const n = DB.abs.filter((y) => y.series === a.series).length;
      confirmBox(`Alle ${n} Termine dieser Serie löschen?`, 'Serie löschen', () => { DB.abs = DB.abs.filter((y) => y.series !== a.series); saveDB(); m.close(); render(); });
    } }] : [],
    del: a ? () => { DB.abs = DB.abs.filter((y) => y !== a); saveDB(); render(); } : null,
    save: (v) => {
      if (!v.start || !v.end) return 'Bitte Zeitraum angeben.';
      if (v.end < v.start) return 'Das Ende liegt vor dem Beginn.';
      const rec = { emp: +v.emp, kind: v.kind, status: 'Genehmigt', start: v.start, end: v.end, note: v.note.trim() };
      let made = 0;
      if (a) Object.assign(a, rec);
      else if (+v.rep > 0) {
        if (!v.until || v.until < v.start) return 'Das Ende der Wiederholung liegt vor dem Beginn.';
        const len = diffD(v.start, v.end), step = +v.rep, sid = nid(), list = [], mask = v.wd || (1 << dow(v.start));
        for (let w = 0; list.length <= 400; w += step) {
          const mon = addD(monday(v.start), 7 * w);
          if (mon > v.until) break;
          for (let k = 0; k < 7; k++) {
            if (!(mask & (1 << k))) continue;
            const d = addD(mon, k);
            if (d >= v.start && d <= v.until) list.push(d);
          }
        }
        if (!list.length) return 'Im gewählten Zeitraum gibt es keinen Termin.';
        if (list.length > 400) return 'Zu viele Termine (höchstens 400).';
        list.forEach((d) => DB.abs.push({ id: nid(), ...rec, start: d, end: addD(d, len), series: sid }));
        made = list.length;
      } else DB.abs.push({ id: nid(), ...rec });
      saveDB();
      const e = emp(+v.emp);
      if (v.kind === 'Urlaub') {
        const y = +v.start.slice(0, 4), left = e.vac - vacationDays(e, y, 'Genehmigt');
        if (left < 0) toast(`Achtung: ${empName(e)} hat ${-left} Urlaubstag(e) mehr geplant als verfügbar.`);
      }
      render();
      if (made) toast(`${made} Termine angelegt.`);
    },
  });
}
