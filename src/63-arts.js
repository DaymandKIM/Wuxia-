/* ── 무공 — 경지에 닿으면 은자로 익힌다 ─────────────
   표는 문파별 섹션 + 아이콘 타일 그리드 — 전 무공이 한눈에 보인다.
   타일을 누르면 위 상세 칸에 설명·조건·구매가 뜬다.
   숫자는 전부 00-data.js의 ARTS.
*/
function canLearn(a){
  return !a.fate && !S.arts[a.k] && realmLv() >= a.need && S.silver >= a.cost;
}
// 돌파 조건 = 연마 상한 도달 + 숙련 게이지 만충 + 은자 (사용자 확정:
// "레벨이랑 횟수 다 차야 업글") — 갈고, 손에 익히고, 그다음에야 벽을 넘는다
function canBreak(a){
  return S.arts[a.k] && artStar(a.k) < MASTERY.maxStar &&
         artLv(a.k) >= artLvCap(a.k) &&
         (S.artXp[a.k] | 0) >= artXpNeed(a.k) && S.silver >= artBreakCost(a.k);
}
// 연마 — 은자로 레벨을 올린다. 상한은 성×10이라 돌파가 상한을 연다
function canLevel(a){
  return S.arts[a.k] && a.cost !== undefined &&
         artLv(a.k) < artLvCap(a.k) && S.silver >= artLvCost(a.k);
}
function levelArt(k){
  const a = artDef(k);
  if (!canLevel(a)) return false;
  S.silver -= artLvCost(k);
  S.artLv[k] = artLv(k) + 1;
  return true;
}
function canLearnArt(){
  for (const a of ARTS.list) if (canLearn(a) || canBreak(a) || canLevel(a)) return true;
  return false;
}
// 성 돌파 — 숙련이 차야 하고 은자가 든다 (재료·기연 조건은 나중에 얹는다)
// 돌파하면 숙련은 0부터 — 이월되면 몰아친 사용량으로 성이 연달아 뚫려 벽이 안 된다
function breakArt(k){
  const a = artDef(k);
  if (!canBreak(a)) return false;
  S.silver -= artBreakCost(k);
  S.artXp[k] = 0;
  S.artStar[k] = artStar(k) + 1;
  toast(a.n + ' ' + S.artStar[k] + '성 — 손에 익었다');
  sfx('down');
  return true;
}
function learnArt(k){
  const a = artDef(k);
  if (!canLearn(a)) return false;
  S.silver -= a.cost;
  S.arts[k] = 1;
  toast(a.n + '을(를) 익혔다');
  sfx('down');
  return true;
}

// 효과 요약 — 숙련 성이 반영된 실효값으로 보여준다 ("성이 올라도 안 좋아져
// 보인다"는 피드백: 실제론 +25%/성인데 표기가 기본값이라 안 보였다)
function artFxText(a, star, lv){
  const e = (1 + MASTERY.lvPer * ((lv !== undefined ? lv : artLv(a.k)) - 1))
          * (1 + MASTERY.effPer * ((star !== undefined ? star : artStar(a.k)) - 1));
  const parts = [];
  if (a.dmg)   parts.push('공격 +' + Math.round(a.dmg*100*e) + '%');
  if (a.hp)    parts.push('체력 +' + Math.round(a.hp*100*e) + '%');
  if (a.regen) parts.push('회복 +' + Math.round(a.regen*100*e) + '%');
  if (a.spd)   parts.push('이동 +' + Math.round(a.spd*100*e) + '%');
  if (a.mul)   parts.push('정권 ' + (a.mul*e).toFixed(1).replace(/\.0$/,'') + '배 · ' + a.cd + '초마다');
  if (a.heal)  parts.push('체력 ' + Math.round(a.heal*100*e) + '% 회복 · ' + a.cd + '초마다');
  if (a.ref)   parts.push('받은 피해 ' + Math.round(a.guard*100) + '% 흘리고 ' +
                          (a.ref*e).toFixed(1).replace(/\.0$/,'') + '배 되돌림 · ' + a.cd + '초마다');
  return parts.join(' · ');
}

let artSel = null;                 // 상세 칸에 떠 있는 무공
let artDetSig = '';                // 상세 칸 구조 서명 — 같으면 DOM을 안 갈아엎는다

