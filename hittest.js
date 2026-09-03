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
const R=new Function(code+`;return {S,P,step:dt=>step(dt),FOES,HERO,foeM:f=>foeM(f)};`)();
const {S,P}=R;
S.intro=0;
// 적마다 id를 붙여 추적
const stat={}; let uid=0;
for(let i=0;i<60*240;i++){
  for(const f of S.foes){ if(f.__id===undefined){ f.__id=++uid; f.__hp=f.hp; } }
  T+=1000/60; R.step(1/60);
  for(const f of S.foes){
    if(f.__hp!==undefined && f.hp<f.__hp){
      const dy=f.y-P.y, dx=f.x-P.x;
      const dir = Math.abs(dy)>Math.abs(dx) ? (dy>0?'아래':'위') : (dx>0?'오른':'왼');
      const s=stat[f.k]=stat[f.k]||{};
      s[dir]=(s[dir]||0)+1;
    }
    f.__hp=f.hp;
  }
}
console.log('종류별·방향별 명중:');
for(const k in stat) console.log('  '+k.padEnd(8), JSON.stringify(stat[k]));
