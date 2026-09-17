/* ── 문파 본진 비무 (v2.94, docs/설계-비무.md 2안) ─────────────────────
   본진 = 특수 사냥터. 지도의 본진 점을 누르면 gotoHq → zone() 이 HQZONE 을 돌려주고 사냥터 루프가 그대로 돈다
   (제자 젠 → 처치 목표 → 장로 = 보스 틀 → 격파 → hqKill 이 단 +1·조각·은자·명성·제자·무공점 → 다시 제자 젠).
   숫자는 00-data DUEL. 오프라인은 제자 제자리 사냥 정산만(65-save 무수정 — 조각·단은 온라인만).
   제자·장로 그림은 주인공 스트립을 문파색으로 물들인 임시(FOES heroStrip) — 제자·장로 시트가 오면 교체. */
function hqRank(k){ return Math.max(1, (S.duel && S.duel[k]) | 0); }
function hqIsMaster(k){ return hqRank(k) % DUEL.masterEvery === 0; }
// 그 문파의 조각 무공 — 안 배운 것 우선, 다 배웠으면 아무것(돌파 재료 예정)
function hqFragArt(k){
  const all = ARTS.list.filter(a => a.school === k && a.frag);
  if (!all.length) return null;
  const left = all.filter(a => !S.arts[a.k]);
  const pool = left.length ? left : all;
  return pool[Math.floor(Math.random() * pool.length)];
}
function hqFragGain(k, n, quiet){
  const a = hqFragArt(k); if (!a) return null;
  if (!S.frag) S.frag = {};
  S.frag[a.k] = (S.frag[a.k] | 0) + n;
  if (!quiet && typeof toast === 'function') toast(a.n + ' 비급 조각 +' + n + '\n' + (S.frag[a.k] | 0) + ' / ' + a.frag);
  return a;
}
// 본진으로 이동 — 단계 10(제자 젠). 사냥터로 돌아오는 건 gotoZone(S.hq=null)
function gotoHq(k){
  if (DUEL.gBase[k] === undefined) return false;
  S.hq = k; S.stage = BOSS_STAGE - 1; S.kills = 0;
  if (typeof closeZonePanel === 'function') closeZonePanel();
  enterStage(true);
  return true;
}
// 본진에서 처치 — 제자는 조각 1%, 장로·장문인은 보상 묶음 + 단 상승. 돌려주는 값 = 추가 은자
function hqKill(f){
  const k = S.hq; if (!k) return 0;
  if (!f.boss){ if (Math.random() < DUEL.frag.mob) hqFragGain(k, 1); return 0; }
  const r = hqRank(k), master = hqIsMaster(k), first = ((S.hqDone && S.hqDone[k]) | 0) < r;
  // 조각
  const n = master ? DUEL.frag.master : (r >= DUEL.frag.elderHiFrom ? DUEL.frag.elderHi : DUEL.frag.elder);
  const a = hqFragGain(k, n, true);
  // 제자 — 3·7단 첫 격파 확정, 그 뒤 20%, 장문인은 자질 상
  let joined = null;
  if (typeof discipleAdd === 'function' && discipleSlotsFree() > 0){
    const sure = master || (first && DUEL.disc.at.includes(r));
    if (sure || Math.random() < DUEL.disc.repeat){
      const d = rollDisciple(k); if (master) d.t = Math.max(d.t, DUEL.disc.masterTalent);
      if (discipleAdd(d, 'duel', true)) joined = d;
    }
  }
  // 무공점
  let pts = 0;
  if (master) pts = DUEL.pts.master; else if (Math.random() < DUEL.pts.elder) pts = 1;
  if (pts) S.ptsBonus = (S.ptsBonus | 0) + pts;
  // 은자 보너스는 이긴 단 기준으로 먼저 잰다(단이 오르면 killSilver 가 커진다) → 단 상승·기록
  const bonus = master ? Math.round(killSilver() * SILVER.bossKill * DUEL.silverMaster) : 0;
  if (!S.duel) S.duel = {}; if (!S.hqDone) S.hqDone = {};
  S.hqDone[k] = Math.max(S.hqDone[k] | 0, r);
  S.duel[k] = r + 1;
  if (typeof toast === 'function')
    toast(SCHOOLS[k].n + ' ' + r + '단 ' + (master ? '장문인' : '장로') + ' 격파' + (a ? '\n' + a.n + ' 조각 +' + n : '') + (pts ? '\n무공점 +' + pts : '') +
          (joined ? '\n' + joined.n + '이(가) 제자로 따라왔다' : ''), { color: SCHOOLS[k].c, sec: 3.2 });
  return bonus;
}
