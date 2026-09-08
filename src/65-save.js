/* ── 저장 · 오프라인 진행 ──────────────────────────
   localStorage에 진행을 남기고, 다시 켜면 자리 비운 시간만큼
   근사 모델로 수련을 이어 준다. 숫자는 전부 00-data.js의 SAVE·OFFLINE.
*/
function saveNow(){
  try{
    localStorage.setItem(SAVE.key, JSON.stringify({
      v: SAVE.ver, at: Date.now(),
      zi: S.zi, stage: S.stage, kills: S.kills,
      best: S.best, unlocked: S.unlocked,
      totalKills: S.totalKills, downs: S.downs,
      silver: S.silver, bossDone: S.bossDone, stats: S.stats, rexp: S.rexp,
      arts: S.arts, karma: S.karma, fates: S.fates, fatebits: S.fatebits,
      artXp: S.artXp, artStar: S.artStar, artLv: S.artLv,
    }));
  }catch(e){}                    // 시크릿 모드 등 — 저장만 못 할 뿐 게임은 돈다
}

function loadSave(){
  try{
    const d = JSON.parse(localStorage.getItem(SAVE.key));
    return (d && d.v === SAVE.ver) ? d : null;
  }catch(e){ return null; }
}

// 저장된 값은 믿지 않는다 — 범위를 벗어나면 잘라낸다
function applySave(d){
  S.zi         = clamp(d.zi|0, 0, ZONES.length-1);
  S.stage      = clamp(d.stage|0, 1, BOSS_STAGE);
  S.kills      = Math.max(0, d.kills|0);
  S.best       = Math.max(1, d.best|0);
  S.unlocked   = clamp(d.unlocked|0, 1, ZONES.length);
  S.totalKills = Math.max(0, d.totalKills|0);
  S.downs      = Math.max(0, d.downs|0);
  S.silver     = Math.max(0, d.silver|0);           // 예전 저장엔 없다 → 0
  S.bossDone   = Array.isArray(d.bossDone)
    ? d.bossDone.slice(0, ZONES.length).map(v => v ? 1 : 0) : [];
  S.stats = {};
  if (d.stats && typeof d.stats === 'object')
    for (const s of TRAIN.list) S.stats[s.k] = Math.max(0, d.stats[s.k]|0);
  S.rexp = Math.max(0, +d.rexp || 0);
  S.arts = {};
  if (d.arts && typeof d.arts === 'object')
    for (const a of ARTS.list) if (d.arts[a.k]) S.arts[a.k] = 1;
  S.artXp = {}; S.artStar = {}; S.artLv = {};
  for (const a of ARTS.list){
    if (!S.arts[a.k]) continue;
    if (d.artXp && typeof d.artXp === 'object') S.artXp[a.k] = Math.max(0, d.artXp[a.k] | 0);
    if (d.artStar && typeof d.artStar === 'object')
      S.artStar[a.k] = clamp(d.artStar[a.k] | 0, 1, MASTERY.maxStar);
    if (d.artLv && typeof d.artLv === 'object')
      S.artLv[a.k] = clamp(d.artLv[a.k] | 0, 1, artLvCap(a.k));   // 성 로드 뒤라 상한이 맞다
  }
  S.karma = Math.max(0, +d.karma || 0);
  S.fates = Math.max(0, d.fates | 0);
  S.fatebits = {};
  if (d.fatebits && typeof d.fatebits === 'object')
    for (const k of ['guyang', 'geongon'])
      S.fatebits[k] = Math.min(FATE.fragNeed, Math.max(0, d.fatebits[k] | 0));
  S.fatePending = S.karma >= karmaNeed() ? 1 : 0;
}

function resetSave(){
  try{ localStorage.removeItem(SAVE.key); }catch(e){}
  location.reload();
}

// 지금 단계에서 한 마리 잡는 데 걸리는 시간(초) — 근사
function offKillTime(){
  const list = ZONEFOE[zone().k] || ['bandit'];
  let m = 0; for (const k of list) m += FOES[k].hp;
  const hp = foeHp() * (m / list.length);            // 구역 평균 체력
  const punches = Math.ceil(hp / heroDmg());
  return punches * HERO.atkCd / OFFLINE.aoe + OFFLINE.walk;
}

// 자리 비운 시간만큼 정산한다. 보고용 {sec, kills, silver, fate}를 준다.
// 단계는 넘어가지 않는다(사용자 확정) — 지금 단계에서 제자리 사냥으로
// 은자·수련치·인연만 쌓는다. 진행은 돌아와서 직접 본다.
function offlineGains(awaySec){
  const sec = Math.min(awaySec, OFFLINE.cap);
  const rexp0 = S.rexp;
  let budget = sec * OFFLINE.rate;
  let kills = 0, silver = 0;
  while (budget > 0){
    const chunk = Math.min(budget, 600);
    kills += Math.floor(chunk / offKillTime());
    budget -= chunk;
  }
  silver = killSilver() * kills;   // 은자는 후하게 전부 (방침: 확실한 오프라인 보상)
  // 수련치는 시간 기준 — 약한 적을 3만 번 잡아도 경지가 폭주하지 않게.
  // 8시간 꽉 채우면 승급 약 expLv8h회 분량. 필요량이 기하라 승급 단위로 준다.
  let grant = OFFLINE.expLv8h * (sec / OFFLINE.cap);
  while (grant > 0){
    const take = Math.min(1, grant);
    S.rexp += realmNeed(realmLv()) * take;
    grant -= take;
  }
  // 심법 숙련도 오프라인에도 스민다
  for (const a of ARTS.list)
    if (a.type === 'passive' && S.arts[a.k]) S.artXp[a.k] = (S.artXp[a.k] | 0) + kills;
  // 인연도 상한 — 자리 비움 한 번에 기연 하나 반쯤
  S.karma += Math.min(kills * killKarmaAt(), karmaNeed() * OFFLINE.karmaCap);
  S.totalKills += kills;
  S.silver += silver;
  if (S.karma >= karmaNeed()) S.fatePending = 1;
  return { sec, kills, silver, exp: Math.round(S.rexp - rexp0), fate: S.fatePending };
}

/* ── 돌아온 화면 ──────────────────────────────────── */
function fmtDur(sec){
  const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60);
  if (h) return h + '시간 ' + m + '분';
  if (m) return m + '분';
  return Math.floor(sec) + '초';
}

function showOffline(g){
  $('otime').textContent = fmtDur(g.sec) + ' 동안 수련했다';
  let h = '<div class="orow"><span>처치</span><b>' + g.kills.toLocaleString() + '</b></div>';
  if (g.silver) h += '<div class="orow"><span>은자</span><b>+' + g.silver.toLocaleString() + '</b></div>';
  if (g.exp)    h += '<div class="orow"><span>수련치</span><b>+' + g.exp.toLocaleString() + '</b></div>';
  if (g.fate)   h += '<div class="orow"><span>✦ 기연</span><b>기다리고 있다</b></div>';
  $('obody').innerHTML = h;
  $('opanel').classList.add('show');
}
function closeOffline(){ $('opanel').classList.remove('show'); maybeFate(); }
