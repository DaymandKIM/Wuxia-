const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const errs=[];
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth',
      'globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:()=>true});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  Object.defineProperty(w,'devicePixelRatio',{value:3});
  w.addEventListener('error',e=>errs.push(e.message));
  const oi=w.Image;
  w.Image=class extends oi{constructor(){super();
    setTimeout(()=>this.onload&&this.onload(),5);
    Object.defineProperty(this,'naturalWidth',{get:()=>56});
    Object.defineProperty(this,'complete',{get:()=>true});}};
}});
setTimeout(()=>{
  const w=dom.window, d=w.document;
  const btn=d.getElementById('tdown');   // 시험 패널 안 강제 쓰러짐
  console.log('버튼 표시: '+(d.getElementById('tbtn').className.includes('on')?'예':'아니오'));
  w.eval('S.intro=0');
  btn.onclick();
  console.log('누른 직후: dead='+w.eval('P.dead')+' downT='+w.eval('S.downT').toFixed(1)+' anim='+w.eval('P.anim'));
  const marks=[600,1600,2600,3600,4200];
  let i=0;
  const tick=()=>{
    if(i>=marks.length){ console.log('오류:', errs.length?errs.slice(0,2):'없음'); process.exit(0); }
    setTimeout(()=>{
      console.log(String(marks[i]).padStart(4)+'ms  anim='+w.eval('P.anim').padEnd(6)+
        ' 프레임'+Math.floor(w.eval('P.af'))+
        ' downT='+w.eval('S.downT').toFixed(1)+
        ' hp='+Math.round(w.eval('P.hp'))+'/'+Math.round(w.eval('P.hpMax')));
      i++; tick();
    }, i===0?marks[0]:marks[i]-marks[i-1]);
  };
  tick();
},400);
