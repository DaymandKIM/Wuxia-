/* 업적 검증 (v2.90) — jsdom 실제 DOM.
   1) 단계 계산: 값이 문턱을 넘은 만큼 달성, 받은 단계와의 차이가 받을 것
   2) 받기: 은자 보상(처치 은자 × rewardMul), 한 번에 한 단계, 전부 받으면 완료
   3) 합성·강화 누계가 는다 · 달성 알림 토스트는 한 번
   4) 저장·복원(받은 단계·누계) · 패널(카드 수·받기 버튼·완료) */
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth','globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:()=>true});
function boot(preSave){
  const errs=[];
  const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    w.addEventListener('error',e=>errs.push(e.message));
    if(preSave!==undefined) w.localStorage.setItem('wuxia1',preSave);
  }});
  return {w:dom.window,errs};
}
let bad=0; const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };
const {w,errs}=boot();
setTimeout(()=>{
  const S=w.eval('S'), A=w.eval('ACHV'); w.closeTitle && w.closeTitle();
  const kills=A.list.find(a=>a.k==='kills');
  ok(w.achvReached(kills)===0 && w.achvClaimableAll()===0,'처음엔 달성 0');
  S.totalKills=1500;
  ok(w.achvReached(kills)===2 && w.achvClaimable(kills)===2,'처치 1,500 → 백인참 2단계 달성(100·1,000), 받을 것 2');
  const s0=S.silver, r=w.achvClaim('kills');
  ok(r===Math.round(w.eval('killSilver()')*A.rewardMul[0]) && S.silver===s0+r && S.achv.kills===1,'받기: 1단계 보상 = 처치 은자×'+A.rewardMul[0]+' ('+r+'), 받은 단계 1');
  ok(w.achvClaim('kills')>0 && w.achvClaim('kills')===false,'두 번째 받기 뒤엔 받을 게 없다');
  // 다른 업적들
  S.bossDone=[1,1,1,0,0]; S.unlocked=4; S.downs=12; S.fates=6;
  ok(w.achvReached(A.list.find(a=>a.k==='boss'))===3 && w.achvReached(A.list.find(a=>a.k==='zone'))===3 && w.achvReached(A.list.find(a=>a.k==='downs'))===2 && w.achvReached(A.list.find(a=>a.k==='fate'))===2,'보스 3·사냥터 3·칠전팔기 2·기연 2단계');
  S.rexp=1e6; ok(w.achvReached(A.list.find(a=>a.k==='realm'))>=4,'경지 업적은 realmLv로');
  w.eqGain('sword',0,3); w.eqMerge('sword',0); S.silver=1e9; w.levelItem('sword',1);
  ok(S.merges===1 && S.levels===1 && w.achvReached(A.list.find(a=>a.k==='merge'))===1 && w.achvReached(A.list.find(a=>a.k==='level'))===1,'합성·강화 누계가 업적으로');
  ok(w.achvReached(A.list.find(a=>a.k==='grade'))===0,'낀 장비가 고급 이하면 명품 0');
  w.eqGain('ring',4,1); ok(w.achvReached(A.list.find(a=>a.k==='grade'))===3,'전설 반지를 끼면 명품 3단계(희귀·영웅·전설)');
  const all=w.achvClaimAll(); ok(all.n>=10 && w.achvClaimableAll()===0,'일괄 받기 '+all.n+'단계, 남은 것 0');
  // 알림 — 새 단계에만 한 번
  let toasts=0; const T=w.eval('toast'); w.eval('window.__t0=toast'); w.eval('toast=function(m,o){ window.__tc=(window.__tc||0)+1; return window.__t0(m,o); }');
  S.totalKills=20000; w.achvHud(5); const c1=w.eval('window.__tc||0'); w.achvHud(5); const c2=w.eval('window.__tc||0');
  ok(c1===1 && c2===1,'백인참 3단계 달성 토스트는 한 번 ('+c1+','+c2+')');
  // 저장·복원
  w.saveNow(); const saved=w.localStorage.getItem('wuxia1'); const {w:w2}=boot(saved);
  setTimeout(()=>{
    const S2=w2.eval('S');
    ok(S2.achv.kills===2 && S2.merges===1 && S2.levels===1 && w2.achvClaimable(w2.eval('ACHV').list[0])===1,'저장·복원: 받은 단계·누계 그대로, 3단계는 아직 받을 것');
    const d=w2.document; w2.closeTitle && w2.closeTitle();
    d.getElementById('menubtn').click(); d.getElementById('mach').click();
    ok(d.getElementById('vpanel').classList.contains('show') && d.querySelectorAll('.acard').length===w2.eval('ACHV.list.length'),'≡ 메뉴 → 업적 패널, 카드 '+d.querySelectorAll('.acard').length);
    ok(d.querySelector('.acard').classList.contains('can') && d.querySelector('.acard .abtn').textContent.includes('받기'),'받을 것이 맨 위, 받기 버튼');
    const sil=S2.silver; d.querySelector('.acard .abtn').click();
    ok(S2.silver>sil && S2.achv.kills===3,'패널에서 받기 → 은자 +, 받은 단계 3');
    ok(errs.length===0,'런타임 오류 '+errs.length+(errs.length?': '+errs[0]:''));
    console.log(bad?'\n★ 실패 '+bad+'건':'\n문제 없음'); process.exit(bad?1:0);
  },1200);
},1500);
