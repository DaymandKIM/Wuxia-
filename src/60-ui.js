/* ── HUD ──────────────────────────────────────────── */
// 은자 아이콘 — "글자 말고 아이콘으로" (사용자). 은원보 그림을 인라인으로 쓴다
const coin = () => '<img class="coin" src="' + ASSET.silver + '" alt="은자">';
let toastT = 0;
// opt {icon, color, sec} — 아이콘이 있으면 그림 + 글자(v2.86, 사용자: "장비 얻을 때 팝업에 이미지를 넣자"), 테두리는 color
function toast(msg, opt){
  const el = $('toast');
  if (opt && opt.icon){
    // 노드로 조립 — innerHTML은 sim의 DOM 스텁에서 자식을 안 만들어 lastChild가 없었다(v2.88 sim 오류)
    el.textContent = '';
    const im = document.createElement('img'); im.className = 'tico'; im.src = opt.icon; im.alt = '';
    const sp = document.createElement('span'); sp.textContent = msg;
    el.appendChild(im); el.appendChild(sp);
    el.classList.add('pic');
  } else { el.textContent = msg; el.classList.remove('pic'); }
  el.style.borderColor = (opt && opt.color) || '';
  el.style.boxShadow = (opt && opt.color) ? '0 0 14px ' + opt.color + '66' : '';
  el.classList.add('show');
  toastT = (opt && opt.sec) || 1.6;
}

function hud(){
  // 진입 연출 중엔 HUD를 감춘다
  const showing = S.intro <= 0;
  $('topbar').style.opacity = showing ? '1' : '0';   // v2.85 상단 바(HUD·≡ 포함)
  $('tabs').style.opacity = showing ? '1' : '0';
  // 스킬창·시험 버튼은 패널이 열리면 감춘다 — 패널 위로 떠서 스탯 줄·무공
  // 칸을 가린다는 피드백(v2.33). 어느 시트든 열려 있으면 숨긴다.
  const panelOpen = ['zpanel','trpanel','apanel','dpanel','rpanel','tpanel','opanel','fpanel','epanel','mpanel','vpanel','cpanel']   // epanel 누락 → 장비 탭 위로 스킬창 쿨이 비쳤다(v2.70.4)
    .some(id => $(id) && $(id).classList.contains('show'));
  const bars = showing && !panelOpen;
  const sb = $('sbar'); sb.style.opacity = bars ? '1' : '0'; sb.style.pointerEvents = bars ? '' : 'none';
  const tb = $('tbtn'); if (tb){ tb.style.opacity = bars ? '1' : '0'; tb.style.pointerEvents = bars ? '' : 'none'; }   // [테스트 전용]
  if (!showing) return;
  trainHud();                                    // 수련 탭 알림점·열린 패널 갱신
  artsHud();                                     // 무공 탭 알림점·열린 패널 갱신
  if (typeof equipHud === 'function') equipHud();  // 장비 탭 (v2.66)
  // [테스트 전용] 시험 버튼은 패널이 열려 있으면 숨긴다 (v2.69.8 — CSS :has가 구형 크로뮴에서 안 먹혀 JS로)
  const tbtnEl = $('tbtn');
  if (tbtnEl) tbtnEl.classList.toggle('hide', ['zpanel','trpanel','apanel','dpanel','rpanel','epanel','mpanel','vpanel','cpanel'].some(id => { const e = $(id); return e && e.classList.contains('show'); }));
  if (typeof deepenHud === 'function') deepenHud();  // 스킬 심화창(트리) 갱신
  menuHud();                                     // ≡ 메뉴 (v2.85)
  if (typeof achvHud === 'function') achvHud(1/60);   // 업적 달성 알림 (v2.90)
  skillHud();                                    // 스킬창 — 초식 쿨다운

  const st = stage();
  if (isBoss()){
    $('stage').textContent = zone().n + ' · 보스';
    const b = S.foes.find(f=>f.boss && !f.dead);
    $('kills').textContent = b ? zone().boss : '접근 중';
  } else {
    $('stage').textContent = zone().n + ' ' + S.stage + '단계';
    $('kills').textContent = S.kills + ' / ' + stageNeed();
  }
  $('hpt').textContent = fmt(Math.ceil(P.hp)) + ' / ' + fmt(P.hpMax);
  $('silvern').textContent = fmt(S.silver);
  const ri = realmInfo();
  $('realm').textContent = ri.name + ' · ' + Math.floor(ri.cur / ri.need * 100) + '%';
  $('hp').firstElementChild.style.width = (P.hp/P.hpMax*100).toFixed(1) + '%';
  const b2 = S.foes.find(f=>f.boss && !f.dead);
  $('kn').firstElementChild.style.width =
    (isBoss() ? (b2 ? b2.hp/b2.hpMax*100 : 0) : S.kills/stageNeed()*100).toFixed(1) + '%';
  $('kn').firstElementChild.style.background =
    isBoss() ? 'linear-gradient(90deg,#8c3f2f,#c86a52)' : 'linear-gradient(90deg,#3f7fb8,#69a8dd)';
}

