/* 대나무 개구리 — 혀 공격이 실제로 닿는지, 탄을 잘못 쏘지 않는지 */
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
const R=new Function(code+`;return {S,P,step:dt=>step(dt),FOES,spawnFoe:()=>spawnFoe(),hurtHero:d=>hurtHero(d)};`)();
const {S,P,FOES}=R;
S.intro=0;

// 1) 규격 — 실제 PNG와 선언값이 맞는가
const meta=JSON.parse(fs.readFileSync(__dirname+'/frogmeta.json','utf8'));
const M=FOES.frog;
console.log('규격 선언 '+M.w+'x'+M.h+' · PNG '+meta.w+'x'+meta.h+
            (M.w===meta.w&&M.h===meta.h?' · 일치':' · ★불일치'));
console.log('혀 사거리 '+M.range+' · 그림이 닿는 거리 '+meta.lash+
            (M.range<meta.lash?' · 그림 안':' · ★그림 밖'));
const frames=new Set();
for(const a in M.anim) for(const f of M.anim[a]) frames.add(f);
const missing=[...frames].filter(f=>!fs.existsSync(__dirname+'/assets/frog_'+f+'.png'));
console.log('프레임 파일: '+(missing.length?'★없음 '+missing.join(','):'전부 있음'));

// 2) 실전 — 죽림을 120초 돌린다
let seen=0, atkFr=0, lashHit=0, shots=0, maxD=0;
let hp=P.hp;
for(let i=0;i<60*120;i++){
  T+=1000/60;
  const before=P.hp;
  R.step(1/60);
  const frogs=S.foes.filter(f=>f.k==='frog'&&!f.dead);
  seen+=frogs.length;
  for(const f of frogs){
    if(f.anim==='atk') atkFr++;
    // 공격을 '시작하는' 순간의 거리만 잰다.
    // 시작 뒤에는 주인공이 달아나므로 그때 거리는 의미가 없다.
    const d=Math.hypot(f.x-P.x,f.y-P.y);
    if(f.atkT>0 && !f.__was && d>maxD) maxD=d;
    f.__was = f.atkT>0;
  }
  if(P.hp<before && frogs.length && !S.shots.length) lashHit++;
  shots=Math.max(shots,S.shots.length);
}
console.log('개구리 등장 프레임 '+seen+' · 공격 동작 프레임 '+atkFr);
console.log('혀 판정 최대 거리 '+maxD.toFixed(0)+'px (선언 '+M.range+')');
console.log('동시 탄 최대 '+shots+' (개구리는 탄을 쏘지 않는다 — 주술사 것)');
console.log('주인공 hp '+Math.round(P.hp)+'/'+Math.round(P.hpMax)+' · 쓰러짐 '+S.downs);
