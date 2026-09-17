/* ── 시작 ─────────────────────────────────────────── */
loadImg('hero_idle',  ASSET.idle);
loadImg('hero_run',   ASSET.run);
loadImg('hero_atk',   ASSET.atk);
loadImg('hero_punch',    ASSET.punch);     // 기본공격 주먹 3종 (v2.76 사용자 시트 hero_punch4) — 정권
loadImg('hero_punchdbl', ASSET.punchdbl);  // 연환권
loadImg('hero_punchup',  ASSET.punchup);   // 승룡권
loadImg('hero_qipunch',  ASSET.qipunch);   // 옛 권기 정권 오른손·왼손 (hero_fx, v2.76.2 되살림 — "기존 것들도 살려서")
loadImg('hero_qipunchb', ASSET.qipunchb);
loadImg('hero_kickside2',  ASSET.kickside2);   // 옛 발차기 3종 (hero_kick2, v2.76.2 되살림)
loadImg('hero_kickround2', ASSET.kickround2);
loadImg('hero_kickhigh2',  ASSET.kickhigh2);
loadImg('hero_kickside', ASSET.kickside);  // 기본공격 옆차기 (v2.76.1 사용자 시트 hero_kick3, 처음부터)
loadImg('hero_kickround', ASSET.kickround); // 기본공격 돌려차기 (hero_kick3, 성급 5)
loadImg('hero_swordthrust', ASSET.swordthrust); // 검 장착 기본공격 3종 (v2.72, 사용자 시트 hero_sword2)
loadImg('hero_swordslash',  ASSET.swordslash);
loadImg('hero_swordspin',   ASSET.swordspin);
loadImg('hero_fansweep',  ASSET.fansweep);   // 부채 장착 기본공격 3종 (v2.72.1, 사용자 시트 hero_fan2)
loadImg('hero_fanspin',   ASSET.fanspin);
loadImg('hero_fanstrike', ASSET.fanstrike);
loadImg('hero_saberslash', ASSET.saberslash);   // 도 장착 기본공격 3종 (v2.72.2, 사용자 시트 hero_saber2)
loadImg('hero_sabersmash', ASSET.sabersmash);
loadImg('hero_saberspin',  ASSET.saberspin);
loadImg('hero_spearthrust', ASSET.spearthrust);   // 창 장착 기본공격 3종 (v2.72.3, 사용자 시트 hero_spear2)
loadImg('hero_spearsweep',  ASSET.spearsweep);
loadImg('hero_spearspin',   ASSET.spearspin);
loadImg('hero_staffswing', ASSET.staffswing);   // 봉 장착 기본공격 3종 (v2.72.4, 사용자 시트 hero_staff2)
loadImg('hero_staffsweep', ASSET.staffsweep);
loadImg('hero_staffspin',  ASSET.staffspin);
loadImg('hero_kickhigh', ASSET.kickhigh);  // 기본공격 뛰어차기 (hero_kick3, 성급 10)
loadImg('hero_flykick',  ASSET.flykick);   // 도약 화염 발차기 (v2.46, 성급 9)
loadImg('hero_firekick', ASSET.firekick);  // 화염 옆차기 (v2.46, 성급 13)
loadImg('hero_cresckick', ASSET.cresckick);  // 초승달 참격 발차기 (v2.47.1, 성급 17)
loadImg('hero_burstkick', ASSET.burstkick);  // 도약 옆차기 (v2.47.1, 성급 21)
loadImg('hero_hit',   ASSET.hit);
loadImg('hero_medit', ASSET.medit);
for (const h of SECT.halls) for (let st = 0; st < SECT.scene.stageLv.length; st++) if (ASSET['hall_' + h.k + '_' + st]) loadImg('hall_' + h.k + '_' + st, ASSET['hall_' + h.k + '_' + st]);   // 문파 전각 단계별 그림 (v2.92.2 시트 → v2.92.7 차분, v2.92.8 5단계)
if (ASSET[SECT.scene.bg]) loadImg(SECT.scene.bg, ASSET[SECT.scene.bg]);
if (SECT.discSheet) for (const b of [SECT.discSheet.walk, SECT.discSheet.train]) for (let i = 0; i < SECT.discSheet.n; i++) if (ASSET[b + i]) loadImg(b + i, ASSET[b + i]);   // 마당 제자 전용 시트 (v2.94.17)   // 문파 터 배경 한 장 (v2.92.6, 사용자 3/4 시점 마당 — sectbg.py)
for (const k in FOES){
  if (FOES[k].heroStrip) continue;   // 주인공 스트립을 빌리는 몹(본진 제자·장로) — 파일 없음 (v2.94)
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
// 탭바 아이콘 (v2.63.4) — 에셋 없으면 글자만
for (const [id, k] of [['tab-arts','tab_arts'],['tab-train','tab_train'],['tab-equip','tab_equip'],['tab-sect','tab_sect'],['tab-zone','tab_zone']]){
  const im = $(id).querySelector('.ti'); if (!im) continue;
  const src = ASSET[k] || (k === 'tab_sect' ? ASSET.sch_bamboo : null);   // 문파 탭은 시트가 올 때까지 청죽문 엠블럼 (v2.91.1)
  if (src) im.src = src; else im.remove();
}
if (ASSET.rest_card) $('oart').src = ASSET.rest_card; else $('oart').style.display = 'none';   // 복귀 카드 그림 (v2.63.4)
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
// 배경 소품 스프라이트 — 구역 시트에서 추출 (v2.59)
for (const z in PROPS){ const D = PROPS[z];
  if (D.kind === 'sprite') for (const p of D.pick) loadImg(p[0], ASSET[p[0]]); }
// 상단 원경 — 시트가 들어온 구역만 (에셋 없으면 건너뛴다)
for (const z in BACKDROP.keys){ const k = BACKDROP.keys[z]; if (ASSET[k]) loadImg(k, ASSET[k]); }
for (const z in BOSSFACE){ const k = BOSSFACE[z]; if (ASSET[k]) loadImg(k, ASSET[k]); }   // 보스 초상 컷인
// 바닥 텍스처 — 시트가 들어온 구역만
for (const z in GROUNDTEX.keys){ const k = GROUNDTEX.keys[z]; if (ASSET[k]) loadImg(k, ASSET[k]); }

// 하단 탭 — 같은 탭 재클릭이면 닫고, 다른 패널은 접는다
function closeSheets(){ closeZonePanel(); closeTrain(); closeArts(); closeRealmPanel(); closeEquip(); closeMenu(); closeAchv(); closeCode(); closeSect();
  if (typeof closeDeepen === 'function') closeDeepen();
  const tp = $('tpanel'); if (tp) tp.classList.remove('show'); }   // [테스트 전용] 시험 패널이 DOM 뒤라 열린 채면 다른 패널을 덮어 못 눌렀다(v2.70.4)
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
$('tab-equip').onclick = () => {
  const open = $('epanel').classList.contains('show');
  closeSheets();
  if (!open) openEquip();
};
$('tab-sect').onclick = () => {                 // 문파 (v2.91) — 같은 탭 재클릭이면 마당을 닫는다 (v2.92.4 시트가 아니라 sectView로)
  const open = sectView;
  closeSheets();
  if (!open) openSect();
};
$('sclose').onclick = closeSectSheet;                         // 시트 ✕ = 시트만 닫고 마당은 그대로 (v2.92.4)
$('sclose2').onclick = closeSect;                             // 현판 ✕ = 마당 닫기
$('sfame').onclick = openSectSheet; $('sdisc').onclick = openSectSheet;
$('sedit2').onclick = () => { openSectSheet(); const r = $('snamerow'); if (r){ r.hidden = false; const i = $('snamein'); i.value = S.sectName || ''; i.focus(); } };
// 전각 팝업 버튼 — 꾹 누르면 연속 (v2.92.1)
{ const el = $('hpbuy'); const stop = () => { if (hallPopIv){ clearInterval(hallPopIv); hallPopIv = 0; } };
  el.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); if (hallPopK && buildHall(hallPopK)){ refreshHallPop(); refreshSect(); } stop();
    hallPopIv = setInterval(() => { if (hallPopK && buildHall(hallPopK)){ refreshHallPop(); refreshSect(); } else stop(); }, 180); };
  el.onpointerup = el.onpointerleave = el.onpointercancel = stop; }
