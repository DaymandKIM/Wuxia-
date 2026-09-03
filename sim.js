const fs=require('fs');
const ORDER=['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js','40-step.js','50-render.js','60-ui.js'];
let code=ORDER.map(f=>fs.readFileSync(__dirname+'/src/'+f,'utf8')).join('\n').replace('"use strict";','');
const noop=()=>{};
const ctx=new Proxy({},{get:(t,k)=>k==='canvas'?{width:1170,height:2532}:()=>{},set:()=>true});
const els={};const mk=id=>els[id]||(els[id]={id,style:{},classList:{add:noop,remove:noop},
  textContent:'',firstElementChild:{style:{}},getContext:()=>ctx,width:0,height:0});
global.document={getElementById:mk,createElement:()=>mk('x'),body:{appendChild:noop}};
global.window=global;global.innerWidth=390;global.innerHeight=844;global.devicePixelRatio=3;
global.addEventListener=noop;
global.Image=class{constructor(){}set src(v){}get complete(){return true;}get naturalWidth(){return 56;}};
const R=new Function(code+`;return {S,P,step:dt=>step(dt),stage:()=>stage(),STAGES,ZONES,zone:()=>zone(),lv:()=>lv(),realmInfo:()=>realmInfo(),FOES};`)();
const {S,P}=R;
const dt=1/60; const marks=[1,3,5,10,15,20,30,45,60];
let mi=0;
console.log('시간   구역        단계  해금  누적처치  쓰러짐  경지');
for(let i=0;i<60*60*60;i++){
  R.step(dt);
  if(mi<marks.length && S.t>=marks[mi]*60){
    console.log(String(marks[mi]).padStart(3)+'분   '+R.zone().n.padEnd(6)+
      '  '+String(S.stage).padStart(2)+'   '+String(S.unlocked).padStart(2)+
      '  '+String(S.totalKills).padStart(7)+'   '+String(S.downs).padStart(4)+'   '+R.realmInfo().name);
    mi++;
  }
}
const kinds={};
for(const f of S.foes) kinds[f.k]=(kinds[f.k]||0)+1;
console.log('\n등장 종류:', JSON.stringify(kinds));
console.log('\n구역 설계:');
for(const z of R.ZONES) console.log('  '+z.n.padEnd(6)+' 배율 x'+z.mul.toFixed(2));
