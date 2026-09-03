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
const R=new Function(code+`;return {S,P,step:dt=>step(dt),gotoZone:(i,s)=>gotoZone(i,s),BOSS_STAGE,bossHp:()=>bossHp(),zone:()=>zone(),BOSS};`)();
const {S,P}=R;
console.log('보스 단계 = '+R.BOSS_STAGE);
for(const zi of [0,1,2,3,4]){
  R.gotoZone(zi, R.BOSS_STAGE);
  S.intro=0;
  const hp0=R.bossHp();
  let t=0, spawned=false, cleared=false, downs0=S.downs;
  for(let i=0;i<60*300;i++){
    T+=1000/60; R.step(1/60); t+=1/60;
    if(!spawned && S.foes.some(f=>f.boss)) spawned=true;
    if(spawned && S.stage!==R.BOSS_STAGE){ cleared=true; break; }
  }
  console.log('  '+R.zone().n.padEnd(4)+' 보스체력'+String(hp0).padStart(6)+
    ' → '+(cleared?('격파 '+t.toFixed(0)+'초'):'미격파(300초)')+
    ' · 쓰러짐'+(S.downs-downs0));
}
