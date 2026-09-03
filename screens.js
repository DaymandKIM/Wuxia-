const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const DEVICES=[
  ['iPhone SE',    375, 667, 2],
  ['iPhone 15',    393, 852, 3],
  ['iPhone 15 PM', 430, 932, 3],
  ['Galaxy S24',   360, 780, 3],
  ['iPad mini',    744,1133, 2],
  ['iPad Pro 12',1024,1366, 2],
  ['PC 1080p',    1920,1080, 1],
  ['PC 4K',       2560,1440, 2],
];
let done=0;
for (const [name,W,H,dpr] of DEVICES){
  const ctxStub=new Proxy({},{get:(t,k)=>{
    if(k==='canvas') return {width:0,height:0};
    if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth',
        'globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
    if(k==='createLinearGradient') return ()=>({addColorStop(){}});
    return ()=>{};
  },set:()=>true});
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    Object.defineProperty(w,'innerWidth',{value:W,configurable:true});
    Object.defineProperty(w,'innerHeight',{value:H,configurable:true});
    Object.defineProperty(w,'devicePixelRatio',{value:dpr,configurable:true});
    const oi=w.Image;
    w.Image=class extends oi{constructor(){super();
      setTimeout(()=>this.onload&&this.onload(),5);
      Object.defineProperty(this,'naturalWidth',{get:()=>320});
      Object.defineProperty(this,'naturalHeight',{get:()=>96});
      Object.defineProperty(this,'complete',{get:()=>true});}};
  }});
  setTimeout(()=>{
    const w=dom.window;
    try{
      const V=w.eval('VIEW'), sc=w.eval('SC'), vw=w.eval('VW'), vh=w.eval('VH');
      const cw=w.eval('cv.width'), chh=w.eval('cv.height');
      console.log(name.padEnd(13)+String(W).padStart(5)+'x'+String(H).padEnd(5)+
        ' →판 '+String(V.w).padStart(4)+'x'+String(V.h).padEnd(5)+
        ' 캔버스 '+String(cw).padStart(4)+'x'+String(chh).padEnd(4)+
        ' 배율'+sc+' 뷰 '+vw+'x'+vh+
        ' ('+(cw*chh/1e6).toFixed(1)+'Mpx)');
    }catch(e){ console.log(name+' 실패: '+e.message); }
    if(++done===DEVICES.length) process.exit(0);
  },300);
}
