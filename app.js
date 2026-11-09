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
const sDetail = s => (!s.was && s.detail) || kDetail(s.kind);
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
  return d;
}
const synced = () => { const {local, dirty, syncedAt, syncedUser, ...rest} = state; return rest; };
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
    const bs = b.s - (b.work ? 0 : p.buffer), be = b.e + (b.work ? 15 : p.buffer);
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
  runRow: L('бег два дня подряд — бережём таз', 'running two days in a row — easy on impact'),
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
  const week = {sessions: templateFor().filter(t => t.day >= ti).map(newSession), log: [], away: [], cal: {}, busySeen: !!state.local.busy[wk]};
  place(wk, week, {fresh: true});
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
      saveLocal(); render();
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
    const hit = blocks(wk, s.day).find(b => !b.work && b.s < s.start + s.min && b.e > s.start);
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
async function loadActs(force) {
  const a = state.local.acts;
  if (!force && a && Date.now() - a.at < 15 * 60e3) return;
  const to = new Date(), from = ymd(addDays(mondayOf(to), -28));
  const d = await fn('activities', {from, to: ymd(to)});
  if (d.error) return;
  cloud.gLinked = d.linked;
  mergeActs(d.activities || [], from, d);
  state.local.acts.at = Date.now();
  saveLocal();
  for (const wk of Object.keys(state.weeks)) {
    const week = state.weeks[wk], before = snapshot(week), lines = matchActs(wk, week);
    if (lines.length) commit(wk, week, before, 'Garmin', lines, {silent: wk !== view.wk});
  }
  render();
}
// Older history: a range [from, to) that the cache doesn't reach yet. Returns how many activities came in.
const histBusy = {on: false};
async function loadHistory(from, to) {
  if (histBusy.on || !cloud.user) return null;
  histBusy.on = true;
  try {
    const d = await fn('activities', {from, to});
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
async function afterSignIn() {
  await sync();
  const st = await fn('cal-status'); if (!st.error) { cloud.cals = st.calendars; cloud.google = st.google; }
  render();
  const ai = aiStatus();
  if (cloud.cals?.length) await loadBusy(view.wk);
  await loadActs();
  await ai;
  maybeWeekly();
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
  const g = gate(), now = new Date();
  const checks = Object.keys(state.checks).filter(d => d >= ymd(addDays(now, -14))).sort().map(d => ({date: d, sit: state.checks[d].sit, walk: state.checks[d].walk, rest_or_night_pain: !!state.checks[d].rest}));
  return {checks, gate: g.known ? {max_today: g.max, stop: g.stop, see_doctor: g.doctor, bike_ok: g.bikeOk, run_ok_today: g.runOkOn(todayStr())} : 'нет свежей отметки', user_rule: 'бег только после 48 ч на 0/10, включая сидение; вел — если сидя 0/10'};
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
    const read = `${L('Неделя с', 'Week of')} ${fDay(r.wk)}: ${r.past ? L('было', 'did') + ' ' + fH(r.h) + (r.plan ? ` ${L('из', 'of')} ${fH(r.plan.hours)}` : '') : L('план', 'plan') + ' ' + fH(r.h)}${r.plan ? ' · ' + ph(r) : ''} · ${L('форма', 'form')} ${fH(form[i])}`;
    return `<span class="ol-col" data-r="${esc(read)}"><i class="${cls}" style="height:${(r.h / max * 100).toFixed(1)}%"></i>${r.past && r.plan ? `<b class="ol-tick" style="bottom:${(r.plan.hours / max * 100).toFixed(1)}%"></b>` : ''}</span>`;
  }).join('');
  // Phase strip: an easy week belongs to the stretch it sits in; Garmin weeks are one stretch.
  const segs = [];
  rows.forEach((r, i) => {
    const key = r.past ? 'past' : r.plan.phase === 'deload' && segs.length && segs[segs.length - 1].key !== 'past' ? segs[segs.length - 1].key : r.plan.phase;
    if (segs.length && segs[segs.length - 1].key === key) segs[segs.length - 1].n++; else segs.push({key, n: 1});
  });
  const strip = segs.map(s => { const name = s.key === 'past' ? L('было', 'so far') : L(PHASE[s.key][0], PHASE[s.key][1]); return `<span style="flex:${s.n}" title="${esc(name)}">${s.n >= 3 || (s.key === 'race') ? esc(s.key === 'race' ? '★' : name) : ''}</span>`; }).join('');
  const line = form.map((v, i) => `${i + 0.5},${(100 - v / max * 100).toFixed(1)}`).join(' ');
  const def = now > 0 ? L(`Форма ${fH(f0)} → ${fH(f1)} в неделю к ${fDay(last.wk)}`, `Form ${fH(f0)} → ${fH(f1)} a week by ${fDay(last.wk)}`) : L(`Форма к ${fDay(last.wk)} — ${fH(f1)} в неделю`, `Form by ${fDay(last.wk)} — ${fH(f1)} a week`);
  return `<figure class="ol" aria-label="${esc(def)}">
    <div class="ol-legend"><span><i class="sw past"></i>${L('было', 'done')}</span><span><i class="sw plan"></i>${L('план', 'plan')}</span><span><i class="sw light"></i>${L('легче', 'easier')}</span><span><i class="sw line"></i>${L('форма — средний объём за ~6 нед.', 'form — ~6-week average volume')}</span></div>
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
  return `<div class="plan-list">${list.slice().sort((x, y) => x.day - y.day).map(x => `<div class="plan-row"><span class="plan-day">${D[x.day]}</span><div class="plan-what"><span class="plan-name"><span class="dot ${KINDS[x.kind].sport}"></span>${esc(kName(x.kind))}${x.key ? `<span class="plan-key">${L('главная', 'key')}</span>` : ''}<span class="plan-min num">${fDur(x.min)}</span></span>${x.detail ? `<span class="plan-detail">${esc(x.detail)}</span>` : ''}</div></div>`).join('')}</div>`;
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
  place(wk, week, {fresh: true});
  matchActs(wk, week);
  const D = DAYS();
  commit(wk, week, before, text, [p.summary, ...add.map(s => s.day != null ? `${D[s.day]}${s.start != null ? ' ' + hm(s.start) : ''}: ${kName(s.kind)}, ${fDur(s.min)}` : L(`${kName(s.kind)}: ${whyText(s.why)}`, `${kName(s.kind)}: ${whyText(s.why)}`))]);
  scrollTo({top: 0, behavior: 'smooth'});
  return true;
}

// Weekend: the assistant drafts next week once (any device), the person accepts, discusses or keeps the usual week.
function weeklyDue() {
  if (!state.plan || !cloud.ai || !cloud.user || weekly.busy) return null;
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
  let h = `<div class="section-title">${L('План', 'Plan')}</div>`;
  if (p) h += `<div class="list" style="margin-bottom:12px"><div class="row" style="display:block"><span class="t"><b>${esc(L(GOALS[p.goal]?.[0] || '', GOALS[p.goal]?.[1] || ''))}${p.goal === 'event' && p.eventName ? ' · ' + esc(p.eventName) : ''}</b><span>${esc(p.sports.map(sp => L(SPORTS[sp][0], SPORTS[sp][1])).join(', '))} · ${p.days} ${L('в неделю', 'a week')} · ~${p.hours}${L(' ч', ' h')}</span></span></div></div>${p.outlook ? outlookHTML(p.outlook, p.start, p, false) : ''}`;
  else h += `<p class="hint" style="padding-bottom:12px">${L('Плана нет — недели собираются из «Обычной недели» ниже.', 'No plan — weeks come from the usual week below.')}</p>`;
  return h + `<div class="stack" style="margin-bottom:24px"><button class="btn ${p ? 'quiet' : 'primary'}" data-a="plan-open">${p ? L('Собрать план заново', 'Rebuild the plan') : L('Собрать план', 'Build a plan')}</button></div>`;
}

/* ---------- view ---------- */
const view = {v: 'week', wk: ymd(mondayOf(new Date()))};
if (new Date().getDay() === 0) view.wk = ymd(addDays(parseYmd(view.wk), 7)); // on Sunday, look ahead
let toastTimer = null;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600); }

function render() {
  const app = $('#app');
  app.innerHTML = view.v === 'settings' ? settingsHTML() : weekHTML();
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
    <span class="nav-right">${cloud.ai ? `<button class="nav-btn icon-btn" data-a="chat" aria-label="${L('Ассистент', 'Assistant')}">${icon('chat', 22)}</button>` : ''}<button class="nav-btn" data-a="settings">${L('Настройки', 'Settings')}</button></span></div>
    <h1>${L('Неделя', 'Week')}<span class="sub">${esc(sub)}</span></h1></header>`;
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
  h += alertsHTML(wk);
  h += planCardsHTML(wk);
  h += heroHTML(wk, week, effs, ti);
  h += painLine();
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
function alertsHTML(wk) {
  let h = '';
  if (!cloud.user && cloud.client) h += `<button class="nudge" data-a="settings"><span>${L('Войди — подтяну календарь и Garmin', 'Sign in to bring in calendar and Garmin')}</span><span class="nudge-go">${L('Войти', 'Sign in')} ›</span></button>`;
  else if (cloud.user && cloud.cals && !cloud.cals.length && !(state.local.busy[wk]?.events || []).some(e => e.cal === 'file')) h += `<button class="nudge" data-a="settings"><span>${L('Подключи календарь — план встанет в свободные окна', 'Connect your calendar so the plan fits your free time')}</span><span class="nudge-go">${L('Подключить', 'Connect')} ›</span></button>`;
  const ti = todayIdx(wk);
  if (ti >= 0 && ti <= 6 && !state.checks[todayStr()]) h += `<button class="nudge" data-a="pain-open"><span>${L('Как сегодня? Боль не отмечена', 'How is it today? Pain not logged')}</span><span class="nudge-go">${L('Отметить', 'Log')} ›</span></button>`;
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
function analyse(d, base, sid) {
  const S = d.summary, sp = sportOfSummary(S), ser = d.series, verdicts = [], best = [];
  const sess = sid ? state.weeks[view.wk]?.sessions.find(x => x.id === sid) : null;
  // 1. intensity, against what was planned when there was a plan
  const z = base?.hrz, zt = z ? z.reduce((a, b) => a + b, 0) : 0;
  if (zt > 600) {
    const easy = (z[0] + z[1]) / zt * 100, hard = (z[3] + z[4]) / 60, mid = z[2] / zt * 100;
    if (sess && EASY.has(sess.kind)) verdicts.push(easy >= 70
      ? {head: L('Лёгкая, как задумано.', 'Easy, as planned.'), text: L(`${Math.round(easy)}% времени в Z1–Z2.`, `${Math.round(easy)}% of the time in Z1–Z2.`), tone: 'good'}
      : {head: L('Тяжелее задуманного.', 'Harder than planned.'), text: L(`В Z1–Z2 только ${Math.round(easy)}%, в Z3 ${Math.round(mid)}% — лёгкий день ушёл в «серую зону».`, `Only ${Math.round(easy)}% in Z1–Z2, ${Math.round(mid)}% in Z3 — the easy day drifted into the grey zone.`), tone: 'warn'});
    else if (sess?.kind === 'bike_q') verdicts.push(hard + z[2] / 60 >= 20
      ? {head: L('Качество получилось.', 'Quality landed.'), text: L(`${Math.round(z[2] / 60 + hard)} мин в Z3–Z5.`, `${Math.round(z[2] / 60 + hard)} min in Z3–Z5.`), tone: 'good'}
      : {head: L('Качества было мало.', 'Little quality.'), text: L(`Всего ${Math.round(z[2] / 60 + hard)} мин в Z3–Z5.`, `Only ${Math.round(z[2] / 60 + hard)} min in Z3–Z5.`), tone: 'warn'});
    else verdicts.push({head: easy >= 70 ? L('В основном легко.', 'Mostly easy.') : hard >= 20 ? L('Тяжёлая тренировка.', 'A hard session.') : L('Смешанная интенсивность.', 'Mixed intensity.'), text: L(`Z1–Z2 ${Math.round(easy)}% · Z3 ${Math.round(mid)}% · Z4–Z5 ${Math.round(hard)} мин.`, `Z1–Z2 ${Math.round(easy)}% · Z3 ${Math.round(mid)}% · Z4–Z5 ${Math.round(hard)} min.`)});
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
  id = Number(id);
  const base = (state.local.acts?.list || []).find(a => a.id === id) || null;
  let d = actCached(id);
  openSheet(activityHTML(base, d, plan, sid, !d), {act: id});
  if (d) return wireCharts(d);
  d = await fn('activity', {id});
  if (sheetCtx?.act !== id) return;
  if (d.error || !d.summary) { $('#sheetPanel').innerHTML = activityHTML(base, null, plan, sid, false, d.error || 'unavailable'); return; }
  actStore(id, d);
  $('#sheetPanel').innerHTML = activityHTML(base, d, plan, sid, false);
  wireCharts(d);
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
  let h = `<div class="sheet-head"><h2>${esc(name)}</h2><button class="nav-btn" data-a="close-sheet">${L('Готово', 'Done')}</button></div><div class="sheet-scroll act" data-sport="${esc(sp)}">`;
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
    <p class="num" style="font-size:15px">${esc(when)}</p><p class="hint" style="margin:6px 0 4px">${esc(sDetail(s))}</p>${s.why ? `<p class="hint">${esc(whyText(s.why))}</p>` : ''}`;
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
function settingsHTML() {
  let h = `<main class="screen"><header class="nav"><div class="nav-row"><button class="nav-btn" data-a="back">${icon('left')}${L('Неделя', 'Week')}</button><span></span></div><h1>${L('Настройки', 'Settings')}</h1></header>`;
  h += `<div class="seg" role="group" style="margin-bottom:16px"><button data-a="lang" data-l="ru" aria-pressed="${lang === 'ru'}">Русский</button><button data-a="lang" data-l="en" aria-pressed="${lang === 'en'}">English</button></div>`;
  h += acctHTML();
  h += planSettingsHTML();
  if (cloud.user) {
    h += `<div class="section-title">${L('Календарь', 'Calendar')}</div>`;
    const cals = cloud.cals || [];
    if (cals.length) h += `<div class="list" style="margin-bottom:12px">${cals.map(c => `<div class="row"><span class="t"><b>${esc(c.label)}</b><span>${c.last_error ? (c.last_error === 'google_revoked' ? L('Доступ отозван — подключи заново', 'Access revoked — connect again') : L('Не загрузился: ', 'Failed: ') + esc(c.last_error)) : c.checked_at ? L('Обновлён ', 'Updated ') + new Date(c.checked_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : ''}</span></span><button class="nav-btn" data-a="cal-remove" data-id="${esc(c.id)}">${L('Убрать', 'Remove')}</button></div>`).join('')}</div>`;
    if (cloud.google) h += `<div class="stack" style="margin-bottom:12px"><button class="btn primary" data-a="google" ${cloud.calBusy ? 'disabled' : ''}>${L('Подключить Google Календарь', 'Connect Google Calendar')}</button></div>
      <p class="hint" style="padding-bottom:16px">${L('Только чтение: время и названия событий. Google может показать «приложение не проверено» — это моё приложение, оно пока в бете: «Дополнительно» → «Перейти».', 'Read-only: event times and titles. Google may say the app isn’t verified yet — it’s in beta: Advanced → Go to app.')}</p>`;
    h += `<p class="hint" style="padding-bottom:10px">${cloud.google ? L('Другой календарь (Apple, Outlook, рабочий) — ссылкой iCal. ', 'Another calendar (Apple, Outlook, work) — by iCal link. ') : ''}${L('В Google (с компьютера): Настройки → нужный календарь → «Интеграция календаря» → «Секретный адрес в формате iCal». Ссылка хранится на сервере, приложение видит только занятость и названия событий.', 'In Google (desktop): Settings → your calendar → Integrate calendar → Secret address in iCal format. The link stays on the server; the app sees only busy times and event titles.')}</p>
      <form id="calForm" class="stack" style="margin-bottom:10px"><label class="field">${L('Ссылка iCal (.ics)', 'iCal link (.ics)')}<input id="calUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" required></label>
      <button class="btn ${cloud.google ? 'quiet' : 'primary'}" type="submit" ${cloud.calBusy ? 'disabled' : ''}>${cloud.calBusy ? L('Проверяю…', 'Checking…') : L('Подключить по ссылке', 'Connect by link')}</button></form>
      <label class="btn quiet" style="margin-bottom:24px">${L('Или загрузить файл .ics на эту неделю', 'Or load an .ics file for this week')}<input type="file" id="icsFile" accept=".ics,text/calendar" hidden></label>`;
    const a = state.local.acts;
    const since = a?.from ? parseYmd(a.from).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
    h += `<div class="section-title">Garmin</div><p class="hint" style="padding-bottom:12px">${a?.linked ? L(`Подключён через «Зал» · ${a.list.length} активностей с ${since}`, `Linked via the gym app · ${a.list.length} activities since ${since}`) + (a.error ? ' · ' + esc(a.error) : '') : a?.linked === false ? L('Не подключён. Вставь ключ Personal API в «Зале» → Настройки → Garmin — он общий для обоих приложений.', 'Not linked. Paste your Personal API key in the gym app → Settings → Garmin; it’s shared.') : L('Проверяю…', 'Checking…')}</p>`;
    if (a?.linked) h += `<div class="stack" style="margin-bottom:24px"><button class="btn quiet" data-a="history" ${histBusy.on ? 'disabled' : ''}>${histBusy.on ? L('Загружаю…', 'Loading…') : L('Загрузить историю за год', 'Load a year of history')}</button></div>`;
  }
  // template
  h += `<div class="section-title">${L('Обычная неделя', 'Usual week')}</div><p class="hint" style="padding-bottom:4px">${L('Из этого собирается каждая новая неделя. День — желаемый: если он занят, сессия переедет и скажет почему. Якорь не двигается.', 'Every new week starts from this. The day is a preference: if it’s busy, the session moves and says why. An anchor stays put.')}</p><div>`;
  const D = DAYS();
  state.template.forEach((tpl, idx) => {
    h += `<div class="tpl"><div class="full"><select data-tpl="${idx}" data-f="kind" style="width:auto">${Object.keys(KINDS).filter(k => k !== 'mobility').map(k => `<option value="${k}" ${tpl.kind === k ? 'selected' : ''}>${esc(kName(k))}</option>`).join('')}</select><button class="nav-btn" data-a="tpl-del" data-i="${idx}" style="color:var(--danger)">${L('Убрать', 'Remove')}</button></div>
      <select data-tpl="${idx}" data-f="day">${D.map((d, i) => `<option value="${i}" ${tpl.day === i ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <select data-tpl="${idx}" data-f="tod">${[['am', L('утро', 'morning')], ['pm', L('вечер', 'evening')], ['any', L('любое время', 'any time')]].map(([v, n]) => `<option value="${v}" ${tpl.tod === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="field" style="font-size:12px">${L('Минут', 'Minutes')}<input data-tpl="${idx}" data-f="min" type="number" inputmode="numeric" min="15" max="480" step="5" value="${tpl.min}"></label>
      <label class="field" style="font-size:12px">${L('Заметка', 'Note')}<input data-tpl="${idx}" data-f="note" value="${esc(tpl.note || '')}" placeholder="${L('с друзьями', 'with friends')}"></label>
      <label class="check full" style="justify-content:flex-start"><input type="checkbox" data-tpl="${idx}" data-f="anchor" ${tpl.anchor ? 'checked' : ''}> ${L('Якорь — не двигать', 'Anchor — don’t move')}</label></div>`;
  });
  h += `</div><div class="stack" style="padding:12px 0 24px"><button class="btn quiet" data-a="tpl-add">${L('Добавить тренировку', 'Add a session')}</button><button class="btn quiet" data-a="rebuild">${L('Пересобрать текущую неделю по шаблону', 'Rebuild this week from the template')}</button></div>`;
  // day bounds
  const p = state.prefs, tin = (f, v) => `<input data-pref="${f}" type="time" value="${esc(v)}">`;
  h += `<div class="section-title">${L('Когда можно тренироваться', 'When you can train')}</div><div class="tpl" style="border:0">
    <label class="field" style="font-size:12px">${L('Будни с', 'Weekdays from')}${tin('wdStart', p.wdStart)}</label><label class="field" style="font-size:12px">${L('до', 'to')}${tin('wdEnd', p.wdEnd)}</label>
    <label class="field" style="font-size:12px">${L('Выходные с', 'Weekends from')}${tin('weStart', p.weStart)}</label><label class="field" style="font-size:12px">${L('до', 'to')}${tin('weEnd', p.weEnd)}</label>
    <label class="field" style="font-size:12px">${L('Вечер начинается', 'Evening starts')}${tin('evening', p.evening)}</label><label class="field" style="font-size:12px">${L('Дорога вокруг встреч, мин', 'Travel around events, min')}<input data-pref="buffer" type="number" min="0" max="90" step="5" value="${p.buffer}"></label>
    <label class="check full" style="justify-content:flex-start"><input type="checkbox" data-pref="work" ${p.work ? 'checked' : ''}> ${L('Рабочие часы по будням считать занятыми', 'Treat weekday work hours as busy')}</label>
    <label class="field" style="font-size:12px">${L('Работа с', 'Work from')}${tin('workStart', p.workStart)}</label><label class="field" style="font-size:12px">${L('до', 'to')}${tin('workEnd', p.workEnd)}</label></div>`;
  h += `<p class="hint" style="padding:24px 0 8px"><a href="privacy.html" style="color:var(--accent)">${L('Конфиденциальность', 'Privacy')}</a></p>`;
  return h + '</main>';
}
function acctHTML() {
  if (!cloud.client) return '';
  if (cloud.user) return `<div class="section-title" style="padding-top:4px">${L('Аккаунт', 'Account')}</div><div class="list" style="margin-bottom:24px"><div class="row"><span class="t"><b>${esc(cloud.user.email || '')}</b><span id="acctStatus">${esc(acctStatus())}</span></span><button class="nav-btn" data-a="sign-out">${L('Выйти', 'Sign out')}</button></div></div>`;
  return `<div class="section-title" style="padding-top:4px">${L('Аккаунт', 'Account')}</div><p class="hint" style="padding-bottom:12px">${L('Тот же аккаунт, что в «Зале». Без входа план живёт только на этом устройстве и не видит календарь.', 'Same account as the gym app. Without it the plan lives on this device only and can’t see your calendar.')}</p>
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
async function calAdd() {
  const url = ($('#calUrl').value || '').trim(); if (!url) return;
  cloud.calBusy = true; render();
  const d = await fn('cal-add', {url});
  cloud.calBusy = false;
  if (d.error) {
    toast({bad_url: L('Нужна ссылка https:// или webcal://', 'Needs an https:// or webcal:// link'), duplicate: L('Этот календарь уже подключён', 'Already connected'), too_many: L('Максимум 5 календарей', 'Up to 5 calendars'), not_ics: L('По ссылке не календарь — нужна ссылка iCal', 'That link isn’t a calendar — use the iCal one'), http_404: L('Календарь не найден — проверь ссылку', 'Calendar not found — check the link'), http_403: L('Нет доступа — нужна секретная ссылка', 'No access — use the secret link')}[d.error] || L('Не получилось загрузить календарь', 'Couldn’t load the calendar'));
    render(); return;
  }
  cloud.cals = d.calendars; toast(L('Календарь подключён', 'Calendar connected')); render();
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
  if (a === 'chat-act') { const id = Number(el.dataset.id), b = (state.local.acts?.list || []).find(x => x.id === id); return openChat(L(`Разбери тренировку: ${b?.name || 'эта'}, ${(b?.start || '').slice(0, 10)}`, `Review this workout: ${b?.name || ''}, ${(b?.start || '').slice(0, 10)}`), {act: id}); }
  if (a === 'chip') { const inp = $('#cmdInput'); inp.value = el.dataset.t; inp.focus(); return; }
  if (a === 'wk') { view.wk = ymd(addDays(parseYmd(wk), +el.dataset.d)); lastChange = null; render(); if (cloud.user && cloud.cals?.length && todayIdx(view.wk) <= 6) loadBusy(view.wk); ensureHistory(view.wk); return; }
  if (a === 'wk-today') { view.wk = ymd(mondayOf(new Date())); render(); return; }
  if (a === 'settings') { view.v = 'settings'; render(); scrollTo(0, 0); if (cloud.user) fn('cal-status').then(d => { if (!d.error) { cloud.cals = d.calendars; cloud.google = d.google; if (view.v === 'settings') render(); } }); return; }
  if (a === 'back') { view.v = 'week'; render(); return; }
  if (a === 'undo') return undo(wk);
  if (a === 'dismiss') { lastChange = null; render(); return; }
  if (a === 'open') return sessionSheet(el.dataset.id);
  if (a === 'act') return openActivity(el.dataset.id);
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
  if (a === 'sign-out') { cloud.client.auth.signOut(); cloud.user = null; cloud.cals = null; cloud.ai = false; render(); return; }
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
  if (el.dataset.tpl != null) {
    const tpl = state.template[+el.dataset.tpl], f = el.dataset.f;
    if (f === 'day') tpl.day = +el.value; else if (f === 'min') tpl.min = Math.max(15, Math.min(480, +el.value || 45));
    else if (f === 'anchor') tpl.anchor = el.checked; else if (f === 'kind') { tpl.kind = el.value; tpl.min = KINDS[el.value].min; delete tpl.detail; delete tpl.key; render(); } else tpl[f] = el.value;
    persist(); return;
  }
  if (el.dataset.pref != null) {
    const f = el.dataset.pref;
    state.prefs[f] = f === 'work' ? el.checked : f === 'buffer' ? Math.max(0, Math.min(90, +el.value || 0)) : el.value;
    persist();
  }
});
document.addEventListener('submit', ev => {
  ev.preventDefault();
  if (ev.target.id === 'cmd') {
    const inp = $('#cmdInput'), v = inp.value.trim(); if (!v) return; inp.value = ''; inp.blur();
    // Plain commands go to the planner; anything it doesn't understand, or a question, goes to the assistant.
    if (cloud.ai && (/\?\s*$/.test(v) || !parse(v, view.wk).intent)) return openChat(v);
    run(v); scrollTo({top: 0, behavior: 'smooth'});
  }
  if (ev.target.id === 'chatForm') { const inp = $('#chatInput'), v = inp.value.trim(); if (!v || chat.busy) return; inp.value = ''; growInput(inp); sendChat(v); }
  if (ev.target.id === 'authForm') authSubmit();
  if (ev.target.id === 'calForm') calAdd();
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
window.trainDebug = {get state() { return state; }, get cloud() { return cloud; }, openChat, chatContext, openWizard, wiz, rulesPlan, projectOutlook, outlookWeek, buildPlan, applyWeekPlan, makeWeekly, maybeWeekly, weeklyDue, planContext, proposalSheet, view, run, parse, onBusy, matchActs, render, persist, place, setBusy(wk, events) { state.local.busy[wk] = {at: Date.now(), events}; saveLocal(); onBusy(wk); }, setActs(list) { state.local.acts = {at: Date.now(), list, linked: true}; saveLocal(); for (const wk of Object.keys(state.weeks)) { const week = state.weeks[wk], before = snapshot(week), lines = matchActs(wk, week); if (lines.length) commit(wk, week, before, 'Garmin', lines); } render(); }};

// Back from Google's consent screen: #google=ok or #google=<reason>.
const googleBack = (location.hash.match(/google=([\w-]+)/) || [])[1];
if (googleBack) {
  history.replaceState(null, '', location.pathname + location.search);
  if (googleBack === 'ok') { state.local.busy = {}; saveLocal(); }
  setTimeout(() => toast(googleBack === 'ok' ? L('Google Календарь подключён', 'Google Calendar connected') : googleBack === 'denied' ? L('Доступ не выдан — календарь не подключён', 'Access not granted — calendar not connected') : L('Google не подключился: ', 'Google didn’t connect: ') + googleBack), 400);
}

render();
// First open on this device, not signed in: start with the plan wizard.
initCloud().then(() => { if (firstRun && !cloud.user && !state.plan) openWizard(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // A new deploy installs a new worker; when it takes over, reload once so the page runs the new code.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(r => r.update()).catch(() => {});
}
try { navigator.storage?.persist?.(); } catch {}
})();
