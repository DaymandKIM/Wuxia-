/* ── 3층 현금 상품 + 구매 복원 (v2.97.3) ────────────────
   설계 docs/설계-BM.md §10·§13. 값은 레퍼런스 실값 그대로.
   **결제는 모의다** — 아티팩트·로컬엔 스토어가 없다. payBuy() 한 곳만 스토어 빌드에서 갈아끼운다.
   사는 것은 전부 **가속**이다: 경지·무공 습득 조건·연마 상한·단계 진행은 여전히 안 판다.
   은자는 **분당 수입 × N분**으로만 준다(절대값은 지수 곡선을 부순다). */

function payState(){
  if (!S.pay || typeof S.pay !== 'object') S.pay = { own: {}, sub: {}, claim: {}, pass: 0, starter: 0 };
  if (!S.pay.own) S.pay.own = {}; if (!S.pay.sub) S.pay.sub = {}; if (!S.pay.claim) S.pay.claim = {};
  return S.pay;
}
const payOwn = k => !!payState().own[k];
// 정기권이 아직 유효한가 (월간은 days 일, 광고 제거는 영구)
function subLeft(k){
  const p = payState(), t = p.sub[k]; if (!t) return 0;
  const P = PAY[k]; if (!P || !P.days) return 1e9;                 // 영구
  return Math.max(0, P.days - Math.floor((Date.now() - t) / 86400000));
}
const subOn = k => payOwn(k) && subLeft(k) > 0;
// 광고를 안 보고 받을 수 있나 (월간 옥패·광고 제거)
const adSkip = () => subOn('monthly') || payOwn('adfree');
// 오프라인 상한 (65-save 가 쓴다)
const offCap = () => subOn('monthly') ? PAY.monthly.offHour * 3600 : OFFLINE.cap;   // 월간 옥패는 방치 상한을 8 → 24시간으로

/* 결제 — 모의. 실제 스토어에선 여기만 영수증 검증으로 바꾼다. */
function payBuy(k, then){
  const P = (k === 'jade') ? null : PAY[k];
  if (P && P.once !== false && payOwn(k) && k !== 'growth' && k !== 'starter'){ /* 재구매 허용 상품은 따로 */ }
  if (!PAY.mock){ if (then) then(false); return false; }
  if (then) then(true);
  return true;
}

/* 상품 구매 */
function buyProduct(k){
  const P = PAY[k]; if (!P) return false;
  if (payOwn(k) && (k === 'monthly' ? subOn('monthly') : true)) return false;   // 월간은 끝나면 다시 산다
  return payBuy(k, okz => {
    if (!okz) return;
    const p = payState();
    p.own[k] = 1;
    if (k === 'starter'){ p.starter = 0; p.claim.starter = ''; }
    if (k === 'monthly' || k === 'adfree'){ p.sub[k] = Date.now(); if (P.now) jadeAdd(P.now); }
    if (k === 'growth'){
      grantReward({ jade: P.jade, silverMin: P.silverMin, frag: P.frag, box: P.box, boxG: P.boxG }, P.n);
    }
    if (typeof toast === 'function' && k !== 'growth') toast(P.n + ' 구매' + (PAY.mock ? ' (모의)' : ''));
    payHud(true);
  });
}
// 영옥 낱개
function buyJadePack(key){
  const p = PAY.jadePacks.find(x => x.k === key); if (!p) return false;
  return payBuy('jade', okz => { if (!okz) return; jadeAdd(p.jade, '영옥 구매' + (PAY.mock ? ' (모의)' : '')); payHud(true); });
}

/* 매일 받는 것 — 정기권(Collectable Daily)·입문 예물 3일 분할 */
function dailyPayReady(){
  const p = payState();
  if (subOn('monthly') && p.claim.monthly !== bmDay()) return true;
  if (payOwn('adfree') && p.claim.adfree !== bmDay()) return true;
  if (payOwn('starter') && (p.starter | 0) < PAY.starter.days.length && p.claim.starter !== bmDay()) return true;
  return false;
}
function claimDailyPay(){
  const p = payState(); let n = 0;
  if (subOn('monthly') && p.claim.monthly !== bmDay()){ p.claim.monthly = bmDay(); jadeAdd(PAY.monthly.daily, '월간 옥패'); n++; }
  if (payOwn('adfree') && p.claim.adfree !== bmDay()){ p.claim.adfree = bmDay(); jadeAdd(PAY.adfree.daily, '광고 제거 특전'); n++; }
  if (payOwn('starter') && (p.starter | 0) < PAY.starter.days.length && p.claim.starter !== bmDay()){
    const d = PAY.starter.days[p.starter | 0];
    p.starter = (p.starter | 0) + 1; p.claim.starter = bmDay();
    grantReward(d, PAY.starter.n + ' ' + p.starter + '일차'); n++;
  }
  payHud(true);
  return n;
}

