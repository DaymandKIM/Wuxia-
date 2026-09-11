/* 천산 검증 — jsdom 실제 실행.
   1) 천산에 천산수리가 등장하는가
   2) 수리 프레임 에셋이 전부 있는가
   3) 급강하 발톱이 실제로 아픈가
*/
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
const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
  pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  w.Image=class{ set src(v){this._s=v;} get src(){return this._s;}
    get complete(){return true;} get naturalWidth(){return 35;} get naturalHeight(){return 12;} };
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window;
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

setTimeout(()=>{
  const miss=w.eval(`(function(){
    const miss=[];
    for(const a in FOES.eagle.anim)
      for(const f of FOES.eagle.anim[a]) if(!ASSET['eagle_'+f]) miss.push(f);
    return miss.join(',');
  })()`);
  ok(miss==='','천산수리 에셋 전부 존재'+(miss?' (빠짐: '+miss+')':''));
  ok(w.eval('ZONEFOE.heaven.includes("eagle")'),'천산 등장 목록에 천산수리');

  w.eval(`gotoZone(4,1); S.intro=0; S.foes.length=0; spawnFoe();
    S.foes[0].k='eagle'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
    S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].cd=0;
    window.__hurt=0;
    const _hh=hurtHero; hurtHero=function(d){ window.__hurt+=d; return _hh(d); };`);
  setTimeout(()=>{
    ok(w.eval('window.__hurt')>0,'급강하 발톱이 아프다 ('+Math.round(w.eval('window.__hurt'))+' 피해)');
    ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
    console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
    process.exit(bad?1:0);
  },1600);
},2500);