/* ── 스킬창 — 익힌 초식의 쿨다운 표시 ──────────────
   동시 시전 금지(CASTQ)와 세트다: 쿨이 도는지 눈에 보여야 기다림이 읽힌다.
   덮개가 위에서부터 걷히고, 준비되면 테두리가 빛난다. 건곤이형도 보인다(피격 발동).
*/
let sbarSig = '';
const sbarEls = {};
function skillHud(){
  const arts = ARTS.list.filter(a => a.type === 'active' && S.arts[a.k]);
  const sig = arts.map(a => a.k).join(',');
  if (sig !== sbarSig){                       // 익힌 목록이 바뀔 때만 다시 만든다
    sbarSig = sig;
    const bar = $('sbar');
    bar.innerHTML = '';
    for (const k in sbarEls) delete sbarEls[k];
    if (arts.length){
      // 오토/수동 토글 — 눌러 발동 모드를 바꾼다 (사용자 요청)
      const t = document.createElement('button');
      t.className = 'smode';
      t.onclick = () => { S.skillManual = !S.skillManual; saveNow(); };
      bar.appendChild(t);
      sbarEls.__mode = t;
    }
    for (const a of arts){
      const d = document.createElement('div');
      d.className = 'sk';
      const col = (SCHOOLS[a.school] || SCHOOLS.none).c;
      d.style.color = col;                      // rdy 테두리·글자색 = 문파색
      const g = document.createElement('span'); g.className = 'g';
      g.textContent = a.h[0];                   // 한자 한 글자 (표 타일과 같은 표기)
      g.style.color = col;
      if (ASSET['art_' + a.k]){                 // 무공 아이콘 메달 (v2.63) — 있으면 한자 대신
        const im = document.createElement('img'); im.className = 'gi'; im.src = ASSET['art_' + a.k]; im.alt = '';
        d.appendChild(im); g.style.display = 'none';
      }
      const m = document.createElement('i'); m.className = 'cdm';
      const s = document.createElement('b'); s.className = 'cds';
      d.appendChild(g); d.appendChild(m); d.appendChild(s);
      // 수동 모드에선 눌러서 시전한다 (반격형 건곤이형은 피격 발동이라 제외)
      if (!a.ref) d.onclick = () => { if (S.skillManual) castByHand(a.k); };
      // 툴팁 (v2.63.6, "마우스 오버하면 무슨 스킬인지") — 데스크톱은 오버, 폰은 누르는 동안
      d.style.pointerEvents = 'auto';
      d.onpointerenter = () => showSkillTip(a, d);
      d.onpointerleave = hideSkillTip;
      d.onpointerdown  = () => showSkillTip(a, d);
      bar.appendChild(d);
      sbarEls[a.k] = { d, m, s };
    }
  }
  if (sbarEls.__mode){
    sbarEls.__mode.textContent = S.skillManual ? '수동' : '자동';
    sbarEls.__mode.classList.toggle('man', S.skillManual);
    sbarEls.__mode.classList.toggle('auto', !S.skillManual);   // 자동 = 불 켜짐 (v2.85)
  }
  for (const a of arts){
    const e = sbarEls[a.k]; if (!e) continue;
    const cd = Math.max(0, P.artCd[a.k] || 0);
    // 쿨다운을 시계 방향 원형 스윕으로 — 남은 비율만큼 어두운 부채꼴이 준다
    const deg = (cd / a.cd) * 360;
    e.m.style.background = 'conic-gradient(rgba(7,10,15,.72) ' + deg.toFixed(1) + 'deg, rgba(7,10,15,0) ' + deg.toFixed(1) + 'deg)';
    e.s.textContent = cd > 0 ? Math.ceil(cd) : '';   // 쿨 중엔 초만, 다 차면 글자만
    e.d.classList.toggle('cooling', cd > 0);         // 쿨 중엔 한자 숨김(겹침 방지)
    e.d.classList.toggle('rdy', cd <= 0);
    // 수동 + 준비됨 + 반격형 아님 → 누를 수 있음을 표시
    e.d.classList.toggle('tap', S.skillManual && cd <= 0 && !a.ref);
  }
}

