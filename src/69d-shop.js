/* ── 상점 1층 — 영옥·보상형 광고·하루치 사다리 (v2.96) ──────────────
   설계 docs/설계-BM.md. 여기서 만드는 것은 **자리와 규칙**이다:
   영옥(둘째 재화) · 광고 자리별 하루 횟수 · "오늘 본 광고 수" 사다리 · 모의 대기 화면.
   실제 광고 SDK 는 아티팩트(iframe)에 못 붙으므로 adPlay() 한 곳만 스토어 빌드에서 갈아끼운다.

   지키는 선(무과금 곡선의 뼈): 영옥으로 **경지·무공 습득 조건·연마 상한·단계 진행**을 못 산다.
   광고 자리는 은자·배수만 주고, 영옥은 사다리 마지막 계단에서만 크게 준다. */

// 오늘 (현지 날짜) — 일자 리셋의 기준
function bmDay(){ const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
// 광고 기록 { d:날짜, n:오늘 본 수, s:{자리:횟수}, L:받은 계단 수 }
function adState(){
  if (!S.ad || S.ad.d !== bmDay()) S.ad = { d: bmDay(), n: 0, s: {}, L: 0 };
  return S.ad;
}
const adLeft = k => (BM.slots[k] ? Math.max(0, BM.slots[k].n - (adState().s[k] | 0)) : 0);
const adSeen = () => adState().n;

/* ── 영옥 ── */
function jadeAdd(n, why){
  n = Math.round(n); if (!(n > 0)) return 0;
  S.jade = (S.jade | 0) + n;
  if (why && typeof toast === 'function') toast(BM.jade + ' +' + fmt(n) + '\n' + why);
  return n;
}
function jadeSpend(n){ n = Math.round(n); if ((S.jade | 0) < n) return false; S.jade -= n; return true; }
// 오프라인 정산 몫 — 시간당 + 도달 구역 보정 (65-save offlineGains 가 부른다)
function jadeOffline(sec){
  const h = Math.max(0, sec) / 3600;
  return Math.floor(h * BM.gain.offPerHour * (1 + BM.gain.offZone * (S.zi | 0)));
}
// 업적 단계 t(0부터) 의 영옥
function jadeAchv(t){ return Math.min(BM.gain.achvCap, Math.ceil(BM.gain.achvBase * Math.pow(BM.gain.achvGrow, t | 0))); }

/* ── 광고 ── */
// 실제 재생 — 지금은 모의(3초 대기). 스토어 빌드에선 여기만 SDK 로 바꾼다.
let adT = 0, adCB = null;
function adPlay(then){
  if (!BM.adMock || typeof $ !== 'function' || !$('adv')){ if (then) then(); return; }
  adCB = then; adT = BM.adSec;
  $('advn').textContent = adT.toFixed(0);
  $('adv').classList.add('show');
}
// 매 프레임 (60-ui hud) — 모의 광고 카운트다운
function adStep(dt){
  if (adT <= 0) return;
  adT -= dt;
  const n = $('advn'); if (n) n.textContent = Math.max(1, Math.ceil(adT)).toFixed(0);
  if (adT > 0) return;
  const el = $('adv'); if (el) el.classList.remove('show');
  const f = adCB; adCB = null; if (f) try{ f(); }catch(e){}
}
const adBusy = () => adT > 0;
/* 자리에서 광고를 본다. 남은 횟수가 없으면 false.
   본 뒤 then() 이 불리고, "오늘 본 광고 수"가 올라 사다리 계단이 열린다. */
function adShow(k, then){
  if (!BM.slots[k] || adLeft(k) <= 0 || adBusy()) return false;
  adPlay(() => {
    const a = adState();
    a.s[k] = (a.s[k] | 0) + 1; a.n++;
    if (then) then();
    if (typeof shopHud === 'function') shopHud();
  });
  return true;
}

/* ── 하루치 사다리 — 카운터 하나에 계단 보상 ── */
const ladderDone = () => adState().L | 0;
// 지금 받을 수 있는 계단이 있나 (알림점)
function ladderReady(){ const a = adState(); const i = a.L | 0; return i < BM.ladder.length && a.n >= BM.ladder[i].n; }
// 다음 계단 하나를 받는다
function ladderClaim(){
  const a = adState(), i = a.L | 0, st = BM.ladder[i];
  if (!st || a.n < st.n) return null;
  a.L = i + 1;
  if (st.jade) jadeAdd(st.jade);
  if (st.frag && typeof hqFragGain === 'function'){
    const k = (S.hq || (typeof DUEL === 'object' && Object.keys(DUEL.art)[0]));
    if (k) hqFragGain(k, st.frag, true);
  }
  if (st.pts) S.ptsBonus = (S.ptsBonus | 0) + st.pts;
  if (st.box && typeof eqGain === 'function' && typeof newItem === 'function'){
    const it = newItem(S.zi | 0); if (it) eqGain(it.k, Math.max(BM.boxGrade, it.g), 1);
  }
  if (typeof toast === 'function') toast('광고 ' + st.n + '편 · ' + st.t);
  return st;
}


/* ── 장비 소환 (v2.96.1) ────────────────────────────────
   사용자 확정 "장비도 뽑기로 가는게 좋을듯". 지속 전투에는 매 판 능력을 고르는 순간이 없다 —
   그 순간을 **뽑고 · 보고 · 끼는** 자리에 만든다. 판을 멈춰 세우지 않으니 코어(자동 전투 구경)는 안 다친다.
   나온 것은 주머니로 들어가 기존 합성·강화·도감이 그대로 받는다. 처치 드랍은 그대로 — 뽑기는 속도를 판다. */
const pityLeft = () => Math.max(0, BM.summon.pity - (S.pity | 0));
// 한 번 굴린다 — 천장에 닿으면 영웅 이상으로 올린다
function summonRoll(){
  const sl = EQUIP.slots[Math.floor(Math.random() * EQUIP.slots.length)];
  const ks = eqKinds(sl); if (!ks.length) return null;
  const kind = ks[Math.floor(Math.random() * ks.length)][0];
  const w = BM.summon.w;
  let r = Math.random() * w.reduce((a, b) => a + b, 0), g = 0;
  for (let i = 0; i < w.length; i++){ r -= w[i]; if (r < 0){ g = i; break; } }
  if (pityLeft() <= 1) g = Math.max(g, BM.summon.pityG);        // 천장 — 이번이 마지막이면 영웅 이상
  S.pity = (g >= BM.summon.pityG) ? 0 : (S.pity | 0) + 1;       // 영웅 이상이 나오면 다시 센다
  return { k: kind, g };
}
/* n 번 뽑는다. 영옥이 모자라면 null.
   1회는 cost, 10연은 cost10 (낱개보다 싸다). 결과는 [{k,g,first}] — 화면이 그대로 늘어놓는다. */
function eqSummon(n){
  n = (n === BM.summon.n10) ? BM.summon.n10 : 1;
  const cost = n === 1 ? BM.summon.cost : BM.summon.cost10;
  if (!jadeSpend(cost)) return null;
  const out = [];
  for (let i = 0; i < n; i++){
    const it = summonRoll(); if (!it) continue;
    it.first = !eqSeen(it.k, it.g);
    eqGain(it.k, it.g, 1);
    out.push(it);
  }
  S.summons = (S.summons | 0) + n;
  if (typeof eqLogPush === 'function') for (const it of out) eqLogPush(itemLabel(it.k, it.g) + ' 소환');
  return out;
}
// 방금 뽑은 것 (화면에 늘어놓는다 — 저장 안 함)
let summonLast = null;
function summonTap(n){
  const out = eqSummon(n);
  if (!out){ if (typeof toast === 'function') toast(BM.jade + '이 모자라다'); return false; }
  summonLast = out;
  const best = out.reduce((a, b) => (b.g > a.g ? b : a), out[0]);
  if (best && typeof toast === 'function')
    toast(itemLabel(best.k, best.g) + (out.length > 1 ? ' 외 ' + (out.length - 1) : '') + ' 획득',
          { icon: eqIcon(best.k, best.g), color: EQUIP.grades[best.g].c, sec: 2.4 });
  shopHud(true);
  return true;
}

// 방금 뽑은 것을 칸으로 늘어놓는다 (레퍼런스 Reward 화면)
function summonResultHtml(){
  if (!summonLast || !summonLast.length) return '';
  let h = '<div class="gres">';
  for (const it of summonLast){
    const G = EQUIP.grades[it.g], ic = eqIcon(it.k, it.g);
    h += '<div class="gitem' + (it.first ? ' new' : '') + '" style="--gc:' + G.c + '">' +
         (ic ? '<img src="' + ic + '" alt="">' : '<span>' + G.n.charAt(0) + '</span>') +
         '<b>' + G.n + '</b></div>';
  }
  return h + '</div>';
}

/* ── 상점 시트 ── */
function openShop(){ const el = $('gpanel'); if (!el) return; el.classList.add('show'); shopHud(true); }
function closeShop(){ const el = $('gpanel'); if (el) el.classList.remove('show'); }
let shopSig = '';
function shopHud(force){
  const el = $('gpanel'); if (!el || (!force && !el.classList.contains('show'))) return;
  const a = adState();
  const sig = [S.jade | 0, a.n, a.L, a.d, S.pity | 0, summonLast ? summonLast.length + ':' + summonLast.map(x=>x.k+x.g).join() : ''].join('|');
  if (!force && sig === shopSig) return; shopSig = sig;
  const jn = $('gjade'); if (jn) jn.textContent = fmt(S.jade | 0);
  let h = '<div class="gsec">장비 소환</div>' +
    '<div class="gsum">' +
      '<div class="gpity">' + pityLeft() + '번 안에 <b>' + EQUIP.grades[BM.summon.pityG].n + ' 이상</b></div>' +
      '<div class="gsbtns">' +
        '<button class="gsb" data-n="1">소환<i>靈' + BM.summon.cost + '</i></button>' +
        '<button class="gsb" data-n="' + BM.summon.n10 + '">소환 ×' + BM.summon.n10 + '<i>靈' + BM.summon.cost10 + '</i></button>' +
      '</div>' + summonResultHtml() + '</div>' +
    '<div class="gsec">오늘 본 광고 <b>' + a.n + '</b> 편</div>';
  for (let i = 0; i < BM.ladder.length; i++){
    const st = BM.ladder[i], got = (a.L | 0) > i, can = !got && a.n >= st.n;
    const p = Math.min(1, a.n / st.n);
    h += '<div class="grow' + (got ? ' done' : '') + '">' +
         '<div class="glab">광고 ' + st.n + '편 · ' + st.t + '</div>' +
         '<div class="gbar"><i style="width:' + Math.round(p * 100) + '%"></i>' +
         '<span>' + Math.min(a.n, st.n) + ' / ' + st.n + '</span></div>' +
         (got ? '<span class="gok">받음</span>'
              : '<button class="gclaim" data-i="' + i + '"' + (can ? '' : ' disabled') + '>' + (can ? '받기' : '잠김') + '</button>') +
         '</div>';
  }
  h += '<div class="gsec">광고 자리 — 오늘 남은 횟수</div><div class="gslots">';
  for (const k in BM.slots) h += '<div class="gslot"><span>' + BM.slots[k].t + '</span><b>' + adLeft(k) + ' / ' + BM.slots[k].n + '</b></div>';
  h += '</div><div class="znote">' + BM.shopTip + (BM.adMock ? ' 지금 광고는 <b>모의</b>다 — 3초 기다리면 본 것으로 친다.' : '') + '</div>';
  const b = $('gbody'); if (!b) return;
  b.innerHTML = h;
  const btns = b.querySelectorAll ? b.querySelectorAll('.gclaim') : [];
  for (const btn of btns) btn.onclick = () => { ladderClaim(); shopHud(true); };
  const sbs = b.querySelectorAll ? b.querySelectorAll('.gsb') : [];
  for (const btn of sbs) btn.onclick = () => summonTap(btn.dataset.n | 0);
}
// ≡·HUD 알림점 — 받을 계단이 있으면 켠다
function shopDot(){ const d = $('shopdot'); if (d) d.classList.toggle('on', ladderReady()); }
