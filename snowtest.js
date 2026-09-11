/* 설산 검증 — jsdom 실제 실행.
   1) 설산에 설랑·빙백령이 등장하는가
   2) 설랑·빙백령 프레임 에셋이 전부 있는가 (얼음 조각 탄 포함)
   3) 설랑 물기가 실제로 아픈가
   4) 빙백령이 얼음 조각(그림 탄·fly)을 쏘고 명중하는가
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
  // 2) 에셋 존재
  for (const k of ['wolf','spirit']){
    const miss=w.eval(`(function(){
      const miss=[];
      for(const a in FOES.${k}.anim)
        for(const f of FOES.${k}.anim[a]) if(!ASSET['${k}_'+f]) miss.push(f);
      return miss.join(',');
    })()`);
    ok(miss==='',(k==='wolf'?'설랑':'빙백령')+' 에셋 전부 존재'+(miss?' (빠짐: '+miss+')':''));
  }
  ok(w.eval('!!ASSET.spirit_shot'),'얼음 조각 탄 에셋 존재');
  // 1) 등장표
  ok(w.eval('ZONEFOE.snow.includes("wolf") && ZONEFOE.snow.includes("spirit")'),
    '설산 등장 목록에 설랑·빙백령');

  // 무대 — 설산 1단계, 설랑 하나
  w.eval(`gotoZone(3,1); S.intro=0; S.foes.length=0; spawnFoe();
    S.foes[0].k='wolf'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
    S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].cd=0;
    P.hpMax=1e7; P.hp=1e7;`);
  const hp0=w.eval('P.hp');
  setTimeout(()=>{
    // 3) 설랑 물기
    ok(w.eval('P.hp')<hp0,'설랑 물기가 아프다 ('+Math.round(hp0-w.eval('P.hp'))+' 피해)');

    // 4) 빙백령 — 사거리에 세워 두고 조각을 쏘는지 본다
    w.eval(`S.foes.length=0; S.shots.length=0; spawnFoe();
      S.foes[0].k='spirit'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
      S.foes[0].cd=0; S.foes[0].atkT=0;
      P.hp=P.hpMax;
      // 회복이 피해를 바로 메꾸므로 체력 대신 맞은 양을 계수한다
      window.__saw=0; window.__hurt=0;
      const _hh=hurtHero;
      hurtHero=function(d){ window.__hurt+=d; return _hh(d); };
      window.__pin=setInterval(function(){
        const f=S.foes[0]; if(!f) return;
        f.x=P.x+90; f.y=P.y;
        const b=S.shots.find(b=>b.img==="spirit_shot");
        if(b){ window.__saw=1; window.__fly=b.fly?1:0;
               P.x=b.x; P.y=b.y+HERO.h*0.4; }   // 조각 경로에 서서 명중 보장
      },50);`);
    setTimeout(()=>{
      ok(w.eval('window.__saw===1'),'빙백령이 얼음 조각을 쏜다 (그림 탄)');
      ok(w.eval('window.__fly===1'),'조각은 fly 탄이다 (돌지 않고 방향을 본다)');
      ok(w.eval('window.__hurt')>0,'조각이 명중해 아프다 ('+Math.round(w.eval('window.__hurt'))+' 피해)');
      w.eval('clearInterval(window.__pin)');
      ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
      console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
      process.exit(bad?1:0);
    },2600);
  },1400);
},2500);
