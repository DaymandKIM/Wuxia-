/* 기연 검증 — jsdom 실제 DOM에서 돌린다.
   1) 처치·쓰러짐으로 인연이 쌓이나
   2) 인연이 차면 단계 진입 때 기연 카드가 뜨나
   3) 받아들이면 보상이 적용되고 인연이 치러지나 (다음 기연은 더 멀어짐)
   4) 조각을 3개 모으면 실전 비급이 열리나
   5) 저장 왕복
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
function boot(preSave){
  const errs=[];
  const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
    pretendToBeVisual:true,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    w.addEventListener('error',e=>errs.push(e.message));
    if(preSave!==undefined) w.localStorage.setItem('wuxia1',preSave);
  }});
  return {w:dom.window,errs};
}
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

const {w,errs}=boot();
setTimeout(()=>{
  const d=w.document;
  // 1) 인연 축적
  const k0=w.eval('S.karma');
  w.eval('S.intro=0; spawnFoe(); hurtFoe(S.foes[0], 99999)');
  ok(w.eval('S.karma')>k0,'처치로 인연이 쌓인다 ('+w.eval('S.karma').toFixed(1)+')');
  w.eval('downHero(); reviveHero(); S.downT=0; P.dead=false');
  ok(w.eval('S.karma')>=w.eval('FATE.downKarma'),'쓰러짐(고난)으로 크게 쌓인다');
  // 2) 인연이 차면 기연 카드
  w.eval('S.karma=karmaNeed(); S.fatePending=1; S.silver=0; enterStage()');
  ok(d.getElementById('fpanel').classList.contains('show'),'기연 카드가 떴다: "'+
    d.getElementById('ftitle').textContent+'" — '+d.getElementById('ftext').textContent.slice(0,40));
  // 3) 받아들이면 보상 + 인연 소모
  const before={sv:w.eval('S.silver'),xp:w.eval('S.rexp'),arts:w.eval('Object.keys(S.arts).length'),
    frag:w.eval('(S.fatebits.guyang|0)+(S.fatebits.geongon|0)')};
  d.getElementById('fbtn').click();
  const after={sv:w.eval('S.silver'),xp:w.eval('S.rexp'),arts:w.eval('Object.keys(S.arts).length'),
    frag:w.eval('(S.fatebits.guyang|0)+(S.fatebits.geongon|0)')};
  const rewarded=after.sv>before.sv||after.xp>before.xp||after.arts>before.arts||after.frag>before.frag;
  ok(rewarded,'보상이 적용됐다 (은자 '+before.sv+'→'+after.sv+' · 수련치 +'+
    Math.round(after.xp-before.xp)+' · 무공 '+before.arts+'→'+after.arts+' · 조각 '+after.frag+')');
  ok(!d.getElementById('fpanel').classList.contains('show'),'카드가 닫혔다');
  ok(w.eval('S.fates')===1 && w.eval('S.karma')<w.eval('karmaNeed()'),
    '인연을 치렀다 — 다음 기연 필요량 '+w.eval('karmaNeed()'));
  // 4) 조각 3개 → 실전 비급 해금
  w.eval('S.fatebits.guyang=2; S.fates=10; S.karma=karmaNeed(); S.fatePending=1;');
  w.eval('fateEv={k:"frag",n:"실전 비급 조각",d:"",art:"guyang",r:""}; applyFate()');
  ok(w.eval('S.arts.guyang')===1,'조각 3개 → 구양신결이 열렸다');
  // 5) 저장 왕복
  w.eval('saveNow()');
  const {w:w2}=boot(w.localStorage.getItem('wuxia1'));
  setTimeout(()=>{
    ok(w2.eval('S.fates')>0 && w2.eval('S.arts.guyang')===1,
      '다시 열어도 기연 이력·구양신결이 남아 있다 (기연 '+w2.eval('S.fates')+'회)');
    ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
    console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
    process.exit(bad?1:0);
  },1200);
},2500);