/* ── 구역 이동 ─────────────────────────────────────
   진입은 죽림과 같은 슬라이드 연출을 쓴다.
*/
// intro: 구역 진입 연출을 보여줄지. 같은 구역 안 일반 단계 이동은 연출을
// 건너뛴다 (v2.33 — "단계마다 3초 연출이 50번, 건너뛰기 없음"이라는 피드백.
// 단계는 상단 표시로 충분). 구역이 바뀌거나 보스 단계일 때만 연출한다.
function enterStage(intro){
  if (!S.reach) S.reach = [];
  S.reach[S.zi] = Math.max(S.reach[S.zi] | 0, S.stage);   // 가 본 단계 — 사냥터 패널 선택 범위
  P.hpMax = heroHpMax(); P.hp = P.hpMax;
  P.x = 0; P.y = 0; P.anim = 'idle'; P.af = 0;
  S.camX = 0; S.camY = -24;
  S.foes.length = 0; S.fx.length = 0; S.shots.length = 0; S.bossAlive = false;
  if (intro) beginIntro(isBoss() ? zone().boss : (S.stage + '단계'), zone().n);
  else { S.intro = 0; if (!isBoss()) spawnFoe(); }   // 연출 생략 시 바로 적을 채워 빈 화면을 줄인다
  // 인연이 차 있으면 기연이 나타난다.
  // sim.js 등 검증 도구는 64-fate 없이 60-ui까지만 이어붙이므로 가드가 필요하다.
  if (typeof maybeFate === 'function') maybeFate();
}

function stageReach(i){ return TEST ? BOSS_STAGE : Math.max(1, (S.reach && S.reach[i]) | 0); }   // 그 구역에서 고를 수 있는 최고 단계
function gotoZone(i, st){
  if (!TEST && (i >= S.unlocked || (st || 1) > stageReach(i))) return;
  S.zi = i; S.stage = st || 1; S.kills = 0;
  // [테스트 전용] 앞 구역으로 점프하면 걸맞은 수련치를 채워준다 — 안 그러면 못 버틴다
  if (TEST) S.rexp = Math.max(S.rexp, seedExp(i, st));
  closeZonePanel();
  enterStage(true);            // 구역 이동은 연출한다
}

