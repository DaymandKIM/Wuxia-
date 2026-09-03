/* ── 수련 — 은자로 스텟을 올린다 ────────────────────
   숫자는 전부 00-data.js의 TRAIN. 상한은 최고 경지 × capPer.
   버튼은 꾹 누르면 연속 구매(확정 규칙).
*/
function buyStat(k){
  const n = statLv(k);
  const cost = trainCost(n);
  if (n >= trainCap() || S.silver < cost) return false;
  S.silver -= cost;
  S.stats[k] = n + 1;
  return true;
}

// 살 수 있는 스텟이 하나라도 있나 — 탭 알림점용
function canTrain(){
  for (const s of TRAIN.list)
    if (statLv(s.k) < trainCap() && S.silver >= trainCost(statLv(s.k))) return true;
  return false;
}

function buildTrainPanel(){
  const b = $('trbody');
  let h = '';
  for (const s of TRAIN.list){
    h += '<div class="zrow trow" id="tr-' + s.k + '">' +
         '<div class="trl"><div class="zn">' + s.n + ' <em id="trlv-' + s.k + '"></em></div>' +
         '<div class="zd" id="trfx-' + s.k + '">' + s.d + '</div></div>' +
         '<button class="trbuy" data-k="' + s.k + '"><span id="trc-' + s.k + '"></span><i>은자</i></button>' +
         '</div>';
  }
  h += '<div class="znote">경지가 오르면 수련 상한이 열린다 (스텟당 경지×' + TRAIN.capPer + ').</div>';
  b.innerHTML = h;
  // 꾹 누르면 연속 구매 — click 대신 pointer로만 다룬다 (이중 구매 방지)
  b.querySelectorAll('.trbuy').forEach(el => {
    const k = el.dataset.k;
    let iv = 0;
    const stop = ()=>{ if (iv){ clearInterval(iv); iv = 0; } };
    el.onpointerdown = e => {
      e.preventDefault();
      if (buyStat(k)) refreshTrain();
      stop();
      iv = setInterval(()=>{ if (buyStat(k)) refreshTrain(); else stop(); }, 130);
    };
    el.onpointerup = el.onpointerleave = el.onpointercancel = stop;
  });
  refreshTrain();
}

// 열려 있는 동안 값만 갱신한다 — 줄을 다시 만들면 누르던 버튼이 끊긴다
function refreshTrain(){
  $('trsilver').textContent = '은자 ' + S.silver.toLocaleString();
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
      const cost = trainCost(n);
      $('trc-' + s.k).textContent = cost.toLocaleString();
      btn.disabled = S.silver < cost;
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
