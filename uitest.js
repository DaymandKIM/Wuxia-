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
    const rows=d.querySelectorAll('.zrow');
    console.log('사냥터 패널: '+rows.length+'개 구역');
    rows.forEach(r=>{
      const nm=r.querySelector('.zn').textContent.trim();
      const de=r.querySelector('.zd').textContent.trim();
      console.log('  '+(r.className.includes('lock')?'🔒':'  ')+' '+nm.padEnd(14)+' '+de);
    });
    // 해금 늘려서 이동 테스트
    w.eval('S.unlocked=5');
    d.getElementById('tab-zone').onclick();
    const rows2=d.querySelectorAll('.zrow[data-z]');
    console.log('해금 후 이동 가능: '+rows2.length+'개');
    const sbs=d.querySelectorAll('.sb');
    console.log('단계 버튼: '+sbs.length+'개 (5구역 x 10단계)');
    // 천산 7단계로 이동
    const t=[...sbs].find(b=>b.dataset.z==='4'&&b.dataset.s==='7');
    t.onclick({stopPropagation(){},target:t});
    console.log('천산 7단계 이동 → '+w.eval('zone().n')+' '+w.eval('S.stage')+'단계 · 연출'+w.eval('S.intro').toFixed(1));
  }catch(e){ console.log('실패:',e.message); }
  console.log('오류:', errs.length?errs.slice(0,2):'없음');
  process.exit(0);
},600);
