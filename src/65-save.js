/* ── 저장 · 오프라인 진행 ──────────────────────────
   localStorage에 진행을 남기고, 다시 켜면 자리 비운 시간만큼
   근사 모델로 수련을 이어 준다. 숫자는 전부 00-data.js의 SAVE·OFFLINE.
*/
let resetting = false;           // 초기화 중엔 저장하지 않는다 (v2.66 — "저장 초기화가 안 됨")
function saveNow(){
  if (resetting) return;
  try{
    localStorage.setItem(SAVE.key, JSON.stringify({
      v: SAVE.ver, at: Date.now(),
      zi: S.zi, stage: S.stage, kills: S.kills,
      best: S.best, unlocked: S.unlocked,
      totalKills: S.totalKills, downs: S.downs,
      silver: S.silver, bossDone: S.bossDone, reach: S.reach, stats: S.stats, rexp: S.rexp,
      arts: S.arts, karma: S.karma, fates: S.fates, fatebits: S.fatebits,
      artXp: S.artXp, artStar: S.artStar, artLv: S.artLv,
      skillManual: S.skillManual, tree: S.tree, traits: S.traits, equip: S.equip,
      itemLv: S.itemLv, inv: S.inv, codex: S.codex,
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
  S.reach = Array.isArray(d.reach) ? d.reach.slice(0, ZONES.length).map(v => clamp(v|0, 0, BOSS_STAGE)) : [];   // 옛 저장엔 없다 → 지금 단계에서 시작
  for (let i = 0; i < S.zi; i++) if (!S.reach[i]) S.reach[i] = BOSS_STAGE;   // 지나온 구역은 끝까지 가 본 것
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
  S.skillManual = !!d.skillManual;              // 발동 모드 (예전 저장엔 없다 → 자동)
  // 장비 (v2.70 표준형) — 자리·주머니·아이템 레벨·도감을 유효한 것만 되살린다.
  // v2.66/67 저장의 자리 강화(eqLv·장비 lv)는 장착품의 아이템 레벨로 옮긴다.
  S.equip = { weapon:null, armor:null, trinket:null }; S.inv = {}; S.itemLv = {}; S.codex = {};
  const NG = EQUIP.grades.length;
  for (const sl of EQUIP.slots){
    const it = d.equip && d.equip[sl.k];
    if (it && typeof it === 'object' && sl.kinds.some(x => x[0] === it.k))
      S.equip[sl.k] = { k: it.k, g: clamp(it.g|0, 0, NG-1) };
    for (const kd of sl.kinds){
      const k = kd[0];
      if (d.inv && Array.isArray(d.inv[k])) S.inv[k] = Array.from({length:NG}, (_, i) => Math.max(0, d.inv[k][i]|0));
      if (d.itemLv && Array.isArray(d.itemLv[k])) S.itemLv[k] = Array.from({length:NG}, (_, i) => clamp(d.itemLv[k][i]|0, 0, EQUIP.grades[i].lvCap));
      if (d.codex && typeof d.codex === 'object' && d.codex[k]) S.codex[k] = (d.codex[k]|0) & ((1<<NG)-1);
    }
    const w = S.equip[sl.k];
    if (w){
      S.codex[w.k] = (S.codex[w.k]|0) | (1 << w.g);
      const old = (it && it.lv) ? it.lv|0 : (d.eqLv && d.eqLv[sl.k]) ? d.eqLv[sl.k]|0 : 0;   // 옛 자리 강화 이월
      if (old > 0){ if (!S.itemLv[w.k]) S.itemLv[w.k] = Array.from({length:NG}, () => 0);
        S.itemLv[w.k][w.g] = clamp(Math.max(S.itemLv[w.k][w.g], old), 0, EQUIP.grades[w.g].lvCap); }
    }
  }
  // 문파 무공도 접기(v2.55.2) — 트리 노드는 되살리지 않는다(무공점 환급).
  // 무공점은 이제 스킬 특성에만 쓴다. 트리가 줬던 무공은 treeReapply가 걷어낸다.
  S.tree = {};
  treeReapply();
  // 스킬 심화 특성 — 배운 무공의 유효한 특성만 되살린다 (v2.55)
  S.traits = {};
  if (d.traits && typeof d.traits === 'object')
    for (const k in TRAITS){
      if (!S.arts[k] || !d.traits[k]) continue;
      for (const t of TRAITS[k]) if (d.traits[k][t.id]) (S.traits[k]||(S.traits[k]={}))[t.id] = 1;
    }
  S.karma = Math.max(0, +d.karma || 0);
  S.fates = Math.max(0, d.fates | 0);
  S.fatebits = {};
  if (d.fatebits && typeof d.fatebits === 'object')
    for (const k of ['guyang', 'geongon'])
      S.fatebits[k] = Math.min(FATE.fragNeed, Math.max(0, d.fatebits[k] | 0));
  S.fatePending = S.karma >= karmaNeed() ? 1 : 0;
}

// 초기화 — 키를 지우고 새로 연다. 예전엔 reload 직전 pagehide/visibilitychange의
// saveNow가 지운 자리에 현재 상태를 다시 써 넣어 초기화가 안 됐다("버튼이 적용 안 됨").
function resetSave(){
  resetting = true;
  try{ localStorage.removeItem(SAVE.key); }catch(e){}
  try{ location.reload(); }catch(e){}
  // 샌드박스(아티팩트 iframe)가 reload를 막으면 같은 주소로 다시 연다
  setTimeout(() => { try{ location.href = location.href; }catch(e){} }, 300);
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

let offAutoT = 0;                // 복귀 카드 자동 닫힘 타이머
function showOffline(g){
  offAutoT = OFFLINE.autoSec;
  $('otime').textContent = fmtDur(g.sec) + ' 동안 수련했다';
  let h = '<div class="orow"><span>처치</span><b>' + fmt(g.kills) + '</b></div>';
  if (g.silver) h += '<div class="orow"><span>' + coin() + ' 은자</span><b>+' + fmt(g.silver) + '</b></div>';
  if (g.exp)    h += '<div class="orow"><span>수련치</span><b>+' + fmt(g.exp) + '</b></div>';
  if (g.fate)   h += '<div class="orow"><span>✦ 기연</span><b>기다리고 있다</b></div>';
  $('obody').innerHTML = h;
  $('opanel').classList.add('show');
}
function closeOffline(){ $('opanel').classList.remove('show'); maybeFate(); }

// 매 프레임 — 복귀 카드도 잠시 뒤 스스로 닫힌다 (팝업 피로 방지)
function stepOffline(dt){
  if (!$('opanel').classList.contains('show')) return;
  offAutoT -= dt;
  $('obtn').textContent = '수련 계속 (' + Math.max(1, Math.ceil(offAutoT)) + ')';
  if (offAutoT <= 0) closeOffline();
}
