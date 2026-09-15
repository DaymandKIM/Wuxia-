/* ── 장비 (v2.66) ─────────────────────────────────────
   숫자는 00-data.js의 EQUIP. 세 자리(무기·방어구·장신구), 처치 드랍 → 더 좋으면 자동
   장착(강화 레벨 전승) · 아니면 자동 판매. 강화는 은자. 효과는 전부 %.
   전투 수식은 00-data의 heroDmg 등이 eqBonus(stat)를 합산한다. */
function eqSlot(k){ return EQUIP.slots.find(s => s.k === k); }
function eqKindName(sl, k){ const x = sl.kinds.find(v => v[0] === k); return x ? x[1] : k; }
function itemPct(it){ return EQUIP.grades[it.g].base * (1 + EQUIP.lvPer * it.lv); }
function itemName(it){ return EQUIP.grades[it.g].n + ' ' + eqKindName(eqSlot(it.slot || slotOf(it)), it.k); }
function slotOf(it){ for (const sl of EQUIP.slots) if (sl.kinds.some(v => v[0] === it.k)) return sl.k; return 'weapon'; }
// 스텟별 장비 보너스(%) — 주 효과 전부 + 부가 효과(subRate)
function eqBonus(stat){
  if (!S.equip) return 0;
  let b = 0;
  for (const sl of EQUIP.slots){
    const it = S.equip[sl.k]; if (!it) continue;
    if (sl.stat === stat) b += itemPct(it);
    if (sl.sub === stat)  b += itemPct(it) * EQUIP.subRate;
  }
  return b;
}
// 드랍 굴리기 — 구역 품계 가중으로 품계, 자리·종류는 균등
function newItem(zi){
  const sl = EQUIP.slots[Math.floor(Math.random() * EQUIP.slots.length)];
  const kind = sl.kinds[Math.floor(Math.random() * sl.kinds.length)][0];
  const w = EQUIP.gradeW[clamp(zi, 0, EQUIP.gradeW.length - 1)];
  let r = Math.random() * w.reduce((a, b) => a + b, 0), g = 0;
  for (let i = 0; i < w.length; i++){ r -= w[i]; if (r < 0){ g = i; break; } }
  return { slot: sl.k, k: kind, g, lv: 0 };
}
function sellPrice(it){ return Math.round(killSilver() * EQUIP.sell * (it.g + 1)); }
function eqLogPush(msg){ S.eqLog.unshift(msg); if (S.eqLog.length > 4) S.eqLog.length = 4; }
// 처치 시 — 확률(보스는 반드시)로 드랍. 더 좋은 품계면 장착(강화 전승), 아니면 판매.
function rollDrop(boss){
  if (!(boss ? EQUIP.bossDrop : EQUIP.dropCh) || Math.random() >= (boss ? EQUIP.bossDrop : EQUIP.dropCh)) return null;
  const it = newItem(S.zi), cur = S.equip[it.slot];
  const name = EQUIP.grades[it.g].n + ' ' + eqKindName(eqSlot(it.slot), it.k);
  if (!cur || it.g > cur.g){
    const lv = cur ? Math.min(cur.lv, EQUIP.lvCap[it.g]) : 0;   // 강화 전승 — 방치형이라 잃지 않는다
    S.equip[it.slot] = { k: it.k, g: it.g, lv };
    eqLogPush(name + ' — 장착' + (lv ? ' (+' + lv + ' 전승)' : ''));
    toast(name + ' 획득 · 장착');
    sfx('kill');
    return 'equip';
  }
  const sv = sellPrice(it); S.silver += sv;
  eqLogPush(name + ' — 판매 +' + fmt(sv));
  return 'sell';
}
function enhCost(slotK){
  const it = S.equip[slotK]; if (!it) return Infinity;
  return Math.round(killSilver() * EQUIP.costK * Math.pow(EQUIP.costGrow, it.lv));
}
function canEnhance(slotK){
  const it = S.equip[slotK];
  return !!it && it.lv < EQUIP.lvCap[it.g] && S.silver >= enhCost(slotK);
}
function enhance(slotK){
  if (!canEnhance(slotK)) return false;
  S.silver -= enhCost(slotK); S.equip[slotK].lv++;
  return true;
}
function canEquipAny(){ return EQUIP.slots.some(sl => canEnhance(sl.k)); }