/* 유람첩 — 진행도는 **누계 업적 받은 수**(기간제 아님, 놓치는 계단이 없다) */
function passProgress(){ let n = 0; for (const a of ACHV.list) n += achvClaimed(a); return n; }
const passDone = () => payState().pass | 0;
function passReady(){ const i = passDone(); return i < PAY.pass.steps.length && passProgress() >= PAY.pass.steps[i].need; }
// 유료를 지금 사면 바로 받을 개수 (레퍼런스의 빨간 배지 — 전환의 핵심)
function passPending(){
  if (payOwn('pass')) return 0;
  let n = 0; for (let i = 0; i < PAY.pass.steps.length; i++) if (passProgress() >= PAY.pass.steps[i].need) n++;
  return n;
}
function passClaim(){
  const p = payState(), i = p.pass | 0, st = PAY.pass.steps[i];
  if (!st || passProgress() < st.need) return null;
  p.pass = i + 1;
  grantReward(st.free, PAY.pass.n + ' ' + (i + 1) + '단');
  if (payOwn('pass')) grantReward(st.paid, PAY.pass.n + ' ' + (i + 1) + '단 (유료)');
  return st;
}

/* 구매 복원 — 결제를 붙이면 **필수**다(스토어 심사·기기 교체). 모의에선 저장된 소유를 다시 읽는다. */
function restorePurchases(){
  const p = payState(), owned = Object.keys(p.own).filter(k => p.own[k]);
  if (typeof toast === 'function')
    toast(owned.length ? '구매 복원\n' + owned.map(k => (PAY[k] ? PAY[k].n : k)).join('\n')
                       : '복원할 구매가 없다' + (PAY.mock ? '\n(지금 결제는 모의다)' : ''));
  payHud(true);
  return owned;
}

