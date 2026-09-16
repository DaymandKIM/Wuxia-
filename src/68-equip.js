/* ── 장비 · 표준형 (v2.70) ─────────────────────────────
   숫자는 00-data.js의 EQUIP. 드랍 → 주머니(S.inv[종류][등급]) → 합성(수동·일괄) → 장착(자동 장착 버튼
   또는 카드 상세에서 직접). 아이템마다 레벨(S.itemLv) — 장착 효과·보유 효과가 그 레벨을 탄다.
   얻어 본 아이템(S.codex 비트)은 영구 보유 효과. 전투 수식은 00-data의 heroDmg 등이 eqBonus(stat)를 합산. */
function eqSlot(k){ return EQUIP.slots.find(s => s.k === k); }
function eqKind(kindK){ for (const sl of EQUIP.slots){ const x = sl.kinds.find(v => v[0] === kindK); if (x) return { sl, k:x[0], n:x[1], sub:x[2], icon:x[3] }; } return null; }
// 아이콘 — 종류에 지정된 키, 없으면 eq_<종류>, 그것도 없으면 주먹(train_atk)
// 아이콘 — 등급별(eq_<종류>_<등급>, v2.80 사용자 시트)이 있으면 그것, 없으면 종류 기본(eq_<종류> 또는 kinds[3])
function eqIcon(k, g){ const kd = eqKind(k); return (g !== undefined && ASSET['eq_' + k + '_' + g]) || ASSET[(kd && kd.icon) || ''] || ASSET['eq_' + k] || ''; }
function eqHasIcon(k){ return !!eqIcon(k); }
function eqKinds(sl){ return sl.kinds.filter(kd => eqHasIcon(kd[0])); }   // 화면·드랍에 쓰는 종류 = 아이콘 있는 것만
// 시작 장비 — 자리에 아무것도 없고(장착·주머니·도감) 시작 종류가 있으면 일반 등급 하나를 주고 낀다
function eqStarter(){
  let n = 0;
  for (const sl of EQUIP.slots){
    if (S.equip[sl.k]) continue;
    if (sl.kinds.some(kd => eqSeen(kd[0], 0) || (S.inv[kd[0]] || []).some(x => x > 0))) continue;
    const k = (EQUIP.starter[sl.k] || []).find(eqHasIcon); if (!k) continue;
    eqGain(k, 0, 1); S.equip[sl.k] = { k, g:0 }; eqLogPush(itemLabel(k, 0) + ' — 시작 장비'); n++;
  }
  return n;
}
function eqInv(k){ return S.inv[k] || (S.inv[k] = EQUIP.grades.map(() => 0)); }
function eqLvs(k){ return S.itemLv[k] || (S.itemLv[k] = EQUIP.grades.map(() => 0)); }
function itemLv(k, g){ return (S.itemLv[k] || [])[g] | 0; }
function eqSeen(k, g){ return !!((S.codex[k] | 0) & (1 << g)); }
function itemLabel(k, g){ const kd = eqKind(k); return EQUIP.grades[g].n + ' ' + (kd ? kd.n : k); }
// 장착 효과(%) — 등급 base × 레벨 배율
function itemPct(k, g, lv){ return EQUIP.grades[g].base * (1 + EQUIP.lvPer * (lv !== undefined ? lv : itemLv(k, g))); }
function itemHold(k, g, lv){ return itemPct(k, g, lv) * EQUIP.codexRate; }         // 보유 효과(%)
function slotPct(slotK){ const it = S.equip[slotK]; return it ? itemPct(it.k, it.g) : 0; }
// 종류별 스탯 조합 (v2.82) — EQUIP.profile[종류]가 있으면 그것(무기), 없으면 자리 주 스탯 1.0 + 부가 스탯 subRate
function kindEff(k){
  const kd = eqKind(k); if (!kd) return {};
  const p = EQUIP.profile && EQUIP.profile[k]; if (p) return p;
  const e = {}; e[kd.sl.stat] = 1; if (kd.sub) e[kd.sub] = (e[kd.sub] || 0) + EQUIP.subRate; return e;
}
// 아이템 하나의 스탯 줄 [{stat, pct}] — 장착(hold=false) 또는 보유(hold=true)
function itemStats(k, g, lv, hold){
  const base = hold ? itemHold(k, g, lv) : itemPct(k, g, lv), e = kindEff(k);
  return Object.keys(e).map(st => ({ stat: st, pct: base * e[st] }));
}
function codexStat(sl, stat){                                // 그 자리 종류들의 보유 효과 합 (스탯 하나)
  let p = 0;
  for (const kd of sl.kinds){ const e = kindEff(kd[0])[stat]; if (!e) continue;
    for (let g = 0; g < EQUIP.grades.length; g++) if (eqSeen(kd[0], g)) p += itemHold(kd[0], g) * e; }
  return p;
}
function codexPct(sl){ return codexStat(sl, sl.stat); }
function eqBonus(stat){
  if (!S.equip) return 0;
  let b = 0;
  for (const sl of EQUIP.slots){
    const it = S.equip[sl.k];
    if (it){ const e = kindEff(it.k)[stat]; if (e) b += slotPct(sl.k) * e; }
    b += codexStat(sl, stat);
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
// 합성은 낀 것도 재료로 쓴다 (v2.82.1, 사용자: "낀 것도 업글해도 되지 — 한 번 얻은 건 열어주는 식으로"). 착용은 주머니 개수가
// 아니라 **얻어 본 적(도감)** 에 묶인다 — 낀 것을 합성해 개수가 0이 돼도 계속 끼고 있고, 얻어 본 장비는 언제든 다시 낀다.
function eqSpare(k, g){ return eqInv(k)[g]; }
function canMerge(k, g){ return g < EQUIP.grades.length - 1 && eqSpare(k, g) >= EQUIP.mergeN; }
function eqMerge(k, g){
  if (!canMerge(k, g)) return false;
  const inv = eqInv(k); inv[g] -= EQUIP.mergeN; inv[g + 1] += 1; S.codex[k] = (S.codex[k] | 0) | (1 << (g + 1));
  eqLogPush(itemLabel(k, g) + ' ×' + EQUIP.mergeN + ' → ' + itemLabel(k, g + 1));
  return true;
}
function mergeCount(){ let n = 0; for (const k in S.inv) for (let g = 0; g < EQUIP.grades.length - 1; g++) if (canMerge(k, g)) n += Math.floor(eqSpare(k, g) / EQUIP.mergeN); return n; }
function eqMergeAll(){ let n = 0; for (const sl of EQUIP.slots) for (const kd of sl.kinds) for (let g = 0; g < EQUIP.grades.length - 1; g++) while (eqMerge(kd[0], g)) n++; return n; }
// 자동 장착 — 자리마다 가진 것 중 장착 효과(레벨 반영)가 가장 큰 것
function eqBest(slotK){
  const sl = eqSlot(slotK); let best = null, bp = -1;
  for (const kd of sl.kinds)
    for (let g = 0; g < EQUIP.grades.length; g++) if (eqSeen(kd[0], g)){ const p = itemPct(kd[0], g); if (p > bp){ bp = p; best = { k: kd[0], g }; } }   // 얻어 본 것 전부 (v2.82.1)
  return best;
}
function eqAutoEquip(slotK){
  const best = eqBest(slotK), cur = S.equip[slotK];
  if (best && (!cur || itemPct(best.k, best.g) > slotPct(slotK) + 1e-9)){ S.equip[slotK] = best; eqLogPush(itemLabel(best.k, best.g) + ' 장착'); return true; }
  return false;
}
function eqAutoEquipAll(){ let n = 0; for (const sl of EQUIP.slots) if (eqAutoEquip(sl.k)) n++; return n; }
function eqWear(k, g){
  const kd = eqKind(k); if (!kd || !eqSeen(k, g)) return false;          // 얻어 본 것이면 개수 0이어도 낀다 (v2.82.1)
  S.equip[kd.sl.k] = { k, g }; eqLogPush(itemLabel(k, g) + ' 장착'); return true;
}
// 무기 벗기 → 맨손(주먹·발차기 무브셋). v2.76.9 사용자: "무기 중에 권이 없어서 주먹 모션을 못 봐" — 권갑 아이콘이 올 때까지
// 무기를 한 번 끼면 맨손으로 돌아갈 길이 없었다. 자동 장착은 버튼을 눌러야만 다시 낀다.
function eqUnwear(slotK){
  const it = S.equip[slotK]; if (!it) return false;
  S.equip[slotK] = null; eqLogPush(itemLabel(it.k, it.g) + ' 벗음 — 맨손'); return true;
}
// 강화(레벨업) — 은자. 가진 아이템만(개수 0이어도 얻어 봤으면 보유 효과용으로 허용).
function lvCost(k, g){ return Math.round(killSilver() * EQUIP.costK * (g + 1) * Math.pow(EQUIP.costGrow, itemLv(k, g))); }
function canLevelItem(k, g){ return eqSeen(k, g) && itemLv(k, g) < EQUIP.grades[g].lvCap && S.silver >= lvCost(k, g); }
function levelItem(k, g){ if (!canLevelItem(k, g)) return false; S.silver -= lvCost(k, g); eqLvs(k)[g]++; return true; }
function eqBetterAny(){ return EQUIP.slots.some(sl => { const b = eqBest(sl.k); return b && itemPct(b.k, b.g) > slotPct(sl.k) + 1e-9; }); }
function canEquipAny(){ return mergeCount() > 0 || eqBetterAny(); }   // 탭 알림점 — 할 일이 있다
function codexCount(){ let n = 0; for (const sl of EQUIP.slots) for (const kd of eqKinds(sl)) for (let g = 0; g < EQUIP.grades.length; g++) if (eqSeen(kd[0], g)) n++; return n; }
// 드랍 굴리기 — 구역 등급 가중으로 등급, 자리·종류는 균등
function newItem(zi){
  const sl = EQUIP.slots[Math.floor(Math.random() * EQUIP.slots.length)];
  const ks = eqKinds(sl); if (!ks.length) return null;
  const kind = ks[Math.floor(Math.random() * ks.length)][0];
  const w = EQUIP.gradeW[clamp(zi, 0, EQUIP.gradeW.length - 1)];
  let r = Math.random() * w.reduce((a, b) => a + b, 0), g = 0;
  for (let i = 0; i < w.length; i++){ r -= w[i]; if (r < 0){ g = i; break; } }
  return { k: kind, g };
}
function rollDrop(boss){
  const ch = boss ? EQUIP.bossDrop : EQUIP.dropCh;
  if (!(ch > 0) || Math.random() >= ch) return null;
  const it = newItem(S.zi); if (!it) return null;
  const first = !eqSeen(it.k, it.g);
  eqGain(it.k, it.g, 1);
  eqLogPush(itemLabel(it.k, it.g) + ' 획득');
  if (first || it.g >= 2) toast(itemLabel(it.k, it.g) + ' 획득', { icon: eqIcon(it.k, it.g), color: EQUIP.grades[it.g].c, sec: 2.2 });   // 그림 팝업 (v2.86)
  return 'bag';
}

/* ── 패널 ── [무기][방어구][장신구] 탭 · 위: 낀 것 + 일괄 합성·자동 장착 · 아래: 아이템 카드(등급별 줄) ·
   카드 누르면 상세(장착·강화·합성). */
let eqTab = 'weapon', eqSel = null;
function eqCard(k, g, worn){
  const G = EQUIP.grades[g], n = eqInv(k)[g], seen = eqSeen(k, g), lv = itemLv(k, g);
  return '<button class="eqcard' + (seen ? ' seen' : '') + (n > 0 ? ' have' : '') + (worn ? ' worn' : '') +
    (eqSel && eqSel.k === k && eqSel.g === g ? ' sel' : '') + '" data-k="' + k + '" data-g="' + g + '" style="--gc:' + G.c + '">' +
    '<img src="' + eqIcon(k, g) + '" alt="">' +
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
  for (let g = 0; g < EQUIP.grades.length; g++){                    // 일반이 위(v2.70.2, 사용자: "등급 낮은 게 위에서부터")
    const G = EQUIP.grades[g];
    h += '<div class="eqsec" style="color:' + G.c + '">' + G.n + ' <i>장착 ' + G.base + '% · Lv 상한 ' + G.lvCap + '</i></div><div class="eqcards">';
    for (const kd of eqKinds(sl)){ const worn = S.equip[sl.k] && S.equip[sl.k].k === kd[0] && S.equip[sl.k].g === g; h += eqCard(kd[0], g, worn); }
    h += '</div>';
  }
  h += '<div class="znote" id="eqlog"></div>';
  h += '<div class="znote">적을 잡으면 장비가 떨어져 주머니에 쌓인다. 같은 것 ' + EQUIP.mergeN + '개는 합성으로 한 등급 위가 되고, ' +
       '얻어 본 아이템은 안 껴도 보유 효과가 영구히 붙는다(레벨을 올리면 보유 효과도 는다). 보스는 반드시 떨어뜨린다.</div>';
  b.innerHTML = h;
  b.querySelectorAll('#etabs .askind').forEach(el => { el.onclick = () => { eqTab = el.dataset.t; eqSel = null; buildEquipPanel(); }; });
  $('eqmerge').onclick = () => { const n = eqMergeAll(); if (n) toast('합성 ' + n + '회'); buildEquipPanel(); };
  $('eqauto').onclick  = () => { const n = eqAutoEquipAll(); toast(n ? '더 좋은 장비로 갈아입었다' : '이미 가장 좋은 장비다'); buildEquipPanel(); };
  b.querySelectorAll('.eqcard').forEach(el => { el.onclick = () => { const k = el.dataset.k, g = +el.dataset.g;
    eqSel = { k, g }; buildEquipPanel();                        // 안 가진 것도 눌러 능력치를 본다 (v2.82) — 위쪽 창에 보인다 (v2.83)
    const b2 = $('ebody'); if (b2) b2.scrollTop = 0; }; });
  refreshEquip();
}
function refreshEquip(){
  $('esilver').innerHTML = coin() + ' ' + fmt(S.silver);
  $('eqcnt').textContent = '도감 ' + codexCount() + '/' + EQUIP.slots.reduce((a, sl) => a + eqKinds(sl).length, 0) * EQUIP.grades.length;
  const sl = eqSlot(eqTab), worn0 = S.equip[sl.k], top = $('eqtop');
  // 위쪽 창 = 누른 장비(없으면 낀 것) (v2.83, 사용자: "장비 클릭하면 위쪽 창에 해당 장비를 보여줘 — 착용한 건 카드로 아니까").
  // 행동(장착·강화·합성·벗기)도 여기서. 아래 등급 줄 밑 상세 칸은 뺐다.
  const sel = (eqSel && eqKind(eqSel.k) && eqKind(eqSel.k).sl.k === sl.k) ? eqSel : worn0;
  if (!sel){
    top.innerHTML = '<div class="zn"><span class="eqsl">' + sl.n + '</span> ' + (sl.k === 'weapon' ? '맨손' : '비었다') + '</div>' +
      '<div class="zd">' + (sl.k === 'weapon' ? '주먹·발차기로 싸운다<br>무기를 끼면 그 무기 동작으로' : '적이 떨어뜨린다') + '<br><small>아래 카드를 누르면 여기에 보인다</small></div>';
  } else {
    const { k, g } = sel, G = EQUIP.grades[g], kd = eqKind(k), n = eqInv(k)[g], lv = itemLv(k, g), cap = G.lvCap, seen = eqSeen(k, g);
    const worn = !!(worn0 && worn0.k === k && worn0.g === g);
    const cur = itemStats(k, g), nxt = itemStats(k, g, lv + 1), hold = itemStats(k, g, undefined, true), holdN = itemStats(k, g, lv + 1, true);
    const grow = seen && lv < cap;
    top.innerHTML = '<div class="eqrow"><div class="eqico' + (worn ? ' worn' : '') + '" style="border-color:' + G.c + '"><img src="' + eqIcon(k, g) + '" alt="">' +
        (seen ? '<b>Lv' + lv + '</b>' : '') + '</div>' +
      '<div class="trl"><div class="zn"><em style="color:' + G.c + '">' + G.n + '</em> ' + kd.n +
        (worn ? ' <i class="eqwornTag">착용 중</i>' : '') + ' <small>' + (seen ? 'Lv ' + lv + ' / ' + cap + ' · 보유 ×' + n : '미보유 · Lv 상한 ' + cap) + '</small></div>' +
      '<div class="zd">' + cur.map((x, i) => '<span class="eqlab">' + (i ? '' : '장착') + '</span>' + EQUIP.statName[x.stat] + ' +' + x.pct.toFixed(1) + '%' +
        (grow ? ' <i>→ +' + nxt[i].pct.toFixed(1) + '%</i>' : '')).join('<br>') + '</div>' +
      '<div class="zd"><span class="eqlab">보유</span>' + hold.map((x, i) => EQUIP.statName[x.stat] + ' +' + x.pct.toFixed(2) + '%' + (grow ? ' <i>→ +' + holdN[i].pct.toFixed(2) + '%</i>' : '')).join('<br><span class="eqlab"></span>') + ' <small>(영구)</small>' +
        '<br><span class="eqhold">이 자리 보유 효과 합 ' + EQUIP.statName[sl.stat] + ' +' + codexPct(sl).toFixed(1) + '%</span></div>' +
      (seen ? '' : '<div class="zd"><small>사냥에서 떨어지거나 아래 등급 ' + EQUIP.mergeN + '개를 합성하면 얻는다</small></div>') +
      '</div></div>' +
      '<div class="zst">' +
      (worn
        ? (sl.k === 'weapon' ? '<button class="sb" id="eqdwear">벗기 · 맨손</button>' : '<button class="sb" disabled>착용 중</button>')
        : '<button class="sb" id="eqdwear"' + (seen ? '' : ' disabled') + '>장착</button>') +
      '<button class="trbuy" id="eqdlv"' + (canLevelItem(k, g) ? '' : ' disabled') + '><span>' + (lv >= cap ? '상한' : '강화 ' + fmt(lvCost(k, g))) + '</span><i>' + coin() + '</i></button>' +
      '<button class="sb" id="eqdmerge"' + (canMerge(k, g) ? '' : ' disabled') + '>합성 ' + EQUIP.mergeN + '→1' + (g < EQUIP.grades.length - 1 ? '' : ' (최고)') + '</button>' +
      '</div>';
    const wb = $('eqdwear'); if (wb) wb.onclick = () => {
      if (worn){ if (eqUnwear(sl.k)){ toast('무기를 벗었다\n맨손 주먹·발차기'); buildEquipPanel(); } }
      else if (eqWear(k, g)) buildEquipPanel(); };
    $('eqdmerge').onclick = () => { if (eqMerge(k, g)){ toast(itemLabel(k, g + 1) + ' 합성', { icon: eqIcon(k, g + 1), color: EQUIP.grades[g + 1].c, sec: 2.2 }); buildEquipPanel(); } };
    const lb = $('eqdlv'); let iv = 0; const stop = ()=>{ if (iv){ clearInterval(iv); iv = 0; } };
    lb.onpointerdown = e => { e.preventDefault(); if (levelItem(k, g)) refreshEquip(); stop();
      iv = setInterval(()=>{ if (levelItem(k, g)) refreshEquip(); else stop(); }, 140); };
    lb.onpointerup = lb.onpointerleave = lb.onpointercancel = stop;
  }
  const mc = mergeCount(); $('eqmerge').textContent = '일괄 합성' + (mc ? ' (' + mc + ')' : ''); $('eqmerge').disabled = !mc;
  $('eqmerge').classList.toggle('on', mc > 0);   // 합성할 게 있으면 호박색으로 (v2.79.1 사용자: "활성화되면 색을 바꿔 잘 보이게")
  $('eqauto').classList.toggle('on', eqBetterAny());
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
