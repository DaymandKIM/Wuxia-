/* ── 수련 — 은자로 스텟을 올린다 ────────────────────
   숫자는 전부 00-data.js의 TRAIN. 상한은 최고 경지 × capPer.
   버튼은 꾹 누르면 연속 구매(확정 규칙).
*/
function buyStat(k){
  const n = statLv(k);
  const cost = trainCost(k, n);
  if (n >= trainCap() || S.silver < cost) return false;
  S.silver -= cost;
  S.stats[k] = n + 1;
  return true;
}

let trainAmt = 1;                // 구매 배수 (1·10·100·'MAX')
// 배수만큼의 총비용 — x10·x100은 "정확히 N개 값"이다. 살 수 있는 만큼으로
// 개수를 줄이면 금액이 계속 흔들려서 이상해 보인다는 피드백. MAX만 유동.
function trainPlan(k){
  const cap = trainCap();
  let n = statLv(k), cnt = 0, cost = 0;
  if (trainAmt === 'MAX'){
    let silver = S.silver;
    while (n < cap){
      const c = trainCost(k, n);
      if (silver < c) break;
      silver -= c; cost += c; n++; cnt++;
    }
    return { cnt, cost, ok: cnt > 0 };
  }
  while (cnt < trainAmt && n < cap){ cost += trainCost(k, n); n++; cnt++; }
  return { cnt, cost, ok: cnt > 0 && S.silver >= cost };
}
function buyStatN(k){
  const p = trainPlan(k);
  if (!p.ok) return false;
  for (let i = 0; i < p.cnt; i++) buyStat(k);
  return true;
}

// 살 수 있는 스텟이 하나라도 있나 — 탭 알림점용
function canTrain(){
  for (const s of TRAIN.list)
    if (statLv(s.k) < trainCap() && S.silver >= trainCost(s.k, statLv(s.k))) return true;
  return false;
}

function buildTrainPanel(){
  const b = $('trbody');
  // 구매 배수 — x10·x100·MAX 로 한 번에 (사용자 확정)
  let h = '<div class="zst tramt">';
  for (const m of TRAIN.amounts)
    h += '<button class="sb' + (trainAmt === m ? ' on' : '') + '" data-amt="' + m + '">' +
         (m === 'MAX' ? 'MAX' : 'x' + m) + '</button>';
  h += '</div>';
  for (const s of TRAIN.list){
    h += '<div class="zrow trow" id="tr-' + s.k + '">' +
         '<div class="trl"><div class="zn">' + s.n + ' <em id="trlv-' + s.k + '"></em></div>' +
         '<div class="zd" id="trfx-' + s.k + '">' + s.d + '</div></div>' +
         '<button class="trbuy" data-k="' + s.k + '"><span id="trc-' + s.k + '"></span><i>' + coin() + '</i></button>' +
         '</div>';
  }
  h += '<div class="znote">경지가 오르면 수련 상한이 열린다 (스텟당 경지×' + TRAIN.capPer + ').</div>';
  b.innerHTML = h;
  b.querySelectorAll('.tramt .sb').forEach(el => {
    el.onclick = () => {
      trainAmt = el.dataset.amt === 'MAX' ? 'MAX' : parseInt(el.dataset.amt, 10);
      b.querySelectorAll('.tramt .sb').forEach(e2 => e2.classList.toggle('on', e2 === el));
      refreshTrain();
    };
  });
  // 꾹 누르면 연속 구매 — click 대신 pointer로만 다룬다 (이중 구매 방지)
  b.querySelectorAll('.trbuy').forEach(el => {
    const k = el.dataset.k;
    let iv = 0;
    const stop = ()=>{ if (iv){ clearInterval(iv); iv = 0; } };
    el.onpointerdown = e => {
      e.preventDefault();
      if (buyStatN(k)) refreshTrain();
      stop();
      iv = setInterval(()=>{ if (buyStatN(k)) refreshTrain(); else stop(); }, 160);
    };
    el.onpointerup = el.onpointerleave = el.onpointercancel = stop;
  });
  refreshTrain();
}

// 열려 있는 동안 값만 갱신한다 — 줄을 다시 만들면 누르던 버튼이 끊긴다
function refreshTrain(){
  $('trsilver').innerHTML = coin() + ' ' + fmt(S.silver);
  const cap = trainCap();
  for (const s of TRAIN.list){
    const n = statLv(s.k);
    $('trlv-' + s.k).textContent = 'Lv ' + n + ' / ' + cap;
    $('trfx-' + s.k).textContent =
      s.d + ' · ' + s.f(statBonus(s.k)) + ' → ' + s.f(statBonus(s.k, n + 1));
    const btn = $('trbody').querySelector('.trbuy[data-k="' + s.k + '"]');
    if (n >= cap){
      $('trc-' + s.k).textContent = '상한';
      btn.disabled = true;
    } else {
      const p = trainPlan(s.k);
      // 정액 배수(x10 등)는 금액만 — ×개수는 MAX거나 상한에 걸렸을 때만
      const tag = p.cnt > 1 && (trainAmt === 'MAX' || p.cnt !== trainAmt) ? ' ×' + p.cnt : '';
      $('trc-' + s.k).textContent =
        fmt(p.cnt > 0 ? p.cost : trainCost(s.k, n)) + tag;
      btn.disabled = !p.ok;
    }
  }
}

function openTrain(){ buildTrainPanel(); $('trpanel').classList.add('show'); }
function closeTrain(){ $('trpanel').classList.remove('show'); }

// 매 프레임 — 탭 알림점을 켜고, 패널이 열려 있으면 은자 변화만 반영한다
let trLastSilver = -1;
function trainHud(){
  const dot = $('tab-train').firstElementChild;
  if (dot && dot.classList) dot.classList.toggle('on', canTrain());
  if (!$('trpanel').classList.contains('show')) return;
  if (trLastSilver !== S.silver){ trLastSilver = S.silver; refreshTrain(); }
}
