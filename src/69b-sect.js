/* ── 문파 — 내 문파 세우기 (v2.91) ────────────────────
   이름: 기본 무명문(無名門), 플레이어가 패널 머리글 ✎로 짓는다(S.sectName, v2.91.2). 실존 문파(소림 등)는 본진 비무 상대.
   숫자는 전부 00-data.js의 SECT. 설계는 docs/설계-문파.md.
   1층: 전각 5채 — 은자로 레벨을 올리면 영구 % 효과(sectBonus가 heroDmg 등 전투 수식에 합산).
        상한은 명성 단계(fameTier)로 열린다.
   명성: 처치·보스·업적 받기로 쌓인다(fameAdd). 산문이 획득을 키운다.
   제자·본진 비무는 v2.92~ (객당은 자리만 잡아 둠).
*/
// 이름 — 앞뒤 공백 제거·글자 수 상한·빈 값이면 기본. 한자는 기본 이름에만 붙는다
function sectCleanName(v){ v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, SECT.nameMax); return v === SECT.name ? '' : v; }
function sectName(){ return S.sectName || SECT.name; }
function sectHan(){ return S.sectName ? '' : SECT.han; }
function setSectName(v){ S.sectName = sectCleanName(v); sectHeader(); if (typeof saveNow === 'function') saveNow(); return sectName(); }
function sectHeader(){ const n = $('sname'), h = $('shan'); if (n) n.textContent = sectName(); if (h) h.textContent = sectHan(); }
function hallDef(k){ return SECT.halls.find(h => h.k === k); }
function hallLv(k){ return (S.halls && S.halls[k]) | 0; }
function hallCost(k, lv){ const h = hallDef(k); return Math.round(h.cb * Math.pow(h.cg, lv == null ? hallLv(k) : lv)); }
// 명성 단계 — need를 넘은 마지막 단계
function fameTier(){ let t = 0; for (let i = 0; i < SECT.fame.tiers.length; i++) if ((S.fame || 0) >= SECT.fame.tiers[i].need) t = i; return t; }
function fameTierDef(i){ return SECT.fame.tiers[Math.max(0, Math.min(SECT.fame.tiers.length - 1, i == null ? fameTier() : i))]; }
function hallCap(){ return fameTierDef().cap; }
// 전각 효과 합(%) — 키별. 수련·장비와 같은 자리에 더해진다
function sectBonus(k){
  let v = 0;
  for (const h of SECT.halls){ const lv = hallLv(h.k); if (lv && h.eff[k]) v += h.eff[k] * lv; }
  return v;
}
function hallEffText(h, lv){                                    // "공격력 +3% · 공격 속도 +1%"
  return Object.keys(h.eff).map(k => SECT.effName[k] + ' ' + (k === 'artcost' || k === 'downcut' ? '−' : '+') + (Math.round(h.eff[k] * lv * 10) / 10) + '%').join(' · ');
}
function canBuildHall(k){ return hallLv(k) < hallCap() && S.silver >= hallCost(k); }
function buildHall(k){
  if (!hallDef(k) || !canBuildHall(k)) return false;
  S.silver -= hallCost(k);
  if (!S.halls) S.halls = {};
  S.halls[k] = hallLv(k) + 1;
  return true;
}
function canBuildAny(){ return SECT.halls.some(h => canBuildHall(h.k)); }
// 명성 — src: 'kill' | 'boss' | 'bossFirst' | 'achv'. 산문(fame) 효과가 곱해진다. 단계가 오르면 토스트
function fameAdd(n){
  const t0 = fameTier();
  S.fame = (S.fame || 0) + n * (1 + sectBonus('fame') / 100);
  const t1 = fameTier();
  if (t1 > t0 && typeof toast === 'function') toast('명성이 올랐다 · ' + fameTierDef(t1).n + '\n전각 상한 ' + fameTierDef(t1).cap);
  return t1 > t0;
}
function killFame(){ return SECT.fame.kill * Math.pow(SECT.fame.killGrow, gstage() - 1); }