// 사냥터 = 여정 지도 (v2.56) — 5구역을 지그재그 길로 잇고 구역색 원형 노드에
// 진행 상태(잠김·수련 중·클리어)를 얹는다. 목록보다 "어디쯤 왔나"가 한눈에.
let zoneSel = null;   // 지도에서 고른 구역 — 누르면 바로 가지 않고 아래 단계 줄에서 고른다 (v2.70.6, 사용자)
function buildZonePanel(){
  const b = $('zbody');
  const Z = ZONES, n = Z.length;
  if (zoneSel === null || zoneSel >= n || (!TEST && zoneSel >= S.unlocked)) zoneSel = S.zi;
  // 여정 지도 일러스트(v2.69, 사용자 그림) — 있으면 그림 위 지형 자리(ZONES.map)에 노드를 얹고,
  // 없으면 옛 지그재그 노드망으로 그린다.
  const art = !!ASSET.zone_map && Z.every(z => z.map);
  const W = 360, topY = 54, stepY = 92, r = art ? 21 : 30, H = art ? 360 : topY + (n-1)*stepY + 60;
  const nx = i => art ? Z[i].map[0] : (i % 2 === 0 ? 106 : 254);   // 지그재그 좌우
  const ny = i => art ? Z[i].map[1] : topY + i*stepY;
  const FONT = "'Jua','Apple SD Gothic Neo',sans-serif";
  let svg = '<svg id="zmap" viewBox="0 0 ' + W + ' ' + H +
    '" preserveAspectRatio="xMidYMin meet" style="width:100%;height:auto;display:block">';
  if (art) svg += '<image href="' + ASSET.zone_map + '" x="0" y="0" width="360" height="360" preserveAspectRatio="none"/>';
  // 여정 길 — 아래로 이어지는 곡선(그림 지도엔 길이 이미 그려져 있어 생략).
  // 다음 구역이 열렸으면 밝은 길, 아니면 흐린 길.
  for (let i = 0; !art && i < n-1; i++){
    const x1=nx(i), y1=ny(i), x2=nx(i+1), y2=ny(i+1);
    const lit = TEST || (i+1) < S.unlocked;
    svg += '<path d="M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + (y1+stepY*0.55) +
           ', ' + x2 + ' ' + (y2-stepY*0.55) + ', ' + x2 + ' ' + y2 + '" fill="none" stroke="' +
           (lit ? '#c9b98a' : '#39424e') + '" stroke-width="' + (lit?4:3) +
           '" stroke-dasharray="2 8" stroke-linecap="round" opacity="' + (lit?0.9:0.55) + '"/>';
  }
  // 구역 노드
  for (let i = 0; i < n; i++){
    const z=Z[i], x=nx(i), y=ny(i), col=z.ground;
    const open = TEST || i < S.unlocked;
    const here = i === S.zi, sel = i === zoneSel;
    const done = !!(S.bossDone && S.bossDone[i]);
    if (sel && open)   // 고른 구역 — 금 고리
      svg += '<circle cx="' + x + '" cy="' + y + '" r="' + (r+4) + '" fill="none" stroke="#ffd76a" stroke-width="3" style="pointer-events:none"/>';
    if (here)   // 수련 중 — 맥동 고리
      svg += '<circle class="zpulse" cx="' + x + '" cy="' + y + '" r="' + (r+6) +
             '" fill="none" stroke="' + col + '" stroke-width="2.5"/>';
    svg += '<circle class="znode' + (open?'':' lock') + '" data-z="' + i + '" cx="' + x + '" cy="' + y +
           '" r="' + r + '" fill="' + (open?col:'#161c24') + '" stroke="' +
           (here?'#f0e2b8':(open?'#0c130e55':'#3a4756')) + '" stroke-width="' + (here?3.5:2) +
           '"' + (open?' style="cursor:pointer"':'') + '/>';
    // 양피지 위에선 글자에 밝은 테를 둘러 읽히게 한다 (paint-order)
    const halo = art ? ' stroke="#f3e9d2" stroke-width="3" paint-order="stroke"' : '';
    if (open){
      svg += '<text class="zn" data-z="' + i + '" x="' + x + '" y="' + (y+1) +
             '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT +
             '" font-weight="700" font-size="' + (art ? 14 : 17) + '" fill="#12161c" style="pointer-events:none">' + z.n + '</text>';
    } else {
      svg += '<text x="' + x + '" y="' + (y+1) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (art ? 16 : 20) + '" style="pointer-events:none">🔒</text>';
    }
    // 단계 범위 캡션
    svg += '<text class="zd" x="' + x + '" y="' + (y+r+13) + '" text-anchor="middle" font-family="' + FONT +
           '" font-size="11" fill="' + (art ? (open?'#2a2418':'#6b6252') : (open?'#c3cbd5':'#4a5462')) + '"' + halo + ' style="pointer-events:none">' +
           (i*10+1) + '~' + (i*10+10) + '단계</text>';
    // 상태 — 클리어 체크 / 수련 중
    if (done)
      svg += '<text x="' + (x+r-3) + '" y="' + (y-r+9) + '" text-anchor="middle" font-size="15" fill="#7fc78f" style="pointer-events:none">✓</text>';
    if (here)
      svg += '<text x="' + x + '" y="' + (y+r+26) + '" text-anchor="middle" font-family="' + FONT +
             '" font-weight="700" font-size="11" fill="' + (art ? '#7a2e1e' : col) + '"' + halo + ' style="pointer-events:none">▶ 수련 중</text>';
  }
  svg += '</svg>';
  // 단계 줄 — 고른 구역의 단계. 가 본 단계까지만 고를 수 있다(TEST는 전부). 여기서 골라야 이동한다.
  const zi = zoneSel, reach = stageReach(zi), zopen = TEST || zi < S.unlocked;
  let strip = '<div id="zstage"><div class="zsttl">' + ZONES[zi].n + ' 단계 고르기' + (TEST ? ' <small>(테스트)</small>' : ' <small>가 본 곳까지</small>') + '</div><div class="zst">';
  const stBtn = (k, label, cls) => {
    const can = zopen && k <= reach, cur = S.zi === zi && S.stage === k;
    return '<button class="sb' + cls + (cur ? ' on' : '') + (can ? '' : ' lock') + '" data-z="' + zi + '" data-s="' + k + '"' + (can ? '' : ' disabled') + '>' + label + '</button>';
  };
  for (let k = 1; k <= STAGES.length; k++) strip += stBtn(k, k, '');
  strip += stBtn(BOSS_STAGE, '보스', ' bs');
  strip += '</div></div>';
  const note = '<div class="znote">' + (TEST
      ? '테스트 모드 — 구역을 누르고 아래에서 단계를 고르면 이동한다.'
      : '구역을 누르고 아래에서 가 본 단계를 고르면 이동한다. ' + (ZONES.length > S.unlocked ? '구역을 끝까지 깨면 다음 길이 열린다.' : '모든 구역을 열었다.')) + '</div>';
  b.innerHTML = svg + strip + note;
  b.querySelectorAll('.znode[data-z], .zn[data-z]').forEach(el => {
    el.onclick = () => { const i = parseInt(el.dataset.z, 10); if (!TEST && i >= S.unlocked) return; zoneSel = i; buildZonePanel(); };   // 선택만 — 이동은 단계 줄에서
  });
  b.querySelectorAll('.sb[data-z]').forEach(el => {
    el.onclick = e => { e.stopPropagation();
      gotoZone(parseInt(el.dataset.z, 10), parseInt(el.dataset.s, 10)); buildZonePanel(); };
  });
}

