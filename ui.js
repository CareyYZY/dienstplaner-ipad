'use strict';
/* ============ UI-Grundlagen: Dialoge, Formulare, Navigation ============ */
const S = { tab: 'plan', mode: 'day', date: today(), year: new Date().getFullYear() };

function modal(title, bodyNode, { wide = false, onClose } = {}) {
  const bg = h('div', { class: 'modal-bg' });
  const box = h('div', { class: 'modal' + (wide ? ' wide' : '') }, h('h2', {}, title), bodyNode);
  bg.append(box);
  const close = () => { bg.remove(); document.removeEventListener('keydown', esc); if (onClose) onClose(); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  document.body.append(bg);
  return { close, box };
}

function confirmBox(msg, okLabel, onOk) {
  const m = modal('Bitte bestätigen', h('div', {},
    h('p', { class: 'msg' }, msg),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => m.close() }, 'Abbrechen'),
      h('button', { class: 'btn danger', onclick: () => { m.close(); onOk(); } }, okLabel))));
}

function colorPicker(value, onPick) {
  const wrap = h('div', { class: 'swatches' });
  let cur = value || '';
  const draw = () => {
    wrap.replaceChildren(
      h('button', { type: 'button', class: 'sw none' + (cur === '' ? ' sel' : ''), title: 'keine', onclick: () => { cur = ''; draw(); if (onPick) onPick(cur); } }, '∅'),
      ...PALETTE.map(([n, c]) => h('button', {
        type: 'button', class: 'sw' + (cur === c ? ' sel' : ''), title: n, style: { background: c },
        onclick: () => { cur = c; draw(); if (onPick) onPick(cur); },
      })));
  };
  draw();
  return { node: wrap, get: () => cur };
}

function chipsInput(opts, selected) {
  const sel = new Set(selected);
  const wrap = h('div', { class: 'chips' });
  const draw = () => wrap.replaceChildren(...opts.map(([v, label, color]) => h('button', {
    type: 'button', class: 'chipbtn' + (sel.has(v) ? ' on' : ''),
    onclick: () => { sel.has(v) ? sel.delete(v) : sel.add(v); draw(); },
  }, color ? h('i', { class: 'dot', style: { background: color } }) : null, label)));
  draw();
  return { node: wrap, get: () => opts.map((o) => o[0]).filter((v) => sel.has(v)) };
}

function daysInput(mask) {
  const c = chipsInput(WD.map((d, i) => [i, d]), WD.map((_, i) => i).filter((i) => mask & (1 << i)));
  return { node: c.node, get: () => c.get().reduce((m, i) => m | (1 << i), 0) };
}

function buildField(f) {
  let node, get;
  switch (f.type) {
    case 'select': {
      node = h('select', { value: String(f.v) }, f.opts.map(([v, l]) => h('option', { value: String(v) }, l)));
      get = () => node.value;
      break;
    }
    case 'textarea': node = h('textarea', { rows: 2, value: f.v || '' }); get = () => node.value; break;
    case 'bool': node = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!f.v }), f.text || ''); get = () => node.firstChild.checked; break;
    case 'checks': { const c = chipsInput(f.opts, f.v || []); node = c.node; get = c.get; break; }
    case 'days': { const c = daysInput(f.v || 0); node = c.node; get = c.get; break; }
    case 'color': { const c = colorPicker(f.v); node = c.node; get = c.get; break; }
    case 'custom': node = f.node; get = f.get; break;
    default: {
      node = h('input', { type: f.type, value: f.v == null ? '' : f.v, step: f.step, min: f.min, max: f.max, placeholder: f.ph, inputmode: f.type === 'number' ? 'decimal' : null, autocapitalize: f.type === 'text' ? 'words' : null });
      get = f.type === 'number' ? () => parseFloat(String(node.value).replace(',', '.')) : () => node.value;
    }
  }
  return { node, get };
}

