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
  $('zbtn').style.opacity = showing ? '1' : '0';
  const tb = $('tbtn'); if (tb) tb.style.opacity = showing ? '1' : '0';   // [테스트 전용]
  if (!showing) return;

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
}

function gotoZone(i, st){
  if (!TEST && i >= S.unlocked) return;
  S.zi = i; S.stage = st || 1; S.kills = 0;
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
