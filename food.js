// food.js — a personal add-on to «Неделя»: the day's КБЖУ plan from weight and training, meals by photo or text
// (estimated by the train-food function), fuel for today's session, supplements. Admin only.
// Kept apart on purpose, so it can be removed cleanly:
//   1. delete this file and its <script> line in index.html (and 'food.js' in sw.js ASSETS);
//   2. drop table public.training_food (schema.sql, «Food add-on») and delete the train-food function;
//   3. the hooks in app.js read window.TrainFood?.… and do nothing without it.
// Data: localStorage 'train.food.v1' on the device, synced to training_food (one row per user, RLS own row).
// Uses what app.js hands to add-ons: window.TrainApp.
(() => {
  if (!window.TrainApp) return;
  const TrainApp = window.TrainApp, {L, esc, kName, KINDS, fDur, effective, todayStr, DAYS, render, $, cloud, toast, icon, ymd, parseYmd, mondayOf, addDays} = TrainApp;
  const KEY = 'train.food.v1';
  const DEFAULT_SUPPS = [
    {id: 'creatine', name: 'Креатин', dose: '6 г', days: null},
    {id: 'mg', name: 'Магний', dose: '2 капс. вечером', days: null},
    {id: 'd3', name: 'D3', dose: '1 капс.', days: [0, 2, 4, 6]},
  ];
  let F = null, timer = null, pulled = false;
  try { F = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!F) F = {weight: null, supps: DEFAULT_SUPPS.map(x => ({...x})), log: {}, at: 0};
  const on = () => !!cloud.me?.admin;
  const day = d => { F.log[d] = F.log[d] || {s: {}, p: [], m: []}; F.log[d].m = F.log[d].m || []; return F.log[d]; };
  const busy = {on: false};
  // The day's plan: protein 1.8 g/kg and fat 1 g/kg every day; carbs follow the training load —
  // ~3.5 g/kg on rest days, 4.5 under an hour, 6 for 1–2.5 h, 7.5 for longer (ACSM/Thomas 2016: 3–5 light, 5–7 moderate, 6–10 high; B).
  const KCAL_MIN = {run: 11, bike: 9, swim: 9, gym: 6, climb: 7, hike: 6, walk: 4};
  function targets(sessions) {
    if (!F.weight) return null;
    const w = F.weight, ss = sessions.filter(x => x.status === 'planned' || x.status === 'done');
    const min = ss.reduce((t, x) => t + (x.act?.min ?? x.min), 0);
    const ck = min === 0 ? 3.5 : min < 60 ? 4.5 : min <= 150 ? 6 : 7.5;
    const p = Math.round(w * 1.8), f = Math.round(w * 1), c = Math.round(w * ck), kcal = Math.round((4 * (p + c) + 9 * f) / 10) * 10;
    const burn = ss.reduce((t, x) => t + (x.act?.min ?? x.min) * (KCAL_MIN[KINDS[x.kind]?.sport] || 6), 0);
    return {kcal, p, f, c, min, ck, burn};
  }
  const eaten = d => {
    const t = {kcal: 0, p: 0, f: 0, c: 0};
    for (const m of d.m || []) { t.kcal += m.kcal; t.p += m.p; t.f += m.f; t.c += m.c; }
    t.p += (d.p || []).reduce((a, b) => a + b, 0);
    return t;
  };
  // A photo shrinks to 1024 px JPEG before it leaves the phone.
  const shrink = file => new Promise((ok, no) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1024 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', 0.75).split(',')[1]); };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('image')); };
    img.src = url;
  });
  async function estimate(body) {
    if (busy.on || !cloud.client || !cloud.user) return;
    const date = curDay(); // the day on screen now, even if another is open when the answer comes
    busy.on = true; fabOpen = false; fabRender(); render();
    try {
      const {data, error} = await cloud.client.functions.invoke('train-food', {body});
      let err = null; if (error) { try { err = (await error.context?.json?.())?.error; } catch {} err = err || 'unavailable'; }
      if (err || !data?.items) { toast(err === 'limit' ? L('Лимит ассистента на сегодня исчерпан', 'Today’s assistant limit is used up') : L('Не получилось посчитать — попробуй ещё раз', 'Couldn’t estimate — try again')); return; }
      if (!data.items.length) { toast(data.comment || L('Не похоже на еду', 'Doesn’t look like food')); return; }
      day(date).m.push({at: date === todayStr() ? Date.now() : parseYmd(date).getTime() + 13 * 3600e3, name: data.items.map(x => x.name).join(', ').slice(0, 80), items: data.items, ...data.total, note: data.comment, conf: data.confidence, src: body.image ? 'photo' : 'text'});
      save();
      toast(L(`+${data.total.kcal} ккал · Б ${data.total.p} · Ж ${data.total.f} · У ${data.total.c}`, `+${data.total.kcal} kcal · P ${data.total.p} · F ${data.total.f} · C ${data.total.c}`));
    } finally { busy.on = false; fabRender(); render(); }
  }
  function save() {
    F.at = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(F)); } catch {}
    clearTimeout(timer); timer = setTimeout(push, 1500);
    render();
  }
  async function push() {
    if (!cloud.client || !cloud.user) return;
    await cloud.client.from('training_food').upsert({user_id: cloud.user.id, data: F, updated_at: new Date().toISOString()}, {onConflict: 'user_id'});
  }
  // The newer copy wins: the server's when this device hasn't changed since, this device's otherwise.
  async function pull() {
    if (!cloud.client || !cloud.user || !on()) return;
    pulled = true;
    const {data} = await cloud.client.from('training_food').select('data').eq('user_id', cloud.user.id).maybeSingle();
    if (data?.data && (data.data.at || 0) > (F.at || 0)) { F = data.data; try { localStorage.setItem(KEY, JSON.stringify(F)); } catch {} render(); }
    else if (F.at && (!data?.data || (data.data.at || 0) < F.at)) push();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cloud.user) pull(); });

  // What to eat around today's sessions — the rulebook's fuel rules (106: carbs an hour; protein after, B/C).
  function fuelFor(sessions) {
    const ss = sessions.filter(x => x.status === 'planned' || x.status === 'done'); if (!ss.length) return null;
    const long = ss.find(x => x.min >= 75 || /_long$/.test(x.kind) || x.kind === 'hike'), hard = ss.find(x => KINDS[x.kind]?.hard), gym = ss.find(x => x.kind === 'gym');
    if (long) {
      const h = Math.max(0, long.min / 60 - 0.5), hi = long.min >= 150 ? 90 : 60, r5 = v => Math.round(v / 5) * 5;
      return {head: `${kName(long.kind)}, ${fDur(long.min)}`, lines: [
        L('До: углеводная еда за 2–3 ч (каша, рис, хлеб) — без экспериментов.', 'Before: a carb meal 2–3 h out (oats, rice, bread) — nothing new.'),
        L(`Во время: 30–${hi} г углеводов в час с 20–30-й минуты — на всю тренировку ${r5(30 * h)}–${r5(hi * h)} г; вода 400–800 мл/ч.`, `During: 30–${hi} g carbs an hour from minute 20–30 — ${r5(30 * h)}–${r5(hi * h)} g for the session; 400–800 ml water an hour.`),
        L('После: 20–40 г белка и углеводы в течение 1–2 ч.', 'After: 20–40 g protein plus carbs within 1–2 h.')]};
    }
    if (hard) return {head: kName(hard.kind), lines: [L('До: лёгкий углеводный перекус за 1–2 ч (банан, тост).', 'Before: a light carb snack 1–2 h out (banana, toast).'), L('После: 20–40 г белка.', 'After: 20–40 g protein.')]};
    if (gym) return {head: kName(gym.kind), lines: [L('После: 20–40 г белка; креатин можно сразу после.', 'After: 20–40 g protein; creatine can go right after.')]};
    return null;
  }
  const suppsFor = dow => F.supps.filter(x => !x.days || x.days.includes(dow));

  // ---------- screens: «Еда» (one day) and «Анализ» (food and training over a period) ----------
  // Design rules (dataviz skill): one hero number per view; one ratio against a limit is a meter, several are a meter list;
  // the meter track is a light step of the fill's own hue; color follows the entity (protein/fat/carbs, sports) and never
  // its rank; text stays in ink, the colored mark beside it carries identity; one filter row above everything it scopes;
  // every chart has a tap readout and a table view. Macro and sport hues are the app's sport palette, validated for CVD.
  let vd = null, period = 7, pick = null;
  const curDay = () => vd || todayStr();
  const fmt = n => Math.round(n).toLocaleString(TrainApp.lang() === 'ru' ? 'ru-RU' : 'en-GB');
  const MAC = () => [['p', L('Белки', 'Protein'), 'var(--bike)'], ['f', L('Жиры', 'Fat'), 'var(--run)'], ['c', L('Углеводы', 'Carbs'), 'var(--climb)']];
  function sessionsOn(date) {
    const dt = parseYmd(date), wk = ymd(mondayOf(dt)), di = (dt.getDay() + 6) % 7, week = TrainApp.state.weeks?.[wk];
    return (week?.sessions || []).map(x => effective(wk, x)).filter(x => x.day === di);
  }
  // A half-circle meter for one ratio against a limit (calories): the track is a light step of the fill's hue.
  function arc(e, t, w) {
    const pc = t ? Math.min(100, e / t * 100) : 0, over = t && e > t * 1.1;
    return `<svg class="arc" viewBox="0 0 120 64" width="${w}" aria-hidden="true"><path d="M10 60 A50 50 0 0 1 110 60" class="arc-tr" pathLength="100"/>${pc > 0.5 ? `<path d="M10 60 A50 50 0 0 1 110 60" class="arc-fg${over ? ' over' : ''}" pathLength="100" stroke-dasharray="${pc.toFixed(1)} 100"/>` : ''}</svg>`;
  }
  const meter = (name, e, t, hue, unit) => `<div class="mrow"><span class="mrow-n"><i style="background:${hue}"></i>${name}</span><span class="mrow-b" style="--h:${hue}"><i style="width:${Math.min(100, t ? e / t * 100 : 0).toFixed(1)}%" class="${t && e > t * 1.1 ? 'over' : ''}"></i></span><span class="mrow-v"><b>${fmt(e)}</b><span class="muted"> / ${fmt(t)}${unit}</span></span></div>`;
  // Three tabs at the top, for the person the add-on is on for.
  function tabs(cur) {
    if (!on()) return '';
    return `<div class="tabs3" role="tablist">${[['today', L('Сегодня', 'Today')], ['week', L('Неделя', 'Week')], ['food', L('Еда', 'Food')], ['stats', L('Анализ', 'Insights')]].map(([v, n]) => `<button role="tab" data-a="food-tab" data-v="${v}" aria-selected="${cur === v}">${n}</button>`).join('')}</div>`;
  }
  // On the Week tab: two lines — calories and protein against the day's target; a tap opens Food.
  function weekRow(wk, week, ti) {
    if (!on() || ti < 0 || ti > 6) return '';
    const T = targets(sessionsOn(todayStr())), E = eaten(F.log[todayStr()] || {});
    if (!T) return `<button class="nudge food-row" data-a="food-tab" data-v="food"><span>${L('Еда сегодня · впиши вес — покажу норму на день', 'Food today · add your weight for the day’s targets')}</span><span class="nudge-go">›</span></button>`;
    const line = (n, e, t, u, hue) => `<span class="wr-l"><span class="wr-n">${n}</span><span class="mrow-b" style="--h:${hue}"><i style="width:${Math.min(100, e / t * 100).toFixed(1)}%" class="${e > t * 1.1 ? 'over' : ''}"></i></span><span class="wr-v"><b>${fmt(e)}</b><span class="muted"> / ${fmt(t)}${u}</span></span></span>`;
    return `<button class="card food-wr" data-a="food-tab" data-v="food"><span class="wr-h"><b>${L('Еда сегодня', 'Food today')}</b><span class="nudge-go">›</span></span>${line(L('Калории', 'Calories'), E.kcal, T.kcal, '', 'var(--accent)')}${line(L('Белки', 'Protein'), E.p, T.p, L(' г', ' g'), 'var(--bike)')}</button>`;
  }

  const head = (cur, title, sub) => `<header class="nav"><div class="nav-row"><span></span><span class="nav-right"><button class="nav-btn icon-btn" data-a="settings" aria-label="${L('Настройки', 'Settings')}">${icon('gear', 22)}</button></span></div>${tabs(cur)}<h1>${title}<span class="sub">${esc(sub)}</span></h1></header>`;
  function screen(v) {
    if (!on()) { TrainApp.view.v = 'week'; return ''; }
    return v === 'stats' ? stats() : v === 'today' ? todayScreen() : dayScreen();
  }

  // ---------- «Еда»: the day ----------
  function dayScreen() {
    const date = curDay(), isToday = date === todayStr(), d = F.log[date] || {s: {}, p: [], m: []}, ss = sessionsOn(date);
    const T = targets(ss), E = eaten(d), dow = (parseYmd(date).getDay() + 6) % 7, supps = suppsFor(dow);
    const when = parseYmd(date).toLocaleDateString(L('ru-RU', 'en-GB'), {weekday: 'long', day: 'numeric', month: 'long'});
    let h = `<main class="screen food-screen">${head('food', L('Еда', 'Food'), when + (isToday ? L(' · сегодня', ' · today') : ''))}`;
    // the hero: one big number on a half-circle meter, then the three macros as a meter list
    if (T) {
      const left = T.kcal - Math.round(E.kcal);
      h += `<section class="card fh"><div class="fh-arc" role="img" aria-label="${L(`Калории: ${fmt(E.kcal)} из ${fmt(T.kcal)}`, `Calories: ${fmt(E.kcal)} of ${fmt(T.kcal)}`)}">${arc(E.kcal, T.kcal, 240)}
          <div class="fh-num"><b>${fmt(E.kcal)}</b><span class="muted">${L('из', 'of')} ${fmt(T.kcal)} ${L('ккал', 'kcal')}</span></div></div>
        <p class="fh-left${left < 0 ? ' over' : ''}">${left >= 0 ? L(`Осталось ${fmt(left)} ккал`, `${fmt(left)} kcal left`) : L(`На ${fmt(-left)} ккал больше нормы`, `${fmt(-left)} kcal over`)}</p>
        <div class="mlist">${MAC().map(([k, n, hue]) => meter(n, E[k], T[k], hue, L(' г', ' g'))).join('')}</div>
        <p class="hint fh-why">${T.min ? L(`День с тренировкой ${fDur(T.min)}: углеводы ${String(T.ck).replace('.', ',')} г/кг, белок 1,8, жиры 1 — на поддержание веса.`, `A ${fDur(T.min)} training day: carbs ${T.ck} g/kg, protein 1.8, fat 1 — for maintenance.`) : L('День отдыха: углеводы 3,5 г/кг, белок 1,8, жиры 1 — на поддержание веса.', 'Rest day: carbs 3.5 g/kg, protein 1.8, fat 1 — for maintenance.')}</p></section>`;
    } else h += `<section class="card fh"><label class="field">${L('Вес, кг — и покажу норму калорий и БЖУ на день', 'Weight, kg — for the day’s calorie and macro targets')}<input data-food="weight" type="number" inputmode="decimal" min="35" max="200" step="0.5" placeholder="75"></label></section>`;
    // fuel around the day's session
    const fuel = fuelFor(ss);
    if (fuel) h += `<section class="card ffuel"><div class="ffuel-h"><span class="muted">${L('Под тренировку', 'Around training')}</span><b>${esc(fuel.head)}</b></div>${fuel.lines.map(l => { const [k, ...r] = l.split(': '); return `<div class="ffuel-l"><span>${esc(k)}</span><p>${esc(r.join(': '))}</p></div>`; }).join('')}</section>`;
    // the log, with a strip of days to look back
    h += `<div class="section-title">${L('Лог', 'Log')}</div><div class="dstrip" role="tablist">`;
    for (let i = 0; i <= 13; i++) { // today first, then back in time
      const dd = ymd(addDays(parseYmd(todayStr()), -i)), t = targets(sessionsOn(dd)), e = eaten(F.log[dd] || {}), dt = parseYmd(dd);
      h += `<button class="dchip" role="tab" data-a="food-goto" data-d="${dd}" aria-selected="${dd === date}"><span>${i === 0 ? L('сег', 'tod') : DAYS()[(dt.getDay() + 6) % 7]}</span><b>${dt.getDate()}</b><i><em style="width:${t && e.kcal ? Math.min(100, e.kcal / t.kcal * 100).toFixed(0) : 0}%"></em></i></button>`;
    }
    h += `</div>`;
    if ((d.m || []).length) h += `<div class="list flog">${d.m.map((m, i) => `<div class="row frow"><span class="frow-t muted">${new Date(m.at).toLocaleTimeString(L('ru-RU', 'en-GB'), {hour: '2-digit', minute: '2-digit'})}</span><span class="t"><b>${esc(m.name)}</b><span>${L('Б', 'P')} ${m.p} · ${L('Ж', 'F')} ${m.f} · ${L('У', 'C')} ${m.c}${m.conf === 'low' ? L(' · оценка грубая', ' · rough estimate') : ''}${m.src === 'photo' ? L(' · по фото', ' · from a photo') : ''}</span></span><span class="v"><b>${fmt(m.kcal)}</b><span>${L('ккал', 'kcal')}</span></span><button class="nav-btn frow-x" data-a="food-m-del" data-i="${i}" aria-label="${L('Удалить', 'Delete')}">✕</button></div>`).join('')}</div>`;
    else h += `<div class="flog-empty"><b>${isToday ? L('Сегодня пока ничего', 'Nothing yet today') : L('За этот день записей нет', 'Nothing logged that day')}</b><span class="muted">${L('Сфоткай тарелку или опиши — кнопка «+ Еда» внизу.', 'Snap your plate or describe it — «+ Meal» below.')}</span></div>`;
    h += `<div class="quickp"><span class="muted">${L('Быстро: белок', 'Quick: protein')}</span>${[20, 30, 40].map(g => `<button class="chip" data-a="food-p" data-g="${g}">+${g} ${L('г', 'g')}</button>`).join('')}${(d.p || []).length ? `<button class="chip" data-a="food-p-undo" aria-label="${L('Отменить последнее', 'Undo last')}">↶</button>` : ''}</div>`;
    if (supps.length) h += `<div class="section-title">${L('Добавки', 'Supplements')} · ${supps.filter(x => d.s?.[x.id]).length}/${supps.length}</div><div class="supps">${supps.map(x => `<button class="supp" data-a="food-s" data-id="${esc(x.id)}" aria-pressed="${!!d.s?.[x.id]}"><span class="supp-ck">${d.s?.[x.id] ? '✓' : ''}</span><span><b>${esc(x.name)}</b>${x.dose ? `<span class="muted">${esc(x.dose)}</span>` : ''}</span></button>`).join('')}</div>`;
    return h + '</main>';
  }

  // ---------- «Сегодня»: sleep, the day's plan, food; after 21:00 by the phone's clock, the day's result ----------
  const hhmm = iso => iso ? new Date(iso).toLocaleTimeString(L('ru-RU', 'en-GB'), {hour: '2-digit', minute: '2-digit'}) : '';
  const durHM = min => `${Math.floor(min / 60)} ${L('ч', 'h')} ${String(min % 60).padStart(2, '0')} ${L('мин', 'min')}`;
  function todayScreen() {
    const date = todayStr(), now = new Date(), evening = now.getHours() >= 21;
    const ss = sessionsOn(date), T = targets(ss), d = F.log[date] || {s: {}, p: [], m: []}, E = eaten(d);
    const supps = suppsFor((now.getDay() + 6) % 7), suppDone = supps.filter(x => d.s?.[x.id]).length;
    const W = TrainApp.wellness, days = W?.days || [], w = days.find(x => x.date === date), past = days.filter(x => x.date < date);
    const avg = k => { const xs = past.map(x => x[k]).filter(v => v != null); return xs.length >= 3 ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
    const when = now.toLocaleDateString(L('ru-RU', 'en-GB'), {weekday: 'long', day: 'numeric', month: 'long'});
    let h = `<main class="screen today-screen">${head('today', L('Сегодня', 'Today'), when)}`;
    const planned = ss.filter(x => x.status === 'planned' || x.status === 'done'), done = ss.filter(x => x.status === 'done');
    const doneMin = done.reduce((t, x) => t + (x.act?.min ?? x.min), 0), planMin = planned.reduce((t, x) => t + x.min, 0);
    // tomorrow, for tonight's bedtime
    const tmr = ymd(addDays(parseYmd(date), 1)), next = sessionsOn(tmr).filter(x => x.status === 'planned').sort((a, b) => (a.start ?? 1e4) - (b.start ?? 1e4))[0];
    const bedtime = () => {
      if (!next) return L('Завтра без тренировки — обычный режим, 7–9 ч сна.', 'No session tomorrow — your usual 7–9 h of sleep.');
      const big = next.min >= 75 || KINDS[next.kind]?.hard || /_long$/.test(next.kind);
      if (next.start == null || next.start > 13 * 60) return L(`Завтра ${kName(next.kind).toLowerCase()} — 7–9 ч сна, без позднего тяжёлого ужина.`, `Tomorrow: ${kName(next.kind).toLowerCase()} — 7–9 h of sleep, no late heavy dinner.`);
      const bed = next.start - 60 - (big ? 8 : 7.5) * 60, hm2 = m => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
      return L(`Завтра в ${hm2(next.start)} ${kName(next.kind).toLowerCase()}${big ? ' — ключевая' : ''}: ляг до ${hm2(bed)}, чтобы спать ${big ? 8 : 7.5} ч.`, `Tomorrow at ${hm2(next.start)}: ${kName(next.kind).toLowerCase()}${big ? ', a key one' : ''} — in bed by ${hm2(bed)} for ${big ? 8 : 7.5} h of sleep.`);
    };
    // the day's result, after 21:00 — first, because the day is done
    if (evening) {
      const rows = [];
      if (planned.length) rows.push([L('Тренировки', 'Training'), done.length === planned.length ? L(`всё сделано · ${fDur(doneMin)}`, `all done · ${fDur(doneMin)}`) : L(`${done.length} из ${planned.length} · ${fDur(doneMin)} из ${fDur(planMin)}`, `${done.length} of ${planned.length} · ${fDur(doneMin)} of ${fDur(planMin)}`), done.length === planned.length]);
      else rows.push([L('Тренировки', 'Training'), L('день отдыха', 'rest day'), true]);
      if (T) {
        const kp = Math.round(E.kcal / T.kcal * 100), pp = Math.round(E.p / T.p * 100);
        rows.push([L('Калории', 'Calories'), `${fmt(E.kcal)} / ${fmt(T.kcal)} · ${kp}%`, kp >= 85 && kp <= 115]);
        rows.push([L('Белок', 'Protein'), `${fmt(E.p)} / ${T.p} ${L('г', 'g')} · ${pp}%`, pp >= 90]);
      }
      if (supps.length) rows.push([L('Добавки', 'Supplements'), `${suppDone}/${supps.length}`, suppDone === supps.length]);
      const ok = rows.filter(r => r[2]).length, miss = rows.filter(r => !r[2]).map(r => r[0].toLowerCase());
      const verdict = ok === rows.length ? L('Хороший день: всё по плану.', 'A good day: all on plan.') : L(`Добрать завтра: ${miss.join(', ')}.`, `To catch up tomorrow: ${miss.join(', ')}.`);
      h += `<section class="card tday-res"><div class="tday-eyebrow">${L('Итог дня', 'Day result')}</div><b class="tday-verdict">${esc(verdict)}</b>
        <div class="list">${rows.map(([n, v, good]) => `<div class="row"><span class="t"><b>${esc(n)}</b></span><span class="v"><b class="num">${esc(v)}</b></span><span class="tday-mark ${good ? 'ok' : 'miss'}" aria-label="${good ? L('в норме', 'on target') : L('ниже плана', 'below plan')}">${good ? '✓' : '·'}</span></div>`).join('')}</div>
        <p class="hint tday-bed">${esc(bedtime())}</p></section>`;
    }
    // sleep and stress
    if (w && (w.sleepMin || w.sleepScore != null)) {
      const hv = avg('hrv'), rh = avg('rhr'), dHrv = hv && w.hrv ? Math.round((w.hrv / hv - 1) * 100) : null;
      const low = (w.readiness != null && w.readiness < 70) || (dHrv != null && dHrv <= -15);
      h += `<section class="card tday-sleep"><div class="tday-eyebrow">${L('Сон', 'Sleep')}${w.bed ? ` · ${hhmm(w.bed)}–${hhmm(w.wake)}` : ''}</div>
        <div class="tday-big"><b>${w.sleepMin ? durHM(w.sleepMin) : '—'}</b>${w.sleepScore != null ? `<span class="muted">${L('оценка', 'score')} ${w.sleepScore}</span>` : ''}</div>
        <div class="tday-stats">
          ${w.readiness != null ? `<div><span class="muted">${L('Готовность', 'Readiness')}</span><b class="num">${w.readiness}</b></div>` : ''}
          ${w.hrv != null ? `<div><span class="muted">HRV</span><b class="num">${w.hrv}</b>${dHrv != null ? `<span class="${dHrv < -10 ? 'down' : dHrv > 5 ? 'up' : 'muted'}">${dHrv > 0 ? '+' : ''}${dHrv}% ${L('к 2 нед.', 'vs 2 wk')}</span>` : ''}</div>` : ''}
          ${w.rhr != null ? `<div><span class="muted">${L('Пульс покоя', 'Resting HR')}</span><b class="num">${w.rhr}</b>${rh ? `<span class="muted">${L('обычно', 'usually')} ${Math.round(rh)}</span>` : ''}</div>` : ''}
          ${w.stressMin != null ? `<div><span class="muted">${L('Стресс днём', 'Daytime stress')}</span><b class="num">${fDur(w.stressMin)}</b><span class="muted">${L('восст.', 'recovery')} ${fDur(w.recoveryMin || 0)}</span></div>` : ''}
        </div>
        ${low ? `<p class="tday-warn">${L('Восстановление ниже обычного. Если сегодня тяжёлая — можно облегчить: держи пульс в «Лёгком» или сократи на треть.', 'Recovery is below usual. If today is a hard one, ease it: keep HR in Easy or cut it by a third.')}</p>` : ''}</section>`;
    } else if (TrainApp.cloud.me?.oura?.linked) {
      h += `<section class="card tday-sleep"><div class="tday-eyebrow">${L('Сон', 'Sleep')}</div><p class="hint">${W?.error ? L('Oura не ответила — попробую позже.', 'Oura didn’t answer — will retry.') : L('Данных за эту ночь ещё нет — открой приложение Oura, чтобы кольцо синхронизировалось.', 'No data for last night yet — open the Oura app so the ring syncs.')}</p></section>`;
    } else if (TrainApp.cloud.me?.oura?.available) {
      h += `<section class="card tday-sleep"><div class="tday-eyebrow">${L('Сон и стресс', 'Sleep and stress')}</div><p class="hint">${L('Подключи Oura — здесь будут сон, HRV, пульс покоя и стресс за день.', 'Connect Oura for sleep, HRV, resting HR and daytime stress here.')}</p><button class="btn quiet" data-a="oura">${L('Подключить Oura', 'Connect Oura')}</button></section>`;
    }
    // the day's plan
    h += `<section class="card tday-plan"><div class="tday-eyebrow">${L('План', 'Plan')}</div>`;
    if (planned.length) h += `<div class="list">${planned.sort((a, b) => (a.start ?? 1e4) - (b.start ?? 1e4)).map(x => `<div class="row"><span class="t"><b><span class="dot ${KINDS[x.kind].sport}"></span> ${esc(kName(x.kind))}</b>${x.detail ? `<span>${esc(TrainApp.hrText ? TrainApp.hrText(x.detail) : x.detail)}</span>` : ''}</span><span class="v num"><b>${x.status === 'done' ? '✓' : x.start != null ? `${String(Math.floor(x.start / 60)).padStart(2, '0')}:${String(x.start % 60).padStart(2, '0')}` : ''}</b><span>${fDur(x.status === 'done' ? (x.act?.min ?? x.min) : x.min)}</span></span></div>`).join('')}</div>`;
    else h += `<p class="hint">${L('День отдыха.', 'Rest day.')}${next ? ' ' + L(`Завтра — ${kName(next.kind).toLowerCase()}.`, `Tomorrow: ${kName(next.kind).toLowerCase()}.`) : ''}</p>`;
    h += `<button class="btn link" data-a="food-tab" data-v="week">${L('Открыть неделю', 'Open the week')} ›</button></section>`;
    // food
    h += `<section class="card tday-food"><div class="tday-eyebrow">${L('Еда', 'Food')}</div>`;
    if (T) h += `<div class="mlist">${meter(L('Калории', 'Calories'), E.kcal, T.kcal, 'var(--accent)', '')}${meter(L('Белки', 'Protein'), E.p, T.p, 'var(--bike)', L(' г', ' g'))}</div>`;
    else h += `<p class="hint">${L('Впиши вес на вкладке «Еда» — покажу норму.', 'Add your weight on the Food tab for targets.')}</p>`;
    if (supps.length) h += `<p class="hint" style="margin:10px 0 0">${L('Добавки', 'Supplements')}: ${suppDone}/${supps.length}${suppDone < supps.length ? ' — ' + esc(supps.filter(x => !d.s?.[x.id]).map(x => x.name).join(', ')) : ' ✓'}</p>`;
    h += `<button class="btn link" data-a="food-tab" data-v="food">${L('Открыть еду', 'Open food')} ›</button></section>`;
    if (!evening) h += `<p class="hint tday-later">${L('После 21:00 здесь появится итог дня.', 'After 21:00 the day’s result shows up here.')}</p>`;
    return h + '</main>';
  }

  // ---------- «Анализ»: food and training over 7 / 30 / 90 days ----------
  function buckets(days) {
    // 7 and 30 days go day by day; 90 goes week by week (Mon–Sun)
    const end = parseYmd(todayStr()), out = [];
    if (days <= 30) for (let i = days - 1; i >= 0; i--) { const dt = addDays(end, -i), k = ymd(dt); out.push({from: k, to: k, label: days === 7 ? DAYS()[(dt.getDay() + 6) % 7] : String(dt.getDate()), long: dt.toLocaleDateString(L('ru-RU', 'en-GB'), {weekday: 'short', day: 'numeric', month: 'short'})}); }
    else { let m = mondayOf(addDays(end, -days + 1)); while (m <= end) { const a = ymd(m), b = ymd(addDays(m, 6)); out.push({from: a, to: b, label: String(m.getDate()), long: L(`неделя с ${m.toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})}`, `week of ${m.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}`)}); m = addDays(m, 7); } }
    return out;
  }
  const datesIn = b => { const out = []; for (let d = parseYmd(b.from); ymd(d) <= b.to && ymd(d) <= todayStr(); d = addDays(d, 1)) out.push(ymd(d)); return out; };
  function stats() {
    const B = buckets(period), acts = (TrainApp.state.local?.acts?.list || []).filter(a => TrainApp.trainingSport(TrainApp.actSport(a)));
    const inB = (a, b) => { const d = a.start.slice(0, 10); return d >= b.from && d <= b.to; };
    // training: minutes by sport per bucket
    const SP = Object.keys(TrainApp.SPORTS), sport = B.map(b => { const o = {}; for (const a of acts) if (inB(a, b)) { const sp = TrainApp.actSport(a); o[sp] = (o[sp] || 0) + a.min; } return o; });
    const usedSp = SP.filter(sp => sport.some(o => o[sp]));
    const totMin = sport.reduce((t, o) => t + Object.values(o).reduce((a, b) => a + b, 0), 0);
    // food: per bucket, eaten and target (average per logged day in weekly buckets)
    const food = B.map(b => { let e = 0, t = 0, n = 0; for (const d of datesIn(b)) { const day = F.log[d]; if (!day || !((day.m || []).length || (day.p || []).length)) continue; const tg = targets(sessionsOn(d)); const ea = eaten(day); e += ea.kcal; t += tg?.kcal || 0; n++; } return {e: n ? e / n : 0, t: n ? t / n : 0, n}; });
    const logged = [], dayRows = [];
    for (const b of B) for (const d of datesIn(b)) { const day = F.log[d]; if (day && ((day.m || []).length || (day.p || []).length)) { const tg = targets(sessionsOn(d)), ea = eaten(day), ss = sessionsOn(d).filter(x => x.status === 'planned' || x.status === 'done'); logged.push(d); dayRows.push({d, ea, tg, train: ss.length > 0}); } }
    const avg = (rows, f) => rows.length ? rows.reduce((t, r) => t + f(r), 0) / rows.length : 0;
    const prevMin = acts.filter(a => { const d = a.start.slice(0, 10), s = ymd(addDays(parseYmd(todayStr()), -2 * period + 1)), e = ymd(addDays(parseYmd(todayStr()), -period)); return d >= s && d <= e; }).reduce((t, a) => t + a.min, 0);
    const protHit = dayRows.filter(r => r.tg && r.ea.p >= r.tg.p * 0.9).length;
    let h = `<main class="screen stats-screen">${head('stats', L('Анализ', 'Insights'), L(`последние ${period} дней`, `last ${period} days`))}
      <div class="seg" role="group" style="margin:4px 0 14px">${[7, 30, 90].map(p => `<button data-a="food-period" data-p="${p}" aria-pressed="${period === p}">${p} ${L('дней', 'days')}</button>`).join('')}</div>`;
    // KPI row: three stat tiles
    const dWeek = period / 7, delta = prevMin ? Math.round((totMin - prevMin) / prevMin * 100) : null;
    h += `<div class="kpis">
      <div class="kpi"><span class="muted">${L('Тренировки', 'Training')}</span><b>${TrainApp.fHours(totMin / dWeek)}</b><span class="muted">${L('в неделю', 'a week')}${delta != null ? ` · <span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}%</span>` : ''}</span></div>
      <div class="kpi"><span class="muted">${L('Калории', 'Calories')}</span><b>${dayRows.length ? Math.round(avg(dayRows, r => r.ea.kcal) / Math.max(1, avg(dayRows, r => r.tg?.kcal || 0)) * 100) + '%' : '—'}</b><span class="muted">${L('нормы в среднем', 'of target, avg')}</span></div>
      <div class="kpi"><span class="muted">${L('Белок', 'Protein')}</span><b>${dayRows.length ? `${protHit}/${dayRows.length}` : '—'}</b><span class="muted">${L('дней в норме', 'days on target')}</span></div></div>`;
    // load growth: hours per week for 8 weeks against the ceiling of rule 71 (+20% on the 4 weeks before; C, convention)
    {
      const mon = mondayOf(parseYmd(todayStr())), W = [];
      for (let i = 7; i >= 0; i--) { const a = ymd(addDays(mon, -7 * i)), b = ymd(addDays(mon, -7 * i + 6)); W.push({a, h: acts.filter(x => { const d = x.start.slice(0, 10); return d >= a && d <= b; }).reduce((t, x) => t + x.min, 0) / 60}); }
      const prev = W.slice(3, 7).map(w => w.h), base = prev.reduce((a, b) => a + b, 0) / 4, cur = W[7].h, ceil = base * 1.2;
      const lx = Math.max(1, ...W.map(w => w.h), ceil) * 1.12, pct = base ? Math.round((cur / base - 1) * 100) : null;
      const verdict = !base ? L('Мало истории за прошлые 4 недели — сравнивать не с чем.', 'Too little history in the last 4 weeks to compare.')
        : cur > ceil ? L(`Эта неделя: ${pct > 0 ? '+' : ''}${pct}% к среднему за 4 недели — выше правила (+10–20%). Риск перегрузки растёт.`, `This week: ${pct > 0 ? '+' : ''}${pct}% on the 4-week average — above the rule (+10–20%). Overload risk goes up.`)
        : pct < -30 ? L(`Эта неделя: ${pct}% к среднему за 4 недели (неделя ещё идёт). Возвращаясь, добавляй не больше 10–20% в неделю.`, `This week: ${pct}% on the 4-week average (the week isn’t over). Coming back, add no more than 10–20% a week.`)
        : L(`Эта неделя: ${pct > 0 ? '+' : ''}${pct}% к среднему за 4 недели — в пределах правила.`, `This week: ${pct > 0 ? '+' : ''}${pct}% on the 4-week average — within the rule.`);
      h += `<section class="card chart"><div class="chart-h"><b>${L('Рост нагрузки', 'Load growth')}</b><span class="muted">${L('часы в неделю · 8 недель', 'hours a week · 8 weeks')}</span></div>
        <div class="legend"><span><i style="background:var(--accent)"></i>${L('Часы', 'Hours')}</span><span><i class="tick"></i>${L('Потолок: +20% к 4 неделям', 'Ceiling: +20% on 4 weeks')}</span></div>
        <div class="bars" style="--n:8">${W.map((w, i) => `<div class="bcol"><span class="bone${i === 7 && base && w.h > ceil ? ' over' : ''}" style="height:${(w.h / lx * 100).toFixed(1)}%;${i < 7 ? 'opacity:.55' : ''}"></span>${i === 7 && base ? `<span class="btick" style="bottom:${(ceil / lx * 100).toFixed(1)}%"></span>` : ''}</div>`).join('')}</div>
        <div class="xax" style="--n:8">${W.map(w => `<span>${parseYmd(w.a).getDate()}</span>`).join('')}</div>
        <p class="readout">${verdict}</p>
        <details class="tview"><summary>${L('Таблицей', 'As a table')}</summary><table><tr><th>${L('Неделя с', 'Week of')}</th><th>${L('Часы', 'Hours')}</th></tr>${W.map(w => `<tr><td>${esc(parseYmd(w.a).toLocaleDateString(L('ru-RU', 'en-GB'), {day: 'numeric', month: 'short'}))}</td><td>${w.h.toFixed(1)}</td></tr>`).join('')}</table></details></section>`;
    }
    // training volume, stacked by sport
    const mx = Math.max(1, ...sport.map(o => Object.values(o).reduce((a, b) => a + b, 0)));
    h += `<section class="card chart"><div class="chart-h"><b>${L('Объём тренировок', 'Training volume')}</b><span class="muted">${period <= 30 ? L('минуты в день', 'minutes a day') : L('часы в неделю', 'hours a week')}</span></div>
      ${usedSp.length ? `<div class="legend">${usedSp.map(sp => `<span><i style="background:var(--${sp})"></i>${esc(L(TrainApp.SPORTS[sp][0], TrainApp.SPORTS[sp][1]))}</span>`).join('')}</div>` : ''}
      <div class="bars" style="--n:${B.length}">${B.map((b, i) => { const o = sport[i], tot = Object.values(o).reduce((a, c) => a + c, 0); return `<button class="bcol${pick === 'tr' + i ? ' on' : ''}" data-a="food-pick" data-k="tr${i}" aria-label="${esc(b.long)}: ${tot} ${L('мин', 'min')}"><span class="bstack" style="height:${(tot / mx * 100).toFixed(1)}%">${usedSp.filter(sp => o[sp]).map(sp => `<i style="flex:${o[sp]};background:var(--${sp})"></i>`).join('')}</span></button>`; }).join('')}</div>
      <div class="xax" style="--n:${B.length}">${B.map((b, i) => `<span>${period === 30 && i % 5 && i !== B.length - 1 ? '' : esc(b.label)}</span>`).join('')}</div>
      ${pick?.startsWith('tr') ? (() => { const i = +pick.slice(2), o = sport[i]; return `<p class="readout"><b>${esc(B[i].long)}</b> · ${Object.keys(o).length ? usedSp.filter(sp => o[sp]).map(sp => `${esc(L(TrainApp.SPORTS[sp][0], TrainApp.SPORTS[sp][1]))} ${fDur(o[sp])}`).join(', ') : L('отдых', 'rest')}</p>`; })() : `<p class="readout muted">${L('Нажми на столбик — покажу детали', 'Tap a bar for details')}</p>`}
      <details class="tview"><summary>${L('Таблицей', 'As a table')}</summary><table><tr><th></th>${usedSp.map(sp => `<th>${esc(L(TrainApp.SPORTS[sp][0], TrainApp.SPORTS[sp][1]))}</th>`).join('')}</tr>${B.map((b, i) => `<tr><td>${esc(b.long)}</td>${usedSp.map(sp => `<td>${sport[i][sp] || 0}</td>`).join('')}</tr>`).join('')}</table></details></section>`;
    // calories against the target
    if (F.weight) {
      const fx = Math.max(1, ...food.map(f => Math.max(f.e, f.t))) * 1.12;
      h += `<section class="card chart"><div class="chart-h"><b>${L('Калории и норма', 'Calories vs target')}</b><span class="muted">${period <= 30 ? L('ккал в день', 'kcal a day') : L('в среднем за день недели', 'daily average per week')}</span></div>
        <div class="legend"><span><i style="background:var(--accent)"></i>${L('Съедено', 'Eaten')}</span><span><i class="tick"></i>${L('Норма', 'Target')}</span></div>
        <div class="bars" style="--n:${B.length}">${B.map((b, i) => { const f = food[i]; return `<button class="bcol${pick === 'kc' + i ? ' on' : ''}" data-a="food-pick" data-k="kc${i}" aria-label="${esc(b.long)}: ${fmt(f.e)} / ${fmt(f.t)}">${f.n ? `<span class="bone${f.e > f.t * 1.1 ? ' over' : ''}" style="height:${(f.e / fx * 100).toFixed(1)}%"></span><span class="btick" style="bottom:${(f.t / fx * 100).toFixed(1)}%"></span>` : ''}</button>`; }).join('')}</div>
        <div class="xax" style="--n:${B.length}">${B.map((b, i) => `<span>${period === 30 && i % 5 && i !== B.length - 1 ? '' : esc(b.label)}</span>`).join('')}</div>
        ${pick?.startsWith('kc') ? (() => { const i = +pick.slice(2), f = food[i]; return `<p class="readout"><b>${esc(B[i].long)}</b> · ${f.n ? L(`${fmt(f.e)} из ${fmt(f.t)} ккал`, `${fmt(f.e)} of ${fmt(f.t)} kcal`) : L('нет записей', 'nothing logged')}</p>`; })() : `<p class="readout muted">${dayRows.length ? L(`Записано ${dayRows.length} из ${period} дней`, `${dayRows.length} of ${period} days logged`) : L('Пока нет записей за период', 'Nothing logged in this period')}</p>`}
        <details class="tview"><summary>${L('Таблицей', 'As a table')}</summary><table><tr><th></th><th>${L('Съедено', 'Eaten')}</th><th>${L('Норма', 'Target')}</th></tr>${B.map((b, i) => `<tr><td>${esc(b.long)}</td><td>${food[i].n ? fmt(food[i].e) : '—'}</td><td>${food[i].n ? fmt(food[i].t) : '—'}</td></tr>`).join('')}</table></details></section>`;
      // macros: averages against the average target, a meter list
      if (dayRows.length) {
        h += `<section class="card"><div class="chart-h"><b>${L('БЖУ в среднем', 'Macros, average')}</b><span class="muted">${L('на записанный день', 'per logged day')}</span></div><div class="mlist">${MAC().map(([k, n, hue]) => meter(n, avg(dayRows, r => r.ea[k]), Math.round(avg(dayRows, r => r.tg?.[k] || 0)), hue, L(' г', ' g'))).join('')}</div></section>`;
        // training days against rest days
        const tr = dayRows.filter(r => r.train), rs = dayRows.filter(r => !r.train);
        const cell = (rows, label) => rows.length ? `<div class="cmp"><span class="muted">${label} · ${rows.length}</span><b>${fmt(avg(rows, r => r.ea.kcal))}</b><span class="muted">${L('из', 'of')} ${fmt(avg(rows, r => r.tg?.kcal || 0))} ${L('ккал', 'kcal')}</span><span class="muted">${L('углеводы', 'carbs')} ${fmt(avg(rows, r => r.ea.c))} / ${fmt(avg(rows, r => r.tg?.c || 0))} ${L('г', 'g')}</span></div>` : `<div class="cmp"><span class="muted">${label}</span><b>—</b></div>`;
        h += `<section class="card"><div class="chart-h"><b>${L('Тренировка и отдых', 'Training vs rest days')}</b><span class="muted">${L('в среднем', 'average')}</span></div><div class="cmps">${cell(tr, L('Дни тренировок', 'Training days'))}${cell(rs, L('Дни отдыха', 'Rest days'))}</div>
          <p class="hint" style="margin:8px 0 0">${tr.length && avg(tr, r => r.ea.c) < avg(tr, r => r.tg?.c || 0) * 0.8 ? L('В дни тренировок углеводов заметно меньше нормы — это бьёт по качеству длинных и тяжёлых тренировок.', 'Carbs run well under target on training days — that costs long and hard sessions.') : L('Углеводы под нагрузку: в тренировочные дни норма выше.', 'Carbs follow the load: training days carry a higher target.')}</p></section>`;
      }
    } else h += `<section class="card"><label class="field">${L('Вес, кг — и появится аналитика по еде', 'Weight, kg — to unlock food insights')}<input data-food="weight" type="number" inputmode="decimal" min="35" max="200" step="0.5" placeholder="75"></label></section>`;
    return h + '</main>';
  }
  function settings() {
    if (!on()) return '';
    const D = DAYS();
    return `<div class="section-title">${L('Питание и добавки', 'Food and supplements')} <span class="muted" style="text-transform:none;letter-spacing:0">· ${L('только у тебя', 'only for you')}</span></div>
      <div class="wiz-row"><label class="field">${L('Вес, кг', 'Weight, kg')}<input data-food="weight" type="number" inputmode="decimal" min="35" max="200" step="0.5" value="${esc(F.weight || '')}" placeholder="75"></label></div>
      <div class="list">${F.supps.map((x, i) => `<div class="row"><span class="t"><b>${esc(x.name)}${x.dose ? ' · ' + esc(x.dose) : ''}</b><span>${x.days ? x.days.map(d => D[d]).join(', ') : L('каждый день', 'every day')}</span></span><button class="nav-btn" data-a="food-s-del" data-i="${i}" style="color:var(--danger)">${L('Убрать', 'Remove')}</button></div>`).join('')}</div>
      <form id="suppForm" class="wiz-row" style="padding-top:8px"><label class="field">${L('Добавка', 'Supplement')}<input id="suppName" placeholder="${L('Омега-3', 'Omega-3')}" maxlength="30" required></label><label class="field">${L('Доза', 'Dose')}<input id="suppDose" placeholder="1 г" maxlength="30"></label></form>
      <div class="stack"><button class="btn quiet" type="submit" form="suppForm">${L('Добавить', 'Add')}</button></div>`;
  }
  // The morning message: the day's supplements.
  function briefLine(dow) {
    if (!F.supps.length || !on()) return '';
    const sp = suppsFor(dow).map(x => x.name);
    return sp.length ? L(' · Добавки: ', ' · Supplements: ') + sp.join(', ') : '';
  }
  // Clicks and inputs; true when handled.
  function click(a, el) {
    if (a === 'food-p') { day(curDay()).p.push(+el.dataset.g); save(); return true; }
    if (a === 'food-p-undo') { day(curDay()).p.pop(); save(); return true; }
    if (a === 'food-s') { const d = day(curDay()), id = el.dataset.id; if (d.s[id]) delete d.s[id]; else d.s[id] = true; save(); return true; }
    if (a === 'food-tab') { TrainApp.view.v = ['today', 'food', 'stats'].includes(el.dataset.v) ? el.dataset.v : 'week'; vd = null; pick = null; render(); fabRender(); window.scrollTo(0, 0); return true; }
    if (a === 'food-goto') { vd = el.dataset.d === todayStr() ? null : el.dataset.d; render(); return true; }
    if (a === 'food-period') { period = +el.dataset.p; pick = null; render(); return true; }
    if (a === 'food-pick') { pick = pick === el.dataset.k ? null : el.dataset.k; render(); return true; }
    if (a === 'food-day') { const n = ymd(addDays(parseYmd(curDay()), +el.dataset.d)); vd = n >= todayStr() ? null : n; render(); return true; }
    if (a === 'food-rep') {
      const m = frequent(8)[+el.dataset.i]; if (!m) return true;
      const date = curDay();
      day(date).m.push({...m, at: date === todayStr() ? Date.now() : parseYmd(date).getTime() + 13 * 3600e3, src: 'repeat'});
      fabOpen = false; fabRender(); save();
      toast(L(`+${m.kcal} ккал · ${m.name}`, `+${m.kcal} kcal · ${m.name}`)); return true;
    }
    if (a === 'food-fab') { fabOpen = !fabOpen; fabRender(); if (fabOpen) setTimeout(() => $('#foodTextIn')?.focus(), 50); return true; }
    if (a === 'food-m-del') { day(curDay()).m.splice(+el.dataset.i, 1); save(); return true; }
    if (a === 'food-s-del') { F.supps.splice(+el.dataset.i, 1); save(); return true; }
    return false;
  }
  function change(el) {
    if (el.dataset?.food === 'photo' && el.files?.[0]) { shrink(el.files[0]).then(image => estimate({image})).catch(() => toast(L('Не открылось фото', 'Couldn’t open the photo'))); el.value = ''; return true; }
    if (el.dataset?.food !== 'weight') return false;
    const v = Math.round(+String(el.value).replace(',', '.') * 2) / 2; F.weight = v >= 35 && v <= 200 ? v : null; save(); return true;
  }
  document.addEventListener('submit', ev => {
    if (ev.target.id === 'foodText') { ev.preventDefault(); const t = (ev.target.querySelector('input')?.value || '').trim(); if (t) estimate({text: t}); return; }
    if (ev.target.id !== 'suppForm') return;
    ev.preventDefault();
    const name = ($('#suppName').value || '').trim(); if (!name) return;
    F.supps.push({id: 's' + Date.now().toString(36), name: name.slice(0, 30), dose: ($('#suppDose').value || '').trim().slice(0, 30), days: null});
    save();
  });
  const css = document.createElement('style');
  css.textContent = `.food-fab{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(var(--tab, 64px) + 16px + env(safe-area-inset-bottom,0px));z-index:6;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.food-fab-btn{min-height:52px;min-width:52px;padding:0 18px;border-radius:26px;background:var(--accent);color:var(--bg);font-weight:600;font-size:16px;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.food-fab-panel{background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:8px;width:min(320px,calc(100vw - 32px));box-shadow:0 10px 30px rgba(0,0,0,.3)}
.tabs3{display:grid;grid-template-columns:repeat(4,1fr);background:var(--fill);border-radius:12px;padding:3px;margin:6px 0 4px}
.tabs3 button{min-height:36px;border-radius:9px;font-size:15px;font-weight:600;color:var(--ink-2)}
.tabs3 button[aria-selected="true"]{background:var(--bg);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.arc{display:block;overflow:visible}
.arc path{fill:none;stroke-width:9;stroke-linecap:round}
.arc-tr{stroke:color-mix(in srgb,var(--accent) 18%,var(--fill))}
.arc-fg{stroke:var(--accent);transition:stroke-dasharray .4s}
.arc-fg.over{stroke:var(--warn)}
.food-row .arc{flex:none}
.food-row .arc path{stroke-width:14}
.fh{padding:18px 16px 14px}
.fh-arc{position:relative;width:240px;margin:0 auto}
.fh-num{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;line-height:1.1}
.fh-num b{font-size:48px;font-weight:700;letter-spacing:-.02em}
.fh-num span{font-size:14px;margin-top:2px}
.fh-left{text-align:center;margin:10px 0 14px;font-weight:600;color:var(--accent)}
.fh-left.over{color:var(--warn)}
.mlist{display:flex;flex-direction:column;gap:12px}
.mrow{display:grid;grid-template-columns:96px 1fr 104px;gap:10px;align-items:center;font-size:15px}
.mrow-n{display:flex;align-items:center;gap:8px}
.mrow-n i{width:8px;height:8px;border-radius:50%;flex:none}
.mrow-b{height:8px;border-radius:4px;background:color-mix(in srgb,var(--h) 18%,var(--fill));overflow:hidden}
.mrow-b i{display:block;height:100%;border-radius:4px;background:var(--h);transition:width .4s}
.mrow-b i.over{background:var(--warn)}
.mrow-v{text-align:right;font-variant-numeric:tabular-nums}
.mrow-v .muted{font-size:13px}
.fh-why{margin:12px 0 0}
.ffuel-h{display:flex;flex-direction:column;gap:2px;margin-bottom:6px}
.ffuel-h b{font-size:17px}
.ffuel-l{display:grid;grid-template-columns:84px 1fr;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:14px}
.ffuel-l span{font-weight:600}
.ffuel-l p{margin:0;color:var(--ink-2)}
.dstrip{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}
.dstrip::-webkit-scrollbar{display:none}
.dchip{flex:none;width:48px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0 7px;border-radius:12px;background:var(--fill);font-size:12px;color:var(--ink-2)}
.dchip b{font-size:17px;color:var(--ink)}
.dchip i{width:26px;height:3px;border-radius:2px;background:var(--bg);overflow:hidden;margin-top:3px}
.dchip i em{display:block;height:100%;background:var(--accent)}
.dchip[aria-selected="true"]{background:var(--ink);color:var(--bg)}
.dchip[aria-selected="true"] b{color:var(--bg)}
.dchip[aria-selected="true"] i{background:color-mix(in srgb,var(--bg) 30%,transparent)}
.flog .frow{display:grid;grid-template-columns:44px 1fr auto 28px;gap:10px;align-items:center}
.frow-t{font-size:13px;font-variant-numeric:tabular-nums}
.frow .t span{white-space:normal}
.frow .v span{font-size:12px}
.frow-x{min-height:28px;padding:0;color:var(--muted);justify-content:center}
.flog-empty{display:flex;flex-direction:column;gap:4px;padding:18px;border:1.5px dashed var(--line);border-radius:14px;text-align:center}
.stats-screen{padding-bottom:60px}
.today-screen{padding-bottom:120px}.tday-eyebrow{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.tday-res{border:1.5px solid color-mix(in srgb,var(--accent) 40%,transparent)}.tday-verdict{display:block;font-size:18px;margin-bottom:6px}
.tday-mark{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex:none}.tday-mark.ok{background:var(--accent);color:var(--accent-ink)}.tday-mark.miss{background:var(--bg);color:var(--muted)}
.tday-res .row{gap:10px}.tday-bed{margin:10px 0 0}
.tday-big{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}.tday-big b{font-size:40px;letter-spacing:-.02em}
.tday-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.tday-stats>div{background:var(--bg);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;font-size:12px}
.tday-stats b{font-size:20px}.tday-stats .up{color:var(--accent)}.tday-stats .down{color:var(--warn)}
.tday-warn{margin:12px 0 0;font-size:14px;color:var(--warn)}.tday-plan .btn.link,.tday-food .btn.link{margin-top:6px;justify-content:flex-start;padding-left:0}
.tday-later{text-align:center;margin:16px 0}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px}
.kpi{background:var(--fill);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:2px;font-size:12px;min-width:0}
.kpi b{font-size:24px;line-height:1.2}
.kpi .up{color:var(--accent)}
.kpi .down{color:var(--warn)}
.chart{padding:14px 14px 10px}
.chart-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}
.chart-h .muted{font-size:12px}
.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-2);margin-bottom:10px}
.legend span{display:flex;align-items:center;gap:6px}
.legend i{width:10px;height:10px;border-radius:3px}
.legend i.tick{height:2px;width:12px;background:var(--ink);border-radius:1px}
.bars{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:2px;height:132px;align-items:end;border-bottom:1px solid var(--line)}
.bcol{position:relative;height:100%;width:100%;display:flex;align-items:flex-end;justify-content:center;padding:0 1px;min-width:0;min-height:0;border-radius:0}
.bcol.on{background:color-mix(in srgb,var(--ink) 6%,transparent);border-radius:6px 6px 0 0}
.bstack{display:flex;flex-direction:column-reverse;gap:2px;flex:0 0 auto;width:min(26px,100%);border-radius:4px 4px 0 0;overflow:hidden}
.bstack i{display:block;min-height:2px}
.bone{flex:0 0 auto;width:min(26px,100%);background:var(--accent);border-radius:4px 4px 0 0}
.bone.over{background:var(--warn)}
.btick{position:absolute;left:12%;right:12%;height:2px;background:var(--ink);opacity:.7;border-radius:1px}
.xax{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:2px;font-size:11px;color:var(--muted);text-align:center;margin-top:4px;font-variant-numeric:tabular-nums}
.readout{font-size:13px;margin:10px 0 0;min-height:18px}
.tview{margin-top:8px;font-size:13px}
.tview summary{color:var(--muted);cursor:pointer}
.tview table{width:100%;border-collapse:collapse;margin-top:6px;font-variant-numeric:tabular-nums}
.tview th,.tview td{text-align:right;padding:4px 6px;border-bottom:1px solid var(--line)}
.tview th:first-child,.tview td:first-child{text-align:left}
.cmps{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cmp{background:var(--bg);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:2px;font-size:12px}
.cmp b{font-size:22px}
.food-fab.low{bottom:calc(20px + env(safe-area-inset-bottom,0px))}
.food-wr{display:flex;flex-direction:column;gap:10px;width:100%;text-align:left;padding:14px 16px}.wr-h{display:flex;justify-content:space-between;align-items:center}.wr-l{display:grid;grid-template-columns:76px 1fr 112px;gap:10px;align-items:center;font-size:14px}.wr-v{text-align:right;font-variant-numeric:tabular-nums}.wr-v .muted{font-size:12px}
.food-row{gap:10px}
.food-row>span:nth-child(2){flex:1}
.fuel-l{display:grid;grid-template-columns:84px 1fr;gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:14px}
.fuel-l span{font-weight:600}
.fuel-l p{margin:0;color:var(--ink-2)}
.quickp{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:12px 0 4px;font-size:14px}
.quickp .chip{min-height:34px;padding:6px 12px}
.supps{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.supp{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--fill);text-align:left}
.supp>span:last-child{display:flex;flex-direction:column;font-size:14px}
.supp .muted{font-size:12px}
.supp-ck{width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex:none}
.supp[aria-pressed="true"] .supp-ck{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.rep-h{font-size:13px}.rep{display:flex;flex-wrap:wrap;gap:6px;max-height:132px;overflow:auto}.rep .chip{min-height:34px;padding:6px 12px;font-size:14px}.rep .chip .muted{font-size:12px}
.food-text{display:flex;gap:6px}
.food-text input{flex:1;min-width:0}
.food-text .btn{width:auto;padding:0 16px}`;
  document.head.appendChild(css);
  // A floating «Log a meal» button, bottom right above the command bar: camera, or a line of text.
  const fab = document.createElement('div');
  fab.className = 'food-fab'; fab.hidden = true;
  document.body.appendChild(fab);
  let fabOpen = false;
  // The meals eaten most often over 30 days (by name), most recent copy of each — for «Повторить».
  // In a workout's report: carbs eaten in the 3 h before it and during it, against the fuel rules
  // (106: 30–60 g an hour from ~75 min, up to 90 past 2.5 h; a carb meal 2–3 h before). Only meals with a time count.
  function workoutFuel(S, base) {
    if (!on()) return '';
    const startS = String(S?.start || base?.start || ''); if (!startS) return '';
    const t0 = new Date(startS.replace(' ', 'T')).getTime(), dur = (S?.dur || (base?.min || 0) * 60) * 1000; if (!t0 || !dur) return '';
    const date = startS.slice(0, 10), meals = [...(F.log[date]?.m || []), ...(F.log[ymd(addDays(parseYmd(date), -1))]?.m || [])];
    const before = meals.filter(m => m.at >= t0 - 3 * 3600e3 && m.at < t0), during = meals.filter(m => m.at >= t0 && m.at <= t0 + dur);
    const cb = before.reduce((a, m) => a + (m.c || 0), 0), cd = during.reduce((a, m) => a + (m.c || 0), 0), min = dur / 6e4;
    if (min < 60 && !before.length && !during.length) return '';
    const hi = min >= 150 ? 90 : 60, h = Math.max(0, min / 60 - 0.5), need = min >= 75 ? [Math.round(30 * h / 5) * 5, Math.round(hi * h / 5) * 5] : null;
    const lines = [L(`До (за 3 ч): ${before.length ? `${fmt(cb)} г углеводов — ${esc(before.map(m => m.name).join(', ').slice(0, 60))}` : 'ничего не записано'}`, `Before (3 h): ${before.length ? `${fmt(cb)} g carbs — ${esc(before.map(m => m.name).join(', ').slice(0, 60))}` : 'nothing logged'}`)];
    if (need) lines.push(L(`Во время: ${fmt(cd)} г из нужных ${need[0]}–${need[1]} г${cd < need[0] ? ' — мало, на длинных это бьёт по второй половине' : ''}`, `During: ${fmt(cd)} g of the ${need[0]}–${need[1]} g needed${cd < need[0] ? ' — too little; on long ones that costs the second half' : ''}`));
    else if (during.length) lines.push(L(`Во время: ${fmt(cd)} г углеводов`, `During: ${fmt(cd)} g carbs`));
    return `<div class="section-title">${L('Питание вокруг тренировки', 'Fuel around it')}</div><ul class="plan-why">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
  }
  function frequent(n) {
    const since = ymd(addDays(parseYmd(todayStr()), -30)), by = new Map();
    for (const [d, day] of Object.entries(F.log)) if (d >= since) for (const m of day.m || []) {
      const k = m.name.toLowerCase(), c = by.get(k);
      if (!c) by.set(k, {m, n: 1}); else { c.n++; if (m.at > c.m.at) c.m = m; }
    }
    return [...by.values()].sort((a, b) => b.n - a.n || b.m.at - a.m.at).slice(0, n).map(x => x.m);
  }
  function fabRender() {
    fab.hidden = !on() || !!document.querySelector('.settings') || TrainApp.view.v === 'stats';
    fab.classList.toggle('low', !!$('#cmd')?.hidden);
    const rep = fabOpen ? frequent(8) : [];
    fab.innerHTML = fabOpen ? `<div class="food-fab-panel">${rep.length ? `<div class="rep-h muted">${L('Повторить', 'Again')}</div><div class="rep">${rep.map((m, i) => `<button class="chip" data-a="food-rep" data-i="${i}">${esc(m.name.length > 28 ? m.name.slice(0, 27) + '…' : m.name)} <span class="muted num">${fmt(m.kcal)}</span></button>`).join('')}</div>` : ''}<label class="btn primary">${L('Сфоткать', 'Take a photo')}<input type="file" accept="image/*" capture="environment" data-food="photo" hidden></label>
      <form id="foodText" class="food-text"><input id="foodTextIn" placeholder="${L('или опиши: творог 200 г', 'or describe: 200 g cottage cheese')}" maxlength="300"><button class="btn quiet" type="submit">OK</button></form></div>
      <button class="food-fab-btn" data-a="food-fab" aria-label="${L('Закрыть', 'Close')}">✕</button>`
      : `<button class="food-fab-btn" data-a="food-fab">${busy.on ? L('Считаю…', 'Estimating…') : L('+ Еда', '+ Meal')}</button>`;
  }
  // The account (and with it the admin flag) arrives after the first paint: redraw once it does, so the tabs show at launch.
  let wasOn = false, opened = false;
  setInterval(() => {
    if (!pulled && cloud.user && cloud.me) pull();
    if (on() !== wasOn) { wasOn = on(); if (wasOn && !opened && TrainApp.view.v === 'week') { TrainApp.view.v = 'today'; TrainApp.loadWellness?.(); } opened = true; render(); }
    const want = on() && !document.querySelector('.settings') && TrainApp.view.v !== 'stats'; if (fab.hidden === want) fabRender();
  }, 400);
  window.TrainFood = {weekRow, screen, tabs, settings, workoutFuel, briefLine, click, change, fabRender, get data() { return F; }};
  render();
})();
