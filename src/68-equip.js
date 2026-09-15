/* ── 장비 · 표준형 (v2.70) ─────────────────────────────
   숫자는 00-data.js의 EQUIP. 드랍 → 주머니(S.inv[종류][등급]) → 합성(수동·일괄) → 장착(자동 장착 버튼
   또는 카드 상세에서 직접). 아이템마다 레벨(S.itemLv) — 장착 효과·보유 효과가 그 레벨을 탄다.
   얻어 본 아이템(S.codex 비트)은 영구 보유 효과. 전투 수식은 00-data의 heroDmg 등이 eqBonus(stat)를 합산. */
function eqSlot(k){ return EQUIP.slots.find(s => s.k === k); }
function eqKind(kindK){ for (const sl of EQUIP.slots){ const x = sl.kinds.find(v => v[0] === kindK); if (x) return { sl, k:x[0], n:x[1], sub:x[2], icon:x[3] }; } return null; }
// 아이콘 — 종류에 지정된 키, 없으면 eq_<종류>, 그것도 없으면 주먹(train_atk)
function eqIcon(k){ const kd = eqKind(k); return ASSET[(kd && kd.icon) || ''] || ASSET['eq_' + k] || ASSET.train_atk || ''; }
function eqInv(k){ return S.inv[k] || (S.inv[k] = EQUIP.grades.map(() => 0)); }
function eqLvs(k){ return S.itemLv[k] || (S.itemLv[k] = EQUIP.grades.map(() => 0)); }
function itemLv(k, g){ return (S.itemLv[k] || [])[g] | 0; }
function eqSeen(k, g){ return !!((S.codex[k] | 0) & (1 << g)); }
function itemLabel(k, g){ const kd = eqKind(k); return EQUIP.grades[g].n + ' ' + (kd ? kd.n : k); }
// 장착 효과(%) — 등급 base × 레벨 배율
function itemPct(k, g, lv){ return EQUIP.grades[g].base * (1 + EQUIP.lvPer * (lv !== undefined ? lv : itemLv(k, g))); }
function itemHold(k, g, lv){ return itemPct(k, g, lv) * EQUIP.codexRate; }         // 보유 효과(%)
function slotPct(slotK){ const it = S.equip[slotK]; return it ? itemPct(it.k, it.g) : 0; }
function codexPct(sl){                                       // 그 자리 종류들의 보유 효과 합
  let p = 0;
  for (const kd of sl.kinds) for (let g = 0; g < EQUIP.grades.length; g++) if (eqSeen(kd[0], g)) p += itemHold(kd[0], g);
  return p;
}
function eqBonus(stat){
  if (!S.equip) return 0;
  let b = 0;
  for (const sl of EQUIP.slots){
    if (sl.stat === stat) b += slotPct(sl.k) + codexPct(sl);
    const it = S.equip[sl.k];
    if (it){ const kd = eqKind(it.k); if (kd && kd.sub === stat) b += slotPct(sl.k) * EQUIP.subRate; }
  }
  return b;
}
function eqLogPush(msg){ S.eqLog.unshift(msg); if (S.eqLog.length > 4) S.eqLog.length = 4; }
// 주머니에 넣기 — 도감 표시. 합성·장착은 수동(버튼)이다.
function eqGain(k, g, n){
  const kd = eqKind(k); if (!kd) return false;
  eqInv(k)[g] += n || 1; S.codex[k] = (S.codex[k] | 0) | (1 << g);
  if (!S.equip[kd.sl.k]) S.equip[kd.sl.k] = { k, g };          // 빈 자리는 바로 낀다 (첫 장비)
  return true;
}
// 합성 — 같은 아이템 mergeN개 → 한 등급 위 1개 (한 번). 최고 등급은 안 된다.
function canMerge(k, g){ return g < EQUIP.grades.length - 1 && eqInv(k)[g] >= EQUIP.mergeN; }
function eqMerge(k, g){
  if (!canMerge(k, g)) return false;
  const inv = eqInv(k); inv[g] -= EQUIP.mergeN; inv[g + 1] += 1; S.codex[k] = (S.codex[k] | 0) | (1 << (g + 1));
  eqLogPush(itemLabel(k, g) + ' ×' + EQUIP.mergeN + ' → ' + itemLabel(k, g + 1));
  return true;
}
function mergeCount(){ let n = 0; for (const k in S.inv) for (let g = 0; g < EQUIP.grades.length - 1; g++) if (canMerge(k, g)) n += Math.floor(eqInv(k)[g] / EQUIP.mergeN); return n; }
function eqMergeAll(){ let n = 0; for (const sl of EQUIP.slots) for (const kd of sl.kinds) for (let g = 0; g < EQUIP.grades.length - 1; g++) while (eqMerge(kd[0], g)) n++; return n; }
// 자동 장착 — 자리마다 가진 것 중 장착 효과(레벨 반영)가 가장 큰 것
function eqBest(slotK){
  const sl = eqSlot(slotK); let best = null, bp = -1;
  for (const kd of sl.kinds){ const inv = S.inv[kd[0]]; if (!inv) continue;
    for (let g = 0; g < EQUIP.grades.length; g++) if (inv[g] > 0){ const p = itemPct(kd[0], g); if (p > bp){ bp = p; best = { k: kd[0], g }; } } }
  return best;
}
function eqAutoEquip(slotK){
  const best = eqBest(slotK), cur = S.equip[slotK];
  if (best && (!cur || itemPct(best.k, best.g) > slotPct(slotK) + 1e-9)){ S.equip[slotK] = best; eqLogPush(itemLabel(best.k, best.g) + ' 장착'); return true; }
  return false;
}
function eqAutoEquipAll(){ let n = 0; for (const sl of EQUIP.slots) if (eqAutoEquip(sl.k)) n++; return n; }
function eqWear(k, g){
  const kd = eqKind(k); if (!kd || !(eqInv(k)[g] > 0)) return false;
  S.equip[kd.sl.k] = { k, g }; eqLogPush(itemLabel(k, g) + ' 장착'); return true;
}
// 강화(레벨업) — 은자. 가진 아이템만(개수 0이어도 얻어 봤으면 보유 효과용으로 허용).
function lvCost(k, g){ return Math.round(killSilver() * EQUIP.costK * (g + 1) * Math.pow(EQUIP.costGrow, itemLv(k, g))); }
function canLevelItem(k, g){ return eqSeen(k, g) && itemLv(k, g) < EQUIP.grades[g].lvCap && S.silver >= lvCost(k, g); }
function levelItem(k, g){ if (!canLevelItem(k, g)) return false; S.silver -= lvCost(k, g); eqLvs(k)[g]++; return true; }
function eqBetterAny(){ return EQUIP.slots.some(sl => { const b = eqBest(sl.k); return b && itemPct(b.k, b.g) > slotPct(sl.k) + 1e-9; }); }
function canEquipAny(){ return mergeCount() > 0 || eqBetterAny(); }   // 탭 알림점 — 할 일이 있다
function codexCount(){ let n = 0; for (const sl of EQUIP.slots) for (const kd of sl.kinds) for (let g = 0; g < EQUIP.grades.length; g++) if (eqSeen(kd[0], g)) n++; return n; }
// 드랍 굴리기 — 구역 등급 가중으로 등급, 자리·종류는 균등
function newItem(zi){
  const sl = EQUIP.slots[Math.floor(Math.random() * EQUIP.slots.length)];
  const kind = sl.kinds[Math.floor(Math.random() * sl.kinds.length)][0];
  const w = EQUIP.gradeW[clamp(zi, 0, EQUIP.gradeW.length - 1)];
  let r = Math.random() * w.reduce((a, b) => a + b, 0), g = 0;
  for (let i = 0; i < w.length; i++){ r -= w[i]; if (r < 0){ g = i; break; } }
  return { k: kind, g };
}
function rollDrop(boss){
  const ch = boss ? EQUIP.bossDrop : EQUIP.dropCh;
  if (!(ch > 0) || Math.random() >= ch) return null;
  const it = newItem(S.zi), first = !eqSeen(it.k, it.g);
  eqGain(it.k, it.g, 1);
  eqLogPush(itemLabel(it.k, it.g) + ' 획득');
  if (first || it.g >= 2) toast(itemLabel(it.k, it.g) + ' 획득');
  return 'bag';
}