function buildArtsPanel(){
  const b = $('abody');
  let h = '<div class="adet" id="adet"></div>';
  // 섹션은 초식/심법 둘뿐 — 문파는 타일 위 색띠로 보인다.
  // 문파별로 쪼개면 한 줄에 한두 개뿐이라 세로로 길어진다는 피드백.
  for (const sec of [['초식 — 스스로 펼친다', 'active'], ['심법 — 몸에 스민다', 'passive']]){
    const list = ARTS.list.filter(a => a.type === sec[1])
      .sort((a, b) => (a.fate ? 999 : a.need) - (b.fate ? 999 : b.need));
    h += '<div class="znote asec">' + sec[0] + '</div><div class="agrid">';
    for (const a of list){
      const sc = SCHOOLS[a.school] || SCHOOLS.none;
      h += '<button class="atile' + (a.fate ? ' fate' : '') + '" data-k="' + a.k +
           '"><i class="sc" style="background:' + sc.c + '"></i>' +
           '<span class="g">' + a.h[0] + '</span>' +
           '<span class="nm">' + a.n + '</span><em class="bd"></em></button>';
    }
    h += '</div>';
  }
  b.innerHTML = h;
  artDetSig = '';                  // 패널을 새로 만들었으니 상세 칸도 다시 그린다
  b.querySelectorAll('.atile').forEach(el => {
    el.onclick = () => { artSel = el.dataset.k; artDetSig = ''; refreshArts(); };
  });
  // 처음엔 살 수 있는 것, 없으면 첫 무공
  if (!artSel || !artDef(artSel)){
    const buyable = ARTS.list.find(a => canLearn(a));
    artSel = (buyable || ARTS.list[0]).k;
  }
  refreshArts();
}

