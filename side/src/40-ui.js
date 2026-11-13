/* ── 화면 글자·패널 (HTML) ──────────────────────────────
   값이 바뀔 때만 노드를 건드린다. **패널을 통째로 다시 만들지 않는다** — 옛 판에서 탭이 먹히던 원인이다. */
const set = (id, v) => { const e = $(id); if (e && e.textContent !== v) e.textContent = v; };
function buildUi(){
  const tr = $('train'); let h = '';
  for (const s of TRAIN.list)
    h += '<button class="tcard" data-k="' + s.k + '"><img class="tico" alt="" src="' + (ASSET[s.ico] || '') + '">' +
         '<b class="tn">' + s.n + '</b><i class="tl" id="tl-' + s.k + '"></i><span class="tv" id="tv-' + s.k + '"></span>' +
         '<span class="tc"><img class="coin" alt="" src="' + (ASSET.silver || '') + '"><em id="tc-' + s.k + '"></em></span></button>';
  tr.innerHTML = h;
  for (const b of tr.querySelectorAll('.tcard')) b.onclick = () => { if (trainBuy(b.dataset.k)){ b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); saveNow(); ui(); } };
  let t = ''; for (let i = 1; i <= STAGE.n; i++) t += '<i data-s="' + i + '"></i>'; t += '<i class="boss" data-s="' + (STAGE.n + 1) + '"></i>';
  $('track').innerHTML = t;
  $('coin').src = ASSET.silver || '';
}
function ui(){
  const z = zone(), boss = isBoss(), b = boss ? S.foes.find(f => f.boss && !f.dead) : null;
  set('pill', boss ? '수호자' : (S.zi + 1) + '-' + S.stage);
  set('ztitle', boss ? z.bossName : z.n);
  set('zsub', boss ? (b ? fmt(Math.ceil(b.hp)) + ' / ' + fmt(b.hpMax) : '다가온다') : S.kills + ' / ' + stageNeed());
  $('zbar').style.width = ((boss ? (b ? b.hp / b.hpMax : 1) : S.kills / stageNeed()) * 100).toFixed(1) + '%';
  $('zhead').classList.toggle('boss', boss);
  set('realm', realmName(S.realm));
  $('rbar').style.width = (S.exp / realmNeed(S.realm) * 100).toFixed(1) + '%';
  $('rpill').classList.toggle('up', S.realmUp > 0);
  set('silver', fmt(S.silver));
  const hm = heroHpMax();
  set('hpt', fmt(Math.ceil(P.hp)) + ' / ' + fmt(hm));
  $('hpbar').style.width = (P.hp / hm * 100).toFixed(1) + '%';
  $('hp').classList.toggle('down', P.st === 'down');
  const cap = trainCap();
  for (const s of TRAIN.list){
    const lv = S.tr[s.k] | 0, full = lv >= cap, c = trainCost(s.k);
    set('tl-' + s.k, 'Lv ' + lv + ' / ' + cap);
    set('tv-' + s.k, '+' + lv * s.inc + '%');
    set('tc-' + s.k, full ? '경지 상한' : fmt(c));
    const card = $('tc-' + s.k).closest('.tcard');
    card.classList.toggle('can', !full && S.silver >= c); card.classList.toggle('full', full);
  }
  const dots = $('track').children;
  for (let i = 0; i < dots.length; i++){ const s = i + 1; dots[i].className = (i === STAGE.n ? 'boss ' : '') + (s < S.stage ? 'done' : s === S.stage ? 'now' : ''); }
  set('hint', S.cleared ? TEXT.hintDone : boss ? TEXT.hintBoss : TEXT.hint);
  set('stat', '공격 ' + fmt(Math.round(heroDmg())) + ' · 회복 ' + heroRegen().toFixed(1) + '/초 · 처치 ' + fmt(S.total));
}
