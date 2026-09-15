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
// 배수만큼의 총비용 — 살 수 있는 만큼(최대 배수)까지 산다 (v2.36).
// 예전엔 x10·x100이 "정확히 N개"라 다 못 사면 비활성이었는데, 초·중반엔
// 100개를 못 채워 버튼이 늘 죽어 "안 눌림"으로 느껴졌다. 이제 살 수 있는
// 만큼 사고(≥1이면 활성) 실제 개수를 ×N으로 보여준다 (MAX와 같은 규칙).
function trainPlan(k){
  const cap = trainCap();
  const lim = trainAmt === 'MAX' ? cap : trainAmt;
  let n = statLv(k), cnt = 0, cost = 0;
  while (cnt < lim && n < cap){
    const c = trainCost(k, n);
    if (S.silver < cost + c) break;
    cost += c; n++; cnt++;
  }
  return { cnt, cost, ok: cnt > 0 };
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
         '<img class="tico" src="' + (ASSET['train_' + s.k] || '') + '" alt="">' +   // 스텟 아이콘 (v2.62)
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
    // 예상값은 이번에 실제로 살 개수만큼 오른 값 (v2.62.1 — x10·MAX인데 한 단계 뒤만 보여줬다)
    const p = n >= cap ? { cnt: 0, cost: 0, ok: false } : trainPlan(s.k);
    const to = Math.min(cap, n + (p.cnt > 0 ? p.cnt : 1));
    // 설명은 한 줄, 수치(지금 → 다음)는 다음 줄 (v2.69.9 — 한 줄에 붙이니 가독성이 떨어졌다)
    $('trfx-' + s.k).innerHTML =
      s.d + '<b class="trv">' + s.f(statBonus(s.k)) + ' → ' + s.f(statBonus(s.k, to)) +
      (p.cnt > 1 ? ' <i>(' + p.cnt + '단계)</i>' : '') + '</b>';
    const btn = $('trbody').querySelector('.trbuy[data-k="' + s.k + '"]');
    if (n >= cap){
      $('trc-' + s.k).textContent = '상한';
      btn.disabled = true;
    } else {
      // 배수를 다 채우면 금액만, 살 수 있는 만큼만 사면 ×개수를 함께 (v2.36)
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
  const dot = $('tab-train').querySelector('.dot');   // 아이콘이 앞에 있어 firstElementChild가 아니다 (v2.63.4)
  if (dot && dot.classList) dot.classList.toggle('on', canTrain());
  if (!$('trpanel').classList.contains('show')) return;
  if (trLastSilver !== S.silver){ trLastSilver = S.silver; refreshTrain(); }
}
