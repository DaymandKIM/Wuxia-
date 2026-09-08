/* ── HUD ──────────────────────────────────────────── */
let toastT = 0;
function toast(msg){
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  toastT = 1.6;
}

function hud(){
  // 진입 연출 중엔 HUD를 감춘다
  const showing = S.intro <= 0;
  $('card').style.opacity = showing ? '1' : '0';
  $('tabs').style.opacity = showing ? '1' : '0';
  const tb = $('tbtn'); if (tb) tb.style.opacity = showing ? '1' : '0';   // [테스트 전용]
  if (!showing) return;
  trainHud();                                    // 수련 탭 알림점·열린 패널 갱신
  artsHud();                                     // 무공 탭 알림점·열린 패널 갱신

  const st = stage();
  if (isBoss()){
    $('stage').textContent = zone().n + ' · 보스';
    const b = S.foes.find(f=>f.boss && !f.dead);
    $('kills').textContent = b ? zone().boss : '접근 중';
  } else {
    $('stage').textContent = zone().n + ' ' + S.stage + '단계';
    $('kills').textContent = S.kills + ' / ' + st.need;
  }
  $('hpt').textContent = Math.ceil(P.hp) + ' / ' + P.hpMax;
  $('silver').textContent = S.silver.toLocaleString();
  const ri = realmInfo();
  $('realm').textContent = ri.name + ' · ' + Math.floor(ri.cur / ri.need * 100) + '%';
  $('hp').firstElementChild.style.width = (P.hp/P.hpMax*100).toFixed(1) + '%';
  const b2 = S.foes.find(f=>f.boss && !f.dead);
  $('kn').firstElementChild.style.width =
    (isBoss() ? (b2 ? b2.hp/b2.hpMax*100 : 0) : S.kills/st.need*100).toFixed(1) + '%';
  $('kn').firstElementChild.style.background =
    isBoss() ? 'linear-gradient(90deg,#8c3f2f,#c86a52)' : 'linear-gradient(90deg,#3f7fb8,#69a8dd)';
}

/* ── 구역 이동 ─────────────────────────────────────
   진입은 죽림과 같은 슬라이드 연출을 쓴다.
*/
function enterStage(){
  P.hpMax = heroHpMax(); P.hp = P.hpMax;
  P.x = 0; P.y = 0; P.anim = 'idle'; P.af = 0;
  S.camX = 0; S.camY = -24;
  S.foes.length = 0; S.fx.length = 0; S.shots.length = 0; S.bossAlive = false;
  beginIntro(isBoss() ? zone().boss : (S.stage + '단계'), zone().n);
  // 인연이 차 있으면 기연이 나타난다.
  // sim.js 등 검증 도구는 64-fate 없이 60-ui까지만 이어붙이므로 가드가 필요하다.
  if (typeof maybeFate === 'function') maybeFate();
}

function gotoZone(i, st){
  if (!TEST && i >= S.unlocked) return;
  S.zi = i; S.stage = st || 1; S.kills = 0;
  // [테스트 전용] 앞 구역으로 점프하면 걸맞은 수련치를 채워준다 — 안 그러면 못 버틴다
  if (TEST) S.rexp = Math.max(S.rexp, seedExp(i, st));
  closeZonePanel();
  enterStage();
}

function buildZonePanel(){
  const b = $('zbody');
  let h = '';
  for (let i = 0; i < ZONES.length; i++){
    const z = ZONES[i];
    const open = TEST || i < S.unlocked;
    const here = i === S.zi;
    h += '<div class="zrow' + (here ? ' on' : '') + (open ? '' : ' lock') + '"' +
         (open ? ' data-z="' + i + '"' : '') + '>' +
         '<div class="zn">' + z.n + (here ? ' <em>수련 중</em>' : '') + '</div>' +
         '<div class="zd">적이 ' + z.mul.toFixed(2) + '배 강하다</div>';
    if (open && TEST){
      // 테스트 모드 — 단계까지 바로 고른다
      h += '<div class="zst">';
      for (let k = 1; k <= STAGES.length; k++)
        h += '<button class="sb' + (here && S.stage===k ? ' on' : '') +
             '" data-z="' + i + '" data-s="' + k + '">' + k + '</button>';
      h += '<button class="sb bs' + (here && S.stage===BOSS_STAGE ? ' on' : '') +
           '" data-z="' + i + '" data-s="' + BOSS_STAGE + '">보스</button>';
      h += '</div>';
    }
    h += '</div>';
  }
  h += '<div class="znote">' + (TEST
      ? '테스트 모드 — 모든 구역으로 이동할 수 있다.'
      : (ZONES.length > S.unlocked ? '구역을 끝까지 깨면 다음 구역이 열린다.' : '모든 구역을 열었다.')) + '</div>';
  b.innerHTML = h;
  b.querySelectorAll('.zrow[data-z]').forEach(el => {
    el.onclick = e => { if (e.target.classList.contains('sb')) return;
      gotoZone(parseInt(el.dataset.z, 10)); };
  });
  // data-z 있는 것만 — 저장 초기화 버튼도 .sb 라 전체에 걸면 덮어써진다
  b.querySelectorAll('.sb[data-z]').forEach(el => {
    el.onclick = e => { e.stopPropagation();
      gotoZone(parseInt(el.dataset.z, 10), parseInt(el.dataset.s, 10)); };
  });
}

function openZonePanel(){ buildZonePanel(); $('zpanel').classList.add('show'); }
function closeZonePanel(){ $('zpanel').classList.remove('show'); }

/* ── 경지 사다리 — 어디까지 왔고 다음이 무엇인지 한눈에 ──
   용어가 어렵다는 고민의 해법: 이름은 장르 표준으로 유지하되,
   전체 사다리에서 내 위치가 보이면 순서를 몰라도 읽힌다. */
function buildRealmPanel(){
  const ri = realmInfo();
  const per = REALM.per, top = REALM.names.length * per;
  let h = '';
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