/** Formular-Dialog. save(values) → Fehlertext (bleibt offen) oder nichts (schließt). */
function openForm(title, fields, { save, del, saveLabel = 'Speichern', extra = [], wide = false, delNow = false } = {}) {
  const built = fields.map((f) => ({ f, ...buildField(f) }));
  const err = h('div', { class: 'err' });
  const form = h('div', { class: 'form' }, built.map(({ f, node }) =>
    h('div', { class: 'row' + (f.type === 'bool' ? ' boolrow' : '') }, f.label ? h('label', { class: 'lbl' }, f.label) : null, node, f.hint ? h('div', { class: 'hint' }, f.hint) : null)));
  const vals = () => Object.fromEntries(built.filter((b) => b.f.k).map((b) => [b.f.k, b.get()]));
  const m = modal(title, h('div', {}, form, err, h('div', { class: 'actions' },
    del ? h('button', { class: 'btn danger left', onclick: () => { if (delNow) { m.close(); del(); } else confirmBox('Wirklich löschen?', 'Löschen', () => { m.close(); del(); }); } }, 'Löschen') : null,
    ...extra.map((x) => h('button', { class: 'btn', onclick: () => { const r = x.fn(vals(), m); if (typeof r === 'string') err.textContent = r; } }, x.label)),
    h('button', { class: 'btn', onclick: () => m.close() }, 'Abbrechen'),
    h('button', { class: 'btn primary', onclick: () => { const r = save(vals()); if (typeof r === 'string') err.textContent = r; else m.close(); } }, saveLabel))), { wide });
  return m;
}

/* ============ App-Gerüst ============ */
const TABS = [
  ['plan', '📅', 'Dienstplan'], ['staff', '👥', 'Mitarbeiter'], ['abs', '🏖', 'Urlaubsplan'], ['set', '⚙', 'Einstellungen'],
];
function render() {
  const main = $('#main');
  const keep = main.scrollTop;
  main.replaceChildren(VIEWS[S.tab]());
  main.scrollTop = keep;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
}
function go(tab) { S.tab = tab; render(); }

/* ============ Mitarbeiter ============ */
function nameLine(e, size) {
  const sp = h('span', { class: 'nameline', style: size ? { fontSize: size + 'px' } : null }, h('b', {}, empName(e)));
  for (const a of empAreas(e)) sp.append(h('i', { class: 'dot', title: a.name, style: { background: a.color } }));
  return sp;
}

function staffView() {
  const rows = [...DB.emps].sort((a, b) => a.sort - b.sort || a.id - b.id);
  const yr = new Date().getFullYear();
  const move = (e, dir) => {
    const i = rows.indexOf(e), j = i + dir;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    rows.forEach((x, k) => { x.sort = k + 1; });
    saveDB(); render();
  };
  const tbl = h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, ['', 'Name', 'Modell', 'Std./Woche', 'Urlaub ' + yr, 'Verfügbar', 'Arbeitsbereiche', ''].map((t) => h('th', {}, t)))),
    h('tbody', {}, rows.map((e, i) => {
      const used = vacationDays(e, yr, 'Genehmigt');
      return h('tr', { class: e.active === false ? 'inactive' : '', onclick: () => editEmployee(e) },
        h('td', { class: 'mv', onclick: (ev) => ev.stopPropagation() },
          h('button', { class: 'mini', disabled: i === 0, onclick: () => move(e, -1) }, '▲'),
          h('button', { class: 'mini', disabled: i === rows.length - 1, onclick: () => move(e, 1) }, '▼')),
        h('td', {}, e.color ? h('i', { class: 'dot big', style: { background: e.color } }) : null, nameLine(e), e.active === false ? h('small', {}, ' (inaktiv)') : null),
        h('td', {}, e.model), h('td', {}, fh(e.weekly)),
        h('td', {}, `${used} / ${e.vac} (Rest ${e.vac - used})`),
        h('td', {}, WD.filter((_, k) => e.avail & (1 << k)).join(' ')),
        h('td', {}, empAreas(e).map((a) => h('span', { class: 'tag' }, h('i', { class: 'dot', style: { background: a.color } }), a.name))),
        h('td', { class: 'go' }, '✎'));
    })));
  return h('div', { class: 'page' },
    h('div', { class: 'bar' }, h('h1', {}, 'Mitarbeiter'), h('div', { class: 'spacer' }),
      h('button', { class: 'btn primary', onclick: () => editEmployee(null) }, '＋ Mitarbeiter'),
      h('button', { class: 'btn', onclick: areasDialog }, 'Arbeitsbereiche…'),
      h('button', { class: 'btn', onclick: rulesDialog }, 'Regeln…')),
    rows.length ? h('div', { class: 'card flush' }, tbl) : h('div', { class: 'card empty' }, h('p', {}, 'Noch keine Mitarbeiter angelegt.'), h('button', { class: 'btn primary', onclick: () => editEmployee(null) }, '＋ Ersten Mitarbeiter anlegen')));
}

