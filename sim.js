/* 진행 시뮬 — 소비 전략(spend) 포함 24시간 곡선.
   밸런스 규칙: 잔고가 쌓이기만 하면 살 게 부족한 것, 계속 0이면 곡선이 가파른 것.
   기본 24시간(느림, ~1분). 짧게 보려면 SIM_MIN=60 node sim.js */
const fs=require('fs');
const ORDER=['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js',
             '40-step.js','50-render.js','60-ui.js','62-train.js','63-arts.js','65b-treedata.js','66-tree.js','68-equip.js','69-achv.js'];
let code=ORDER.map(f=>fs.readFileSync(__dirname+'/src/'+f,'utf8')).join('\n').replace('"use strict";','');
const noop=()=>{};
const ctx=new Proxy({},{get:(t,k)=>k==='canvas'?{width:1170,height:2532}:()=>{},set:()=>true});
const els={};const mk=id=>els[id]||(els[id]={id,style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
  textContent:'',firstElementChild:{style:{},classList:{add:noop,remove:noop,toggle:noop}},getContext:()=>ctx,width:0,height:0,
  querySelectorAll:()=>[],querySelector:()=>null,set innerHTML(v){},get innerHTML(){return '';},onclick:null,appendChild:noop});
global.document={getElementById:mk,createElement:()=>mk('x'),body:{appendChild:noop},querySelectorAll:()=>[]};
global.window=global;global.innerWidth=390;global.innerHeight=844;global.devicePixelRatio=3;
global.addEventListener=noop;
global.ASSET=Object.fromEntries(fs.readdirSync(__dirname+'/assets').filter(f=>f.endsWith('.png')).map(f=>[f.slice(0,-4),'x']));  // 장비 종류 필터(아이콘 있는 것만)
global.Image=class{constructor(){}set src(v){}get complete(){return true;}get naturalWidth(){return 56;}};
const R=new Function(code+`;return {S,P,step:dt=>step(dt),zone:()=>zone(),lv:()=>lv(),gstage:()=>gstage(),
  realmInfo:()=>realmInfo(),statLv:k=>statLv(k),trainCost:(k,n)=>trainCost(k,n),trainCap:()=>trainCap(),
  buyStat:k=>buyStat(k),TRAIN,ARTS,canLearn:a=>canLearn(a),learnArt:k=>learnArt(k),
  canBreak:a=>canBreak(a),breakArt:k=>breakArt(k),
  canLevel:a=>canLevel(a),levelArt:k=>levelArt(k),
  TREE,treeNodes:s=>treeNodes(s),treeAvail:(s,n)=>treeAvail(s,n),
  treeAlloc:(s,id)=>treeAlloc(s,id),skillPtsLeft:()=>skillPtsLeft(),
  traitDefs:k=>traitDefs(k),hasTrait:(k,id)=>hasTrait(k,id),traitBuy:(k,id)=>traitBuy(k,id),
  EQUIP,eqMergeAll:()=>eqMergeAll(),eqAutoEquipAll:()=>eqAutoEquipAll(),lvCost:(k,g)=>lvCost(k,g),canLevelItem:(k,g)=>canLevelItem(k,g),levelItem:(k,g)=>levelItem(k,g),achvClaimAll:()=>achvClaimAll()};`)();
const {S,P}=R;

// 플레이어 흉내 — 30초마다: 가장 싼 수련 스텟 1개, 배울 수 있는 무공, 가능한 돌파
function spend(){
  for(let n=0;n<10;n++){
    let b2=null,c2=1e18;
    for(const s of R.TRAIN.list){
      if(R.statLv(s.k)>=R.trainCap())continue;
      const c=R.trainCost(s.k,R.statLv(s.k));
      if(c<c2){c2=c;b2=s.k;}
    }
    if(!b2||S.silver<c2)break;
    R.buyStat(b2);
  }
  for(const a of R.ARTS.list){
    if(R.canLearn(a))R.learnArt(a.k);
    else if(R.canBreak(a))R.breakArt(a.k);
  }
  // 연마 — 틱당 최대 5회 (수련 구매와 균형)
  for(let n=0;n<5;n++){
    let hit=false;
    for(const a of R.ARTS.list)if(R.canLevel(a)){R.levelArt(a.k);hit=true;}
    if(!hit)break;
  }
  // 경지 무공점 — 스킬 심화 특성을 싼 것부터 산다 (문파 무공도 접힘 v2.55.2)
  for(let n=0;n<30;n++){
    if(R.skillPtsLeft()<=0)break;
    let best=null;
    for(const a of R.ARTS.list){
      if(!S.arts[a.k])continue;
      for(const t of R.traitDefs(a.k)){
        if(R.hasTrait(a.k,t.id)||(t.c||0)>R.skillPtsLeft())continue;
        if(!best||(t.c||0)<best.cost)best={k:a.k,id:t.id,cost:t.c||0};
      }
    }
    if(!best)break;
    R.traitBuy(best.k,best.id);
  }
  // 장비 (v2.70 표준형) — 일괄 합성·자동 장착 버튼을 누르는 셈, 그다음 낀 아이템부터 싼 강화 3회
  R.eqMergeAll(); R.eqAutoEquipAll();
  R.achvClaimAll();   // 업적 보상도 받는다 (v2.90)
  for(let n=0;n<3;n++){
    let b=null,c=1e18;
    for(const key in S.equip){ const it=S.equip[key]; if(!it) continue;   // 낀 것 전부 (v2.89 8자리)
      if(R.canLevelItem(it.k,it.g)){ const cc=R.lvCost(it.k,it.g); if(cc<c){c=cc;b=it;} } }
    if(!b)break;
    R.levelItem(b.k,b.g);
  }
}

const MIN=parseInt(process.env.SIM_MIN||'1440',10);
const dt=1/30;
const marks=[5,15,30,60,120,240,480,960,1440].filter(m=>m<=MIN);
let mi=0;
console.log('시간    구역·단계   g   경지          은자잔고    수련합  무공  쓰러짐');
const line=()=>{
  let tl=0;for(const s of R.TRAIN.list)tl+=R.statLv(s.k);
  console.log(String(marks[mi]).padStart(4)+'분  '+(R.zone().n+' '+S.stage).padEnd(9)+
    String(R.gstage()).padStart(3)+'   '+R.realmInfo().name.padEnd(9)+
    String(Math.round(S.silver)).padStart(10)+String(tl).padStart(7)+
    String(Object.keys(S.arts).length).padStart(5)+String(S.downs).padStart(7));
};
let next=30;
for(let i=0;i<30*60*MIN;i++){
  R.step(dt);
  if(S.t>=next){spend();next+=30;}
  if(mi<marks.length&&S.t>=marks[mi]*60){line();mi++;}
}
while(mi<marks.length){line();mi++;}
