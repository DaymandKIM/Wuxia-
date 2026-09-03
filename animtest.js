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
// 공격 중 피격이 끊는지 확인
let brokenHero=0, brokenFoe=0, atkFrames=0, foeAtkFrames=0;
let prevHeroAnim='', prevFoeAnim={};
for(let i=0;i<60*90;i++){
  T+=1000/60; R.step(1/60);
  if(P.anim==='atk') atkFrames++;
  // 공격 중이던 주인공이 hit으로 바뀌면 끊긴 것
  if(prevHeroAnim==='atk' && P.anim==='hit' && P.atkT>0) brokenHero++;
  prevHeroAnim=P.anim;
  for(const f of S.foes){
    if(f.anim==='atk') foeAtkFrames++;
    const id=f.x.toFixed(0)+','+f.y.toFixed(0);
    if(prevFoeAnim[id]==='atk' && f.anim==='hit' && f.atkT>0) brokenFoe++;
    prevFoeAnim[id]=f.anim;
  }
}
console.log('주인공 공격 프레임 '+atkFrames+' · 피격에 끊긴 횟수 '+brokenHero);
console.log('적    공격 프레임 '+foeAtkFrames+' · 피격에 끊긴 횟수 '+brokenFoe);
