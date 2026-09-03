const fs=require('fs');
const O=['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js','40-step.js','50-render.js','60-ui.js'];
let code=O.map(f=>fs.readFileSync(__dirname+'/src/'+f,'utf8')).join('\n').replace('"use strict";','');
const noop=()=>{};
const ops=[];
const ctx=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(k==='drawImage') return (img,...a)=>ops.push(['img',img&&img.__k,a]);
  if(k==='fillRect') return (...a)=>ops.push(['fill',cur.fillStyle,a]);
  if(k==='setTransform') return (...a)=>ops.push(['tf',a]);
  if(k==='save') return ()=>ops.push(['save']);
  if(k==='restore') return ()=>ops.push(['restore']);
  if(k==='translate') return (...a)=>ops.push(['tr',a]);
  if(k==='scale') return (...a)=>ops.push(['sc',a]);
  if(k==='beginPath'||k==='arc'||k==='ellipse'||k==='fill'||k==='stroke'||k==='moveTo'||k==='lineTo') return ()=>{};
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:(t,k,v)=>{cur[k]=v; return true;}});
const cur={};
const els={};const mk=id=>els[id]||(els[id]={id,style:{},classList:{add:noop,remove:noop,contains:()=>false},
  textContent:'',firstElementChild:{style:{}},getContext:()=>ctx,width:0,height:0,
  querySelectorAll:()=>[],set innerHTML(v){},get innerHTML(){return '';},onclick:null,appendChild:noop});
global.document={getElementById:mk,createElement:()=>mk('x'),body:{appendChild:noop},querySelectorAll:()=>[]};
global.window=global;global.innerWidth=390;global.innerHeight=844;global.devicePixelRatio=3;
global.addEventListener=noop;
global.Image=class{constructor(){}set src(v){}get complete(){return true;}get naturalWidth(){return 56;}};
let T=0;global.performance={now:()=>T};global.requestAnimationFrame=()=>{};
global.navigator={vibrate:noop};global.setInterval=()=>0;
const R=new Function(code+`;return {S,P,step:dt=>step(dt),render:()=>render(),IMG,VW,VH,SC,FOE,FOES,stage:()=>stage()};`)();
const {S,P}=R;
for(const k in R.IMG) R.IMG[k].__k=k;
S.intro=0;
if(['boss','skill','slam','summon'].includes(process.argv[2])){ S.zi=0; S.stage=11; S.kills=0; S.foes.length=0; S.bossAlive=false; }
const N = process.argv[2]==='shot' ? 60*180 : process.argv[2]==='sweep' ? 60*90 : process.argv[2]==='summon' ? 60*2 : (['skill','slam'].includes(process.argv[2]) ? 60*30 : (process.argv[2]==='boss'?60*9:60*40));
for(let i=0;i<N;i++){
  T+=1000/60; R.step(1/60);
  const md=process.argv[2];
  if(md==='shot'){
    if(S.shots.some(b=>b.big) && !P.dead) break;
  }
  if(md==='sweep'){
    if(S.sweepT>0 && S.sweepT<0.75) break;   // 파동이 막 터진 순간
    if(i===60*4){ S.kills=999; }
  }
  if(md==='skill'){
    const b=S.foes.find(f=>f.boss);
    if(b && b.skT>0 && b.skT<0.4) break;
  }
  if(md==='slam'){
    const b=S.foes.find(f=>f.boss);
    if(b && b.atkT>0 && b.atkT<0.22) break;   // 땅을 찍는 순간
  }
}
ops.length=0; R.render();
// 적 위치 기록
const out={vw:R.VW,vh:R.VH,sc:R.SC,ground:S.foes.length,
  cam:[S.camX,S.camY],
  hero:{x:P.x,y:P.y,anim:P.anim,af:P.af,dir:P.dir},
  foes:S.foes.map(f=>({x:f.x,y:f.y,dir:f.dir,hp:f.hp,hpMax:f.hpMax,dead:f.dead,anim:f.anim,af:f.af,boss:!!f.boss,k:f.k})),
  fx:S.fx.map(e=>({k:e.k,x:e.x,y:e.y,life:e.life,t:e.t})),
  shots:S.shots.map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy,t:b.t,big:!!b.big,r:b.r||0})),
  summonT:S.summonT, summonX:S.summonX, summonY:S.summonY,
  sweepT:S.sweepT,
  zone:S.zi, stage:S.stage};
fs.writeFileSync(__dirname+'/snap.json',JSON.stringify(out));
console.log('적 '+S.foes.length+'마리 · 주인공 '+P.anim);
