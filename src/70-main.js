/* ── 시작 ─────────────────────────────────────────── */
loadImg('hero_idle',  ASSET.idle);
loadImg('hero_run',   ASSET.run);
loadImg('hero_atk',   ASSET.atk);
loadImg('hero_punch', ASSET.punch);   // 기본공격 양주먹 (v2.45)
loadImg('hero_kickside', ASSET.kickside);  // 기본공격 옆차기 (v2.49, 성급 5)
loadImg('hero_kickhigh', ASSET.kickhigh);  // 기본공격 높은차기 (v2.49, 성급 15)
loadImg('hero_flykick',  ASSET.flykick);   // 도약 화염 발차기 (v2.46, 성급 9)
loadImg('hero_firekick', ASSET.firekick);  // 화염 옆차기 (v2.46, 성급 13)
loadImg('hero_cresckick', ASSET.cresckick);  // 초승달 참격 발차기 (v2.47.1, 성급 17)
loadImg('hero_burstkick', ASSET.burstkick);  // 도약 옆차기 (v2.47.1, 성급 21)
loadImg('hero_hit',   ASSET.hit);
loadImg('hero_medit', ASSET.medit);
for (const k in FOES){
  const seen = {};
  for (const a in FOES[k].anim)
    for (const f of FOES[k].anim[a]){
      if (seen[f]) continue; seen[f] = 1;
      loadImg(k + '_' + f, ASSET[k + '_' + f]);
    }
}
for (const z of ZONES)
  for (let i = 1; i <= 3; i++) loadImg(z.k + i, ASSET[z.k + i]);

for (const k in HFX.cast) loadImg('hero_' + HFX.cast[k][0], ASSET[HFX.cast[k][0]]);  // 초식 시전 동작
loadImg('hero_katka', ASSET.katka);          // 권기 정권 오른손 (전 경지 · 양손 교대)
loadImg('hero_katkb', ASSET.katkb);          // 권기 정권 왼손
loadImg('hero_dashfly',  ASSET.dashfly);     // 경공 — 날아가는 자세 (v2.41)
loadImg('hero_dashland', ASSET.dashland);    // 경공 — 착지
loadImg('pashot',    ASSET.pashot);          // 파공권 권기 탄
loadImg('bshot',     ASSET.bshot);           // 암향지 지풍 빔
loadImg('gshield',   ASSET.gshield);         // 건곤이형 태극 원반
$('coinhud').src = ASSET.silver;             // HUD 은자 아이콘
loadImg('ronin_shot', ASSET.ronin_shot);     // 낭인 술병 탄
loadImg('ronin_dust', ASSET.ronin_dust);     // 술병 명중 먼지
loadImg('ghost_shot', ASSET.ghost_shot);     // 원혼 해골 귀화 탄
loadImg('spirit_shot', ASSET.spirit_shot);   // 빙백령 얼음 조각 탄
loadImg('tiger_shot', ASSET.tiger_shot);     // 설산백호 눈보라 숨결 탄
loadImg('guard_shot', ASSET.guard_shot);     // 수호무사 초승달 검기 탄
loadImg('bat_shot', ASSET.bat_shot);         // 석굴 박쥐 음파 고리 탄
loadImg('thunder_shot', ASSET.thunder_shot); // 뇌운신장 갈래 번개 탄
loadImg('stalker_shot', ASSET.stalker_shot); // 죽림 추적자 회전 잎날 탄
for (const t of ['w','g','b','p']) loadImg('aidle_' + t, ASSET['aidle_' + t]);
loadImg('fx_gate', ASSET.fx_gate);
loadImg('fx_aura', ASSET.fx_aura);
loadImg('fx_dark', ASSET.fx_dark);
loadImg('shaman_m2', ASSET.shaman_m2);

// 하단 탭 — 같은 탭 재클릭이면 닫고, 다른 패널은 접는다
function closeSheets(){ closeZonePanel(); closeTrain(); closeArts(); closeRealmPanel();
  if (typeof closeDeepen === 'function') closeDeepen(); }
