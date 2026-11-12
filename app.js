'use strict';
(() => {

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const rid = () => Math.random().toString(36).slice(2, 9);

/* ---------- language ---------- */
let lang = (() => { try { return localStorage.getItem('train.lang'); } catch { return null; } })() || ((navigator.language || '').startsWith('ru') ? 'ru' : 'en');
const L = (ru, en) => lang === 'ru' ? ru : en;
const DAYS = () => L(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const ICON = {
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4Z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};
const icon = (n, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/* ---------- session kinds ---------- */
const KINDS = {
  gym:       {sport: 'gym',   min: 75,  ru: 'Зал', en: 'Gym', dRu: 'Ноги, ягодицы, кор, одна нога + верх', dEn: 'Legs, glutes, core, single-leg + upper'},
  climb:     {sport: 'climb', min: 90,  ru: 'Скалодром', en: 'Climbing', dRu: 'В основном верх', dEn: 'Mostly upper body'},
  run_easy:  {sport: 'run',   min: 45,  ru: 'Лёгкий бег', en: 'Easy run', dRu: 'Z2, можно разговаривать', dEn: 'Z2, conversational', impact: true},
  run_q:     {sport: 'run',   min: 50,  ru: 'Бег — качество', en: 'Run — quality', dRu: 'Темп или интервалы, разминка и заминка Z2', dEn: 'Tempo or intervals, Z2 warm-up and cool-down', hard: true, impact: true},
  run_long:  {sport: 'run',   min: 65,  ru: 'Длинный лёгкий бег', en: 'Long easy run', dRu: 'Z2 ровно, без ускорений', dEn: 'Steady Z2, no surges', impact: true},
  bike_q:    {sport: 'bike',  min: 80,  ru: 'Вел — качество', en: 'Bike — quality', dRu: 'Sweet spot 3×12 мин, остальное Z2', dEn: 'Sweet spot 3×12 min, rest Z2', hard: true},
  hike:      {sport: 'hike',  min: 180, weekend: true, ru: 'Поход', en: 'Hike', dRu: 'Спокойно, с набором; палки на спусках', dEn: 'Easy, with climbing; poles on descents'},
  bike_long: {sport: 'bike',  min: 210, weekend: true, ru: 'Длинный вел', en: 'Long ride', dRu: 'Z2 с набором; вставать каждые 15–20 мин', dEn: 'Z2 with climbing; stand up every 15–20 min', hard: true},
  swim:      {sport: 'swim',  min: 45,  ru: 'Плавание', en: 'Swim', dRu: 'Техника и ровно Z2', dEn: 'Drills and steady Z2'},
  bike_easy: {sport: 'bike',  min: 45,  ru: 'Лёгкая крутка', en: 'Easy spin', dRu: 'Z1–Z2, просто покрутить', dEn: 'Z1–Z2, just spin'},
  mobility:  {sport: 'walk',  min: 30,  ru: 'Прогулка и мобильность', en: 'Walk & mobility', dRu: 'Пешком или растяжка', dEn: 'Walk or stretch'},
};
const kName = k => L(KINDS[k].ru, KINDS[k].en);
const kDetail = k => L(KINDS[k].dRu, KINDS[k].dEn);
// What to do in a session: the plan's own words when it has them, unless the gate swapped the session for another.
const sDetail = s => typeof hrText === 'function' ? hrText((!s.was && s.detail) || kDetail(s.kind)) : (!s.was && s.detail) || kDetail(s.kind);
// A why that only says "it's where you wanted it" is kept for the sheet, not shown in the list.
const QUIET = '\u2063';
const whyText = w => String(w || '').replace(QUIET, '');
const whyLoud = w => !!w && !String(w).startsWith(QUIET);
const PRIORITY = ['bike_long', 'hike', 'bike_q', 'run_long', 'run_q', 'gym', 'climb', 'swim', 'run_easy', 'bike_easy', 'mobility'];
const SPORTS = {run: ['Бег', 'Running'], bike: ['Вел', 'Cycling'], swim: ['Плавание', 'Swimming'], gym: ['Зал', 'Gym'], climb: ['Скалодром', 'Climbing'], hike: ['Походы', 'Hiking']};
// Garmin calls a hike `hiking`; the server's list predates the hike sport, so it's read here.
const actSport = a => a.type === 'hiking' ? 'hike' : a.sport;

const DEFAULT_TEMPLATE = [
  {id: 't-gym', kind: 'gym', day: 0, tod: 'pm'},
  {id: 't-run1', kind: 'run_easy', day: 1, tod: 'pm'},
  {id: 't-climb', kind: 'climb', day: 2, tod: 'pm'},
  {id: 't-q', kind: 'bike_q', day: 3, tod: 'pm'},
  {id: 't-long', kind: 'bike_long', day: 5, tod: 'am', anchor: true},
  {id: 't-run2', kind: 'run_long', day: 6, tod: 'am'},
].map(x => ({min: KINDS[x.kind].min, anchor: false, note: '', ...x}));
const DEFAULT_PREFS = {wdStart: '07:00', wdEnd: '22:00', weStart: '08:00', weEnd: '20:00', evening: '18:00', buffer: 20, work: true, workStart: '09:00', workEnd: '18:00'};

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
const todayStr = () => ymd(new Date());
const toMin = hm => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + (m || 0); };
const hm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const fDur = m => m < 90 ? L(`${m} мин`, `${m} min`) : L(`${Math.floor(m / 60)} ч${m % 60 ? ' ' + (m % 60) + ' мин' : ''}`, `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`);
const fHours = m => (Math.round(m / 6) / 10).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB') + L(' ч', ' h');
function weekTitle(wk) {
  const a = parseYmd(wk), b = addDays(a, 6);
  if (lang === 'ru') return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS_RU[b.getMonth()]}` : `${a.getDate()} ${MONTHS_RU[a.getMonth()]} – ${b.getDate()} ${MONTHS_RU[b.getMonth()]}`;
  const f = d => d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
  return `${f(a)} – ${f(b)}`;
}
// Day index (0 = Monday) of today relative to a week: <0 the week is in the future, >6 it is over.
const todayIdx = wk => Math.round((parseYmd(todayStr()) - parseYmd(wk)) / 864e5);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

/* ---------- storage ---------- */
const KEY = 'train.v1';
const firstRun = (() => { try { return !localStorage.getItem(KEY); } catch { return false; } })();
let state = load();
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!d || typeof d !== 'object') d = {};
  d.v = 1;
  d.prefs = {...DEFAULT_PREFS, ...(d.prefs || {})};
  if (d.local?.acts?.list) d.local.acts.list = d.local.acts.list.map(a => ({...a, sport: actSport(a)}));
  d.template = Array.isArray(d.template) ? d.template : DEFAULT_TEMPLATE.map(x => ({...x}));
  d.weeks = d.weeks || {};
  d.checks = d.checks || {};
  d.asks = d.asks || {};
  d.chat = Array.isArray(d.chat) ? d.chat : [];
  d.plan = d.plan || null;
  d.proposals = d.proposals || {};
  for (const p of Object.values(d.proposals)) if (p.status === 'pending' && Date.now() - Date.parse(p.at) > 600e3) p.status = 'error';
  for (const m of d.chat) if (m.pending) { m.pending = false; if (!m.text && !m.actions) m.error = 'failed'; }
  d.local = d.local || {busy: {}, acts: null};
  return fill(d);
}
// Fields that came after launch. The first account had injury tracking built in (pain checks and its run rule),
// so an existing document with pain checks keeps it; an existing plan means onboarding is behind it.
function fill(d) {
  if (!d.health) d.health = Object.keys(d.checks || {}).length ? {track: true, note: '', rule: 'бег только после 48 ч на 0/10, включая сидение; вел — если сидя 0/10'} : {track: false};
  if (!d.onboard && (Object.keys(d.weeks || {}).length || d.plan)) d.onboard = {done: true, at: null};
  if (d.zones && !d.zones.v2) { const hr = {...(d.zones.hr || {})}; delete hr.easy; d.zones = {...d.zones, hr, v2: true, mode: 'auto'}; delete d.zones.seen; }
  return d;
}
const synced = () => { const {local, dirty, syncedAt, syncedUser, brief, ...rest} = state; return {...rest, brief: briefs()}; };
// What the morning message says on each of the next 14 days: the day's sessions with time and what to do (beats, not
// zone names), today's pain gate applied. Rest days are left out — no message on them.
function briefs() {
  const out = {}, t0 = parseYmd(todayStr());
  try {
    for (let i = 0; i < 14; i++) {
      const d = addDays(t0, i), date = ymd(d), wk = ymd(mondayOf(d)), di = (d.getDay() + 6) % 7, week = state.weeks?.[wk];
      if (!week || week.paused) continue;
      const ss = week.sessions.map(x => effective(wk, x)).filter(x => x.day === di && x.status === 'planned').sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
      if (!ss.length) continue;
      const head = ss.map(x => `${kName(x.kind)}, ${fDur(x.min)}${x.start != null ? L(' в ', ' at ') + hm(x.start) : ''}`).join(' · ');
      let body = ss.map(x => [sDetail(x), x.caution].filter(Boolean).join('. ')).join(' · ');
      if (state.health?.track) body += L(' · Отметь, как сегодня с болью.', ' · Log how the pain is today.');
      body += window.TrainFood?.briefLine(di) || '';
      out[date] = {t: L('Сегодня: ', 'Today: ') + head, b: body.slice(0, 240)};
    }
  } catch (e) { console.warn('brief', e); }
  return out;
}
let rev = 0; // bumps on every local change, so a change made while a push is in flight stays dirty
function persist() {
  state.dirty = true; rev++;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast(L('Не удалось сохранить: память заполнена', 'Couldn’t save: storage is full')); }
  scheduleSync();
}
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

/* ---------- calendar: busy blocks per day ---------- */
function dayEvents(wk, i) {
  const busy = state.local.busy[wk]?.events || [];
  const day = addDays(parseYmd(wk), i), next = addDays(day, 1);
  const out = [];
  for (const e of busy) {
    if (e.allDay) continue;
    const s = new Date(e.s), en = new Date(e.e);
    if (en <= day || s >= next) continue;
    out.push({s: Math.max(0, Math.round((s - day) / 6e4)), e: Math.min(1440, Math.round((en - day) / 6e4)), title: e.title, free: e.free});
  }
  return out.sort((a, b) => a.s - b.s);
}
function allDayEvents(wk, i) {
  const ds = ymd(addDays(parseYmd(wk), i));
  return (state.local.busy[wk]?.events || []).filter(e => e.allDay && e.s.slice(0, 10) <= ds && ds < e.e.slice(0, 10));
}
function blocks(wk, i) {
  const p = state.prefs, out = dayEvents(wk, i).filter(e => !e.free);
  if (p.work && i < 5) out.push({s: toMin(p.workStart), e: toMin(p.workEnd), title: L('Работа', 'Work'), work: true});
  for (const b of p.blocks || []) if (b.days.includes(i) && toMin(b.to) > toMin(b.from)) out.push({s: toMin(b.from), e: toMin(b.to), title: b.label || L('Защищённое время', 'Protected time'), own: true});
  return out;
}
// Free windows [start, end] in minutes for day i, after work hours, calendar, buffers and "now".
function windows(wk, i, week) {
  const ti = todayIdx(wk), p = state.prefs;
  if (i < ti || (week.away || []).includes(i)) return [];
  let s = toMin(i >= 5 ? p.weStart : p.wdStart), e = toMin(i >= 5 ? p.weEnd : p.wdEnd);
  if (i === ti) s = Math.max(s, Math.ceil((nowMin() + 15) / 15) * 15);
  let wins = [[s, e]];
  for (const b of blocks(wk, i)) {
    const bs = b.s - (b.work || b.own ? 0 : p.buffer), be = b.e + (b.work ? 15 : b.own ? 0 : p.buffer);
    wins = wins.flatMap(([a, z]) => be <= a || bs >= z ? [[a, z]] : [[a, bs], [be, z]].filter(([x, y]) => y - x >= 20));
  }
  return wins.filter(([a, z]) => z - a >= 20);
}
function pickSlot(wins, min, tod) {
  const fits = wins.filter(([a, z]) => z - a >= min);
  if (!fits.length) return null;
  const up = x => Math.ceil(x / 15) * 15, down = x => Math.floor(x / 15) * 15;
  if (tod === 'pm') {
    const ev = toMin(state.prefs.evening);
    for (const [a, z] of fits) { const st = up(Math.max(a, ev)); if (st + min <= z) return st; }
    const [a, z] = fits[fits.length - 1]; const st = down(z - min); return st >= a ? st : a;
  }
  const [a, z] = fits[0]; const st = up(a); return st + min <= z ? st : a;
}
const slotFree = (wins, start, min) => start != null && wins.some(([a, z]) => a <= start && start + min <= z);

/* ---------- planner: constraints between sessions ---------- */
const active = s => s.day != null && (s.status === 'planned' || s.status === 'done');
function conflict(kind, day, others) {
  const K = KINDS[kind];
  if (others.some(o => active(o) && o.day === day)) return 'busyDay';
  if (K.weekend && day < 5) return 'weekend';
  for (const o of others) {
    if (!active(o)) continue;
    const O = KINDS[o.kind], gap = Math.abs(o.day - day);
    if (K.hard && O.hard && gap === 1) return 'hardRow';
    if (kind === 'gym' && O.hard && o.day === day + 1) return 'gymBefore';
    if (K.hard && o.kind === 'gym' && o.day === day - 1) return 'gymBefore';
    if (K.impact && O.impact && gap === 1) return 'runRow';
  }
  return null;
}
const reasonText = (r, d) => ({
  busyDay: L(`в ${d} уже есть тренировка`, `${d} already has a session`),
  hardRow: L('две тяжёлые подряд', 'two hard days in a row'),
  gymBefore: L('ноги в зале за день до тяжёлой', 'leg day right before a hard one'),
  runRow: L('бег два дня подряд — меньше ударной нагрузки', 'running two days in a row — easy on impact'),
  past: L(`${d} уже прошёл`, `${d} is over`),
  away: L(`${d} — поездка`, `${d} — away`),
  weekend: L('длинная — только в выходные', 'long ones are weekend-only'),
}[r] || r);

// Main blocker on a day: the longest calendar event in the part of the day the session prefers.
function blockerOn(wk, i, tod) {
  const ev = toMin(state.prefs.evening);
  const list = blocks(wk, i).filter(b => !b.work && (tod === 'pm' ? b.e > ev : tod === 'am' ? b.s < 12 * 60 : true));
  return list.sort((a, b) => (b.e - b.s) - (a.e - a.s))[0] || null;
}
function noWindowReason(wk, i, s) {
  const d = DAYS()[i], b = blockerOn(wk, i, s.tod);
  if (b) return L(`в ${d} ${s.tod === 'pm' ? 'вечером ' : s.tod === 'am' ? 'утром ' : ''}«${b.title}»`, `${d}${s.tod === 'pm' ? ' evening' : s.tod === 'am' ? ' morning' : ''}: “${b.title}”`);
  return L(`в ${d} нет окна на ${fDur(s.min)}`, `no ${fDur(s.min)} window on ${d}`);
}

// Place every movable session. Stability first: whatever still fits where it is stays put; only displaced sessions search,
// trying their preferred day, then neighbours; then a shorter version; then soft rules relaxed (with a heads-up).
function place(wk, week, opts = {}) {
  const ti = todayIdx(wk), D = DAYS();
  const movable = s => s.status === 'planned' && !s.locked && (s.day == null || s.day >= ti);
  const fixed = week.sessions.filter(s => !movable(s));
  const todo = week.sessions.filter(movable).sort((a, b) => (b.anchor - a.anchor) || PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  for (const s of todo) { s._from = opts.fresh ? null : s.day; s._start = s.start; s.day = null; }
  const placed = [...fixed], rest = [];
  for (const s of todo) {
    if (s._from != null && s._from >= ti && conflict(s.kind, s._from, placed) !== 'busyDay' && slotFree(windows(wk, s._from, week), s._start, s.min)) { s.day = s._from; s.start = s._start; placed.push(s); }
    else rest.push(s);
  }
  const evening = toMin(state.prefs.evening);
  const todWord = st => st >= evening ? L('вечером', 'in the evening') : st < 12 * 60 ? L('утром', 'in the morning') : L('днём', 'midday');
  for (const s of rest) {
    const order = [];
    const add = d => { if (d >= 0 && d <= 6 && d >= ti && !order.includes(d)) order.push(d); };
    if (s._from != null) add(s._from);
    add(s.pref);
    for (let k = 1; k < 7; k++) { add(s.pref + k); add(s.pref - k); }
    const firstFail = {};
    let done = false;
    for (const pass of ['strict', 'short', 'gymBefore', 'runRow', 'hardRow']) {
      for (const d of order) {
        const c = conflict(s.kind, d, placed);
        if (c) firstFail[d] = firstFail[d] || c;
        if (c && c !== pass) continue;
        const wins = windows(wk, d, week);
        let min = s.min, start;
        if (pass === 'short') {
          const floor = Math.max(30, Math.round(s.min * 0.6));
          const best = wins.slice().sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0];
          if (!best || best[1] - best[0] < floor) continue;
          min = Math.min(s.min, Math.floor((best[1] - best[0]) / 5) * 5); start = best[0];
        } else {
          start = pickSlot(wins, min, s.tod);
          if (start == null) { firstFail[d] = firstFail[d] || 'noWin'; continue; }
        }
        s.day = d; s.start = start;
        if (min !== s.min) { s.short = s.short || s.min; s.min = min; }
        const p = s.pref, offTod = (s.tod === 'pm' && start < evening) || (s.tod === 'am' && start >= 12 * 60);
        const prefWhy = () => {
          if (p < ti) return reasonText('past', D[p]);
          if ((week.away || []).includes(p)) return reasonText('away', D[p]);
          const f = firstFail[p];
          return f && f !== 'noWin' ? reasonText(f, D[p]) : noWindowReason(wk, p, s);
        };
        if (s.anchor && d === p && !offTod) s.why = QUIET + L(`Якорь недели${s.note ? ' — ' + s.note : ''}: держу как есть`, `Anchor of the week${s.note ? ' — ' + s.note : ''}: kept as is`);
        else if (pass === 'short') s.why = L(`Полного окна на ${fDur(s.short)} нет — сократил до ${fDur(min)}`, `No full ${fDur(s.short)} window — cut to ${fDur(min)}`);
        else if (c) s.why = L(`${prefWhy()} → ${D[d]} ${todWord(start)}. Заметь: ${reasonText(c, D[d])}`, `${prefWhy()} → ${D[d]} ${todWord(start)}. Heads-up: ${reasonText(c, D[d])}`);
        else if (d === p || d === s._from) s.why = offTod
          ? `${noWindowReason(wk, d, s)} → ${todWord(start)} ${hm(start)}`
          : QUIET + L(`${D[d]}: ${s.tod === 'pm' ? 'вечер свободен' : s.tod === 'am' ? 'утро свободно' : 'есть окно'}`, `${D[d]}: ${s.tod === 'pm' ? 'evening is free' : s.tod === 'am' ? 'morning is free' : 'there’s a window'}`);
        else s.why = `${prefWhy()} → ${D[d]} ${todWord(start)}`;
        placed.push(s); done = true; break;
      }
      if (done) break;
    }
    if (!done) { s.day = null; s.start = null; s.why = L(`До конца недели нет окна на ${fDur(s.min)}`, `No ${fDur(s.min)} window left this week`); }
  }
  for (const s of week.sessions) { delete s._from; delete s._start; }
}

/* ---------- safety rules the planner applies, not just shows ---------- */
// Rule 69 (HARD): no run longer than the longest of the last 30 days + 10%. Rule 71: a week's planned time within +20%
// of the 4 finished weeks before it; after a break (state.resume), rule 34's step back. Sessions the person locked
// (added or moved by hand) are counted but never cut. Easy volume is cut first, key sessions last (rule 31).
const RAMP = days => days <= 7 ? null : days <= 14 ? [0.9] : days <= 28 ? [0.7, 0.85] : [0.6, 0.7, 0.8, 0.9];
function rampFor(wk) {
  const r = state.resume; if (!r) return null;
  const steps = RAMP(r.days); if (!steps) return null;
  const i = weeksFrom(ymd(mondayOf(parseYmd(r.at))), wk);
  return i >= 0 && i < steps.length ? {factor: steps[i], week: i + 1, of: steps.length, easyOnly: i === 0 && r.days > 7} : null;
}
function guard(wk, week) {
  const ti = todayIdx(wk), D = DAYS(), lines = [];
  const ahead = week.sessions.filter(s => s.status === 'planned' && (s.day == null || s.day >= ti) && !s.locked);
  // Coming back after a break: the first week of the ramp is easy only.
  const ramp = rampFor(wk);
  if (ramp?.easyOnly) for (const s of ahead) if (KINDS[s.kind].hard) {
    const old = s.kind; s.kind = KINDS[s.kind].sport === 'run' ? 'run_easy' : 'bike_easy'; delete s.detail; s.key = false;
    lines.push(L(`${kName(old)} → ${kName(s.kind).toLowerCase()}: первая неделя после паузы — без интенсивности (правило 34)`, `${kName(old)} → ${kName(s.kind).toLowerCase()}: first week back — no intensity (rule 34)`));
  }
  // Rule 69: the run cap from Garmin.
  const lr = longestRun30();
  if (lr >= 15) {
    const cap = Math.max(20, Math.floor(lr * 1.1 / 5) * 5);
    for (const s of ahead) if (KINDS[s.kind].sport === 'run' && s.min > cap) {
      lines.push(L(`${kName(s.kind)}${s.day != null ? ' (' + D[s.day] + ')' : ''}: ${fDur(s.min)} → ${fDur(cap)} — не длиннее самой длинной пробежки за 30 дней (${fDur(lr)}) +10% (правило 69)`, `${kName(s.kind)}${s.day != null ? ' (' + D[s.day] + ')' : ''}: ${fDur(s.min)} → ${fDur(cap)} — no longer than your longest run in 30 days (${fDur(lr)}) + 10% (rule 69)`));
      s.min = cap; s.capNote = L(`Ограничено правилом 69: самая длинная пробежка за 30 дней — ${fDur(lr)}`, `Capped by rule 69: longest run in 30 days was ${fDur(lr)}`);
    }
  }
  // Rule 71 (and the ramp): the week's time against the 4 finished weeks before it.
  const cur = ymd(mondayOf(new Date())), ref = wk < cur ? wk : cur, from = state.local.acts?.from;
  if (from && from <= ymd(addDays(parseYmd(ref), -28))) {
    const hrs = [1, 2, 3, 4].map(k => actualHours(ymd(addDays(parseYmd(ref), -7 * k)))), avg = hrs.reduce((t, x) => t + x, 0) / 4;
    // Only a real base counts: every one of the 4 weeks has training in it. Sparse history usually means the watch
    // wasn't recording yet, not that the person doesn't train — then rule 71 stays out of it (rule 69 still applies).
    if (avg >= 0.5 && hrs.every(x => x > 0)) {
      const capMin = Math.round(avg * 60 * (ramp ? ramp.factor : 1.2));
      const fixedMin = week.sessions.filter(s => s.status === 'done' || (s.status === 'planned' && s.locked) || (s.status === 'planned' && s.day != null && s.day < ti)).reduce((t, s) => t + (s.act?.min ?? s.min), 0);
      let over = fixedMin + ahead.reduce((t, s) => t + s.min, 0) - capMin;
      if (over > 15) {
        const order = [...ahead.filter(s => !isKey(s)), ...ahead.filter(isKey)].sort((a, b) => (isKey(a) - isKey(b)) || b.min - a.min);
        for (const s of order) {
          if (over <= 0) break;
          const floor = isKey(s) ? Math.round(s.min * 0.8 / 5) * 5 : s.kind === 'gym' || s.kind === 'climb' ? 45 : 30, cut = Math.min(over, s.min - floor);
          if (cut >= 5) { s.min -= Math.floor(cut / 5) * 5; over -= Math.floor(cut / 5) * 5; s.capNote = s.capNote || (ramp ? L(`Возвращение после паузы: неделя ${ramp.week} из ${ramp.of}`, `Coming back: week ${ramp.week} of ${ramp.of}`) : L('Сокращено, чтобы неделя не выросла больше чем на 20% (правило 71)', 'Shortened so the week grows no more than 20% (rule 71)')); }
        }
        lines.push(ramp
          ? L(`Возвращение после паузы ${state.resume.days} дн.: неделя ${ramp.week} из ${ramp.of}, объём ~${fHours(capMin)} — ${Math.round(ramp.factor * 100)}% от привычных ${fHours(avg * 60)} (правило 34)`, `Back after ${state.resume.days} days off: week ${ramp.week} of ${ramp.of}, about ${fHours(capMin)} — ${Math.round(ramp.factor * 100)}% of your usual ${fHours(avg * 60)} (rule 34)`)
          : L(`Неделя сокращена до ~${fHours(capMin)}: за 4 недели в среднем ${fHours(avg * 60)}, больше +20% за раз — лишний риск (правило 71). Сначала урезаны лёгкие тренировки, главные — в последнюю очередь`, `Week trimmed to about ${fHours(capMin)}: your 4-week average is ${fHours(avg * 60)}, and more than +20% at once is extra risk (rule 71). Easy sessions were cut first, key ones last`));
      }
    }
  }
  week.guarded = !!from;
  return lines;
}
// Runs the guard as its own change, so «Отменить» brings back the unguarded week.
function guardWeek(wk, week, silent) {
  const before = snapshot(week), lines = guard(wk, week);
  if (!lines.length) return false;
  place(wk, week);
  commit(wk, week, before, L('правила безопасности', 'safety rules'), lines, {silent});
  return true;
}

// Protected time: family mornings, a weekly commitment — busy for the planner like work, without the calendar.
function blocksHTML() {
  const D = DAYS(), list = state.prefs.blocks || [];
  return `<div class="blocks">${list.map(b => `<div class="block-row"><div class="block-top"><input data-block="${b.id}" data-f="label" value="${esc(b.label || '')}" aria-label="${L('Название', 'Name')}"><button class="nav-btn" data-a="block-del" data-id="${b.id}" style="color:var(--danger)">${L('Убрать', 'Remove')}</button></div>
      <div class="chips-row wrap">${D.map((d, i) => `<button class="chip" data-a="block-day" data-id="${b.id}" data-d="${i}" aria-pressed="${b.days.includes(i)}">${d}</button>`).join('')}</div>
      <div class="wiz-row"><label class="field">${L('С', 'From')}<input data-block="${b.id}" data-f="from" type="time" value="${esc(b.from)}"></label><label class="field">${L('до', 'to')}<input data-block="${b.id}" data-f="to" type="time" value="${esc(b.to)}"></label></div></div>`).join('')}
    <button class="btn link" data-a="block-add" style="justify-content:flex-start">${L('+ Защищённое время (семья, дети, обязательства)', '+ Protected time (family, kids, commitments)')}</button></div>`;
}

/* ---------- pause and coming back ---------- */
const PAUSE_WHY = {injury: ['травма', 'injury'], ill: ['болезнь', 'illness'], life: ['жизнь: работа, семья, поездки', 'life: work, family, travel']};
function pausePlan(reason) {
  const wk = ymd(mondayOf(new Date())), week = state.weeks[wk], ti = todayIdx(wk);
  state.pause = {from: todayStr(), reason};
  delete state.resume;
  if (week) {
    const before = snapshot(week);
    for (const s of week.sessions) if (s.status === 'planned' && (s.day == null || s.day >= ti)) { s.status = 'dropped'; s.why = L('Пауза', 'Paused'); }
    commit(wk, week, before, L('пауза', 'pause'), [L(`Пауза: ${PAUSE_WHY[reason][0]}. Тренировки до конца недели убраны, новые недели не собираются. Вернёшься — объём поднимется постепенно`, `Paused: ${PAUSE_WHY[reason][1]}. Sessions for the rest of the week are off, no new weeks. When you’re back, volume comes back gradually`)]);
  } else persist();
}
function resumePlan() {
  const p = state.pause; if (!p) return;
  const days = Math.max(1, Math.round((parseYmd(todayStr()) - parseYmd(p.from)) / 864e5));
  state.resume = {at: todayStr(), days, reason: p.reason};
  delete state.pause;
  const wk = ymd(mondayOf(new Date())), ti = todayIdx(wk), week = state.weeks[wk] || ensureWeek(wk);
  if (!week) return persist();
  const before = snapshot(week);
  week.sessions = week.sessions.filter(s => !(s.status === 'dropped' && s.why === L('Пауза', 'Paused')));
  if (!week.sessions.some(s => s.status === 'planned' && s.day >= ti)) week.sessions.push(...templateFor().filter(t => t.day >= ti).map(newSession));
  const lines = [L(`С возвращением: пауза ${days} дн.`, `Welcome back: ${days} days off`)];
  lines.push(days <= 7 ? L('До недели — продолжаем как было (правило 34)', 'Up to a week off — carry on as before (rule 34)')
    : days <= 14 ? L('8–14 дней — первые дни легко, объём чуть ниже (правило 34)', '8–14 days — easy first days, a bit less volume (rule 34)')
    : days <= 28 ? L('15–28 дней — шаг назад на 2 недели: 70% и 85% объёма (правило 34)', '15–28 days — two weeks stepped back: 70% then 85% volume (rule 34)')
    : L('Больше 4 недель — 4 недели набора: 60→90% объёма. Стоит пересобрать план (правило 34)', 'Over 4 weeks — a 4-week rebuild: 60→90% volume. Worth rebuilding the plan (rule 34)'));
  if (p.reason === 'injury') lines.push(L('Бег — только без боли при ходьбе 30–45 мин и без боли в покое; сначала объём, интенсивность последней (правило 47)', 'Running only once 30–45 min walks are pain-free and there’s no pain at rest; volume before intensity (rule 47)'));
  lines.push(...guard(wk, week));
  place(wk, week);
  commit(wk, week, before, L('возвращение', 'back'), lines);
}
function pauseSheet() {
  openSheet(`<div class="sheet-head"><span class="wiz-title">${L('Пауза', 'Pause')}</span><button class="nav-btn" data-a="close-sheet">${L('Отмена', 'Cancel')}</button></div><div class="sheet-scroll wiz">
    <h2 class="wiz-h">${L('Поставить программу на паузу?', 'Pause the program?')}</h2>
    <p class="hint">${L('Тренировки до конца недели уберу, новые недели и выходные предложения не будут собираться. Когда вернёшься — объём поднимется постепенно, по сроку паузы (правило 34).', 'I’ll clear the rest of this week and stop building new weeks and weekend proposals. When you’re back, volume returns step by step, by how long you were off (rule 34).')}</p>
    <div class="opts" style="padding-top:8px">${Object.entries(PAUSE_WHY).map(([k, v]) => `<button class="opt" data-a="pause-go" data-r="${k}"><b>${esc(L(v[0][0].toUpperCase() + v[0].slice(1), v[1][0].toUpperCase() + v[1].slice(1)))}</b></button>`).join('')}</div></div>`);
}

/* ---------- how a session felt (session RPE) ---------- */
// One tap after a session: RPE 1–10 × minutes is load in the same currency for every sport, gym and climbing included (rule 74).
const sLoad = s => s.rpe ? s.rpe * (s.act?.min ?? s.min) : 0;
function rpeDue(wk) {
  const week = state.weeks[wk]; if (!week) return null;
  const ti = todayIdx(wk);
  return week.sessions.filter(s => s.status === 'done' && !s.rpe && s.day != null && s.day <= ti && s.day >= ti - 2).sort((a, b) => b.day - a.day)[0] || null;
}
function rpeSheet(id) {
  const week = state.weeks[view.wk], s = week?.sessions.find(x => x.id === id); if (!s) return;
  const words = L(['', 'очень легко', '', 'легко', '', 'умеренно', '', 'тяжело', '', 'очень тяжело', 'максимум'], ['', 'very easy', '', 'easy', '', 'moderate', '', 'hard', '', 'very hard', 'max']);
  openSheet(`<div class="sheet-head"><span class="wiz-title">${esc(kName(s.kind))}</span><button class="nav-btn" data-a="close-sheet">${L('Позже', 'Later')}</button></div><div class="sheet-scroll wiz">
    <h2 class="wiz-h">${L('Насколько тяжело было в целом?', 'How hard was it overall?')}</h2>
    <p class="hint">${L('Оценка через полчаса после тренировки, по шкале 1–10. Из неё и минут считается нагрузка — одинаково для бега, вела, зала и стены.', 'Rate the whole session about 30 min after, 1–10. With the minutes it gives load — the same for running, riding, gym and climbing.')}</p>
    <div class="rpe-grid">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="rpe-btn" data-a="rpe-set" data-id="${id}" data-n="${n}" aria-pressed="${s.rpe === n}"><b class="num">${n}</b>${words[n] ? `<span>${words[n]}</span>` : ''}</button>`).join('')}</div></div>`);
}

function newSession(t) {
  return {id: rid(), tid: t.id, kind: t.kind, min: t.min, pref: t.day, tod: t.tod, anchor: !!t.anchor, note: t.note || '', day: null, start: null, status: 'planned', why: '', ...(t.detail ? {detail: t.detail} : {}), ...(t.key ? {key: true} : {})};
}
function templateFor() {
  const out = [], seen = {};
  for (const t of state.template) {
    const sp = KINDS[t.kind].sport, a = state.asks[sp];
    if (a?.c === 'drop') continue;
    if (a?.c === 'one' && seen[sp]) continue;
    seen[sp] = true; out.push(t);
  }
  return out;
}
function ensureWeek(wk) {
  if (state.weeks[wk]) return state.weeks[wk];
  if (todayIdx(wk) > 6) return null; // past weeks are not planned retroactively
  // A week first opened mid-way starts from today: days already gone are not back-filled.
  const ti = todayIdx(wk);
  const week = {sessions: state.pause ? [] : templateFor().filter(t => t.day >= ti).map(newSession), log: [], away: [], cal: {}, busySeen: !!state.local.busy[wk], ...(state.pause ? {paused: true} : {})};
  place(wk, week, {fresh: true});
  if (!state.pause) {
    const before = snapshot(week), gl = guard(wk, week);
    if (gl.length) { place(wk, week); week.log.unshift({at: new Date().toISOString(), text: L('правила безопасности', 'safety rules'), lines: gl, snap: before}); }
  }
  state.weeks[wk] = week; persist();
  return week;
}

/* ---------- gates: pain and readiness ---------- */
function latestCheck() {
  const days = Object.keys(state.checks).filter(d => d <= todayStr()).sort();
  const d = days[days.length - 1];
  if (!d || (parseYmd(todayStr()) - parseYmd(d)) / 864e5 > 2) return null;
  return {date: d, ...state.checks[d]};
}
function gate() {
  const c = latestCheck();
  if (!c) return {known: false};
  const max = Math.max(c.sit, c.walk);
  const nonZero = Object.keys(state.checks).filter(d => { const x = state.checks[d]; return x.sit > 0 || x.walk > 0; }).sort().pop() || null;
  return {
    known: true, c, max, stop: max >= 2, doctor: c.walk >= 1 || c.rest,
    bikeOk: c.sit === 0 && max < 2,
    runOkOn: date => max === 0 && !c.rest && (!nonZero || (parseYmd(date) - parseYmd(nonZero)) / 864e5 >= 2),
  };
}
// What a planned session turns into today and later, given the latest pain check. A view, never stored.
function effective(wk, s) {
  const ti = todayIdx(wk);
  if (s.status !== 'planned' || s.day == null || s.day < ti) return s;
  const g = gate();
  if (!g.known) return s;
  const date = ymd(addDays(parseYmd(wk), s.day)), sport = KINDS[s.kind].sport;
  // Today's check decides today and tomorrow; further out it is only a heads-up, since pain changes day to day.
  const ahead = (parseYmd(date) - parseYmd(todayStr())) / 864e5;
  if (ahead > 1) {
    if (g.max > 0 && (sport === 'run' || sport === 'bike')) return {...s, caution: sport === 'run' ? L('Бег — если к этому дню будет 48 ч на 0/10', 'Run only after 48 h at 0/10 by then') : L('Вел — если сидя будет 0/10', 'Ride only if sitting is 0/10')};
    return s;
  }
  const swap = (kind, min, why) => ({...s, kind, min, was: s.kind, why});
  if (g.stop && (sport === 'run' || sport === 'bike' || sport === 'climb'))
    return swap('mobility', 30, L(`Боль ${g.max}/10 — без бега, вела и стены. Напиши физио или травматологу`, `Pain ${g.max}/10 — no running, riding or climbing. Message your physio`));
  if (sport === 'run' && !g.runOkOn(date))
    return g.bikeOk
      ? swap('bike_easy', Math.min(s.min, 60), L(`Бег вернётся после 48 ч на 0/10 (сейчас ${g.max}/10) — пока крутка`, `Running returns after 48 h at 0/10 (now ${g.max}/10) — easy spin instead`))
      : swap('mobility', 30, L(`Бег и вел подождут: сидя ${g.c.sit}/10`, `Running and riding wait: sitting ${g.c.sit}/10`));
  if (sport === 'hike' && (g.stop || g.c.walk > 0 || g.c.rest))
    return swap('mobility', 30, L(`При ходьбе ${g.c.walk}/10 — поход подождёт`, `Walking ${g.c.walk}/10 — the hike can wait`));
  if (sport === 'bike' && !g.bikeOk)
    return swap('mobility', 40, L(`Сидя ${g.c.sit}/10 — седло подождёт`, `Sitting ${g.c.sit}/10 — the saddle can wait`));
  if (g.max > 0 && sport === 'gym') return {...s, caution: L('Без глубоких приседов и выпадов под весом', 'No deep squats or lunges under load')};
  if (g.max > 0 && sport === 'climb') return {...s, caution: L('Слезать, не спрыгивать; без хил-хуков', 'Climb down, don’t jump; no heel hooks')};
  return s;
}

/* ---------- Garmin: mark done, learn extras ---------- */
function weekActs(wk) {
  const acts = state.local.acts?.list || [], a = wk, b = ymd(addDays(parseYmd(wk), 7));
  return acts.filter(x => x.start.slice(0, 10) >= a && x.start.slice(0, 10) < b);
}
function matchActs(wk, week) {
  const lines = [];
  for (const a of weekActs(wk).sort((x, y) => x.start.localeCompare(y.start))) {
    if (week.sessions.some(s => s.act?.id === a.id)) continue;
    const day = Math.round((parseYmd(a.start.slice(0, 10)) - parseYmd(wk)) / 864e5);
    const cands = week.sessions.filter(s => s.status === 'planned' && !s.act && (KINDS[effective(wk, s).kind].sport === a.sport || KINDS[s.kind].sport === a.sport) && (s.day == null || Math.abs(s.day - day) <= 2));
    cands.sort((x, y) => Math.abs((x.day ?? 9) - day) - Math.abs((y.day ?? 9) - day));
    const s = cands[0];
    if (!s) continue;
    const D = DAYS(), was = s.day;
    s.status = 'done'; s.act = {id: a.id, min: a.min, km: a.km, start: a.start.slice(11, 16)};
    s.why = L(`Из Garmin: ${a.name || a.type}`, `From Garmin: ${a.name || a.type}`);
    s.day = day; s.start = toMin(a.start.slice(11, 16));
    lines.push(was === day || was == null
      ? L(`${kName(s.kind)} в ${D[day]} — засчитал из Garmin (${fDur(a.min)})`, `${kName(s.kind)} on ${D[day]} — counted from Garmin (${fDur(a.min)})`)
      : L(`${kName(s.kind)}: сделал в ${D[day]} вместо ${D[was]} — засчитал`, `${kName(s.kind)}: done on ${D[day]} instead of ${D[was]} — counted`));
  }
  return lines;
}
const extras = (wk, week) => weekActs(wk).filter(a => !week.sessions.some(s => s.act?.id === a.id));
const trainingSport = sp => sp === 'run' || sp === 'bike' || sp === 'gym' || sp === 'climb' || sp === 'hike' || sp === 'swim';

/* ---------- change log ---------- */
function snapshot(week) { return JSON.stringify({sessions: week.sessions, away: week.away, sick: week.sick, planBy: week.planBy || null, planNote: week.planNote || null}); }
function diffLines(wk, before, week) {
  const D = DAYS(), why = s => whyText(s.why).replace(/ → [^.]*/, ''), prev = new Map(JSON.parse(before).sessions.map(s => [s.id, s])), out = [];
  for (const s of week.sessions) {
    const p = prev.get(s.id);
    if (!p || (s.status === 'done' && p.status !== 'done')) continue;
    if (p.day !== s.day || p.start !== s.start || p.min !== s.min) {
      if (s.day == null) out.push(L(`${kName(s.kind)}: убрал из недели — ${why(s)}`, `${kName(s.kind)}: off this week — ${why(s)}`));
      else if (p.day !== s.day) out.push(L(`${kName(s.kind)}: ${p.day != null ? D[p.day] : '—'} → ${D[s.day]} ${hm(s.start)} — ${why(s)}`, `${kName(s.kind)}: ${p.day != null ? D[p.day] : '—'} → ${D[s.day]} ${hm(s.start)} — ${why(s)}`));
      else if (p.min !== s.min) out.push(L(`${kName(s.kind)}: ${fDur(p.min)} → ${fDur(s.min)}`, `${kName(s.kind)}: ${fDur(p.min)} → ${fDur(s.min)}`));
      else out.push(L(`${kName(s.kind)}: ${D[s.day]} ${hm(p.start)} → ${hm(s.start)} — ${why(s)}`, `${kName(s.kind)}: ${D[s.day]} ${hm(p.start)} → ${hm(s.start)} — ${why(s)}`));
    }
  }
  return out;
}
let lastChange = null; // {wk, text, lines, undo}
function commit(wk, week, before, text, lines, opts = {}) {
  const extra = diffLines(wk, before, week).filter(l => !lines.some(x => x.split(' — ')[0] === l.split(' — ')[0]));
  const all = [...lines, ...extra];
  week.log.unshift({at: new Date().toISOString(), text, lines: all, snap: before});
  week.log = week.log.slice(0, 30);
  persist();
  if (capture) { capture.push(...all); return; }
  if (!opts.silent) lastChange = {wk, text, lines: all};
  render();
}

/* ---------- commands in plain words ---------- */
const norm = s => s.toLowerCase().replace(/ё/g, 'е');
const DAY_WORDS = [
  [0, ['пн'], ['понедельн', 'mon']], [1, ['вт'], ['вторн', 'tue']], [2, ['ср'], ['сред', 'среду', 'wed']], [3, ['чт'], ['четверг', 'thu']],
  [4, ['пт'], ['пятниц', 'fri']], [5, ['сб'], ['суббот', 'sat']], [6, ['вс'], ['воскрес', 'sun']],
];
function dayOfWord(w, wk) {
  const ti = todayIdx(wk);
  if (w === 'сегодня' || w === 'today' || w === 'tonight') return ti;
  if (w === 'завтра' || w === 'tomorrow') return ti + 1;
  if (w === 'послезавтра') return ti + 2;
  if (w === 'вчера' || w === 'yesterday') return ti - 1;
  for (const [i, exact, pre] of DAY_WORDS) if (exact.includes(w) || pre.some(p => w.startsWith(p))) return i;
  return null;
}
const has = (words, pres) => words.some(w => pres.some(p => w.startsWith(p)));
function parse(text, wk) {
  const t = norm(text).trim(), words = t.split(/[^a-zа-я0-9:]+/).filter(Boolean);
  const days = [];
  words.forEach((w, i) => { const d = dayOfWord(w, wk); if (d != null) days.push({d, prev: words[i - 1] || ''}); });
  let sport = null, kind = null;
  if (has(words, ['бег', 'пробеж', 'run', 'jog'])) sport = 'run';
  if (has(words, ['вел', 'велик', 'вело', 'bike', 'ride', 'cycl', 'крутк', 'заезд', 'покат'])) sport = 'bike';
  if (has(words, ['зал', 'gym', 'силов', 'strength'])) sport = 'gym';
  if (has(words, ['скал', 'лазан', 'climb', 'boulder', 'стен'])) sport = 'climb';
  if (has(words, ['прогул', 'мобил', 'растяж', 'walk', 'stretch'])) sport = 'walk';
  if (has(words, ['поход', 'хайк', 'hike', 'hiking', 'горы', 'горах', 'трек'])) sport = 'hike';
  if (has(words, ['плав', 'бассейн', 'swim', 'pool'])) sport = 'swim';
  const long = has(words, ['длин', 'long']);
  if (has(words, ['качеств', 'интервал', 'quality', 'interval', 'sweet', 'темпов'])) { if (sport === 'run') kind = 'run_q'; else { sport = 'bike'; kind = 'bike_q'; } }
  let minutes = null;
  const mm = t.match(/(\d+)\s*(мин|min|м(?![а-я])|m\b)/), hh = t.match(/(\d+(?:[.,]\d)?)\s*(час|ч(?![а-я])|h\b|hour)/);
  if (mm) minutes = +mm[1];
  else if (hh) minutes = Math.round(parseFloat(hh[1].replace(',', '.')) * 60);
  else if (t.includes('полчаса') || t.includes('half an hour')) minutes = 30;
  else if (t.includes('полтора')) minutes = 90;
  else if (/(^|\s)(час|hour)(\s|$)/.test(t)) minutes = 60;
  let at = null;
  const tm = t.match(/(\d{1,2})[:.](\d{2})/) || t.match(/(?:^|\s)(?:в|at)\s*(\d{1,2})(?!\s*(?:мин|ч|час|min|h))(?:\s|$)/);
  if (tm) at = +tm[1] * 60 + (+tm[2] || 0);
  const tod = has(words, ['утр', 'morning']) ? 'am' : has(words, ['вечер', 'evening', 'tonight']) ? 'pm' : null;
  let intent = null;
  if (/^(отмени|отменить|верни|undo)( последнее| это| last)?$/.test(t)) intent = 'undo';
  else if (has(words, ['пауз', 'pause'])) intent = 'pause';
  else if (/^(я )?(вернулся|вернулась|возвращаюсь|снова тренируюсь|продолжаю|resume|i'?m back)/.test(t)) intent = 'resume';
  else if (has(words, ['забол', 'болею', 'болен', 'больна', 'простыл', 'простуд', 'температур', 'sick', 'ill'])) intent = 'sick';
  else if (has(words, ['уезжа', 'уеду', 'командир', 'поездк', 'отъезд', 'away', 'trip', 'travel', 'улетаю'])) intent = 'away';
  else if (has(words, ['пропуст', 'пропущ', 'skip', 'miss', 'cancel', 'отмени']) || /не (смогу|успел|успею|пойду|получ)/.test(t)) intent = 'skip';
  else if (has(words, ['сделал', 'сделано', 'готово', 'done', 'did', 'съездил', 'сходил', 'пробежал'])) intent = 'done';
  else if (has(words, ['перенес', 'перенос', 'сдвин', 'передвин', 'поставь', 'move', 'shift', 'reschedul'])) intent = 'move';
  else if (has(words, ['добав', 'add'])) intent = 'add';
  else if (has(words, ['пересобер', 'пересобрать', 'replan', 'rebuild'])) intent = 'replan';
  else if (minutes != null) intent = 'time';
  else if (days.length && sport) intent = 'move';
  return {intent, sport, kind, long, days, minutes, at, tod};
}

const sportOf = s => KINDS[s.kind].sport;
function findTarget(wk, week, q, mode) {
  const ti = todayIdx(wk);
  let src = q.days.find(x => ['с', 'со', 'from'].includes(x.prev))?.d ?? null;
  if (src == null && mode === 'move' && q.days.length >= 2) src = q.days[0].d;
  if (src == null && mode !== 'move' && q.days.length) src = q.days[0].d;
  let list = week.sessions.filter(s => s.day != null && (s.status === 'planned' || (mode === 'undo-done' && s.status === 'done')));
  if (q.sport) list = list.filter(s => sportOf(s) === q.sport || KINDS[effective(wk, s).kind].sport === q.sport);
  if (q.kind) list = list.filter(s => s.kind === q.kind);
  else if (q.long && list.some(s => s.kind.endsWith('long'))) list = list.filter(s => s.kind.endsWith('long'));
  if (src != null) list = list.filter(s => s.day === src);
  if (!list.length) return null;
  const today = list.find(s => s.day === ti);
  if (today) return today;
  if (mode === 'skip' || mode === 'done') {
    const past = list.filter(s => s.day < ti).sort((a, b) => b.day - a.day)[0];
    if (past) return past;
  }
  return list.filter(s => s.day >= ti).sort((a, b) => a.day - b.day)[0] || list[0];
}
const unplacedAll = week => week.sessions.filter(s => s.status === 'planned' && s.day == null);

function run(text) {
  const wk = view.wk, week = ensureWeek(wk);
  if (!week) { toast(L('Эта неделя уже прошла', 'This week is over')); return; }
  const q = parse(text, wk), ti = todayIdx(wk), D = DAYS();
  const before = snapshot(week), lines = [];
  const dayName = i => i >= 0 && i <= 6 ? D[i] : null;
  switch (q.intent) {
    case 'undo': return undo(wk);
    case 'pause': return pauseSheet();
    case 'resume': return state.pause ? resumePlan() : reply(text, [L('Программа и так идёт', 'The program is already running')]);
    case 'move': {
      const s = findTarget(wk, week, q, 'move');
      const dest = (q.days.find(x => ['на', 'to', 'on', 'в', 'во'].includes(x.prev)) || q.days[q.days.length - 1])?.d;
      if (!s) return reply(text, [L('Не нашёл, что переносить. Пример: «перенеси бег на четверг»', 'Nothing to move. Try “move run to Thursday”')]);
      if (dest == null || dest > 6) return reply(text, [L('На какой день? Например: «перенеси на четверг»', 'Which day? e.g. “move to Thursday”')]);
      if (dest < ti) return reply(text, [L(`${D[dest]} уже прошёл — выбери день впереди`, `${D[dest]} is over — pick a day ahead`)]);
      const from = s.day, wins = windows(wk, dest, week);
      const others = week.sessions.filter(o => o !== s);
      const soft = conflict(s.kind, dest, others.filter(o => o.day !== dest || o.locked || o.status !== 'planned'));
      s.day = dest; s.locked = true;
      if (q.tod) s.tod = q.tod;
      if (q.at != null) s.start = q.at;
      else {
        let st = pickSlot(wins, s.min, s.tod);
        if (st == null) {
          const best = wins.slice().sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
          if (best && best[1] - best[0] >= 30) { s.short = s.short || s.min; s.min = Math.floor((best[1] - best[0]) / 5) * 5; st = best[0]; lines.push(L(`В ${D[dest]} окно только ${fDur(s.min)} — сократил`, `${D[dest]} only has ${fDur(s.min)} free — shortened`)); }
          else { st = toMin(dest >= 5 ? state.prefs.weStart : state.prefs.evening); lines.push(L(`В ${D[dest]} календарь плотный — поставил на ${hm(st)}, проверь`, `${D[dest]} is packed — put it at ${hm(st)}, double-check`)); }
        }
        s.start = st;
      }
      s.why = L(`Ты перенёс${from != null ? ' с ' + D[from] : ''}`, `You moved it${from != null ? ' from ' + D[from] : ''}`);
      lines.unshift(L(`${kName(s.kind)}: ${from != null ? D[from] : '—'} → ${D[dest]} ${hm(s.start)}`, `${kName(s.kind)}: ${from != null ? D[from] : '—'} → ${D[dest]} ${hm(s.start)}`));
      if (soft && soft !== 'busyDay') lines.push(L(`Заметь: ${reasonText(soft, D[dest])}. Решать тебе — оставил`, `Heads-up: ${reasonText(soft, D[dest])}. Your call — kept it`));
      place(wk, week);
      return commit(wk, week, before, text, lines);
    }
    case 'skip': {
      const s = findTarget(wk, week, q, 'skip');
      if (!s) return reply(text, [L('Не нашёл тренировку. Пример: «пропустил бег»', 'No session found. Try “skipped run”')]);
      const day = s.day;
      s.status = 'skipped'; s.locked = true;
      lines.push(L(`${kName(s.kind)} в ${D[day]} — пропуск отмечен`, `${kName(s.kind)} on ${D[day]} — marked skipped`));
      const key = s.key || s.kind === 'bike_long' || s.kind === 'bike_q' || s.kind === 'run_long' || s.kind === 'run_q';
      if (key) {
        const n = {...newSession({id: s.tid, kind: s.kind, min: s.min, day: day + 1, tod: s.tod, anchor: false, note: '', detail: s.detail}), from: s.id};
        for (let d = Math.max(day + 1, ti); d <= 6 && n.day == null; d++) {
          if (conflict(n.kind, d, week.sessions)) continue;
          const st = pickSlot(windows(wk, d, week), n.min, n.tod);
          if (st != null) { n.day = d; n.start = st; n.locked = true; }
        }
        if (n.day != null) { n.why = L(`Главная тренировка недели — нашлось окно в ${D[n.day]}`, `Key session of the week — found a window on ${D[n.day]}`); week.sessions.push(n); lines.push(L(`${kName(n.kind)}: перенёс на ${D[n.day]} ${hm(n.start)} — окно есть`, `${kName(n.kind)}: moved to ${D[n.day]} ${hm(n.start)} — there’s a window`)); }
        else lines.push(L('До конца недели окна нет — не переношу. Неделя считается по тому, что сделано', 'No window left this week — not moving it. The week counts what you did'));
      } else lines.push(L('Лёгкую не переношу — неделя от этого не ломается', 'Not moving an easy one — the week still works'));
      place(wk, week);
      return commit(wk, week, before, text, lines);
    }
    case 'done': {
      const s = findTarget(wk, week, q, 'done');
      if (!s) return reply(text, [L('Не нашёл, что отметить', 'Nothing to mark')]);
      s.status = 'done'; s.locked = true;
      lines.push(L(`${kName(s.kind)} в ${D[s.day]} — сделано`, `${kName(s.kind)} on ${D[s.day]} — done`));
      return commit(wk, week, before, text, lines);
    }
    case 'time': {
      const day = q.days.length ? q.days[q.days.length - 1].d : ti;
      if (day < ti || day > 6) return reply(text, [L('Этот день уже прошёл или не на этой неделе', 'That day is over or not in this week')]);
      const N = Math.max(15, Math.min(360, q.minutes));
      const s = week.sessions.find(x => x.day === day && x.status === 'planned');
      if (s) {
        const old = s.min, eff = effective(wk, s);
        s.short = s.short || old; s.min = N; s.locked = true;
        if (q.at != null) s.start = q.at; else if (!slotFree(windows(wk, day, week), s.start, N)) s.start = pickSlot(windows(wk, day, week), N, s.tod) ?? s.start;
        const tip = N >= old ? '' : s.kind === 'bike_q' && N < 60 ? L(' — внутри 2×8 мин sweet spot', ' — fit 2×8 min sweet spot inside') : s.kind === 'bike_long' && N < 120 ? L(' — просто ровный Z2', ' — just steady Z2') : eff.kind !== s.kind ? '' : L(' — то же, только короче', ' — same, just shorter');
        lines.push(L(`${kName(eff.kind)} в ${D[day]}: ${fDur(old)} → ${fDur(N)}${tip}`, `${kName(eff.kind)} on ${D[day]}: ${fDur(old)} → ${fDur(N)}${tip}`));
        s.why = L(`Ты сказал: есть ${fDur(N)}`, `You said you have ${fDur(N)}`);
      } else {
        const g = gate(), date = ymd(addDays(parseYmd(wk), day));
        const others = week.sessions.filter(o => active(o) && o.day !== day);
        let kind = q.sport === 'gym' ? 'gym' : q.sport === 'climb' ? 'climb' : q.sport === 'hike' ? 'hike' : q.sport === 'swim' ? 'swim' : q.sport === 'run' ? 'run_easy' : q.sport === 'bike' ? 'bike_easy' : null;
        if (!kind) kind = (!g.known || g.runOkOn(date)) && !conflict('run_easy', day, others) ? 'run_easy' : (!g.known || g.bikeOk) ? 'bike_easy' : 'mobility';
        const n = {...newSession({id: 'added', kind, min: N, day, tod: q.tod || (day >= 5 ? 'am' : 'pm'), anchor: false, note: ''}), day, locked: true};
        n.start = q.at ?? pickSlot(windows(wk, day, week), N, n.tod) ?? toMin(state.prefs.evening);
        n.why = L(`Добавил: есть ${fDur(N)}`, `Added: you have ${fDur(N)}`);
        week.sessions.push(n);
        lines.push(L(`${D[day]}: добавил ${kName(kind).toLowerCase()} ${fDur(N)} в ${hm(n.start)}`, `${D[day]}: added ${kName(kind).toLowerCase()} ${fDur(N)} at ${hm(n.start)}`));
      }
      place(wk, week);
      return commit(wk, week, before, text, lines);
    }
    case 'sick': {
      week.sick = [...new Set([...(week.sick || []), ti, ti + 1, ti + 2].filter(d => d >= 0 && d <= 6))];
      for (const s of week.sessions) {
        if (s.status !== 'planned' || s.day == null || s.day < ti) continue;
        if (s.day <= ti + 2) { s.status = 'dropped'; s.why = L('Болезнь — отдых', 'Ill — rest'); lines.push(L(`${kName(s.kind)} в ${D[s.day]} — убрал, отдыхай`, `${kName(s.kind)} on ${D[s.day]} — removed, rest`)); }
        else if (s.kind === 'bike_q' || s.kind === 'bike_long' || s.kind === 'run_long' || s.kind === 'run_q') {
          const k = KINDS[s.kind].sport === 'run' ? 'run_easy' : 'bike_easy', old = s.kind;
          s.kind = k; s.min = Math.min(s.min, 60); delete s.detail; s.why = L('После болезни — только легко', 'After being ill — easy only');
          lines.push(L(`${D[s.day]}: ${kName(old).toLowerCase()} → ${kName(k).toLowerCase()} ${fDur(s.min)}`, `${D[s.day]}: ${kName(old).toLowerCase()} → ${kName(k).toLowerCase()} ${fDur(s.min)}`));
        }
      }
      if (!lines.length) lines.push(L('Впереди на этой неделе ничего нет — просто отдыхай', 'Nothing ahead this week — just rest'));
      lines.push(L('Выздоравливай. Скажи «пересобери», когда станет лучше', 'Get well. Say “replan” when you feel better'));
      return commit(wk, week, before, text, lines);
    }
    case 'away': {
      let range = q.days.map(x => x.d);
      const t = norm(text);
      if (range.length >= 2 && /(–|-|—|по |до |to |till |until )/.test(t)) { const [a, b] = [range[0], range[range.length - 1]]; range = []; for (let i = a; i <= b; i++) range.push(i); }
      range = range.filter(d => d >= ti && d <= 6);
      if (!range.length) return reply(text, [L('Какие дни? Например: «уезжаю пт–вс»', 'Which days? e.g. “away Fri–Sun”')]);
      week.away = [...new Set([...(week.away || []), ...range])].sort();
      for (const s of week.sessions) if (s.status === 'planned' && range.includes(s.day)) { s.locked = false; s.day = null; }
      lines.push(L(`${range.map(d => D[d]).join(', ')} — в поездке, тренировки оттуда убрал`, `${range.map(d => D[d]).join(', ')} — away, sessions moved out`));
      // A trip of 2+ days keeps short formats every other day, unless the person said no training (rule 38).
      if (range.length >= 2 && !/без трен|отдыха|отдыхаю|no training|rest/.test(t)) {
        const runOk = !gate().known || gate().max === 0;
        for (let k = 1; k < range.length; k += 2) {
          const d = range[k], kind = runOk ? 'run_easy' : 'mobility';
          const n = newSession({id: 'trip', kind, min: 30, day: d, tod: 'any', anchor: false, note: '', detail: L('Поездка: 20–30 мин лёгкого бега или зал отеля; нет времени — 10 мин мобильности', 'Trip: 20–30 min easy run or the hotel gym; no time — 10 min mobility')});
          n.day = d; n.locked = true; n.travel = true; n.why = L('Короткая тренировка в поездке — держит ритм, не нагружает (правило 38)', 'A short session on the trip keeps the rhythm without load (rule 38)');
          week.sessions.push(n);
          lines.push(L(`${D[d]}: короткая — ${kName(kind).toLowerCase()} 30 мин, когда будет окно`, `${D[d]}: a short one — ${kName(kind).toLowerCase()} 30 min, whenever there’s a gap`));
        }
      }
      // Away sessions keep their old day as "from" so the log explains the move.
      const prev = JSON.parse(before).sessions;
      place(wk, week);
      for (const s of week.sessions) {
        const p = prev.find(x => x.id === s.id);
        if (p && range.includes(p.day) && s.status === 'planned' && s.day == null) s.why = L(`${D[p.day]} — поездка; на этой неделе без неё`, `${D[p.day]} — away; skipping it this week`);
      }
      return commit(wk, week, before, text, lines);
    }
    case 'add': {
      const kind = q.kind || (q.sport === 'run' ? (q.long ? 'run_long' : 'run_easy') : q.sport === 'bike' ? (q.long ? 'bike_long' : 'bike_easy') : q.sport === 'gym' ? 'gym' : q.sport === 'climb' ? 'climb' : q.sport === 'hike' ? 'hike' : q.sport === 'swim' ? 'swim' : q.sport === 'walk' ? 'mobility' : null);
      if (!kind) return reply(text, [L('Что добавить? Например: «добавь бег в пятницу»', 'Add what? e.g. “add a run on Friday”')]);
      const day = q.days.length ? q.days[q.days.length - 1].d : null;
      // Long days (a hike, a long ride or run) start in the morning unless told otherwise.
      const n = newSession({id: 'added', kind, min: q.minutes || KINDS[kind].min, day: day ?? Math.max(ti, 0), tod: q.tod || (KINDS[kind].weekend || kind.endsWith('long') ? 'am' : 'pm'), anchor: false, note: ''});
      week.sessions.push(n);
      if (day != null && day >= ti && day <= 6) { n.day = day; n.locked = true; n.start = q.at ?? pickSlot(windows(wk, day, week), n.min, n.tod) ?? toMin(state.prefs.evening); n.why = L('Ты добавил', 'You added it'); }
      place(wk, week);
      lines.push(n.day != null ? L(`Добавил ${kName(kind).toLowerCase()} — ${D[n.day]} ${hm(n.start)}`, `Added ${kName(kind).toLowerCase()} — ${D[n.day]} ${hm(n.start)}`) : L(`Не нашёл окна для: ${kName(kind).toLowerCase()}`, `No window for ${kName(kind).toLowerCase()}`));
      return commit(wk, week, before, text, lines);
    }
    case 'replan': {
      for (const s of week.sessions) if (s.status === 'planned' && (s.day == null || s.day >= ti)) s.locked = false;
      place(wk, week);
      lines.push(L('Пересобрал всё, что впереди', 'Rebuilt everything ahead'));
      return commit(wk, week, before, text, lines);
    }
    default:
      return reply(text, [L('Пока понимаю: «перенеси бег на чт», «пропустил», «сегодня 30 минут», «болею», «уезжаю пт–вс», «сделал», «добавь вел в пт», «пересобери», «отмени»', 'I understand: “move run to Thu”, “skipped”, “30 minutes today”, “sick”, “away Fri–Sun”, “done”, “add ride Fri”, “replan”, “undo”')]);
  }
}
function reply(text, lines) { if (capture) { capture.push(...lines); return; } lastChange = {wk: view.wk, text, lines, info: true}; render(); }
function undo(wk) {
  const week = state.weeks[wk], e = week?.log?.[0];
  if (!e) { reply('', [L('Отменять нечего', 'Nothing to undo')]); return; }
  const x = JSON.parse(e.snap);
  week.sessions = x.sessions; week.away = x.away || []; week.sick = x.sick || [];
  if (x.planBy) week.planBy = x.planBy; else delete week.planBy;
  if (x.planNote) week.planNote = x.planNote; else delete week.planNote;
  week.log.shift();
  if (e.planPrev) {
    const p = JSON.parse(e.planPrev);
    state.plan = p.plan; state.template = p.template; state.asks = p.asks;
    if (p.planSkip) state.planSkip = p.planSkip; else delete state.planSkip;
    if (p.prop) state.proposals[wk] = p.prop; else delete state.proposals[wk];
  }
  if (e.prop && state.proposals[wk]?.status === 'applied') state.proposals[wk].status = 'new'; // the proposal card comes back
  persist();
  lastChange = {wk, text: L('отмена', 'undo'), lines: [L(`Вернул как было до «${e.text}»`, `Restored the plan from before “${e.text}”`)], info: true};
  render();
}

/* ---------- cloud (Supabase, shared with the gym app) ---------- */
const CFG = window.TRAIN_CONFIG || {};
const cloud = {client: null, user: null, state: 'idle', last: null, timer: null, running: false, cals: null, calBusy: false, gLinked: null};
function scheduleSync(delay = 1500) { if (!cloud.user) return; clearTimeout(cloud.timer); cloud.timer = setTimeout(sync, delay); }
async function sync() {
  if (!cloud.client || !cloud.user || cloud.running) return;
  if (!navigator.onLine) { cloud.state = 'offline'; return; }
  cloud.running = true; cloud.state = 'syncing';
  try {
    const sb = cloud.client, uid = cloud.user.id;
    const {data: row, error} = await sb.from('training_state').select('data,updated_at').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    const remoteNewer = row && (!state.syncedAt || row.updated_at > state.syncedAt || state.syncedUser !== uid);
    if (remoteNewer && (!state.dirty || state.syncedUser !== uid) && row.data?.v) {
      const local = state.local;
      state = {...row.data, local, syncedAt: row.updated_at, syncedUser: uid, dirty: false};
      state.prefs = {...DEFAULT_PREFS, ...(state.prefs || {})};
      state.weeks = state.weeks || {}; state.checks = state.checks || {}; state.asks = state.asks || {}; state.chat = Array.isArray(state.chat) ? state.chat : []; state.plan = state.plan || null; state.proposals = state.proposals || {}; state.template = state.template || DEFAULT_TEMPLATE.map(x => ({...x}));
      fill(state); saveLocal(); render();
    } else if (state.dirty || !row) {
      const sent = rev;
      const {data: up, error: e2} = await sb.from('training_state').upsert({user_id: uid, data: synced()}, {onConflict: 'user_id'}).select('updated_at').single();
      if (e2) throw e2;
      state.dirty = rev !== sent; state.syncedAt = up.updated_at; state.syncedUser = uid; saveLocal();
    }
    cloud.state = 'ok'; cloud.last = new Date();
  } catch (e) { cloud.state = navigator.onLine ? 'error' : 'offline'; console.warn('sync failed', e); }
  finally { cloud.running = false; if (state.dirty && cloud.state === 'ok') scheduleSync(500); refreshAcct(); }
}
async function fn(action, extra = {}) {
  if (!cloud.client || !cloud.user) return {error: 'signed_out'};
  const {data, error} = await cloud.client.functions.invoke('train', {body: {action, ...extra}});
  if (error) { let body = null; try { body = await error.context?.json?.(); } catch {} return {error: body?.error || 'unavailable'}; }
  return data;
}
async function loadBusy(wk, force) {
  const c = state.local.busy[wk];
  if (!force && c && Date.now() - c.at < 10 * 60e3) return;
  const from = parseYmd(wk), to = addDays(from, 7);
  const d = await fn('busy', {from: from.toISOString(), to: to.toISOString()});
  if (d.error) { if (force) toast(L('Календарь не загрузился — проверь сеть', 'Calendar didn’t load — check the connection')); return; }
  const fileEv = (c?.events || []).filter(e => e.cal === 'file');
  state.local.busy[wk] = {at: Date.now(), events: [...d.events, ...fileEv], errors: d.errors, n: d.calendars};
  saveLocal();
  onBusy(wk);
}
// New calendar data: the first time a week sees it, placement is silent; later, conflicts are explained.
function onBusy(wk) {
  const week = state.weeks[wk];
  if (!week) { render(); return; }
  const before = snapshot(week);
  if (!week.busySeen) { week.busySeen = true; place(wk, week); persist(); render(); return; }
  const ti = todayIdx(wk), lines = [];
  for (const s of week.sessions) {
    if (s.status !== 'planned' || s.day == null || s.day < ti || s.locked) continue;
    const hit = blocks(wk, s.day).find(b => !b.work && !b.own && b.s < s.start + s.min && b.e > s.start);
    if (hit) { lines.push(L(`В календаре «${hit.title}» ${hm(hit.s)} — пересобрал ${kName(s.kind).toLowerCase()}`, `“${hit.title}” at ${hm(hit.s)} in your calendar — moved ${kName(s.kind).toLowerCase()}`)); s.start = null; }
  }
  if (lines.length) { place(wk, week); commit(wk, week, before, L('календарь', 'calendar'), lines); }
  else render();
}
// Garmin activities are cached on this device only. `from` is how far back the cache reaches;
// recent weeks refresh every 15 min, older ones are fetched once (history doesn't change).
function mergeActs(list, from, d) {
  const a = state.local.acts || {list: []}, byId = new Map((a.list || []).map(x => [x.id, x]));
  for (const x of list) byId.set(x.id, {...x, sport: actSport(x)});
  state.local.acts = {...a, list: [...byId.values()].sort((x, y) => x.start.localeCompare(y.start)), linked: d.linked, error: d.error,
    from: a.from && a.from < from ? a.from : from};
  saveLocal();
}
/* ---------- Apple Health (iPhone app only) ---------- */
// In the native shell a small HealthKit plugin reads workouts that Garmin Connect, Apple Watch, COROS and others
// write to Apple Health. It stays on the device: the source switch lives in state.local, not in the synced state.
const NATIVE = !!window.Capacitor?.isNativePlatform?.();
const HK = NATIVE && window.Capacitor.registerPlugin ? window.Capacitor.registerPlugin('WeekHealth') : null;
const hkOn = () => !!(HK && state.local.health?.on);
async function hkActivities(from, to) {
  try { const d = await HK.workouts({from, to}); return {linked: true, source: 'apple', activities: d.workouts || []}; }
  catch (e) { return {linked: true, source: 'apple', error: 'health_unavailable', activities: []}; }
}
async function connectHealth() {
  if (!HK) return 'unavailable';
  const av = await HK.isAvailable().catch(() => ({available: false}));
  if (!av.available) return 'unavailable';
  const r = await HK.requestAuthorization().catch(() => ({ok: false}));
  if (!r.ok) return 'denied';
  state.local.health = {on: true, at: Date.now()}; state.local.acts = null; saveLocal();
  await loadActs(true);
  await ensureHist12();
  return null;
}
const actsFrom = (from, to) => hkOn() ? hkActivities(from, to) : fn('activities', {from, to});

async function loadActs(force) {
  if (!cloud.user && !hkOn()) return;
  const a = state.local.acts;
  if (!force && a && Date.now() - a.at < 15 * 60e3) return;
  const to = new Date(), from = ymd(addDays(mondayOf(to), -28));
  const d = await actsFrom(from, ymd(to));
  if (d.error) return;
  cloud.gLinked = d.linked;
  mergeActs(d.activities || [], from, d);
  state.local.acts.at = Date.now();
  saveLocal();
  for (const wk of Object.keys(state.weeks)) {
    const week = state.weeks[wk], before = snapshot(week), lines = matchActs(wk, week);
    if (lines.length) commit(wk, week, before, 'Garmin', lines, {silent: wk !== view.wk});
  }
  for (const wk of Object.keys(state.weeks)) { const week = state.weeks[wk]; if (!week.guarded && !week.paused && todayIdx(wk) <= 6) guardWeek(wk, week, wk !== view.wk); }
  render();
}
// Older history: a range [from, to) that the cache doesn't reach yet. Returns how many activities came in.
const histBusy = {on: false};
async function loadHistory(from, to) {
  if (histBusy.on || (!cloud.user && !hkOn())) return null;
  histBusy.on = true;
  try {
    const d = await actsFrom(from, to);
    if (d.error) return null;
    const before = state.local.acts?.list?.length || 0;
    mergeActs(d.activities || [], from, d);
    return (state.local.acts.list.length - before);
  } finally { histBusy.on = false; }
}
// Browsing back past the cache pulls the next 12 weeks at once.
async function ensureHistory(wk) {
  const a = state.local.acts;
  if (!a?.linked || !a.from || wk >= a.from) return;
  const to = a.from, from = ymd(addDays(parseYmd(wk), -7 * 11));
  view.loading = true; render();
  await loadHistory(from, to);
  view.loading = false; render();
}
async function initCloud() {
  if (!CFG.supabaseUrl || !CFG.supabaseKey || !window.supabase) return;
  cloud.client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false}});
  const {data} = await cloud.client.auth.getSession();
  cloud.user = data.session?.user || null;
  cloud.client.auth.onAuthStateChange((_e, session) => { const was = cloud.user?.id; cloud.user = session?.user || null; if (cloud.user && cloud.user.id !== was) afterSignIn(); });
  render();
  if (cloud.user) afterSignIn();
}
// Once per signed-in user: sync, membership (cloud.ready), then calendar, Garmin and the assistant for members.
function afterSignIn() {
  const uid = cloud.user?.id;
  if (cloud.signedFor === uid && cloud.signP) return cloud.signP;
  cloud.signedFor = uid;
  cloud.ready = Promise.all([sync(), fn('me').then(d => { cloud.me = d.error ? null : d; })]);
  return cloud.signP = (async () => {
    await cloud.ready;
    if (cloud.me && !cloud.me.member) { cloud.ai = false; render(); return; }
    const st = await fn('cal-status'); if (!st.error) { cloud.cals = st.calendars; cloud.google = st.google; }
    render();
    const ai = aiStatus();
    if (cloud.cals?.length) await loadBusy(view.wk);
    await loadActs();
    await ai;
    maybeWeekly();
  })();
}
addEventListener('online', () => scheduleSync(200));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cloud.user) { scheduleSync(200); if (cloud.cals?.length) loadBusy(view.wk); loadActs().then(maybeWeekly); } });
function refreshAcct() { const el = document.getElementById('acctStatus'); if (el) el.textContent = acctStatus(); }
function acctStatus() {
  if (cloud.state === 'syncing') return L('Синхронизирую…', 'Syncing…');
  if (cloud.state === 'offline') return L('Нет сети — синхронизирую позже', 'Offline — will sync later');
  if (cloud.state === 'error') return L('Синхронизация не удалась', 'Sync failed');
  if (cloud.last) return L('Синхронизировано ', 'Synced ') + cloud.last.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-GB', {hour: '2-digit', minute: '2-digit'});
  return '';
}

/* ---------- AI assistant (train-chat function, Claude) ---------- */
// The chat lives in state.chat (synced). The model only proposes plan changes as app commands;
// they run through the same planner as the command bar, and only when the person taps «Применить».
const chat = {busy: false, ctrl: null};
let capture = null; // while applying a proposal, commit() and reply() collect lines here instead of rendering
async function aiStatus() {
  try { const {data, error} = await cloud.client.functions.invoke('train-chat', {body: {action: 'status'}}); cloud.ai = !error && !!data?.ai; }
  catch { cloud.ai = false; }
  render();
}
const isoNow = () => new Date().toISOString();
// What the assistant sees about the app right now: the visible week, pain, Garmin, template. No calendar titles.
function sessCtx(s, wk) {
  const e = effective(wk, s), o = {day: e.day != null ? DAYS_RU[e.day] : 'не влезло', kind: KINDS[e.kind].ru, min: e.short || e.min, status: e.status};
  if (e.day != null && e.start != null && e.status === 'planned') o.start = hm(e.start);
  if (e.was) o.planned_as = KINDS[e.was].ru;
  else if (s.detail) o.detail = s.detail;
  if (s.key) o.key = true;
  if (e.why && whyLoud(e.why)) o.why = whyText(e.why);
  if (e.caution) o.caution = e.caution;
  if (s.act) o.garmin = {min: s.act.min, km: s.act.km};
  if (s.locked) o.pinned = true;
  return o;
}
const busyCtx = wk => state.local.busy[wk] ? [0, 1, 2, 3, 4, 5, 6].map(i => ({day: DAYS_RU[i], busy: blocks(wk, i).map(b => `${hm(b.s)}–${hm(b.e)}${b.work ? ' работа' : ''}`)})).filter(x => x.busy.length) : 'календарь не загружен';
function painCtx() {
  if (!state.health?.track && !Object.keys(state.checks).length) return 'боль не отслеживает, травм не указано';
  const g = gate(), now = new Date();
  const checks = Object.keys(state.checks).filter(d => d >= ymd(addDays(now, -14))).sort().map(d => ({date: d, sit: state.checks[d].sit, walk: state.checks[d].walk, rest_or_night_pain: !!state.checks[d].rest}));
  return {checks, gate: g.known ? {max_today: g.max, stop: g.stop, see_doctor: g.doctor, bike_ok: g.bikeOk, run_ok_today: g.runOkOn(todayStr())} : 'нет свежей отметки', injury: state.health?.note || null, user_rule: state.health?.rule || null};
}
function garminCtx() {
  const now = new Date(), acts = state.local.acts?.list || [], since = ymd(addDays(now, -21));
  const recent = acts.filter(a => a.start.slice(0, 10) >= since).map(a => ({date: a.start.slice(0, 16).replace('T', ' '), sport: a.sport, type: a.type, name: a.name, min: a.min, km: a.km || undefined, elev: a.elev || undefined, hr: a.hr || undefined, np: a.np || undefined, load: a.load || undefined, hr_zone_min: a.hrz?.some(Boolean) ? a.hrz.map(x => Math.round(x / 60)) : undefined}));
  const weeks = {};
  for (const a of acts) {
    if (!trainingSport(a.sport)) continue;
    const w = ymd(mondayOf(parseYmd(a.start.slice(0, 10))));
    if (w < ymd(addDays(mondayOf(now), -7 * 8))) continue;
    (weeks[w] = weeks[w] || {})[a.sport] = Math.round(((weeks[w][a.sport] || 0) + a.min / 60) * 10) / 10;
  }
  return {linked: !!state.local.acts?.linked, recent_21d: recent, hours_by_week: weeks};
}
const zonesCtx = () => { const z = state.zones || {}, ep = typeof easyPace === 'function' ? easyPace() : null; const thr = effThr(); return {mode: zMode(), ftp_w: effFtp(), run_threshold_pace: thr ? paceFmt(thr) : null, heart_rate: hrTargets() ? (t => ({watch_zones_top: {Z1: t.b[0], Z2: t.b[1], Z3: t.b[2], Z4: t.b[3]}, easy_max: t.lt1, steady_max: t.steady, tempo: t.tempo, threshold: t.thr, hard_from: t.intervals, max_hr_est: t.max, usual_easy_run_hr: t.usual}))(hrTargets()) : null, usual_run_pace_garmin: ep ? paceFmt(ep) : null, note: 'в detail пиши пульс в ударах из heart_rate словами «Лёгкий/Ровный/Темп/Порог/Тяжёлый» (например «Лёгкий, пульс до 147»), а не названия зон Z1–Z5: зоны на часах у человека свои; если heart_rate нет — RPE и разговорный тест'}; };
const templateCtx = () => state.template.map(t => ({day: DAYS_RU[t.day], kind: KINDS[t.kind].ru, min: t.min, tod: t.tod, anchor: t.anchor, ...(t.detail ? {detail: t.detail} : {})}));
function chatContext(focus) {
  const wk = view.wk, week = state.weeks[wk], ti = todayIdx(wk), now = new Date(), cur = ymd(mondayOf(now)), nwk = ymd(addDays(mondayOf(now), 7));
  const prop = state.proposals[nwk];
  return {
    today: {date: todayStr(), weekday: DAYS_RU[(now.getDay() + 6) % 7], time: hm(nowMin())},
    plan_week: {monday: wk, relation: ti < 0 ? 'будущая' : ti > 6 ? 'прошедшая' : 'текущая', ...(week?.planNote ? {idea: week.planNote} : {}), sessions: week ? week.sessions.map(s => sessCtx(s, wk)) : [], away: week?.away || [], sick: week?.sick || [], calendar_busy: busyCtx(wk), recent_changes: (week?.log || []).slice(0, 5).map(e => ({text: e.text, lines: e.lines}))},
    pain: painCtx(),
    garmin: garminCtx(),
    plan: state.plan ? {...answersCtx(state.plan), summary: state.plan.summary, since: state.plan.start, ...(state.plan.outlook ? {outlook: state.plan.outlook.headline, outlook_this_week: outlookWeek(wk)} : {})} : 'план не собран',
    template: templateCtx(),
    zones: zonesCtx(),
    sport_answers: state.asks,
    ...(prop?.status === 'new' ? {next_week_proposal: {monday: nwk, summary: prop.summary, sessions: prop.sessions.map(x => ({day: DAYS_RU[x.day], kind: KINDS[x.kind].ru, min: x.min, detail: x.detail}))}} : {}),
    ...(cur !== wk && state.weeks[cur] ? {current_week: {monday: cur, note: 'неделя, которая идёт сейчас; правки предлагаются для plan_week', sessions: state.weeks[cur].sessions.map(s => sessCtx(s, cur))}} : {}),
    ...(focus ? {focus} : {}),
  };
}
// One workout in detail, for «Обсудить с ассистентом» from the workout sheet.
function actFocus(id) {
  const base = (state.local.acts?.list || []).find(a => a.id === id) || null, d = actCached(id);
  if (!d?.summary) return base ? {workout: base} : null;
  const S = d.summary, keep = {};
  for (const [k, v] of Object.entries(S)) if (v != null && v !== '') keep[k] = v;
  const an = analyse(d, base, null);
  return {workout: {...keep, dur_min: S.dur ? Math.round(S.dur / 60) : undefined, dist_km: S.dist ? Math.round(S.dist / 100) / 10 : undefined, hr_zone_min: base?.hrz?.map(x => Math.round(x / 60)), load: base?.load, verdicts: an.verdicts.map(v => `${v.head} ${v.text}`), best: an.best.map(b => b.join(': '))}};
}
function md(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>');
  const out = []; let list = null;
  for (const raw of String(t || '').split('\n')) {
    const line = raw.trimEnd(), m = line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/);
    if (m) {
      const tag = m[1] ? 'ol' : 'ul';
      if (list !== tag) { if (list) out.push(`</${list}>`); list = tag; out.push(`<${tag}>`); }
      out.push(`<li>${inl(m[2])}</li>`); continue;
    }
    if (list) { out.push(`</${list}>`); list = null; }
    if (!line.trim()) continue;
    const hd = line.match(/^#{1,4}\s+(.*)$/);
    out.push(hd ? `<p><b>${inl(hd[1])}</b></p>` : `<p>${inl(line)}</p>`);
  }
  if (list) out.push(`</${list}>`);
  return out.join('');
}
const chatErr = e => ({
  ai_not_configured: L('Ассистент ещё не настроен на сервере', 'The assistant isn’t set up on the server yet'),
  rate_limited: L('Слишком много запросов — попробуй через минуту', 'Too many requests — try again in a minute'),
  bad_key: L('Сервер не смог авторизоваться у модели', 'The server couldn’t authenticate with the model'),
  unreachable: L('Не достучался до модели — попробуй ещё раз', 'Couldn’t reach the model — try again'),
  too_long: L('Ответ вышел слишком длинным — спроси уже', 'The answer ran too long — ask something narrower'),
  refusal: L('На это ответить не могу', 'I can’t help with that one'),
  network: L('Нет сети', 'You’re offline'), unauthorized: L('Войди заново в настройках', 'Sign in again in Settings'),
  stopped: L('Остановлено', 'Stopped'),
  no_plan: L('Не получилось собрать план — попробуй ещё раз', 'Couldn’t put the plan together — try again'),
  limit: L('Лимит ассистента на сегодня закончился — завтра снова можно', 'Today’s assistant allowance is used up — back tomorrow'),
  not_member: L('Ассистент доступен по приглашению — введи инвайт-код', 'The assistant is invite-only — enter an invite code'),
}[e] || L('Не получилось — попробуй ещё раз', 'That didn’t work — try again'));
function msgHTML(m) {
  if (m.role === 'user') return `<div class="msg me"><div class="bubble">${esc(m.text)}</div></div>`;
  let h = `<div class="msg ai" data-mid="${m.id}"><div class="md">${md(m.text)}</div>`;
  if (m.pending && !m.text) h += `<div class="typing" aria-label="${L('Думаю', 'Thinking')}"><i></i><i></i><i></i></div>`;
  const p = m.actions;
  if (p) {
    h += `<div class="proposal"><b>${esc(p.summary)}</b>`;
    if (p.applied) h += `<ul>${p.applied.map(l => `<li>${esc(l)}</li>`).join('')}</ul><p class="muted">${L('Применено — отменить можно на экране недели', 'Applied — undo it on the week screen')}</p>`;
    else h += `<ul class="cmds">${p.commands.map(c => `<li>${esc(c)}</li>`).join('')}</ul>${m.pending ? '' : `<button class="btn sm primary" data-a="chat-apply" data-mid="${m.id}">${L('Применить', 'Apply')}</button>`}`;
    h += '</div>';
  }
  if (m.plan) {
    const pl = m.plan;
    h += `<div class="proposal"><b>${esc(pl.summary)}</b><span class="muted" style="font-size:14px">${esc(weekTitle(pl.wk))}</span>${planRowsHTML(pl.sessions)}${pl.applied ? `<p class="muted">${L('Применено — отменить можно на экране недели', 'Applied — undo it on the week screen')}</p>` : m.pending ? '' : `<button class="btn sm primary" data-a="chat-plan-apply" data-mid="${m.id}">${L('Применить неделю', 'Apply this week')}</button>`}</div>`;
  }
  if (m.error) h += `<p class="chat-err">${esc(chatErr(m.error))}${m.error !== 'refusal' && m.error !== 'stopped' ? ` <button class="nav-btn link" data-a="chat-retry">${L('Повторить', 'Retry')}</button>` : ''}</p>`;
  return h + '</div>';
}
function chatSheetHTML() {
  const msgs = state.chat;
  const starters = lang === 'ru' ? ['Как идёт неделя?', 'Что сегодня и как это сделать?', 'Разбери последнюю тренировку', 'Неделя забита — что оставить?'] : ['How is the week going?', 'What’s today and how do I do it?', 'Review my last workout', 'Busy week — what should I keep?'];
  const body = msgs.length ? msgs.map(msgHTML).join('')
    : `<div class="chat-empty"><p>${L('Спроси про тренировки, боль, восстановление — или попроси переставить неделю. Изменения применяешь ты.', 'Ask about training, pain or recovery — or ask to rearrange the week. You apply any changes.')}</p><div class="starters">${starters.map(s => `<button class="starter" data-a="chat-starter" data-t="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
  return `<div class="sheet-head"><h2>${L('Ассистент', 'Assistant')}</h2><span class="sheet-acts">${msgs.length ? `<button class="nav-btn" data-a="chat-new">${L('Новый', 'New')}</button>` : ''}<button class="nav-btn strong" data-a="close-sheet">${L('Готово', 'Done')}</button></span></div>
    <div class="sheet-scroll chat-log" id="chatLog">${body}</div>
    <form id="chatForm" class="chat-compose" autocomplete="off"><textarea id="chatInput" rows="1" enterkeyhint="send" placeholder="${L('Спроси ассистента', 'Ask the assistant')}"></textarea>${chat.busy
      ? `<button class="send stop" type="button" data-a="chat-stop" aria-label="${L('Остановить', 'Stop')}"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/></svg></button>`
      : `<button class="send" type="submit" aria-label="${L('Отправить', 'Send')}">${icon('up')}</button>`}</form>`;
}
const chatLogEl = () => document.getElementById('chatLog');
function chatScroll(force) { const el = chatLogEl(); if (el && (force || el.scrollHeight - el.scrollTop - el.clientHeight < 120)) el.scrollTop = el.scrollHeight; }
function chatRender(forceScroll) {
  if (!sheetCtx?.chat) return;
  const inp = $('#chatInput'), v = inp?.value || '', had = document.activeElement === inp;
  $('#sheetPanel').innerHTML = chatSheetHTML();
  const n = $('#chatInput'); n.value = v; growInput(n); if (had) n.focus();
  chatScroll(forceScroll);
}
function growInput(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
function openChat(text, focus) {
  openSheet(chatSheetHTML(), {chat: true});
  chatScroll(true);
  if (text) sendChat(text, focus);
}
// The conversation as the API wants it: text only, alternating, a proposal summarised into its message.
function chatHistory() {
  const out = [];
  for (const m of state.chat) {
    if (m.pending) continue;
    let text = m.text || '';
    if (m.role === 'assistant' && m.actions) text += `\n\n[Карточка: ${m.actions.summary}. Команды: ${m.actions.commands.join('; ')}. ${m.actions.applied ? 'Пользователь применил.' : 'Не применено.'}]`;
    if (m.role === 'assistant' && m.plan) text += `\n\n[Карточка недели ${m.plan.wk}: ${m.plan.summary}. ${m.plan.sessions.map(x => `${DAYS_RU[x.day]} ${KINDS[x.kind].ru} ${x.min} мин`).join('; ')}. ${m.plan.applied ? 'Пользователь применил.' : 'Не применено.'}]`;
    if (m.role === 'assistant' && m.error && !text) continue;
    if (!text.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.text += '\n\n' + text; else out.push({role: m.role, text});
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out.slice(-20);
}
// One call to train-chat: POST, then read its event stream. Throws on HTTP errors; stream events go to onEvent.
async function aiStream(body, signal, onEvent) {
  const {data} = await cloud.client.auth.getSession();
  const res = await fetch(`${CFG.supabaseUrl}/functions/v1/train-chat`, {
    method: 'POST', signal,
    headers: {'Content-Type': 'application/json', apikey: CFG.supabaseKey, Authorization: `Bearer ${data.session?.access_token || ''}`},
    body: JSON.stringify(body),
  });
  if (!res.ok) { let b = null; try { b = await res.json(); } catch {} throw new Error(b?.error || (res.status === 401 ? 'unauthorized' : 'failed')); }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const {value, done} = await reader.read();
    if (done) break;
    buf += dec.decode(value, {stream: true});
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).split('\n').find(l => l.startsWith('data: '));
      buf = buf.slice(i + 2);
      if (!line) continue;
      let ev; try { ev = JSON.parse(line.slice(6)); } catch { continue; }
      onEvent(ev);
    }
  }
}
async function sendChat(text, focus) {
  text = String(text || '').trim();
  if (!text || chat.busy) return;
  if (!cloud.user) { toast(L('Войди в настройках — ассистент работает с аккаунтом', 'Sign in under Settings to use the assistant')); return; }
  state.chat.push({id: rid(), role: 'user', text, at: isoNow(), ...(focus ? {focus} : {})});
  const msg = {id: rid(), role: 'assistant', text: '', at: isoNow(), pending: true};
  state.chat.push(msg);
  state.chat = state.chat.slice(-40);
  chat.busy = true; chat.ctrl = new AbortController();
  chatRender(true);
  const paint = () => { const el = document.querySelector(`[data-mid="${msg.id}"] .md`); if (el) { el.innerHTML = md(msg.text); el.parentElement.querySelector('.typing')?.remove(); chatScroll(); } };
  try {
    await aiStream({messages: chatHistory(), context: chatContext(focus ? actFocus(focus.act) : null)}, chat.ctrl.signal, ev => {
      if (ev.t === 'text') { msg.text += ev.d; paint(); }
      else if (ev.t === 'actions') msg.actions = {summary: ev.summary, commands: ev.commands, wk: view.wk};
      else if (ev.t === 'plan') msg.plan = {...planOf(ev), wk: /^\d{4}-\d{2}-\d{2}$/.test(ev.wk) && parseYmd(ev.wk).getDay() === 1 && todayIdx(ev.wk) <= 6 ? ev.wk : view.wk};
      else if (ev.t === 'refusal') msg.error = 'refusal';
      else if (ev.t === 'error') msg.error = ev.e;
    });
    if (!msg.text && !msg.actions && !msg.plan && !msg.error) msg.error = 'failed';
  } catch (e) {
    msg.error = e.name === 'AbortError' ? 'stopped' : !navigator.onLine ? 'network' : (e.message || 'failed');
  } finally {
    msg.pending = false; chat.busy = false; chat.ctrl = null;
    if (!state.chat.includes(msg)) state.chat.push(msg); // a sync replaced the state mid-answer
    persist(); chatRender();
  }
}
function chatRetry() {
  if (chat.busy) return;
  let i = state.chat.length - 1;
  while (i >= 0 && state.chat[i].role !== 'user') i--;
  if (i < 0) return;
  const u = state.chat[i];
  state.chat.splice(i);
  sendChat(u.text, u.focus);
}
// Runs the proposal's commands as one change: one entry in the change history, one undo.
function applyProposal(id) {
  const m = state.chat.find(x => x.id === id), p = m?.actions;
  if (!p || p.applied) return;
  const wk = p.wk || view.wk;
  view.v = 'week'; view.wk = wk;
  const week = ensureWeek(wk);
  if (!week) { toast(L('Эта неделя уже прошла', 'This week is over')); return; }
  const top = week.log[0], out = [];
  capture = out;
  try { for (const c of p.commands) run(c); } finally { capture = null; }
  const n = top ? week.log.indexOf(top) : week.log.length;
  if (n > 1) {
    const es = week.log.splice(0, n);
    week.log.unshift({at: es[0].at, text: L('ассистент: ', 'assistant: ') + p.summary, lines: es.slice().reverse().flatMap(e => e.lines), snap: es[es.length - 1].snap});
  } else if (n === 1) week.log[0].text = L('ассистент: ', 'assistant: ') + p.summary;
  p.applied = out.length ? out : [L('План не изменился', 'The plan didn’t change')];
  lastChange = {wk, text: L('ассистент', 'assistant'), lines: p.applied, ...(n ? {} : {info: true})};
  persist(); render(); chatRender();
}

// A whole week proposed in the chat: same path as the weekend proposal.
function applyChatPlan(id) {
  const m = state.chat.find(x => x.id === id), p = m?.plan;
  if (!p || p.applied) return;
  if (applyWeekPlan(p.wk, {...p, by: 'ai'}, L('ассистент: ', 'assistant: ') + p.summary)) {
    p.applied = true;
    const pr = state.proposals[p.wk]; if (pr?.status === 'new') pr.status = 'replaced';
    persist(); render(); chatRender();
  }
}

/* ---------- plan: wizard, AI-built weeks, weekend proposals ---------- */
// A plan is the person's answers (goal, sports, time) plus a usual week (the template) built from them.
// Only one week ahead is ever laid out; on the weekend the assistant proposes the next one, and nothing changes until it's accepted.
const GOALS = {
  keep: ['Держать форму', 'Keep fit', 'Регулярно и без перегруза', 'Regular, no overload'],
  grow: ['Расти', 'Get fitter', 'Больше объёма или скорости — постепенно', 'More volume or speed, step by step'],
  event: ['Готовиться к старту', 'Train for an event', 'Забег, гонка, триатлон — к дате', 'A run, a race, a triathlon — by a date'],
  back: ['Вернуться после перерыва', 'Come back after a break', 'Мягко: после паузы, болезни или травмы', 'Gently: after a pause, illness or injury'],
};
const PLAN_SPORTS = ['run', 'bike', 'swim', 'gym', 'climb', 'hike'];
const TRI = ['run', 'bike', 'swim'];
const wiz = {step: 0, a: null, busy: false, ctrl: null, result: null, error: null, hint: ''};
const weekly = {busy: false};
const r1 = x => Math.round(x * 10) / 10;
const nextMonday = () => ymd(addDays(mondayOf(new Date()), 7));

function answersCtx(a) {
  return {goal: GOALS[a.goal]?.[0] || a.goal, ...(a.goal === 'event' ? {event: {date: a.eventDate || 'не указана', what: a.eventName || 'не указано'}} : {}),
    sports: a.sports.map(sp => SPORTS[sp][0]), sessions_per_week: a.days, hours_per_week: a.hours, ...(a.notes ? {notes: a.notes} : {})};
}
// Twelve weeks of Garmin, week by week, and each sport over the last eight: the base the plan starts from.
function histStats(weeks = 8) {
  const acts = (state.local.acts?.list || []).filter(a => trainingSport(a.sport)), mon = mondayOf(new Date());
  const from = ymd(addDays(mon, -7 * weeks)), to = ymd(mon);
  const xs = acts.filter(a => a.start.slice(0, 10) >= from && a.start.slice(0, 10) < to), by = {};
  for (const a of xs) {
    const b = by[a.sport] = by[a.sport] || {sessions: 0, min: 0, longest_min: 0, last: ''};
    b.sessions++; b.min += a.min; b.longest_min = Math.max(b.longest_min, a.min); if (a.start > b.last) b.last = a.start.slice(0, 10);
  }
  return {n: xs.length / weeks, hours: xs.reduce((t, a) => t + a.min, 0) / 60 / weeks, by};
}
function histCtx() {
  const acts = (state.local.acts?.list || []).filter(a => trainingSport(a.sport)), mon = mondayOf(new Date()), weeks = [];
  for (let k = 12; k >= 1; k--) {
    const w = ymd(addDays(mon, -7 * k)), e = ymd(addDays(mon, -7 * (k - 1)));
    const xs = acts.filter(a => a.start.slice(0, 10) >= w && a.start.slice(0, 10) < e), by = {};
    for (const a of xs) by[a.sport] = (by[a.sport] || 0) + a.min;
    weeks.push({monday: w, sessions: xs.length, hours: r1(xs.reduce((t, a) => t + a.min, 0) / 60), min_by_sport: by, longest_min: Math.max(0, ...xs.map(a => a.min))});
  }
  const st = histStats(8), st4 = histStats(4);
  return {garmin_linked: !!state.local.acts?.linked, cached_from: state.local.acts?.from || null, weeks,
    avg_8w: {sessions: r1(st.n), hours: r1(st.hours)}, avg_4w: {sessions: r1(st4.n), hours: r1(st4.hours)},
    by_sport_8w: Object.fromEntries(Object.entries(st.by).map(([k, v]) => [k, {sessions: v.sessions, avg_min: Math.round(v.min / v.sessions), longest_min: v.longest_min, last: v.last}]))};
}
// Make sure Garmin reaches back 12 weeks before a plan is built on it.
async function ensureHist12() {
  const a = state.local.acts, from = ymd(addDays(mondayOf(new Date()), -84));
  if (a?.linked && a.from && a.from > from) await loadHistory(from, a.from);
  else if (hkOn() && !a?.from) await loadHistory(from, ymd(new Date()));
}
function planContext(mode, t) {
  const p = state.prefs, cur = ymd(mondayOf(new Date()));
  const ctx = {
    today: {date: todayStr(), weekday: DAYS_RU[(new Date().getDay() + 6) % 7]},
    target: {monday: t.wk, from_day: DAYS_RU[t.from]},
    time: {weekdays: `${p.wdStart}–${p.wdEnd}`, weekends: `${p.weStart}–${p.weEnd}`, evening_from: p.evening, work: p.work ? `${p.workStart}–${p.workEnd} по будням` : 'не учитываю'},
    calendar_busy: busyCtx(t.wk),
    history: histCtx(),
    garmin_recent: garminCtx().recent_21d,
    pain: painCtx(),
    current_template: templateCtx(),
    zones: zonesCtx(),
  };
  if (mode === 'plan') ctx.answers = answersCtx(wiz.a);
  else {
    const weeksIn = state.plan.start ? Math.max(1, Math.round((parseYmd(t.wk) - parseYmd(state.plan.start)) / 6048e5) + 1) : null;
    ctx.plan = {...answersCtx(state.plan), summary: state.plan.summary, started: state.plan.start, weeks_in_plan: weeksIn, ...(state.plan.outlook ? {outlook: state.plan.outlook.headline, outlook_week: outlookWeek(t.wk) || 'прогноз закончился'} : {})};
    const w = state.weeks[cur];
    ctx.this_week = w ? {monday: cur, idea: w.planNote || null, sessions: w.sessions.map(s => sessCtx(s, cur)), extra_from_garmin: extras(cur, w).filter(a => trainingSport(a.sport)).map(a => ({date: a.start.slice(0, 10), sport: a.sport, min: a.min})), away: w.away || [], sick: w.sick || []} : 'не было плана';
  }
  return ctx;
}
// The model's week, in the app's shape. Days are 0–6, kinds are app kinds.
function planOf(ev) {
  return {summary: ev.summary, review: ev.review || '', rationale: ev.rationale || [], sessions: (ev.sessions || []).filter(x => KINDS[x.kind]), ...(ev.base ? {base: ev.base.filter(x => KINDS[x.kind])} : {}), ...(ev.outlook ? {outlook: ev.outlook} : {})};
}
async function aiPlan(mode, ctx, signal) {
  let plan = null, err = null;
  await aiStream({mode, context: ctx}, signal, ev => { if (ev.t === 'plan') plan = planOf(ev); else if (ev.t === 'error') err = ev.e; else if (ev.t === 'refusal') err = 'refusal'; });
  if (!plan || !plan.sessions.length) throw new Error(err || 'no_plan');
  return plan;
}

// Without the assistant (signed out, or no key on the server): a plain rules version from the same answers.
const DAYSETS = {1: [5], 2: [2, 5], 3: [1, 3, 5], 4: [1, 3, 5, 6], 5: [0, 1, 3, 5, 6], 6: [0, 1, 2, 3, 5, 6]};
function rulesPlan(a, t) {
  const sp = a.sports.length ? a.sports : ['run'], n = a.days, days = DAYSETS[n].slice();
  const hard = a.goal === 'grow' || a.goal === 'event';
  const easy = {run: 'run_easy', bike: 'bike_easy', swim: 'swim', gym: 'gym', climb: 'climb', hike: 'hike'};
  const kinds = [];
  const longK = sp.includes('bike') ? 'bike_long' : sp.includes('run') ? 'run_long' : sp.includes('hike') ? 'hike' : null;
  if (longK && n >= 2 && a.goal !== 'back') kinds.push(longK);
  // Every chosen sport once before any extras; then one quality session if the goal asks for it.
  for (const x of sp) if (kinds.length < n && !kinds.some(k => KINDS[k].sport === x)) kinds.push(easy[x]);
  if (hard && kinds.length < n) { const q = sp.includes('bike') ? 'bike_q' : sp.includes('run') ? 'run_q' : null; if (q) kinds.push(q); }
  const endur = sp.filter(x => x === 'run' || x === 'bike' || x === 'swim');
  for (let i = 0; kinds.length < n; i++) kinds.push(endur.length ? easy[endur[i % endur.length]] : easy[sp[i % sp.length]] === 'hike' ? 'mobility' : easy[sp[i % sp.length]]);
  const out = [], free = days.slice();
  const take = d => { free.splice(free.indexOf(d), 1); return d; };
  for (const k of kinds.slice().sort((x, y) => PRIORITY.indexOf(x) - PRIORITY.indexOf(y))) {
    let d;
    if (KINDS[k].weekend || k.endsWith('_long')) d = free.find(x => x >= 5) ?? free[free.length - 1];
    else if (KINDS[k].hard) d = free.find(x => x < 5 && !out.some(o => KINDS[o.kind].hard && Math.abs(o.day - x) < 2)) ?? free[0];
    else d = free.find(x => !out.some(o => KINDS[o.kind].impact && KINDS[k].impact && Math.abs(o.day - x) === 1)) ?? free[0];
    out.push({kind: k, day: take(d), tod: d >= 5 ? 'am' : 'pm', detail: '', key: k === longK || KINDS[k].hard});
  }
  const base = out.reduce((t, x) => t + KINDS[x.kind].min, 0);
  let f = Math.max(0.5, Math.min(1.5, a.hours * 60 / base));
  if (a.goal === 'back') f = Math.min(f, 0.8);
  for (const x of out) x.min = Math.round(Math.max(30, Math.min(300, KINDS[x.kind].min * f)) / 5) * 5;
  out.sort((x, y) => x.day - y.day);
  const names = sp.map(x => L(SPORTS[x][0], SPORTS[x][1]).toLowerCase()).join(', ');
  return {by: 'rules', summary: L(`${n} трен. в неделю, около ${fHours(out.reduce((t, x) => t + x.min, 0))}: ${names}`, `${n} sessions a week, about ${fHours(out.reduce((t, x) => t + x.min, 0))}: ${names}`),
    rationale: [L('Собрано по правилам, без ассистента: длинная — в выходные, тяжёлые не подряд', 'Built by rules, without the assistant: the long one on the weekend, hard days apart'),
      hard ? L('Одна тренировка качества, остальное — в лёгкой зоне', 'One quality session, the rest easy') : L('Всё в лёгкой зоне — объём важнее скорости', 'All easy — volume over speed')],
    base: out, sessions: out.filter(x => x.day >= t.from), target: t};
}

/* ---------- plan outlook: the long view — weekly hours by phase to the event (or 12 weeks), and a form line ---------- */
const PHASE = {
  base: ['База', 'Base'], build: ['Развитие', 'Build'], peak: ['Пик', 'Peak'], deload: ['Разгрузка', 'Easy week'],
  taper: ['Подводка', 'Taper'], race: ['Старт', 'Race'], keep: ['Поддержка', 'Maintain'], return: ['Возвращение', 'Return'],
};
// "Form" here is the ~6-week rolling weekly volume — the same smoothing CTL uses, on hours instead of TSS.
const FORM_K = 1 - Math.exp(-7 / 42);
const fH = h => fHours(h * 60);
const fDay = wk => parseYmd(wk).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {day: 'numeric', month: 'short'});
const weeksFrom = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 6048e5);
function eventWeeks(a, wk0) { return a.goal === 'event' && a.eventDate ? weeksFrom(wk0, ymd(mondayOf(parseYmd(a.eventDate)))) + 1 : 0; }
// The rules version of the outlook: used without the assistant, or when its outlook didn't come through.
function projectOutlook(a, h0, wk0) {
  const H = Math.max(1, a.hours), ev = eventWeeks(a, wk0), goal = ev >= 4 ? 'event' : a.goal === 'event' ? 'grow' : a.goal;
  const n = goal === 'event' ? Math.min(32, ev) : 12;
  const g = {keep: 1, grow: 1.06, event: 1.06, back: 1.1}[goal] || 1;
  const cap = goal === 'keep' ? h0 : goal === 'back' ? Math.max(H, h0) : Math.max(H, h0) * (goal === 'event' ? 1.3 : 1.2);
  const weeks = []; let lvl = Math.max(0.5, h0), back = 0;
  for (let i = 0; i < n; i++) {
    const left = goal === 'event' ? ev - 1 - i : 99;
    let phase, h = lvl;
    if (left === 0) { phase = 'race'; h = lvl * 0.5; }
    else if (left <= 2) { phase = 'taper'; h = lvl * (left === 2 ? 0.75 : 0.6); }
    else if (i % 4 === 3) { phase = 'deload'; h = lvl * 0.65; }
    else {
      phase = goal === 'keep' ? 'keep' : goal === 'back' ? (lvl >= H * 0.97 ? 'keep' : 'return') : goal === 'event' && left <= 5 ? 'peak' : i < Math.max(3, n * 0.35) ? 'base' : 'build';
      if (phase === 'return') back = i + 1;
      if (phase !== 'peak') lvl = Math.min(cap, lvl * g);
    }
    weeks.push({hours: Math.round(h * 2) / 2, phase});
  }
  const top = weeks.reduce((b, w, i) => w.hours > weeks[b].hours ? i : b, 0), at = i => ymd(addDays(parseYmd(wk0), 7 * i));
  const name = a.eventName || L('старт', 'the event');
  const headline = {
    keep: L(`Цель — держать форму, поэтому объём ровный, около ${fH(h0)} в неделю, и каждая 4-я неделя легче. Без рывков: форма держится на уровне последних недель.`, `The goal is to keep fit, so the volume stays level at about ${fH(h0)} a week, with every 4th week easier. No spikes: fitness holds where it’s been.`),
    grow: L(`Цель — расти, поэтому объём прибавляет ~6% в неделю до ~${fH(cap)}, а каждая 4-я неделя — разгрузочная: так рост держится без перегруза.`, `The goal is to get fitter, so the volume adds ~6% a week up to ~${fH(cap)}, and every 4th week is easy — growth without overload.`),
    event: L(`Цель — ${name}, ${fDay(a.eventDate || at(n - 1))}, поэтому ${n} нед.: база → развитие → пик, за 2 недели до старта — подводка.`, `The goal is ${name} on ${fDay(a.eventDate || at(n - 1))}, so ${n} weeks: base → build → peak, with a 2-week taper before the race.`),
    back: L(`Цель — вернуться, поэтому начинаем ниже прошлого уровня и плавно, без скачков, выходим к ~${fH(H)} в неделю${back ? ` — это ~${back} нед` : ""}.`, `The goal is to come back, so we start below your old level and build smoothly to ~${fH(H)} a week${back ? ` over ${back} weeks` : ''}.`),
  }[goal];
  const expect = [L(`Самая объёмная неделя — ${fH(weeks[top].hours)}, с ${fDay(at(top))}`, `Biggest week — ${fH(weeks[top].hours)}, from ${fDay(at(top))}`)];
  const easy = weeks.map((w, i) => w.phase === 'deload' ? fDay(at(i)) : null).filter(Boolean).slice(0, 3);
  if (easy.length) expect.push(L(`Лёгкие недели: ${easy.join(', ')} — и дальше каждая 4-я`, `Easy weeks: ${easy.join(', ')}, then every 4th`));
  if (goal === 'event') expect.push(L(`Подводка с ${fDay(at(Math.max(0, n - 3)))} — объём падает, свежесть растёт`, `Taper from ${fDay(at(Math.max(0, n - 3)))} — volume drops, freshness builds`));
  // What the rules version leans on: the same rulebook numbers the assistant cites.
  const nos = [1, 2, 71, 77];
  if (goal === 'event') nos.push(78);
  if (goal === 'back') nos.push(34);
  if (a.sports?.includes('gym')) nos.push(8);
  if (a.sports?.includes('run')) nos.push(69);
  const basis = nos.filter(no => BASIS[no]).map(no => ({no, why: L(BASIS[no].why[0], BASIS[no].why[1]), grade: BASIS[no].grade, sec: BASIS[no].sec}));
  return {headline, weeks, expect, basis, by: 'rules'};
}
function withOutlook(r, a) {
  if (!r.outlook) r.outlook = projectOutlook(a, planTotal(r.base?.length ? r.base : r.sessions) / 60, r.target.wk);
  return r;
}
// Where the plan says this week should be: hours and phase, or null past the horizon.
function outlookWeek(wk) {
  const o = state.plan?.outlook; if (!o || !state.plan.start) return null;
  const i = weeksFrom(state.plan.start, wk), w = o.weeks[i];
  return w ? {hours: w.hours, phase: w.phase, week: i + 1, of: o.weeks.length} : null;
}
function actualHours(wk) {
  const e = ymd(addDays(parseYmd(wk), 7));
  return (state.local.acts?.list || []).filter(a => trainingSport(a.sport) && a.start.slice(0, 10) >= wk && a.start.slice(0, 10) < e).reduce((t, a) => t + a.min, 0) / 60;
}
// Eight weeks of Garmin, then the plan's weeks. Past weeks are what happened; a thin tick shows what was planned.
function outlookChart(o, start, a) {
  const cur = ymd(mondayOf(new Date())), acts = state.local.acts, known = acts?.list?.length ? acts.from || '0000-00-00' : null;
  const rows = [];
  for (let wk = ymd(addDays(parseYmd(cur), -56)); ; wk = ymd(addDays(parseYmd(wk), 7))) {
    const i = weeksFrom(start, wk), plan = i >= 0 ? o.weeks[i] : null;
    if (i >= o.weeks.length) break;
    if (wk < cur || wk < start) { if (known && wk >= ymd(mondayOf(parseYmd(known)))) rows.push({wk, past: true, h: actualHours(wk), plan}); }
    else if (plan) rows.push({wk, past: false, h: plan.hours, plan});
  }
  if (!rows.some(r => !r.past)) return `<p class="hint">${L('Прогноз плана закончился — собери план заново, чтобы увидеть следующий отрезок.', 'The plan’s outlook has run out — rebuild the plan to see the next stretch.')}</p>`;
  const n = rows.length, max = Math.max(1, ...rows.map(r => Math.max(r.h, r.plan?.hours || 0))) * 1.08;
  let f = null; const form = [];
  const seed = rows.filter(r => r.past).slice(0, 4);
  f = seed.length ? seed.reduce((t, r) => t + r.h, 0) / seed.length : rows[0].h;
  for (const r of rows) { f += (r.h - f) * FORM_K; form.push(f); }
  const now = rows.findIndex(r => !r.past), f0 = now > 0 ? form[now - 1] : form[0], f1 = form[n - 1], last = rows[n - 1];
  const ph = r => r.plan ? L(PHASE[r.plan.phase][0], PHASE[r.plan.phase][1]) : '';
  const cols = rows.map((r, i) => {
    const cls = r.past ? 'past' : r.plan.phase === 'race' ? 'race' : r.plan.phase === 'deload' || r.plan.phase === 'taper' ? 'light' : 'plan';
    const read = `${L('Неделя с', 'Week of')} ${fDay(r.wk)}: ${r.past ? (r.plan ? '' : L('до плана · ', 'before the plan · ')) + L('факт', 'actual') + ' ' + fH(r.h) + (r.plan ? ` ${L('из', 'of')} ${fH(r.plan.hours)}` : '') : L('план', 'plan') + ' ' + fH(r.h)}${r.plan ? ' · ' + ph(r) : ''} · ${L('форма', 'form')} ${fH(form[i])}`;
    return `<span class="ol-col" data-r="${esc(read)}"><i class="${cls}" style="height:${(r.h / max * 100).toFixed(1)}%"></i>${r.past && r.plan ? `<b class="ol-tick" style="bottom:${(r.plan.hours / max * 100).toFixed(1)}%"></b>` : ''}</span>`;
  }).join('');
  // Phase strip: an easy week belongs to the stretch it sits in; Garmin weeks are one stretch.
  const segs = [];
  rows.forEach((r, i) => {
    const key = !r.plan ? 'before' : r.plan.phase === 'deload' && segs.length && segs[segs.length - 1].key !== 'before' ? segs[segs.length - 1].key : r.plan.phase;
    if (segs.length && segs[segs.length - 1].key === key) segs[segs.length - 1].n++; else segs.push({key, n: 1});
  });
  const strip = segs.map(s => { const name = s.key === 'before' ? L('до плана', 'before the plan') : L(PHASE[s.key][0], PHASE[s.key][1]); return `<span style="flex:${s.n}" title="${esc(name)}">${s.n >= 3 || (s.key === 'race') ? esc(s.key === 'race' ? '★' : name) : ''}</span>`; }).join('');
  const line = form.map((v, i) => `${i + 0.5},${(100 - v / max * 100).toFixed(1)}`).join(' ');
  const def = now > 0 ? L(`Форма ${fH(f0)} → ${fH(f1)} в неделю к ${fDay(last.wk)}`, `Form ${fH(f0)} → ${fH(f1)} a week by ${fDay(last.wk)}`) : L(`Форма к ${fDay(last.wk)} — ${fH(f1)} в неделю`, `Form by ${fDay(last.wk)} — ${fH(f1)} a week`);
  return `<figure class="ol" aria-label="${esc(def)}">
    <div class="ol-legend"><span><i class="sw past"></i>${L('факт из Garmin', 'actual (Garmin)')}</span><span><i class="sw plan"></i>${L('план', 'plan')}</span><span><i class="sw light"></i>${L('легче', 'easier')}</span><span><i class="sw line"></i>${L('форма — средний объём за ~6 нед.', 'form — ~6-week average volume')}</span></div>
    <div class="ol-plot"><span class="ol-max num">${fH(max / 1.08)}</span>${cols}<svg viewBox="0 0 ${n} 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${line}"/></svg>${now > 0 ? `<span class="ol-now" style="left:${(now / n * 100).toFixed(2)}%"><em>${L('сейчас', 'now')}</em></span>` : ''}</div>
    <div class="ol-strip">${strip}</div>
    <div class="ol-dates num"><span>${fDay(rows[0].wk)}</span><span>${last.plan?.phase === 'race' && a?.eventDate ? `${a.eventName ? esc(a.eventName) + ' · ' : ''}${fDay(a.eventDate)}` : fDay(last.wk)}</span></div>
    <p class="ol-read" data-d="${esc(def)}">${esc(def)}</p></figure>`;
}
function outlookHTML(o, start, a, open) {
  if (!o) return '';
  return `<p class="ol-head">${esc(o.headline)}</p>${outlookChart(o, start, a)}${o.expect?.length ? `<ul class="plan-why">${o.expect.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${basisHTML(o.basis, open)}`;
}

/* ---------- what the plan stands on: rulebook rules, their evidence grade, the key studies ---------- */
// Rule numbers are the rulebook's (apps/training/knowledge/reports, section 16). Sources come from the project's
// research notes; `why` is the rules version's own wording when the assistant isn't the one building the plan.
const BASIS = {
  1: {grade: 'A/B', sec: '§1.1', why: ['Большая часть объёма — лёгкая, немного темпа и интервалов: для любителя пирамида работает не хуже «80/20»', 'Most volume easy, some tempo and intervals: for amateurs a pyramid works as well as “80/20”'],
    src: [['Rosenblat et al. 2025, Sports Med — network meta-analysis', '10.1007/s40279-024-02149-3'], ['Seiler 2010, IJSPP', '10.1123/ijspp.5.3.276']]},
  2: {grade: 'C (на базе B)', sec: '§1.5', why: ['1–2 тяжёлые тренировки в неделю, между ними — лёгкие дни', '1–2 hard sessions a week, easy days between them'],
    src: [['Seiler 2010, IJSPP', '10.1123/ijspp.5.3.276'], ['Stöggl & Sperlich 2014, Front Physiol', '10.3389/fphys.2014.00033']]},
  3: {grade: 'B', sec: '§1.5', src: [['Stöggl & Sperlich 2014, Front Physiol', '10.3389/fphys.2014.00033']]},
  4: {grade: 'B', sec: '§1.1', src: [['Stöggl & Sperlich 2014, Front Physiol', '10.3389/fphys.2014.00033']]},
  5: {grade: 'B/C', sec: '§7.1–7.2', src: [['Etxebarria, Mujika & Pyne 2019, Sports', '10.3390/sports7050101']]},
  6: {grade: 'B/C', sec: '§7.1–7.2', src: [['Etxebarria, Mujika & Pyne 2019, Sports', '10.3390/sports7050101']]},
  8: {grade: 'A/B', sec: '§5.1–5.2', why: ['Зал остаётся в плане: тяжёлая силовая улучшает экономичность и снижает риск травм', 'The gym stays: heavy strength improves economy and lowers injury risk'],
    src: [['Rønnestad & Mujika 2014, Scand J Med Sci Sports', '10.1111/sms.12104'], ['Berryman et al. 2018, IJSPP', '10.1123/ijspp.2017-0032'], ['Lauersen et al. 2018, BJSM', '10.1136/bjsports-2018-099078']]},
  23: {grade: 'A/B', sec: '§1.3', src: [['Milanović et al. 2015, Sports Med — meta-analysis', '10.1007/s40279-015-0365-0']]},
  32: {grade: 'B', sec: '§1.3', src: [['Milanović et al. 2015, Sports Med — meta-analysis', '10.1007/s40279-015-0365-0']]},
  12: {grade: 'A/B', sec: '§10.4–10.5', src: [['Bélanger-Gravel et al. 2013, Health Psychol Rev — meta-analysis', '10.1080/17437199.2011.560095']]},
  34: {grade: 'A/B → C', sec: '§10.1', why: ['После перерыва — откат на шаг назад и rebuild, а не возврат к прежнему объёму', 'After a break, step back and rebuild instead of jumping to the old volume'],
    src: [['Zheng et al. 2022, Biomed Res Int — meta-analysis', '10.1155/2022/2130993']]},
  43: {grade: 'A/B', sec: '§10.5', src: [['Ntoumanis et al. 2021, Health Psychol Rev — meta-analysis', '10.1080/17437199.2020.1718529']]},
  69: {grade: 'B', sec: '§2.2', why: ['Пробежка не длиннее самой длинной за месяц больше чем на ~10% — главный предиктор беговых травм', 'No run more than ~10% longer than your longest this month — the main predictor of running injuries'],
    src: [['Frandsen et al. 2025, BJSM (Garmin-RUNSAFE, 5 205 бегунов)', null, 'https://researchportal.lih.lu/en/publications/how-much-running-is-too-much-identifying-high-risk-running-sessio/'], ['Buist et al. 2008, Am J Sports Med — RCT: «10% в неделю» не защищает', '10.1177/0363546507307505']]},
  70: {grade: 'B', sec: '§2.2', src: [['Nielsen et al. 2014, JOSPT', '10.2519/jospt.2014.5164']]},
  71: {grade: 'C', sec: '§9.2', why: ['Объём растёт плавно, в пределах +10–20% к среднему за 3–4 недели — это конвенция, не закон', 'Volume rises gently, within +10–20% of the 3–4-week average — a convention, not a law'],
    src: [['Nielsen et al. 2014, JOSPT', '10.2519/jospt.2014.5164']]},
  77: {grade: 'C [CONTESTED]', sec: '§9.3', why: ['Каждая 4-я неделя легче на 30–40%: распространённая практика, точная частота наукой не доказана', 'Every 4th week 30–40% easier: common practice, the exact rhythm isn’t proven'],
    src: [['Bell et al. 2023, Sports Med Open — Delphi consensus', '10.1186/s40798-023-00633-0']]},
  78: {grade: 'A', sec: '§9.4', why: ['Подводка ~2 недели: объём −40–60%, интенсивность и частота сохраняются', '~2-week taper: volume −40–60%, intensity and frequency kept'],
    src: [['Bosquet et al. 2007, MSSE — meta-analysis', '10.1249/mss.0b013e31806010e0']]},
  79: {grade: 'A', sec: '§5.1–5.2', src: [['Rønnestad & Mujika 2014, Scand J Med Sci Sports', '10.1111/sms.12104']]},
  81: {grade: 'A/B', sec: '§5.3', src: [['Schumann et al. 2022, Sports Med — meta-analysis', '10.1007/s40279-021-01587-7'], ['Petré et al. 2021, Sports Med — meta-analysis', '10.1007/s40279-021-01426-9']]},
};
const gradeShort = g => String(g || '').replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim();
const gradeKey = g => (String(g || '').trim()[0] || 'C').toUpperCase();
function basisHTML(list, open) {
  if (!list?.length) return '';
  const items = list.map(b => {
    const known = BASIS[b.no], g = b.grade || known?.grade || '', contested = /CONTESTED/.test(g), src = known?.src || [];
    return `<li><span class="grade g${gradeKey(g)}" title="${esc(g)}">${esc(gradeShort(g))}</span><div class="basis-t"><span>${esc(b.why)}${contested ? ` <em class="basis-flag">${L('спорно', 'contested')}</em>` : ''}</span>
      ${b.text ? `<span class="basis-rule">${L('Правило', 'Rule')} ${b.no}${b.sec ? ' · ' + esc(b.sec) : ''}: ${esc(b.text)}</span>` : `<span class="basis-rule">${L('Правило', 'Rule')} ${b.no}${b.sec || known?.sec ? ' · ' + esc(b.sec || known.sec) : ''}</span>`}
      ${src.length ? `<span class="basis-src">${src.map(([t, doi, url]) => `<a href="${esc(url || 'https://doi.org/' + doi)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</span>` : ''}</div></li>`;
  }).join('');
  return `<details class="basis" ${open ? 'open' : ''}><summary>${L('На чём основано', 'What this is based on')} <span class="muted">· ${list.length} ${L('правил из свода исследований', 'rules from the research rulebook')}</span></summary>
    <ul class="basis-list">${items}</ul>
    <p class="basis-legend"><b>A</b> — ${L('мета-анализы или несколько RCT', 'meta-analyses or several RCTs')} · <b>B</b> — ${L('один RCT или согласованные когортные данные', 'one RCT or consistent cohort data')} · <b>C</b> — ${L('консенсус экспертов, гайдлайн или практика', 'expert consensus, guideline or practice')}. ${L('«Спорно» — данные расходятся. Свод правил собран под любителей 30–45 лет по мета-анализам, RCT и консенсусам; приложение не ставит диагнозов и не принимает медицинских решений.', '“Contested” — the data disagree. The rulebook is built for amateurs aged 30–45 from meta-analyses, RCTs and consensus statements; the app makes no diagnoses or medical calls.')}</p></details>`;
}
function olShow(c) {
  const f = c.closest('.ol'); if (!f) return;
  f.querySelectorAll('.ol-col.on').forEach(x => x.classList.remove('on'));
  c.classList.add('on'); f.querySelector('.ol-read').textContent = c.dataset.r;
}
document.addEventListener('pointerover', ev => { const c = ev.target.closest?.('.ol-col'); if (c && ev.pointerType === 'mouse') olShow(c); });
document.addEventListener('pointerout', ev => {
  const p = ev.target.closest?.('.ol-plot'); if (!p || ev.pointerType !== 'mouse' || p.contains(ev.relatedTarget)) return;
  const f = p.closest('.ol'), r = f.querySelector('.ol-read');
  f.querySelectorAll('.ol-col.on').forEach(x => x.classList.remove('on')); r.textContent = r.dataset.d;
});

// Where a new plan starts: the rest of this week if it's Mon–Fri, otherwise next week.
function planTarget() {
  const cur = ymd(mondayOf(new Date())), ti = todayIdx(cur);
  return ti <= 4 ? {wk: cur, from: ti} : {wk: nextMonday(), from: 0};
}
function prefillAnswers() {
  if (state.plan) return {...state.plan, sports: state.plan.sports.slice()};
  const st = histStats(8), fromHist = PLAN_SPORTS.filter(sp => (st.by[sp]?.sessions || 0) >= 2);
  const sports = fromHist.length ? fromHist : [...new Set(state.template.map(t => KINDS[t.kind].sport))].filter(sp => PLAN_SPORTS.includes(sp));
  return {goal: null, sports, days: Math.max(2, Math.min(6, Math.round(st.n) || 3)), hours: st.n ? [2, 3, 4, 5, 6, 8, 10].reduce((b, h) => Math.abs(h - st.hours) < Math.abs(b - st.hours) ? h : b, 4) : 4, notes: '', eventDate: '', eventName: '', fromHist: fromHist.length > 0};
}
function openWizard() {
  wiz.step = 0; wiz.a = prefillAnswers(); wiz.result = null; wiz.error = null; wiz.busy = false;
  openSheet(wizHTML(), {wiz: true});
}
function wizRender() { if (sheetCtx?.wiz) { const sc = $('#sheetPanel .sheet-scroll')?.scrollTop || 0; $('#sheetPanel').innerHTML = wizHTML(); const n = $('#sheetPanel .sheet-scroll'); if (n && wiz.keepScroll) n.scrollTop = sc; wiz.keepScroll = false; } }
const planTotal = list => list.reduce((t, x) => t + x.min, 0);
function planRowsHTML(list) {
  const D = DAYS();
  return `<div class="plan-list">${list.slice().sort((x, y) => x.day - y.day).map(x => `<div class="plan-row"><span class="plan-day">${D[x.day]}</span><div class="plan-what"><span class="plan-name"><span class="dot ${KINDS[x.kind].sport}"></span>${esc(kName(x.kind))}${x.key ? `<span class="plan-key">${L('главная', 'key')}</span>` : ''}<span class="plan-min num">${fDur(x.min)}</span></span>${x.detail ? `<span class="plan-detail">${esc(hrText(x.detail))}</span>` : ''}</div></div>`).join('')}</div>`;
}
function wizHTML() {
  const a = wiz.a, st = wiz.step, steps = 3;
  const head = `<div class="sheet-head"><span>${st > 0 && !wiz.busy ? `<button class="nav-btn" data-a="wiz-back">${icon('left')}${L('Назад', 'Back')}</button>` : `<span class="wiz-title">${L('Собрать план', 'Build a plan')}</span>`}</span><button class="nav-btn" data-a="close-sheet">${L('Отмена', 'Cancel')}</button></div>`;
  const dots = st < steps ? `<div class="wiz-dots" aria-hidden="true">${[0, 1, 2].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>` : '';
  let body = '';
  if (st === 0) {
    body = `<h2 class="wiz-h">${L('Чего хочешь?', 'What’s the goal?')}</h2><div class="opts">${Object.entries(GOALS).map(([k, g]) => `<button class="opt" data-a="wiz-goal" data-g="${k}" aria-pressed="${a.goal === k}"><b>${esc(L(g[0], g[1]))}</b><span>${esc(L(g[2], g[3]))}</span></button>`).join('')}</div>`;
    if (a.goal === 'event') body += `<div class="wiz-row"><label class="field">${L('Что за старт', 'Which event')}<input data-wiz="eventName" value="${esc(a.eventName)}" placeholder="${L('70.3, полумарафон, гранфондо…', '70.3, half marathon, gran fondo…')}"></label><label class="field">${L('Когда', 'When')}<input data-wiz="eventDate" type="date" value="${esc(a.eventDate)}" min="${todayStr()}"></label></div>`;
    body += `<div class="stack wiz-go"><button class="btn primary" data-a="wiz-next" ${a.goal ? '' : 'disabled'}>${L('Дальше', 'Next')}</button></div>`;
  } else if (st === 1) {
    const tri = TRI.every(x => a.sports.includes(x));
    body = `<h2 class="wiz-h">${L('Какой спорт?', 'Which sports?')}</h2><p class="hint">${a.fromHist && !state.plan ? L('Отметил то, что было в Garmin за 8 недель. Можно несколько — получится комбо.', 'Picked what Garmin shows for 8 weeks. Pick several for a mix.') : L('Можно несколько — получится комбо.', 'Pick several for a mix.')}</p>
      <div class="chips-row wrap"><button class="chip" data-a="wiz-tri" aria-pressed="${tri}">${L('Триатлон', 'Triathlon')}</button>${PLAN_SPORTS.map(sp => `<button class="chip sport-chip" data-a="wiz-sport" data-s="${sp}" aria-pressed="${a.sports.includes(sp)}"><span class="dot ${sp}"></span>${esc(L(SPORTS[sp][0], SPORTS[sp][1]))}</button>`).join('')}</div>
      <div class="stack wiz-go"><button class="btn primary" data-a="wiz-next" ${a.sports.length ? '' : 'disabled'}>${L('Дальше', 'Next')}</button></div>`;
  } else if (st === 2) {
    const s8 = histStats(8);
    body = `<h2 class="wiz-h">${L('Сколько времени?', 'How much time?')}</h2>${state.local.acts?.list?.length ? `<p class="hint">${L(`Последние 8 недель: в среднем ${r1(s8.n).toLocaleString('ru-RU')} трен. и ${fHours(s8.hours * 60)} в неделю.`, `Last 8 weeks: on average ${r1(s8.n)} sessions and ${fHours(s8.hours * 60)} a week.`)}</p>` : ''}
      <div class="section-title">${L('Тренировок в неделю', 'Sessions a week')}</div><div class="seg">${[1, 2, 3, 4, 5, 6].map(n => `<button data-a="wiz-days" data-n="${n}" aria-pressed="${a.days === n}">${n}</button>`).join('')}</div>
      <div class="section-title">${L('Часов в неделю', 'Hours a week')}</div><div class="chips-row wrap">${[2, 3, 4, 5, 6, 8, 10].map(h => `<button class="chip" data-a="wiz-hours" data-h="${h}" aria-pressed="${a.hours === h}">${h === 10 ? '10+' : h}${L(' ч', ' h')}</button>`).join('')}</div>
      <div class="section-title">${L('Что учесть', 'Anything to know')}</div><textarea class="wiz-notes" data-wiz="notes" rows="3" placeholder="${L('Травмы, любимые дни, длинная с друзьями в субботу…', 'Injuries, favourite days, Saturday group ride…')}">${esc(a.notes)}</textarea>
      <div class="stack wiz-go"><button class="btn primary" data-a="wiz-build">${L('Собрать план', 'Build the plan')}</button>
      <p class="hint" style="text-align:center">${cloud.ai ? L('Ассистент посмотрит тренировки за 12 недель, боль и календарь', 'The assistant looks at 12 weeks of workouts, pain and your calendar') : L('Соберу по правилам. Войди — и план соберёт ассистент по твоей истории', 'I’ll build it by rules. Sign in and the assistant will use your history')}</p></div>`;
  } else {
    const r = wiz.result;
    if (wiz.busy) body = `<div class="wiz-wait"><div class="typing"><i></i><i></i><i></i></div><b>${L('Собираю план', 'Building your plan')}</b><span class="hint">${esc(wiz.hint || L('Смотрю на твои тренировки и календарь…', 'Looking at your workouts and calendar…'))}</span></div>`;
    else if (wiz.error) body = `<div class="wiz-wait"><b>${esc(chatErr(wiz.error))}</b><div class="stack" style="width:100%;padding-top:12px"><button class="btn primary" data-a="wiz-build">${L('Попробовать ещё раз', 'Try again')}</button><button class="btn quiet" data-a="wiz-rules">${L('Собрать по правилам', 'Build by rules instead')}</button></div></div>`;
    else if (r) {
      const t = r.target, same = r.base && t.from === 0 && r.base.length === r.sessions.length;
      body = `<div class="section-title" style="padding-top:0">${L('Куда идём', 'Where this goes')}</div>${outlookHTML(r.outlook, t.wk, wiz.a, true)}
        <div class="section-title">${t.wk === ymd(mondayOf(new Date())) ? L('Эта неделя', 'This week') : L('Следующая неделя', 'Next week')} · ${esc(weekTitle(t.wk))}<span class="plan-total num">${fHours(planTotal(r.sessions))}</span></div><p class="plan-sum">${esc(r.summary)}</p>${r.rationale.length ? `<ul class="plan-why">${r.rationale.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${r.sessions.length ? planRowsHTML(r.sessions) : `<p class="hint">${L('На эту неделю ничего — начнём с понедельника', 'Nothing this week — we start on Monday')}</p>`}
        ${r.base && !same ? `<details class="plan-base"><summary>${L('Обычная неделя', 'Usual week')} <span class="num muted">${fHours(planTotal(r.base))}</span></summary>${planRowsHTML(r.base)}</details>` : ''}
        <p class="hint" style="padding-top:12px">${L('Дальше раз в неделю, в выходные, ассистент предложит следующую неделю — по тому, как прошла эта. Время подберу по календарю.', 'Every weekend the assistant proposes the next week, based on how this one went. Times come from your calendar.')}</p>
        <div class="stack wiz-go"><button class="btn primary" data-a="wiz-accept">${L('Принять план', 'Accept the plan')}</button><button class="btn quiet" data-a="wiz-edit">${L('Изменить ответы', 'Change answers')}</button></div>`;
    }
  }
  return head + `<div class="sheet-scroll wiz">${dots}${body}</div>`;
}
async function buildPlan(rules) {
  const t = planTarget();
  wiz.step = 3; wiz.result = null; wiz.error = null;
  if (rules || !cloud.ai) { wiz.result = withOutlook(rulesPlan(wiz.a, t), wiz.a); return wizRender(); }
  wiz.busy = true; wiz.hint = ''; wiz.ctrl = new AbortController(); wizRender();
  try {
    wiz.hint = L('Подтягиваю историю Garmin за 12 недель…', 'Pulling 12 weeks of Garmin history…'); wizRender();
    await ensureHist12();
    if (cloud.cals?.length) { wiz.hint = L('Смотрю календарь…', 'Checking your calendar…'); wizRender(); await loadBusy(t.wk); }
    wiz.hint = L('Ассистент думает — обычно до минуты', 'The assistant is thinking — usually under a minute'); wizRender();
    const p = await aiPlan('plan', planContext('plan', t), wiz.ctrl.signal);
    wiz.result = withOutlook({...p, by: 'ai', sessions: p.sessions.filter(x => x.day >= t.from), target: t}, wiz.a);
  } catch (e) {
    wiz.error = e.name === 'AbortError' ? 'stopped' : !navigator.onLine ? 'network' : (e.message || 'failed');
  } finally { wiz.busy = false; wiz.ctrl = null; wizRender(); }
}
function acceptPlan() {
  const r = wiz.result; if (!r) return;
  const a = wiz.a, t = r.target;
  const prev = JSON.stringify({plan: state.plan, template: state.template, asks: state.asks, planSkip: state.planSkip || null, prop: state.proposals[t.wk] || null});
  state.plan = {goal: a.goal, sports: a.sports, days: a.days, hours: a.hours, notes: a.notes, eventDate: a.eventDate, eventName: a.eventName, at: isoNow(), by: r.by, summary: r.summary, rationale: r.rationale, start: t.wk, outlook: r.outlook};
  if (r.base?.length) state.template = r.base.map(x => ({id: 't-' + rid(), kind: x.kind, day: x.day, tod: x.tod, min: x.min, anchor: false, note: '', ...(x.detail ? {detail: x.detail} : {}), ...(x.key ? {key: true} : {})}));
  // The sports were just chosen: no "4 weeks without…" questions about them for a month.
  state.asks = Object.fromEntries(a.sports.map(sp => [sp, {c: 'keep', at: todayStr()}]));
  delete state.planSkip;
  state.proposals[t.wk] = {status: 'applied', at: isoNow(), by: 'wizard'};
  closeSheet();
  // Undoing «new plan» brings back the old plan and usual week too, not just this week's sessions.
  if (applyWeekPlan(t.wk, r, L('новый план', 'new plan'))) { state.weeks[t.wk].log[0].planPrev = prev; persist(); }
}
// Lays a whole week out from a list of sessions: what's done or already behind stays, the rest is replaced.
// One entry in the change history, so one undo brings the old week back.
function applyWeekPlan(wk, p, text) {
  view.v = 'week'; view.wk = wk;
  const week = ensureWeek(wk);
  if (!week) { toast(L('Эта неделя уже прошла', 'This week is over')); return false; }
  const ti = todayIdx(wk), before = snapshot(week);
  const keep = week.sessions.filter(s => s.status !== 'planned' || (s.day != null && s.day < ti));
  const add = p.sessions.filter(x => x.day >= Math.max(ti, 0)).map((x, i) => newSession({id: 'p' + i, kind: x.kind, min: x.min, day: x.day, tod: x.tod, anchor: false, note: '', detail: x.detail, key: x.key}));
  week.sessions = [...keep, ...add];
  week.planBy = p.by || 'ai'; week.planNote = p.summary;
  const guardLines = guard(wk, week);
  place(wk, week, {fresh: true});
  matchActs(wk, week);
  const D = DAYS();
  commit(wk, week, before, text, [p.summary, ...guardLines, ...add.map(s => s.day != null ? `${D[s.day]}${s.start != null ? ' ' + hm(s.start) : ''}: ${kName(s.kind)}, ${fDur(s.min)}` : L(`${kName(s.kind)}: ${whyText(s.why)}`, `${kName(s.kind)}: ${whyText(s.why)}`))]);
  scrollTo({top: 0, behavior: 'smooth'});
  return true;
}

// Weekend: the assistant drafts next week once (any device), the person accepts, discusses or keeps the usual week.
function weeklyDue() {
  if (state.pause || !state.plan || !cloud.ai || !cloud.user || weekly.busy) return null;
  if ((new Date().getDay() + 6) % 7 < 5) return null;
  const wk = nextMonday(), p = state.proposals[wk];
  if (state.weeks[wk]?.planBy) return null;
  if (!p) return wk;
  const age = Date.now() - Date.parse(p.at);
  return (p.status === 'error' && age > 3600e3) || (p.status === 'pending' && age > 600e3) ? wk : null;
}
async function maybeWeekly() { const wk = weeklyDue(); if (wk) await makeWeekly(wk); }
async function makeWeekly(wk) {
  if (weekly.busy) return;
  weekly.busy = true;
  state.proposals[wk] = {status: 'pending', at: isoNow()}; persist(); render();
  try {
    await ensureHist12();
    if (cloud.cals?.length) await loadBusy(wk);
    const p = await aiPlan('week', planContext('week', {wk, from: 0}));
    state.proposals[wk] = {status: 'new', at: isoNow(), wk, ...p};
  } catch (e) {
    state.proposals[wk] = {status: 'error', at: isoNow(), error: !navigator.onLine ? 'network' : (e.message || 'failed')};
  } finally {
    weekly.busy = false; persist(); render();
    if (sheetCtx?.prop === wk) proposalSheet(wk);
  }
}
function proposalSheet(wk) {
  const p = state.proposals[wk]; if (!p) return;
  let body;
  if (p.status === 'pending') body = `<div class="wiz-wait"><div class="typing"><i></i><i></i><i></i></div><b>${L('Ассистент собирает неделю', 'The assistant is building the week')}</b><span class="hint">${L('Обычно до минуты', 'Usually under a minute')}</span></div>`;
  else if (p.status === 'error') body = `<div class="wiz-wait"><b>${esc(chatErr(p.error))}</b><div class="stack" style="width:100%;padding-top:12px"><button class="btn primary" data-a="weekly-make" data-wk="${wk}">${L('Попробовать ещё раз', 'Try again')}</button></div></div>`;
  else body = `${p.review ? `<p class="plan-review">${esc(p.review)}</p>` : ''}<h2 class="wiz-h">${esc(p.summary)}</h2>${p.rationale?.length ? `<ul class="plan-why">${p.rationale.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="section-title">${esc(weekTitle(wk))}<span class="plan-total num">${fHours(planTotal(p.sessions))}</span></div>${planRowsHTML(p.sessions)}
    ${p.status === 'new' ? `<div class="stack wiz-go"><button class="btn primary" data-a="prop-accept" data-wk="${wk}">${L('Принять неделю', 'Accept the week')}</button><button class="btn quiet" data-a="prop-chat" data-wk="${wk}">${L('Обсудить с ассистентом', 'Discuss with the assistant')}</button><button class="btn quiet" data-a="prop-dismiss" data-wk="${wk}">${L('Оставить обычную неделю', 'Keep the usual week')}</button></div>`
      : `<p class="hint" style="padding-top:12px">${p.status === 'applied' ? L('Принято', 'Accepted') : p.status === 'replaced' ? L('Заменено неделей из чата', 'Replaced by a week from the chat') : L('Оставил обычную неделю', 'Kept the usual week')}</p>`}`;
  openSheet(`<div class="sheet-head"><span class="wiz-title">${L('Следующая неделя', 'Next week')}</span><button class="nav-btn strong" data-a="close-sheet">${L('Готово', 'Done')}</button></div><div class="sheet-scroll wiz">${body}</div>`, {prop: wk});
}
function acceptProposal(wk) {
  const p = state.proposals[wk]; if (!p || p.status !== 'new') return;
  closeSheet();
  if (applyWeekPlan(wk, {...p, by: 'ai'}, L('план недели от ассистента', 'assistant’s week plan'))) { p.status = 'applied'; state.weeks[wk].log[0].prop = true; persist(); }
}
// The plan's cards on the week screen: build a plan (once), next week's proposal, or a manual "build this week".
function planCardsHTML(wk) {
  const cur = ymd(mondayOf(new Date())), nwk = nextMonday();
  if (!state.plan) {
    if (state.planSkip || wk < cur) return '';
    return `<section class="card plan-cta"><h3>${L('Собери план под себя', 'Build a plan that fits you')}</h3><p>${cloud.ai ? L('Цель, спорт и время — ассистент соберёт неделю по твоим тренировкам из Garmin, а по выходным будет предлагать следующую.', 'Goal, sports and time — the assistant builds a week from your Garmin workouts and proposes the next one every weekend.') : L('Цель, спорт и время — и неделя соберётся сама. С ассистентом — по твоей истории тренировок.', 'Goal, sports and time — and the week builds itself. With the assistant, from your workout history.')}</p>
      <div class="acts"><button class="btn sm primary" data-a="plan-open">${L('Собрать план', 'Build a plan')}</button><button class="btn sm quiet" data-a="plan-skip">${L('Не сейчас', 'Not now')}</button></div></section>`;
  }
  if (wk !== cur && wk !== nwk) return '';
  const p = state.proposals[nwk];
  if (p?.status === 'new') return `<button class="card plan-prop" data-a="prop-open" data-wk="${nwk}"><span class="plan-prop-eyebrow">${L('План на следующую неделю', 'Next week’s plan')}</span><b>${esc(p.summary)}</b><span class="muted">${p.sessions.length} ${L('трен.', 'sessions')} · ${fHours(planTotal(p.sessions))}</span><span class="nudge-go">${L('Посмотреть', 'Review')} ›</span></button>`;
  if (p?.status === 'pending') return `<div class="nudge quiet-nudge"><span>${L('Ассистент собирает план на следующую неделю…', 'The assistant is drafting next week…')}</span></div>`;
  if (p?.status === 'error') return `<button class="nudge" data-a="weekly-make" data-wk="${nwk}"><span>${L('План на следующую неделю не собрался', 'Next week’s plan didn’t come together')}</span><span class="nudge-go">${L('Повторить', 'Retry')} ›</span></button>`;
  if (wk === nwk && cloud.ai && !state.weeks[nwk]?.planBy && !p) return `<button class="nudge" data-a="weekly-make" data-wk="${nwk}"><span>${L('Собрать эту неделю с ассистентом — по тому, как идёт текущая', 'Have the assistant build this week from how the current one is going')}</span><span class="nudge-go">${L('Собрать', 'Build')} ›</span></button>`;
  return '';
}
function planSettingsHTML() {
  const p = state.plan;
  let h = `<div class="section-title">${L('План', 'Plan')}</div><div class="list">`;
  if (p) h += `<button class="row" data-a="program"><span class="t"><b>${esc(L(GOALS[p.goal]?.[0] || '', GOALS[p.goal]?.[1] || ''))}${p.goal === 'event' && p.eventName ? ' · ' + esc(p.eventName) : ''}</b><span>${esc(p.sports.map(sp => L(SPORTS[sp][0], SPORTS[sp][1])).join(', '))} · ${p.days} ${L('в неделю', 'a week')} · ~${p.hours}${L(' ч', ' h')}</span></span><span class="nudge-go">${L('Программа', 'Program')} ›</span></button>`;
  else h += `<div class="row"><span class="t"><b>${L('Плана нет', 'No plan')}</b><span>${L('Недели собираются из обычной недели', 'Weeks come from the usual week')}</span></span></div>`;
  return h + `</div><div class="stack set-actions"><button class="btn ${p ? 'link' : 'primary'}" data-a="plan-open">${p ? L('Собрать план заново', 'Rebuild the plan') : L('Собрать план', 'Build a plan')}</button></div>`;
}

/* ---------- onboarding: account by invite → calendar → Garmin → time → health → the plan wizard ---------- */
// Joining takes an invite code (the server checks it); an account from the gym app joins by redeeming one.
// The step survives a reload (Google's consent screen leaves the page), so connecting Google resumes where it left.
const ONB_STEPS = ['hello', 'account', 'calendar', 'garmin', 'time', 'health'];
const ONB_KEY = 'train.onb';
const onb = {step: 'hello', mode: 'join', busy: false, err: '', code: '', health: null};
const inviteFromUrl = (() => { try { return (new URLSearchParams(location.search).get('invite') || '').trim().toUpperCase(); } catch { return ''; } })();
const onbSaved = () => { try { return localStorage.getItem(ONB_KEY); } catch { return null; } };
function openOnboarding(step) {
  onb.step = step || (!cloud.user ? 'hello' : cloud.me && !cloud.me.member ? 'code' : 'calendar');
  onb.err = ''; onb.busy = false; onb.code = onb.code || inviteFromUrl;
  if (onb.code && onb.step === 'hello') onb.mode = 'join';
  onb.health = state.health?.track ? 'yes' : null;
  openSheet(onbHTML(), {onb: true});
  try { localStorage.setItem(ONB_KEY, onb.step); } catch {}
}
function onbRender() {
  if (!sheetCtx?.onb) return;
  $('#sheetPanel').innerHTML = onbHTML();
  try { localStorage.setItem(ONB_KEY, onb.step); } catch {}
}
function onbGo(step) { onb.step = step; onb.err = ''; onb.busy = false; onbRender(); $('#sheetPanel .sheet-scroll')?.scrollTo(0, 0); }
function onbFinish(toWizard) {
  state.onboard = {done: true, at: isoNow()}; persist();
  try { localStorage.removeItem(ONB_KEY); } catch {}
  closeSheet(); render();
  if (toWizard && !state.plan) setTimeout(openWizard, 250);
}
const onbErr = e => ({
  bad_email: L('Проверь почту', 'Check the email'), weak_password: L('Пароль — минимум 8 символов', 'Password: at least 8 characters'),
  bad_code: L('Код не подошёл: неверный или уже использован', 'That code didn’t work: wrong or already used'),
  email_taken: L('Аккаунт с этой почтой уже есть — войди, и код можно будет ввести после входа', 'There’s already an account with this email — sign in, then enter the code'),
  wrong: L('Неверная почта или пароль', 'Wrong email or password'), bad_key: L('Это не похоже на ключ — скопируй его целиком', 'That doesn’t look like a key — copy all of it'),
  key_rejected: L('Garmin не принял ключ: проверь, что он скопирован целиком и не истёк', 'Garmin rejected the key: check it’s complete and not expired'),
  garmin_unavailable: L('Garmin сейчас не отвечает — попробуй позже', 'Garmin isn’t answering — try later'),
  health_denied: L('Доступ к Здоровью не выдан. Включи: Настройки iPhone → Здоровье → Доступ к данным → Неделя', 'No access to Health. Turn it on: iPhone Settings → Health → Data Access → Week'),
  health_unavailable: L('Apple Health недоступно на этом устройстве', 'Apple Health isn’t available on this device'),
}[e] || L('Не получилось — проверь сеть и попробуй ещё раз', 'Didn’t work — check the connection and try again'));

function onbHTML() {
  const st = onb.step, i = ONB_STEPS.indexOf(st === 'code' ? 'account' : st);
  const head = `<div class="sheet-head"><span>${i > 1 && !onb.busy ? `<button class="nav-btn" data-a="onb-go" data-s="${ONB_STEPS[i - 1]}">${icon('left')}${L('Назад', 'Back')}</button>` : `<span class="wiz-title">${L('Неделя', 'Week')}</span>`}</span>${st === 'hello' || !cloud.user ? `<button class="nav-btn" data-a="onb-skip">${L('Закрыть', 'Close')}</button>` : `<button class="nav-btn" data-a="onb-later">${L('Позже', 'Later')}</button>`}</div>`;
  const dots = i > 0 ? `<div class="wiz-dots" aria-hidden="true">${ONB_STEPS.slice(1).map((_, k) => `<i class="${k < i ? 'on' : ''}"></i>`).join('')}</div>` : '';
  const err = onb.err ? `<p class="onb-err" role="alert">${esc(onbErr(onb.err))}</p>` : '';
  const dis = onb.busy ? 'disabled' : '';
  let b = '';
  if (st === 'hello') {
    b = `<h2 class="wiz-h">${L('Тренировки, которые помещаются в жизнь', 'Training that fits around your life')}</h2>
      <ul class="onb-points">
        <li>${icon('calendar')}<span><b>${L('Читает твой календарь', 'Reads your calendar')}</b>${L('и ставит тренировки в свободные окна. Сорвался день — переставит сама.', 'and puts sessions into free slots. A day falls apart — it reshuffles.')}</span></li>
        <li>${icon('check')}<span><b>${L('Garmin отмечает сделанное', 'Garmin marks what’s done')}</b>${L('— ничего не нужно вписывать руками.', '— nothing to log by hand.')}</span></li>
        <li>${icon('spark')}<span><b>${L('Ассистент собирает неделю', 'An assistant builds the week')}</b>${L('по твоей истории и своду исследований, а по выходным предлагает следующую.', 'from your history and a research rulebook, and proposes the next one every weekend.')}</span></li>
      </ul>
      <div class="stack wiz-go"><button class="btn primary" data-a="onb-mode" data-m="join">${onb.code ? L('Присоединиться по приглашению', 'Join with the invite') : L('У меня есть инвайт-код', 'I have an invite code')}</button>
      <button class="btn quiet" data-a="onb-mode" data-m="in">${L('Уже есть аккаунт', 'I already have an account')}</button>
      <button class="btn link" data-a="onb-skip">${L('Посмотреть без аккаунта', 'Look around without an account')}</button></div>`;
  } else if (st === 'account') {
    const join = onb.mode === 'join';
    b = `<h2 class="wiz-h">${join ? L('Создай аккаунт', 'Create your account') : L('Вход', 'Sign in')}</h2>
      <p class="hint">${join ? L('Аккаунт общий с «Залом». План и настройки синхронизируются между устройствами.', 'The account is shared with the gym app. Your plan and settings sync across devices.') : L('Тот же аккаунт, что в «Зале».', 'The same account as the gym app.')}</p>
      <form id="onbAccount" class="stack" style="padding-top:8px">
        <label class="field">${L('Почта', 'Email')}<input id="onbEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off" required></label>
        <label class="field">${L('Пароль', 'Password')}<input id="onbPw" type="password" autocomplete="${join ? 'new-password' : 'current-password'}" minlength="8" required>${join ? `<span class="field-hint">${L('Минимум 8 символов', 'At least 8 characters')}</span>` : ''}</label>
        ${join ? `<label class="field">${L('Инвайт-код', 'Invite code')}<input id="onbCode" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(onb.code)}" required></label>` : ''}
        ${err}<button class="btn primary" type="submit" ${dis}>${onb.busy ? L('Секунду…', 'One moment…') : join ? L('Создать аккаунт', 'Create account') : L('Войти', 'Sign in')}</button></form>
      <div class="stack" style="padding-top:8px"><button class="btn link" data-a="onb-mode" data-m="${join ? 'in' : 'join'}">${join ? L('Уже есть аккаунт — войти', 'Already have an account — sign in') : L('Нет аккаунта — создать по инвайту', 'No account — join with an invite')}</button></div>`;
  } else if (st === 'code') {
    b = `<h2 class="wiz-h">${L('Нужен инвайт-код', 'You need an invite code')}</h2>
      <p class="hint">${L(`Ты вошёл как ${cloud.user?.email || ''}. «Неделя» пока открыта по приглашениям — введи код, и подключим календарь, Garmin и ассистента.`, `You’re signed in as ${cloud.user?.email || ''}. The app is invite-only for now — enter a code to connect your calendar, Garmin and the assistant.`)}</p>
      <form id="onbRedeem" class="stack" style="padding-top:8px"><label class="field">${L('Инвайт-код', 'Invite code')}<input id="onbCode" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(onb.code)}" required></label>
      ${err}<button class="btn primary" type="submit" ${dis}>${onb.busy ? L('Проверяю…', 'Checking…') : L('Продолжить', 'Continue')}</button></form>`;
  } else if (st === 'calendar') {
    const cals = cloud.cals || [];
    b = `<h2 class="wiz-h">${L('Подключи календарь', 'Connect your calendar')}</h2>
      <p class="hint">${L('Приложение смотрит только, когда ты занят, и ставит тренировки в окна между встречами. Календарь оно не меняет.', 'The app only looks at when you’re busy and fits sessions between events. It never changes your calendar.')}</p>
      ${cals.length ? `<div class="list" style="margin:12px 0">${cals.map(c => `<div class="row"><span class="t"><b>${esc(c.label)}</b><span>${L('Подключён', 'Connected')}</span></span></div>`).join('')}</div>` : ''}
      <div class="stack" style="padding-top:8px">${cloud.google && !NATIVE ? `<button class="btn ${cals.length ? 'quiet' : 'primary'}" data-a="google" ${cloud.calBusy ? 'disabled' : ''}>${L('Подключить Google Календарь', 'Connect Google Calendar')}</button>
        <p class="hint">${L('Google может показать «приложение не проверено» — оно в бете: «Дополнительно» → «Перейти».', 'Google may say the app isn’t verified — it’s in beta: Advanced → Go to app.')}</p>` : ''}</div>
      <details class="onb-more" ${cloud.google && !NATIVE ? "" : "open"}><summary>${L('Apple, Outlook или рабочий — по ссылке iCal', 'Apple, Outlook or work — by iCal link')}</summary>
        <p class="hint">${L('Apple: Календарь на Mac → правый клик по календарю → «Поделиться» → публичный, скопируй ссылку. Outlook: Настройки → Календарь → Общие календари → «Опубликовать» → ICS. Google: Настройки → календарь → «Секретный адрес в формате iCal».', 'Apple: Calendar on a Mac → right-click the calendar → Share → Public, copy the link. Outlook: Settings → Calendar → Shared calendars → Publish → ICS. Google: Settings → your calendar → Secret address in iCal format.')}</p>
        <form id="onbCal" class="stack"><label class="field">${L('Ссылка iCal (.ics)', 'iCal link (.ics)')}<input id="onbCalUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…/basic.ics" required></label>
        <button class="btn quiet" type="submit" ${cloud.calBusy ? 'disabled' : ''}>${cloud.calBusy ? L('Проверяю…', 'Checking…') : L('Подключить по ссылке', 'Connect by link')}</button></form></details>
      <div class="stack wiz-go"><button class="btn ${cals.length ? 'primary' : 'quiet'}" data-a="onb-go" data-s="garmin">${cals.length ? L('Дальше', 'Next') : L('Без календаря — дальше', 'Skip the calendar')}</button></div>`;
  } else if (st === 'garmin' && NATIVE && !cloud.me?.garmin?.linked) {
    const a = state.local.acts, on = hkOn();
    b = `<h2 class="wiz-h">${L('Откуда брать тренировки', 'Where your workouts come from')}</h2>`;
    if (on) b += `<p class="hint">${L('Apple Health подключено.', 'Apple Health is connected.')} ${a?.list ? L(`Тренировок за последние 4 недели: ${a.list.filter(x => trainingSport(x.sport)).length}.`, `Workouts in the last 4 weeks: ${a.list.filter(x => trainingSport(x.sport)).length}.`) : ''} ${a?.list?.length ? '' : L('Пусто? Включи запись в Здоровье в приложении часов: Garmin Connect → Настройки → Приложения → Apple Здоровье.', 'Empty? Turn on writing to Health in your watch app: Garmin Connect → Settings → Connected apps → Apple Health.')}</p>
      <div class="stack wiz-go"><button class="btn primary" data-a="onb-go" data-s="time">${L('Дальше', 'Next')}</button></div>`;
    else b += `<p class="hint">${L('Garmin, Apple Watch, COROS и Wahoo пишут тренировки в Здоровье — «Неделя» прочитает их оттуда. Только чтение, данные остаются на телефоне.', 'Garmin, Apple Watch, COROS and Wahoo write workouts to Apple Health — Week reads them from there. Read-only, the data stays on your phone.')}</p>
      ${err}<div class="stack wiz-go"><button class="btn primary" data-a="onb-health-connect" ${dis}>${onb.busy ? L('Подключаю…', 'Connecting…') : L('Подключить Apple Health', 'Connect Apple Health')}</button></div>
      <p class="hint" style="padding-top:8px">${L('Для Garmin: в Garmin Connect → Настройки → Приложения → Apple Здоровье включи запись тренировок.', 'For Garmin: Garmin Connect → Settings → Connected apps → Apple Health, turn on workouts.')}</p>
      <details class="onb-more"><summary>${L('Без Apple Health — личный ключ Garmin', 'No Apple Health — a personal Garmin key')}</summary>
        <ol class="onb-steps"><li>${L('Garmin Connect в браузере → Настройки → <b>Personal API</b> → <b>Create key</b> (действует год).', 'Garmin Connect in a browser → Settings → <b>Personal API</b> → <b>Create key</b> (lasts a year).')}</li><li>${L('Скопируй ключ целиком и вставь.', 'Copy the whole key and paste it.')}</li></ol>
        <form id="onbGarmin" class="stack"><label class="field">${L('Ключ Personal API', 'Personal API key')}<input id="onbGarminKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required></label><button class="btn quiet" type="submit" ${dis}>${L('Подключить ключ', 'Connect the key')}</button></form></details>
      <div class="stack" style="padding-top:8px"><button class="btn link" data-a="onb-go" data-s="time">${L('Позже — дальше', 'Later — next')}</button></div>`;
  } else if (st === 'garmin') {
    const g = cloud.me?.garmin, a = state.local.acts;
    b = `<h2 class="wiz-h">${L('Подключи Garmin', 'Connect Garmin')}</h2>`;
    if (g?.linked) b += `<p class="hint">${L('Подключён.', 'Connected.')} ${a?.list ? L(`Тренировок за последние 4 недели: ${a.list.filter(x => trainingSport(x.sport)).length}.`, `Workouts in the last 4 weeks: ${a.list.filter(x => trainingSport(x.sport)).length}.`) : ''} ${L('Сделанные тренировки будут отмечаться сами, а план опирается на твою историю.', 'Done sessions get ticked off on their own, and the plan builds on your history.')}</p>
      <div class="stack wiz-go"><button class="btn primary" data-a="onb-go" data-s="time">${L('Дальше', 'Next')}</button></div>`;
    else b += `<p class="hint">${L('Нужен личный ключ Garmin — его создаёшь ты сам, и он даёт доступ только к чтению твоих тренировок.', 'You need your own Garmin key — you create it, and it only lets the app read your workouts.')}</p>
      <ol class="onb-steps"><li>${L('Открой <a href="https://connect.garmin.com/" target="_blank" rel="noopener">Garmin Connect</a> в браузере и войди.', 'Open <a href="https://connect.garmin.com/" target="_blank" rel="noopener">Garmin Connect</a> in a browser and sign in.')}</li>
        <li>${L('Настройки → <b>Personal API</b> → <b>Create key</b>. Ключ действует год.', 'Settings → <b>Personal API</b> → <b>Create key</b>. The key lasts a year.')}</li>
        <li>${L('Скопируй ключ целиком и вставь сюда.', 'Copy the whole key and paste it here.')}</li></ol>
      <form id="onbGarmin" class="stack"><label class="field">${L('Ключ Personal API', 'Personal API key')}<input id="onbGarminKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required></label>
      ${err}<button class="btn primary" type="submit" ${dis}>${onb.busy ? L('Проверяю ключ…', 'Checking the key…') : L('Подключить', 'Connect')}</button></form>
      <p class="hint" style="padding-top:8px">${L('В приложении «Неделя» для iPhone это одна кнопка — через Apple Health. ', 'In the Week iPhone app this is one tap — via Apple Health. ')}${L('Ключ хранится на сервере и в приложении больше не показывается. Он общий с «Залом».', 'The key stays on the server and is never shown again. It’s shared with the gym app.')}</p>
      <div class="stack" style="padding-top:8px"><button class="btn link" data-a="onb-go" data-s="time">${L('Нет Garmin или позже — дальше', 'No Garmin, or later — skip')}</button></div>`;
  } else if (st === 'time') {
    const p = state.prefs, tin = (f, v) => `<input data-pref="${f}" type="time" value="${esc(v)}">`;
    b = `<h2 class="wiz-h">${L('Когда можно тренироваться', 'When you can train')}</h2>
      <p class="hint">${L('В эти рамки и в окна календаря встанут тренировки. Поменять можно в любой момент в настройках.', 'Sessions go inside these bounds and your calendar’s free slots. Change it any time in settings.')}</p>
      <label class="check" style="justify-content:flex-start;padding:12px 0"><input type="checkbox" data-pref="work" ${p.work ? 'checked' : ''}> ${L('Работаю по будням — это время занято', 'I work on weekdays — that time is taken')}</label>
      <div class="wiz-row"><label class="field">${L('Работа с', 'Work from')}${tin('workStart', p.workStart)}</label><label class="field">${L('до', 'to')}${tin('workEnd', p.workEnd)}</label></div>
      <div class="wiz-row"><label class="field">${L('Будни: не раньше', 'Weekdays: from')}${tin('wdStart', p.wdStart)}</label><label class="field">${L('и не позже', 'until')}${tin('wdEnd', p.wdEnd)}</label></div>
      <div class="wiz-row"><label class="field">${L('Выходные: с', 'Weekends: from')}${tin('weStart', p.weStart)}</label><label class="field">${L('до', 'to')}${tin('weEnd', p.weEnd)}</label></div>
      <div class="stack wiz-go"><button class="btn primary" data-a="onb-go" data-s="health">${L('Дальше', 'Next')}</button></div>`;
  } else if (st === 'health') {
    const h = state.health || {};
    b = `<h2 class="wiz-h">${L('Есть травма или боль, которую надо беречь?', 'Any injury or pain to look after?')}</h2>
      <p class="hint">${L('Если да — приложение будет каждый день спрашивать, как ты, и не поставит бег или тяжёлое, пока болит. Диагнозов оно не ставит.', 'If so, the app asks how you are each day and won’t schedule running or hard sessions while it hurts. It makes no diagnoses.')}</p>
      <div class="opts" style="padding-top:8px"><button class="opt" data-a="onb-health" data-v="no" aria-pressed="${onb.health === 'no'}"><b>${L('Нет, всё в порядке', 'No, all good')}</b></button><button class="opt" data-a="onb-health" data-v="yes" aria-pressed="${onb.health === 'yes'}"><b>${L('Да, есть что беречь', 'Yes, something to look after')}</b></button></div>
      ${onb.health === 'yes' ? `<label class="field" style="padding-top:12px">${L('Что и где', 'What and where')}<input data-health="note" value="${esc(h.note || '')}" placeholder="${L('Например: колено после операции', 'For example: knee after surgery')}"></label>
        <label class="field">${L('Правило от врача или своё', 'A rule from your doctor, or your own')}<input data-health="rule" value="${esc(h.rule || '')}" placeholder="${L('Например: бег только после 48 ч без боли', 'For example: run only after 48 h pain-free')}"></label>` : ''}
      <div class="stack wiz-go"><button class="btn primary" data-a="onb-done" ${onb.health ? '' : 'disabled'}>${L('Собрать план', 'Build my plan')}</button></div>`;
  }
  return head + `<div class="sheet-scroll wiz onb">${dots}${b}</div>`;
}

async function onbAccount() {
  const email = ($('#onbEmail')?.value || '').trim(), password = $('#onbPw')?.value || '', code = ($('#onbCode')?.value || '').trim().toUpperCase();
  onb.busy = true; onb.err = ''; onb.code = code || onb.code; onbRender();
  try {
    if (onb.mode === 'join') {
      const {data, error} = await cloud.client.functions.invoke('train', {body: {action: 'join', email, password, code}});
      if (error) { let b = null; try { b = await error.context?.json?.(); } catch {} throw new Error(b?.error || 'failed'); }
      if (!data?.ok) throw new Error('failed');
    }
    const res = await cloud.client.auth.signInWithPassword({email, password});
    if (res.error) throw new Error(/invalid/i.test(res.error.message) ? 'wrong' : 'failed');
    cloud.user = res.data.session.user;
    await afterSignIn();
    if (!cloud.me?.member) return onbGo('code');
    if (onb.mode === 'in' && state.onboard?.done) { toast(L('С возвращением', 'Welcome back')); try { localStorage.removeItem(ONB_KEY); } catch {} closeSheet(); render(); return; }
    onbGo('calendar');
  } catch (e) { onb.busy = false; onb.err = e.message; onbRender(); }
}
async function onbRedeem() {
  const code = ($('#onbCode')?.value || '').trim().toUpperCase();
  onb.busy = true; onb.err = ''; onb.code = code; onbRender();
  const d = await fn('invite-redeem', {code});
  if (d.error) { onb.busy = false; onb.err = d.error; return onbRender(); }
  cloud.me = d; cloud.signedFor = null; // now a member: run the member part of signing in
  afterSignIn();
  onbGo('calendar');
}
async function garminLink(key, from) {
  const d = await fn('garmin-link', {key});
  if (d.error) return d.error;
  cloud.me = d; state.local.acts = null; saveLocal();
  await loadActs(true);
  return null;
}
async function onbGarmin() {
  const key = $('#onbGarminKey')?.value || '';
  onb.busy = true; onb.err = ''; onbRender();
  const e = await garminLink(key);
  onb.busy = false; onb.err = e || ''; onbRender();
}

// Injury tracking: off unless the person turns it on (onboarding or here). On: daily pain check and the pain gate.
function healthHTML() {
  const h = state.health || {};
  return `<div class="section-title">${L('Травма или боль', 'Injury or pain')}</div>
    <label class="check set-check"><input type="checkbox" data-health="track" ${h.track ? 'checked' : ''}> ${L('Каждый день спрашивать про боль и беречь, пока болит', 'Ask about pain each day and go easy while it hurts')}</label>
    ${h.track ? `<label class="field">${L('Что и где', 'What and where')}<input data-health="note" value="${esc(h.note || '')}" placeholder="${L('Например: колено после операции', 'For example: knee after surgery')}"></label>
      <label class="field">${L('Правило от врача или своё', 'A rule from your doctor, or your own')}<input data-health="rule" value="${esc(h.rule || '')}" placeholder="${L('Например: бег только после 48 ч без боли', 'For example: run only after 48 h pain-free')}"></label>` : ''}`;
}

/* ---------- program tab: the plan's long view and how it's going ---------- */
// One week counted the way the week screen counts it, plus what was skipped: done sessions (and extra Garmin ones)
// against what was planned. Weeks before the app knew about them have no plan, only Garmin.
function weekTally(wk, partial) {
  const week = state.weeks[wk], acts = weekActs(wk).filter(a => trainingSport(a.sport));
  const bySport = {};
  if (!week) { for (const a of acts) bySport[a.sport] = (bySport[a.sport] || 0) + a.min; return {wk, planned: 0, done: 0, planMin: 0, doneMin: acts.reduce((t, a) => t + a.min, 0), keyPlanned: 0, keyDone: 0, hardMin: 0, bySport}; }
  const effs = week.sessions.map(s => effective(wk, s)).filter(s => s.day != null && s.status !== 'dropped');
  const ti = partial ? todayIdx(wk) : 7;
  const counted = effs.filter(s => s.status === 'done' || s.status === 'skipped' || (s.status === 'planned' && s.day < ti));
  const done = effs.filter(s => s.status === 'done'), ex = extras(wk, week).filter(a => trainingSport(a.sport));
  for (const s of done) { const sp = KINDS[s.kind].sport; bySport[sp] = (bySport[sp] || 0) + (s.act?.min ?? s.min); }
  for (const a of ex) bySport[a.sport] = (bySport[a.sport] || 0) + a.min;
  const isKey = s => s.key || KINDS[s.kind].hard || s.kind.endsWith('_long');
  return {
    wk, planned: counted.length, done: done.length, planMin: counted.reduce((t, s) => t + s.min, 0),
    doneMin: Object.values(bySport).reduce((t, m) => t + m, 0),
    keyPlanned: counted.filter(isKey).length, keyDone: done.filter(isKey).length,
    hardMin: done.filter(s => KINDS[s.kind].hard).reduce((t, s) => t + (s.act?.min ?? s.min), 0), bySport,
  };
}
const share = (a, b) => b ? Math.round(a / b * 100) : 0;
function programHTML() {
  const cur = ymd(mondayOf(new Date())), p = state.plan, ow = outlookWeek(cur);
  const sub = p ? `${L(GOALS[p.goal]?.[0] || '', GOALS[p.goal]?.[1] || '')}${p.goal === 'event' && p.eventName ? ' · ' + p.eventName : ''}${ow ? ' · ' + L(`неделя ${ow.week} из ${ow.of}`, `week ${ow.week} of ${ow.of}`) : ''}` : L('Плана пока нет', 'No plan yet');
  let h = `<main class="screen"><header class="nav"><div class="nav-row"><button class="nav-btn" data-a="back">${icon('left')}${L('Неделя', 'Week')}</button><span class="nav-right"><button class="nav-btn icon-btn" data-a="settings" aria-label="${L('Настройки', 'Settings')}">${icon('gear', 22)}</button></span></div>
    <h1>${L('Программа', 'Program')}<span class="sub">${esc(sub)}</span></h1></header>`;

  if (state.pause) h += `<section class="pg-card"><div class="card plan-prop" style="cursor:default"><span class="plan-prop-eyebrow">${L('Пауза', 'Paused')}</span><b>${L(`С ${fDay(state.pause.from)} — ${PAUSE_WHY[state.pause.reason]?.[0] || ''}. Недели не собираются, выходных предложений нет.`, `Since ${fDay(state.pause.from)} — ${PAUSE_WHY[state.pause.reason]?.[1] || ''}. No new weeks, no weekend proposals.`)}</b></div><div class="stack" style="padding-top:10px"><button class="btn primary" data-a="resume">${L('Возвращаюсь', 'I’m back')}</button></div></section>`;
  // The goal and the long view
  if (p?.outlook) h += `<section class="pg-card"><div class="section-title" style="padding-top:0">${L('Куда идём', 'Where this goes')}</div>${outlookHTML({...p.outlook, basis: null}, p.start, p)}</section>`;
  else h += `<section class="pg-card"><p class="hint" style="padding-bottom:12px">${p ? L('У этого плана нет прогноза — он собран до появления «Программы». Пересобери план, и здесь появится путь по неделям.', 'This plan has no outlook — it predates this tab. Rebuild it to see the week-by-week path here.') : L('Собери план: цель, спорт и время — и здесь появится путь по неделям, фазы и прогноз формы.', 'Build a plan — goal, sports and time — and the week-by-week path, phases and form outlook show up here.')}</p>
    <div class="stack"><button class="btn primary" data-a="plan-open">${p ? L('Собрать план заново', 'Rebuild the plan') : L('Собрать план', 'Build a plan')}</button></div></section>`;

  // How it's going: only since the program started. Before that there was no plan to keep, only a baseline.
  const start = p?.start && p.start <= cur ? p.start : null;
  const progWks = []; if (start) for (let wk = start; wk <= cur; wk = ymd(addDays(parseYmd(wk), 7))) progWks.push(wk);
  const prog = progWks.slice(-8).map(wk => weekTally(wk, wk === cur));
  const finished = prog.filter(w => w.wk < cur);
  const planned = prog.reduce((t, w) => t + w.planned, 0), done = prog.reduce((t, w) => t + w.done, 0);
  const nowT = prog.find(w => w.wk === cur) || weekTally(cur, true);
  const base = [4, 3, 2, 1].map(k => ymd(addDays(parseYmd(start || cur), -7 * k))), baseH = base.reduce((t, wk) => t + actualHours(wk), 0) / 4;
  let streak = 0;
  for (const w of [...finished].reverse()) { if (w.planned && w.done / w.planned >= 0.8) streak++; else if (w.planned) break; }
  const daysLeft = p?.goal === 'event' && p.eventDate ? Math.round((parseYmd(p.eventDate) - parseYmd(todayStr())) / 864e5) : null;
  const lines = [];
  if (!start) lines.push(L('Программа ещё не началась — здесь будет видно, как она идёт, с первой её недели.', 'The program hasn’t started — this shows how it goes from its first week.'));
  else if (progWks.length === 1) lines.push(L(`Программа началась на этой неделе (${fDay(start)}).`, `The program started this week (${fDay(start)}).`) + ' ' + (planned ? L(`Из тренировок, которые уже должны были пройти, сделано ${done} из ${planned}.`, `Of the sessions due so far, ${done} of ${planned} are done.`) : L('Тренировок, которые уже должны были пройти, пока не было.', 'No sessions were due yet.')));
  else lines.push(L(`С начала программы (${fDay(start)}) прошло ${progWks.length} нед.: сделано ${done} из ${planned} тренировок (${share(done, planned)}%)${finished.length ? `, недель на 80% и выше подряд — ${streak}` : ''}.`, `Since the program started (${fDay(start)}), ${progWks.length} weeks: ${done} of ${planned} sessions done (${share(done, planned)}%)${finished.length ? `, weeks at 80%+ in a row — ${streak}` : ''}.`));
  if (ow) lines.push(L(`Эта неделя — ${PHASE[ow.phase][0].toLowerCase()}, ориентир ${fH(ow.hours)}; сделано ${fH(nowT.doneMin / 60)}.`, `This week: ${PHASE[ow.phase][1].toLowerCase()}, target ${fH(ow.hours)}; ${fH(nowT.doneMin / 60)} done.`));
  if (baseH > 0.2) lines.push(L(`Точка отсчёта — 4 недели до программы: в среднем ${fH(baseH)} в неделю по Garmin.`, `Baseline — the 4 weeks before the program: ${fH(baseH)} a week on average, from Garmin.`));
  const rp = rampFor(cur);
  if (rp) lines.push(L(`Возвращение после паузы: неделя ${rp.week} из ${rp.of}, ${Math.round(rp.factor * 100)}% привычного объёма (правило 34).`, `Coming back: week ${rp.week} of ${rp.of}, ${Math.round(rp.factor * 100)}% of usual volume (rule 34).`));
  if (daysLeft != null && daysLeft >= 0) lines.push(L(`До старта ${daysLeft} дн.`, `${daysLeft} days to the event.`));
  const maxMin = Math.max(1, ...prog.map(w => Math.max(w.planMin, w.doneMin)), (ow?.hours || 0) * 60);
  h += `<section class="pg-card"><div class="section-title" style="padding-top:0">${L('Как идёт', 'How it’s going')}</div>
    <div class="pg-tiles"><div><b class="num">${ow ? `${ow.week}/${ow.of}` : start ? progWks.length : '—'}</b><span>${L('неделя программы', 'program week')}</span></div>
      <div><b class="num">${planned ? `${done}/${planned}` : '—'}</b><span>${L('тренировок сделано из тех, что уже прошли', 'sessions done of those due so far')}</span></div>
      <div><b class="num">${fH(nowT.doneMin / 60).replace(/ ?[чh]$/, '')}${ow ? `<span class="pg-of">/${fH(ow.hours)}</span>` : `<span class="pg-of">${L(' ч', ' h')}</span>`}</b><span>${L('на этой неделе', 'this week')}</span></div></div>
    <p class="pg-summary">${esc(lines.join(' '))}</p>
    ${prog.length ? `<div class="pg-weeks">${prog.map(w => { const target = (outlookWeek(w.wk)?.hours || 0) * 60 || w.planMin; return `<button class="pg-week" data-a="review" data-wk="${w.wk}"><span class="pg-wk num">${w.wk === cur ? L('эта', 'this') : fDay(w.wk)}</span><span class="pg-bar">${target ? `<i class="plan" style="width:${(target / maxMin * 100).toFixed(1)}%"></i>` : ''}<i class="done" style="width:${(w.doneMin / maxMin * 100).toFixed(1)}%"></i></span><span class="pg-n num">${w.planned ? `${w.done}/${w.planned}` : '—'}</span></button>`; }).join('')}</div>
    <p class="pg-legend"><span><i class="sw done"></i>${L('сделано, ч', 'done, h')}</span><span><i class="sw plan"></i>${L('ориентир недели', 'week target')}</span><span class="muted">${L('справа — тренировок сделано', 'right: sessions done')}</span></p>` : ''}
    <p class="hint" style="padding-top:8px">${L('Главная метрика — доля состоявшихся недель, а не идеальная тренировка: неделя на 80% — уже хорошая неделя.', 'The metric that matters is weeks that happened, not perfect sessions: an 80% week is a good week.')}</p></section>`;

  // Sport balance: what the last four weeks actually looked like, against the usual week
  const recent = [4, 3, 2, 1].map(k => weekTally(ymd(addDays(parseYmd(cur), -7 * k))));
  const sum = {}; for (const w of recent) for (const [sp, m] of Object.entries(w.bySport)) sum[sp] = (sum[sp] || 0) + m;
  const total = Object.values(sum).reduce((t, m) => t + m, 0);
  const tpl = {}; for (const t of state.template) { const sp = KINDS[t.kind].sport; tpl[sp] = (tpl[sp] || 0) + t.min; }
  const tplTotal = Object.values(tpl).reduce((t, m) => t + m, 0);
  const sports = [...new Set([...Object.keys(sum), ...Object.keys(tpl)])].filter(sp => SPORTS[sp]).sort((a, b) => (sum[b] || 0) - (sum[a] || 0));
  if (total) h += `<section class="pg-card"><div class="section-title" style="padding-top:0">${L('Баланс: последние 4 недели', 'Balance: the last 4 weeks')}</div>
    <div class="prog-bar pg-mix">${sports.filter(sp => sum[sp]).map(sp => `<i class="${sp}" style="width:${(sum[sp] / total * 100).toFixed(1)}%"></i>`).join('')}</div>
    <div class="list pg-sports">${sports.map(sp => `<div class="row"><span class="t"><b><span class="dot pg-dot ${sp}"></span>${esc(L(SPORTS[sp][0], SPORTS[sp][1]))}</b><span>${tplTotal && tpl[sp] ? L(`в обычной неделе ${share(tpl[sp], tplTotal)}%`, `${share(tpl[sp], tplTotal)}% of the usual week`) : L('нет в обычной неделе', 'not in the usual week')}</span></span><span class="num pg-val">${fH((sum[sp] || 0) / 60 / 4)}<span class="muted">${L('/нед', '/wk')} · ${share(sum[sp] || 0, total)}%</span></span></div>`).join('')}</div>
    <p class="hint" style="padding-top:8px">${L('По Garmin, включая недели до программы — чтобы было видно, откуда ты стартуешь.', 'From Garmin, including weeks before the program — to show where you start from.')}</p></section>`;

  // Intensity: key sessions and the share of hard work, since the program started
  const keyP = prog.reduce((t, w) => t + w.keyPlanned, 0), keyD = prog.reduce((t, w) => t + w.keyDone, 0);
  const progMin = prog.reduce((t, w) => t + w.doneMin, 0), hardMin = prog.reduce((t, w) => t + w.hardMin, 0), hardShare = progMin ? Math.round(hardMin / progMin * 100) : 0;
  if (keyP || hardMin) h += `<section class="pg-card"><div class="section-title" style="padding-top:0">${L('Интенсивность с начала программы', 'Intensity since the program started')}</div>
    <div class="pg-tiles two"><div><b class="num">${keyP ? `${keyD}/${keyP}` : '—'}</b><span>${L('главных тренировок сделано', 'key sessions done')}</span></div><div><b class="num">${hardShare}%</b><span>${L('времени — тяжёлые', 'of the time hard')}</span></div></div>
    <p class="hint">${hardShare > 25 ? L('Тяжёлого больше обычного ориентира 15–20% — следи, чтобы лёгкие дни оставались лёгкими.', 'More hard work than the usual 15–20% — keep the easy days easy.') : L('Ориентир для любителя — 15–20% времени тяжёлых тренировок, остальное — лёгкое (правило 3, уровень B).', 'The amateur guide is 15–20% of time hard, the rest easy (rule 3, grade B).')}</p></section>`;

  // What's next: the coming weeks from the outlook
  if (p?.outlook) {
    const next = [0, 1, 2, 3].map(k => ({wk: ymd(addDays(parseYmd(cur), 7 * k)), w: outlookWeek(ymd(addDays(parseYmd(cur), 7 * k)))})).filter(x => x.w);
    if (next.length) h += `<section class="pg-card"><div class="section-title" style="padding-top:0">${L('Дальше', 'Coming up')}</div><div class="list">${next.map((x, i) => `<div class="row"><span class="t"><b>${i === 0 ? L('Эта неделя', 'This week') : fDay(x.wk)}</b><span>${esc(L(PHASE[x.w.phase][0], PHASE[x.w.phase][1]))}</span></span><span class="num pg-val">${fH(x.w.hours)}</span></div>`).join('')}</div>
      <p class="hint" style="padding-top:8px">${L('Каждые выходные ассистент собирает следующую неделю по этому ориентиру и по тому, как прошла текущая.', 'Every weekend the assistant builds the next week from this guide and how the current one went.')}</p></section>`;
    h += basisHTML(p.outlook.basis, false);
  }
  if (p && !state.pause) h += `<div class="stack" style="padding-top:20px"><button class="btn link" data-a="pause-open">${L('Поставить на паузу — травма, болезнь, жизнь', 'Pause — injury, illness, life')}</button></div>`;
  return h + '</main>';
}

/* ---------- session guide: how to do it, in your numbers, and what the rulebook says is critical ---------- */
/* ---------- zones and thresholds: computed from training, or the person's own ---------- */
// Research basis: reports/Умное определение зон и порогов.md. Heart rate leads; pace and watts follow when precise enough.
// The watch's zone bounds (state.zones.hr.b, copied from Garmin) stay as they are; on top of them the app puts five words —
// Лёгкий / Ровный / Темп / Порог / Тяжёлый — cut from two anchors in bpm: LT1 (top of easy) and LT2 (threshold).
// state.zones.mode: 'auto' (default) — everything from the algorithm; 'own' — the person's numbers, blanks from the algorithm.
const hrZonesOk = b => Array.isArray(b) && b.length === 4 && b.every((x, i) => x > 60 && x < 230 && (i === 0 || x > b[i - 1]));
const VT1_K = {low: 0.746, med: 0.786, high: 0.808}; // %HRmax at VT1 by training status, men 30–45 (B, Benítez-Muñoz 2025)
const VT2_K = 0.91;                                   // %HRmax at VT2, lower end of 90.6–94.6% (B/C)
const T1_CS = 0.823;                                  // LT1 = 82.3% of critical speed (A/B, Hunter 2024)
const D_PRIME = 150;                                  // typical amateur D′, m (B/C, Smyth 2020)
const SNAP = 3, DRIFT = 6;                            // stick to a watch bound within 3 bpm; «Ровный» = LT1 + 6 (C)
const zMode = () => state.zones?.mode === 'own' ? 'own' : 'auto';
const daysAgo = a => (Date.now() - parseYmd(a.start.slice(0, 10))) / 864e5;
const actsSince = (days, f) => (state.local.acts?.list || []).filter(a => daysAgo(a) <= days && f(a));
// Recency: full weight for 30 days, fading 2% a month to 90, then out (C: Stryd, Zwift, COROS).
const decay = d => d <= 30 ? 1 : d <= 90 ? 1 - 0.02 * (d - 30) / 30 : 0;
// The latest break of 2+ weeks in a sport over 4 months (an ongoing one counts): pace and watts from before it are
// taken 1% lower per week off, at most 10% (C, heuristic). Heart-rate anchors don't move.
function breakOf(sport) {
  const xs = actsSince(120, a => a.sport === sport).map(a => parseYmd(a.start.slice(0, 10))).sort((a, b) => a - b);
  if (!xs.length) return null;
  const pts = [...xs, new Date()];
  for (let i = pts.length - 1; i > 0; i--) {
    const days = (pts[i] - pts[i - 1]) / 864e5;
    if (days >= 14) { const weeks = Math.floor(days / 7); return {to: ymd(pts[i]), weeks, delta: Math.min(0.1, 0.01 * weeks)}; }
  }
  return null;
}
const adj = (a, brk) => decay(daysAgo(a)) * (brk && a.start.slice(0, 10) < brk.to ? 1 - brk.delta : 1);
// The max HR the watch's zones are cut from, when they are the usual %max split (60/70/80/90%).
function zonesMax(b) {
  if (!hrZonesOk(b)) return null;
  const M = b[3] / 0.9;
  return [0.6, 0.7, 0.8].every((f, i) => Math.abs(b[i] - M * f) <= 2) ? Math.round(M) : null;
}
const pctZones = M => [0.6, 0.7, 0.8, 0.9].map(f => Math.round(M * f));
// Training status: run + ride hours a week over 12 weeks, weeks off left out (C).
function trainStatus() {
  const wk = {};
  for (const a of actsSince(84, x => x.sport === 'run' || x.sport === 'bike')) { const k = ymd(mondayOf(parseYmd(a.start.slice(0, 10)))); wk[k] = (wk[k] || 0) + a.min / 60; }
  const hs = Object.values(wk); if (!hs.length) return {s: 'med', h: null};
  const h = hs.reduce((a, b) => a + b, 0) / hs.length;
  let s = h < 3 ? 'low' : h <= 6 ? 'med' : 'high';
  const brk = breakOf('run') || breakOf('bike');
  if (brk && brk.weeks >= 8 && (Date.now() - parseYmd(brk.to)) / 864e5 < 28) s = s === 'high' ? 'med' : 'low';
  return {s, h};
}
// Heart-rate anchors from the algorithm: max HR, LT1, «Ровный» top, LT2 — snapped to the watch's bounds.
function hrAuto() {
  const b0 = state.zones?.hr?.b, W = zonesMax(b0);
  const peaks = actsSince(180, a => a.hrMax && (a.sport === 'run' || a.sport === 'bike')).sort((a, b) => b.hrMax - a.hrMax);
  let P = peaks[0] || null; if (P && peaks[1] && P.hrMax - peaks[1].hrMax > 8) P = peaks[1]; // a lone spike 9+ above the next is optical noise
  const p = P?.hrMax || null;
  let max, conf = 'medium', watchLow = false;
  if (W && p && p <= W && W <= p + 10) max = Math.round((p + W) / 2);
  else if (W && p && W < p - 2) { max = p; watchLow = true; }
  else if (W && p && W > p + 10) { max = p + 5; conf = 'low'; }
  else if (W) max = W;
  else if (p) { max = p; conf = 'low'; }
  else if (hrZonesOk(b0)) { max = Math.round(b0[3] / 0.9); conf = 'low'; }
  else return null;
  const st = trainStatus();
  const b = hrZonesOk(b0) ? b0 : pctZones(max), snap = v => { const m = b.find(x => Math.abs(x - v) <= SNAP); return m ?? v; };
  const lt1 = snap(Math.round(VT1_K[st.s] * max));
  return {max, peak: p, peakDate: P?.start.slice(0, 10), watchMax: W, watchLow, conf, status: st, b, derived: !hrZonesOk(b0), lt1, steady: snap(lt1 + DRIFT), lt2: snap(Math.round(VT2_K * max))};
}
// The usual easy-run HR (for the chart): the median of runs of 20+ min, 8 weeks, or 4 months after a break.
function usualRunHr() {
  for (const days of [56, 120]) {
    const xs = runsSince(days).filter(a => a.min >= 20 && a.hr).map(a => a.hr).sort((a, b) => a - b);
    if (xs.length >= (days === 56 ? 3 : 2)) return xs[Math.floor(xs.length / 2)];
  }
  return null;
}
// What the plan uses: the five words in bpm (own anchors where set), and the watch's zones for labels.
function hrTargets() {
  const a = hrAuto(); if (!a) return null;
  const own = zMode() === 'own' ? state.zones?.own || {} : {};
  const lt1 = +own.lt1 > 90 ? +own.lt1 : a.lt1, lt2 = +own.lt2 > lt1 ? +own.lt2 : Math.max(a.lt2, lt1 + 12);
  const steady = Math.min(lt2 - 10, +own.lt1 > 90 ? lt1 + DRIFT : Math.max(a.steady, lt1 + 1));
  const b = a.b, e = Math.max(1, b.filter(x => x <= steady).length);
  return {...a, b, e, usual: usualRunHr(), lt1, lt2, steady, easyMax: lt1, steadyMax: steady,
    tempo: [steady + 1, lt2 - 9], thr: [lt2 - 8, lt2], hard: [lt2 - 8, lt2], intervals: lt2 + 1, own: !!(+own.lt1 || +own.lt2)};
}
// The five words with their bpm and where they sit on the watch.
function hrWords(t) {
  const zoneOf = v => (t.b.findIndex(x => v <= x) + 1) || 5;
  const span = (lo, hi) => { const a = zoneOf(lo), c = zoneOf(hi); return a === c ? `Z${a}` : `Z${a}–Z${c}`; };
  return [
    {k: 'easy', n: L('Лёгкий', 'Easy'), lo: null, hi: t.lt1, what: L('лёгкий и восстановительный бег, разминка', 'easy and recovery runs, warm-ups')},
    {k: 'steady', n: L('Ровный', 'Steady'), lo: t.lt1 + 1, hi: t.steady, what: L('длинная — к концу пульс дрейфует сюда, это нормально', 'long runs — HR drifts here late on, that’s fine')},
    {k: 'tempo', n: L('Темп', 'Tempo'), lo: t.tempo[0], hi: t.tempo[1], what: L('темповые отрезки', 'tempo blocks')},
    {k: 'thr', n: L('Порог', 'Threshold'), lo: t.thr[0], hi: t.thr[1], what: L('пороговые отрезки', 'threshold reps')},
    {k: 'hard', n: L('Тяжёлый', 'Hard'), lo: t.intervals, hi: null, what: L('короткие интервалы', 'short intervals')},
  ].map(w => ({...w, zones: span(w.lo ?? t.b[0] - 20, w.hi ?? t.b[3] + 10)}));
}
const zSpan = (t, from, to) => to === from ? `Z${from}` : `Z${from}–Z${to}`;
// Plan text written with zone labels («Z2 ровно», «3×10 мин Z3») → the same thing in beats.
function hrText(text) {
  const t = hrTargets(); if (!t || !text) return text;
  return String(text).replace(/\bZ([1-5])(?:\s*[–-]\s*Z?([1-5]))?\b/g, (m, a, c) => {
    const hi = Math.max(+a, +(c || a));
    if (hi <= 2) return L(`пульс до ${t.lt1}`, `HR under ${t.lt1}`);
    if (hi === 3) return L(`пульс ${t.tempo[0]}–${t.tempo[1]}`, `HR ${t.tempo[0]}–${t.tempo[1]}`);
    if (hi === 4) return L(`пульс ${t.thr[0]}–${t.thr[1]}`, `HR ${t.thr[0]}–${t.thr[1]}`);
    return L(`пульс от ${t.intervals}`, `HR ${t.intervals}+`);
  });
}
// Run threshold (critical speed) from summaries: the easy-run anchor (pace at HR ≤ LT1 / 0.823) and a floor from the
// fastest 5/10 km, recency- and break-adjusted. Training runs aren't all-out, so it's a range, never faster than the anchor.
function thrAuto() {
  const t = hrAuto(), brk = breakOf('run'), out = {brk};
  const sp = a => a.km * 1000 / (a.min * 60);
  if (t) for (const days of [30, 60]) {
    const xs = actsSince(days, a => a.sport === 'run' && a.min >= 20 && a.km >= 3 && a.hr && a.hr <= t.lt1 + 3 && a.hr >= t.lt1 - 12).map(sp).sort((a, b) => a - b);
    if (xs.length >= 2) { out.vEasy = xs[Math.floor(xs.length / 2)]; out.nEasy = xs.length; break; }
  }
  let floor = null;
  for (const a of actsSince(90, x => x.sport === 'run' && (x.f5 || x.f10))) {
    for (const [d, s] of [[10000, a.f10], [5000, a.f5]]) {
      if (!s || s < 1200) continue;
      const v = (d - D_PRIME) / s * adj(a, brk);
      if (v > 0 && (!floor || v > floor.v)) floor = {v, d, s, date: a.start.slice(0, 10)};
    }
  }
  if (floor) out.floor = floor;
  const csB = out.vEasy ? out.vEasy / T1_CS : null;
  let fv = floor?.v || null;
  if (out.vEasy && (!fv || fv < out.vEasy * 1.05)) { fv = out.vEasy * 1.05; out.floorFromEasy = true; }
  if (csB && fv) { const cs = Math.sqrt(csB * Math.min(fv, csB)); Object.assign(out, {cs, lo: Math.min(fv, csB), hi: csB}); }
  else if (fv) Object.assign(out, {cs: fv, lo: fv, hi: fv * 1.08});
  else return null;
  out.pace = Math.round(1000 / out.cs); out.paceSlow = Math.round(1000 / out.lo); out.paceFast = Math.round(1000 / out.hi);
  return out;
}
// FTP from the best 20-min (× 0.95) or 60-min power over 90 days, recency- and break-adjusted (B: Borszcz 2019).
function ftpAuto() {
  const brk = breakOf('bike');
  let best = null;
  for (const a of actsSince(90, x => x.sport === 'bike' && (x.p20 || x.p60))) {
    const k = adj(a, brk);
    for (const [v, dur] of [[a.p20 * 0.95, 20], [a.p60, 60]]) if (v && v * k > (best?.v || 0)) best = {v: v * k, raw: dur === 20 ? a.p20 : a.p60, dur, date: a.start.slice(0, 10)};
  }
  if (!best || best.v < 80) return null;
  const st = trainStatus().s;
  return {...best, v: Math.round(best.v), brk, pm: st === 'high' ? 0.09 : 0.12};
}
// What the plan uses: the person's own value in «own» mode when entered, the algorithm's otherwise.
function effThr() { const own = zMode() === 'own' ? parsePace(state.zones?.thr) : null; return own || thrAuto()?.pace || null; }
function effFtp() { const own = zMode() === 'own' ? +state.zones?.ftp : 0; return own || ftpAuto()?.v || null; }

// Thresholds the person enters (state.zones: ftp W, thr run pace s/km, lthr bpm). Without them targets fall back to
// effort (RPE, talk test) and the usual easy pace Garmin shows. Rule numbers and grades are the rulebook's.
const paceFmt = sec => `${Math.floor(sec / 60)}:${pad(Math.round(sec % 60))}`;
const parsePace = v => { const m = String(v || '').trim().match(/^(\d{1,2})[:.](\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
function runsSince(days) {
  const since = ymd(addDays(new Date(), -days));
  return (state.local.acts?.list || []).filter(a => a.sport === 'run' && a.start.slice(0, 10) >= since && a.min >= 15);
}
// The usual easy pace: the median of runs over the last 8 weeks (most of a runner's runs are easy).
function easyPace() {
  const xs = runsSince(56).filter(a => a.km >= 3).map(a => a.min * 60 / a.km).sort((a, b) => a - b);
  return xs.length >= 3 ? xs[Math.floor(xs.length / 2)] : null;
}
const longestRun30 = () => Math.max(0, ...runsSince(30).map(a => a.min));
const W = (f, a, b) => `${Math.round(f * a / 5) * 5}–${Math.round(f * b / 5) * 5} Вт`.replace(' Вт', L(' Вт', ' W'));
const isKey = s => s.key || KINDS[s.kind].hard || s.kind.endsWith('_long');
function sessionGuide(s) {
  const ftp = effFtp(), thr = effThr(), ep = easyPace(), k = s.kind;
  const g = {goal: '', steps: [], targets: [], critical: []};
  const crit = (no, grade, ru, en) => g.critical.push({no, grade, text: L(ru, en)});
  const easyRun = () => {
    if (thr) g.targets.push(L(`Темп ${paceFmt(thr * 1.15)}–${paceFmt(thr * 1.3)}/км (порог ${paceFmt(thr)}/км + 15–30%)`, `Pace ${paceFmt(thr * 1.15)}–${paceFmt(thr * 1.3)}/km (threshold ${paceFmt(thr)}/km + 15–30%)`));
    else if (ep) g.targets.push(L(`Темп около ${paceFmt(ep)}/км — твой обычный по Garmin; если пульс ползёт вверх — медленнее`, `Pace around ${paceFmt(ep)}/km — your usual from Garmin; slow down if HR creeps up`));
    const ht = hrTargets();
    if (ht) g.targets.push(k === 'run_long' ? L(`Пульс до ${ht.lt1} — «Лёгкий»; к концу длинной можно до ${ht.steady} («Ровный»)`, `HR under ${ht.lt1} — Easy; late in the long run up to ${ht.steady} (Steady)`) : L(`Пульс до ${ht.lt1} — «Лёгкий»`, `HR under ${ht.lt1} — Easy`));
    g.targets.push(L('RPE 2–3 из 10: говоришь полными предложениями', 'RPE 2–3 of 10: you can talk in full sentences'));
  };
  const runCap = () => { const lr = longestRun30(); if (lr) crit(69, 'B', `Не дольше ${Math.round(lr * 1.1)} мин: самая длинная пробежка за 30 дней — ${lr} мин, +10% — предел. Пропущенное не докидывать.`, `No longer than ${Math.round(lr * 1.1)} min: your longest run in 30 days was ${lr} min; +10% is the cap. Don’t make up missed volume.`); };
  if (k === 'run_easy' || k === 'run_long') {
    g.goal = k === 'run_long' ? L('Выносливость и привычка к времени на ногах', 'Endurance and time on feet') : L('Аэробная база без лишней усталости', 'Aerobic base without extra fatigue');
    g.steps = [[L('Разминка', 'Warm-up'), L('5 мин ходьба или очень лёгкий бег', '5 min walk or very easy jog')], [L('Основное', 'Main'), L(`${fDur(Math.max(15, s.min - 10))} ровно, в лёгкой зоне`, `${fDur(Math.max(15, s.min - 10))} steady, easy`)], [L('Заминка', 'Cool-down'), L('5 мин спокойно, лёгкая растяжка икр', '5 min easy, light calf stretch')]];
    easyRun(); runCap();
    crit(22, 'B', 'Лёгкое — действительно лёгкое. Если больше 20–30% времени выше Z2 — бежишь слишком быстро.', 'Easy means easy. More than 20–30% of the time above Z2 means you’re going too fast.');
    if (k === 'run_long') crit(7, 'C', 'Не в один день с длинным велом; если подряд — бег лёгкий.', 'Not on the same day as a long ride; back to back, keep the run easy.');
  } else if (k === 'run_q') {
    g.goal = L('Скорость на пороге и VO2max', 'Threshold speed and VO2max');
    g.steps = [[L('Разминка', 'Warm-up'), L('15 мин лёгко + 3–4 ускорения по 20 с', '15 min easy + 3–4 × 20 s strides')], [L('Основное', 'Main'), hrText(s.detail) || L('5×3 мин тяжело (RPE 8), между — 2 мин трусцой', '5×3 min hard (RPE 8), 2 min jog between')], [L('Заминка', 'Cool-down'), L('10 мин лёгко', '10 min easy')]];
    if (thr) g.targets.push(L(`Пороговые отрезки: ${paceFmt(thr - 5)}–${paceFmt(thr + 5)}/км · отрезки 3–5 мин: ${paceFmt(thr - 20)}–${paceFmt(thr - 10)}/км`, `Threshold reps: ${paceFmt(thr - 5)}–${paceFmt(thr + 5)}/km · 3–5 min reps: ${paceFmt(thr - 20)}–${paceFmt(thr - 10)}/km`));
    const qt = hrTargets();
    if (qt) g.targets.push(L(`Пульс: «Темп» ${qt.tempo[0]}–${qt.tempo[1]}, «Порог» ${qt.thr[0]}–${qt.thr[1]}, короткие отрезки к концу — от ${qt.intervals}`, `HR: Tempo ${qt.tempo[0]}–${qt.tempo[1]}, Threshold ${qt.thr[0]}–${qt.thr[1]}, short reps by the end — ${qt.intervals}+`));
    g.targets.push(L('RPE 7 на пороге, 8–9 на коротких отрезках; последний не хуже первого', 'RPE 7 at threshold, 8–9 on short reps; the last as good as the first'));
    crit(23, 'A/B', 'Полноценная VO2max-сессия — не меньше 15 мин работы в отрезках от 2 мин (5×3, 4×4).', 'A real VO2max session is at least 15 min of work in reps of 2 min or more (5×3, 4×4).');
    crit(39, 'C/B', 'Не в соседний день с другой тяжёлой; переносить только туда, где нет тяжёлого накануне и наутро.', 'Not next to another hard day; move it only where there’s nothing hard the day before or after.');
    crit(83, 'B', 'Не раньше чем через 24 ч после тяжёлого зала на ноги.', 'Not within 24 h of heavy leg work in the gym.');
    runCap();
  } else if (k === 'bike_easy' || k === 'bike_long') {
    g.goal = k === 'bike_long' ? L('Выносливость и умение ехать долго', 'Endurance and riding long') : L('Лёгкий объём и восстановление', 'Easy volume and recovery');
    g.steps = [[L('Разминка', 'Warm-up'), L('10 мин легко, каденс 90+', '10 min easy, cadence 90+')], [L('Основное', 'Main'), hrText(s.detail) || L('Ровно в Z2, в подъёмы не «рвать»', 'Steady Z2, don’t surge on climbs')], [L('Заминка', 'Cool-down'), L('5–10 мин легко', '5–10 min easy')]];
    if (ftp) g.targets.push(L(`Мощность ${W(ftp, 0.56, 0.75)} (56–75% FTP ${ftp} Вт)`, `Power ${W(ftp, 0.56, 0.75)} (56–75% of FTP ${ftp} W)`));
    g.targets.push(L('Каденс 85–95, RPE 2–3', 'Cadence 85–95, RPE 2–3'));
    if (s.min > 75) crit(106, 'B/C', `Питание: ${s.min >= 150 ? 'до 90 г углеводов в час (глюкоза + фруктоза), если ЖКТ привык' : '30–60 г углеводов в час'}, начать в первые 20–30 мин.`, `Fuel: ${s.min >= 150 ? 'up to 90 g carbs an hour (glucose + fructose) if your gut is trained' : '30–60 g carbs an hour'}, starting in the first 20–30 min.`);
    if (k === 'bike_long') crit(84, 'C', 'Накануне — без тяжёлого зала на ноги.', 'No heavy leg day the day before.');
    crit(26, 'B/C', 'На станке — по мощности (ERG), с вентилятором; дрейф пульса больше 5–8% при той же мощности — снизить цель.', 'Indoors ride by power (ERG) with a fan; HR drifting over 5–8% at the same power — lower the target.');
  } else if (k === 'bike_q') {
    g.goal = L('Мощность на пороге (FTP)', 'Threshold power (FTP)');
    g.steps = [[L('Разминка', 'Warm-up'), L('15 мин с 2–3 ускорениями по 1 мин', '15 min with 2–3 × 1 min pick-ups')], [L('Основное', 'Main'), hrText(s.detail) || L('3×12 мин sweet spot, между — 4 мин легко', '3×12 min sweet spot, 4 min easy between')], [L('Заминка', 'Cool-down'), L('10 мин легко', '10 min easy')]];
    if (ftp) g.targets.push(L(`Sweet spot ${W(ftp, 0.88, 0.94)} · порог ${W(ftp, 0.95, 1.0)} · VO2 ${W(ftp, 1.06, 1.2)}`, `Sweet spot ${W(ftp, 0.88, 0.94)} · threshold ${W(ftp, 0.95, 1.0)} · VO2 ${W(ftp, 1.06, 1.2)}`));
    else g.targets.push(L('Без FTP: sweet spot — RPE 6–7, «тяжело, но говорить короткими фразами можно»', 'Without FTP: sweet spot is RPE 6–7, hard but short phrases are possible'));
    crit(25, 'B/C', 'Интервалы — по мощности; FTP — оценка ±5%; длинные пороговые блоки 88–95% FTP.', 'Intervals by power; FTP is an estimate ±5%; long threshold blocks at 88–95% FTP.');
    crit(28, 'B/C', 'FTP перепроверять раз в 6–8 недель тем же тестом.', 'Retest FTP every 6–8 weeks with the same protocol.');
    crit(41, 'C', 'Не накануне главной беговой тренировки.', 'Not the day before a key run.');
    if (s.min > 75) crit(106, 'B/C', 'Дольше 75 мин — 30–60 г углеводов в час.', 'Over 75 min — 30–60 g carbs an hour.');
  } else if (k === 'swim') {
    g.goal = L('Техника и плавательная выносливость', 'Technique and swim endurance');
    g.steps = [[L('Разминка', 'Warm-up'), L('200 м спокойно, разными стилями', '200 m easy, mixed strokes')], [L('Техника', 'Drills'), L('4–6×50 м упражнения: «догонялка», боком, кулаки', '4–6×50 m drills: catch-up, side kick, fists')], [L('Основное', 'Main'), hrText(s.detail) || L('6–8×100 м ровно, отдых 15–20 с', '6–8×100 m steady, 15–20 s rest')], [L('Заминка', 'Cool-down'), L('100–200 м легко', '100–200 m easy')]];
    g.targets.push(L('RPE 4–6 на основной части; все отрезки одинаковые по времени', 'RPE 4–6 on the main set; even splits'));
    crit(15, 'B/C', 'После паузы больше 2–3 недель — сначала техника; при плохой технике 4–8 занятий с тренером или видео дают больше, чем объём.', 'After a 2–3+ week break, technique first; with poor technique 4–8 coached or filmed sessions beat volume.');
    crit(88, 'C', 'Не после тяжёлой силовой на верх тела.', 'Not after heavy upper-body strength work.');
  } else if (k === 'gym') {
    g.goal = L('Сила и экономичность, меньше травм', 'Strength and economy, fewer injuries');
    g.steps = [[L('Разминка', 'Warm-up'), L('8–10 мин: мобильность бедра и голеностопа, лёгкие подходы', '8–10 min: hip and ankle mobility, light sets')], [L('Основное', 'Main'), hrText(s.detail) || L('2–4 упражнения × 2–3 подхода × 4–8 повторов: присед или выпады, тяга, подъём на носки, кор', '2–4 exercises × 2–3 sets × 4–8 reps: squat or lunges, hinge, calf raise, core')], [L('Заминка', 'Cool-down'), L('5 мин спокойно', '5 min easy')]];
    g.targets.push(L('Вес на 4–10 повторений, останавливаться за 1–3 повтора до отказа (RIR 1–3); вверх — взрывно', 'Load for 4–10 reps, stop 1–3 reps short of failure (RIR 1–3); lift explosively'));
    crit(79, 'A', 'Тяжело и мало: 2–4 упражнения × 2–3 подхода × 4–8 повторов, без отказа.', 'Heavy and short: 2–4 exercises × 2–3 sets × 4–8 reps, no failure.');
    crit(81, 'A/B', 'С выносливостью — в разные дни; в один день — с разносом от 6 ч.', 'Keep it apart from endurance work: different days, or 6 h apart.');
    crit(84, 'C', 'Не накануне длинной или старта.', 'Not the day before a long session or a race.');
    crit(85, 'A', 'Новый блок или пауза 2–3 недели — начать с 1–2 подходов.', 'New block or a 2–3 week break — start with 1–2 sets.');
  } else if (k === 'climb') {
    g.goal = L('Сила хвата и верха, лёгкий день для ног', 'Grip and upper strength, an easy day for the legs');
    g.steps = [[L('Разминка', 'Warm-up'), L('10–15 мин: плечи, пальцы, лёгкие трассы', '10–15 min: shoulders, fingers, easy routes')], [L('Основное', 'Main'), hrText(s.detail) || L('Трассы по самочувствию, отдых между попытками 3+ мин', 'Routes by feel, 3+ min rest between attempts')], [L('Заминка', 'Cool-down'), L('Лёгкие трассы, растяжка предплечий', 'Easy routes, forearm stretch')]];
    crit(53, 'B', 'Боль в пальцах, локтях или плечах — стоп; при боли в пальцах — без мелких зацепов и хангборда.', 'Pain in fingers, elbows or shoulders — stop; finger pain means no crimps or hangboard.');
    crit(91, 'B/C', 'Тренировки на хват — не два дня подряд.', 'Grip-heavy sessions not two days in a row.');
  } else if (k === 'hike') {
    g.goal = L('Длинная лёгкая нагрузка', 'Long easy load');
    g.steps = [[L('Основное', 'Main'), hrText(s.detail) || L('Ровный темп, в подъёмы короче шаг', 'Steady pace, shorter steps uphill')]];
    crit(94, 'B/C', 'Спуск больше 800–1000 м для непривычного — как тяжёлый день ног: 48 ч без беговых интервалов и длинного бега.', 'Descending over 800–1000 m, if you’re not used to it, is a hard leg day: 48 h without run intervals or a long run.');
    crit(95, 'B', 'На больших спусках — палки.', 'Poles on big descents.');
    if (s.min > 75) crit(106, 'B/C', 'Дольше 75 мин — 30–60 г углеводов в час и вода.', 'Over 75 min — 30–60 g carbs an hour and water.');
  } else {
    g.goal = L('Восстановление', 'Recovery');
    g.steps = [[L('Основное', 'Main'), hrText(s.detail) || L('Прогулка 20–40 мин и мобильность', '20–40 min walk and mobility')]];
  }
  if (state.health?.track && (KINDS[k].impact || KINDS[k].hard)) crit(48, 'B/C', `Боль в месте травмы ≥2/10 во время тренировки — стоп${KINDS[k].sport === 'run' ? ' и пешком' : ''}${state.health.rule ? '. Твоё правило: ' + state.health.rule : ''}.`, `Pain at the injury site ≥2/10 during the session — stop${KINDS[k].sport === 'run' ? ' and walk' : ''}${state.health.rule ? '. Your rule: ' + state.health.rule : ''}.`);
  return g;
}
function guideHTML(s) {
  const g = sessionGuide(s);
  const noZones = !effFtp() && !effThr() && (KINDS[s.kind].sport === 'run' || KINDS[s.kind].sport === 'bike');
  return `<div class="guide"><p class="guide-goal">${esc(g.goal)}</p>
    <div class="section-title">${L('Как делать', 'How to do it')}</div><div class="guide-steps">${g.steps.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>
    ${g.targets.length ? `<div class="section-title">${L('Твои цифры', 'Your numbers')}</div><ul class="plan-why">${g.targets.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${noZones ? `<p class="hint" style="padding-top:6px"><button class="btn link" style="min-height:0;padding:0;display:inline;width:auto" data-a="zones-open">${L('Укажи FTP и пороговый темп', 'Add your FTP and threshold pace')}</button> ${L('— и здесь будут ватты и темп по зонам.', '— and this shows watts and pace by zone.')}</p>` : ''}
    ${g.critical.length ? `<div class="section-title">${L('Что критично', 'What matters most')}</div><ul class="guide-crit">${g.critical.map(c => `<li><span class="grade g${gradeKey(c.grade)}">${esc(gradeShort(c.grade))}</span><span>${esc(c.text)} <em class="muted">${L('правило', 'rule')} ${c.no}</em></span></li>`).join('')}</ul>` : ''}</div>`;
}
// Old caches came from before the server sent hrMax/p20/f5/f10: refetch 90 days once.
const thrFetch = {done: false};
async function ensureThrData() {
  if (thrFetch.done || hkOn() || !state.local.acts?.linked) return;
  thrFetch.done = true;
  const s90 = ymd(addDays(new Date(), -90)), recent = (state.local.acts.list || []).filter(a => a.start.slice(0, 10) >= s90 && (a.sport === 'run' || a.sport === 'bike'));
  if (!recent.length || recent.some(a => 'hrMax' in a)) return;
  if (await loadHistory(s90, ymd(new Date())) != null) render();
}
const fDate = d => parseYmd(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {day: 'numeric', month: 'short'});
const STATUS_RU = {low: 'начальный', med: 'средний', high: 'высокий'}, STATUS_EN = {low: 'beginner', med: 'intermediate', high: 'trained'};

// Settings → «Пороги и зоны»: one switch for everything, the five words over the watch's zones, then pace and watts.
function zonesHTML() {
  const own = zMode() === 'own', z = state.zones || {}, t = hrTargets(), th = thrAuto(), fa = ftpAuto();
  let h = `<div class="section-title" id="zones">${L('Пороги и зоны', 'Thresholds and zones')}</div>
    <div class="seg" role="group" style="margin-bottom:8px"><button data-a="zmode" data-m="auto" aria-pressed="${!own}">${L('По моим тренировкам', 'From my training')}</button><button data-a="zmode" data-m="own" aria-pressed="${own}">${L('Свои значения', 'My own')}</button></div>
    <p class="hint" style="padding-bottom:6px">${own ? L('Твои цифры главнее. Пустое поле — значение из алгоритма.', 'Your numbers win. A blank field takes the algorithm’s value.') : L('Приложение считает сам по тренировкам и обновляет. Пульс ведёт, темп и ватты — ориентир.', 'The app works these out from your training and keeps them current. Heart rate leads; pace and watts are guides.')}</p>`;
  // heart rate
  if (t) {
    const words = hrWords(t), lo = Math.max(60, t.b[0] - 25), hi = t.b[3] + 18, x = v => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * 100).toFixed(1);
    const wEdges = [lo, t.lt1, t.steady, t.tempo[1], t.thr[1], hi], zEdges = [lo, ...t.b, hi];
    h += `<figure class="hrz" style="--sc:var(--run)">
      <div class="hrz-lab">${L('Тренировка', 'Session')}</div>
      <div class="hrz-bar zones">${words.map((w, i) => `<i class="z${i + 1}" style="flex:${Math.max(1, wEdges[i + 1] - wEdges[i])}"><span>${esc(w.n)}</span></i>`).join('')}</div>
      <div class="hrz-ticks num">${[t.lt1, t.steady, t.tempo[1], t.thr[1]].map(v => `<span style="left:${x(v)}%">${v}</span>`).join('')}</div>
      <div class="hrz-lab">${t.derived ? L('Зоны (от максимума)', 'Zones (from max HR)') : L('Зоны на часах', 'Watch zones')}</div>
      <div class="hrz-bar zones thin">${[0, 1, 2, 3, 4].map(i => `<i class="z${i + 1}" style="flex:${zEdges[i + 1] - zEdges[i]}"><span>Z${i + 1}</span></i>`).join('')}</div>
      <div class="hrz-ticks num">${t.b.map(v => `<span style="left:${x(v)}%">${v}</span>`).join('')}</div>
      ${t.usual ? `<div class="hrz-band"><span class="hrz-name">${L('Твои пробежки', 'Your runs')}</span><span class="hrz-track"><b class="hrz-dot" style="left:${x(t.usual)}%"></b></span><span class="hrz-val num">${t.usual}</span></div>` : ''}
    </figure>
    <div class="list">${words.map(w => `<div class="row thr-row"><span class="t"><b>${esc(w.n)} · <span class="num" style="display:inline;color:inherit">${w.lo == null ? L('до ', '≤ ') + w.hi : w.hi == null ? L('от ', '') + w.lo + (lang === 'ru' ? '' : '+') : w.lo + '–' + w.hi}</span></b><span>${esc(w.what)} · ${w.zones} ${L('на часах', 'on the watch')}</span></span></div>`).join('')}</div>`;
    const why = [];
    why.push(t.watchMax && t.peak ? L(`Максимум ≈${t.max}: часы считают от ${t.watchMax}, пик за полгода ${t.peak}.`, `Max ≈${t.max}: the watch uses ${t.watchMax}, your 6-month peak is ${t.peak}.`)
      : t.peak ? L(`Максимум ≈${t.max} — пик за полгода (${fDate(t.peakDate)}); настоящий не ниже.`, `Max ≈${t.max} — your 6-month peak (${fDate(t.peakDate)}); the real one is no lower.`)
      : L(`Максимум ≈${t.max} — из зон на часах.`, `Max ≈${t.max} — from the watch zones.`));
    if (!t.own) why.push(L(`Лёгкий — до ${fNum(VT1_K[t.status.s] * 100, 1)}% максимума: уровень ${STATUS_RU[t.status.s]}${t.status.h ? `, ~${fNum(t.status.h, 1)} ч в неделю` : ''}. У разных людей ±10 ударов — если на лёгком тяжело говорить, поставь своё.`, `Easy — up to ${Math.round(VT1_K[t.status.s] * 1000) / 10}% of max: ${STATUS_EN[t.status.s]}${t.status.h ? `, ~${fNum(t.status.h, 1)} h a week` : ''}. People vary by ±10 bpm — if talking is hard on easy runs, set your own.`));
    h += `<p class="hint" style="padding-top:6px">${why.join(' ')}</p>`;
    if (t.watchLow) h += `<p class="hint warn-text">${L(`Пульс доходил до ${t.peak} — выше максимума на часах (${t.watchMax}). Обнови максимум в Garmin и перепиши зоны ниже.`, `HR reached ${t.peak} — above the watch’s max (${t.watchMax}). Update max HR in Garmin and copy the zones below.`)}</p>`;
    if (own) h += `<div class="wiz-row"><label class="field">${L('Лёгкий до, уд/мин', 'Easy up to, bpm')}<input data-zown="lt1" type="number" inputmode="numeric" min="100" max="200" value="${esc(z.own?.lt1 || '')}" placeholder="${hrAuto()?.lt1 || ''}"></label><label class="field">${L('Порог до, уд/мин', 'Threshold up to, bpm')}<input data-zown="lt2" type="number" inputmode="numeric" min="120" max="215" value="${esc(z.own?.lt2 || '')}" placeholder="${hrAuto()?.lt2 || ''}"></label></div>`;
  } else h += `<p class="hint">${L('Пульса пока нет: подключи Garmin или впиши зоны с часов ниже — до тех пор ориентиры по ощущениям.', 'No heart-rate data yet: connect Garmin or copy your watch zones below — until then, effort targets.')}</p>`;

  // run threshold
  const thr = effThr(), ownThr = own && parsePace(z.thr);
  h += `<div class="section-title" style="padding-top:18px">${L('Порог бега', 'Run threshold')}</div>`;
  if (thr) {
    let why = '';
    if (ownThr) why = L('Твоё значение.', 'Your value.');
    else if (th) {
      const parts = [];
      if (th.vEasy) parts.push(L(`лёгкий бег ${paceFmt(1000 / th.vEasy)}/км при пульсе до ${hrTargets()?.lt1}`, `easy runs at ${paceFmt(1000 / th.vEasy)}/km under ${hrTargets()?.lt1} bpm`));
      if (th.floor) parts.push(L(`быстрые ${th.floor.d / 1000} км — ${hms(th.floor.s)} (${fDate(th.floor.date)})`, `fastest ${th.floor.d / 1000} km — ${hms(th.floor.s)} (${fDate(th.floor.date)})`));
      if (th.brk) parts.push(L(`пауза ${th.brk.weeks} нед. — темп до неё взят на ${Math.round(th.brk.delta * 100)}% медленнее`, `a ${th.brk.weeks}-week break — pace from before it taken ${Math.round(th.brk.delta * 100)}% slower`));
      why = L(`По тренировкам: ${parts.join('; ')}. Это не тест, поэтому диапазон: пороговые отрезки веди по пульсу, темп — ориентир.`, `From training: ${parts.join('; ')}. Not a test, so it’s a range: run threshold reps by heart rate, pace is a guide.`);
    }
    h += `<div class="list"><div class="row thr-row"><span class="t"><b class="num">≈ ${paceFmt(thr)}/${L('км', 'km')}${!ownThr && th && th.paceSlow !== th.paceFast ? ` <span style="display:inline;color:var(--muted);font-weight:400">· ${paceFmt(th.paceFast)}–${paceFmt(th.paceSlow)}</span>` : ''}</b><span>${why}</span></span></div></div>`;
  } else h += `<p class="hint">${L('Нужны хотя бы две лёгкие пробежки по 20+ мин с пульсом — тогда посчитаю.', 'Two easy runs of 20+ min with heart rate and it’s worked out.')}</p>`;
  if (own) h += `<div class="wiz-row"><label class="field">${L('Свой порог, мин/км', 'Own threshold, min/km')}<input data-zone="thr" inputmode="numeric" value="${esc(z.thr || '')}" placeholder="${th ? paceFmt(th.pace) : '4:50'}"></label></div>`;

  // FTP
  const ftp = effFtp(), ownFtp = own && +z.ftp;
  h += `<div class="section-title" style="padding-top:18px">FTP</div>`;
  if (ftp) {
    const why = ownFtp ? L('Твоё значение.', 'Your value.') : L(`Лучшие ${fa.dur} мин за 90 дней — ${fa.raw} Вт (${fDate(fa.date)})${fa.dur === 20 ? ' × 0,95' : ''}${fa.brk ? `, пауза ${fa.brk.weeks} нед. — минус ${Math.round(fa.brk.delta * 100)}%` : ''}. Тренировка — не тест, так что FTP скорее не ниже. Точность ±${Math.round(fa.pm * 100)}%.`, `Best ${fa.dur} min in 90 days — ${fa.raw} W (${fDate(fa.date)})${fa.dur === 20 ? ' × 0.95' : ''}${fa.brk ? `, a ${fa.brk.weeks}-week break — minus ${Math.round(fa.brk.delta * 100)}%` : ''}. Training isn’t a test, so FTP is likely no lower. ±${Math.round(fa.pm * 100)}%.`);
    h += `<div class="list"><div class="row thr-row"><span class="t"><b class="num">${ftp} ${L('Вт', 'W')}</b><span>${why}</span></span></div></div>`;
  } else h += `<p class="hint">${L('Нужен заезд с измерителем мощности — тогда посчитаю.', 'A ride with a power meter and it’s worked out.')}</p>`;
  if (own) h += `<div class="wiz-row"><label class="field">${L('Свой FTP, Вт', 'Own FTP, W')}<input data-zone="ftp" type="number" inputmode="numeric" min="80" max="500" value="${esc(z.ftp || '')}" placeholder="${fa?.v || 230}"></label></div>`;

  // the watch's zones, folded: they're the frame the words sit on
  const b = z.hr?.b || [];
  h += `<details class="set-more" style="margin-top:14px"><summary>${L('Зоны с часов', 'Watch zones')} <span class="muted num">${hrZonesOk(b) ? '· ' + b.join(' / ') : L('· не заданы', '· not set')}</span></summary>
    <p class="hint">${L('Перепиши верхние границы Z1–Z4: Garmin Connect → Настройки → Зоны пульса. Тогда номера зон в приложении совпадут с часами.', 'Copy the tops of Z1–Z4: Garmin Connect → Settings → Heart rate zones. Then zone numbers match your watch.')}</p>
    <div class="wiz-row four">${[0, 1, 2, 3].map(i => `<label class="field">Z${i + 1} ${L('до', 'to')}<input data-hrz="${i}" type="number" inputmode="numeric" min="60" max="230" value="${b[i] || ''}" placeholder="${[115, 134, 153, 172][i]}"></label>`).join('')}</div></details>`;
  return h;
}
function thrNudgeHTML() { return ''; }

/* ---------- week review ---------- */
// What happened in a week, without blame (rules 97–99): sessions against plan, time against the outlook,
// key sessions, sports, the longest effort, hard share, pain — and what follows for the next week.
function weekReview(wk) {
  const cur = ymd(mondayOf(new Date())), partial = wk === cur, t = weekTally(wk, partial), week = state.weeks[wk];
  const ti = partial ? todayIdx(wk) : 7;
  const effs = week ? week.sessions.map(s => effective(wk, s)).filter(s => s.day != null && s.status !== 'dropped') : [];
  const missed = effs.filter(s => s.status === 'skipped' || (s.status === 'planned' && s.day < ti));
  const acts = weekActs(wk).filter(a => trainingSport(a.sport));
  const longest = acts.reduce((b, a) => !b || a.min > b.min ? a : b, null);
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => ymd(addDays(parseYmd(wk), i)));
  const pain = days.map(d => state.checks[d]).filter(Boolean), painMax = Math.max(0, ...pain.map(c => Math.max(c.sit || 0, c.walk || 0)));
  const target = outlookWeek(wk), next = outlookWeek(ymd(addDays(parseYmd(wk), 7)));
  const ratio = t.planned ? t.done / t.planned : null, hard = t.doneMin ? Math.round(t.hardMin / t.doneMin * 100) : 0;
  const doneS = effs.filter(s => s.status === 'done'), rated = doneS.filter(s => s.rpe);
  return {wk, partial, t, rated: rated.length, doneN: doneS.length, load: rated.reduce((t2, s) => t2 + sLoad(s), 0), missed, keyMissed: missed.filter(isKey), longest, painMax, painDays: pain.length, target, next, ratio, hard, review: state.proposals[ymd(addDays(parseYmd(wk), 7))]?.review || ''};
}
function reviewVerdict(r) {
  const n = `${r.t.done} ${L('из', 'of')} ${r.t.planned}`;
  if (r.ratio == null) return r.t.doneMin ? L(`Плана на эту неделю не было; по Garmin — ${fH(r.t.doneMin / 60)}.`, `No plan this week; Garmin shows ${fH(r.t.doneMin / 60)}.`) : L('Плана и тренировок на этой неделе не было.', 'No plan and no sessions this week.');
  if (r.partial) return L(`Пока сделано ${n} тренировок из тех, что уже прошли${r.target ? `, ${fH(r.t.doneMin / 60)} из ориентира ${fH(r.target.hours)}` : ''}.`, `So far ${n} of the sessions due are done${r.target ? `, ${fH(r.t.doneMin / 60)} of the ${fH(r.target.hours)} target` : ''}.`);
  if (r.ratio >= 0.8) return L(`Неделя состоялась: ${n} тренировок.`, `The week happened: ${n} sessions.`);
  if (r.ratio >= 0.5) return L(`Неделя получилась частично: ${n}. ${r.keyMissed.length ? 'Из главных не случилось: ' + r.keyMissed.map(s => kName(s.kind).toLowerCase()).join(', ') + '.' : 'Главное сделано — это важнее объёма.'}`, `A partial week: ${n}. ${r.keyMissed.length ? 'Key sessions that didn’t happen: ' + r.keyMissed.map(s => kName(s.kind).toLowerCase()).join(', ') + '.' : 'The key work got done — that matters more than volume.'}`);
  return L(`Неделя не сложилась: ${n}. Одна такая неделя — не потеря формы: за 1–2 недели уходит в основном объём крови, а не выносливость.`, `The week didn’t come together: ${n}. One week like this isn’t lost fitness: 1–2 weeks off mostly costs blood volume, not endurance.`);
}
function reviewNext(r) {
  const out = [];
  if (r.painMax >= 2) out.push(L(`Была боль до ${r.painMax}/10 — на следующей неделе бег и тяжёлое только после дней на 0/10; если болит в покое или ночью — к врачу (правила 48–49).`, `Pain up to ${r.painMax}/10 — next week, running and hard work only after 0/10 days; pain at rest or at night means a doctor (rules 48–49).`));
  if (r.ratio != null && r.ratio < 0.5) out.push(L('Не догонять: пропущенное не отрабатывать, начать с объёма последней полной недели (правила 30, 70).', 'Don’t chase it: skip the make-up sessions and restart from your last full week’s volume (rules 30, 70).'));
  else if (r.next) out.push(L(`Дальше по плану: ${PHASE[r.next.phase][0].toLowerCase()}, ориентир ${fH(r.next.hours)}.`, `Next, as planned: ${PHASE[r.next.phase][1].toLowerCase()}, target ${fH(r.next.hours)}.`));
  if (r.hard > 25) out.push(L(`Тяжёлого было ${r.hard}% времени — на следующей неделе держи лёгкие дни лёгкими (ориентир 15–20%, правило 3).`, `${r.hard}% of the time was hard — keep next week’s easy days easy (guide 15–20%, rule 3).`));
  return out;
}
function reviewSheet(wk) {
  const r = weekReview(wk), t = r.t, D = DAYS();
  const sports = Object.entries(t.bySport).filter(([sp]) => SPORTS[sp]).sort((a, b) => b[1] - a[1]);
  const next = reviewNext(r);
  openSheet(`<div class="sheet-head"><span class="wiz-title">${r.partial ? L('Неделя пока', 'The week so far') : L('Итоги недели', 'Week review')}</span><button class="nav-btn strong" data-a="close-sheet">${L('Готово', 'Done')}</button></div><div class="sheet-scroll wiz">
    <p class="hint num">${esc(weekTitle(wk))}${r.target ? ' · ' + esc(L(PHASE[r.target.phase][0], PHASE[r.target.phase][1])) + ' · ' + L(`неделя ${r.target.week} из ${r.target.of}`, `week ${r.target.week} of ${r.target.of}`) : ''}</p>
    <h2 class="wiz-h">${esc(reviewVerdict(r))}</h2>
    <div class="pg-tiles"><div><b class="num">${t.planned ? `${t.done}/${t.planned}` : '—'}</b><span>${L('тренировок', 'sessions')}</span></div>
      <div><b class="num">${fH(t.doneMin / 60).replace(/ ?[чh]$/, '')}<span class="pg-of">${r.target ? '/' + fH(r.target.hours) : L(' ч', ' h')}</span></b><span>${r.target ? L('часов из ориентира', 'hours of target') : L('часов', 'hours')}</span></div>
      <div><b class="num">${t.keyPlanned ? `${t.keyDone}/${t.keyPlanned}` : '—'}</b><span>${L('главных', 'key sessions')}</span></div></div>
    ${sports.length ? `<div class="section-title">${L('По видам спорта', 'By sport')}</div><div class="list pg-sports">${sports.map(([sp, m]) => `<div class="row"><span class="t"><b><span class="dot pg-dot ${sp}"></span>${esc(L(SPORTS[sp][0], SPORTS[sp][1]))}</b></span><span class="num pg-val">${fH(m / 60)}</span></div>`).join('')}</div>` : ''}
    <ul class="plan-why" style="padding-top:10px">
      ${r.longest ? `<li>${L(`Самая длинная — ${esc(r.longest.name || SPORTS[r.longest.sport]?.[0] || '')}, ${fDur(r.longest.min)}${r.longest.km ? `, ${String(r.longest.km).replace('.', ',')} км` : ''}`, `Longest — ${esc(r.longest.name || SPORTS[r.longest.sport]?.[1] || '')}, ${fDur(r.longest.min)}${r.longest.km ? `, ${r.longest.km} km` : ''}`)}</li>` : ''}
      ${r.rated ? `<li>${L(`Нагрузка по ощущениям: ${r.load} (RPE × мин, оценено ${r.rated} из ${r.doneN})`, `Load by feel: ${r.load} (RPE × min, ${r.rated} of ${r.doneN} rated)`)}</li>` : ''}
      ${t.doneMin && !r.partial ? `<li>${L(`Тяжёлого — ${r.hard}% времени (ориентир 15–20%)`, `Hard work — ${r.hard}% of the time (guide 15–20%)`)}</li>` : ''}
      ${r.missed.length ? `<li>${L('Не случилось: ', 'Didn’t happen: ')}${esc(r.missed.map(s => `${kName(s.kind).toLowerCase()} (${D[s.day]})`).join(', '))}</li>` : ''}
      ${state.health?.track ? `<li>${r.painDays ? L(`Боль: отметок ${r.painDays}, максимум ${r.painMax}/10`, `Pain: ${r.painDays} check-ins, max ${r.painMax}/10`) : L('Боль не отмечалась', 'No pain check-ins')}</li>` : ''}
    </ul>
    ${r.review ? `<div class="section-title">${L('Ассистент', 'Assistant')}</div><p class="plan-review">${esc(r.review)}</p>` : ''}
    ${next.length && !r.partial ? `<div class="section-title">${L('Что из этого следует', 'What follows')}</div><ul class="plan-why">${next.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <p class="hint" style="padding-top:12px">${L('Неделя на 80% — уже хорошая неделя. Главное — чтобы недели продолжали случаться.', 'An 80% week is a good week. What matters is that weeks keep happening.')}</p></div>`, {review: wk});
}
// On the week screen: a finished week opens with its review; Sat–Sun of the current one, a nudge to look.
function reviewCardHTML(wk, ti) {
  if (!state.weeks[wk]) return '';
  if (ti > 6) { const r = weekReview(wk); return `<button class="card review-card" data-a="review" data-wk="${wk}"><span class="plan-prop-eyebrow">${L('Итоги недели', 'Week review')}</span><b>${esc(reviewVerdict(r))}</b><span class="nudge-go">${L('Подробнее', 'Details')} ›</span></button>`; }
  if (ti >= 5) return `<button class="nudge" data-a="review" data-wk="${wk}"><span>${L('Итоги недели — как она прошла', 'Week review — how it went')}</span><span class="nudge-go">${L('Посмотреть', 'View')} ›</span></button>`;
  return '';
}

/* ---------- invites (admins) ---------- */
const invites = {list: null, busy: false};
async function loadInvites(create) {
  if (invites.busy) return;
  invites.busy = true;
  const d = await fn(create ? 'invite-create' : 'invite-list', create ? {uses: 1} : {});
  invites.busy = false;
  if (!d.error) invites.list = d.invites;
  if (view.v === 'settings') render();
}
const inviteLink = code => `${location.origin}${location.pathname}?invite=${encodeURIComponent(code)}`;
function invitesHTML() {
  if (!cloud.me?.admin) return '';
  if (!invites.list && !invites.busy) setTimeout(() => loadInvites(false));
  const list = invites.list || [];
  return `<div class="section-title">${L('Пригласить', 'Invite')}</div><p class="hint" style="padding-bottom:12px">${L('Один код — один человек. По ссылке сразу откроется регистрация с кодом.', 'One code, one person. The link opens sign-up with the code filled in.')}</p>
    ${list.length ? `<div class="list" style="margin-bottom:12px">${list.map(v => `<div class="row"><span class="t"><b class="num">${esc(v.code)}</b><span>${v.uses >= v.max_uses ? L('Использован', 'Used') : L(`Свободен · ${v.max_uses - v.uses} из ${v.max_uses}`, `Open · ${v.max_uses - v.uses} of ${v.max_uses}`)}</span></span>${v.uses < v.max_uses ? `<button class="nav-btn" data-a="invite-copy" data-code="${esc(v.code)}">${L('Ссылка', 'Link')}</button>` : ''}</div>`).join('')}</div>` : ''}
    <div class="stack"><button class="btn quiet" data-a="invite-new" ${invites.busy ? 'disabled' : ''}>${invites.busy ? L('Создаю…', 'Creating…') : L('Создать инвайт', 'Create an invite')}</button></div>`;
}

/* ---------- view ---------- */
const view = {v: 'week', wk: ymd(mondayOf(new Date()))};
if (new Date().getDay() === 0) view.wk = ymd(addDays(parseYmd(view.wk), 7)); // on Sunday, look ahead
let toastTimer = null;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600); }

function render() {
  const app = $('#app');
  app.innerHTML = (view.v === 'food' || view.v === 'stats') && window.TrainFood ? window.TrainFood.screen(view.v) : view.v === 'settings' ? settingsHTML() : view.v === 'program' ? programHTML() : weekHTML();
  $('#cmd').hidden = view.v !== 'week';
  $('#cmdInput').placeholder = cloud.ai ? L('Что поменялось — или спроси', 'What changed — or ask') : L('Что поменялось? «перенеси бег на чт»', 'What changed? “move run to Thu”');
  renderChips();
  document.documentElement.lang = lang;
}
function renderChips() {
  const chips = lang === 'ru' ? ['пропустил', 'сегодня 30 минут', 'перенеси на завтра', 'болею', 'уезжаю пт–вс', 'отмени'] : ['skipped', '30 minutes today', 'move to tomorrow', 'sick', 'away Fri–Sun', 'undo'];
  $('#chips').innerHTML = chips.map(c => `<button type="button" class="chip" data-a="chip" data-t="${esc(c)}">${esc(c)}</button>`).join('');
}

function weekHTML() {
  const wk = view.wk, week = ensureWeek(wk), ti = todayIdx(wk), D = DAYS();
  const sub = weekTitle(wk) + (ti >= 0 && ti <= 6 ? L(' · эта неделя', ' · this week') : ti < 0 ? (ti >= -7 ? L(' · следующая', ' · next week') : '') : '');
  let h = `<main class="screen"><header class="nav"><div class="nav-row">
    <span class="weeknav"><button class="nav-btn icon-btn" data-a="wk" data-d="-7" aria-label="${L('Прошлая неделя', 'Previous week')}">${icon('left')}</button><button class="nav-btn icon-btn" data-a="wk" data-d="7" aria-label="${L('Следующая неделя', 'Next week')}">${icon('right')}</button>${ti < 0 || ti > 6 ? `<button class="nav-btn link" data-a="wk-today">${L('Сегодня', 'Today')}</button>` : ''}</span>
    <span class="nav-right">${cloud.ai ? `<button class="nav-btn icon-btn" data-a="chat" aria-label="${L('Ассистент', 'Assistant')}">${icon('chat', 22)}</button>` : ''}<button class="nav-btn" data-a="program">${L('Программа', 'Program')}</button><button class="nav-btn icon-btn" data-a="settings" aria-label="${L('Настройки', 'Settings')}">${icon('gear', 22)}</button></span></div>
    ${window.TrainFood?.tabs('week') || ''}<h1>${L('Неделя', 'Week')}<span class="sub">${esc(sub)}</span></h1></header>`;
  if (lastChange && lastChange.wk === wk) {
    h += `<section class="card change"><div class="card-head"><h3>${lastChange.info ? L('Ответ', 'Reply') : L('Что поменялось', 'What changed')}</h3>${!lastChange.info ? `<button class="nav-btn link" data-a="undo">${L('Отменить', 'Undo')}</button>` : `<button class="nav-btn link" data-a="dismiss">${L('Ок', 'OK')}</button>`}</div>
      ${lastChange.text ? `<p class="muted" style="font-size:13px">«${esc(lastChange.text)}»</p>` : ''}<ul>${lastChange.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul></section>`;
  }
  if (!week) {
    // A past week with no plan: what Garmin recorded, days with nothing left out.
    const past = {sessions: [], log: [], away: [], sick: [], cal: {}, history: true};
    const ex = extras(wk, past), tr = ex.filter(a => trainingSport(a.sport)), min = tr.reduce((a, x) => a + x.min, 0);
    h += cardsHTML(wk, week);
    if (view.loading) return h + `<div class="empty"><b>${L('Загружаю историю из Garmin…', 'Loading history from Garmin…')}</b></div></main>`;
    if (!ex.length) return h + `<div class="empty"><b>${L('Тренировок нет', 'No workouts')}</b>${state.local.acts?.from && wk < state.local.acts.from ? L('История из Garmin загружается, когда листаешь назад', 'Garmin history loads as you browse back') : L('Плана на эту неделю не было, и Garmin ничего не записал', 'No plan this week, and nothing recorded in Garmin')}</div></main>`;
    h += progressHTML(wk, [], tr, min, 0, `${tr.length} ${L('трен. по Garmin', 'from Garmin')}`);
    return h + weekListHTML(wk, past, [], 7) + '</main>';
  }
  const effs = week.sessions.map(s => effective(wk, s));
  const counted = effs.filter(s => (s.status === 'planned' || s.status === 'done') && s.day != null);
  const planMin = counted.reduce((a, s) => a + s.min, 0);
  const doneS = effs.filter(s => s.status === 'done'), ex = extras(wk, week).filter(a => trainingSport(a.sport));
  const doneMin = doneS.reduce((a, s) => a + (s.act?.min ?? s.min), 0) + ex.reduce((a, x) => a + x.min, 0);
  h += reviewCardHTML(wk, ti);
  h += pauseRpeHTML(wk, ti);
  h += alertsHTML(wk);
  h += planCardsHTML(wk);
  h += heroHTML(wk, week, effs, ti);
  h += painLine();
  h += window.TrainFood?.weekRow(wk, week, ti) || '';
  h += cardsHTML(wk, week);
  h += progressHTML(wk, doneS, ex, doneMin, planMin, L(`${doneS.length + ex.length} из ${counted.length + ex.length} трен.`, `${doneS.length + ex.length} of ${counted.length + ex.length} sessions`));
  const ow = outlookWeek(wk);
  if (ow) h += `<p class="plan-phase"><b>${L(PHASE[ow.phase][0], PHASE[ow.phase][1])}</b> · ${L(`неделя ${ow.week} из ${ow.of}`, `week ${ow.week} of ${ow.of}`)} · ${L('ориентир', 'target')} ${fH(ow.hours)}</p>`;
  if (week.planNote) h += `<p class="plan-note"><span>${week.planBy === 'rules' ? L('План', 'Plan') : L('Идея недели', 'This week')}</span> ${esc(week.planNote)}</p>`;
  h += weekListHTML(wk, week, effs, ti);
  const un = unplacedAll(week);
  if (un.length) h += `<div class="section-title">${L('Не влезло', 'Didn’t fit')}</div><div class="wl">` + un.map(s => `<div class="wl-row"><span class="wl-day"></span><div class="wl-items"><button class="wl-item" data-a="open" data-id="${s.id}"><span class="dot ${KINDS[s.kind].sport}"></span><span class="wl-name">${esc(kName(s.kind))}</span><span class="wl-meta num">${fDur(s.min)}</span></button><span class="wl-note">${esc(s.why)}</span></div></div>`).join('') + `</div>`;
  if (week.log.length) {
    h += `<details class="log" ${logOpen ? 'open' : ''}><summary><span>${L('История изменений', 'Change history')}</span><span class="log-n num">${week.log.length}</span><svg class="log-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="list">` + week.log.slice(0, 8).map(e => `<div class="row" style="display:block"><span class="t"><b>«${esc(e.text)}»</b> <span class="muted" style="font-size:14px">${new Date(e.at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', {weekday: 'short', hour: '2-digit', minute: '2-digit'})}</span>${e.lines.map(l => `<span style="font-size:15px;color:var(--ink-2)">→ ${esc(l)}</span>`).join('')}</span></div>`).join('') + `</div></details>`;
  }
  return h + '</main>';
}

// The one thing to do next: today's session, or the next one ahead. Its day's calendar is drawn here and only here.
function nextUp(effs, ti) {
  const from = Math.max(ti, 0);
  return effs.filter(s => s.status === 'planned' && s.day != null && s.day >= from && !(s.day === ti && s.start != null && s.start + s.min < nowMin()))
    .sort((a, b) => a.day - b.day || (a.start ?? 0) - (b.start ?? 0))[0] || null;
}
const DAY_FULL = () => L(['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'], ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
function dayWord(wk, d, ti) {
  if (d === ti) return L('Сегодня', 'Today');
  if (d === ti + 1) return L('Завтра', 'Tomorrow');
  const w = DAY_FULL()[d]; return `${w[0].toUpperCase()}${w.slice(1)}, ${addDays(parseYmd(wk), d).getDate()}`;
}
function dayTimeline(wk, d, ti, items) {
  const marks = [9, 12, 18].map(h2 => `<span style="left:${pct(h2 * 60)}%">${h2}</span>`).join('');
  return `<div class="tl" aria-hidden="true">${blocks(wk, d).map(b => `<i class="${b.work ? 'w' : 'b'}" style="left:${pct(b.s)}%;width:${pct(b.e) - pct(b.s)}%"></i>`).join('')}${items.map(x => `<i class="${x.cls}" style="left:${pct(x.s)}%;width:${Math.max(1, pct(x.s + x.min) - pct(x.s))}%"></i>`).join('')}${d === ti ? `<i class="now" style="left:${pct(nowMin())}%"></i>` : ''}</div><div class="tl-marks num" aria-hidden="true">${marks}</div>`;
}
function heroHTML(wk, week, effs, ti) {
  const s = nextUp(effs, ti);
  if (!s) {
    if (ti > 6 || !week.sessions.length) return '';
    return `<section class="hero done-week"><div class="hero-eyebrow">${L('Неделя', 'This week')}</div><div class="hero-title">${L('Всё по плану на эту неделю позади', 'Everything planned this week is behind you')}</div><div class="hero-meta">${L('Скажи «добавь вел в вс», если хочется ещё', 'Say “add a ride on Sun” if you want more')}</div></section>`;
  }
  const sp = KINDS[s.kind].sport, why = s.was || whyLoud(s.why) ? whyText(s.why) : '';
  const today = s.day === ti;
  const acts = today
    ? `<button class="btn sm primary" data-a="mark" data-id="${s.id}" data-st="done">${L('Сделал', 'Done')}</button><button class="btn sm quiet" data-a="mark" data-id="${s.id}" data-st="skipped">${L('Пропустил', 'Skip')}</button><button class="btn sm quiet" data-a="open" data-id="${s.id}">${L('Перенести', 'Move')}</button>`
    : `<button class="btn sm quiet" data-a="open" data-id="${s.id}">${L('Перенести', 'Move')}</button><button class="btn sm quiet" data-a="mark" data-id="${s.id}" data-st="skipped">${L('Не смогу', 'Can’t make it')}</button>`;
  return `<section class="hero ${sp}">
    <div class="hero-eyebrow num">${esc(dayWord(wk, s.day, ti))}${s.start != null ? ' · ' + hm(s.start) : ''}</div>
    <button class="hero-title" data-a="open" data-id="${s.id}">${esc(kName(s.kind))}</button>
    <div class="hero-meta">${fDur(s.min)} · ${esc(sDetail(s))}</div>
    ${s.was ? `<div class="hero-why">${L('Вместо', 'Instead of')} ${esc(kName(s.was).toLowerCase())}: ${esc(why)}</div>` : why ? `<div class="hero-why">${esc(why)}</div>` : ''}
    ${s.caution ? `<div class="hero-why warn">${esc(s.caution)}</div>` : ''}
    ${s.start != null ? dayTimeline(wk, s.day, ti, [{cls: `s ${sp}`, s: s.start, min: s.min}]) : ''}
    <div class="hero-acts">${acts}</div></section>`;
}
// Done time as segments in each sport's colour, against the plan.
function progressHTML(wk, doneS, ex, doneMin, planMin, label) {
  const total = Math.max(planMin, doneMin, 1);
  const segs = [...doneS.map(s => ({sp: KINDS[s.kind].sport, m: s.act?.min ?? s.min})), ...ex.map(a => ({sp: a.sport, m: a.min}))];
  // Nothing done yet: the plan's size is the news, and an empty bar would be an empty band.
  if (!doneMin) return `<div class="prog"><div class="prog-text"><span><b class="num">${fHours(planMin)}</b> <span class="muted">${L('в плане', 'planned')}</span></span><span class="muted">${esc(label.replace(/^0 (из|of) /, ''))}</span></div>${loadBars(wk)}</div>`;
  return `<div class="prog"><div class="prog-text"><span><b class="num">${fHours(doneMin)}</b>${planMin ? `<span class="muted">${L(' из ', ' of ')}${fHours(planMin)}</span>` : ''}</span><span class="muted">${esc(label)}</span></div>
    <div class="prog-bar" role="img" aria-label="${esc(L('Сделано ', 'Done ') + fHours(doneMin) + (planMin ? L(' из ', ' of ') + fHours(planMin) : ''))}">${segs.map(x => `<i class="${x.sp}" style="width:${x.m / total * 100}%"></i>`).join('')}</div>${loadBars(wk)}</div>`;
}
// One line per day: what's on, nothing more. Tap a day for its calendar and free windows; tap a session for details.
function weekListHTML(wk, week, effs, ti) {
  const D = DAYS();
  let h = '<div class="wl">', rest = null;
  const flush = () => {
    if (!rest) return;
    const [a, z, word] = rest, da = addDays(parseYmd(wk), a), dz = addDays(parseYmd(wk), z);
    h += `<div class="wl-row rest${z < ti && !week.history ? ' past' : ''}${a <= ti && ti <= z ? ' has-today' : ''}"><button class="wl-day" data-a="day" data-i="${a}"><span>${a === z ? D[a] : `${D[a]}–${D[z]}`}</span><b class="num">${a === z ? da.getDate() : `${da.getDate()}–${dz.getDate()}`}</b></button><div class="wl-items"><span class="wl-rest">${word}</span></div></div>`;
    rest = null;
  };
  for (let i = 0; i < 7; i++) {
    const date = addDays(parseYmd(wk), i);
    const sess = effs.filter(s => s.day === i).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    const ex = extras(wk, week).filter(a => a.start.slice(0, 10) === ymd(date));
    if (week.history && !ex.length) continue;
    const away = (week.away || []).includes(i), sick = (week.sick || []).includes(i);
    let items = '';
    for (const s of sess) {
      const meta = s.status === 'done' && s.act ? `${fDur(s.act.min)}${s.act.km ? ' · ' + fNum(s.act.km, 1) + L(' км', ' km') : ''}` : `${s.start != null ? hm(s.start) + ' · ' : ''}${fDur(s.min)}`;
      const note = s.status === 'skipped' ? L('пропущено', 'skipped') : s.status === 'dropped' ? L('убрано', 'dropped') : s.was ? L('замена', 'swapped') : s.status === 'planned' && i < ti ? L('отметь', 'mark it') : '';
      items += `<button class="wl-item ${s.status}" data-a="open" data-id="${s.id}"><span class="dot ${KINDS[s.kind].sport}"></span><span class="wl-name">${esc(kName(s.kind))}</span>${note ? `<span class="wl-tag">${note}</span>` : ''}<span class="wl-meta num">${esc(meta)}</span></button>`;
    }
    for (const a of ex) items += `<button class="wl-item${week.history ? ' done' : ' extra'}" data-a="act" data-id="${a.id}"><span class="dot ${a.sport}"></span><span class="wl-name">${esc(a.name || a.type)}</span>${week.history ? '' : `<span class="wl-tag">${L('сверх плана', 'extra')}</span>`}<span class="wl-meta num">${fDur(a.min)}${a.km ? ' · ' + fNum(a.km, 1) + L(' км', ' km') : ''}</span></button>`;
    if (!items && i !== ti) {
      const word = away ? L('Поездка', 'Away') : sick ? L('Болезнь', 'Ill') : L('Отдых', 'Rest');
      if (rest && rest[2] === word && rest[1] === i - 1) rest[1] = i; else { flush(); rest = [i, i, word]; }
      continue;
    }
    flush();
    if (!items) items = `<span class="wl-rest">${away ? L('Поездка', 'Away') : sick ? L('Болезнь', 'Ill') : L('Отдых', 'Rest')}</span>`;
    h += `<div class="wl-row${i === ti ? ' today' : ''}${i < ti && !week.history ? ' past' : ''}"><button class="wl-day" data-a="day" data-i="${i}" aria-label="${esc(DAY_FULL()[i])} ${date.getDate()}"><span>${D[i]}</span><b class="num">${date.getDate()}</b></button><div class="wl-items">${items}</div></div>`;
  }
  flush();
  return h + '</div>';
}
// Things that need a decision before the plan can be trusted: sign-in, calendar, a doctor flag.
// Re-place the weeks still ahead after a time rule changed (protected blocks): stable, and logged.
function replanOpen() {
  for (const wk of Object.keys(state.weeks)) {
    const week = state.weeks[wk]; if (todayIdx(wk) > 6 || week.paused) continue;
    const before = snapshot(week); place(wk, week);
    if (before !== snapshot(week)) commit(wk, week, before, L('защищённое время', 'protected time'), [], {silent: true});
  }
}
function pauseRpeHTML(wk, ti) {
  let h = '';
  if (state.pause && ti >= 0 && ti <= 6) h += `<button class="nudge" data-a="resume"><span>${L(`Пауза с ${fDay(state.pause.from)} — ${PAUSE_WHY[state.pause.reason]?.[0] || ''}`, `Paused since ${fDay(state.pause.from)} — ${PAUSE_WHY[state.pause.reason]?.[1] || ''}`)}</span><span class="nudge-go">${L('Вернуться', 'I’m back')} ›</span></button>`;
  const r = ti >= 0 && ti <= 6 ? rpeDue(wk) : null;
  if (r) h += `<button class="nudge" data-a="rpe-open" data-id="${r.id}"><span>${L(`Как ощущалась «${kName(r.kind)}»? Оцени усилие`, `How did “${kName(r.kind)}” feel? Rate the effort`)}</span><span class="nudge-go">1–10 ›</span></button>`;
  return h;
}
function alertsHTML(wk) {
  let h = '';
  if (cloud.user && cloud.me && !cloud.me.member) h += `<button class="nudge" data-a="onb-open" data-s="code"><span>${L('Введи инвайт-код — подключим календарь, Garmin и ассистента', 'Enter an invite code to connect calendar, Garmin and the assistant')}</span><span class="nudge-go">${L('Ввести', 'Enter')} ›</span></button>`;
  else if (!cloud.user && cloud.client) h += `<button class="nudge" data-a="onb-open"><span>${L('Войди — подтяну календарь и Garmin', 'Sign in to bring in calendar and Garmin')}</span><span class="nudge-go">${L('Войти', 'Sign in')} ›</span></button>`;
  else if (cloud.user && cloud.cals && !cloud.cals.length && !(state.local.busy[wk]?.events || []).some(e => e.cal === 'file')) h += `<button class="nudge" data-a="settings"><span>${L('Подключи календарь — план встанет в свободные окна', 'Connect your calendar so the plan fits your free time')}</span><span class="nudge-go">${L('Подключить', 'Connect')} ›</span></button>`;
  const ti = todayIdx(wk);
  if (state.health?.track && ti >= 0 && ti <= 6 && !state.checks[todayStr()]) h += `<button class="nudge" data-a="pain-open"><span>${L('Как сегодня? Боль не отмечена', 'How is it today? Pain not logged')}</span><span class="nudge-go">${L('Отметить', 'Log')} ›</span></button>`;
  const g = gate();
  if (g.known && (g.doctor || g.stop)) h += `<section class="card alert"><div class="card-head"><h3>${g.doctor ? L('Напиши врачу', 'Message your doctor') : L('Стоп — напиши физио', 'Stop — message your physio')}</h3><button class="nav-btn link" data-a="pain-redo">${L('Изменить', 'Edit')}</button></div><p>${esc(g.doctor ? L(`Сидя ${g.c.sit}/10, ходьба ${g.c.walk}/10${g.c.rest ? ', в покое' : ''}: по твоим правилам это повод сразу написать. Бег, вел и стена на паузе.`, `Sitting ${g.c.sit}/10, walking ${g.c.walk}/10${g.c.rest ? ', at rest' : ''}: by your rules, message them now. Running, riding and climbing paused.`) : L(`${g.max}/10 — бег, вел и стена на паузе.`, `${g.max}/10 — running, riding and climbing paused.`))}</p></section>`;
  return h;
}
function painSheet() {
  const seg = (k) => `<div class="seg" role="group">${[0, 1, 2, 3].map(v => `<button data-a="pain" data-k="${k}" data-v="${v}" aria-pressed="${pending[k] === v}">${v === 3 ? '3+' : v}</button>`).join('')}</div>`;
  openSheet(`<div class="sheet-head"><h2>${L('Как сегодня?', 'How is it today?')}</h2><button class="nav-btn" data-a="close-sheet">${L('Отмена', 'Cancel')}</button></div><div class="sheet-scroll">
    <p class="hint">${L('Боль 0–10. От этого зависит, что можно сегодня и завтра.', 'Pain 0–10. It decides what’s on today and tomorrow.')}</p>
    <div class="pain"><span>${L('Сидя', 'Sitting')}</span>${seg('sit')}<span>${L('При ходьбе', 'Walking')}</span>${seg('walk')}</div>
    <label class="check" style="margin-top:14px"><input type="checkbox" id="painRest" ${pending.rest ? 'checked' : ''}> ${L('Болело ночью или в покое', 'Hurt at night or at rest')}</label>
    <div class="stack" style="padding-top:18px"><button class="btn primary" data-a="pain-save" ${pending.sit == null || pending.walk == null ? 'disabled' : ''}>${L('Записать', 'Save')}</button></div></div>`, {pain: true});
}
function painLine() {
  const g = gate();
  if (!g.known || g.doctor || g.stop || (g.max === 0 && !g.c.rest)) return '';
  return `<p class="painline">${esc(L(`Боль: сидя ${g.c.sit}/10, ходьба ${g.c.walk}/10 — бег ждёт 48 ч на 0, вел — пока сидя не 0`, `Pain: sitting ${g.c.sit}/10, walking ${g.c.walk}/10 — running waits for 48 h at 0, riding until sitting is 0`))} <button class="nav-btn link" data-a="pain-redo">${L('Изменить', 'Edit')}</button></p>`;
}
function loadBars(wk) {
  const acts = state.local.acts?.list; if (!acts) return '';
  const weeks = [-4, -3, -2, -1, 0].map(k => ymd(addDays(parseYmd(wk), 7 * k)));
  const mins = weeks.map(w => acts.filter(a => trainingSport(a.sport) && a.start.slice(0, 10) >= w && a.start.slice(0, 10) < ymd(addDays(parseYmd(w), 7))).reduce((s, a) => s + a.min, 0));
  const max = Math.max(60, ...mins);
  const title = weeks.map((w, i) => `${w}: ${fHours(mins[i])}`).join('\n');
  return `<span class="bars" title="${esc(title)}" aria-label="${esc(L('Часы по неделям: ', 'Hours per week: ') + mins.map(fHours).join(', '))}">${mins.map((m, i) => `<i class="${i === 4 ? 'cur' : ''}" style="height:${Math.max(3, Math.round(m / max * 34))}px"></i>`).join('')}</span>`;
}
function cardsHTML(wk, week) {
  let h = '';
  const ti = todayIdx(wk);
  // ask instead of carrying goals that haven't happened for weeks
  if (week && state.local.acts?.linked) {
    const acts = state.local.acts.list, cutoff = ymd(addDays(new Date(), -28));
    for (const sp of ['run', 'climb', 'gym', 'bike']) {
      if (!state.template.some(t => KINDS[t.kind].sport === sp)) continue;
      const a = state.asks[sp];
      if (a && (parseYmd(todayStr()) - parseYmd(a.at)) / 864e5 < 28) continue;
      if (acts.some(x => x.sport === sp && x.start.slice(0, 10) >= cutoff)) continue;
      const n = state.template.filter(t => KINDS[t.kind].sport === sp).length;
      const name = L(SPORTS[sp][0], SPORTS[sp][1]);
      // A question is one line; its answers live in a sheet, so the plan stays on top.
      h += `<button class="nudge" data-a="ask-open" data-s="${sp}" data-n="${n}"><span><span class="dot ${sp}"></span> ${L(`${name}: 4 недели без тренировок`, `${name}: none in 4 weeks`)}</span><span class="nudge-go">${L('Решить', 'Decide')} ›</span></button>`;
      break;
    }
  }
  // multi-day all-day events: maybe a trip
  if (week) {
    const seen = new Set();
    for (const e of state.local.busy[wk]?.events || []) {
      if (!e.allDay) continue;
      const span = (parseYmd(e.e.slice(0, 10)) - parseYmd(e.s.slice(0, 10))) / 864e5;
      const tripWord = /(поездк|отпуск|командир|перел[её]т|trip|travel|vacation|holiday|flight|offsite|✈)/i.test(e.title);
      const key = e.title + '|' + e.s;
      if ((span < 2 && !tripWord) || week.cal?.[key] || seen.has(key)) continue;
      const days = []; for (let i = 0; i < 7; i++) { const ds = ymd(addDays(parseYmd(wk), i)); if (e.s.slice(0, 10) <= ds && ds < e.e.slice(0, 10) && i >= ti) days.push(i); }
      if (!days.length) continue;
      seen.add(key);
      h += `<button class="nudge" data-a="trip-open" data-k="${esc(key)}" data-days="${days.join(',')}" data-t="${esc(e.title)}"><span>«${esc(e.title)}» · ${days.map(d => DAYS()[d]).join(', ')} — ${L('поездка?', 'a trip?')}</span><span class="nudge-go">${L('Ответить', 'Answer')} ›</span></button>`;
    }
  }
  return h;
}
const pending = {sit: null, walk: null, rest: false};
let logOpen = false;
document.addEventListener('toggle', ev => { if (ev.target.classList?.contains('log')) logOpen = ev.target.open; }, true);

const TL_FROM = 6 * 60, TL_TO = 23 * 60;
const pct = m => Math.max(0, Math.min(100, (m - TL_FROM) / (TL_TO - TL_FROM) * 100));

/* ---------- sheets ---------- */
let sheetCtx = null;
function openSheet(html, ctx) { sheetCtx = ctx || null; $('#sheetPanel').className = 'sheet-panel' + (ctx?.chat ? ' chat' : ''); $('#sheetPanel').innerHTML = html; $('#sheet').hidden = false; }
function closeSheet() { if (sheetCtx?.wiz) wiz.ctrl?.abort(); $('#sheet').hidden = true; sheetCtx = null; }
/* ---------- one workout: summary, zones, charts ---------- */
const actMem = new Map();
function actCached(id) {
  if (actMem.has(id)) return actMem.get(id);
  try { const d = JSON.parse(localStorage.getItem('train.act.' + id)); if (d?.summary) { actMem.set(id, d); return d; } } catch {}
  return null;
}
function actStore(id, d) {
  actMem.set(id, d);
  try {
    const keys = JSON.parse(localStorage.getItem('train.act.keys') || '[]').filter(k => k !== id);
    keys.push(id);
    while (keys.length > 15) localStorage.removeItem('train.act.' + keys.shift());
    localStorage.setItem('train.act.' + id, JSON.stringify(d));
    localStorage.setItem('train.act.keys', JSON.stringify(keys));
  } catch {}
}
/* ---------- analytics for one workout: computed from Garmin's summary, series and the cached history ---------- */
const sportOfSummary = S => S.type === 'hiking' ? 'hike' : S.sport;
// Highest average power over any window of `sec` seconds (samples are uneven: integrate, don't count).
function bestPower(S, sec) {
  const t = S.t, p = S.pw; if (!t || !p || t[t.length - 1] - t[0] < sec) return null;
  const E = [0];
  for (let i = 1; i < t.length; i++) E.push(E[i - 1] + ((p[i - 1] ?? 0) + (p[i] ?? 0)) / 2 * (t[i] - t[i - 1]));
  let best = null;
  for (let i = 0, j = 0; i < t.length; i++) {
    while (j < t.length && t[j] - t[i] < sec) j++;
    if (j >= t.length) break;
    const avg = (E[j] - E[i]) / (t[j] - t[i]);
    if (best == null || avg > best) best = avg;
  }
  return best;
}
// Fastest time over `m` metres, interpolated between samples.
function fastest(S, m) {
  const t = S.t, d = S.dist; if (!t || !d) return null;
  let best = null;
  for (let i = 0, j = 0; i < d.length; i++) {
    if (d[i] == null) continue;
    if (j < i) j = i;
    while (j < d.length && (d[j] == null || d[j] - d[i] < m)) j++;
    if (j >= d.length) break;
    const sec = (t[j] - t[i]) * m / (d[j] - d[i]);
    if (best == null || sec < best) best = sec;
  }
  return best;
}
// Aerobic decoupling: output per heartbeat, first half vs second half of the moving part.
function decoupling(S, sport) {
  const out = sport === 'bike' ? S.pw : S.spd; if (!out || !S.hr) return null;
  const idx = S.t.map((_, i) => i).filter(i => S.hr[i] > 60 && out[i] != null && out[i] > (sport === 'bike' ? 0 : 0.5));
  if (idx.length < 20) return null;
  const t0 = S.t[idx[0]], t1 = S.t[idx[idx.length - 1]];
  if (t1 - t0 < 40 * 60) return null;
  const mid = (t0 + t1) / 2, half = k => { const xs = idx.filter(i => k ? S.t[i] >= mid : S.t[i] < mid); return xs.reduce((a, i) => a + out[i], 0) / xs.reduce((a, i) => a + S.hr[i], 0); };
  const r1 = half(0), r2 = half(1);
  return (r1 - r2) / r1 * 100;
}
// Efficiency factor: power (bike) or metres per minute (run, hike) per heartbeat.
const efOf = (sport, x) => sport === 'bike' ? (x.np && x.hr ? x.np / x.hr : null) : (x.hr && x.mpm ? x.mpm / x.hr : null);
const EASY = new Set(['run_easy', 'run_long', 'bike_easy', 'bike_long', 'hike', 'mobility']);
// Seconds in each of the five words, from an HR series {t, hr}; a sample counts until the next one.
function wordTimes(ser, t) {
  const edges = [t.lt1, t.steady, t.tempo[1], t.thr[1]], out = [0, 0, 0, 0, 0];
  for (let i = 0; i < ser.t.length - 1; i++) {
    const hr = ser.hr[i], dt = ser.t[i + 1] - ser.t[i];
    if (hr == null || !(dt > 0) || dt > 60) continue;
    const k = edges.findIndex(x => hr <= x); out[k === -1 ? 4 : k] += dt;
  }
  return out;
}
/* ---------- what a workout gives the plan ---------- */
// One line on how it went, then where it goes: what this kind of session builds for the goal, the week against the
// outlook, the sport's week, and what it unlocks next (the run cap, rule 69). No AI: the plan's own numbers.
const PURPOSE = {
  run_easy: ['аэробная база бега: ноги и сердце привыкают к нагрузке без лишней усталости', 'aerobic run base: legs and heart adapt without extra fatigue'],
  run_long: ['выносливость на ногах — основа беговой части', 'time on feet — the backbone of your running'],
  run_q: ['скорость на пороге: держать темп дольше', 'threshold speed: holding pace for longer'],
  bike_q: ['FTP — мощность на пороге, главный рычаг скорости на веле', 'FTP — threshold power, the main lever of bike speed'],
  bike_long: ['умение долго ехать ровно и есть на ходу', 'riding long and steady, eating on the move'],
  bike_easy: ['лёгкий объём и восстановление без ударной нагрузки', 'easy volume and recovery with no impact'],
  swim: ['техника и экономичность в воде', 'technique and economy in the water'],
  gym: ['сила и устойчивость к травмам, экономичность бега', 'strength, injury resilience and running economy'],
  climb: ['сила хвата и верха, разгрузка для ног', 'grip and upper strength, a break for the legs'],
  hike: ['длинная лёгкая нагрузка — выносливость без бега', 'long easy load — endurance without running'],
  mobility: ['восстановление — чтобы следующие тренировки были качественными', 'recovery — so the next sessions are good ones'],
};
const LEG = {run: ['беговой этап', 'the run leg'], bike: ['велоэтап', 'the bike leg'], swim: ['плавательный этап', 'the swim leg']};
function sessionFor(id, sid, wk) {
  if (sid) for (const w of [wk, view.wk]) { const x = state.weeks[w]?.sessions.find(s => s.id === sid); if (x) return x; }
  for (const w of Object.keys(state.weeks)) { const x = state.weeks[w].sessions.find(s => s.act?.id === id); if (x) return x; }
  return null;
}
function contribution(base, d, sid, an) {
  const S = d?.summary || {}, start = (S.start || base?.start || '').slice(0, 10); if (!start) return null;
  const wk = ymd(mondayOf(parseYmd(start))), id = base?.id ?? S.id, sess = sessionFor(id, sid, wk);
  const sp = sportOfSummary(S) || base?.sport, kind = sess?.kind || {run: 'run_easy', bike: 'bike_easy', swim: 'swim', gym: 'gym', climb: 'climb', hike: 'hike'}[sp];
  if (!kind || !PURPOSE[kind]) return null;
  const p = state.plan, v = an?.verdicts?.[0], out = [];
  // the comment
  let c;
  if (!sess) c = L('Сверх плана — засчитана в объём недели.', 'Not in the plan — counted in the week’s volume.');
  else if (v?.tone === 'warn' && EASY.has(kind)) c = L('Вышло тяжелее задуманного. Разово не страшно — следующую лёгкую держи ниже, иначе копится усталость.', 'Harder than planned. Once is fine — keep the next easy one lower, or fatigue builds.');
  else if (v?.tone === 'warn') c = L('Качества меньше задуманного — бывает. Не догоняй в следующей: план сам подстроит неделю.', 'Less quality than planned — it happens. Don’t make it up next time; the plan adjusts the week.');
  else if (EASY.has(kind)) c = L('Сделано как надо: объём в нужном пульсе.', 'Done right: volume at the right heart rate.');
  else c = L('Ключевая работа недели сделана.', 'The week’s key work is done.');
  // what it builds, for the goal
  const pur = L(PURPOSE[kind][0], PURPOSE[kind][1]);
  if (p?.goal === 'event' && p.eventName) {
    const left = Math.max(0, weeksFrom(wk, ymd(mondayOf(parseYmd(p.eventDate)))));
    const leg = p.sports?.includes('swim') && LEG[KINDS[kind].sport] ? ` (${L(LEG[KINDS[kind].sport][0], LEG[KINDS[kind].sport][1])})` : '';
    out.push(L(`К «${p.eventName}»${leg}: ${pur}. До старта ${left} нед.`, `Towards “${p.eventName}”${leg}: ${pur}. ${left} weeks to go.`));
  } else out.push(L(`Что строит: ${pur}.`, `What it builds: ${pur}.`));
  // the week against the outlook
  const o = outlookWeek(wk), done = actualHours(wk);
  if (o) out.push(L(`Неделя ${o.week} из ${o.of} (${PHASE[o.phase]?.[0] || ''}): ${fH(done)} из ${fH(o.hours)} — ${Math.round(done / o.hours * 100)}%.`, `Week ${o.week} of ${o.of} (${PHASE[o.phase]?.[1] || ''}): ${fH(done)} of ${fH(o.hours)} — ${Math.round(done / o.hours * 100)}%.`));
  else if (state.weeks[wk]) { const planned = state.weeks[wk].sessions.filter(s => s.status !== 'dropped').reduce((t, s) => t + (s.act?.min ?? s.min), 0) / 60; if (planned) out.push(L(`Неделя: ${fH(done)} из ${fH(planned)} по плану.`, `Week: ${fH(done)} of ${fH(planned)} planned.`)); }
  // the sport's week, and what it opens up next
  const e = ymd(addDays(parseYmd(wk), 7)), same = (state.local.acts?.list || []).filter(a => a.sport === sp && a.start.slice(0, 10) >= wk && a.start.slice(0, 10) < e);
  if (same.length > 1) out.push(L(`${SPORTS[sp]?.[0] || ''} за неделю: ${same.length} трен., ${fDur(same.reduce((t, a) => t + a.min, 0))}.`, `${SPORTS[sp]?.[1] || ''} this week: ${same.length} sessions, ${fDur(same.reduce((t, a) => t + a.min, 0))}.`));
  if (sp === 'run') { const lr = longestRun30(); if (lr) out.push(L(`Следующая длинная — до ${Math.round(lr * 1.1)} мин: +10% к самой длинной за 30 дней (правило 69).`, `Next long run — up to ${Math.round(lr * 1.1)} min: +10% on your longest in 30 days (rule 69).`)); }
  return {c, lines: out};
}
function contributionHTML(base, d, sid, an) {
  const x = contribution(base, d, sid, an); if (!x) return '';
  return `<div class="section-title">${L('Что это дало плану', 'What it gives the plan')}</div><p class="contrib-c">${esc(x.c)}</p><ul class="plan-why">${x.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
}
function analyse(d, base, sid) {
  const S = d.summary, sp = sportOfSummary(S), ser = d.series, verdicts = [], best = [];
  const sess = sessionFor(base?.id ?? S.id, sid, ymd(mondayOf(parseYmd((S.start || base?.start || todayStr()).slice(0, 10)))));
  // 1. intensity, against what was planned when there was a plan
  const ht = hrTargets(), wt = ht && ser?.t && ser?.hr ? wordTimes(ser, ht) : null, wtt = wt ? wt.reduce((a, b) => a + b, 0) : 0;
  const z = base?.hrz, zt = z ? z.reduce((a, b) => a + b, 0) : 0;
  if (wtt > 600) {
    const pc = i => Math.round(wt[i] / wtt * 100), easy = pc(0) + pc(1), up = Math.round((wt[2] + wt[3] + wt[4]) / 60), q = Math.round((wt[3] + wt[4]) / 60);
    const long = sess && /_long$/.test(sess.kind);
    if (sess && EASY.has(sess.kind)) verdicts.push(easy >= 80
      ? {head: L('Лёгкая, как задумано.', 'Easy, as planned.'), text: L(`${long ? `${easy}% времени до ${ht.steady} (Лёгкий и Ровный)` : `${pc(0)}% до ${ht.lt1} — Лёгкий${pc(1) ? `, ${pc(1)}% в Ровном (${ht.lt1 + 1}–${ht.steady}) — нормально` : ''}`}.`, `${long ? `${easy}% of the time under ${ht.steady} (Easy and Steady)` : `${pc(0)}% under ${ht.lt1} — Easy${pc(1) ? `, ${pc(1)}% Steady (${ht.lt1 + 1}–${ht.steady}) — fine` : ''}`}.`), tone: 'good'}
      : {head: L('Тяжелее задуманного.', 'Harder than planned.'), text: L(`${up} мин выше ${ht.steady} — в Темпе и выше. Лёгкий день лучше держать до ${ht.lt1}, на длинной — до ${ht.steady}.`, `${up} min above ${ht.steady} — Tempo and up. Keep easy days under ${ht.lt1}, long ones under ${ht.steady}.`), tone: 'warn'});
    else if (sess?.kind === 'bike_q' || sess?.kind === 'run_q') verdicts.push(up >= 15
      ? {head: L('Качество получилось.', 'Quality landed.'), text: L(`${up} мин в Темпе и выше, из них ${q} — Порог и Тяжёлый.`, `${up} min at Tempo and above, ${q} of them Threshold and Hard.`), tone: 'good'}
      : {head: L('Качества было мало.', 'Little quality.'), text: L(`Всего ${up} мин выше ${ht.steady}.`, `Only ${up} min above ${ht.steady}.`), tone: 'warn'});
    else verdicts.push({head: easy >= 80 ? L('В основном легко.', 'Mostly easy.') : q >= 20 ? L('Тяжёлая тренировка.', 'A hard session.') : L('Смешанная интенсивность.', 'Mixed intensity.'),
      text: L(`Лёгкий ${pc(0)}% · Ровный ${pc(1)}% · Темп ${pc(2)}% · Порог и выше ${q} мин.`, `Easy ${pc(0)}% · Steady ${pc(1)}% · Tempo ${pc(2)}% · Threshold+ ${q} min.`)});
  } else if (zt > 600) {
    const ez = hrTargets()?.e || 2, easy = z.slice(0, ez).reduce((a, b) => a + b, 0) / zt * 100, hard = z.slice(ez + 1).reduce((a, b) => a + b, 0) / 60, mid = z[ez] / zt * 100;
    const eL = `Z1–Z${ez}`, mL = `Z${ez + 1}`, hL = ez + 2 < 5 ? `Z${ez + 2}–Z5` : "Z5";
    if (sess && EASY.has(sess.kind)) verdicts.push(easy >= 70
      ? {head: L('Лёгкая, как задумано.', 'Easy, as planned.'), text: L(`${Math.round(easy)}% времени в ${eL}.`, `${Math.round(easy)}% of the time in ${eL}.`), tone: 'good'}
      : {head: L('Тяжелее задуманного.', 'Harder than planned.'), text: L(`В ${eL} только ${Math.round(easy)}%, в ${mL} ${Math.round(mid)}% — лёгкий день ушёл в «серую зону».`, `Only ${Math.round(easy)}% in ${eL}, ${Math.round(mid)}% in ${mL} — the easy day drifted into the grey zone.`), tone: 'warn'});
    else if (sess?.kind === 'bike_q') verdicts.push(hard + z[ez] / 60 >= 20
      ? {head: L('Качество получилось.', 'Quality landed.'), text: L(`${Math.round(z[ez] / 60 + hard)} мин в ${mL}–Z5.`, `${Math.round(z[ez] / 60 + hard)} min in ${mL}–Z5.`), tone: 'good'}
      : {head: L('Качества было мало.', 'Little quality.'), text: L(`Всего ${Math.round(z[ez] / 60 + hard)} мин в ${mL}–Z5.`, `Only ${Math.round(z[ez] / 60 + hard)} min in ${mL}–Z5.`), tone: 'warn'});
    else verdicts.push({head: easy >= 70 ? L('В основном легко.', 'Mostly easy.') : hard >= 20 ? L('Тяжёлая тренировка.', 'A hard session.') : L('Смешанная интенсивность.', 'Mixed intensity.'), text: L(`${eL} ${Math.round(easy)}% · ${mL} ${Math.round(mid)}% · ${hL} ${Math.round(hard)} мин.`, `${eL} ${Math.round(easy)}% · ${mL} ${Math.round(mid)}% · ${hL} ${Math.round(hard)} min.`)});
  }
  // 2. planned vs done
  if (sess && sess.status === 'done' && S.dur) {
    const planned = sess.short || sess.min, diff = Math.round(S.dur / 60 - planned);
    if (Math.abs(diff) >= 10) verdicts.push({head: diff > 0 ? L(`На ${diff} мин дольше плана.`, `${diff} min longer than planned.`) : L(`На ${-diff} мин короче плана.`, `${-diff} min shorter than planned.`), text: L(`План ${fDur(planned)}, сделано ${fDur(Math.round(S.dur / 60))}.`, `Planned ${fDur(planned)}, done ${fDur(Math.round(S.dur / 60))}.`)});
  }
  // 3. decoupling
  const dec = ser && (sp === 'bike' || sp === 'run' || sp === 'hike') ? decoupling(ser, sp) : null;
  if (dec != null) verdicts.push(dec < 5
    ? {head: L(`Дрейф пульса ${fNum(dec, 1)}%.`, `HR drift ${fNum(dec, 1)}%.`), text: L('Меньше 5% — аэробная база держит всю тренировку.', 'Under 5% — the aerobic base held for the whole session.'), tone: 'good'}
    : {head: L(`Дрейф пульса ${fNum(dec, 1)}%.`, `HR drift ${fNum(dec, 1)}%.`), text: L(`Во второй половине на тот же удар пульса ${sp === 'bike' ? 'мощность' : 'скорость'} ниже — усталость, жара или мало воды.`, `Second half gave less ${sp === 'bike' ? 'power' : 'speed'} per beat — fatigue, heat or too little water.`), tone: dec >= 10 ? 'warn' : ''});
  // 4. efficiency and load against recent workouts of the same sport
  const mine = {np: S.np, hr: S.hr, mpm: S.spd ? S.spd * 60 : null};
  const ef = efOf(sp, mine);
  const start = S.start || base?.start || '';
  const hist = (state.local.acts?.list || []).filter(a => a.sport === sp && a.id !== S.id && a.start < start && a.start >= ymd(addDays(parseYmd(start.slice(0, 10)), -90)))
    .map(a => ({...a, ef: efOf(sp, {np: a.np, hr: a.hr, mpm: a.km && a.min ? a.km * 1000 / a.min : null})}));
  const avg = k => { const xs = hist.map(a => a[k]).filter(v => v != null && v > 0); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const efAvg = avg('ef');
  if (ef && efAvg && hist.filter(a => a.ef).length >= 3) {
    const pctD = (ef / efAvg - 1) * 100;
    verdicts.push({head: L(`Эффективность ${pctD >= 0 ? 'выше' : 'ниже'} обычной на ${fNum(Math.abs(pctD), 0)}%.`, `Efficiency ${fNum(Math.abs(pctD), 0)}% ${pctD >= 0 ? 'above' : 'below'} usual.`),
      text: sp === 'bike' ? L(`NP на удар пульса: ${fNum(ef, 2)} против ${fNum(efAvg, 2)} за 90 дней.`, `NP per beat: ${fNum(ef, 2)} vs ${fNum(efAvg, 2)} over 90 days.`) : L(`Метров в минуту на удар пульса: ${fNum(ef, 2)} против ${fNum(efAvg, 2)} за 90 дней.`, `Metres per minute per beat: ${fNum(ef, 2)} vs ${fNum(efAvg, 2)} over 90 days.`), tone: pctD >= 3 ? 'good' : ''});
  }
  const loadAvg = avg('load');
  if (base?.load && loadAvg && hist.length >= 3) {
    const k = base.load / loadAvg;
    if (k >= 1.3 || k <= 0.7) verdicts.push({head: k >= 1.3 ? L(`Нагрузка в ${fNum(k, 1)} раза выше обычной.`, `Load ${fNum(k, 1)}× your usual.`) : L('Нагрузка ниже обычной.', 'Lighter than usual.'), text: L(`Training load ${base.load} против ${Math.round(loadAvg)} в среднем.`, `Training load ${base.load} vs ${Math.round(loadAvg)} on average.`) + (k >= 1.5 ? L(' Завтра лучше легко.', ' Keep tomorrow easy.') : '')});
  }
  // best efforts
  // 20 min is Garmin's own figure (whole recording); 5 and 60 min are estimated from the ~400 chart samples.
  if (ser && sp === 'bike' && ser.pw) for (const [label, sec] of [['5 мин', 300], ['20 мин', 1200], ['60 мин', 3600]]) { const v = sec === 1200 && S.pw20 ? S.pw20 : bestPower(ser, sec); if (v) best.push([L(label, label.replace('мин', 'min')) + (sec === 1200 && S.pw20 ? '' : ' ≈'), fNum(v) + L(' Вт', ' W')]); }
  if (ser && (sp === 'run' || sp === 'hike') && ser.dist) for (const [label, m] of [['1 км', 1000], ['5 км', 5000], ['10 км', 10000]]) { const v = fastest(ser, m); if (v) best.push([L(label, label.replace('км', 'km')), sp === 'run' ? `${hms(v)} · ${fPace(v / (m / 1000))}${L('/км', '/km')}` : hms(v)]); }
  // this workout against the recent ones of its sport, plus the EF trend
  let cmp = '';
  if (hist.length >= 2) {
    const rows = [];
    const row = (label, cur, mean, fmt, unitDiff) => { if (cur == null || mean == null) return; const dlt = cur - mean; rows.push(`<tr><td>${esc(label)}</td><td class="num">${esc(fmt(cur))}</td><td class="num muted">${esc(fmt(mean))}</td><td class="num">${dlt >= 0 ? '+' : '−'}${esc(unitDiff(Math.abs(dlt)))}</td></tr>`); };
    row(L('Длительность', 'Duration'), S.dur ? S.dur / 60 : null, avg('min'), v => fDur(Math.round(v)), v => fDur(Math.round(v)));
    if (S.dist) row(L('Дистанция', 'Distance'), S.dist / 1000, avg('km'), v => fNum(v, 1) + L(' км', ' km'), v => fNum(v, 1));
    row(L('Пульс ср.', 'Avg HR'), S.hr, avg('hr'), v => fNum(v), v => fNum(v));
    if (sp === 'bike') row('NP', S.np, avg('np'), v => fNum(v) + L(' Вт', ' W'), v => fNum(v));
    if (S.up || base?.elev) row(L('Набор', 'Climbing'), S.up ?? base.elev, avg('elev'), v => fNum(v) + L(' м', ' m'), v => fNum(v));
    if (ef) row('EF', ef, efAvg, v => fNum(v, 2), v => fNum(v, 2));
    const pts = [...hist.filter(a => a.ef).slice(-11).map(a => ({ef: a.ef, cur: false, start: a.start})), ...(ef ? [{ef, cur: true, start}] : [])];
    let spark = '';
    if (pts.length >= 4) {
      const lo = Math.min(...pts.map(p => p.ef)), hi = Math.max(...pts.map(p => p.ef)), y = v => 34 - (v - lo) / ((hi - lo) || 1) * 28, x = i => 4 + i / (pts.length - 1) * 292;
      spark = `<figure class="spark"><figcaption>${L(`EF по последним ${pts.length} тренировкам`, `EF over the last ${pts.length} workouts`)}</figcaption><svg viewBox="0 0 300 40" role="img" aria-label="${esc(pts.map(p => fNum(p.ef, 2)).join(', '))}"><polyline points="${pts.map((p, i) => `${x(i).toFixed(1)},${y(p.ef).toFixed(1)}`).join(' ')}" class="line"/>${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.ef).toFixed(1)}" r="${p.cur ? 4.5 : 2.5}" class="${p.cur ? 'cur' : ''}"/>`).join('')}</svg></figure>`;
    }
    if (rows.length) cmp = `<div class="section-title">${L(`Против обычного · ${hist.length} трен. за 90 дней`, `Against usual · ${hist.length} workouts in 90 days`)}</div><table class="cmp"><thead><tr><th></th><th>${L('Эта', 'This')}</th><th>${L('Обычно', 'Usual')}</th><th>Δ</th></tr></thead><tbody>${rows.join('')}</tbody></table>${spark}`;
  }
  return {verdicts, best, cmp};
}

async function openActivity(id, plan, sid) {
  if (String(id).startsWith('hk:')) {
    const b = (state.local.acts?.list || []).find(a => a.id === id); if (!b) return;
    const d = {summary: {name: b.name, start: b.start, type: b.type, sport: b.sport, dur: b.min * 60, dist: b.km ? b.km * 1000 : null, up: b.elev || null, hr: b.hr || null, spd: b.km && b.min ? b.km * 1000 / (b.min * 60) : null}, series: null};
    openSheet(activityHTML(b, d, plan, sid, false) + '', {act: id, plan, sid});
    return;
  }
  id = Number(id);
  const base = (state.local.acts?.list || []).find(a => a.id === id) || null;
  let d = actCached(id);
  openSheet(activityHTML(base, d, plan, sid, !d), {act: id, plan, sid});
  if (d) return wireCharts(d);
  d = await fn('activity', {id});
  if (sheetCtx?.act !== id) return;
  if (d.error || !d.summary) { $('#sheetPanel').innerHTML = activityHTML(base, null, plan, sid, false, d.error || 'unavailable'); return; }
  actStore(id, d);
  $('#sheetPanel').innerHTML = activityHTML(base, d, plan, sid, false);
  wireCharts(d);
}
async function refreshActivity() {
  const c = sheetCtx; if (!c?.act) return;
  const id = c.act;
  actMem.delete(id); try { localStorage.removeItem('train.act.' + id); } catch {}
  const btn = document.querySelector('[data-a="act-refresh"]'); if (btn) { btn.disabled = true; btn.textContent = L('Обновляю…', 'Refreshing…'); }
  await loadActs(true);
  if (sheetCtx?.act !== id) return;
  await openActivity(id, c.plan, c.sid);
  toast(L('Отчёт обновлён', 'Report refreshed'));
}
const hms = sec => { sec = Math.round(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s2 = sec % 60; return h ? `${h}:${pad(m)}:${pad(s2)}` : `${m}:${pad(s2)}`; };
const fNum = (v, dp = 0) => v == null ? '—' : Number(v).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', {minimumFractionDigits: dp, maximumFractionDigits: dp});
const paceOf = spd => spd && spd > 0.8 ? 1000 / spd : null; // seconds per km
const fPace = sec => sec == null ? '—' : `${Math.floor(sec / 60)}:${pad(Math.round(sec % 60) % 60)}`;
function smooth(arr, w) {
  if (!arr) return arr;
  return arr.map((_, i) => { let s2 = 0, n = 0; for (let j = Math.max(0, i - w); j <= Math.min(arr.length - 1, i + w); j++) if (arr[j] != null) { s2 += arr[j]; n++; } return arr[i] == null ? null : n ? s2 / n : null; });
}
// The series each sport is read by; one chart per measure, one shared time axis.
function chartDefs(d) {
  const S = d.series, sp = d.summary.type === 'hiking' ? 'hike' : d.summary.sport, out = [];
  if (!S) return out;
  const has = a => a && a.some(v => v != null && v > 0);
  const sum = d.summary;
  if (has(S.hr)) out.push({key: 'hr', label: L('Пульс', 'Heart rate'), unit: L('уд/мин', 'bpm'), data: S.hr, fmt: v => fNum(v), avg: sum.hr});
  if (sp === 'bike' && has(S.pw)) out.push({key: 'pw', label: L('Мощность', 'Power'), unit: L('Вт', 'W'), data: smooth(S.pw, 2), fmt: v => fNum(v), avg: sum.pw});
  if (sp === 'run' && has(S.spd)) out.push({key: 'pace', label: L('Темп', 'Pace'), unit: L('/км', '/km'), data: smooth(S.spd.map(paceOf), 2).map(v => v == null ? null : Math.min(720, Math.max(150, v))), fmt: fPace, invert: true, avg: paceOf(sum.spd)});
  if (sp !== 'run' && sp !== 'bike' && has(S.spd)) out.push({key: 'spd', label: L('Скорость', 'Speed'), unit: L('км/ч', 'km/h'), data: S.spd.map(v => v == null ? null : v * 3.6), fmt: v => fNum(v, 1)});
  if (has(S.el)) out.push({key: 'el', label: L('Высота', 'Elevation'), unit: L('м', 'm'), data: S.el, fmt: v => fNum(v), area: true});
  return out;
}
function runSplits(S) {
  if (!S?.dist || !S?.t) return [];
  const out = []; let k = 1, prevT = 0, prevI = 0;
  for (let i = 1; i < S.dist.length; i++) {
    const d0 = S.dist[i - 1], d1 = S.dist[i];
    if (d0 == null || d1 == null) continue;
    while (d1 >= k * 1000) {
      const f = (k * 1000 - d0) / ((d1 - d0) || 1), tk = S.t[i - 1] + f * (S.t[i] - S.t[i - 1]);
      const hrs = (S.hr || []).slice(prevI, i + 1).filter(v => v != null);
      out.push({km: k, sec: tk - prevT, hr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null});
      prevT = tk; prevI = i; k++;
    }
  }
  return out;
}
function activityHTML(base, d, plan, sid, loading, error) {
  const S = d?.summary || {}, sp = S.type === 'hiking' ? 'hike' : S.sport || base?.sport || 'other';
  const name = S.name || base?.name || L('Тренировка', 'Workout');
  const start = S.start || base?.start || '';
  const when = start ? new Date(start.replace(' ', 'T')).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : '';
  let h = `<div class="sheet-head"><h2>${esc(name)}</h2><span class="sheet-acts">${loading ? '' : `<button class="nav-btn" data-a="act-refresh" aria-label="${L('Обновить отчёт', 'Refresh the report')}">${L('Обновить', 'Refresh')}</button>`}<button class="nav-btn" data-a="close-sheet">${L('Готово', 'Done')}</button></span></div><div class="sheet-scroll act" data-sport="${esc(sp)}">`;
  h += `<p class="hint">${esc(when)}${plan ? ' · ' + esc(plan) : ''}</p>`;
  const dur = S.dur ?? (base ? base.min * 60 : null), dist = S.dist ?? (base?.km ? base.km * 1000 : null);
  h += `<div class="act-big"><span class="big num">${hms(dur)}</span><span class="hint">${[dist ? fNum(dist / 1000, 1) + L(' км', ' km') : '', (S.up ?? base?.elev) ? '↑ ' + fNum(S.up ?? base.elev) + L(' м', ' m') : '', S.moving && S.dur && S.dur - S.moving > 120 ? L('в движении ', 'moving ') + hms(S.moving) : ''].filter(Boolean).join(' · ')}</span></div>`;
  if (loading) return h + `<p class="hint" style="padding:24px 0">${L('Загружаю из Garmin…', 'Loading from Garmin…')}</p></div>`;
  if (error) return h + `<p class="hint" style="padding:24px 0">${error === 'signed_out' ? L('Войди, чтобы видеть детали из Garmin', 'Sign in to see Garmin details') : L('Garmin не отдал детали — попробуй позже', 'Garmin didn’t return details — try later')}</p></div>`;
  // stats, by sport; empty ones are left out
  const st = [];
  const add = (label, value) => { if (value && !/^—/.test(value)) st.push([label, value]); };
  if (sp === 'bike') { add(L('Мощность NP / ср.', 'Power NP / avg'), S.np ? `${fNum(S.np)} / ${fNum(S.pw)} ${L('Вт', 'W')}` : null); add(L('Скорость ср.', 'Avg speed'), S.spd ? fNum(S.spd * 3.6, 1) + L(' км/ч', ' km/h') : null); add('TSS · IF', S.tss ? `${fNum(S.tss)} · ${fNum(S.if, 2)}` : null); }
  if (sp === 'hike') { add(L('Набор / спуск', 'Up / down'), S.up ? `↑ ${fNum(S.up)} · ↓ ${fNum(S.down)}${L(' м', ' m')}` : null); add(L('Скорость в движении', 'Moving speed'), S.spd ? fNum(S.spd * 3.6, 1) + L(' км/ч', ' km/h') : null); }
  if (sp === 'run') add(L('Темп ср.', 'Avg pace'), S.spd ? fPace(paceOf(S.spd)) + L(' /км', ' /km') : null);
  add(L('Пульс ср. / макс.', 'HR avg / max'), S.hr ? `${fNum(S.hr)} / ${fNum(S.hrMax)}` : null);
  add(L('Каденс', 'Cadence'), S.cad ? fNum(S.cad) + (sp === 'run' ? L(' шаг/мин', ' spm') : L(' об/мин', ' rpm')) : null);
  add('Training Effect', S.te ? `${fNum(S.te, 1)} ${L('аэроб.', 'aer.')} · ${fNum(S.teAn, 1)} ${L('анаэроб.', 'anaer.')}` : null);
  add(L('Калории', 'Calories'), S.kcal ? fNum(S.kcal) + L(' ккал', ' kcal') : null);
  add(L('Температура', 'Temperature'), S.temp != null ? fNum(S.temp) + '°' : null);
  const an = d ? analyse(d, base, sid) : null;
  if (an?.verdicts.length) h += `<ul class="verdicts">${an.verdicts.map(v => `<li class="${v.tone || ''}"><b>${esc(v.head)}</b> ${esc(v.text)}</li>`).join('')}</ul>`;
  h += contributionHTML(base, d, sid, an);
  if (st.length) h += `<dl class="act-stats">${st.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}</dd></div>`).join('')}</dl>`;
  if (an?.best.length) h += `<div class="section-title">${L('Лучшие отрезки', 'Best efforts')}</div>${an.best.some(b => b[0].endsWith('≈')) ? `<p class="hint" style="margin:-4px 0 8px">${L('≈ — оценка по точкам графика', '≈ — estimated from chart samples')}</p>` : ''}<dl class="act-stats best">${an.best.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}</dd></div>`).join('')}</dl>`;
  if (an?.cmp) h += an.cmp;
  // heart-rate zones: one hue, light to dark
  const z = base?.hrz, zt = z ? z.reduce((a, b) => a + b, 0) : 0;
  if (zt > 60) {
    h += `<div class="section-title">${L('Пульсовые зоны', 'Heart-rate zones')}</div><div class="zones" role="img" aria-label="${esc(z.map((v, i) => `Z${i + 1} ${Math.round(v / 60)} ${L('мин', 'min')}`).join(', '))}">${z.map((v, i) => v > 0 ? `<i class="z${i + 1}" style="flex:${v}"></i>` : '').join('')}</div>
      <div class="zones-key">${z.map((v, i) => `<span><i class="z${i + 1}"></i>Z${i + 1} <b class="num">${Math.round(v / 60)}</b> ${L('мин', 'min')}</span>`).join('')}</div>`;
  }
  // charts
  const defs = d ? chartDefs(d) : [];
  if (defs.length) {
    const T = d.series.t, end = T[T.length - 1] || 1;
    h += `<div class="section-title">${L('По ходу тренировки', 'Through the workout')}</div><div class="charts" data-end="${end}">
      <div class="readout num" aria-live="polite">${L('Проведи пальцем по графику', 'Drag across a chart')}</div>`;
    for (const c of defs) {
      const vals = c.data.filter(v => v != null);
      let lo = Math.min(...vals), hi = Math.max(...vals);
      if (c.key === 'hr') { lo = Math.max(60, lo - 5); hi += 5; } else if (c.key === 'el') { const pad2 = Math.max(10, (hi - lo) * .1); lo -= pad2; hi += pad2; } else { lo = Math.max(0, lo); }
      if (hi - lo < 1) hi = lo + 1;
      const y = v => c.invert ? (v - lo) / (hi - lo) * 100 : 100 - (v - lo) / (hi - lo) * 100;
      let path = '', pen = false;
      c.data.forEach((v, i) => { if (v == null) { pen = false; return; } const x = T[i] / end * 1000; path += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${y(v).toFixed(1)}`; pen = true; });
      const area = c.area ? `${path}L1000 100L0 100Z` : '';
      // The average shown is Garmin's own (whole recording), so it matches the summary above.
      const mean = c.avg ?? vals.reduce((a, b) => a + b, 0) / vals.length;
      c.y = y; c.lo = lo; c.hi = hi;
      h += `<figure class="chart" data-key="${c.key}"><figcaption><span>${esc(c.label)}</span><span class="muted">${esc(c.unit)}</span></figcaption>
        <div class="plot"><svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-label="${esc(`${c.label}: ${c.fmt(lo)}–${c.fmt(hi)} ${c.unit}, ${L('среднее', 'average')} ${c.fmt(mean)}`)}" role="img">
          <line x1="0" x2="1000" y1="${y(c.invert ? lo : hi).toFixed(1)}" y2="${y(c.invert ? lo : hi).toFixed(1)}" class="grid"/><line x1="0" x2="1000" y1="${y(mean).toFixed(1)}" y2="${y(mean).toFixed(1)}" class="grid mean"/>
          ${area ? `<path d="${area}" class="area"/>` : ''}<path d="${path}" class="line"/></svg>
          <span class="ylab top num">${esc(c.fmt(c.invert ? lo : hi))}</span><span class="ylab mid num">${L('ср.', 'avg')} ${esc(c.fmt(mean))}</span>
          <i class="dot-h"></i></div></figure>`;
    }
    h += `<div class="xaxis num"><span>0:00</span><span>${hms(end / 2)}</span><span>${hms(end)}</span></div><i class="cross"></i></div>`;
    sheetDefs = defs;
  }
  if (sp === 'run' && d?.series) {
    const sp2 = runSplits(d.series);
    if (sp2.length) h += `<div class="section-title">${L('Километры', 'Splits')}</div><table class="splits num"><thead><tr><th>${L('км', 'km')}</th><th>${L('Темп', 'Pace')}</th><th>${L('Пульс', 'HR')}</th></tr></thead><tbody>${sp2.map(r => `<tr><td>${r.km}</td><td>${fPace(r.sec)}</td><td>${r.hr ?? '—'}</td></tr>`).join('')}</tbody></table>`;
  }
  if (cloud.ai && base?.id) h += `<div class="stack" style="padding-top:20px"><button class="btn quiet" data-a="chat-act" data-id="${base.id}">${icon('chat', 18)}${L('Обсудить с ассистентом', 'Discuss with the assistant')}</button></div>`;
  if (sid) h += `<div class="stack" style="padding-top:20px"><button class="btn quiet" data-a="mark" data-id="${sid}" data-st="planned">${L('Не засчитывать — вернуть в план', 'Don’t count it — back to plan')}</button></div>`;
  return h + '</div>';
}
let sheetDefs = [];
// One crosshair across all charts; the readout names the moment and every value at it.
function wireCharts(d) {
  const box = document.querySelector('#sheetPanel .charts'); if (!box) return;
  const T = d.series.t, end = +box.dataset.end, cross = box.querySelector('.cross'), out = box.querySelector('.readout');
  const move = ev => {
    const plot = box.querySelector('.plot').getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (ev.clientX - plot.left) / plot.width)), at = f * end;
    let i = 0; for (let k = 1; k < T.length; k++) if (Math.abs(T[k] - at) < Math.abs(T[i] - at)) i = k;
    const x = T[i] / end;
    cross.hidden = false; cross.style.left = `calc(${(plot.left - box.getBoundingClientRect().left).toFixed(1)}px + ${(x * plot.width).toFixed(1)}px)`;
    const parts = [hms(T[i])];
    box.querySelectorAll('.chart').forEach((fig, n) => {
      const c = sheetDefs[n], v = c.data[i], dot = fig.querySelector('.dot-h');
      if (v == null) { dot.hidden = true; return; }
      dot.hidden = false; dot.style.left = `${x * 100}%`; dot.style.top = `${c.y(v)}%`;
      parts.push(`${c.label} ${c.fmt(v)} ${c.unit}`);
    });
    out.textContent = parts.join(' · ');
  };
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerdown', move);
  box.addEventListener('pointerleave', () => { cross.hidden = true; box.querySelectorAll('.dot-h').forEach(x => { x.hidden = true; }); });
  cross.hidden = true; box.querySelectorAll('.dot-h').forEach(x => { x.hidden = true; });
}

function sessionSheet(id) {
  const wk = view.wk, week = state.weeks[wk], raw = week?.sessions.find(s => s.id === id); if (!raw) return;
  const s = effective(wk, raw), D = DAYS(), ti = todayIdx(wk);
  if (raw.status === 'done' && raw.act?.id) return openActivity(raw.act.id, L(`По плану: ${kName(raw.kind)} · ${fDur(raw.short || raw.min)}`, `Planned: ${kName(raw.kind)} · ${fDur(raw.short || raw.min)}`), id);
  const when = s.day != null ? `${D[s.day]}${s.start != null ? ' · ' + hm(s.start) : ''} · ${fDur(s.min)}` : fDur(s.min);
  let h = `<div class="sheet-head"><h2>${esc(kName(s.kind))}</h2><button class="nav-btn" data-a="close-sheet">${L('Готово', 'Done')}</button></div><div class="sheet-scroll">
    <p class="num" style="font-size:15px">${esc(when)}</p><p class="hint" style="margin:6px 0 4px">${esc(sDetail(s))}</p>${s.why ? `<p class="hint">${esc(whyText(s.why))}</p>` : ''}${s.capNote ? `<p class="hint" style="color:var(--warn)">${esc(s.capNote)}</p>` : ''}${s.rpe ? `<p class="hint">${L('Усилие', 'Effort')}: ${s.rpe}/10 · ${L('нагрузка', 'load')} ${sLoad(s)}</p>` : ''}${guideHTML(s)}`;
  if (s.status === 'planned' || s.status === 'skipped' || s.status === 'done') {
    h += `<div class="section-title">${L('Перенести на', 'Move to')}</div><div class="chips-row" style="flex-wrap:wrap">${D.map((d, i) => `<button class="chip" data-a="sheet-move" data-id="${id}" data-d="${i}" ${i < ti ? 'disabled style="opacity:.35"' : ''} aria-pressed="${s.day === i}">${d}</button>`).join('')}</div>
      <div class="section-title">${L('Есть только', 'Only have')}</div><div class="chips-row">${[30, 45, 60, 90].map(m => `<button class="chip" data-a="sheet-min" data-id="${id}" data-m="${m}">${fDur(m)}</button>`).join('')}</div>
      <div class="stack" style="padding-top:16px">${s.status !== 'done' ? `<button class="btn quiet" data-a="mark" data-id="${id}" data-st="done">${L('Сделал', 'Done')}</button>` : ''}${s.status === 'planned' ? `<button class="btn quiet" data-a="mark" data-id="${id}" data-st="skipped">${L('Пропустил / не смогу', 'Skipped / can’t make it')}</button>` : ''}${s.status !== 'planned' ? `<button class="btn quiet" data-a="mark" data-id="${id}" data-st="planned">${L('Вернуть в план', 'Back to plan')}</button>` : ''}</div>`;
  }
  openSheet(h + '</div>');
}
function daySheet(i) {
  const wk = view.wk, D = DAYS(), date = addDays(parseYmd(wk), i);
  const evs = [...allDayEvents(wk, i).map(e => ({t: L('весь день', 'all day'), title: e.title})), ...dayEvents(wk, i).map(e => ({t: `${hm(e.s)}–${hm(e.e)}`, title: e.title + (e.free ? L(' (свободно)', ' (free)') : '')}))];
  const week = state.weeks[wk], w = week ? windows(wk, i, week) : [], ti = todayIdx(wk);
  const items = (week?.sessions || []).map(s => effective(wk, s)).filter(s => s.day === i && s.start != null && (s.status === 'planned' || s.status === 'done')).map(s => ({cls: `s ${KINDS[s.kind].sport}`, s: s.start, min: s.act?.min ?? s.min}));
  openSheet(`<div class="sheet-head"><h2>${esc(dayWord(wk, i, ti))}</h2><button class="nav-btn" data-a="close-sheet">${L('Готово', 'Done')}</button></div><div class="sheet-scroll">
    ${dayTimeline(wk, i, ti, items)}<div style="height:12px"></div>
    ${evs.length ? `<ul class="evlist">${evs.map(e => `<li><span>${esc(e.t)}</span><span>${esc(e.title)}</span></li>`).join('')}</ul>` : `<p class="hint">${L('В календаре пусто', 'Nothing in the calendar')}</p>`}
    <div class="section-title">${L('Свободные окна', 'Free windows')}</div><p class="num">${w.length ? w.map(([a, z]) => `${hm(a)}–${hm(z)}`).join(' · ') : '—'}</p>
    <p class="hint" style="padding-top:8px">${L(`Учитываю рабочие часы ${state.prefs.work ? state.prefs.workStart + '–' + state.prefs.workEnd + ' (будни)' : 'выкл.'} и ${state.prefs.buffer} мин на дорогу вокруг встреч.`, `Counting work hours ${state.prefs.work ? state.prefs.workStart + '–' + state.prefs.workEnd + ' (weekdays)' : 'off'} and ${state.prefs.buffer} min travel around events.`)}</p></div>`);
}

/* ---------- settings ---------- */
let authMode = 'in';
// Settings, grouped by what they're for: who you are, the plan, what's connected, when you can train,
// the usual week (folded — the plan wizard writes it), your body, the assistant, invites, language.
function settingsHTML() {
  const D = DAYS(), p = state.prefs, tin = (f, v) => `<input data-pref="${f}" type="time" value="${esc(v)}">`;
  let h = `<main class="screen settings"><header class="nav"><div class="nav-row"><button class="nav-btn" data-a="back">${icon('left')}${L('Неделя', 'Week')}</button><span></span></div><h1>${L('Настройки', 'Settings')}</h1></header>`;
  h += acctHTML();
  h += planSettingsHTML();

  // What's connected: calendars and Garmin, one block
  if (cloud.user && cloud.me?.member !== false) {
    const cals = cloud.cals || [], a = state.local.acts, gl = cloud.me?.garmin?.linked ?? a?.linked;
    const since = a?.from ? parseYmd(a.from).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
    h += `<div class="section-title">${L('Подключения', 'Connections')}</div><div class="list">`;
    h += cals.map(c => `<div class="row"><span class="t"><b>${icon('calendar', 16)} ${esc(c.label)}</b><span>${c.last_error ? (c.last_error === 'google_revoked' ? L('Доступ отозван — подключи заново', 'Access revoked — connect again') : L('Не загрузился: ', 'Failed: ') + esc(c.last_error)) : c.checked_at ? L('Обновлён ', 'Updated ') + new Date(c.checked_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : ''}</span></span><button class="nav-btn" data-a="cal-remove" data-id="${esc(c.id)}">${L('Убрать', 'Remove')}</button></div>`).join('');
    if (!cals.length) h += `<div class="row"><span class="t"><b>${icon('calendar', 16)} ${L('Календарь', 'Calendar')}</b><span>${L('Не подключён — тренировки встают в рабочие рамки без учёта встреч', 'Not connected — sessions ignore your meetings')}</span></span></div>`;
    if (NATIVE) h += `<div class="row"><span class="t"><b>Apple Health</b><span>${hkOn() ? L('Подключено · тренировки со всех часов', 'Connected · workouts from any watch') : L('Не подключено', 'Not connected')}</span></span>${hkOn() ? `<button class="nav-btn" data-a="health-off">${L('Выключить', 'Turn off')}</button>` : `<button class="nav-btn" data-a="health-connect">${L('Подключить', 'Connect')}</button>`}</div>`;
    h += `<div class="row"><span class="t"><b>Garmin</b><span>${gl ? (a?.list ? L(`${a.list.length} активностей с ${since}`, `${a.list.length} activities since ${since}`) : L('Подключён', 'Linked')) + (a?.error ? ' · ' + esc(a.error) : '') : L('Не подключён', 'Not linked')}</span></span>${gl ? `<button class="nav-btn" data-a="garmin-unlink" style="color:var(--danger)">${L('Отвязать', 'Unlink')}</button>` : ''}</div></div>`;
    h += `<div class="stack set-actions">${cloud.google && !NATIVE ? `<button class="btn quiet" data-a="google" ${cloud.calBusy ? 'disabled' : ''}>${L('Подключить Google Календарь', 'Connect Google Calendar')}</button>` : ''}
      ${gl ? `<button class="btn link" data-a="history" ${histBusy.on ? 'disabled' : ''}>${histBusy.on ? L('Загружаю…', 'Loading…') : L('Подтянуть историю Garmin за год', 'Pull a year of Garmin history')}</button>` : ''}</div>`;
    h += `<details class="set-more"><summary>${L('Другой календарь — по ссылке iCal или файлом', 'Another calendar — by iCal link or file')}</summary>
      <p class="hint">${L('Apple, Outlook, рабочий. В Google: Настройки → календарь → «Секретный адрес в формате iCal». Ссылка хранится на сервере, приложение видит только занятость и названия.', 'Apple, Outlook, work. In Google: Settings → your calendar → Secret address in iCal format. The link stays on the server; the app sees only busy times and titles.')}</p>
      <form id="calForm" class="stack"><label class="field">${L('Ссылка iCal (.ics)', 'iCal link (.ics)')}<input id="calUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…/basic.ics" required></label>
      <button class="btn quiet" type="submit" ${cloud.calBusy ? 'disabled' : ''}>${cloud.calBusy ? L('Проверяю…', 'Checking…') : L('Подключить по ссылке', 'Connect by link')}</button></form>
      <label class="btn link" style="margin-top:4px">${L('Загрузить файл .ics на эту неделю', 'Load an .ics file for this week')}<input type="file" id="icsFile" accept=".ics,text/calendar" hidden></label></details>`;
    if (!gl && cloud.me?.member) h += `<details class="set-more"><summary>${L('Подключить Garmin', 'Connect Garmin')}</summary>
      <p class="hint">${L('Garmin Connect → Настройки → Personal API → Create key (действует год). Ключ общий с «Залом» и хранится на сервере.', 'Garmin Connect → Settings → Personal API → Create key (lasts a year). Shared with the gym app, stays on the server.')}</p>
      <form id="garminForm" class="stack"><label class="field">${L('Ключ Personal API', 'Personal API key')}<input id="garminKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required></label><button class="btn primary" type="submit">${L('Подключить', 'Connect')}</button></form></details>`;
  }

  // When you can train
  h += `<div class="section-title">${L('Когда можно тренироваться', 'When you can train')}</div>
    <label class="check set-check"><input type="checkbox" data-pref="work" ${p.work ? 'checked' : ''}> ${L('Работаю по будням — это время занято', 'I work on weekdays — that time is taken')}</label>
    ${p.work ? `<div class="wiz-row"><label class="field">${L('Работа с', 'Work from')}${tin('workStart', p.workStart)}</label><label class="field">${L('до', 'to')}${tin('workEnd', p.workEnd)}</label></div>` : ''}
    <div class="wiz-row"><label class="field">${L('Будни: с', 'Weekdays: from')}${tin('wdStart', p.wdStart)}</label><label class="field">${L('до', 'to')}${tin('wdEnd', p.wdEnd)}</label></div>
    <div class="wiz-row"><label class="field">${L('Выходные: с', 'Weekends: from')}${tin('weStart', p.weStart)}</label><label class="field">${L('до', 'to')}${tin('weEnd', p.weEnd)}</label></div>
    ${blocksHTML()}
    <div class="wiz-row"><label class="field">${L('«Вечер» начинается', '“Evening” starts')}${tin('evening', p.evening)}</label><label class="field">${L('Дорога до и после встреч, мин', 'Travel around events, min')}<input data-pref="buffer" type="number" inputmode="numeric" min="0" max="90" step="5" value="${p.buffer}"></label></div>`;

  // The usual week: folded; the plan wizard writes it, and it's for fine-tuning
  const tplMin = state.template.reduce((t, x) => t + x.min, 0);
  h += `<details class="set-more set-tpl"><summary>${L('Обычная неделя', 'Usual week')} <span class="muted num">· ${state.template.length} ${L('трен.', 'sessions')} · ${fHours(tplMin)}</span></summary>
    <p class="hint">${L('Из неё собирается неделя, когда нет предложения ассистента. День — желаемый: если он занят, тренировка переедет и скажет почему. Якорь не двигается.', 'Weeks are built from this when there’s no assistant proposal. The day is a preference: if it’s busy, the session moves and says why. An anchor stays put.')}</p>`;
  state.template.forEach((tpl, idx) => {
    h += `<div class="tpl"><div class="full"><select data-tpl="${idx}" data-f="kind" style="width:auto">${Object.keys(KINDS).filter(k => k !== 'mobility').map(k => `<option value="${k}" ${tpl.kind === k ? 'selected' : ''}>${esc(kName(k))}</option>`).join('')}</select><button class="nav-btn" data-a="tpl-del" data-i="${idx}" style="color:var(--danger)">${L('Убрать', 'Remove')}</button></div>
      <select data-tpl="${idx}" data-f="day" aria-label="${L('День', 'Day')}">${D.map((d, i) => `<option value="${i}" ${tpl.day === i ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <select data-tpl="${idx}" data-f="tod" aria-label="${L('Время', 'Time')}">${[['am', L('утро', 'morning')], ['pm', L('вечер', 'evening')], ['any', L('любое время', 'any time')]].map(([v, n]) => `<option value="${v}" ${tpl.tod === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="tpl-min"><input data-tpl="${idx}" data-f="min" type="number" inputmode="numeric" min="15" max="480" step="5" value="${tpl.min}" aria-label="${L('Минут', 'Minutes')}"><span>${L('мин', 'min')}</span></label>
      <label class="check"><input type="checkbox" data-tpl="${idx}" data-f="anchor" ${tpl.anchor ? 'checked' : ''}> ${L('Якорь', 'Anchor')}</label></div>`;
  });
  h += `<div class="stack" style="padding-top:12px"><button class="btn quiet" data-a="tpl-add">${L('Добавить тренировку', 'Add a session')}</button><button class="btn link" data-a="rebuild">${L('Пересобрать эту неделю по обычной', 'Rebuild this week from the usual one')}</button></div></details>`;

  // Body: thresholds and injury
  ensureThrData();
  h += zonesHTML();
  h += healthHTML();
  h += window.TrainFood?.settings() || '';

  h += pushHTML();
  // The assistant's allowance, invites (admins), language and privacy
  if (cloud.me?.ai) { const u = cloud.me.ai; h += `<div class="section-title">${L('Ассистент', 'Assistant')}</div><p class="hint">${u.unlimited ? L('Без ограничений.', 'No limits.') : L(`Сегодня: ${u.chat.used} из ${u.chat.limit} сообщений и ${u.plan.used} из ${u.plan.limit} сборок плана. Обновляется в полночь UTC.`, `Today: ${u.chat.used} of ${u.chat.limit} messages and ${u.plan.used} of ${u.plan.limit} plan builds. Resets at midnight UTC.`)}</p>`; }
  h += invitesHTML();
  h += `<div class="section-title">${L('Язык', 'Language')}</div><div class="seg" role="group"><button data-a="lang" data-l="ru" aria-pressed="${lang === 'ru'}">Русский</button><button data-a="lang" data-l="en" aria-pressed="${lang === 'en'}">English</button></div>
    <p class="hint" style="padding:24px 0 8px"><a href="privacy.html" style="color:var(--accent)">${L('Конфиденциальность', 'Privacy')}</a></p>`;
  return h + '</main>';
}
/* ---------- morning message (Web Push) ---------- */
// The server (train-push) sends the day's brief at the chosen local time. iPhone needs the app on the home screen
// (iOS 16.4+); the native shell will use local notifications instead, so it's hidden there.
const push = {on: null, busy: false, at: null, endpoint: null, loading: false};
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushOk = () => !NATIVE && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64uBytes = s => { const t = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(t + '==='.slice((t.length + 3) % 4)), c => c.charCodeAt(0)); };
async function pushCall(action, extra = {}) {
  if (!cloud.client || !cloud.user) return {error: 'signed_out'};
  const {data, error} = await cloud.client.functions.invoke('train-push', {body: {action, ...extra}});
  if (error) { let body = null; try { body = await error.context?.json?.(); } catch {} return {error: body?.error || 'unavailable'}; }
  return data;
}
async function pushSub() { const reg = await navigator.serviceWorker.getRegistration(); return reg ? reg.pushManager.getSubscription() : null; }
async function pushRefresh() {
  if (push.loading || !pushOk() || !cloud.user) return;
  push.loading = true;
  try {
    const sub = await pushSub();
    push.endpoint = sub?.endpoint || null;
    if (!sub) { push.on = false; return; }
    const d = await pushCall('status', {endpoint: sub.endpoint});
    push.on = !!d.on; if (d.at) push.at = d.at;
  } catch { push.on = false; } finally { push.loading = false; render(); }
}
// The brief has to be on the server before the first morning: push the state now.
async function pushBrief() { state.dirty = true; rev++; saveLocal(); await sync(); }
async function pushEnable() {
  if (push.busy) return; push.busy = true; render();
  try {
    if (await Notification.requestPermission() !== 'granted') { toast(L('Уведомления запрещены — включи их для «Недели» в настройках телефона', 'Notifications are blocked — allow them for this app in your phone settings')); return; }
    const k = await pushCall('key'); if (!k.publicKey) throw new Error(k.error);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64uBytes(k.publicKey)});
    const at = push.at || '07:30';
    const d = await pushCall('save', {sub: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, at, lang});
    if (d.error) throw new Error(d.error);
    push.on = true; push.at = at; push.endpoint = sub.endpoint;
    await pushBrief();
    toast(L(`Готово — утром в ${at}`, `Done — every morning at ${at}`));
  } catch (e) { console.warn('push', e); toast(L('Не получилось включить — попробуй ещё раз', 'Couldn’t turn it on — try again')); }
  finally { push.busy = false; render(); }
}
async function pushDisable() {
  push.busy = true; render();
  try { const sub = await pushSub(); if (sub) { await pushCall('remove', {endpoint: sub.endpoint}); await sub.unsubscribe(); } push.on = false; }
  finally { push.busy = false; render(); }
}
async function pushTime(at) {
  push.at = at;
  const sub = await pushSub(); if (!sub || !push.on) return;
  const d = await pushCall('save', {sub: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, at, lang});
  toast(d.error ? L('Не сохранилось — проверь сеть', 'Didn’t save — check the connection') : L(`Утром в ${at}`, `Mornings at ${at}`));
}
async function pushTest() {
  push.busy = true; render();
  try {
    await pushBrief();
    const sub = await pushSub(), d = sub ? await pushCall('test', {endpoint: sub.endpoint}) : {error: 'not_subscribed'};
    if (d.error === 'gone' || d.error === 'not_subscribed') { push.on = false; toast(L('Подписка пропала — включи заново', 'The subscription is gone — turn it on again')); }
    else toast(d.error ? L('Не дошло — попробуй позже', 'Didn’t arrive — try later') : L('Отправил — должно прийти через пару секунд', 'Sent — should arrive in a few seconds'));
  } finally { push.busy = false; render(); }
}
function pushHTML() {
  if (NATIVE || !cloud.user || !cloud.me?.member) return '';
  let h = `<div class="section-title">${L('Утреннее сообщение', 'Morning message')}</div>`;
  const what = L('Утром — что сегодня: тренировка, время, что делать и пульс. В дни отдыха не приходит.', 'Each morning — today’s session, time, what to do and HR. Nothing on rest days.');
  if (IOS && !STANDALONE) return h + `<p class="hint">${what} ${L('На iPhone уведомления работают, когда «Неделя» на экране «Домой»: в Safari «Поделиться» → «На экран „Домой“», открыть оттуда и включить здесь.', 'On iPhone, notifications work once the app is on the home screen: Safari Share → Add to Home Screen, open it from there and turn this on.')}</p>`;
  if (!pushOk()) return h + `<p class="hint">${what} ${L('Этот браузер не умеет push-уведомления.', 'This browser can’t do push notifications.')}</p>`;
  if (push.on == null) { pushRefresh(); return h + `<p class="hint">${L('Проверяю…', 'Checking…')}</p>`; }
  h += `<p class="hint" style="padding-bottom:8px">${what}</p>`;
  if (!push.on) return h + `<div class="stack"><button class="btn quiet" data-a="push-on" ${push.busy ? 'disabled' : ''}>${push.busy ? L('Включаю…', 'Turning on…') : L('Присылать по утрам', 'Send it every morning')}</button></div>`;
  return h + `<div class="wiz-row"><label class="field">${L('Во сколько', 'At')}<input id="pushAt" type="time" value="${esc(push.at || '07:30')}"></label></div>
    <div class="stack"><button class="btn quiet" data-a="push-test" ${push.busy ? 'disabled' : ''}>${L('Прислать сегодняшнее сейчас', 'Send today’s now')}</button><button class="btn link" data-a="push-off" ${push.busy ? 'disabled' : ''}>${L('Не присылать', 'Stop sending')}</button></div>`;
}
function acctHTML() {
  if (!cloud.client) return '';
  if (cloud.user) return `<div class="section-title" style="padding-top:4px">${L('Аккаунт', 'Account')}</div><div class="list"><div class="row"><span class="t"><b>${esc(cloud.user.email || '')}</b><span id="acctStatus">${esc(acctStatus())}</span></span><button class="nav-btn" data-a="sign-out">${L('Выйти', 'Sign out')}</button></div></div>`;
  return `<div class="section-title" style="padding-top:4px">${L('Аккаунт', 'Account')}</div><div class="stack" style="margin-bottom:12px"><button class="btn quiet" data-a="onb-open" data-s="account">${L('Создать аккаунт по инвайт-коду', 'Create an account with an invite code')}</button></div><p class="hint" style="padding-bottom:12px">${L('Тот же аккаунт, что в «Зале». Без входа план живёт только на этом устройстве и не видит календарь.', 'Same account as the gym app. Without it the plan lives on this device only and can’t see your calendar.')}</p>
    <form class="stack" id="authForm" style="margin-bottom:24px"><label class="field">${L('Почта', 'Email')}<input id="authEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off" required></label>
    <label class="field">${L('Пароль', 'Password')}<input id="authPw" type="password" autocomplete="current-password" minlength="8" required></label>
    <button class="btn primary" type="submit">${L('Войти', 'Sign in')}</button></form>`;
}
async function authSubmit() {
  const email = ($('#authEmail').value || '').trim(), password = $('#authPw').value || '';
  const btn = $('#authForm button[type=submit]'); btn.disabled = true;
  try {
    const res = await cloud.client.auth.signInWithPassword({email, password});
    if (res.error) { toast(/invalid/i.test(res.error.message) ? L('Неверная почта или пароль', 'Wrong email or password') : L('Не получилось — проверь сеть', 'Didn’t work — check the connection')); return; }
    cloud.user = res.data.session.user; toast(L('Готово', 'Done')); render(); afterSignIn();
  } finally { if (btn.isConnected) btn.disabled = false; }
}
async function calAdd(from) {
  const url = (from ?? $('#calUrl')?.value ?? '').trim(); if (!url) return;
  const done = () => { render(); onbRender(); };
  cloud.calBusy = true; render();
  onbRender();
  const d = await fn('cal-add', {url});
  cloud.calBusy = false;
  if (d.error) {
    toast({bad_url: L('Нужна ссылка https:// или webcal://', 'Needs an https:// or webcal:// link'), duplicate: L('Этот календарь уже подключён', 'Already connected'), too_many: L('Максимум 5 календарей', 'Up to 5 calendars'), not_ics: L('По ссылке не календарь — нужна ссылка iCal', 'That link isn’t a calendar — use the iCal one'), http_404: L('Календарь не найден — проверь ссылку', 'Calendar not found — check the link'), http_403: L('Нет доступа — нужна секретная ссылка', 'No access — use the secret link')}[d.error] || L('Не получилось загрузить календарь', 'Couldn’t load the calendar'));
    done(); return;
  }
  cloud.cals = d.calendars; toast(L('Календарь подключён', 'Calendar connected')); done();
  for (const wk of Object.keys(state.weeks)) if (todayIdx(wk) <= 6) await loadBusy(wk, true);
}
async function icsFile(file) {
  const text = await file.text(), wk = view.wk, from = parseYmd(wk), to = addDays(from, 7);
  const d = await fn('parse', {ics: text, from: from.toISOString(), to: to.toISOString()});
  if (d.error) { toast(L('Не получилось прочитать файл', 'Couldn’t read the file')); return; }
  const c = state.local.busy[wk] || {at: 0, events: []};
  state.local.busy[wk] = {...c, at: c.at, events: [...c.events.filter(e => e.cal !== 'file'), ...d.events]};
  saveLocal(); toast(L(`Из файла: ${d.events.length} событий`, `From file: ${d.events.length} events`));
  view.v = 'week'; onBusy(wk);
}

/* ---------- events ---------- */
document.addEventListener('click', ev => {
  const olc = ev.target.closest('.ol-col'); if (olc) return olShow(olc);
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, wk = view.wk;
  if (a === 'close-sheet') return closeSheet();
  if (a === 'chat') return openChat();
  if (a === 'chat-starter') return sendChat(el.dataset.t);
  if (a === 'chat-new') { chat.ctrl?.abort(); state.chat = []; persist(); return chatRender(); }
  if (a === 'chat-stop') { chat.ctrl?.abort(); return; }
  if (a === 'chat-retry') return chatRetry();
  if (a === 'chat-apply') return applyProposal(el.dataset.mid);
  if (a === 'chat-plan-apply') return applyChatPlan(el.dataset.mid);
  if (a === 'plan-open') return openWizard();
  if (a === 'plan-skip') { state.planSkip = todayStr(); persist(); render(); return; }
  if (a === 'wiz-goal') { wiz.a.goal = el.dataset.g; wiz.keepScroll = true; return wizRender(); }
  if (a === 'wiz-sport') { const sp = el.dataset.s, i = wiz.a.sports.indexOf(sp); if (i >= 0) wiz.a.sports.splice(i, 1); else wiz.a.sports.push(sp); return wizRender(); }
  if (a === 'wiz-tri') { const on = TRI.every(x => wiz.a.sports.includes(x)); wiz.a.sports = on ? wiz.a.sports.filter(x => !TRI.includes(x)) : [...new Set([...wiz.a.sports, ...TRI])]; return wizRender(); }
  if (a === 'wiz-days') { wiz.a.days = +el.dataset.n; wiz.keepScroll = true; return wizRender(); }
  if (a === 'wiz-hours') { wiz.a.hours = +el.dataset.h; wiz.keepScroll = true; return wizRender(); }
  if (a === 'wiz-next') { wiz.step++; return wizRender(); }
  if (a === 'wiz-back') { wiz.step = wiz.step === 3 ? 2 : Math.max(0, wiz.step - 1); return wizRender(); }
  if (a === 'wiz-edit') { wiz.step = 0; return wizRender(); }
  if (a === 'wiz-build') return buildPlan();
  if (a === 'wiz-rules') return buildPlan(true);
  if (a === 'wiz-accept') return acceptPlan();
  if (a === 'prop-open') return proposalSheet(el.dataset.wk);
  if (a === 'prop-accept') return acceptProposal(el.dataset.wk);
  if (a === 'prop-dismiss') { const p = state.proposals[el.dataset.wk]; if (p) { p.status = 'dismissed'; persist(); } closeSheet(); render(); return; }
  if (a === 'prop-chat') {
    closeSheet(); view.v = 'week'; view.wk = el.dataset.wk; render();
    openChat(); const inp = $('#chatInput'); inp.value = L('Про план на следующую неделю: ', 'About next week’s plan: '); inp.focus(); return;
  }
  if (a === 'weekly-make') { const wk2 = el.dataset.wk; makeWeekly(wk2); proposalSheet(wk2); return; }
  if (a === 'chat-act') { const id = String(el.dataset.id).startsWith('hk:') ? el.dataset.id : Number(el.dataset.id), b = (state.local.acts?.list || []).find(x => x.id === id); return openChat(L(`Разбери тренировку: ${b?.name || 'эта'}, ${(b?.start || '').slice(0, 10)}`, `Review this workout: ${b?.name || ''}, ${(b?.start || '').slice(0, 10)}`), {act: id}); }
  if (a === 'chip') { const inp = $('#cmdInput'); inp.value = el.dataset.t; inp.focus(); return; }
  if (a === 'wk') { view.wk = ymd(addDays(parseYmd(wk), +el.dataset.d)); lastChange = null; render(); if (cloud.user && cloud.cals?.length && todayIdx(view.wk) <= 6) loadBusy(view.wk); ensureHistory(view.wk); return; }
  if (a === 'wk-today') { view.wk = ymd(mondayOf(new Date())); render(); return; }
  if (a === 'settings') { view.v = 'settings'; render(); scrollTo(0, 0); if (cloud.user) fn('me').then(d => { if (!d.error) { cloud.me = d; if (view.v === 'settings') render(); } }); if (cloud.user) fn('cal-status').then(d => { if (!d.error) { cloud.cals = d.calendars; cloud.google = d.google; if (view.v === 'settings') render(); } }); return; }
  if (a === 'back') { view.v = 'week'; render(); return; }
  if (a === 'review') return reviewSheet(el.dataset.wk);
  if (a === 'pause-open') return pauseSheet();
  if (a === 'pause-go') { closeSheet(); pausePlan(el.dataset.r); render(); return; }
  if (a === 'resume') { resumePlan(); render(); return; }
  if (a === 'rpe-open') return rpeSheet(el.dataset.id);
  if (a === 'rpe-set') { const s = state.weeks[view.wk]?.sessions.find(x => x.id === el.dataset.id); if (s) { s.rpe = +el.dataset.n; persist(); } closeSheet(); toast(L('Записал', 'Saved')); render(); return; }
  if (a === 'block-add') { state.prefs.blocks = [...(state.prefs.blocks || []), {id: rid(), label: L('Семья', 'Family'), days: [5], from: '08:00', to: '12:00'}]; persist(); replanOpen(); render(); return; }
  if (a === 'block-del') { state.prefs.blocks = (state.prefs.blocks || []).filter(b => b.id !== el.dataset.id); persist(); replanOpen(); render(); return; }
  if (a === 'block-day') { const b = (state.prefs.blocks || []).find(x => x.id === el.dataset.id), d = +el.dataset.d; if (b) { b.days = b.days.includes(d) ? b.days.filter(x => x !== d) : [...b.days, d].sort(); persist(); replanOpen(); render(); } return; }
  if (a === 'zmode') { state.zones = {...(state.zones || {}), mode: el.dataset.m === 'own' ? 'own' : 'auto'}; persist(); render(); return; }
  if (window.TrainFood?.click(a, el)) return;
  if (a === 'push-on') return pushEnable();
  if (a === 'push-off') return pushDisable();
  if (a === 'push-test') return pushTest();
  if (a === 'zones-open') { closeSheet(); view.v = 'settings'; render(); setTimeout(() => document.getElementById('zones')?.scrollIntoView({block: 'start'}), 50); return; }
  if (a === 'program') { view.v = 'program'; render(); scrollTo(0, 0); if (cloud.user && state.local.acts?.linked) ensureHist12().then(() => { if (view.v === 'program') render(); }); return; }
  if (a === 'undo') return undo(wk);
  if (a === 'dismiss') { lastChange = null; render(); return; }
  if (a === 'open') return sessionSheet(el.dataset.id);
  if (a === 'act') return openActivity(el.dataset.id);
  if (a === 'act-refresh') return refreshActivity();
  if (a === 'day') return daySheet(+el.dataset.i);
  if (a === 'sheet-move') { const s = state.weeks[wk].sessions.find(x => x.id === el.dataset.id); closeSheet(); return runOn(s, `перенеси на ${DAYS_RU[+el.dataset.d]}`, `move to ${DAYS_EN[+el.dataset.d]}`); }
  if (a === 'sheet-min') { const s = state.weeks[wk].sessions.find(x => x.id === el.dataset.id); closeSheet(); return runOn(s, `${DAYS_RU[s.day]} ${el.dataset.m} минут`, `${el.dataset.m} min ${DAYS_EN[s.day]}`); }
  if (a === 'mark') {
    const week = state.weeks[wk], s = week.sessions.find(x => x.id === el.dataset.id), st = el.dataset.st;
    closeSheet();
    if (st === 'skipped') return runOn(s, `пропустил ${DAYS_RU[s.day]}`, `skipped ${DAYS_EN[s.day]}`);
    const before = snapshot(week), D = DAYS();
    s.status = st; s.locked = st !== 'planned';
    if (st === 'planned') { delete s.act; s.locked = false; place(wk, week); }
    return commit(wk, week, before, st === 'done' ? L('сделал', 'done') : L('вернуть в план', 'back to plan'), [st === 'done' ? L(`${kName(s.kind)} в ${D[s.day]} — сделано`, `${kName(s.kind)} on ${D[s.day]} — done`) : L(`${kName(s.kind)} снова в плане`, `${kName(s.kind)} is back in the plan`)]);
  }
  if (a === 'pain') { pending[el.dataset.k] = +el.dataset.v; pending.rest = !!$('#painRest')?.checked; painSheet(); return; }
  if (a === 'pain-open') return painSheet();
  if (a === 'ask-open') {
    const sp = el.dataset.s, n = +el.dataset.n, name = L(SPORTS[sp][0], SPORTS[sp][1]);
    return openSheet(`<div class="sheet-head"><h2>${esc(name)}</h2><button class="nav-btn" data-a="close-sheet">${L('Отмена', 'Cancel')}</button></div><div class="sheet-scroll">
      <p class="hint">${L(`4 недели без тренировок, а в плане ${n} в неделю. Оставить так, или честнее пока меньше? Спрошу снова через 4 недели.`, `None in 4 weeks, and the plan has ${n} a week. Keep it, or be honest and do less for now? I’ll ask again in 4 weeks.`)}</p>
      <div class="stack" style="padding-top:16px"><button class="btn quiet" data-a="ask" data-s="${sp}" data-c="keep">${L('Оставить', 'Keep')}</button>${n > 1 ? `<button class="btn quiet" data-a="ask" data-s="${sp}" data-c="one">${L('Одна в неделю', 'Once a week')}</button>` : ''}<button class="btn quiet" data-a="ask" data-s="${sp}" data-c="drop">${L('Убрать пока', 'Drop for now')}</button></div></div>`);
  }
  if (a === 'trip-open') {
    const k = el.dataset.k, ds = el.dataset.days;
    return openSheet(`<div class="sheet-head"><h2>«${esc(el.dataset.t)}»</h2><button class="nav-btn" data-a="close-sheet">${L('Отмена', 'Cancel')}</button></div><div class="sheet-scroll">
      <p class="hint">${L('Это поездка? Если да — уберу тренировки с этих дней и найду им место в другие.', 'Is this a trip? If so, I’ll move sessions off these days.')}</p>
      <div class="stack" style="padding-top:16px"><button class="btn primary" data-a="trip" data-k="${esc(k)}" data-days="${ds}" data-yes="1">${L('Да, поездка', 'Yes, a trip')}</button><button class="btn quiet" data-a="trip" data-k="${esc(k)}">${L('Нет, тренируюсь', 'No, I’ll train')}</button></div></div>`);
  }
  if (a === 'pain-redo') { const c = state.checks[todayStr()]; if (c) { Object.assign(pending, c); delete state.checks[todayStr()]; persist(); } render(); return painSheet(); }
  if (a === 'pain-save') {
    pending.rest = !!$('#painRest')?.checked;
    const week = state.weeks[wk], beforeEff = week ? week.sessions.map(s => effective(wk, s)) : [];
    state.checks[todayStr()] = {sit: pending.sit, walk: pending.walk, rest: pending.rest, at: new Date().toISOString()};
    const lines = [];
    if (week) week.sessions.forEach((s, i) => { const b = beforeEff[i], n = effective(wk, s); if (b.kind !== n.kind && s.day != null) lines.push(`${DAYS()[s.day]}: ${kName(b.kind)} → ${kName(n.kind)} — ${n.why || L('ограничение снято', 'restriction lifted')}`); });
    if (!lines.length) lines.push(Math.max(pending.sit, pending.walk) === 0 ? L('0/10 — план без изменений', '0/10 — plan unchanged') : L('План без изменений', 'Plan unchanged'));
    if (week) week.log.unshift({at: new Date().toISOString(), text: L(`боль ${pending.sit}/${pending.walk}`, `pain ${pending.sit}/${pending.walk}`), lines, snap: snapshot(week)});
    persist(); lastChange = {wk, text: L(`боль сидя ${pending.sit}, ходьба ${pending.walk}`, `pain sitting ${pending.sit}, walking ${pending.walk}`), lines, info: true};
    pending.sit = pending.walk = null; pending.rest = false; closeSheet(); render(); return;
  }
  if (a === 'ask') {
    closeSheet();
    const sp = el.dataset.s, c = el.dataset.c, week = state.weeks[wk];
    state.asks[sp] = {c, at: todayStr()};
    if (week && c !== 'keep') {
      const before = snapshot(week), ti = todayIdx(wk), lines = [];
      const mine = week.sessions.filter(s => KINDS[s.kind].sport === sp && s.status === 'planned' && (s.day == null || s.day >= ti));
      for (const s of (c === 'one' ? mine.slice(1) : mine)) { s.status = 'dropped'; s.why = L('Убрал по твоему ответу — спрошу через 4 недели', 'Dropped per your answer — I’ll ask again in 4 weeks'); lines.push(L(`${kName(s.kind)}${s.day != null ? ' в ' + DAYS()[s.day] : ''} — убрал`, `${kName(s.kind)}${s.day != null ? ' on ' + DAYS()[s.day] : ''} — dropped`)); }
      place(wk, week);
      return commit(wk, week, before, L(SPORTS[sp][0], SPORTS[sp][1]) + ': ' + el.textContent.trim().toLowerCase(), lines.length ? lines : [L('Ок', 'OK')]);
    }
    persist(); render(); return;
  }
  if (a === 'trip') {
    closeSheet();
    const week = state.weeks[wk]; week.cal = week.cal || {}; week.cal[el.dataset.k] = el.dataset.yes ? 'away' : 'no';
    if (el.dataset.yes) { const ds = el.dataset.days.split(',').map(Number), a1 = ds[0], b1 = ds[ds.length - 1]; return run(a1 === b1 ? L(`уезжаю ${DAYS_RU[a1]}`, `away ${DAYS_EN[a1]}`) : L(`уезжаю ${DAYS_RU[a1]} по ${DAYS_RU[b1]}`, `away ${DAYS_EN[a1]} to ${DAYS_EN[b1]}`)); }
    persist(); render(); return;
  }
  if (a === 'lang') { lang = el.dataset.l; try { localStorage.setItem('train.lang', lang); } catch {} render(); return; }
  if (a === 'sign-out') { cloud.client.auth.signOut(); cloud.user = null; cloud.cals = null; cloud.ai = false; cloud.me = null; cloud.signedFor = null; cloud.signP = null; invites.list = null; render(); return; }
  if (a === 'onb-open') return openOnboarding(el.dataset.s);
  if (a === 'onb-go') return onbGo(el.dataset.s);
  if (a === 'onb-mode') { onb.mode = el.dataset.m; return onbGo('account'); }
  if (a === 'onb-skip' || a === 'onb-later') { try { localStorage.removeItem(ONB_KEY); } catch {} if (a === 'onb-skip' && !cloud.user) { state.onboard = {done: false, skipped: isoNow()}; persist(); } closeSheet(); render(); return; }
  if (a === 'onb-health') { onb.health = el.dataset.v; state.health = {...(state.health || {}), track: onb.health === 'yes'}; persist(); return onbRender(); }
  if (a === 'onb-done') return onbFinish(true);
  if (a === 'onb-health-connect') { onb.busy = true; onb.err = ''; onbRender(); connectHealth().then(e => { onb.busy = false; onb.err = e === 'denied' ? 'health_denied' : e ? 'health_unavailable' : ''; onbRender(); }); return; }
  if (a === 'health-connect') { connectHealth().then(e => { toast(e ? onbErr(e === 'denied' ? 'health_denied' : 'health_unavailable') : L('Apple Health подключено', 'Apple Health connected')); render(); }); return; }
  if (a === 'health-off') { state.local.health = {on: false}; state.local.acts = null; saveLocal(); loadActs(true); render(); return; }
  if (a === 'invite-new') return loadInvites(true);
  if (a === 'invite-copy') { const url = inviteLink(el.dataset.code); (navigator.share ? navigator.share({title: L('Неделя', 'Week'), text: L('Приглашение в «Неделю»', 'An invite to Week'), url}).catch(() => {}) : navigator.clipboard.writeText(url).then(() => toast(L('Ссылка скопирована', 'Link copied')))); return; }
  if (a === 'garmin-unlink') { if (!confirm(L('Отвязать Garmin? Ключ общий с «Залом» — там он тоже отвяжется.', 'Unlink Garmin? The key is shared with the gym app — it will be unlinked there too.'))) return; fn('garmin-unlink').then(d => { if (!d.error) { cloud.me = d; state.local.acts = null; saveLocal(); } render(); }); return; }
  if (a === 'history') {
    const from = ymd(addDays(new Date(), -365)), to = state.local.acts?.from || todayStr();
    if (to <= from) { toast(L('Год истории уже загружен', 'A year of history is already here')); return; }
    const p = loadHistory(from, to); render();
    p.then(n => { toast(n == null ? L('Garmin не ответил — попробуй позже', 'Garmin didn’t answer — try later') : L(`Загружено тренировок: ${n}`, `Workouts loaded: ${n}`)); render(); });
    return;
  }
  if (a === 'google') {
    cloud.calBusy = true; render();
    fn('google-start', {return_to: location.origin + location.pathname}).then(d => {
      cloud.calBusy = false;
      if (d.url) { location.href = d.url; return; }
      toast(d.error === 'google_not_configured' ? L('Google ещё не настроен на сервере', 'Google isn’t set up on the server yet') : L('Не получилось — проверь сеть', 'Didn’t work — check the connection'));
      render();
    });
    return;
  }
  if (a === 'cal-remove') { fn('cal-remove', {id: el.dataset.id}).then(d => { if (!d.error) { cloud.cals = d.calendars; for (const k of Object.keys(state.local.busy)) state.local.busy[k].at = 0; saveLocal(); render(); } }); return; }
  if (a === 'tpl-del') { state.template.splice(+el.dataset.i, 1); persist(); render(); return; }
  if (a === 'tpl-add') { state.template.push({id: 't-' + rid(), kind: 'run_easy', day: 4, tod: 'pm', min: 45, anchor: false, note: ''}); persist(); render(); return; }
  if (a === 'rebuild') {
    const week = state.weeks[wk]; if (!week) return;
    const before = snapshot(week), ti = todayIdx(wk);
    const keep = week.sessions.filter(s => s.status !== 'planned' || (s.day != null && s.day < ti));
    const usedT = new Set(keep.map(s => s.tid));
    week.sessions = [...keep, ...templateFor().filter(t => !usedT.has(t.id)).map(newSession)];
    place(wk, week, {fresh: true});
    view.v = 'week';
    return commit(wk, week, before, L('пересобрать по шаблону', 'rebuild from template'), [L('Неделя пересобрана по шаблону', 'Week rebuilt from the template')]);
  }
});
const DAYS_RU = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'], DAYS_EN = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
// Buttons in the sheet speak the same language as the command bar, so both paths share one planner.
function runOn(s, ru, en) {
  if (!s) return;
  const wk = view.wk, week = state.weeks[wk];
  // Pin the target: temporarily make it the only candidate by sport + day.
  const q = parse(L(ru, en), wk);
  const word = {run: L('бег', 'run'), bike: L('вел', 'ride'), gym: L('зал', 'gym'), climb: L('скалодром', 'climb'), walk: L('прогулка', 'walk'), swim: L('плавание', 'swim'), hike: L('поход', 'hike')}[KINDS[s.kind].sport];
  const src = s.day != null ? L(` с ${DAYS_RU[s.day]}`, ` from ${DAYS_EN[s.day]}`) : '';
  if (q.intent === 'move') return run(L(`перенеси ${word}${src} на ${ru.split(' ').pop()}`, `move ${word}${src} to ${en.split(' ').pop()}`));
  if (q.intent === 'skip') return run(L(`пропустил ${word} ${DAYS_RU[s.day]}`, `skipped ${word} ${DAYS_EN[s.day]}`));
  return run(L(ru, en));
}
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.id === 'icsFile' && el.files[0]) return icsFile(el.files[0]);
  if (el.id === 'pushAt' && /^\d{2}:\d{2}$/.test(el.value)) return pushTime(el.value);
  if (window.TrainFood?.change(el)) return;
  if (el.dataset.tpl != null) {
    const tpl = state.template[+el.dataset.tpl], f = el.dataset.f;
    if (f === 'day') tpl.day = +el.value; else if (f === 'min') tpl.min = Math.max(15, Math.min(480, +el.value || 45));
    else if (f === 'anchor') tpl.anchor = el.checked; else if (f === 'kind') { tpl.kind = el.value; tpl.min = KINDS[el.value].min; delete tpl.detail; delete tpl.key; render(); } else tpl[f] = el.value;
    persist(); return;
  }
  if (el.dataset.hrz != null) {
    const h = {...(state.zones?.hr || {})}, b = (h.b || [0, 0, 0, 0]).slice();
    b[+el.dataset.hrz] = Math.round(+el.value) || 0; h.b = b;
    state.zones = {...(state.zones || {}), hr: h}; delete state.zones.lthr;
    persist();
    if (hrZonesOk(b) || b.every(v => v > 0)) { if (!hrZonesOk(b)) toast(L('Границы должны расти: Z1 < Z2 < Z3 < Z4', 'Bounds must rise: Z1 < Z2 < Z3 < Z4')); render(); }
    return;
  }
  if (el.dataset.zown != null) {
    const v = Math.round(+el.value) || 0, own = {...(state.zones?.own || {})};
    if (v) own[el.dataset.zown] = v; else delete own[el.dataset.zown];
    state.zones = {...(state.zones || {}), own}; persist(); render(); return;
  }
  if (el.dataset.zone != null) {
    const f = el.dataset.zone, v = el.value.trim();
    state.zones = {...(state.zones || {})};
    if (!v) delete state.zones[f];
    else if (f === 'thr') { if (parsePace(v)) state.zones.thr = v.replace('.', ':'); else return toast(L('Темп — в формате 4:30', 'Pace as 4:30')); }
    else state.zones[f] = Math.round(+v) || undefined;
    if (v) state.zones.at = {...(state.zones.at || {}), [f]: todayStr()};
    persist(); return;
  }
  if (el.dataset.block != null) {
    const b = (state.prefs.blocks || []).find(x => x.id === el.dataset.block);
    if (b) { b[el.dataset.f] = el.dataset.f === 'label' ? el.value.slice(0, 40) : el.value; persist(); if (el.dataset.f !== 'label') replanOpen(); }
    return;
  }
  if (el.dataset.health != null) {
    state.health = {...(state.health || {}), [el.dataset.health]: el.type === 'checkbox' ? el.checked : el.value.slice(0, 160)};
    persist(); if (el.type === 'checkbox') render(); return;
  }
  if (el.dataset.pref != null) {
    const f = el.dataset.pref;
    state.prefs[f] = f === 'work' ? el.checked : f === 'buffer' ? Math.max(0, Math.min(90, +el.value || 0)) : el.value;
    persist(); if (f === 'work' && view.v === 'settings') render();
  }
});
document.addEventListener('submit', ev => {
  ev.preventDefault();
  if (ev.target.id === 'suppForm' || ev.target.id === 'foodText') return; // food.js
  if (ev.target.id === 'cmd') {
    const inp = $('#cmdInput'), v = inp.value.trim(); if (!v) return; inp.value = ''; inp.blur();
    // Plain commands go to the planner; anything it doesn't understand, or a question, goes to the assistant.
    if (cloud.ai && (/\?\s*$/.test(v) || !parse(v, view.wk).intent)) return openChat(v);
    run(v); scrollTo({top: 0, behavior: 'smooth'});
  }
  if (ev.target.id === 'chatForm') { const inp = $('#chatInput'), v = inp.value.trim(); if (!v || chat.busy) return; inp.value = ''; growInput(inp); sendChat(v); }
  if (ev.target.id === 'authForm') authSubmit();
  if (ev.target.id === 'calForm') calAdd();
  if (ev.target.id === 'onbAccount') onbAccount();
  if (ev.target.id === 'onbRedeem') onbRedeem();
  if (ev.target.id === 'onbCal') calAdd($('#onbCalUrl')?.value);
  if (ev.target.id === 'onbGarmin') onbGarmin();
  if (ev.target.id === 'garminForm') { const b = $('#garminForm button'); b.disabled = true; garminLink($('#garminKey').value).then(e => { if (e) toast(onbErr(e)); else toast(L('Garmin подключён', 'Garmin connected')); render(); }); }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  // In the chat, Enter sends and Shift+Enter breaks the line.
  if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && ev.target.id === 'chatInput') { ev.preventDefault(); $('#chatForm').requestSubmit(); }
});
document.addEventListener('input', ev => { if (ev.target.id === 'chatInput') growInput(ev.target); if (ev.target.dataset.wiz && wiz.a) wiz.a[ev.target.dataset.wiz] = ev.target.value; });
// A chip fills the field without taking focus from it, so the chips row stays open.
document.addEventListener('pointerdown', ev => { if (ev.target.closest('.chip')) ev.preventDefault(); });

// Debug hook for local testing (busy/acts injection); harmless in production.
// What add-ons (food.js) may use; nothing else in the app depends on them.
window.TrainApp = {L, esc, kName, KINDS, fDur, fHours, effective, todayStr, DAYS, render, $, cloud, toast, icon, view, ymd, parseYmd, mondayOf, addDays, SPORTS, trainingSport, actSport, lang: () => lang, get state() { return state; }};
window.trainDebug = {get state() { return state; }, get cloud() { return cloud; }, push, briefs, contribution, hrAuto, thrAuto, ftpAuto, effThr, effFtp, hrWords, trainStatus, breakOf, synced, openChat, chatContext, openWizard, openOnboarding, onb, onbGo, hrTargets, hrText, wiz, rulesPlan, projectOutlook, outlookWeek, buildPlan, applyWeekPlan, makeWeekly, maybeWeekly, weeklyDue, planContext, proposalSheet, view, run, parse, onBusy, matchActs, render, persist, place, setBusy(wk, events) { state.local.busy[wk] = {at: Date.now(), events}; saveLocal(); onBusy(wk); }, setActs(list) { state.local.acts = {at: Date.now(), list, linked: true}; saveLocal(); for (const wk of Object.keys(state.weeks)) { const week = state.weeks[wk], before = snapshot(week), lines = matchActs(wk, week); if (lines.length) commit(wk, week, before, 'Garmin', lines); } render(); }};

// Back from Google's consent screen: #google=ok or #google=<reason>.
const googleBack = (location.hash.match(/google=([\w-]+)/) || [])[1];
if (googleBack) {
  history.replaceState(null, '', location.pathname + location.search);
  if (googleBack === 'ok') { state.local.busy = {}; saveLocal(); }
  setTimeout(() => toast(googleBack === 'ok' ? L('Google Календарь подключён', 'Google Calendar connected') : googleBack === 'denied' ? L('Доступ не выдан — календарь не подключён', 'Access not granted — calendar not connected') : L('Google не подключился: ', 'Google didn’t connect: ') + googleBack), 400);
}

render();
// First open on this device, not signed in: start with the plan wizard.
initCloud().then(async () => {
  if (cloud.user) await cloud.ready;
  const saved = onbSaved();
  if (saved && googleBack && cloud.user) openOnboarding(saved === 'calendar' ? 'calendar' : saved);
  else if (inviteFromUrl) { history.replaceState(null, '', location.pathname); if (!cloud.user) { onb.mode = 'join'; openOnboarding('account'); } else if (cloud.me && !cloud.me.member) openOnboarding('code'); else toast(L('Ты уже в «Неделе»', 'You’re already in')); }
  else if (firstRun && !cloud.user) openOnboarding('hello');
  else if (cloud.user && cloud.me?.member && !state.onboard?.done && !state.plan) openOnboarding('calendar');
});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // A new deploy installs a new worker; when it takes over, reload once so the page runs the new code.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(r => r.update()).catch(() => {});
}
try { navigator.storage?.persist?.(); } catch {}
})();
