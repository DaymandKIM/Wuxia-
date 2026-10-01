/* ── 일일·주간 과제 + 접속 보상 (v2.97.2) ──────────────────
   사용자 확정 "일일숙제 없음도 빼자 우리 돈버는게 목적이야".
   **지키는 한 줄: 못 해도 본편 진행은 막히지 않는다.** 그래서
   1. 과제는 전부 **놀다 보면 저절로 되는 것**이다(처치·단계·합성·강화·소환·장로).
      "로그인하기"·"상자 10개 열기" 같은, 하러 들어와야 하는 항목은 안 넣었다.
   2. 항목이 보상을 직접 주지 않는다 — **점수를 주고 사다리에서 받는다**(레퍼런스 Quests 문법).
      한둘 빠뜨려도 사다리는 오르므로 숙제감이 덜하다.
   3. 접속 보상은 **연속을 요구하지 않는다** — 하루 걸러도 다음 칸을 이어 받는다.
   진행도는 누계값의 **스냅샷 차이**로 잰다(따로 세는 카운터를 안 만든다). */

const dqWeek = () => Math.floor(Date.now() / (7 * 86400000));   // 주 키
// 과제가 보는 누계들 — 전부 이미 있는 값이다
function dqTotals(){
  return {
    kill:   S.totalKills | 0,
    stage:  S.clears | 0,
    merge:  S.merges | 0,
    level:  S.levels | 0,
    summon: S.summons | 0,
    elder:  S.elders | 0,
  };
}
// 일일 상태 — 날짜가 바뀌면 지금 누계를 기준점으로 삼고 처음부터
function dqState(){
  if (!S.dq || S.dq.d !== bmDay()) S.dq = { d: bmDay(), base: dqTotals(), L: 0 };
  if (!S.dq.base) S.dq.base = dqTotals();
  return S.dq;
}
function wqState(){
  if (!S.wq || S.wq.w !== dqWeek()) S.wq = { w: dqWeek(), base: dqTotals(), L: 0 };
  if (!S.wq.base) S.wq.base = dqTotals();
  return S.wq;
}
// 한 항목의 진행도 (기준점 이후 얼마나 늘었나, 목표에서 자름)
function dqProg(st, item){
  const now = dqTotals()[item.k] | 0, base = (st.base && st.base[item.k]) | 0;
  return Math.max(0, Math.min(item.g, now - base));
}
// 모은 점수 = 다 채운 항목들의 점수 합
function dqPoints(weekly){
  const st = weekly ? wqState() : dqState(), list = weekly ? DAILY.week : DAILY.day;
  let p = 0;
  for (const it of list) if (dqProg(st, it) >= it.g) p += it.p;
  return p;
}
const dqLadder = weekly => weekly ? DAILY.weekLadder : DAILY.dayLadder;
const dqDone = weekly => (weekly ? wqState() : dqState()).L | 0;
function dqReady(weekly){
  const L = dqDone(weekly), lad = dqLadder(weekly);
  return L < lad.length && dqPoints(weekly) >= lad[L].p;
}
// 다음 계단 하나를 받는다
function dqClaim(weekly){
  const st = weekly ? wqState() : dqState(), lad = dqLadder(weekly), i = st.L | 0;
  if (!lad[i] || dqPoints(weekly) < lad[i].p) return null;
  st.L = i + 1;
  grantReward(lad[i], (weekly ? '주간' : '일일') + ' 과제 ' + lad[i].p + '점');
  return lad[i];
}

/* ── 접속 보상 — 7칸, 연속 요구 없음 ── */
function loginState(){ if (!S.login || typeof S.login !== 'object') S.login = { n: 0, d: '' }; return S.login; }
const loginReady = () => { const g = loginState(); return (g.n | 0) < DAILY.login.length && g.d !== bmDay(); };
function loginClaim(){
  const g = loginState(); if (!loginReady()) return null;
  const r = DAILY.login[g.n | 0];
  g.n = (g.n | 0) + 1; g.d = bmDay();
  grantReward(r, '접속 ' + g.n + '일차');
  return r;
}

/* ── 보상 지급 공통 ── */
function grantReward(r, why){
  const got = [];
  if (r.jade && typeof jadeAdd === 'function'){ jadeAdd(r.jade); got.push(BM.jade + ' +' + r.jade); }
  if (r.silverMin && typeof silverPerMin === 'function'){
    const sv = Math.max(1, Math.round(silverPerMin() * r.silverMin));
    S.silver += sv; got.push('은자 +' + fmt(sv));
  }
  if (r.frag && typeof hqFragGain === 'function'){
    const k = (typeof fragSchool === 'function') ? fragSchool() : null;
    if (k){ hqFragGain(k, r.frag, true); got.push('비급 조각 +' + r.frag); }
  }
  if (r.box && typeof eqGain === 'function' && typeof newItem === 'function'){
    for (let i = 0; i < r.box; i++){
      const it = newItem(S.zi | 0);
      if (it){ const g = Math.max(r.boxG !== undefined ? r.boxG : BM.boxGrade, it.g); eqGain(it.k, g, 1); got.push(itemLabel(it.k, g)); }
    }
  }
  if (got.length && typeof toast === 'function') toast((why ? why + '\n' : '') + got.join('\n'));
  return got;
}