// 타일 상태와 상세 칸만 갱신 — 패널을 다시 만들지 않는다
function refreshArts(){
  const k = realmLv();
  $('abody').querySelectorAll('.atile').forEach(el => {
    const a = artDef(el.dataset.k);
    const sc = SCHOOLS[a.school] || SCHOOLS.none;
    const got = !!S.arts[a.k];
    const open = !a.fate && k >= a.need;
    el.classList.toggle('got', got);
    el.classList.toggle('lock', !got && !open && !a.fate);
    el.classList.toggle('sel', el.dataset.k === artSel);
    // 익힌 무공은 문파색 테두리 + 옅은 문파색 바탕 — 안 익힌 것과 확실히 갈린다
    el.style.borderColor = got ? sc.c : '';
    el.style.background = got ? sc.c + '22' : '';
    el.querySelector('.g').style.color = got ? sc.c : '';
    el.querySelector('.nm').textContent =
      a.n + (got && artStar(a.k) > 1 ? ' ' + artStar(a.k) + '성' : '');
    // 배지 — ▲ 돌파 가능 · + 배울 수 있음 ("뭘 할 수 있는지 안 보인다"는 피드백)
    const bd = el.querySelector('.bd');
    if (canBreak(a))      { bd.className = 'bd up';  bd.textContent = '▲'; }
    else if (canLevel(a)) { bd.className = 'bd lv';  bd.textContent = '↑'; }
    else if (canLearn(a)) { bd.className = 'bd can'; bd.textContent = '+'; }
    else                  { bd.className = 'bd';     bd.textContent = ''; }
  });
  const a = artDef(artSel);
  if (!a) return;
  const sc = SCHOOLS[a.school] || SCHOOLS.none;
  const got = !!S.arts[a.k];
  const open = !a.fate && k >= a.need;
  const st = got ? artStar(a.k) : 0, xp = S.artXp[a.k] | 0;
  const need = got && st < MASTERY.maxStar ? artXpNeed(a.k) : 0;
  // 구조 서명 — 이게 그대로면 innerHTML을 다시 만들지 않는다.
  // 전투 중 처치마다 은자·숙련이 변해 매번 다시 만들면, 손가락이 버튼을
  // 누르는 도중 DOM이 교체돼 클릭이 증발한다 ("무공창 클릭 안 됨"의 원인).
  const sig = [artSel, got, st, got ? artLv(a.k) : 0, xp >= need && need > 0, open,
               got && a.cost !== undefined && S.silver >= artLvCost(a.k),
               need > 0 && S.silver >= artBreakCost(a.k),
               !got && open && S.silver >= a.cost].join('|');
  if (sig === artDetSig){
    const ax = $('axp');                          // 숙련 숫자만 제자리 갱신
    if (ax) ax.textContent = Math.min(xp, need) + ' / ' + need;
    return;
  }
  artDetSig = sig;
  let d = '<div class="zn">' + a.n + ' <small>' + a.h + '</small>' +
          ' <i class="sch" style="color:' + sc.c + '">' + sc.n + '</i>' +
          (got ? ' <em>익힘</em>' : (a.fate ? ' <em class="fate">기연</em>' : '')) + '</div>' +
          '<div class="zd">' + a.d + (artFxText(a) ? ' · ' + artFxText(a) : '') + '</div>';
  if (got){
    // 연마 — 은자로 바로 올린다. 상한에 닿으면 돌파가 다음 문이다
    if (a.cost !== undefined){
      const lv = artLv(a.k), cap = artLvCap(a.k);
      d += '<div class="zd">연마 Lv ' + lv + ' / ' + cap;
      if (lv < cap){
        d += '</div><button class="trbuy" id="alvl"' +
             (S.silver >= artLvCost(a.k) ? '' : ' disabled') +
             '><span>' + artLvCost(a.k).toLocaleString() + '</span><i>은자 · 연마</i></button>';
      } else {
        d += (st < MASTERY.maxStar ? ' — 성을 돌파하면 상한이 열린다' : ' — 극에 달했다') + '</div>';
      }
    }
    if (st < MASTERY.maxStar){
      const cost = artBreakCost(a.k);
      d += '<div class="zd">숙련 ' + st + '성 · <span id="axp">' +
           Math.min(xp, need) + ' / ' + need + '</span>' +
           (a.type === 'active' ? ' (시전 횟수)' : ' (처치 수)') + '</div>' +
           '<div class="zd need">돌파하면 → ' + artFxText(a, st + 1) + '</div>';
      const lvFull = a.cost === undefined || artLv(a.k) >= artLvCap(a.k);
      if (xp >= need && lvFull)
        d += '<button class="trbuy" id="abrk"' + (S.silver >= cost ? '' : ' disabled') +
             '><span>' + cost.toLocaleString() + '</span><i>은자 · 돌파</i></button>';
      else if (xp >= need)
        d += '<div class="zd need">연마를 상한(Lv ' + artLvCap(a.k) + ')까지 채우면 돌파가 열린다</div>';
    } else {
      d += '<div class="zd">숙련 ' + st + '성 — 극에 달했다</div>';
    }
  }
  if (a.fate && !got){
    d += '<div class="zd need">기연으로만 얻는다 — 언젠가 강호에서 만난다.</div>';
  } else if (!got){
    d += open
      ? '<button class="trbuy" id="abuy"' + (S.silver >= a.cost ? '' : ' disabled') +
        '><span>' + a.cost.toLocaleString() + '</span><i>은자</i></button>'
      : '<div class="zd need">' + realmName(a.need) + '에 열린다 · 은자 ' +
        a.cost.toLocaleString() + '</div>';
  }
  $('adet').innerHTML = d;
  const btn = $('abuy');
  if (btn) btn.onclick = () => { if (learnArt(artSel)) refreshArts(); };
  const bbtn = $('abrk');
  if (bbtn) bbtn.onclick = () => { if (breakArt(artSel)) refreshArts(); };
  const lbtn = $('alvl');
  if (lbtn) lbtn.onclick = () => { if (levelArt(artSel)) refreshArts(); };
}

function openArts(){ buildArtsPanel(); $('apanel').classList.add('show'); }
function closeArts(){ $('apanel').classList.remove('show'); }

let artLastSilver = -1, artLastRealm = -1, artLastXp = -1;
function artsHud(){
  const dot = $('tab-arts').firstElementChild;
  if (dot && dot.classList) dot.classList.toggle('on', canLearnArt());
  if (!$('apanel').classList.contains('show')) return;
  const xp = S.artXp[artSel] | 0;
  if (artLastSilver !== S.silver || artLastRealm !== realmLv() || artLastXp !== xp){
    artLastSilver = S.silver; artLastRealm = realmLv(); artLastXp = xp;
    refreshArts();
  }
}
