/* 천산 검증 — jsdom 실제 실행.
   1) 천산에 천산수리·수호무사가 등장하는가
   2) 수리·무사 프레임 에셋이 전부 있는가 (초승달 검기 탄 포함)
   3) 수리 급강하 발톱이 실제로 아픈가
   4) 수호무사가 거리가 뜨면 초승달 검기를 날려 맞히는가 (fly 탄 폭발)
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

    // 4) 수호무사 — 에셋·초승달 검기
    const gmiss=w.eval(`(function(){
      const miss=[];
      for(const a in FOES.guard.anim)
        for(const f of FOES.guard.anim[a]) if(!ASSET['guard_'+f]) miss.push(f);
      if(!ASSET.guard_shot) miss.push('shot');
      return miss.join(',');
    })()`);
    ok(gmiss==='','수호무사 에셋 전부 존재'+(gmiss?' (빠짐: '+gmiss+')':''));
    ok(w.eval('ZONEFOE.heaven.includes("guard")'),'천산 등장 목록에 수호무사');
    w.eval(`S.foes.length=0; S.shots.length=0; spawnFoe();
      S.foes[0].k='guard'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
      S.foes[0].thCd=0; S.foes[0].cd=99; S.foes[0].atkT=0;
      window.__burst=0; window.__gsaw=0;
      const _pf=S.fx.push.bind(S.fx);
      S.fx.push=function(e){ if(e&&e.k==="burst") window.__burst++; return _pf(e); };
      window.__pin=setInterval(function(){
        if(window.__burst>0){ clearInterval(window.__pin); return; }
        const b=S.shots.find(b=>b.img==="guard_shot");
        if(b){ window.__gsaw=1; P.x=b.x; P.y=b.y+HERO.h*0.4; return; }
        S.foes[0].x=P.x+140; S.foes[0].y=P.y; S.foes[0].thCd=0;
      },50);`);
    setTimeout(()=>{
      ok(w.eval('window.__gsaw===1'),'수호무사가 초승달 검기를 날린다 (그림 탄)');
      ok(w.eval('window.__burst')>0,'검기가 명중해 터졌다 ('+w.eval('window.__burst')+'회 폭발)');
      w.eval('clearInterval(window.__pin)');
      ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
      console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
      process.exit(bad?1:0);
    },2400);
  },1600);
},2500);