function openZonePanel(){ zoneSel = S.zi; buildZonePanel(); $('zpanel').classList.add('show'); }
function closeZonePanel(){ $('zpanel').classList.remove('show'); }

/* ── 경지 사다리 — 어디까지 왔고 다음이 무엇인지 한눈에 ──
   용어가 어렵다는 고민의 해법: 이름은 장르 표준으로 유지하되,
   전체 사다리에서 내 위치가 보이면 순서를 몰라도 읽힌다. */
function buildRealmPanel(){
  const ri = realmInfo();
  const per = REALM.per, top = REALM.names.length * per;
  // 주인공 초상 머리글 (v2.63.4) — 사다리 위에 얼굴과 지금 경지를 한 줄로
  let h = ASSET.hero_face
    ? '<div class="rhero"><img src="' + ASSET.hero_face + '" alt="">' +
      '<div><div class="rhn">' + realmName(ri.k) + '</div>' +
      '<div class="rhd">다음 승급까지 ' + Math.floor(ri.cur / ri.need * 100) + '%</div></div></div>'
    : '';
  for (let i = 0; i < REALM.names.length; i++){
    const done = ri.k >= (i + 1) * per;
    const here = !done && ri.k >= i * per;
    h += '<div class="zrow' + (here ? ' on' : (done ? '' : ' lock')) + '">' +
         '<div class="zn">' + REALM.names[i] +
         (here ? ' <em>지금 · ' + (ri.k % per + 1) + '성</em>' : '') + '</div>' +
         '<div class="zd">' + (done ? per + '성까지 닦았다'
           : here ? '다음 승급까지 ' + Math.floor(ri.cur / ri.need * 100) + '%'
           : '아직 멀었다') + '</div></div>';
  }
  const inLast = ri.k >= top;
  h += '<div class="zrow' + (inLast ? ' on' : ' lock') + '">' +
       '<div class="zn">' + REALM.last +
       (inLast ? ' <em>지금 · ' + (ri.k - top + 1) + '성</em>' : '') + '</div>' +
       '<div class="zd">' + (inLast ? '성이 끝없이 오른다' : '자연경 너머 — 성이 끝없이 오른다') + '</div></div>';
  h += '<div class="znote">적을 잡을수록 수련치가 쌓여 경지가 오른다. ' +
       '경지가 오르면 몸이 강해지고 수련 상한이 열린다.</div>';
  $('rbody').innerHTML = h;
}
function openRealmPanel(){ buildRealmPanel(); $('rpanel').classList.add('show'); }
function closeRealmPanel(){ $('rpanel').classList.remove('show'); }

