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
const R=new Function(code+`;return {S,P,step:dt=>step(dt),SWEEP,stage:()=>stage()};`)();
const {S,P}=R;
S.intro=0;
for(let i=0;i<60*30;i++){ T+=1000/60; R.step(1/60); }
const before=S.foes.filter(f=>!f.dead).length;
console.log('클리어 직전 살아있는 적: '+before);
S.kills = R.stage().need;
let logged={};
for(let i=0;i<60*4;i++){
  T+=1000/60; R.step(1/60);
  if(S.sweepT>0){
    const el=(R.SWEEP.charge+R.SWEEP.blast+R.SWEEP.hold)-S.sweepT;
    const key=Math.floor(el*4)/4;
    if(!logged[key]){
      logged[key]=1;
      console.log('  '+key.toFixed(2)+'초  살아있는 적 '+S.foes.filter(f=>!f.dead).length+
        ' / 전체 '+S.foes.length);
    }
  }
  if(S.sweepT<=0 && Object.keys(logged).length){ 
    console.log('연출 종료 · 남은 적 '+S.foes.length+' · 단계 '+S.stage);
    break;
  }
}