function editEmployee(e) {
  const isNew = !e;
  const x = e || { first: '', last: '', model: 'Vollzeit', weekly: 40, vac: 30, avail: 63, color: '', areas: [], active: true };
  openForm(isNew ? 'Neuer Mitarbeiter' : 'Mitarbeiter bearbeiten', [
    { k: 'first', label: 'Vorname', type: 'text', v: x.first },
    { k: 'last', label: 'Nachname', type: 'text', v: x.last },
    { k: 'model', label: 'Beschäftigung', type: 'select', v: x.model, opts: ['Vollzeit', 'Teilzeit', 'Minijob', 'Azubi', 'Aushilfe'].map((m) => [m, m]) },
    { k: 'weekly', label: 'Wochenstunden', type: 'number', v: x.weekly, step: 0.5 },
    { k: 'vac', label: 'Urlaubstage pro Jahr', type: 'number', v: x.vac },
    { k: 'avail', label: 'Verfügbare Wochentage', type: 'days', v: x.avail },
    { k: 'areas', label: 'Arbeitsbereiche (mehrere möglich)', type: 'checks', v: x.areas, opts: DB.areas.map((a) => [a.id, a.name, a.color]), hint: DB.areas.length ? null : 'Noch keine Arbeitsbereiche – unter „Arbeitsbereiche…“ anlegen.' },
    { k: 'color', label: 'Eigene Farbe (optional, für Balken)', type: 'color', v: x.color },
    { k: 'active', label: '', type: 'bool', text: 'Aktiv (erscheint im Dienstplan)', v: x.active !== false },
  ], {
    del: isNew ? null : () => {
      DB.shifts = DB.shifts.filter((s) => s.emp !== e.id);
      DB.abs = DB.abs.filter((a) => a.emp !== e.id);
      DB.tasks.forEach((t) => { if (t.emp === e.id) t.emp = 0; });
      DB.tmpls.forEach((t) => { if (t.emp === e.id) t.emp = 0; });
      DB.emps = DB.emps.filter((y) => y !== e);
      saveDB(); render();
    },
    save: (v) => {
      if (!v.first.trim() && !v.last.trim()) return 'Bitte einen Namen eingeben.';
      if (!(v.weekly >= 0 && v.weekly <= 60)) return 'Wochenstunden: bitte 0–60 eingeben.';
      if (!(v.vac >= 0 && v.vac <= 60)) return 'Urlaubstage: bitte 0–60 eingeben.';
      if (v.avail === 0) return 'Mindestens ein Wochentag muss verfügbar sein.';
      const t = e || { id: nid(), sort: Math.max(0, ...DB.emps.map((y) => y.sort || 0)) + 1 };
      Object.assign(t, { first: v.first.trim(), last: v.last.trim(), model: v.model, weekly: v.weekly, vac: Math.round(v.vac), avail: v.avail, areas: v.areas, color: v.color, active: v.active });
      if (isNew) DB.emps.push(t);
      saveDB(); render();
    },
  });
}