/* ── 상품 패널 ── */
const payAnyReady = () => dailyPayReady() || passReady();
function openPay(){ const el = $('ppanel'); if (!el) return; el.classList.add('show'); payHud(true); }
function closePay(){ const el = $('ppanel'); if (el) el.classList.remove('show'); }
const won = n => '₩' + n.toLocaleString('en-US');
let paySig = '';
function payHud(force){
  const el = $('ppanel'); if (!el || (!force && !el.classList.contains('show'))) return;
  const p = payState();
  const sig = [S.jade | 0, JSON.stringify(p.own), JSON.stringify(p.claim), p.pass, p.starter, passProgress(), S.zi].join('|');
  if (!force && sig === paySig) return; paySig = sig;
  let h = '';
  if (dailyPayReady()) h += '<button class="qclaim big" id="pdaily">오늘 받을 것이 있다 — 전부 받기</button>';
  // 입문 예물
  const S1 = PAY.starter;
  h += '<div class="pcard' + (payOwn('starter') ? ' own' : '') + '"><div class="phd">' + S1.n +
       '<i>3일에 나눠 받는다</i></div>';
  for (let i = 0; i < S1.days.length; i++)
    h += '<div class="prow' + ((p.starter | 0) > i ? ' done' : '') + '"><b>' + (i + 1) + '일차</b><span>' + rewardIcons(S1.days[i]) + '</span></div>';
  h += payOwn('starter')
     ? '<div class="pown">' + ((p.starter | 0) >= S1.days.length ? '다 받았다' : '내일 ' + ((p.starter | 0) + 1) + '일차') + '</div>'
     : '<button class="pbuy" data-k="starter"><s>' + won(S1.was) + '</s>' + won(S1.won) + '</button>';
  h += '</div>';
  // 월간 옥패
  const M = PAY.monthly, ml = subLeft('monthly');
  h += '<div class="pcard hot' + (subOn('monthly') ? ' own' : '') + '"><div class="phd">' + M.n + '<i>매일 받는다</i></div>' +
       '<div class="prow"><b>매일</b><span>' + rewardIcons({ jade: M.daily }) + ' × ' + M.days + '일</span></div>' +
       '<div class="prow"><b>즉시</b><span>' + rewardIcons({ jade: M.now }) + '</span></div>' +
       '<div class="prow"><b>특전</b><span>방치 상한 ' + M.offHour + '시간 · 광고 자리 바로 수령</span></div>' +
       (subOn('monthly') ? '<div class="pown">' + ml + '일 남음</div>'
                         : '<button class="pbuy" data-k="monthly">' + won(M.won) + '</button>') + '</div>';
  // 광고 제거
  const A = PAY.adfree;
  h += '<div class="pcard' + (payOwn('adfree') ? ' own' : '') + '"><div class="phd">' + A.n + '<i>영구</i></div>' +
       '<div class="prow"><b>즉시</b><span>' + rewardIcons({ jade: A.now }) + '</span></div>' +
       '<div class="prow"><b>매일</b><span>' + rewardIcons({ jade: A.daily }) + ' 영구</span></div>' +
       '<div class="prow"><b>특전</b><span>광고 자리를 안 보고 받는다</span></div>' +
       (payOwn('adfree') ? '<div class="pown">보유 중</div>' : '<button class="pbuy" data-k="adfree">' + won(A.won) + '</button>') + '</div>';
  // 성장 꾸러미 — 도달형
  const G = PAY.growth;
  if ((S.zi | 0) >= G.needZone || payOwn('growth')){
    h += '<div class="pcard"><div class="phd">' + G.n + '<i>한 번만 · 안 닫힌다</i></div>' +
         '<div class="prow"><b>내용</b><span>' + rewardIcons(G) + '</span></div>' +
         (payOwn('growth') ? '<div class="pown">받았다</div>'
          : '<button class="pbuy" data-k="growth"><s>' + won(G.was) + '</s>' + won(G.won) + '<em>' + G.mul + '배</em></button>') + '</div>';
  }
  // 유람첩
  const PS = PAY.pass, prog = passProgress();
  h += '<div class="pcard"><div class="phd">' + PS.n + '<i>업적 ' + prog + '단계 · 기한 없음</i></div>';
  for (let i = 0; i < PS.steps.length; i++){
    const st = PS.steps[i], got = passDone() > i, can = !got && prog >= st.need;
    h += '<div class="prow pass' + (got ? ' done' : '') + '"><b>' + st.need + '</b>' +
         '<span>' + rewardIcons(st.free) + '</span>' +
         '<span class="paid' + (payOwn('pass') ? ' on' : '') + '">' + rewardIcons(st.paid) + '</span>' +
         (got ? '<i>✓</i>' : can ? '<button class="qclaim" data-p="1">받기</button>' : '<i class="lk">🔒</i>') + '</div>';
  }
  h += payOwn('pass') ? '<div class="pown">유료 열림</div>'
     : '<button class="pbuy" data-k="pass">' + won(PS.won) +
       (passPending() ? '<em>바로 ' + passPending() + '개</em>' : '') + '</button>';
  h += '</div>';
  // 영옥 낱개
  h += '<div class="gsec">' + BM.jade + ' 묶음</div><div class="gpacks">' +
    PAY.jadePacks.map((j, i) => '<button class="gpack pj s' + Math.min(2, i >> 1) + '" data-j="' + j.k + '"><em>' + jadeIc('ic2') + '</em><b>' + fmt(j.jade) + '</b><span>' + won(j.won) + '</span></button>').join('') +
    '</div>';
  h += '<div class="znote">' + (PAY.mock ? '지금 결제는 <b>모의</b>다 — 누르면 스토어 없이 그대로 들어온다.' : '') + '</div>';
  const b = $('pbody'); if (!b) return;
  b.innerHTML = h;
  const dz = b.querySelector ? b.querySelector('#pdaily') : null;
  if (dz) dz.onclick = () => { claimDailyPay(); payHud(true); };
  const bys = b.querySelectorAll ? b.querySelectorAll('.pbuy') : [];
  for (const btn of bys) btn.onclick = () => { buyProduct(btn.dataset.k); payHud(true); };
  const pjs = b.querySelectorAll ? b.querySelectorAll('.pj') : [];
  for (const btn of pjs) btn.onclick = () => buyJadePack(btn.dataset.j);
  const pcs = b.querySelectorAll ? b.querySelectorAll('[data-p]') : [];
  for (const btn of pcs) btn.onclick = () => { passClaim(); payHud(true); };
}