/* ── 과제 패널 (≡ 메뉴) ── */
let dqTab = 'day';
const dqAnyReady = () => dqReady(false) || dqReady(true) || loginReady();
function openQuest(){ const el = $('qpanel'); if (!el) return; el.classList.add('show'); questHud(true); }
function closeQuest(){ const el = $('qpanel'); if (el) el.classList.remove('show'); }
let qSig = '';
function questHud(force){
  const el = $('qpanel'); if (!el || (!force && !el.classList.contains('show'))) return;
  const t = dqTotals();
  const sig = [dqTab, dqDone(false), dqDone(true), loginState().n, loginState().d, t.kill, t.stage, t.merge, t.level, t.summon, t.elder].join('|');
  if (!force && sig === qSig) return; qSig = sig;
  let h = '<div class="qtabs">' +
    ['day', 'week', 'login'].map(k => '<button class="qtab' + (dqTab === k ? ' on' : '') + '" data-t="' + k + '">' +
      (k === 'day' ? '일일' : k === 'week' ? '주간' : '접속') +
      ((k === 'day' && dqReady(false)) || (k === 'week' && dqReady(true)) || (k === 'login' && loginReady()) ? '<b class="qdot"></b>' : '') +
      '</button>').join('') + '</div>';
  if (dqTab === 'login'){
    const g = loginState();
    h += '<div class="qnote">연속으로 안 와도 된다 — 하루 걸러도 다음 칸을 이어 받는다.</div><div class="qlogin">';
    for (let i = 0; i < DAILY.login.length; i++){
      const got = (g.n | 0) > i, can = !got && (g.n | 0) === i && loginReady();
      h += '<div class="qday' + (got ? ' done' : '') + (can ? ' can' : '') + (i === DAILY.login.length - 1 ? ' last' : '') + '">' +
           '<b>' + (i + 1) + '일차</b><span>' + DAILY.login[i].t + '</span>' + (got ? '<i>✓</i>' : '') + '</div>';
    }
    h += '</div>' + (loginReady() ? '<button class="qclaim big" data-c="login">오늘 것 받기</button>' : '');
  } else {
    const weekly = dqTab === 'week', st = weekly ? wqState() : dqState(), list = weekly ? DAILY.week : DAILY.day;
    const pts = dqPoints(weekly), lad = dqLadder(weekly), L = dqDone(weekly);
    h += '<div class="qbarw"><div class="qbar"><i style="width:' + Math.min(100, Math.round(pts / lad[lad.length - 1].p * 100)) + '%"></i></div>' +
         '<span>' + pts + ' 점</span></div><div class="qlad">';
    for (let i = 0; i < lad.length; i++){
      const got = L > i, can = !got && pts >= lad[i].p;
      h += '<div class="qstep' + (got ? ' done' : '') + '"><b>' + lad[i].p + '점</b><span>' + rewardText(lad[i]) + '</span>' +
           (got ? '<i>✓</i>' : can ? '<button class="qclaim" data-c="' + (weekly ? 'week' : 'day') + '">받기</button>' : '<i class="lk">🔒</i>') + '</div>';
    }
    h += '</div><div class="qsec">' + (weekly ? '이번 주' : '오늘') + ' — 놀다 보면 채워진다</div>';
    for (const it of list){
      const p = dqProg(st, it), full = p >= it.g;
      h += '<div class="qitem' + (full ? ' done' : '') + '"><div class="qlab">' + it.n.replace('{g}', fmt(it.g)) + '<i>+' + it.p + '점</i></div>' +
           '<div class="qpb"><i style="width:' + Math.round(p / it.g * 100) + '%"></i><span>' + fmt(p) + ' / ' + fmt(it.g) + '</span></div></div>';
    }
  }
  const b = $('qbody'); if (!b) return;
  b.innerHTML = h;
  const tabs = b.querySelectorAll ? b.querySelectorAll('.qtab') : [];
  for (const t2 of tabs) t2.onclick = () => { dqTab = t2.dataset.t; questHud(true); };
  const cls = b.querySelectorAll ? b.querySelectorAll('.qclaim') : [];
  for (const c of cls) c.onclick = () => {
    if (c.dataset.c === 'login') loginClaim(); else dqClaim(c.dataset.c === 'week');
    questHud(true);
  };
}
function rewardText(r){
  const out = [];
  if (r.jade) out.push('靈 ' + r.jade);
  if (r.silverMin) out.push('은자 ' + r.silverMin + '분 치');
  if (r.frag) out.push('조각 ' + r.frag);
  if (r.box) out.push(r.boxG !== undefined ? EQUIP.grades[r.boxG].n + ' 장비' : '장비 상자');
  return out.join(' · ');
}
