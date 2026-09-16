/* ── 기연(奇緣) — 누적된 인연의 정산 ─────────────────
   인연(S.karma)은 처치·보스·쓰러짐으로 쌓인다 (30-combat).
   차 있으면 단계 진입 순간(enterStage) 기연 카드가 나타난다.
   공짜 랜덤이 아니다 — 반드시 쌓아야 온다. 숫자는 00-data.js의 FATE.
*/
let fateEv = null;               // 지금 떠 있는 기연 (보상은 확정된 값)

// 어떤 기연이 올지 정한다 — 보상 수치까지 이 시점에 확정
function rollFate(){
  const cand = ARTS.list.filter(a => !a.fate && !S.arts[a.k] && realmLv() >= a.need);
  const frags = ['guyang', 'geongon'].filter(k => !S.arts[k]);
  let pool = ['scroll', 'elixir'];
  if (cand.length) pool.push('master');
  if (S.fates + 1 >= FATE.fragFrom && frags.length && Math.random() < FATE.fragW)
    pool = ['frag'];
  const k = pool[Math.floor(Math.random() * pool.length)];
  const def = FATE.pool.find(p => p.k === k);
  const ev = { k, n: def.n, d: def.d };
  if (k === 'scroll'){
    ev.sv = Math.round(killSilver() * FATE.scrollMul);
    ev.r = coin() + ' 은자 +' + fmt(ev.sv);
  } else if (k === 'elixir'){
    ev.xp = Math.round(realmNeed(realmLv()) * FATE.elixirExp);
    ev.r = '기력이 차오른다 · 수련치 +' + fmt(ev.xp);
  } else if (k === 'master'){
    ev.art = cand[Math.floor(Math.random() * cand.length)].k;
    ev.r = artDef(ev.art).n + '을(를) 무료로 전수받는다';
  } else {
    ev.art = frags[Math.floor(Math.random() * frags.length)];
    const have = (S.fatebits[ev.art] | 0) + 1;
    ev.r = artDef(ev.art).n + ' 조각 ' + have + ' / ' + FATE.fragNeed +
           (have >= FATE.fragNeed ? ' — 비급이 완성된다!' : '');
  }
  return ev;
}

// 인연이 차 있으면 기연 카드를 띄운다 (enterStage·오프라인 복귀에서 부른다)
let fateAutoT = 0;               // 카드가 떠 있는 동안 줄어든다 — 0이 되면 스스로 받는다
function maybeFate(){
  if (!S.fatePending || fateEv) return;
  fateEv = rollFate();
  fateAutoT = FATE.autoSec;
  $('fart').src = ASSET['fate_' + FATE.art[fateEv.k]] || '';   // 카드 일러스트 (v2.62)
  $('ftitle').textContent = fateEv.n;
  $('ftext').innerHTML = fateEv.d + '<br><b>' + fateEv.r + '</b>';
  $('fpanel').classList.add('show');
  sfx('down');
}

// 매 프레임 — 손대지 않아도 잠시 뒤 스스로 받아들인다 (팝업 누르기 귀찮다는 피드백)
function stepFate(dt){
  if (!fateEv) return;
  fateAutoT -= dt;
  // 카운트다운은 초가 바뀔 때 <i>의 글자만 바꾼다 (v2.83 "기연 버튼이 동작 안 함") — 매 프레임 innerHTML을 갈아끼우면
  // 손가락이 닿은 <span>이 떼기 전에 DOM에서 사라져 click이 안 살아난다.
  const sec = Math.max(1, Math.ceil(fateAutoT)), fb = $('fbtn');
  if (fb.dataset.sec !== String(sec)){
    fb.dataset.sec = String(sec);
    let ci = fb.querySelector('i');
    if (!ci){ fb.innerHTML = '<span>받아들인다</span><i></i>'; ci = fb.querySelector('i'); }
    ci.textContent = sec + '초 뒤 저절로';
  }
  if (fateAutoT <= 0) applyFate();
}

function applyFate(){
  if (!fateEv) return;
  const ev = fateEv;
  if (ev.k === 'scroll'){
    S.silver += ev.sv;
  } else if (ev.k === 'elixir'){
    P.hp = heroHpMax();
    S.rexp += ev.xp;
  } else if (ev.k === 'master'){
    S.arts[ev.art] = 1;
    toast(artDef(ev.art).n + '을(를) 전수받았다');
  } else {
    S.fatebits[ev.art] = (S.fatebits[ev.art] | 0) + 1;
    if (S.fatebits[ev.art] >= FATE.fragNeed){
      S.arts[ev.art] = 1;
      toast(artDef(ev.art).n + '이 완성되었다!');
      fxPush({ k:'burst', x:P.x, y:P.y - HERO.h*0.5, life:0.6, t:0.6 });
      shake(8);
    } else {
      toast(artDef(ev.art).n + ' 조각을 얻었다');
    }
  }
  // 인연을 치르고 다음 기연은 더 멀어진다
  S.karma = Math.max(0, S.karma - karmaNeed());
  S.fates++;
  S.fatePending = S.karma >= karmaNeed() ? 1 : 0;
  fateEv = null;
  $('fpanel').classList.remove('show');
  saveNow();
}
