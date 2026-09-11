/* 동굴 검증 — jsdom 실제 실행.
   1) 동굴에 독충·박쥐가 등장하는가
   2) 독충·박쥐 프레임 에셋이 전부 있는가 (음파 고리 탄 포함)
   3) 독충 물기가 실제로 아픈가
   4) 박쥐가 거리가 뜨면 음파 고리를 쏘고 명중하는가 (fly 탄 폭발)
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
    get complete(){return true;} get naturalWidth(){return 87;} get naturalHeight(){return 51;} };
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window;
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

setTimeout(()=>{
  for (const k of ['bug','bat']){
    const miss=w.eval(`(function(){
      const miss=[];
      for(const a in FOES.${k}.anim)
        for(const f of FOES.${k}.anim[a]) if(!ASSET['${k}_'+f]) miss.push(f);
      return miss.join(',');
    })()`);
    ok(miss==='',(k==='bug'?'독충':'박쥐')+' 에셋 전부 존재'+(miss?' (빠짐: '+miss+')':''));
  }
  ok(w.eval('!!ASSET.bat_shot'),'음파 고리 탄 에셋 존재');
  ok(w.eval('ZONEFOE.cave.includes("bug") && ZONEFOE.cave.includes("bat")'),
    '동굴 등장 목록에 독충·박쥐');

  // 3) 독충 물기
  w.eval(`gotoZone(2,1); S.intro=0; S.foes.length=0; spawnFoe();
    S.foes[0].k='bug'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
    S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].cd=0;
    window.__hurt=0;
    const _hh=hurtHero; hurtHero=function(d){ window.__hurt+=d; return _hh(d); };`);
  setTimeout(()=>{
    ok(w.eval('window.__hurt')>0,'독충 물기가 아프다 ('+Math.round(w.eval('window.__hurt'))+' 피해)');

    // 4) 박쥐 — 음파 고리 (fly 탄 폭발이 명중 증거)
    w.eval(`S.foes.length=0; S.shots.length=0; spawnFoe();
      S.foes[0].k='bat'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
      S.foes[0].thCd=0; S.foes[0].cd=99; S.foes[0].atkT=0;
      window.__burst=0; window.__bsaw=0;
      const _pf=S.fx.push.bind(S.fx);
      S.fx.push=function(e){ if(e&&e.k==="burst") window.__burst++; return _pf(e); };
      window.__pin=setInterval(function(){
        if(window.__burst>0){ clearInterval(window.__pin); return; }
        const b=S.shots.find(b=>b.img==="bat_shot");
        if(b){ window.__bsaw=1; P.x=b.x; P.y=b.y+HERO.h*0.4; return; }
        S.foes[0].x=P.x+140; S.foes[0].y=P.y; S.foes[0].thCd=0;
      },50);`);
    setTimeout(()=>{
      ok(w.eval('window.__bsaw===1'),'박쥐가 음파 고리를 쏜다 (그림 탄)');
      ok(w.eval('window.__burst')>0,'고리가 명중해 터졌다 ('+w.eval('window.__burst')+'회 폭발)');
      w.eval('clearInterval(window.__pin)');
      ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
      console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
      process.exit(bad?1:0);
    },2400);
  },1400);
},2500);