/* ── 패널 ── [무기][방어구][장신구] 탭 · 위: 낀 것 + 일괄 합성·자동 장착 · 아래: 아이템 카드(등급별 줄) ·
   카드 누르면 상세(장착·강화·합성). */
let eqTab = 'weapon', eqSel = null;
function eqCard(k, g, worn){
  const G = EQUIP.grades[g], n = eqInv(k)[g], seen = eqSeen(k, g), lv = itemLv(k, g);
  return '<button class="eqcard' + (seen ? ' seen' : '') + (n > 0 ? ' have' : '') + (worn ? ' worn' : '') +
    (eqSel && eqSel.k === k && eqSel.g === g ? ' sel' : '') + '" data-k="' + k + '" data-g="' + g + '" style="--gc:' + G.c + '">' +
    '<img src="' + eqIcon(k) + '" alt="">' +
    (seen ? '<em>Lv' + lv + '</em>' : '') + (n > 0 ? '<b>×' + n + '</b>' : '') + (worn ? '<i>착용</i>' : '') +
    (canMerge(k, g) ? '<s>합</s>' : '') + '</button>';
}
function buildEquipPanel(){
  const b = $('ebody'), sl = eqSlot(eqTab);
  let h = '<div id="etabs">';
  for (const s2 of EQUIP.slots) h += '<button class="askind' + (s2.k === eqTab ? ' on' : '') + '" data-t="' + s2.k + '">' + s2.n + '</button>';
  h += '<span id="eqcnt"></span></div>';
  // 낀 것 + 버튼
  h += '<div class="zrow eqtop" id="eqtop"></div>';
  h += '<div class="eqbtns"><button class="sb" id="eqmerge"></button><button class="sb" id="eqauto">자동 장착</button></div>';
  // 아이템 카드 — 등급 줄
  for (let g = EQUIP.grades.length - 1; g >= 0; g--){
    const G = EQUIP.grades[g];
    h += '<div class="eqsec" style="color:' + G.c + '">' + G.n + ' <i>장착 ' + G.base + '% · Lv 상한 ' + G.lvCap + '</i></div><div class="eqcards">';
    for (const kd of sl.kinds){ const worn = S.equip[sl.k] && S.equip[sl.k].k === kd[0] && S.equip[sl.k].g === g; h += eqCard(kd[0], g, worn); }
    h += '</div>';
  }
  h += '<div class="eqdet" id="eqdet" hidden></div>';
  h += '<div class="znote" id="eqlog"></div>';
  h += '<div class="znote">적을 잡으면 장비가 떨어져 주머니에 쌓인다. 같은 것 ' + EQUIP.mergeN + '개는 합성으로 한 등급 위가 되고, ' +
       '얻어 본 아이템은 안 껴도 보유 효과가 영구히 붙는다(레벨을 올리면 보유 효과도 는다). 보스는 반드시 떨어뜨린다.</div>';
  b.innerHTML = h;
  b.querySelectorAll('#etabs .askind').forEach(el => { el.onclick = () => { eqTab = el.dataset.t; eqSel = null; buildEquipPanel(); }; });
  $('eqmerge').onclick = () => { const n = eqMergeAll(); if (n) toast('합성 ' + n + '회'); buildEquipPanel(); };
  $('eqauto').onclick  = () => { const n = eqAutoEquipAll(); toast(n ? '더 좋은 장비로 갈아입었다' : '이미 가장 좋은 장비다'); buildEquipPanel(); };
  b.querySelectorAll('.eqcard').forEach(el => { el.onclick = () => { const k = el.dataset.k, g = +el.dataset.g;
    if (!eqSeen(k, g)) return; eqSel = { k, g }; buildEquipPanel();
    const d = $('eqdet'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'nearest' }); }; });
  refreshEquip();
}
function refreshEquip(){
  $('esilver').innerHTML = coin() + ' ' + fmt(S.silver);
  $('eqcnt').textContent = '도감 ' + codexCount() + '/' + EQUIP.slots.reduce((a, sl) => a + sl.kinds.length, 0) * EQUIP.grades.length;
  const sl = eqSlot(eqTab), it = S.equip[sl.k], top = $('eqtop');
  if (!it) top.innerHTML = '<div class="zn"><span class="eqsl">' + sl.n + '</span> 비었다</div><div class="zd">적이 떨어뜨린다</div>';
  else {
    const G = EQUIP.grades[it.g], kd = eqKind(it.k), pct = slotPct(sl.k), cx = codexPct(sl);
    top.innerHTML = '<div class="eqrow"><div class="eqico" style="border-color:' + G.c + '"><img src="' + eqIcon(it.k) + '" alt=""><b>Lv' + itemLv(it.k, it.g) + '</b></div>' +
      '<div class="trl"><div class="zn"><span class="eqsl">' + sl.n + '</span> <em style="color:' + G.c + '">' + G.n + ' ' + kd.n + '</em></div>' +
      '<div class="zd">' + EQUIP.statName[sl.stat] + ' +' + pct.toFixed(1) + '%<br>' + EQUIP.statName[kd.sub] + ' +' + (pct * EQUIP.subRate).toFixed(1) + '%' +
      '<br><span class="eqhold">보유 효과 합 ' + EQUIP.statName[sl.stat] + ' +' + cx.toFixed(1) + '%</span></div></div></div>';
  }
  const mc = mergeCount(); $('eqmerge').textContent = '일괄 합성' + (mc ? ' (' + mc + ')' : ''); $('eqmerge').disabled = !mc;
  $('eqauto').classList.toggle('on', eqBetterAny());
  // 상세
  const d = $('eqdet');
  if (eqSel && eqSeen(eqSel.k, eqSel.g)){
    const { k, g } = eqSel, G = EQUIP.grades[g], kd = eqKind(k), n = eqInv(k)[g], lv = itemLv(k, g), cap = G.lvCap;
    const worn = S.equip[kd.sl.k] && S.equip[kd.sl.k].k === k && S.equip[kd.sl.k].g === g;
    d.hidden = false;
    d.innerHTML = '<div class="zn"><em style="color:' + G.c + '">' + G.n + '</em> ' + kd.n + ' <small>Lv ' + lv + ' / ' + cap + ' · 보유 ×' + n + '</small></div>' +
      '<div class="zd"><span class="eqlab">장착</span>' + EQUIP.statName[kd.sl.stat] + ' +' + itemPct(k, g).toFixed(1) + '%' +
      (lv < cap ? ' <i>→ +' + itemPct(k, g, lv + 1).toFixed(1) + '%</i>' : '') +
      '<br><span class="eqlab"></span>' + EQUIP.statName[kd.sub] + ' +' + (itemPct(k, g) * EQUIP.subRate).toFixed(1) + '%' +
      (lv < cap ? ' <i>→ +' + (itemPct(k, g, lv + 1) * EQUIP.subRate).toFixed(1) + '%</i>' : '') + '</div>' +
      '<div class="zd"><span class="eqlab">보유</span>' + EQUIP.statName[kd.sl.stat] + ' +' + itemHold(k, g).toFixed(2) + '%' + (lv < cap ? ' <i>→ +' + itemHold(k, g, lv + 1).toFixed(2) + '%</i>' : '') + ' <small>(영구)</small></div>' +
      '<div class="zst">' +
      '<button class="sb" id="eqdwear"' + (worn || n <= 0 ? ' disabled' : '') + '>' + (worn ? '착용 중' : '장착') + '</button>' +
      '<button class="trbuy" id="eqdlv"' + (canLevelItem(k, g) ? '' : ' disabled') + '><span>' + (lv >= cap ? '상한' : '강화 ' + fmt(lvCost(k, g))) + '</span><i>' + coin() + '</i></button>' +
      '<button class="sb" id="eqdmerge"' + (canMerge(k, g) ? '' : ' disabled') + '>합성 ' + EQUIP.mergeN + '→1' + (g < EQUIP.grades.length - 1 ? '' : ' (최고)') + '</button>' +
      '</div>';
    $('eqdwear').onclick = () => { if (eqWear(k, g)) buildEquipPanel(); };
    $('eqdmerge').onclick = () => { if (eqMerge(k, g)) buildEquipPanel(); };
    const lb = $('eqdlv'); let iv = 0; const stop = ()=>{ if (iv){ clearInterval(iv); iv = 0; } };
    lb.onpointerdown = e => { e.preventDefault(); if (levelItem(k, g)) refreshEquip(); stop();
      iv = setInterval(()=>{ if (levelItem(k, g)) refreshEquip(); else stop(); }, 140); };
    lb.onpointerup = lb.onpointerleave = lb.onpointercancel = stop;
  } else { d.hidden = true; d.innerHTML = ''; }
  // 카드 값 갱신 (레벨·개수·착용)
  $('ebody').querySelectorAll('.eqcard').forEach(el => {
    const k = el.dataset.k, g = +el.dataset.g, n = eqInv(k)[g], seen = eqSeen(k, g);
    const worn = S.equip[eqTab] && S.equip[eqTab].k === k && S.equip[eqTab].g === g;
    el.classList.toggle('seen', seen); el.classList.toggle('have', n > 0); el.classList.toggle('worn', !!worn);
    el.classList.toggle('sel', !!(eqSel && eqSel.k === k && eqSel.g === g));
    const em = el.querySelector('em'); if (em) em.textContent = 'Lv' + itemLv(k, g);
    const bb = el.querySelector('b'); if (bb) bb.textContent = n > 0 ? '×' + n : '';
    const ss = el.querySelector('s'); if (ss) ss.style.display = canMerge(k, g) ? '' : 'none';
  });
  $('eqlog').innerHTML = S.eqLog.length ? '최근: ' + S.eqLog.join(' · ') : '아직 떨어진 장비가 없다.';
}
function openEquip(){ buildEquipPanel(); $('epanel').classList.add('show'); }
function closeEquip(){ $('epanel').classList.remove('show'); }
let eqLastSilver = -1, eqLastSig = '';
function equipHud(){
  const dot = $('tab-equip') && $('tab-equip').querySelector('.dot');
  if (dot && dot.classList) dot.classList.toggle('on', canEquipAny());
  if (!$('epanel') || !$('epanel').classList.contains('show')) return;
  const sig = (S.eqLog[0] || '') + '|' + mergeCount();
  if (eqLastSilver !== S.silver || eqLastSig !== sig){ eqLastSilver = S.silver; eqLastSig = sig; refreshEquip(); }
}
