const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth',
      'globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:()=>true});
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  Object.defineProperty(w,'devicePixelRatio',{value:3});
  w.addEventListener('error',e=>errs.push(e.message));
  const oi=w.Image;
  w.Image=class extends oi{constructor(){super();
    setTimeout(()=>this.onload&&this.onload(),20);
    Object.defineProperty(this,'naturalWidth',{get:()=>320});
    Object.defineProperty(this,'naturalHeight',{get:()=>96});
    Object.defineProperty(this,'complete',{get:()=>true});}};
}});
setTimeout(()=>{
  const w=dom.window, d=w.document;
  try{
    d.getElementById('tab-zone').onclick();
    // 여정 지도 — 구역 노드(원)로 그린다 (v2.56)
    const nodes=d.querySelectorAll('#zmap .znode');
    console.log('사냥터 지도: '+nodes.length+'개 구역');
    nodes.forEach(nd=>{
      const zi=nd.dataset.z;
      const de=[...d.querySelectorAll('.zd')][+zi].textContent.trim();
      console.log('  '+(nd.classList.contains('lock')?'🔒':'  ')+' 구역'+zi+' '+de);
    });
    // 해금 늘려서 이동 테스트
    w.eval('S.unlocked=5');
    d.getElementById('tab-zone').onclick();
    const open=d.querySelectorAll('#zmap .znode[data-z]:not(.lock)');
    console.log('해금 후 이동 가능: '+open.length+'개');
    // 천산(z=4) 노드로 이동 → 그 구역 단계 스트립이 뜬다
    const t4=[...d.querySelectorAll('#zmap .znode[data-z]')].find(nd=>nd.dataset.z==='4');
    t4.onclick();
    const sbs=d.querySelectorAll('.sb[data-z]');
    console.log('천산 이동 후 단계 버튼: '+sbs.length+'개 (10단계+보스)');
    // 천산 7단계로 이동
    const t=[...sbs].find(b=>b.dataset.z==='4'&&b.dataset.s==='7');
    t.onclick({stopPropagation(){},target:t});
    console.log('천산 7단계 이동 → '+w.eval('zone().n')+' '+w.eval('S.stage')+'단계 · 연출'+w.eval('S.intro').toFixed(1));
    // 구역 노드는 선택만 — 이동하지 않는다 (v2.70.6)
    d.getElementById('tab-zone').onclick();
    const t2=[...d.querySelectorAll('#zmap .znode[data-z]')].find(nd=>nd.dataset.z==='2'); t2.onclick();
    const sel2=[...d.querySelectorAll('.sb[data-z]')].every(b=>b.dataset.z==='2');
    console.log('동굴 노드 누름 → 단계 줄이 동굴('+sel2+') · 아직 '+w.eval('zone().n')+' '+w.eval('S.stage')+'단계 (이동 안 함: '+(w.eval('S.zi')===4)+')');

    console.log('가 본 단계 reach: '+JSON.stringify(w.eval('S.reach'))+' (천산 7)');
    if(!sel2||w.eval('S.zi')!==4||w.eval('S.reach[4]')!==7) errs.push('구역 선택/이동 분리 실패');
  }catch(e){ console.log('실패:',e.message); }
  // 자동 진행 토글 (v2.95.4) — 끄면 단계를 깨도 그 자리에서 다시 돈다
  {
    const S=w.eval('S');
    S.hq=null; S.zi=0; S.stage=3; S.kills=0; S.autoNext=false; S.autoBoss=true;
    w.eval('advanceStage()');
    console.log(S.stage===3 ? '  자동 진행 끄면 단계 그대로 (3)' : '  ★실패 자동 진행을 껐는데 단계가 '+S.stage);
    S.autoNext=true; w.eval('advanceStage()');
    console.log(S.stage===4 ? '  자동 진행 켜면 다음 단계로 (4)' : '  ★실패 자동 진행을 켰는데 단계가 '+S.stage);
    S.stage=10; S.autoBoss=false; w.eval('advanceStage()');
    console.log(S.stage===10 ? '  보스 자동 끄면 10단계에서 멈춘다' : '  ★실패 보스 앞에서 멈춰야 하는데 단계가 '+S.stage);
    S.autoBoss=true; w.eval('advanceStage()');
    console.log(S.stage===w.eval('BOSS_STAGE') ? '  보스 자동 켜면 보스 단계로' : '  ★실패 보스로 안 갔다 — 단계 '+S.stage);
    // 처치 목표는 10 단위
    let bad10=0; for(let g=1; g<=50; g++){ S.zi=Math.floor((g-1)/10); S.stage=((g-1)%10)+1; if (w.eval('stageNeed()')%10) bad10++; }
    console.log(bad10===0 ? '  처치 목표가 전 단계에서 10 단위' : '  ★실패 10 단위가 아닌 단계 '+bad10+'개');
    S.zi=0; S.stage=1; S.kills=0;
  }

  // 로딩 화면 (v2.95.6) — 구역을 넘으면 뜨고, 바가 다 차야 걷힌다
  {
    const el=w.document.getElementById('hqload'), bar=w.document.getElementById('hqbar');
    w.loadSkip();
    w.gotoZone(1,1);
    const nm=w.document.getElementById('hqname').textContent, tip=w.document.getElementById('hqtip').textContent;
    console.log(el && !el.hidden && nm==='폐촌' ? '  구역 이동 로딩 화면: "'+nm+'" · "'+tip+'"' : '  ★실패 구역 로딩 화면이 안 떴다');
    if(!el || el.hidden || nm!=='폐촌') errs.push('구역 로딩 화면');
    for(let i=0;i<30;i++) w.loadStep(1/60);
    console.log(!el.hidden && parseInt(bar.style.width||'0')<100 ? '  바가 다 차기 전엔 안 걷힌다' : '  ★실패 바보다 먼저 걷혔다');
    if(el.hidden) errs.push('로딩 화면이 바보다 먼저 걷힘');
    const keys=w.zoneLoadKeys('village');
    console.log('  폐촌이 기다리는 그림 '+keys.length+'장');
    if(!keys.length) errs.push('zoneLoadKeys 비었다');
    w.loadSkip();
    console.log(el.hidden ? '  바가 다 차면 걷힌다' : '  ★실패 안 걷혔다');
    // 시작도 같은 화면 (사용자 "게임 시작할 때랑 지역 넘어갈 때도")
    w.startLoad();
    console.log(!el.hidden && w.document.getElementById('hqtip').textContent===w.eval('LOADSCR.startTip') ? '  시작 로딩 화면도 같은 틀' : '  ★실패 시작 로딩 화면');
    if(el.hidden) errs.push('시작 로딩 화면');
    w.loadSkip();
    w.gotoZone(0,1); w.loadSkip();
  }

  console.log('오류:', errs.length?errs.slice(0,2):'없음');
  process.exit(0);
},600);
