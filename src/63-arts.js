/* ── 무공 — 경지에 닿으면 은자로 익힌다 ─────────────
   표에는 모든 무공이 보인다 (사다리 패널과 같은 철학 —
   뭐가 있는지 보여야 다음 경지를 오를 이유가 생긴다).
   숫자는 전부 00-data.js의 ARTS.
*/
function canLearn(a){
  return !a.fate && !S.arts[a.k] && realmLv() >= a.need && S.silver >= a.cost;
}
function canLearnArt(){
  for (const a of ARTS.list) if (canLearn(a)) return true;
  return false;
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

// 심법 효과 요약 ("공격 +15%")
function artFxText(a){
  const parts = [];
  if (a.dmg)   parts.push('공격 +' + Math.round(a.dmg*100) + '%');
  if (a.hp)    parts.push('체력 +' + Math.round(a.hp*100) + '%');
  if (a.regen) parts.push('회복 +' + Math.round(a.regen*100) + '%');
  if (a.spd)   parts.push('이동 +' + Math.round(a.spd*100) + '%');
  if (a.mul)   parts.push('정권 ' + a.mul + '배 · ' + a.cd + '초마다');
  if (a.heal)  parts.push('체력 ' + Math.round(a.heal*100) + '% 회복 · ' + a.cd + '초마다');
  return parts.join(' · ');
}

function buildArtsPanel(){
  const b = $('abody');
  const k = realmLv();
  let h = '';
  for (const sec of [['초식 — 스스로 펼친다','active'], ['심법 — 몸에 스민다','passive']]){
    h += '<div class="znote asec">' + sec[0] + '</div>';
    for (const a of ARTS.list){
      if (a.type !== sec[1]) continue;
      const got = !!S.arts[a.k];
      const open = !a.fate && k >= a.need;
      h += '<div class="zrow trow' + (got ? ' on' : (open ? '' : ' lock')) + '">' +
           '<div class="trl"><div class="zn">' + a.n + ' <small>' + a.h + '</small>' +
           (got ? ' <em>익힘</em>' : (a.fate ? ' <em class="fate">기연</em>' : '')) + '</div>' +
           '<div class="zd">' + a.d + (artFxText(a) ? ' · ' + artFxText(a) : '') + '</div>' +
           (!got && !a.fate && !open
             ? '<div class="zd need">' + realmName(a.need) + '에 열린다</div>' : '') +
           '</div>' +
           (got || a.fate ? ''
             : '<button class="trbuy" data-k="' + a.k + '"' + (open ? '' : ' disabled') + '>' +
               '<span>' + a.cost.toLocaleString() + '</span><i>은자</i></button>') +
           '</div>';
    }
  }
  h += '<div class="znote">경지가 오르면 새 무공이 열린다. 기연 무공은 언젠가 강호에서 만난다.</div>';
  b.innerHTML = h;
  b.querySelectorAll('.trbuy').forEach(el => {
    el.onclick = () => { if (learnArt(el.dataset.k)) buildArtsPanel(); };
  });
  refreshArts();
}

// 열려 있는 동안 은자 변화에 따라 버튼 활성만 갱신
function refreshArts(){
  const k = realmLv();
  $('abody').querySelectorAll('.trbuy').forEach(el => {
    const a = artDef(el.dataset.k);
    el.disabled = !(k >= a.need && S.silver >= a.cost);
  });
}

function openArts(){ buildArtsPanel(); $('apanel').classList.add('show'); }
function closeArts(){ $('apanel').classList.remove('show'); }

let artLastSilver = -1, artLastRealm = -1;
function artsHud(){
  const dot = $('tab-arts').firstElementChild;
  if (dot && dot.classList) dot.classList.toggle('on', canLearnArt());
  if (!$('apanel').classList.contains('show')) return;
  if (artLastSilver !== S.silver || artLastRealm !== realmLv()){
    artLastSilver = S.silver; artLastRealm = realmLv();
    refreshArts();
  }
}
