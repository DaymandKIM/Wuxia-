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
// 본진 진입 로딩 화면 (v2.94.7) — 그림이 있으면 일러스트, 없으면 문파색 바탕. 전투는 뒤에서 이미 돌아가므로
// 이 화면은 연출일 뿐이다(막지 않는다 — sim·테스트는 DOM 이 없어도 그대로 지나간다).
let hqLoadT = 0;
function showHqLoad(k){
  const el = typeof $ === 'function' && $('hqload'); if (!el) return;
  const sc = SCHOOLS[k] || SCHOOLS.none;
  const art = ASSET['hq_art_' + k], frame = ASSET.hq_load_frame, ink = ASSET.hq_load_ink;
  const im = $('hqart'); if (im){ if (art){ im.src = art; im.hidden = false; } else im.hidden = true; }
  const fr = $('hqframe'); if (fr){ if (frame){ fr.src = frame; fr.hidden = false; } else fr.hidden = true; }
  const ik = $('hqink'); if (ik){ if (ink){ ik.src = ink; ik.hidden = false; } else ik.hidden = true; }
  const nm = $('hqname'); if (nm) nm.textContent = (DUEL.hqName && DUEL.hqName[k]) || sc.n;
  const hz = $('hqhan'); if (hz) hz.textContent = (ARTS.list.find(a => a.school === k && a.frag) || {}).h || '';
  const tp = $('hqtip'); if (tp) tp.textContent = (DUEL.hqDesc && DUEL.hqDesc[k]) || (hqRank(k) + '단');   // 문파 한 줄 소개 (v2.94.18)
  if (el.style && el.style.setProperty) el.style.setProperty('--hqc', sc.c);   // sim 의 DOM 스텁엔 setProperty 가 없다
  el.hidden = false; el.classList.remove('gone');
  hqLoadT = DUEL.load.dur;
}
function hqLoadStep(dt){
  if (hqLoadT <= 0) return;
  hqLoadT -= dt;
  const el = typeof $ === 'function' && $('hqload'); if (!el) return;
  const bar = $('hqbar'); if (bar) bar.style.width = Math.max(0, Math.min(100, (1 - hqLoadT/DUEL.load.dur) * 100)) + '%';
  if (hqLoadT <= DUEL.load.fade) el.classList.add('gone');
  if (hqLoadT <= 0){ el.hidden = true; el.classList.remove('gone'); }
}
// 본진으로 이동 — 단계 10(제자 젠). 사냥터로 돌아오는 건 gotoZone(S.hq=null)
function gotoHq(k){
  if (DUEL.gBase[k] === undefined) return false;
  S.hq = k; S.stage = BOSS_STAGE - 1; S.kills = 0;
  if (typeof closeZonePanel === 'function') closeZonePanel();
  enterStage(true);
  showHqLoad(k);            // 진입 연출 (v2.94.7)
  return true;
}
// 본진에서 처치 — 제자는 조각 1%, 장로·장문인은 보상 묶음 + 단 상승. 돌려주는 값 = 추가 은자
function hqKill(f){
  const k = S.hq; if (!k) return 0;
  if (!f.boss){ if (Math.random() < DUEL.frag.mob) hqFragGain(k, 1); return 0; }
  const r = hqRank(k), master = hqIsMaster(k), first = ((S.hqDone && S.hqDone[k]) | 0) < r;
  // 조각
  // 장로는 확률, 장문인은 확정 (v2.94.19)
  const n = master ? DUEL.frag.master
          : (Math.random() < DUEL.frag.elderCh ? (r >= DUEL.frag.elderHiFrom ? DUEL.frag.elderHi : DUEL.frag.elder) : 0);
  const a = n ? hqFragGain(k, n, true) : null;
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
    toast(((DUEL.hqName && DUEL.hqName[k]) || SCHOOLS[k].n) + ' ' + r + '단 ' + (master ? '장문인' : '장로') + ' 격파' + (a ? '\n' + a.n + ' 조각 +' + n : '') + (pts ? '\n무공점 +' + pts : '') +
          (joined ? '\n' + joined.n + '이(가) 제자로 따라왔다' : ''), { color: SCHOOLS[k].c, sec: 3.2 });
  return bonus;
}