/* ── 패널 ── */
let sectHold = 0;
function hallCard(h){
  const lv = hallLv(h.k), cap = hallCap(), full = lv >= cap, can = canBuildHall(h.k);
  const next = full ? '' : ' → ' + hallEffText(h, lv + 1);
  return '<div class="acard hcard' + (can ? ' can' : '') + '" data-k="' + h.k + '">' +
    '<div class="hico' + (ASSET['hall_' + h.k] ? '' : ' seal') + '">' + (ASSET['hall_' + h.k] ? '<img src="' + ASSET['hall_' + h.k] + '" alt="">' : '<b>' + h.h[0] + '</b>') + '</div>' +
    '<div class="atxt"><div class="zn">' + h.n + ' <small>' + h.h + '</small> <em>Lv ' + lv + ' / ' + cap + '</em></div>' +
    '<div class="zd">' + h.d + '<br><i>' + (lv ? hallEffText(h, lv) : '아직 효과 없음') + '</i>' + next + '</div></div>' +
    (full ? '<div class="adone">' + (fameTier() >= SECT.fame.tiers.length - 1 ? '최고' : fameTierDef(fameTier() + 1).n + '에 열림') + '</div>'
          : '<button class="trbuy abtn" ' + (can ? '' : 'disabled') + '><span>' + (lv ? '올리기' : '세우기') + '</span><i>' + coin() + ' ' + fmt(hallCost(h.k)) + '</i></button>') +
    '</div>';
}
function fameBand(){
  const t = fameTier(), cur = fameTierDef(t), nxt = t < SECT.fame.tiers.length - 1 ? fameTierDef(t + 1) : null;
  const prog = nxt ? Math.max(0, Math.min(1, ((S.fame || 0) - cur.need) / (nxt.need - cur.need))) : 1;
  return '<div class="zrow fame"><div class="zn">명성 <em>' + cur.n + ' ' + cur.h + '</em></div>' +
    '<div class="zd">' + (nxt ? '다음 ' + nxt.n + ' — 명성 ' + fmt(Math.floor(S.fame || 0)) + ' / ' + fmt(nxt.need) + ' · 전각 상한 ' + cur.cap + ' → ' + nxt.cap
                              : '천하에 이름이 닿았다 · 전각 상한 ' + cur.cap) + '</div>' +
    '<div class="abar"><i style="width:' + Math.round(prog * 100) + '%"></i></div></div>';
}
function buildSectPanel(){
  const b = $('sbody'); if (!b) return;
  sectHeader();
  // 이름 짓기 줄 — 처음(아직 안 지음)엔 펼쳐 두고, 지은 뒤엔 머리글 ✎로 연다
  const naming = '<div class="zrow snamerow" id="snamerow"' + (S.sectName ? ' hidden' : '') + '><div class="zn">문파 이름을 정한다</div>' +
    '<div class="zd">이름 없는 문파에서 시작해 천하에 이름을 알린다. 나중에 ✎로 바꿀 수 있다.</div>' +
    '<div class="snamein"><input id="snamein" maxlength="' + SECT.nameMax + '" placeholder="' + SECT.name + '" value="' + (S.sectName || '') + '" autocomplete="off">' +
    '<button class="trbuy" id="snameok"><span>정한다</span></button></div></div>';
  b.innerHTML = '<div class="znote">이름 없는 문파를 세운다. 전각을 올리면 힘이 영구히 붙고, 명성이 오르면 전각을 더 높이 올릴 수 있다.</div>' + naming +
    fameBand() + SECT.halls.map(hallCard).join('') +
    '<div class="znote">명성은 적을 잡고, 보스를 꺾고, 업적을 받을 때 쌓인다. 제자와 문파 비무는 곧 들어온다.</div>';
  const okb = $('snameok'); if (okb) okb.onclick = () => { setSectName($('snamein').value); $('snamerow').hidden = true; toast(sectName() + ' — 이름을 세웠다'); };
  const inp = $('snamein'); if (inp) inp.onkeydown = e => { if (e.key === 'Enter') okb.onclick(); };
  // 꾹 누르면 연속 (수련과 같은 규칙)
  b.querySelectorAll('.abtn').forEach(el => {
    const k = el.closest('.hcard').dataset.k;
    let iv = 0; const stop = () => { if (iv){ clearInterval(iv); iv = 0; } };
    el.onpointerdown = e => { e.preventDefault(); if (buildHall(k)) refreshSect(); stop();
      iv = setInterval(() => { if (buildHall(k)) refreshSect(); else stop(); }, 180); };
    el.onpointerup = el.onpointerleave = el.onpointercancel = stop;
  });
  refreshSect();
}
// 열린 동안 값만 — 카드마다 레벨·효과·가격·버튼. 상한 도달·명성 단계 변화는 다시 만든다
let sectSig = '';
function refreshSect(){
  const b = $('sbody'); if (!b) return;
  $('ssilver').innerHTML = coin() + ' ' + fmt(S.silver);
  const sig = fameTier() + ':' + SECT.halls.map(h => hallLv(h.k) >= hallCap() ? 1 : 0).join('');
  if (sig !== sectSig){ sectSig = sig; buildSectPanel(); return; }
  for (const h of SECT.halls){
    const card = b.querySelector('.hcard[data-k="' + h.k + '"]'); if (!card) continue;
    const lv = hallLv(h.k), cap = hallCap(), can = canBuildHall(h.k);
    card.classList.toggle('can', can);
    card.querySelector('.zn em').textContent = 'Lv ' + lv + ' / ' + cap;
    const zd = card.querySelector('.zd'); zd.innerHTML = h.d + '<br><i>' + (lv ? hallEffText(h, lv) : '아직 효과 없음') + '</i>' + (lv >= cap ? '' : ' → ' + hallEffText(h, lv + 1));
    const btn = card.querySelector('.abtn'); if (btn){ btn.disabled = !can; btn.querySelector('span').textContent = lv ? '올리기' : '세우기'; btn.querySelector('i').innerHTML = coin() + ' ' + fmt(hallCost(h.k)); }
  }
  const fb = b.querySelector('.fame'); if (fb){ const t = fameTier(), cur = fameTierDef(t), nxt = t < SECT.fame.tiers.length - 1 ? fameTierDef(t + 1) : null;
    if (nxt){ fb.querySelector('.zd').textContent = '다음 ' + nxt.n + ' — 명성 ' + fmt(Math.floor(S.fame || 0)) + ' / ' + fmt(nxt.need) + ' · 전각 상한 ' + cur.cap + ' → ' + nxt.cap;
      fb.querySelector('.abar i').style.width = Math.round(Math.max(0, Math.min(1, ((S.fame || 0) - cur.need) / (nxt.need - cur.need))) * 100) + '%'; } }
}
function openSect(){ sectSig = ''; buildSectPanel(); $('spanel').classList.add('show'); }
function closeSect(){ const p = $('spanel'); if (p) p.classList.remove('show'); }
// 매 프레임 — 탭 알림점(세울 수 있는 전각), 열려 있으면 은자·명성 변화만 반영
let sectLastSilver = -1, sectLastFame = -1;
function sectHud(){
  const tab = $('tab-sect'); if (!tab) return;
  const dot = tab.querySelector('.dot'); if (dot && dot.classList) dot.classList.toggle('on', canBuildAny());
  if (!$('spanel').classList.contains('show')) return;
  if (sectLastSilver !== S.silver || sectLastFame !== S.fame){ sectLastSilver = S.silver; sectLastFame = S.fame; refreshSect(); }
}