$('hpclose').onclick = closeHallPop;
$('hpop').onpointerdown = e => e.stopPropagation();
cv.addEventListener('pointerdown', e => {                 // 문파 터 화면 탭 — 전각·제자 (v2.92)
  if (typeof sectView === 'undefined' || !sectView) return;
  const r = cv.getBoundingClientRect(); if (!r.width) return;
  sectTap((e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH);
});
$('sedit').onclick  = () => { const r = $('snamerow'); if (!r) return; r.hidden = !r.hidden; if (!r.hidden){ const i = $('snamein'); i.value = S.sectName || ''; i.focus(); } };   // 이름 바꾸기 (v2.91.2)
$('spanel').onclick = e => { if (e.target.id === 'spanel') closeSectSheet(); };
$('eclose').onclick = closeEquip;
$('epanel').onclick = e => { if (e.target.id === 'epanel') closeEquip(); };
$('aclose').onclick = closeArts;
$('apanel').onclick = e => { if (e.target.id === 'apanel') closeArts(); };
// 스킬 심화창(#dpanel) — 무공 패널의 '스킬 심화' 버튼(63-arts)이 openDeepen을 부른다
$('dclose').onclick = () => closeDeepen();
$('dpanel').onclick = e => { if (e.target.id === 'dpanel') closeDeepen(); };
$('trclose').onclick = closeTrain;
$('trpanel').onclick = e => { if (e.target.id === 'trpanel') closeTrain(); };
// HUD의 경지 표시를 누르면 전체 사다리를 보여준다
$('realm').onclick  = () => { closeSheets(); openRealmPanel(); };
// ≡ 메뉴 (v2.85) — 같은 버튼 재클릭이면 닫고, 다른 시트는 접는다
$('menubtn').onclick = () => { const open = $('mpanel').classList.contains('show'); closeSheets(); if (!open) openMenu(); };
$('mpanel').onclick  = e => { if (e.target.id === 'mpanel') closeMenu(); };
$('msound').onclick  = () => { S.mute = !S.mute; menuHud(); saveNow(); toast(S.mute ? '효과음을 껐다' : '효과음을 켰다'); };
$('mqual').onclick  = () => { S.__qualManual = true; setQual((qualStep() + 1) % QUALITY.steps.length); menuHud(); saveNow();
                              toast('화질 ' + QUALITY.name[qualStep()] + '\n낮을수록 부드럽다'); };   // (v2.95.5)
$('msave').onclick   = () => { const ok = saveNow(); closeMenu();   // 결과를 그대로 말한다 (v2.90.2 "저장이 안 됨" — 막힌 브라우저에서 "저장했다"고 거짓말했다)
  toast(ok ? '저장했다' : '저장 못 했다\n브라우저가 저장소를 막았다\n≡ 저장 코드로 옮긴다'); };
$('mcode').onclick   = () => { closeSheets(); openCode(); };        // 저장 코드 (v2.90.2)
$('ccopy').onclick   = copyCode;
$('cload').onclick   = pasteCode;
$('cclose').onclick  = closeCode;
$('cpanel').onclick  = e => { if (e.target.id === 'cpanel') closeCode(); };
$('mach').onclick    = () => { closeSheets(); openAchv(); };   // 업적 (v2.90)
$('vclose').onclick  = closeAchv;
$('vpanel').onclick  = e => { if (e.target.id === 'vpanel') closeAchv(); };
$('mstat').onclick   = () => { toast('처치 ' + fmt(S.totalKills) + '\n쓰러짐 ' + S.downs + '\n기연 ' + (S.fates|0)); };
$('rclose').onclick = closeRealmPanel;
$('rpanel').onclick = e => { if (e.target.id === 'rpanel') closeRealmPanel(); };
// [테스트 전용] 시험 패널 — 배속·강제 쓰러짐·저장 초기화를 한곳에 모았다.
// TEST를 끄면 버튼째 사라진다.
let TESTSPEED = 1;
if (TEST){
  $('tbtn').classList.add('on');
  $('tbtn').onclick   = () => { const open = $('tpanel').classList.contains('show'); closeSheets(); if (!open) $('tpanel').classList.add('show'); };
  $('tclose').onclick = () => $('tpanel').classList.remove('show');
  $('tpanel').onclick = e => { if (e.target.id === 'tpanel') $('tpanel').classList.remove('show'); };
  $('tdown').onclick  = () => { if (!P.dead && S.intro <= 0) downHero(); };
  $('treset').onclick = resetSave;
  // 보상 N일 (v2.95.7, 사용자 "테스트 모드에 보상 1/3/7/15/30/100/200/365일 넣어") —
  // 그만큼 자리를 비운 셈 치고 오프라인 정산을 그대로 돌린다. **8시간 상한은 건너뛴다**(그래야 날수가 의미가 있다).
  const gv = $('tgive');
  if (gv) for (const d of TESTGIVE.days){
    const b = document.createElement('button');
    b.className = 'sb'; b.style.padding = '6px 9px'; b.textContent = d + '일';
    b.onclick = () => {
      const g = offlineGains(d * 86400, true);
      saveNow();
      $('tpanel').classList.remove('show');
      showOffline(g);
    };
    gv.appendChild(b);
  }
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

// iframe(아티팩트·앱 웹뷰)이면 화면 맨 위 여백을 깔아 둔다 (v2.95.8) — env(safe-area-inset-top) 이 0 으로 오는 자리다
try{ if (window.self !== window.top) document.documentElement.style.setProperty('--satmin', SAFETOP_IFRAME + 'px'); }catch(e){
  document.documentElement.style.setProperty('--satmin', SAFETOP_IFRAME + 'px');   // 접근 자체가 막히면 그것도 iframe 이다
}

// 저장 불러오기 → 자리 비운 만큼 진행 → 시작
const sv = loadSave();
let og = null;
if (sv){
  applySave(sv);
  const away = (Date.now() - sv.at) / 1000;
  if (away >= OFFLINE.min) og = offlineGains(away);
}
eqStarter();                 // 시작 장비 — 빈 자리에 일반 하나(새 게임·옛 저장 공통, v2.70.2)
enterStage(true);            // 시작은 연출한다
// 타이틀 화면 (v2.65) — 배경 일러스트가 있으면 덮고, 누르면 걷힌다. 게임은 뒤에서 돈다.
// 복귀 카드는 걷힌 뒤에 — 안 그러면 타이틀 뒤에서 6초 만에 스스로 닫혀 못 본다.
let titleOn = false;
function closeTitle(){
  if (!titleOn) return; titleOn = false;
  const t = $('title'); t.classList.add('gone');
  setTimeout(() => { t.hidden = true; }, 520);
  startLoad();                       // 로딩 화면 — 바가 다 차면 복귀 카드 (v2.95.6)
}
// 시작 로딩 화면 (v2.95.6, 사용자 "그 스타일이면 게임 시작할 때도") — 입산하면 지금 구역 그림이
// 다 준비될 때까지 가려 준다. 상단 바·글꼴·시트가 자리를 잡는 첫 프레임을 덮는 값도 있다
// (사용자 "처음 시작할 때 버튼 이후 화면이 뜨면서 뭔가 깨지는 느낌").
function startLoad(){
  const z = ZONES[S.zi] || ZONES[0];
  showLoad({
    art:   ASSET.title_bg || ASSET[BACKDROP.keys[z.k]],
    frame: ASSET.hq_load_frame,
    name:  z.n,
    tip:   LOADSCR.startTip,
    color: LOADSCR.color,
    keys:  zoneLoadKeys(z.k),
    then:  () => { if (og) showOffline(og); },   // 처치 0이어도 보여준다 — 수련치는 시간으로 쌓인다
  });
}
if (ASSET.title_bg && $('title')){
  titleOn = true;
  $('tbg').src = ASSET.title_bg;
  if (ASSET.hero_face) $('tface').src = ASSET.hero_face; else $('tface').hidden = true;
  $('title').hidden = false;
  $('title').onpointerdown = e => { e.preventDefault(); closeTitle(); };
} else startLoad();                    // 타이틀 그림이 없으면 로딩 화면부터 (v2.95.6)

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
// 화질 자동 낮추기 (v2.95.5) — 보는 내내 재지 않는다. 표본 하나를 모아 한 번 판단하고 끝낸다.
// 손으로 고른 적이 있으면(S.qual 이 저장에서 왔으면) 건드리지 않는다.
let qSample = [], qChecked = false, qLast = 0;
function qualWatch(ms){
  if (qChecked || !QUALITY.auto || S.__qualManual) return;
  if (ms > 0 && ms < 400) qSample.push(ms);
  if (qSample.length < QUALITY.sampleN) return;
  qChecked = true;
  const s = qSample.sort((a, b) => a - b), mid = s[(s.length * 0.5) | 0];
  if (mid > QUALITY.slowMs && qualStep() < QUALITY.steps.length - 1){
    setQual(qualStep() + 1);
    qSample = []; qChecked = false;            // 한 칸 내리고 다시 재 본다(최저 칸까지)
    if (typeof toast === 'function') toast('화면이 버거워 화질을 낮췄다\n≡ 메뉴에서 바꿀 수 있다');
  }
}

function loop(now){
  try{
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    qualWatch((now - (qLast || now))); qLast = now;
    // 미세 경직 (v2.61) — 치명타 순간 step만 멈추고 render는 계속한다.
    // 배속 중엔 그만큼 빨리 풀려 배속과 충돌하지 않는다.
    if (hitstopT > 0) hitstopT -= dt * (TEST ? TESTSPEED : 1);
    // [테스트 전용] 배속 — 같은 dt로 여러 번 밟아야 물리가 안 깨진다
    else for (let i = 0; i < (TEST ? TESTSPEED : 1); i++) step(dt);
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
