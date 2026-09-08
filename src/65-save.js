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

// 자리 비운 시간만큼 S를 전진시킨다. 보고용 {sec, kills, stages, zones, silver}를 준다.
function offlineGains(awaySec){
  const sec = Math.min(awaySec, OFFLINE.cap);
  let budget = sec * OFFLINE.rate;
  let kills = 0, stages = 0, zones = 0, silver = 0;
  while (budget > 0){
    if (isBoss()){
      if (budget < OFFLINE.boss) break;              // 남은 시간으론 보스를 못 잡는다
      budget -= OFFLINE.boss;
      stages++;
      silver += killSilver() * SILVER.bossKill;      // 보스 드랍 — 첫 격파 보너스는 직접 잡을 때만
      S.rexp += zone().mul * REALM.bossExp;
      S.karma += FATE.bossKarma;
      if (S.zi + 1 < ZONES.length){
        if (S.unlocked < S.zi + 2) S.unlocked = S.zi + 2;
        S.zi++; zones++;
      }                                              // 마지막 구역은 처음부터 (step과 동일)
      S.stage = 1; S.kills = 0;
      S.best = Math.max(S.best, lv());
      continue;
    }
    const tpk = offKillTime();
    const remain = stage().need - S.kills;
    if (budget >= remain * tpk){
      budget -= remain * tpk;
      kills += remain;
      silver += killSilver() * remain;
      S.rexp += zone().mul * REALM.killExp * remain;   // 오프라인에도 경지가 오른다
      S.karma += zone().mul * FATE.killKarma * remain;
      S.kills = 0; S.stage++; stages++;
      S.best = Math.max(S.best, lv());
    } else {
      const k = Math.floor(budget / tpk);
      kills += k; S.kills += k;
      silver += killSilver() * k;
      S.rexp += zone().mul * REALM.killExp * k;
      S.karma += zone().mul * FATE.killKarma * k;
      budget = 0;
    }
  }
  S.totalKills += kills;
  S.silver += silver;
  if (S.karma >= karmaNeed()) S.fatePending = 1;
  return { sec, kills, stages, zones, silver, fate: S.fatePending };
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
  if (g.stages) h += '<div class="orow"><span>단계 전진</span><b>' + g.stages + '</b></div>';
  if (g.zones)  h += '<div class="orow"><span>구역 돌파</span><b>' + g.zones + '</b></div>';
  if (g.fate)   h += '<div class="orow"><span>✦ 기연</span><b>기다리고 있다</b></div>';
  $('obody').innerHTML = h;
  $('opanel').classList.add('show');
}
function closeOffline(){ $('opanel').classList.remove('show'); maybeFate(); }