function areasDialog() {
  const list = h('div', { class: 'list' });
  const draw = () => list.replaceChildren(...(DB.areas.length ? DB.areas.slice().sort((a, b) => a.name.localeCompare(b.name)).map((a) =>
    h('div', { class: 'li', onclick: () => editArea(a, draw) }, h('i', { class: 'dot big', style: { background: a.color } }), h('b', {}, a.name),
      h('span', { class: 'sub' }, `${DB.emps.filter((e) => (e.areas || []).includes(a.id)).length} Mitarbeiter`), h('span', { class: 'go' }, '✎')))
    : [h('p', { class: 'msg' }, 'Noch keine Arbeitsbereiche. Lege z. B. „Theke“, „Wurstküche“ oder „Verkauf“ an.')]));
  draw();
  const m = modal('Arbeitsbereiche', h('div', {}, list, h('div', { class: 'actions' },
    h('button', { class: 'btn primary left', onclick: () => editArea(null, draw) }, '＋ Neuer Arbeitsbereich'),
    h('button', { class: 'btn', onclick: () => m.close() }, 'Fertig'))), { onClose: render });
}
function editArea(a, redraw) {
  const used = new Set(DB.areas.map((x) => x.color));
  const free = (PALETTE.find(([, c]) => !used.has(c)) || PALETTE[0])[1];
  openForm(a ? 'Arbeitsbereich bearbeiten' : 'Neuer Arbeitsbereich', [
    { k: 'name', label: 'Name', type: 'text', v: a ? a.name : '' },
    { k: 'color', label: 'Farbe', type: 'color', v: a ? a.color : free },
  ], {
    del: a ? () => { DB.emps.forEach((e) => { e.areas = (e.areas || []).filter((i) => i !== a.id); }); DB.tasks.concat(DB.tmpls).forEach((t) => { if (t.area === a.id) t.area = 0; }); DB.areas = DB.areas.filter((x) => x !== a); saveDB(); redraw(); } : null,
    save: (v) => {
      if (!v.name.trim()) return 'Bitte einen Namen eingeben.';
      if (!v.color) return 'Bitte eine Farbe wählen.';
      if (a) Object.assign(a, { name: v.name.trim(), color: v.color }); else DB.areas.push({ id: nid(), name: v.name.trim(), color: v.color });
      saveDB(); redraw();
    },
  });
}

function rulesDialog() {
  const rules = DB.set.cover.map((r) => ({ ...r }));
  const box = h('div', { class: 'rules' });
  const draw = () => box.replaceChildren(...rules.map((r, i) => {
    const row = h('div', { class: 'rule' },
      h('input', { type: 'time', step: 900, value: T(r.from), onchange: (ev) => { r.from = parseT(ev.target.value); } }), '–',
      h('input', { type: 'time', step: 900, value: T(r.to), onchange: (ev) => { r.to = parseT(ev.target.value); } }),
      h('input', { type: 'number', min: 0, max: 50, value: r.count, class: 'num', onchange: (ev) => { r.count = Math.max(0, parseInt(ev.target.value, 10) || 0); } }), 'Pers.',
      h('div', { class: 'chips' }, WD.map((d, k) => h('button', { type: 'button', class: 'chipbtn' + (r.days & (1 << k) ? ' on' : ''), onclick: () => { r.days ^= 1 << k; draw(); } }, d))),
      h('button', { class: 'mini', onclick: () => { rules.splice(i, 1); draw(); } }, '✕'));
    return row;
  }), ...(rules.length ? [] : [h('div', { class: 'hint' }, 'Keine Mindestbesetzung festgelegt.')]));
  draw();
  const s = DB.set;
  openForm('Regeln', [
    { k: 'openFrom', label: 'Öffnungszeit von', type: 'time', v: T(s.openFrom), step: 900 },
    { k: 'openTo', label: 'Öffnungszeit bis', type: 'time', v: T(s.openTo), step: 900 },
    { k: 'minRest', label: 'Mindest-Ruhezeit zwischen zwei Tagen (Std.)', type: 'number', v: s.minRest },
    { k: 'early', label: 'Früh = Beginn vor', type: 'time', v: T(s.earlyBefore), step: 900 },
    { k: 'late', label: 'Spät = Beginn ab', type: 'time', v: T(s.lateFrom), step: 900 },
    { label: 'Mindestbesetzung (Zeitraum, Personen, Tage)', type: 'custom', node: h('div', {}, box, h('button', { class: 'btn small', onclick: () => { rules.push({ from: s.openFrom, to: s.openTo, count: 1, days: 63 }); draw(); } }, '＋ Zeitraum')), get: () => null },
  ], {
    save: (v) => {
      if (!(v.minRest >= 0 && v.minRest <= 24)) return 'Ruhezeit: bitte 0–24 Stunden eingeben.';
      if (parseT(v.openTo) <= parseT(v.openFrom)) return 'Die Öffnungszeit „bis“ muss nach „von“ liegen.';
      if (rules.some((r) => r.to <= r.from)) return 'In der Mindestbesetzung muss „bis“ nach „von“ liegen.';
      Object.assign(DB.set, { openFrom: parseT(v.openFrom), openTo: parseT(v.openTo), minRest: v.minRest, earlyBefore: parseT(v.early), lateFrom: parseT(v.late), cover: rules });
      saveDB(); render();
    },
  });
}

