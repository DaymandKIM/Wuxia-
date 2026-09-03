const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
let drawn=0; const errs=[];
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(k==='drawImage') return ()=>{drawn++;};
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
    let d=false; setTimeout(()=>{d=true;this.onload&&this.onload();},300+Math.random()*400);
    Object.defineProperty(this,'naturalWidth',{get:()=>d?56:0});
    Object.defineProperty(this,'complete',{get:()=>d});}};
}});
const w=dom.window;
const snap=(ms)=>setTimeout(()=>{
  try{
    const S=w.eval('S'), P=w.eval('P');
    console.log(String(ms).padStart(4)+'ms  단계'+S.stage+' 처치'+S.kills+'/'+w.eval('stage()').need+
      '  적'+S.foes.length+'  주인공 '+P.anim+' hp'+Math.round(P.hp)+'  연출'+S.intro.toFixed(1)+
      '  그리기'+drawn);
    drawn=0;
  }catch(e){ console.log(ms+'ms 실패: '+e.message); }
},ms);
[200,1000,2000,3200,5000,8000].forEach(snap);
setTimeout(()=>{ console.log('오류:', errs.length?errs.slice(0,3):'없음'); process.exit(0); },8600);
