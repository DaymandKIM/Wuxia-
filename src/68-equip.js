/* ── 장비 · 도감형 (v2.67) ─────────────────────────────
   숫자는 00-data.js의 EQUIP. 드랍 → 주머니(S.inv[종류][품계]) → mergeN개면 자동 합성 → 가진 것
   중 최고 품계를 자리에 자동 장착. 얻어 본 칸은 도감(S.codex 비트)에 남아 보유 효과가 영구 가산.
   강화는 자리(S.eqLv)에 붙는다. 전투 수식은 00-data의 heroDmg 등이 eqBonus(stat)를 합산한다. */
function eqSlot(k){ return EQUIP.slots.find(s => s.k === k); }
function eqKind(kindK){ for (const sl of EQUIP.slots){ const x = sl.kinds.find(v => v[0] === kindK); if (x) return { sl, k:x[0], n:x[1], sub:x[2] }; } return null; }
function eqInv(k){ return S.inv[k] || (S.inv[k] = EQUIP.grades.map(() => 0)); }
function eqOwnedBits(k){ return S.codex[k] | 0; }
// 장착 효과(%) — 품계 base × 자리 강화 배율
function slotPct(slotK){
  const it = S.equip[slotK]; if (!it) return 0;
  return EQUIP.grades[it.g].base * (1 + EQUIP.lvPer * (S.eqLv[slotK] | 0));
}
// 보유 효과(%) — 그 자리 종류들의 얻어 본 품계 칸마다 base × codexRate
function codexPct(sl){
  let p = 0;
  for (const kd of sl.kinds){ const bits = eqOwnedBits(kd[0]);
    for (let g = 0; g < EQUIP.grades.length; g++) if (bits & (1 << g)) p += EQUIP.grades[g].base * EQUIP.codexRate; }
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
function itemLabel(k, g){ const kd = eqKind(k); return EQUIP.grades[g].n + ' ' + (kd ? kd.n : k); }
// 주머니에 넣기 — 도감 표시, 자동 합성, 자동 장착
function eqGain(k, g, n){
  const kd = eqKind(k); if (!kd) return;
  eqInv(k)[g] += n || 1;
  S.codex[k] = eqOwnedBits(k) | (1 << g);
  eqMerge(k, g);
  eqAutoEquip(kd.sl.k);
}
// 같은 종류·품계 mergeN개 → 한 품계 위 1개. 연쇄. 최고 품계는 안 합쳐진다.
function eqMerge(k, g){
  const inv = eqInv(k), top = EQUIP.grades.length - 1;
  for (; g < top; g++)
    while (inv[g] >= EQUIP.mergeN){            // 같은 품계에서 여러 번, 그다음 위 품계로
      inv[g] -= EQUIP.mergeN; inv[g + 1] += 1; S.codex[k] = eqOwnedBits(k) | (1 << (g + 1));
      eqLogPush(itemLabel(k, g) + ' ×' + EQUIP.mergeN + ' → ' + itemLabel(k, g + 1));
    }
}
// 자리에 가진 것 중 최고 품계를 — 같은 품계면 지금 것을 지킨다(직접 고른 종류 존중)
function eqAutoEquip(slotK){
  const sl = eqSlot(slotK); let best = null;
  for (const kd of sl.kinds){ const inv = S.inv[kd[0]]; if (!inv) continue;
    for (let g = EQUIP.grades.length - 1; g >= 0; g--) if (inv[g] > 0){ if (!best || g > best.g) best = { k: kd[0], g }; break; } }
  const cur = S.equip[slotK];
  if (best && (!cur || best.g > cur.g)){ S.equip[slotK] = best; eqLogPush(itemLabel(best.k, best.g) + ' 장착'); return true; }
  return false;
}
// 도감 칸을 눌러 직접 장착 — 가진 것만
function eqWear(k, g){
  const kd = eqKind(k); if (!kd || !(eqInv(k)[g] > 0)) return false;
  S.equip[kd.sl.k] = { k, g }; eqLogPush(itemLabel(k, g) + ' 장착(직접)'); return true;
}
// 드랍 굴리기 — 구역 품계 가중으로 품계, 자리·종류는 균등
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
  const it = newItem(S.zi), was = S.equip[eqKind(it.k).sl.k], first = !(eqOwnedBits(it.k) & (1 << it.g));
  eqGain(it.k, it.g, 1);
  const now = S.equip[eqKind(it.k).sl.k];
  const worn = now && (!was || now.g > was.g);
  if (worn){ toast(itemLabel(it.k, it.g) + ' 획득 · 장착'); sfx('kill'); return 'equip'; }
  if (first) toast(itemLabel(it.k, it.g) + ' — 도감에 올랐다');
  return 'bag';
}
function enhCost(slotK){ return Math.round(killSilver() * EQUIP.costK * Math.pow(EQUIP.costGrow, S.eqLv[slotK] | 0)); }
function canEnhance(slotK){ return !!S.equip[slotK] && (S.eqLv[slotK] | 0) < EQUIP.lvCap && S.silver >= enhCost(slotK); }
function enhance(slotK){ if (!canEnhance(slotK)) return false; S.silver -= enhCost(slotK); S.eqLv[slotK] = (S.eqLv[slotK] | 0) + 1; return true; }
function canEquipAny(){ return EQUIP.slots.some(sl => canEnhance(sl.k)); }
function codexCount(){ let n = 0; for (const sl of EQUIP.slots) for (const kd of sl.kinds){ let b = eqOwnedBits(kd[0]); while (b){ n += b & 1; b >>= 1; } } return n; }

