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
  const {L, esc, kName, KINDS, fDur, effective, todayStr, DAYS, render, $, cloud, toast} = window.TrainApp;
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
    busy.on = true; render();
    try {
      const {data, error} = await cloud.client.functions.invoke('train-food', {body});
      let err = null; if (error) { try { err = (await error.context?.json?.())?.error; } catch {} err = err || 'unavailable'; }
      if (err || !data?.items) { toast(err === 'limit' ? L('Лимит ассистента на сегодня исчерпан', 'Today’s assistant limit is used up') : L('Не получилось посчитать — попробуй ещё раз', 'Couldn’t estimate — try again')); return; }
      if (!data.items.length) { toast(data.comment || L('Не похоже на еду', 'Doesn’t look like food')); return; }
      day(todayStr()).m.push({at: Date.now(), name: data.items.map(x => x.name).join(', ').slice(0, 80), items: data.items, ...data.total, note: data.comment, conf: data.confidence, src: body.image ? 'photo' : 'text'});
      save();
      toast(L(`+${data.total.kcal} ккал · Б ${data.total.p} · Ж ${data.total.f} · У ${data.total.c}`, `+${data.total.kcal} kcal · P ${data.total.p} · F ${data.total.f} · C ${data.total.c}`));
    } finally { busy.on = false; render(); }
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
  setInterval(() => { if (!pulled && cloud.user && cloud.me) pull(); }, 2000);
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

  function card(wk, week, ti) {
    if (!on() || ti < 0 || ti > 6) return '';
    const d = F.log[todayStr()] || {s: {}, p: []}, supps = suppsFor((new Date().getDay() + 6) % 7);
    const fuel = fuelFor((week?.sessions || []).map(x => effective(wk, x)).filter(x => x.day === ti));
    const today = (week?.sessions || []).map(x => effective(wk, x)).filter(x => x.day === ti), T = targets(today), E = eaten(d);
    const prot = E.p, tgt = F.weight ? [Math.round(F.weight * 1.6), Math.round(F.weight * 2)] : null;
    let h = `<section class="card food-card"><div class="food-h"><b>${L('Питание сегодня', 'Food today')}</b>${supps.length ? `<span class="muted num">${L('добавки', 'supps')} ${supps.filter(x => d.s[x.id]).length}/${supps.length}</span>` : ''}</div>`;
    if (T) {
      const row = (n, e, t, u) => `<div class="kbju-row"><span>${n}</span><span class="kbju-bar"><i style="width:${Math.min(100, Math.round(e / t * 100))}%" class="${e > t * 1.1 ? 'over' : ''}"></i></span><span class="num">${Math.round(e)}<span class="muted"> / ${t}${u}</span></span></div>`;
      h += `<div class="kbju">${row(L('Ккал', 'kcal'), E.kcal, T.kcal, '')}${row(L('Белки', 'Protein'), E.p, T.p, L(' г', ' g'))}${row(L('Жиры', 'Fat'), E.f, T.f, L(' г', ' g'))}${row(L('Углеводы', 'Carbs'), E.c, T.c, L(' г', ' g'))}</div>
        <p class="hint kbju-why">${T.min ? L(`План на день с тренировкой ${fDur(T.min)} (~${T.burn} ккал на ней): углеводы ${T.ck} г/кг, белок 1,8 г/кг, жиры 1 г/кг.`, `Today’s plan with ${fDur(T.min)} of training (~${T.burn} kcal): carbs ${T.ck} g/kg, protein 1.8 g/kg, fat 1 g/kg.`) : L('День отдыха: углеводы 3,5 г/кг, белок 1,8 г/кг, жиры 1 г/кг.', 'Rest day: carbs 3.5 g/kg, protein 1.8 g/kg, fat 1 g/kg.')} ${L('Это поддержание веса, не дефицит.', 'This is maintenance, not a deficit.')}</p>`;
    }
    h += `<div class="food-log"><label class="btn quiet food-photo">${busy.on ? L('Считаю…', 'Estimating…') : L('Сфоткать еду', 'Snap a meal')}<input type="file" accept="image/*" capture="environment" data-food="photo" hidden ${busy.on ? 'disabled' : ''}></label>
      <form id="foodText" class="food-text"><input id="foodTextIn" placeholder="${L('или опиши: творог 200 г и банан', 'or describe: 200 g cottage cheese and a banana')}" maxlength="300" ${busy.on ? 'disabled' : ''}><button class="btn quiet" type="submit" ${busy.on ? 'disabled' : ''}>OK</button></form></div>`;
    if ((d.m || []).length) h += `<ul class="food-meals">${d.m.map((m, i) => `<li><span><b>${esc(m.name)}</b><span class="muted num"> · ${m.kcal} ${L('ккал', 'kcal')} · Б${m.p} Ж${m.f} У${m.c}${m.conf === 'low' ? L(' · грубо', ' · rough') : ''}</span>${m.note ? `<span class="muted food-note">${esc(m.note)}</span>` : ''}</span><button class="nav-btn" data-a="food-m-del" data-i="${i}" aria-label="${L('Удалить', 'Delete')}">✕</button></li>`).join('')}</ul>`;
    if (fuel) h += `<div class="food-fuel"><span class="muted">${esc(fuel.head)}</span>${fuel.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
    h += `<div class="food-prot"><span>${T ? L('Быстро добавить белок', 'Quick add protein') : `${L('Белок', 'Protein')} <b class="num">${prot} ${L('г', 'g')}</b>${tgt ? `<span class="muted num"> / ${tgt[0]}–${tgt[1]}</span>` : ''}`}</span><span class="food-add">${[20, 30, 40].map(g => `<button class="chip" data-a="food-p" data-g="${g}">+${g}</button>`).join('')}${d.p.length ? `<button class="chip" data-a="food-p-undo" aria-label="${L('Отменить последнее', 'Undo last')}">↶</button>` : ''}</span></div>`;
    if (T) {} else if (tgt) h += `<div class="food-bar"><i style="width:${Math.min(100, Math.round(prot / tgt[0] * 100))}%"></i></div>`;
    else h += `<p class="hint" style="margin:4px 0 0">${L('Впиши вес в настройках — покажу цель по белку (1,6–2 г/кг).', 'Add your weight in settings for a protein target (1.6–2 g/kg).')}</p>`;
    if (supps.length) h += `<div class="chips-row wrap">${supps.map(x => `<button class="chip" data-a="food-s" data-id="${esc(x.id)}" aria-pressed="${!!d.s[x.id]}">${d.s[x.id] ? '✓ ' : ''}${esc(x.name)}${x.dose ? ` · ${esc(x.dose)}` : ''}</button>`).join('')}</div>`;
    return h + '</section>';
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
    if (a === 'food-p') { day(todayStr()).p.push(+el.dataset.g); save(); return true; }
    if (a === 'food-p-undo') { day(todayStr()).p.pop(); save(); return true; }
    if (a === 'food-s') { const d = day(todayStr()), id = el.dataset.id; if (d.s[id]) delete d.s[id]; else d.s[id] = true; save(); return true; }
    if (a === 'food-m-del') { day(todayStr()).m.splice(+el.dataset.i, 1); save(); return true; }
    if (a === 'food-s-del') { F.supps.splice(+el.dataset.i, 1); save(); return true; }
    return false;
  }
  function change(el) {
    if (el.dataset?.food === 'photo' && el.files?.[0]) { shrink(el.files[0]).then(image => estimate({image})).catch(() => toast(L('Не открылось фото', 'Couldn’t open the photo'))); el.value = ''; return true; }
    if (el.dataset?.food !== 'weight') return false;
    const v = Math.round(+String(el.value).replace(',', '.') * 2) / 2; F.weight = v >= 35 && v <= 200 ? v : null; save(); return true;
  }
  document.addEventListener('submit', ev => {
    if (ev.target.id === 'foodText') { ev.preventDefault(); const t = ($('#foodTextIn').value || '').trim(); if (t) estimate({text: t}); return; }
    if (ev.target.id !== 'suppForm') return;
    ev.preventDefault();
    const name = ($('#suppName').value || '').trim(); if (!name) return;
    F.supps.push({id: 's' + Date.now().toString(36), name: name.slice(0, 30), dose: ($('#suppDose').value || '').trim().slice(0, 30), days: null});
    save();
  });
  const css = document.createElement('style');
  css.textContent = `.food-card{padding:14px 16px}.food-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.food-fuel{font-size:14px;margin:0 0 10px}.food-fuel p{margin:3px 0 0;color:var(--ink-2)}
.food-prot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:15px}
.food-add{display:flex;gap:6px}.food-add .chip{min-height:34px;padding:6px 12px;background:var(--bg)}
.food-bar{height:6px;border-radius:3px;background:var(--bg);margin:8px 0 4px;overflow:hidden}.food-bar i{display:block;height:100%;background:var(--accent);border-radius:3px}
.food-card .chips-row{padding-bottom:0}
.kbju{display:flex;flex-direction:column;gap:6px;margin:4px 0 6px}.kbju-row{display:grid;grid-template-columns:80px 1fr 96px;gap:8px;align-items:center;font-size:14px}
.kbju-row>span:last-child{text-align:right}.kbju-bar{height:6px;border-radius:3px;background:var(--bg);overflow:hidden}.kbju-bar i{display:block;height:100%;background:var(--accent);border-radius:3px}.kbju-bar i.over{background:var(--warn)}
.kbju-why{margin:2px 0 10px}.food-log{display:flex;flex-direction:column;gap:8px;margin:6px 0 8px}.food-photo{position:relative}
.food-text{display:flex;gap:6px}.food-text input{flex:1;min-width:0}.food-text .btn{width:auto;padding:0 16px}
.food-meals{list-style:none;padding:0;margin:4px 0 10px;font-size:14px}.food-meals li{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
.food-meals li>span{display:flex;flex-direction:column}.food-note{font-size:13px}.food-card .chip{background:var(--bg)}.food-card .chip[aria-pressed="true"]{background:var(--ink);color:var(--bg)}`;
  document.head.appendChild(css);
  window.TrainFood = {card, settings, briefLine, click, change, get data() { return F; }};
  render();
})();
