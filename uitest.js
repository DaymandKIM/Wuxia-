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
  }catch(e){ console.log('실패:',e.message); }
  console.log('오류:', errs.length?errs.slice(0,2):'없음');
  process.exit(0);
},600);