/* ── 패널 ── 자리 카드 3장(장착·강화) + 도감 격자(16종 × 5품계). 값만 갱신(버튼 유지). */
let eqTab = 'wear';                // 장비 패널 탭 — 'wear'(장착·강화) · 'codex'(도감) (v2.69.8 "아래 보는 게 불편")
function buildEquipPanel(){
  const b = $('ebody');
  let h = '<div id="etabs"><button class="askind' + (eqTab === 'wear' ? ' on' : '') + '" data-t="wear">장착</button>' +
          '<button class="askind' + (eqTab === 'codex' ? ' on' : '') + '" data-t="codex">도감 <b id="eqcnt"></b></button></div>';
  h += '<div id="ewear"' + (eqTab === 'wear' ? '' : ' hidden') + '>';
  for (const sl of EQUIP.slots){
    h += '<div class="zrow eqrow" id="eq-' + sl.k + '">' +
         '<div class="eqico"><img id="eqi-' + sl.k + '" alt=""><b id="eqg-' + sl.k + '"></b></div>' +
         '<div class="trl"><div class="zn"><span class="eqsl">' + sl.n + '</span> <em id="eqn-' + sl.k + '"></em></div>' +
         '<div class="zd" id="eqd-' + sl.k + '"></div></div>' +
         '<button class="trbuy" data-k="' + sl.k + '"><span id="eqc-' + sl.k + '"></span><i>' + coin() + '</i></button>' +
         '</div>';
  }
  h += '<div class="znote" id="eqlog"></div>';
  h += '<div class="znote">적을 잡으면 장비가 떨어져 주머니에 쌓인다. 자리엔 가진 것 중 최고 품계가 저절로 끼워지고, ' +
       '강화는 자리에 붙어 갈아껴도 남는다. 보스는 반드시 떨어뜨린다.</div>';
  h += '</div><div id="ecodex"' + (eqTab === 'codex' ? '' : ' hidden') + '>';
  h += '<div class="znote eqhint">색 칸 = 지금 가진 것(누르면 낀다) · 점 = 얻어 본 것(보유 효과) · 같은 것 ' + EQUIP.mergeN + '개는 저절로 합쳐진다</div>';
  for (const sl of EQUIP.slots){
    h += '<div class="eqsec">' + sl.n + ' <i>' + EQUIP.statName[sl.stat] + '</i></div><div class="eqgrid">';
    for (const kd of sl.kinds){
      h += '<div class="eqk"><img src="' + (ASSET['eq_' + kd[0]] || '') + '" alt=""><span>' + kd[1] + '</span><em>' + EQUIP.statName[kd[2]] + '</em></div>';
      for (let g = 0; g < EQUIP.grades.length; g++)
        h += '<button class="eqc" data-k="' + kd[0] + '" data-g="' + g + '" style="--gc:' + EQUIP.grades[g].c + '"><b></b><i></i></button>';
    }
    h += '</div>';
  }
  h += '<div class="znote">얻어 본 칸마다 보유 효과가 영구히 붙는다 — 잡템도 버릴 게 없다.</div></div>';
  b.innerHTML = h;
  b.querySelectorAll('#etabs .askind').forEach(el => {
    el.onclick = () => { eqTab = el.dataset.t; buildEquipPanel(); };
  });
  b.querySelectorAll('.trbuy').forEach(el => {
    const k = el.dataset.k; let iv = 0;
    const stop = ()=>{ if (iv){ clearInterval(iv); iv = 0; } };
    el.onpointerdown = e => { e.preventDefault(); if (enhance(k)) refreshEquip(); stop();
      iv = setInterval(()=>{ if (enhance(k)) refreshEquip(); else stop(); }, 160); };
    el.onpointerup = el.onpointerleave = el.onpointercancel = stop;
  });
  b.querySelectorAll('.eqc').forEach(el => { el.onclick = () => { if (eqWear(el.dataset.k, +el.dataset.g)) refreshEquip(); }; });
  refreshEquip();
}
function refreshEquip(){
  $('esilver').innerHTML = coin() + ' ' + fmt(S.silver);
  for (const sl of EQUIP.slots){
    const it = S.equip[sl.k], row = $('eq-' + sl.k), btn = row.querySelector('.trbuy'), im = $('eqi-' + sl.k);
    const lv = S.eqLv[sl.k] | 0, cx = codexPct(sl);
    if (!it){
      im.style.display = 'none'; $('eqg-' + sl.k).textContent = '';
      $('eqn-' + sl.k).textContent = '비었다'; $('eqn-' + sl.k).style.color = '';
      $('eqd-' + sl.k).textContent = '적이 떨어뜨린다' + (cx ? ' · 보유 +' + cx.toFixed(1) + '%' : '');
      row.style.borderColor = ''; $('eqc-' + sl.k).textContent = '—'; btn.disabled = true; continue;
    }
    const G = EQUIP.grades[it.g], kd = eqKind(it.k), pct = slotPct(sl.k);
    if (ASSET['eq_' + it.k]){ im.src = ASSET['eq_' + it.k]; im.style.display = ''; } else im.style.display = 'none';
    $('eqg-' + sl.k).textContent = '+' + lv; $('eqg-' + sl.k).style.color = G.c;
    $('eqn-' + sl.k).textContent = G.n + ' ' + kd.n; $('eqn-' + sl.k).style.color = G.c;
    row.style.borderColor = G.c + '88';
    let d = EQUIP.statName[sl.stat] + ' +' + pct.toFixed(1) + '%' + (cx ? ' (보유 +' + cx.toFixed(1) + '%)' : '') +
            ' · ' + EQUIP.statName[kd.sub] + ' +' + (pct * EQUIP.subRate).toFixed(1) + '%' + ' · 강화 ' + lv + '/' + EQUIP.lvCap;
    if (lv < EQUIP.lvCap) d += ' → +' + (G.base * (1 + EQUIP.lvPer * (lv + 1))).toFixed(1) + '%';
    $('eqd-' + sl.k).textContent = d;
    if (lv >= EQUIP.lvCap){ $('eqc-' + sl.k).textContent = '상한'; btn.disabled = true; }
    else { $('eqc-' + sl.k).textContent = fmt(enhCost(sl.k)); btn.disabled = !canEnhance(sl.k); }
  }
  $('eqlog').innerHTML = S.eqLog.length ? '최근: ' + S.eqLog.join(' · ') : '아직 떨어진 장비가 없다.';
  $('eqcnt').textContent = codexCount() + ' / ' + EQUIP.slots.reduce((a, sl) => a + sl.kinds.length, 0) * EQUIP.grades.length;
  $('ebody').querySelectorAll('.eqc').forEach(el => {
    const k = el.dataset.k, g = +el.dataset.g, n = (S.inv[k] || [])[g] | 0, seen = !!(eqOwnedBits(k) & (1 << g));
    const worn = EQUIP.slots.some(sl => S.equip[sl.k] && S.equip[sl.k].k === k && S.equip[sl.k].g === g);
    el.classList.toggle('seen', seen); el.classList.toggle('have', n > 0); el.classList.toggle('worn', worn);
    el.querySelector('b').textContent = n > 0 ? n : '';
    el.querySelector('i').textContent = worn ? '착' : '';
    el.disabled = !(n > 0);
  });
}
function openEquip(){ buildEquipPanel(); $('epanel').classList.add('show'); }
function closeEquip(){ $('epanel').classList.remove('show'); }
let eqLastSilver = -1, eqLastSig = '';
function equipHud(){
  const dot = $('tab-equip') && $('tab-equip').querySelector('.dot');
  if (dot && dot.classList) dot.classList.toggle('on', canEquipAny());
  if (!$('epanel') || !$('epanel').classList.contains('show')) return;
  const sig = S.eqLog[0] || '';
  if (eqLastSilver !== S.silver || eqLastSig !== sig){ eqLastSilver = S.silver; eqLastSig = sig; refreshEquip(); }
}
