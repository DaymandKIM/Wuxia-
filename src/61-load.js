/* ── 로딩 화면 (v2.95.6) ────────────────────────────────────
   본진 진입에만 있던 두루마리 화면(v2.94.7)을 **게임 시작 · 사냥터 이동 · 본진 진입** 공용으로 올린다.
   두 가지가 달라졌다 (사용자: "로딩바가 다 끝나면 화면 넘어가자 · 그 스타일이면 시작할 때랑 지역 넘어갈 때도"):
   1. 바가 **진짜 로딩**을 잰다 — 그 장면이 쓸 IMG 키가 몇 장이나 decode 됐는지. 옛 판은 1.7초를 그냥 셌다.
   2. **바가 다 차야 걷힌다** — 옛 판은 끝나기 0.45초 전부터 걷혀서 바가 차기도 전에 화면이 드러났다.
   화면이 없는 자리(sim·테스트)에선 아무것도 안 하고 then() 만 바로 부른다.
   숫자·문구는 00-data 의 LOADSCR. */
let loadOn = false, loadStart = 0, loadFadeT = 0, loadKeys = [], loadCB = null;
const loadEl = ()=> (typeof $ === 'function' && $('hqload')) || null;
const loadNow = ()=> Date.now() / 1000;

// 그 구역이 쓰는 그림 목록 — 원경·바닥·소품·몹 스트립·보스 초상
function zoneLoadKeys(zk){
  const out = [], seen = {};
  const push = k => { if (k && !seen['#' + k] && typeof ASSET !== 'undefined' && ASSET[k]){ seen['#' + k] = 1; out.push(k); } };
  push(BACKDROP.keys[zk]); push(GROUNDTEX.keys[zk]); push(BOSSFACE[zk]);
  const P = PROPS[zk]; if (P && P.kind === 'sprite') for (const p of P.pick) push(p[0]);
  const foes = (ZONEFOE[zk] || []).slice(); if (ZONEBOSS[zk]) foes.push(ZONEBOSS[zk]);
  for (const fk of foes){
    const F = FOES[fk]; if (!F || F.heroStrip || seen[fk]) continue; seen[fk] = 1;
    for (const a in F.anim) for (const f of F.anim[a]) push(fk + '_' + f);
  }
  return out;
}
// 준비된 비율 (0~1) — 목록이 비면 1
function loadReady(){
  if (!loadKeys.length) return 1;
  let n = 0;
  for (const k of loadKeys){ const im = IMG[k]; if (im && im.complete && im.naturalWidth) n++; }
  return n / loadKeys.length;
}
/* 로딩 화면을 띄운다.
   o = { art, ink, frame, han, name, tip, color, keys, then } — then 은 **바가 다 찬 순간** 불린다. */
function showLoad(o){
  o = o || {};
  const el = loadEl();
  if (!el){ if (o.then) o.then(); return false; }
  const im = $('hqart'); if (im){ if (o.art){ im.src = o.art; im.hidden = false; } else im.hidden = true; }
  const fr = $('hqframe'); if (fr){ if (o.frame){ fr.src = o.frame; fr.hidden = false; } else fr.hidden = true; }
  const ik = $('hqink'); if (ik){ if (o.ink){ ik.src = o.ink; ik.hidden = false; } else ik.hidden = true; }
  const nm = $('hqname'); if (nm) nm.textContent = o.name || '';
  const hz = $('hqhan'); if (hz) hz.textContent = o.han || '';
  const tp = $('hqtip'); if (tp) tp.textContent = o.tip || '';
  const bar = $('hqbar'); if (bar) bar.style.width = '0%';
  if (o.color && el.style && el.style.setProperty) el.style.setProperty('--hqc', o.color);   // sim 의 DOM 스텁엔 setProperty 가 없다
  el.hidden = false; el.classList.remove('gone');
  loadKeys = o.keys || []; loadCB = o.then || null;
  loadStart = loadNow(); loadFadeT = 0; loadOn = true;
  return true;
}
// 매 프레임 (60-ui hud) — 바를 채우고, 다 차면 then() 을 부른 뒤 걷는다
function loadStep(dt){
  if (!loadOn) return;
  const el = loadEl(); if (!el){ loadOn = false; return; }
  if (loadFadeT > 0){                       // 걷히는 중
    loadFadeT -= dt;
    if (loadFadeT <= 0){ el.hidden = true; el.classList.remove('gone'); loadOn = false; }
    return;
  }
  const t = loadNow() - loadStart;
  let p = Math.min(1, t / LOADSCR.min);     // 최소로 머무는 시간
  p = Math.min(p, loadReady());             // 진짜 준비된 만큼
  if (t >= LOADSCR.max) p = 1;              // 안 오는 그림은 여기서 놓아 준다
  const bar = $('hqbar'); if (bar) bar.style.width = Math.round(p * 100) + '%';
  if (p < 1) return;
  if (loadCB){ const f = loadCB; loadCB = null; try{ f(); }catch(e){} }   // 바가 다 찬 순간 화면이 넘어간다
  el.classList.add('gone'); loadFadeT = LOADSCR.fade;
}
const loadBusy = ()=> loadOn;
// 바로 끝낸다 — then() 을 부르고 화면을 걷는다 (테스트·배속)
function loadSkip(){
  if (!loadOn) return false;
  const el = loadEl();
  if (loadCB){ const f = loadCB; loadCB = null; try{ f(); }catch(e){} }
  if (el){ el.hidden = true; el.classList.remove('gone'); }
  loadOn = false; loadFadeT = 0;
  return true;
}
const hqLoadStep = loadStep;   // 옛 이름 (v2.94.7 본진 전용이던 시절)
