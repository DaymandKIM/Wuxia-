/* 진행 시뮬 — 소비 전략(spend) 포함 24시간 곡선.
   밸런스 규칙: 잔고가 쌓이기만 하면 살 게 부족한 것, 계속 0이면 곡선이 가파른 것.
   기본 24시간(느림, ~1분). 짧게 보려면 SIM_MIN=60 node sim.js */
const fs=require('fs');
const ORDER=['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js',
             '40-step.js','50-render.js','60-ui.js','62-train.js','63-arts.js','65b-treedata.js','66-tree.js','68-equip.js','69-achv.js','69b-sect.js','69c-duel.js'];
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
  EQUIP,eqMergeAll:()=>eqMergeAll(),eqAutoEquipAll:()=>eqAutoEquipAll(),lvCost:(k,g)=>lvCost(k,g),canLevelItem:(k,g)=>canLevelItem(k,g),levelItem:(k,g)=>levelItem(k,g),achvClaimAll:()=>achvClaimAll(),SECT,hallLv:k=>hallLv(k),hallCost:k=>hallCost(k),hallCap:()=>hallCap(),canBuildHall:k=>canBuildHall(k),buildHall:k=>buildHall(k),fameTier:()=>fameTier(),
  // 본진 비무 (v2.94) — 본진 이동·단·복귀. gotoZone 은 TEST 게이트라 자유롭게 부를 수 있다
  DUEL,ZONES,SCHOOLS,realmLv:()=>realmLv(),gotoHq:k=>gotoHq(k),hqRank:k=>hqRank(k),gotoZone:(i,st)=>gotoZone(i,st)};`)();
const {S,P}=R;

// 본진 비무 흉내 (v2.94) — 조각이 모자란 상승 무공이 있고 그 문파 본진이 지금 사냥터보다 약하면 간다.
// SIM_NOHQ=1 이면 본진 로직을 끈다(비교용). hqBack = 본진 가기 전 사냥터 자리(돌아올 곳).
const NOHQ=!!process.env.SIM_NOHQ;
let hqBack=null;   // {zi, stage, target}
const huntG=()=> S.hq ? hqBack.zi*10+Math.min(hqBack.stage,10) : R.gstage();   // 사냥터 전역 단계(본진에 있어도 사냥터 기준)
// 조각이 모자라서 못 배우는 상승 무공 — 경지·은자는 되는 것만
function fragWants(){
  return R.ARTS.list.filter(a=>a.frag&&!S.arts[a.k]&&R.realmLv()>=a.need&&S.silver>=a.cost&&(S.frag[a.k]|0)<a.frag);
}
function hqG(k){ return R.DUEL.gBase[k]+R.DUEL.gPerRank*(R.hqRank(k)-1); }   // 그 본진의 지금 단 g
let hqTrips=0;   // 본진 왕복 횟수(보고용)
function hqStep(){
  if(NOHQ)return;
  const g=huntG();
  if(S.hq){
    // 복귀 조건: 목표를 배웠거나(조각 차서 learnArt 됨) · 본진 단 g 가 사냥터 g 를 넘었거나 · 이 문파에 조각 모자란 무공이 더 없을 때
    // (은자는 안 본다 — 본진에서 수련·전각에 쓰느라 잔고가 출렁여 매 틱 왔다 갔다 한다)
    const k=S.hq, still=R.ARTS.list.some(a=>a.frag&&a.school===k&&!S.arts[a.k]&&R.realmLv()>=a.need&&(S.frag[a.k]|0)<a.frag);
    if(S.arts[hqBack.target]||hqG(k)>g||!still){
      if(process.env.SIM_HQLOG)console.log('  ↩ '+Math.round(S.t/60)+'분 복귀 '+R.SCHOOLS[k].n+' '+R.hqRank(k)+'단 (learned='+!!S.arts[hqBack.target]+' hqG='+hqG(k)+' g='+g+' still='+still+') 조각='+JSON.stringify(S.frag)+' stage='+S.stage+' kills='+S.kills);
      const rx=S.rexp;                       // TEST 의 seedExp 가 수련치를 채우지 않게 되돌린다(시뮬 오염 방지)
      R.gotoZone(hqBack.zi,hqBack.stage); S.rexp=rx;
      hqBack=null;
    }
    return;
  }
  // 갈 만한 본진: gBase ≤ 사냥터 g 이고 지금 단의 g 도 ≤ 사냥터 g (너무 센 장로에 매달리지 않게)
  const cand=fragWants().filter(a=>R.DUEL.gBase[a.school]!==undefined&&R.DUEL.gBase[a.school]<=g&&hqG(a.school)<=g);
  if(!cand.length)return;
  cand.sort((a,b)=>hqG(a.school)-hqG(b.school));   // 약한 본진부터
  const a=cand[0];
  hqBack={zi:S.zi,stage:Math.min(S.stage,10),target:a.k};
  if(!R.gotoHq(a.school))hqBack=null; else { hqTrips++; if(process.env.SIM_HQLOG)console.log('  → '+Math.round(S.t/60)+'분 본진 '+R.SCHOOLS[a.school].n+' '+R.hqRank(a.school)+'단 목표 '+a.n+' (g='+g+' 은자='+Math.round(S.silver)+')'); }
}

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
  // 문파 전각 (v2.91) — 싼 전각부터 틱당 최대 3회 (수련과 같은 결의 sink)
  for(let n=0;n<3;n++){
    let b=null,c=1e18;
    for(const h of R.SECT.halls){ if(R.hallLv(h.k)>=R.hallCap())continue; const cc=R.hallCost(h.k); if(cc<c){c=cc;b=h.k;} }
    if(!b||S.silver<c)break;
    R.buildHall(b);
  }
  hqStep();   // 본진 비무 (v2.94) — 무공 습득·특성 구매 뒤에 판단(조각이 찼으면 위에서 이미 배웠다)
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
console.log('시간    구역·단계   g   경지          은자잔고    수련합  무공  쓰러짐  전각  명성      위치        상승');
const line=()=>{
  let tl=0;for(const s of R.TRAIN.list)tl+=R.statLv(s.k);
  // 구역·단계·g 는 사냥터 기준(본진에 있으면 돌아갈 자리), 위치는 지금 있는 곳(본진이면 '개방 3단'), 상승 = 배운 상승 무공 수 · 조각 합계
  const hz=S.hq?hqBack:{zi:S.zi,stage:S.stage};
  const where=S.hq?R.SCHOOLS[S.hq].n+' '+R.hqRank(S.hq)+'단':'사냥터';
  const nUp=R.ARTS.list.filter(a=>a.frag&&S.arts[a.k]).length, nFrag=Object.values(S.frag||{}).reduce((a,b)=>a+(b|0),0);
  const up='상승'+nUp+' 조각'+nFrag;
  console.log(String(marks[mi]).padStart(4)+'분  '+(R.ZONES[hz.zi].n+' '+hz.stage).padEnd(9)+
    String(hz.zi*10+Math.min(hz.stage,10)).padStart(3)+'   '+R.realmInfo().name.padEnd(9)+
    String(Math.round(S.silver)).padStart(10)+String(tl).padStart(7)+
    String(Object.keys(S.arts).length).padStart(5)+String(S.downs).padStart(7)+
    String(R.SECT.halls.reduce((a,h)=>a+R.hallLv(h.k),0)).padStart(6)+'  '+R.SECT.fame.tiers[R.fameTier()].n.padEnd(6)+
    '  '+where.padEnd(10)+'  '+up);
};
let next=30;
for(let i=0;i<30*60*MIN;i++){
  R.step(dt);
  if(S.t>=next){spend();next+=30;}
  if(mi<marks.length&&S.t>=marks[mi]*60){line();mi++;}
}
while(mi<marks.length){line();mi++;}
if(!NOHQ)console.log('본진 왕복 '+hqTrips+'회 · 단: '+Object.entries(S.duel||{}).map(([k,v])=>R.SCHOOLS[k].n+' '+(v-1)+'단 격파').join(', '));
