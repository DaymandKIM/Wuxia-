// 붙어 있는 적이 걷기를 멈추는지
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/user/Wuxia-/dist/wuxia.html','utf8');
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas')return{width:1170,height:2532};
  if(k==='createLinearGradient')return ()=>({addColorStop(){}});
  if(k==='getImageData')return (x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(1,w*h*4)),width:w,height:h});
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth','globalCompositeOperation','font','textAlign','textBaseline'].includes(k))return 0;
  return ()=>{};},set:()=>true});
const errs=[];
const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  w.Image=class{ set src(v){this._s=v;} get src(){return this._s;} get complete(){return true;} get naturalWidth(){return 35;} get naturalHeight(){return 51;} };
  w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window;
setTimeout(()=>{
  w.eval('S.intro=0; S.rexp=1e12; closeTitle&&closeTitle();');
  // 적 하나를 주인공 코앞에 세우고 주인공은 못 죽게
  w.eval('S.foes.length=0; spawnFoe(); const f=S.foes[0]; f.hp=1e18; f.hpMax=1e18; f.x=P.x-30; f.y=P.y;');
  const seen={};
  for(let i=0;i<240;i++){ w.eval('P.hp=P.hpMax; S.foes[0].x=P.x-30; S.foes[0].y=P.y; step(0.033);');
    const a=w.eval('S.foes[0].anim'); seen[a]=(seen[a]||0)+1; }
  const walk=seen.walk||0, idle=seen.idle||0;
  console.log('붙어 있는 적 240프레임 —', JSON.stringify(seen));
  console.log(walk===0 ? '  통과: 제자리걸음 없음 (대기 '+idle+'프레임)' : '  ★실패: walk 가 '+walk+'프레임 떴다');
  // 멀리 두면 걸어야 한다
  w.eval('S.foes[0].x=P.x-400; S.foes[0].cd=0; S.foes[0].atkT=0;');
  let far=0; for(let i=0;i<30;i++){ w.eval('step(0.033);'); if(w.eval('S.foes[0].anim')==='walk') far++; }
  console.log(far>10 ? '  통과: 멀면 걷는다 ('+far+'/30)' : '  ★실패: 멀어도 안 걷는다 ('+far+'/30)');
  console.log('오류', errs.length);
  process.exit(walk===0 && far>10 && errs.length===0 ? 0 : 1);
},1500);