/* ── 패널 ── 자리 카드 3장 + 최근 드랍 기록. 값만 갱신(버튼 유지). */
function buildEquipPanel(){
  const b = $('ebody');
  let h = '';
  for (const sl of EQUIP.slots){
    h += '<div class="zrow eqrow" id="eq-' + sl.k + '">' +
         '<div class="eqico"><img id="eqi-' + sl.k + '" alt=""><b id="eqg-' + sl.k + '"></b></div>' +
         '<div class="trl"><div class="zn"><span class="eqsl">' + sl.n + '</span> <em id="eqn-' + sl.k + '"></em></div>' +
         '<div class="zd" id="eqd-' + sl.k + '"></div></div>' +
         '<button class="trbuy" data-k="' + sl.k + '"><span id="eqc-' + sl.k + '"></span><i>' + coin() + '</i></button>' +
         '</div>';
  }
  h += '<div class="znote" id="eqlog"></div>' +
       '<div class="znote">적을 잡으면 가끔 장비가 떨어진다. 지금 것보다 좋은 품계면 바로 갈아입고(강화는 이어진다), ' +
       '아니면 은자로 판다. 깊은 구역일수록 좋은 품계가 나온다. 보스는 반드시 떨어뜨린다.</div>';
  b.innerHTML = h;
  b.querySelectorAll('.trbuy').forEach(el => {
    const k = el.dataset.k; let iv = 0;
    const stop = ()=>{ if (iv){ clearInterval(iv); iv = 0; } };
    el.onpointerdown = e => { e.preventDefault(); if (enhance(k)) refreshEquip(); stop();
      iv = setInterval(()=>{ if (enhance(k)) refreshEquip(); else stop(); }, 160); };
    el.onpointerup = el.onpointerleave = el.onpointercancel = stop;
  });
  refreshEquip();
}
function refreshEquip(){
  $('esilver').innerHTML = coin() + ' ' + fmt(S.silver);
  for (const sl of EQUIP.slots){
    const it = S.equip[sl.k], row = $('eq-' + sl.k), btn = row.querySelector('.trbuy');
    const im = $('eqi-' + sl.k);
    if (!it){
      im.style.display = 'none'; $('eqg-' + sl.k).textContent = '';
      $('eqn-' + sl.k).textContent = '비었다'; $('eqd-' + sl.k).textContent = '적이 떨어뜨린다';
      row.style.borderColor = ''; $('eqc-' + sl.k).textContent = '—'; btn.disabled = true; continue;
    }
    const G = EQUIP.grades[it.g], pct = itemPct(it), cap = EQUIP.lvCap[it.g];
    if (ASSET['eq_' + it.k]){ im.src = ASSET['eq_' + it.k]; im.style.display = ''; } else im.style.display = 'none';
    $('eqg-' + sl.k).textContent = '+' + it.lv; $('eqg-' + sl.k).style.color = G.c;
    $('eqn-' + sl.k).textContent = G.n + ' ' + eqKindName(sl, it.k); $('eqn-' + sl.k).style.color = G.c;
    row.style.borderColor = G.c + '88';
    let d = EQUIP.statName[sl.stat] + ' +' + pct.toFixed(1) + '%';
    if (sl.sub) d += ' · ' + EQUIP.statName[sl.sub] + ' +' + (pct * EQUIP.subRate).toFixed(1) + '%';
    d += ' · 강화 ' + it.lv + '/' + cap;
    if (it.lv < cap) d += ' → +' + (EQUIP.grades[it.g].base * (1 + EQUIP.lvPer * (it.lv + 1))).toFixed(1) + '%';
    $('eqd-' + sl.k).textContent = d;
    if (it.lv >= cap){ $('eqc-' + sl.k).textContent = '상한'; btn.disabled = true; }
    else { $('eqc-' + sl.k).textContent = fmt(enhCost(sl.k)); btn.disabled = !canEnhance(sl.k); }
  }
  $('eqlog').innerHTML = S.eqLog.length ? '최근: ' + S.eqLog.join(' · ') : '아직 떨어진 장비가 없다.';
}
function openEquip(){ buildEquipPanel(); $('epanel').classList.add('show'); }
function closeEquip(){ $('epanel').classList.remove('show'); }
let eqLastSilver = -1;
function equipHud(){
  const dot = $('tab-equip') && $('tab-equip').querySelector('.dot');
  if (dot && dot.classList) dot.classList.toggle('on', canEquipAny());
  if (!$('epanel') || !$('epanel').classList.contains('show')) return;
  if (eqLastSilver !== S.silver){ eqLastSilver = S.silver; refreshEquip(); }
}