// 스킬 툴팁 — 이름·한자·효과·쿨. 슬롯 위에 뜨고 화면 오른쪽에 붙는다.
function showSkillTip(a, el){
  const t = $('stip'); if (!t) return;
  const fx = typeof artFxLines === 'function' ? artFxLines(a) : '';
  const star = typeof artStar === 'function' ? artStar(a.k) : 1;
  t.innerHTML = '<b>' + a.n + '</b> <i>' + a.h + (star > 1 ? ' · ' + star + '성' : '') + '</i>' +
    '<div>' + a.d + '</div>' +
    '<div class="stfx">' + (fx ? fx : (a.ref ? '피격 시 발동' : '쿨 ' + a.cd + '초')) + '</div>';   // 효과 문구에 쿨이 이미 있다
  t.classList.add('show');
}
function hideSkillTip(){ const t = $('stip'); if (t) t.classList.remove('show'); }
addEventListener('pointerup', hideSkillTip);

/* ── ≡ 메뉴 (v2.85) — 상단 바 오른쪽. 설정(효과음·저장)·기록(업적 준비 중·여정)·판 ── */
function openMenu(){ $('mpanel').classList.add('show'); $('menubtn').classList.add('on'); menuHud(); }
function closeMenu(){ $('mpanel').classList.remove('show'); $('menubtn').classList.remove('on'); }
function menuHud(){
  const mp = $('mpanel'); if (!mp || !mp.classList.contains('show')) return;
  const ms = $('msound'); ms.classList.toggle('on', !S.mute); ms.querySelector('.mv').textContent = S.mute ? '끔' : '켬';
  $('mstatv').textContent = '처치 ' + fmt(S.totalKills) + ' · 쓰러짐 ' + S.downs;
  const ma = $('mach'); if (ma){ const n = typeof achvClaimableAll === 'function' ? achvClaimableAll() : 0; ma.disabled = false;
    ma.querySelector('.mv').textContent = n ? '받을 것 ' + n : ''; ma.classList.toggle('on', n > 0); }
  $('mverv').textContent = typeof GAME_VER !== 'undefined' ? GAME_VER : '';
  // 저장소 상태 (v2.90.2) — 막힌 브라우저는 여기서 바로 보인다. 저장 코드 줄은 그때 금색으로 권한다
  const msv = $('msave'); if (msv){ msv.querySelector('.mv').textContent = saveOk === false ? '막힘' : '›'; msv.classList.toggle('bad', saveOk === false); }
  const mc = $('mcode'); if (mc) mc.classList.toggle('on', saveOk === false);
}
/* ── 저장 코드 시트 (v2.90.2, "저장이 안 됨") — 코드를 보여 주고(복사), 붙여넣은 코드를 불러온다 ── */
function openCode(){
  const p = $('cpanel'); if (!p) return;
  const ta = $('ctext'); ta.value = saveCode();
  $('cnote').textContent = saveOk === false
    ? '이 브라우저는 저장소를 막았다 — 창을 닫으면 진행이 사라진다\n코드를 복사해 두고, 다음에 붙여넣어 불러온다'
    : '코드를 복사해 두면 다른 기기·브라우저로 진행을 옮길 수 있다';
  p.classList.add('show');
}
function closeCode(){ const p = $('cpanel'); if (p) p.classList.remove('show'); }
function copyCode(){
  const ta = $('ctext'); ta.value = saveCode();
  ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
  const done = () => toast('저장 코드를 복사했다');
  const fail = () => toast('복사가 막혔다\n글상자를 길게 눌러 직접 복사한다');
  try{
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, () => { try{ document.execCommand('copy') ? done() : fail(); }catch(e){ fail(); } });
    else document.execCommand('copy') ? done() : fail();
  }catch(e){ fail(); }
}
function pasteCode(){
  const ok = loadCode($('ctext').value);
  if (ok){ closeCode(); closeSheets(); toast('저장 코드를 불러왔다\n' + ZONES[S.zi].n + ' ' + S.stage + '단계'); }
  else toast('저장 코드가 아니다\nWX1. 로 시작하는 글을 통째로 붙여넣는다');
}
