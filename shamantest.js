const fs=require('fs');
const O=['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js','40-step.js','50-render.js','60-ui.js'];
let code=O.map(f=>fs.readFileSync(__dirname+'/src/'+f,'utf8')).join('\n').replace('"use strict";','');
const noop=()=>{};
const ctx=new Proxy({},{get:(t,k)=>k==='canvas'?{width:1170,height:2532}:()=>{},set:()=>true});
const els={};const mk=id=>els[id]||(els[id]={id,style:{},classList:{add:noop,remove:noop,contains:()=>false},
  textContent:'',firstElementChild:{style:{}},getContext:()=>ctx,width:0,height:0,
  querySelectorAll:()=>[],set innerHTML(v){},get innerHTML(){return '';},onclick:null,appendChild:noop});
global.document={getElementById:mk,createElement:()=>mk('x'),body:{appendChild:noop},querySelectorAll:()=>[]};
global.window=global;global.innerWidth=390;global.innerHeight=844;global.devicePixelRatio=3;
global.addEventListener=noop;
global.Image=class{constructor(){}set src(v){}get complete(){return true;}get naturalWidth(){return 56;}};
let T=0;global.performance={now:()=>T};global.requestAnimationFrame=()=>{};
global.navigator={vibrate:noop};global.setInterval=()=>0;
const R=new Function(code+`;return {S,P,step:dt=>step(dt)};`)();
const {S,P}=R;
S.intro=0;
const seen={}; let maxShots=0, totalShots=0, lastN=0, bigSeen=0, skillFr=0;
for(let i=0;i<60*120;i++){
  T+=1000/60; R.step(1/60);
  for(const f of S.foes){ seen[f.k]=(seen[f.k]||0)+1; if(f.anim==='skill') skillFr++; }
  if(S.shots.length>maxShots) maxShots=S.shots.length;
  if(S.shots.length>lastN) totalShots+=S.shots.length-lastN;
  for(const b of S.shots) if(b.big) bigSeen++;
  lastN=S.shots.length;
}
console.log('등장 누적:', JSON.stringify(seen));
console.log('발사된 탄: '+totalShots+' · 동시 최대 '+maxShots);
console.log('마법 시전 프레임 '+skillFr+' · 큰 구체 프레임 '+bigSeen);
console.log('주인공 hp '+Math.round(P.hp)+'/'+Math.round(P.hpMax)+' · 쓰러짐 '+S.downs);
