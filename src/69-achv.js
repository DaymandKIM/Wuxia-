/* ── 업적 (v2.90) ─────────────────────────────────────
   숫자는 00-data의 ACHV. 누적 상태를 읽어 단계(tiers)를 세고, 받은 단계(S.achv[k])와의 차이가 '받을 것'이다.
   보상은 받는 순간의 처치 은자 × rewardMul. 달성 알림은 achvHud가 checkSec마다 검사해 토스트 + ≡ 알림.
   패널 #vpanel — ≡ 메뉴 '업적'에서 연다. 검증 achvtest. */
function achvValue(a){
  switch (a.src){
    case 'totalKills': return S.totalKills | 0;
    case 'bosses':     return (S.bossDone || []).filter(Boolean).length;
    case 'realm':      return realmLv();
    case 'unlocked':   return S.unlocked | 0;
    case 'codex':      return typeof codexCount === 'function' ? codexCount() : 0;
    case 'grade':      return typeof eqAuraGrade === 'function' ? eqAuraGrade() : -1;
    case 'merges':     return S.merges | 0;
    case 'levels':     return S.levels | 0;
    case 'arts':       return Object.keys(S.arts || {}).filter(k => S.arts[k]).length;
    case 'fates':      return S.fates | 0;
    case 'downs':      return S.downs | 0;
  }
  return 0;
}
function achvReached(a){ const v = achvValue(a); let t = 0; while (t < a.tiers.length && v >= a.tiers[t]) t++; return t; }   // 달성한 단계 수
function achvClaimed(a){ return S.achv[a.k] | 0; }
function achvReward(tierIdx){ return Math.round(killSilver() * (ACHV.rewardMul[Math.min(tierIdx, ACHV.rewardMul.length - 1)] || 1)); }
function achvClaimable(a){ return achvReached(a) - achvClaimed(a); }
function achvClaimableAll(){ let n = 0; for (const a of ACHV.list) n += Math.max(0, achvClaimable(a)); return n; }
function achvTierText(a, t){                                  // t번째 단계(0부터)의 목표 표기
  const v = a.tiers[t];
  if (a.fmt === 'realm') return realmName(v);
  if (a.fmt === 'grade') return EQUIP.grades[v].n + ' 장비';
  return fmt(v);
}
// 받기 — 다음 한 단계. 보상 은자. 받을 게 없으면 false
function achvClaim(k){
  const a = ACHV.list.find(x => x.k === k); if (!a || achvClaimable(a) <= 0) return false;
  const t = achvClaimed(a), r = achvReward(t);
  S.silver += r; S.achv[a.k] = t + 1; S.achvNote[a.k] = Math.max(S.achvNote[a.k] | 0, t + 1);
  return r;
}
function achvClaimAll(){ let sum = 0, n = 0; for (const a of ACHV.list) while (achvClaimable(a) > 0){ sum += achvClaim(a.k); n++; } return { n, sum }; }
// 달성 알림 — 새로 닿은 단계마다 토스트 한 번
let achvT = 0;
function achvHud(dt){
  achvT += dt || 0; if (achvT < ACHV.checkSec) return; achvT = 0;
  for (const a of ACHV.list){
    const r = achvReached(a), noted = S.achvNote[a.k] | 0;
    if (r > noted){ S.achvNote[a.k] = r; if (typeof toast === 'function') toast('업적 달성 · ' + a.n + ' ' + r + '단계\n≡ 메뉴에서 받는다'); }
  }
  const dot = $('menudot'); if (dot) dot.classList.toggle('on', achvClaimableAll() > 0);
}
/* ── 패널 ── */
function achvCard(a){
  const v = achvValue(a), reached = achvReached(a), claimed = achvClaimed(a), n = a.tiers.length;
  const next = Math.min(claimed, n - 1), target = a.tiers[next], done = claimed >= n;
  const prog = done ? 1 : Math.max(0, Math.min(1, (a.fmt ? (v - (next ? a.tiers[next - 1] : 0)) / (target - (next ? a.tiers[next - 1] : 0)) : v / target)));
  const stars = Array.from({ length: n }, (_, i) => i < claimed ? '★' : (i < reached ? '☆' : '·')).join('');
  const can = reached > claimed;
  return '<div class="acard' + (can ? ' can' : '') + (done ? ' done' : '') + '" data-k="' + a.k + '">' +
    '<div class="atxt"><div class="zn">' + a.n + ' <small>' + stars + '</small></div>' +
    '<div class="zd">' + a.d + (done ? ' — 전부 달성' : (a.fmt ? ' · ' + achvTierText(a, next) : ' <i>' + fmt(v) + ' / ' + fmt(target) + '</i>')) + '</div>' +
    '<div class="abar"><i style="width:' + Math.round(prog * 100) + '%"></i></div></div>' +
    (done ? '<div class="adone">완료</div>'
          : '<button class="trbuy abtn" ' + (can ? '' : 'disabled') + '><span>' + (can ? '받기' : '진행 중') + '</span><i>' + coin() + ' ' + fmt(achvReward(claimed)) + '</i></button>') +
    '</div>';
}
function buildAchvPanel(){
  const b = $('vbody'); if (!b) return;
  const list = ACHV.list.slice().sort((x, y) => (achvClaimable(y) > 0) - (achvClaimable(x) > 0));   // 받을 것이 위
  b.innerHTML = '<div class="znote">쌓아 온 것을 돌아본다. 단계마다 은자를 준다 — 보상은 받는 순간의 사냥터 기준이라 늦게 받아도 손해가 없다.</div>' +
    list.map(achvCard).join('');
  b.querySelectorAll('.abtn').forEach(el => { el.onclick = () => { const k = el.closest('.acard').dataset.k, r = achvClaim(k);
    if (r){ toast('업적 보상 ' + fmt(r), { icon: ASSET.silver, color: '#e8c96a', sec: 1.8 }); saveNow(); buildAchvPanel(); } }; });
  const c = $('vcnt'); if (c) c.textContent = ACHV.list.reduce((s, a) => s + achvClaimed(a), 0) + ' / ' + ACHV.list.reduce((s, a) => s + a.tiers.length, 0);
}
function openAchv(){ buildAchvPanel(); $('vpanel').classList.add('show'); }
function closeAchv(){ const v = $('vpanel'); if (v) v.classList.remove('show'); }