/* ============ Aufgaben ============ */
function tasksDialog(startDate) {
  let d = startDate;
  const body = h('div', {});
  const draw = () => {
    const list = tasksOn(d);
    body.replaceChildren(
      h('div', { class: 'bar tight' },
        h('button', { class: 'btn', onclick: () => { d = addD(d, -1); draw(); } }, '◀'),
        h('b', { class: 'dlabel' }, `${WD[dow(d)]}, ${fmtDMY(d)}`),
        h('button', { class: 'btn', onclick: () => { d = addD(d, 1); draw(); } }, '▶'),
        h('button', { class: 'btn', onclick: () => { d = today(); draw(); } }, 'Heute'),
        h('div', { class: 'spacer' }),
        h('button', { class: 'btn primary', onclick: () => editTask(null, d, draw) }, '＋ Aufgabe')),
      h('div', { class: 'list tasks' }, list.length ? list.map((t) => {
        const e = t.emp ? emp(t.emp) : null, a = t.area ? area(t.area) : null;
        return h('div', { class: 'li task' + (t.done ? ' done' : '') },
          h('input', { type: 'checkbox', checked: t.done, onchange: (ev) => {
            if (t.rec) { const k = `${t.id}|${d}`; if (ev.target.checked) DB.done[k] = 1; else delete DB.done[k]; }
            else DB.tasks.find((x) => x.id === t.id).done = ev.target.checked;
            saveDB(); draw();
          } }),
          h('div', { class: 'tbody', onclick: () => editTask(t, d, draw) },
            h('div', {}, t.time ? h('span', { class: 'time' }, t.time) : null, h('b', { class: 'ttl' }, t.title)),
            h('div', { class: 'sub' }, e ? nameLine(e, 12) : null, a ? h('span', { class: 'tag' }, h('i', { class: 'dot', style: { background: a.color } }), a.name) : null,
              t.rec ? h('span', {}, '↻ ' + WD.filter((_, k) => t.days & (1 << k)).join(' ')) : null, t.note ? h('span', {}, t.note) : null)),
          h('button', { class: 'mini', onclick: () => editTask(t, d, draw) }, '✎'));
      }) : [h('p', { class: 'msg' }, 'Keine Aufgaben für diesen Tag.')]));
  };
  draw();
  const m = modal('Aufgaben', h('div', {}, body, h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => m.close() }, 'Schließen'))), { wide: true, onClose: render });
}
function editTask(t, d, redraw) {
  const src = t ? (t.rec ? DB.tmpls.find((x) => x.id === t.id) : DB.tasks.find((x) => x.id === t.id)) : null;
  const x = src ? { title: src.title, date: t.rec ? src.from : src.date, time: src.time || '', emp: src.emp || 0, area: src.area || 0, note: src.note || '', days: t.rec ? src.days : 0 } : { title: '', date: d, time: '', emp: 0, area: 0, note: '', days: 0 };
  openForm(t ? 'Aufgabe bearbeiten' : 'Neue Aufgabe', [
    { k: 'title', label: 'Aufgabe', type: 'text', v: x.title },
    { k: 'date', label: 'Datum (bei Serie: Beginn)', type: 'date', v: x.date },
    { k: 'time', label: 'Uhrzeit (optional)', type: 'time', v: x.time },
    { k: 'emp', label: 'Zuständig (Mitarbeiter)', type: 'select', v: x.emp, opts: [[0, '– niemand –'], ...activeEmps().map((e) => [e.id, empName(e)])] },
    { k: 'area', label: 'Zuständig (Arbeitsbereich)', type: 'select', v: x.area, opts: [[0, '– keiner –'], ...DB.areas.map((a) => [a.id, a.name])] },
    { k: 'days', label: 'Wiederholen an (leer = einmalig)', type: 'days', v: x.days },
    { k: 'note', label: 'Notiz', type: 'textarea', v: x.note },
  ], {
    del: t ? () => { if (t.rec) DB.tmpls = DB.tmpls.filter((y) => y !== src); else DB.tasks = DB.tasks.filter((y) => y !== src); saveDB(); redraw(); } : null,
    save: (v) => {
      if (!v.title.trim()) return 'Bitte eine Aufgabe eingeben.';
      if (!v.date) return 'Bitte ein Datum wählen.';
      const base = { title: v.title.trim(), time: v.time, emp: +v.emp, area: +v.area, note: v.note.trim() };
      const id = src ? src.id : nid();
      const done = src && !t.rec ? src.done : false;
      if (src) { if (t.rec) DB.tmpls = DB.tmpls.filter((y) => y !== src); else DB.tasks = DB.tasks.filter((y) => y !== src); }
      if (v.days) DB.tmpls.push({ id, ...base, from: v.date, days: v.days, active: true });
      else DB.tasks.push({ id, ...base, date: v.date, done });
      saveDB(); redraw();
    },
  });
}

