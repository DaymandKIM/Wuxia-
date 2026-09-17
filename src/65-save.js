/* ── 저장 · 오프라인 진행 ──────────────────────────
   localStorage에 진행을 남기고, 다시 켜면 자리 비운 시간만큼
   근사 모델로 수련을 이어 준다. 숫자는 전부 00-data.js의 SAVE·OFFLINE.
*/
let resetting = false;           // 초기화 중엔 저장하지 않는다 (v2.66 — "저장 초기화가 안 됨")
// 저장소 상태 (v2.90.2, "저장이 안 됨") — localStorage가 막힌 환경(앱 안 iframe·사파리 서드파티 저장소 차단·
// 시크릿·샌드박스)에선 setItem이 조용히 던져 저장이 되는 척했다. 이제 결과를 돌려주고(saveOk) ≡ 메뉴에 "막힘"을
// 보이며, 막힌 환경은 **저장 코드**(saveCode/loadCode)로 진행을 옮긴다.
let saveOk = null;               // null=아직 모름 · true=마지막 저장 성공 · false=막힘
function saveData(){
  return {
    v: SAVE.ver, at: Date.now(),
    zi: S.zi, stage: S.stage, kills: S.kills,
    best: S.best, unlocked: S.unlocked,
    totalKills: S.totalKills, downs: S.downs,
    silver: S.silver, bossDone: S.bossDone, reach: S.reach, stats: S.stats, rexp: S.rexp,
    arts: S.arts, karma: S.karma, fates: S.fates, fatebits: S.fatebits,
    artXp: S.artXp, artStar: S.artStar, artLv: S.artLv,
    skillManual: S.skillManual, autoNext: S.autoNext, autoBoss: S.autoBoss, qual: S.qual, mute: S.mute, tree: S.tree, traits: S.traits, equip: S.equip,
    itemLv: S.itemLv, inv: S.inv, codex: S.codex,
    merges: S.merges, levels: S.levels, achv: S.achv,   // 업적 (v2.90)
    halls: S.halls, fame: S.fame, sectName: S.sectName, disciples: S.disciples,   // 문파 (v2.91~92)
    hq: S.hq, duel: S.duel, frag: S.frag, hqDone: S.hqDone, ptsBonus: S.ptsBonus,      // 본진 비무 (v2.94)
  };
}
function saveNow(){
  if (resetting) return false;
  try{
    const s = JSON.stringify(saveData());
    localStorage.setItem(SAVE.key, s);
    if (localStorage.getItem(SAVE.key) !== s) throw new Error('readback');   // 쓰는 척만 하는 저장소(용량 0)도 막힘으로 친다
    saveOk = true;
  }catch(e){ saveOk = false; }   // 시크릿 모드 등 — 저장만 못 할 뿐 게임은 돈다
  return saveOk;
}

function loadSave(){
  try{
    const d = JSON.parse(localStorage.getItem(SAVE.key));
    return (d && d.v === SAVE.ver) ? d : null;
  }catch(e){ return null; }
}