$('tab-zone').onclick = () => {
  const open = $('zpanel').classList.contains('show');
  closeSheets();
  if (!open) openZonePanel();
};
$('tab-train').onclick = () => {
  const open = $('trpanel').classList.contains('show');
  closeSheets();
  if (!open) openTrain();
};
$('tab-arts').onclick = () => {
  const open = $('apanel').classList.contains('show');
  closeSheets();
  if (!open) openArts();
};
$('aclose').onclick = closeArts;
$('apanel').onclick = e => { if (e.target.id === 'apanel') closeArts(); };
// 스킬 심화창(#dpanel) — 무공 패널의 '스킬 심화' 버튼(63-arts)이 openDeepen을 부른다
$('dclose').onclick = () => closeDeepen();
$('dpanel').onclick = e => { if (e.target.id === 'dpanel') closeDeepen(); };
$('trclose').onclick = closeTrain;
$('trpanel').onclick = e => { if (e.target.id === 'trpanel') closeTrain(); };
// HUD의 경지 표시를 누르면 전체 사다리를 보여준다
$('realm').onclick  = () => { closeSheets(); openRealmPanel(); };
$('rclose').onclick = closeRealmPanel;
$('rpanel').onclick = e => { if (e.target.id === 'rpanel') closeRealmPanel(); };
// [테스트 전용] 시험 패널 — 배속·강제 쓰러짐·저장 초기화를 한곳에 모았다.
// TEST를 끄면 버튼째 사라진다.
let TESTSPEED = 1;
if (TEST){
  $('tbtn').classList.add('on');
  $('tbtn').onclick   = () => $('tpanel').classList.toggle('show');
  $('tclose').onclick = () => $('tpanel').classList.remove('show');
  $('tpanel').onclick = e => { if (e.target.id === 'tpanel') $('tpanel').classList.remove('show'); };
  $('tdown').onclick  = () => { if (!P.dead && S.intro <= 0) downHero(); };
  $('treset').onclick = resetSave;
  const sp = $('tspd');
  for (const m of [1, 2, 3, 5, 10, 100]){
    const b = document.createElement('button');
    b.className = 'sb' + (m === 1 ? ' on' : '');
    b.textContent = 'x' + m;
    b.onclick = () => {
      TESTSPEED = m;
      sp.querySelectorAll('.sb').forEach(e => e.classList.toggle('on', e === b));
    };
    sp.appendChild(b);
  }
}
$('zclose').onclick = closeZonePanel;
$('zpanel').onclick = e => { if (e.target.id === 'zpanel') closeZonePanel(); };
$('obtn').onclick   = closeOffline;
$('fbtn').onclick   = applyFate;         // 기연은 받아들이는 것뿐 — 닫기 없음
$('opanel').onclick = e => { if (e.target.id === 'opanel') closeOffline(); };
addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    closeOffline(); closeSheets();
    $('tpanel').classList.remove('show');    // [테스트 전용]
  }
});

// 저장 불러오기 → 자리 비운 만큼 진행 → 시작
const sv = loadSave();
let og = null;
if (sv){
  applySave(sv);
  const away = (Date.now() - sv.at) / 1000;
  if (away >= OFFLINE.min) og = offlineGains(away);
}
enterStage(true);            // 시작은 연출한다
if (og) showOffline(og);           // 처치 0이어도 보여준다 — 수련치는 시간으로 쌓인다

saveNow();
setInterval(saveNow, SAVE.every * 1000);
// 모바일은 탭을 안 닫고 앱만 바꾼다 — 페이지가 다시 로드되지 않으므로
// 화면이 다시 보이는 순간에도 정산해야 한다 ("오프라인 왜 안 됨"의 원인)
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden'){ hiddenAt = Date.now(); saveNow(); }
  else if (hiddenAt){
    const away = (Date.now() - hiddenAt) / 1000;
    hiddenAt = 0;
    if (away >= OFFLINE.min){ showOffline(offlineGains(away)); saveNow(); }
  }
});
addEventListener('pagehide', saveNow);

let last = performance.now();
function loop(now){
  try{
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // [테스트 전용] 배속 — 같은 dt로 여러 번 밟아야 물리가 안 깨진다
    for (let i = 0; i < (TEST ? TESTSPEED : 1); i++) step(dt);
    render();
    hud();
    if (toastT > 0){ toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  } catch(e){
    if (!window.__err){ window.__err = 1; console.error(e);
      const d = document.createElement('div');
      d.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99;background:rgba(30,12,12,.95);'+
        'color:#ffb3a7;font:11px/1.5 monospace;padding:10px;border-radius:8px;white-space:pre-wrap;';
      d.textContent = e.message + '\n' + (e.stack||'').split('\n')[1];
      document.body.appendChild(d);
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