/* ============ Einstellungen ============ */
function settingsView() {
  const radio = (name, key, opts, after) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', {
    class: 'segbtn' + (DB.set[key] === v ? ' on' : ''), onclick: () => { DB.set[key] = v; saveDB(); if (after) after(); render(); },
  }, l)));
  const bytes = (localStorage.getItem(KEY) || '').length;
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.emps) || !Array.isArray(data.shifts)) throw new Error('Keine Dienstplaner-Datei.');
      confirmBox('Alle aktuellen Daten auf diesem iPad werden durch die Datei ersetzt. Fortfahren?', 'Ersetzen', () => { DB = Object.assign(defaults(), data); DB.set = Object.assign(defaults().set, data.set); saveDB(); applyTheme(); toast('Daten importiert.'); render(); });
    } catch (e) { toast('Import fehlgeschlagen: ' + e.message); }
    ev.target.value = '';
  } });
  const exportData = async () => {
    const name = `dienstplan-${today()}.json`;
    const blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Dienstplan-Sicherung' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
  };
  return h('div', { class: 'page narrow' },
    h('div', { class: 'bar' }, h('h1', {}, 'Einstellungen')),
    h('div', { class: 'card' }, h('h3', {}, 'Darstellung'), radio('theme', 'theme', [['auto', 'Automatisch'], ['light', '☀ Hell'], ['dark', '🌙 Dunkel']], applyTheme)),
    h('div', { class: 'card' }, h('h3', {}, 'Dienstplan: Farbe der Arbeitszeit-Balken'),
      radio('bc', 'barColor', [['employee', 'Farbe des Mitarbeiters / Arbeitsbereichs'], ['kind', 'Schichtart (Früh / Mittel / Spät)']]),
      h('p', { class: 'hint' }, 'Mitarbeiter ohne eigene Farbe und ohne Arbeitsbereich werden nach Schichtart gefärbt.')),
    h('div', { class: 'card' }, h('h3', {}, 'Gespeicherte Daten'),
      h('p', { class: 'hint' }, `Alle Daten liegen nur auf diesem iPad (im Speicher der App, ca. ${Math.max(1, Math.round(bytes / 1024))} KB). Es gibt keine Cloud und keinen Abgleich mit dem Windows-Programm.`),
      h('div', { class: 'actions left' },
        h('button', { class: 'btn primary', onclick: exportData }, '⬆ Sicherung exportieren'),
        h('button', { class: 'btn', onclick: () => fileIn.click() }, '⬇ Sicherung importieren'), fileIn,
        h('button', { class: 'btn danger', onclick: () => confirmBox('Wirklich ALLE Daten auf diesem iPad löschen?', 'Alles löschen', () => { DB = defaults(); saveDB(); toast('Alle Daten gelöscht.'); render(); }) }, 'Alle Daten löschen')),
      h('p', { class: 'hint' }, 'Tipp: Exportiere regelmäßig eine Sicherung (z. B. nach iCloud Drive speichern), falls das iPad ersetzt oder die App gelöscht wird. Mit der Sicherungsdatei kannst du die Daten auch auf einem zweiten iPad einspielen.')),
    h('div', { class: 'card' }, h('h3', {}, 'Regeln'), h('p', { class: 'hint' }, 'Öffnungszeiten, Ruhezeit und Mindestbesetzung.'), h('button', { class: 'btn', onclick: rulesDialog }, 'Regeln bearbeiten…')));
}