// 저장 코드 — 진행을 글자로 뽑아 다른 기기·막힌 브라우저로 옮긴다 (v2.90.2). 머리표 + base64(UTF-8 JSON)
function saveCode(){
  return SAVE.codeTag + btoa(unescape(encodeURIComponent(JSON.stringify(saveData()))));
}
// 코드 해석 — 우리 코드가 아니거나 판이 다르면 null
function parseCode(code){
  try{
    code = String(code || '').trim();
    if (!code.startsWith(SAVE.codeTag)) return null;
    const d = JSON.parse(decodeURIComponent(escape(atob(code.slice(SAVE.codeTag.length)))));
    return (d && d.v === SAVE.ver) ? d : null;
  }catch(e){ return null; }
}
// 코드 불러오기 — 그 자리에서 적용(새로고침 없음: 막힌 브라우저는 새로고침하면 다시 잃는다). 성공하면 true
function loadCode(code){
  const d = parseCode(code); if (!d) return false;
  applySave(d);
  if (typeof eqStarter === 'function') eqStarter();
  enterStage(true);
  saveNow();
  return true;
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
  // 본진 비무 (v2.94) — 문파 키는 화이트리스트, 단·조각은 정수. 본진에 있었으면 단계는 10(제자 젠)·11(장로)만
  S.hq = (d.hq && DUEL.gBase[d.hq] !== undefined) ? d.hq : null;
  S.duel = {}; if (d.duel && typeof d.duel === 'object') for (const k in DUEL.gBase) if (d.duel[k]) S.duel[k] = Math.max(1, d.duel[k] | 0);
  S.hqDone = {}; if (d.hqDone && typeof d.hqDone === 'object') for (const k in DUEL.gBase) if (d.hqDone[k]) S.hqDone[k] = Math.max(0, d.hqDone[k] | 0);
  S.frag = {}; if (d.frag && typeof d.frag === 'object') for (const k in d.frag) if (ARTS.list.some(a => a.k === k) && (d.frag[k] | 0) > 0) S.frag[k] = d.frag[k] | 0;
  S.ptsBonus = Math.max(0, d.ptsBonus | 0);
  if (S.hq) S.stage = clamp(S.stage, BOSS_STAGE - 1, BOSS_STAGE);
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
  S.autoNext = d.autoNext === undefined ? true : !!d.autoNext;   // 자동 진행 (옛 저장엔 없다 → 켜짐, v2.95.4)
  S.autoBoss = d.autoBoss === undefined ? true : !!d.autoBoss;
  // 화질 (v2.95.5) — 저장에 있으면 손으로 고른 것이라 자동 낮추기를 멈춘다
  if (d.qual === undefined || d.qual === null) S.qual = null;
  else { S.qual = d.qual | 0; S.__qualManual = true; }
  if (typeof resize === 'function') resize();
  S.mute        = !!d.mute;                     // 효과음 끔 (v2.85, 예전 저장엔 없다 → 켬)
  S.merges = Math.max(0, d.merges | 0); S.levels = Math.max(0, d.levels | 0);   // 업적 누계 (v2.90)
  S.halls = {}; if (d.halls && typeof d.halls === 'object') for (const h of SECT.halls){ const lv = Math.max(0, d.halls[h.k] | 0); if (lv) S.halls[h.k] = lv; }   // 문파 (v2.91)
  S.fame = Math.max(0, +d.fame || 0);
  S.sectName = sectCleanName(d.sectName);
  S.disciples = discipleClean(d.disciples);   // 제자 (v2.92)
  S.achv = {}; S.achvNote = {};
  if (d.achv && typeof d.achv === 'object') for (const a of ACHV.list){ const t = clamp(d.achv[a.k] | 0, 0, a.tiers.length); if (t) S.achv[a.k] = t; S.achvNote[a.k] = t; }
  // 장비 (v2.70 표준형) — 자리·주머니·아이템 레벨·도감을 유효한 것만 되살린다.
  // v2.66/67 저장의 자리 강화(eqLv·장비 lv)는 장착품의 아이템 레벨로 옮긴다.
  S.equip = {}; for (const ws of eqWearSlots()) S.equip[ws.key] = null;
  S.inv = {}; S.itemLv = {}; S.codex = {};
  const NG = EQUIP.grades.length;
  for (const sl of EQUIP.slots){
    // 자리 이월 — 장신구는 v2.89부터 종류별 자리: 옛 저장의 equip.trinket {k:'ring'}은 S.equip.ring으로
    const wsList = eqWearSlots().filter(ws => ws.sl === sl);
    let it = null;
    for (const ws of wsList){
      const raw = d.equip && (d.equip[ws.key] || (sl.perKind && d.equip[sl.k] && d.equip[sl.k].k === ws.key ? d.equip[sl.k] : null));
      if (raw && typeof raw === 'object' && ws.kinds.some(x => x[0] === raw.k)){ S.equip[ws.key] = { k: raw.k, g: clamp(raw.g|0, 0, NG-1) }; it = it || raw; }
    }
    for (const kd of sl.kinds){
      const k = kd[0];
      if (d.inv && Array.isArray(d.inv[k])) S.inv[k] = Array.from({length:NG}, (_, i) => Math.max(0, d.inv[k][i]|0));
      if (d.itemLv && Array.isArray(d.itemLv[k])) S.itemLv[k] = Array.from({length:NG}, (_, i) => clamp(d.itemLv[k][i]|0, 0, EQUIP.grades[i].lvCap));
      if (d.codex && typeof d.codex === 'object' && d.codex[k]) S.codex[k] = (d.codex[k]|0) & ((1<<NG)-1);
    }
    for (const ws of wsList){
      const w = S.equip[ws.key]; if (!w) continue;
      S.codex[w.k] = (S.codex[w.k]|0) | (1 << w.g);
      const raw = d.equip && (d.equip[ws.key] || (sl.perKind ? d.equip[sl.k] : null));
      const old = (raw && raw.lv) ? raw.lv|0 : (d.eqLv && d.eqLv[sl.k]) ? d.eqLv[sl.k]|0 : 0;   // 옛 자리 강화 이월
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
  // 제자 수익 (v2.92) — 명성보다 **먼저** 잰다: 자리를 비운 사이 명성 단계가 올라 합류한 제자(자질 랜덤)는 그 기간 수익이 없다.
  // (v2.92.6 — 뒤에 재면 같은 저장이라도 정산 은자가 매번 달라 savetest "24h = 8h 상한"이 흔들렸다)
  const sect = (typeof sectYieldPerSec === 'function') ? Math.round(sectYieldPerSec() * sec * SECT.disciple.offRate) : 0;
  S.silver += sect;
  if (typeof fameAdd === 'function') fameAdd(kills * killFame());   // 명성도 쌓인다 (v2.91) — 단계가 오르면 제자가 합류한다(돌아온 뒤부터 수익)
  if (S.karma >= karmaNeed()) S.fatePending = 1;
  return { sec, kills, silver, sect, exp: Math.round(S.rexp - rexp0), fate: S.fatePending };
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
  if (g.sect)   h += '<div class="orow"><span>제자 수익</span><b>+' + fmt(g.sect) + '</b></div>';   // v2.92
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
