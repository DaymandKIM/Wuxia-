/* 3층 현금 상품 + 구매 복원 검증 (v2.97.3)
   1) 입문 예물 — 3일에 나눠 받는다 (하루 한 칸)
   2) 월간 옥패 — 즉시분 + 매일분, 기간 만료, 방치 상한 24시간, 광고 안 봄
   3) 광고 제거 — 영구 + 매일
   4) 성장 꾸러미 — 도달형(구역에 닿아야 보이고 안 닫힌다), 한 번만
   5) 유람첩 — 무료/유료 2단, 진행도는 누계 업적, 즉시 수령 개수 배지
   6) 구매 복원 · 저장 왕복 · 패널
   7) **안 파는 것**: 경지·무공 습득·연마 상한·단계 진행
*/
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth',
      'globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:()=>true});
const errs=[];
const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
  pretendToBeVisual:true,virtualConsole:new (require('jsdom').VirtualConsole)(),beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  Object.defineProperty(w,'devicePixelRatio',{value:2});
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window;
let bad=0; const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

setTimeout(()=>{
  if (typeof w.closeTitle==='function') w.closeTitle();
  if (typeof w.loadSkip==='function') w.loadSkip();
  const reset = () => w.eval('S.pay = null; payState(); S.jade = 0; S.silver = 0');

  // ── 1) 입문 예물 — 3일 분할 ────────────────
  reset();
  ok(w.eval('payOwn("starter")')===false, '사기 전엔 미보유');
  w.eval('buyProduct("starter")');
  ok(w.eval('payOwn("starter")')===true, '입문 예물 구매(모의)');
  ok(w.eval('S.jade')===0, '**사자마자 다 주지 않는다** — 1일차는 받으러 와야 한다');
  ok(w.eval('dailyPayReady()')===true, '오늘 받을 것이 있다');
  w.eval('claimDailyPay()');
  ok(w.eval('S.pay.starter')===1 && w.eval('S.jade')===w.eval('PAY.starter.days[0].jade'), '1일차 수령 → 영옥 '+w.eval('S.jade'));
  ok(w.eval('claimDailyPay()')===0, '같은 날 두 번은 없다');
  w.eval('S.pay.claim.starter = "1999-1-1"'); w.eval('claimDailyPay()');
  ok(w.eval('S.pay.starter')===2, '다음 날 2일차');
  w.eval('S.pay.claim.starter = "1999-1-1"'); w.eval('claimDailyPay()');
  w.eval('S.pay.claim.starter = "1999-1-1"');
  ok(w.eval('S.pay.starter')===w.eval('PAY.starter.days.length') && w.eval('dailyPayReady()')===false, '3일이면 끝');

  // ── 2) 월간 옥패 ───────────────────────────
  reset();
  const offBefore = w.eval('offCap()');
  w.eval('buyProduct("monthly")');
  ok(w.eval('S.jade')===w.eval('PAY.monthly.now'), '즉시분 영옥 '+w.eval('S.jade'));
  ok(w.eval('subOn("monthly")')===true && w.eval('subLeft("monthly")')===w.eval('PAY.monthly.days'), '기간 '+w.eval('subLeft("monthly")')+'일');
  ok(w.eval('offCap()') > offBefore && w.eval('offCap()')===w.eval('PAY.monthly.offHour*3600'), '방치 상한 '+(offBefore/3600)+'h → '+(w.eval('offCap()')/3600)+'h');
  ok(w.eval('adSkip()')===true, '광고 자리를 안 보고 받는다');
  // 광고가 즉시 끝나는지 — adShow 가 대기 없이 보상을 준다
  w.eval('S.ad = null; adState(); window.__q = 0');
  w.eval('adShow("fate", () => { window.__q++; })');
  ok(w.eval('window.__q')===1 && w.eval('adBusy()')===false, '정기권이면 광고가 바로 끝난다');
  // 매일분
  w.eval('S.jade = 0; S.pay.claim.monthly = ""');
  w.eval('claimDailyPay()');
  ok(w.eval('S.jade')===w.eval('PAY.monthly.daily'), '매일분 영옥 '+w.eval('S.jade'));
  ok(w.eval('PAY.monthly.daily * PAY.monthly.days') > w.eval('PAY.monthly.now'), '**가치의 대부분이 매일분에 있다** (즉시 '+w.eval('PAY.monthly.now')+' vs 누적 '+w.eval('PAY.monthly.daily*PAY.monthly.days')+')');
  // 만료
  w.eval('S.pay.sub.monthly = Date.now() - (PAY.monthly.days + 1) * 86400000');
  ok(w.eval('subOn("monthly")')===false && w.eval('offCap()')===offBefore, '기간이 끝나면 특전도 끝난다');

  // ── 3) 광고 제거 ──────────────────────────
  reset();
  w.eval('buyProduct("adfree")');
  ok(w.eval('S.jade')===w.eval('PAY.adfree.now'), '즉시분 영옥 '+w.eval('S.jade'));
  ok(w.eval('subLeft("adfree")') > 1e8, '영구다');
  ok(w.eval('adSkip()')===true, '광고를 안 본다');
  ok(w.eval('PAY.adfree.now') > 0 && w.eval('PAY.adfree.daily') > 0, '**광고 제거를 단독으로 안 판다** — 재화를 얹었다');

  // ── 4) 성장 꾸러미 — 도달형 ────────────────
  reset(); w.eval('S.zi = 0');
  w.eval('openPay(); payHud(true)');
  const pb = () => w.document.getElementById('pbody').innerHTML;
  ok(pb().indexOf(w.eval('PAY.growth.n')) < 0, '구역에 못 닿으면 안 보인다 (S.zi='+w.eval('S.zi')+')');
  w.eval('S.zi = PAY.growth.needZone; payHud(true)');
  ok(pb().indexOf(w.eval('PAY.growth.n')) >= 0, '닿으면 열린다 (구역 '+w.eval('PAY.growth.needZone')+')');
  w.eval('buyProduct("growth")');
  ok(w.eval('S.jade') >= w.eval('PAY.growth.jade') && w.eval('S.silver') > 0, '꾸러미는 바로 다 준다 (영옥 '+w.eval('S.jade')+')');
  ok(w.eval('buyProduct("growth")')===false, '한 번만');
  // 타이머가 없다 — 데이터에 만료 필드가 없어야 한다
  ok(w.eval('PAY.growth.until')===undefined && w.eval('PAY.growth.hours')===undefined, '**타이머 압박 없음** — 열리면 안 닫힌다');
  w.eval('closePay()');

  // ── 5) 유람첩 ─────────────────────────────
  reset();
  w.eval('S.achv = {}');
  ok(w.eval('passProgress()')===0 && w.eval('passReady()')===false, '진행 0이면 계단이 안 열린다');
  w.eval('S.achv = { kills: 5 }');
  ok(w.eval('passProgress()')===5, '진행도 = 누계 업적 받은 수 ('+w.eval('passProgress()')+')');
  ok(w.eval('passReady()')===true, '첫 계단이 열린다');
  ok(w.eval('passPending()') > 0, '안 샀으면 "바로 받을 개수" 배지 '+w.eval('passPending()'));
  w.eval('S.jade = 0'); w.eval('passClaim()');
  const freeOnly = w.eval('S.jade');
  ok(freeOnly===w.eval('PAY.pass.steps[0].free.jade'), '무료 열만 들어온다 ('+freeOnly+')');
  w.eval('buyProduct("pass")');
  ok(w.eval('passPending()')===0, '사고 나면 배지가 사라진다');
  w.eval('S.achv = { kills: 5, boss: 5 }; S.jade = 0; passClaim()');
  ok(w.eval('S.jade') >= w.eval('PAY.pass.steps[1].paid.jade'), '산 뒤엔 유료 열도 같이 ('+w.eval('S.jade')+')');
  ok(w.eval('PAY.pass.steps[1].paid.jade') > (w.eval('PAY.pass.steps[1].free.jade')|0), '유료 열이 무료보다 크다');
  ok(w.eval('PAY.pass.season')===undefined, '**시즌 만료 없음** — 놓치는 계단이 없다');

  // ── 6) 구매 복원 · 저장 ────────────────────
  const owned = JSON.parse(w.eval('JSON.stringify(restorePurchases())'));
  ok(owned.length > 0, '구매 복원이 보유 목록을 돌려준다 ('+owned.join(',')+')');
  w.eval('saveNow()');
  const d = JSON.parse(w.localStorage.getItem('wuxia1'));
  ok(d.pay && d.pay.own && d.pay.own.pass===1, '보유가 저장된다');
  w.eval('S.pay = null');
  w.eval('applySave(' + JSON.stringify(d) + ')');
  ok(w.eval('payOwn("pass")')===true, '불러오면 보유가 돌아온다');
  ok(JSON.parse(w.eval('JSON.stringify(restorePurchases())')).length > 0, '복원 뒤에도 보유가 남는다');

  // ── 7) 안 파는 것 ─────────────────────────
  const all = JSON.stringify(w.eval('JSON.stringify(PAY)'));
  ok(!/realm|rexp|경지|artStar|artLv|lvCap|stage/.test(all), '상품에 경지·무공 레벨·연마 상한·단계가 없다');
  reset();
  const r0 = w.eval('realmLv()'), st0 = w.eval('S.stage');
  w.eval('buyProduct("monthly"); buyProduct("adfree"); claimDailyPay()');
  ok(w.eval('realmLv()')===r0 && w.eval('S.stage')===st0, '상품을 사도 경지·단계는 그대로다');

  // ── 패널 ──────────────────────────────────
  w.document.getElementById('menubtn').click();
  w.document.getElementById('mpay').click();
  ok(w.document.getElementById('ppanel').classList.contains('show'), '≡ 상품으로 패널이 열린다');
  ok(w.document.querySelectorAll('#pbody .pj').length===w.eval('PAY.jadePacks.length'), '영옥 묶음 '+w.eval('PAY.jadePacks.length')+'칸');
  ok(w.document.querySelectorAll('#pbody .pcard').length >= 4, '상품 카드 '+w.document.querySelectorAll('#pbody .pcard').length+'장');
  w.document.getElementById('pclose').click();
  ok(!w.document.getElementById('ppanel').classList.contains('show'), '✕ 로 닫힌다');

  ok(errs.length===0, '런타임 오류 0'+(errs.length?': '+errs[0]:''));
  console.log(bad? '\n★ 실패 '+bad+'건' : '\n전부 통과');
  process.exit(bad?1:0);
}, 400);
