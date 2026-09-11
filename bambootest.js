/* 죽림 확장 검증 — jsdom 실제 실행.
   1) 죽림 등장 목록에 정령병·추적자·방울뱀
   2) 세 몹 프레임 에셋이 전부 있는가 (잎날 탄 포함)
   3) 정령병 쌍검·방울뱀 물기가 실제로 아픈가
   4) 추적자가 거리가 뜨면 잎날을 던지는가 (빙글 도는 탄 — fly 아님)
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
    get complete(){return true;} get naturalWidth(){return 37;} get naturalHeight(){return 38;} };
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window;
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

setTimeout(()=>{
  for (const [k,nm] of [['soldier','정령병'],['stalker','추적자'],['snake','방울뱀'],
                        ['thug','무뢰배'],['beetle','등딱지벌레'],['wasp','말벌']]){
    const miss=w.eval(`(function(){
      const miss=[];
      for(const a in FOES.${k}.anim)
        for(const f of FOES.${k}.anim[a]) if(!ASSET['${k}_'+f]) miss.push(f);
      return miss.join(',');
    })()`);
    ok(miss==='',nm+' 에셋 전부 존재'+(miss?' (빠짐: '+miss+')':''));
  }
  ok(w.eval('!!ASSET.stalker_shot'),'잎날 탄 에셋 존재');
  ok(w.eval('["soldier","stalker","snake","thug","beetle","wasp"].every(k=>ZONEFOE.bamboo.includes(k))'),
    '죽림 등장 목록에 6종 전부');

  // 3) 정령병·방울뱀 근접
  w.eval(`gotoZone(0,1); S.intro=0; S.foes.length=0; spawnFoe();
    S.foes[0].k='soldier'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
    S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].cd=0;
    window.__hurt=0;
    const _hh=hurtHero; hurtHero=function(d){ window.__hurt+=d; return _hh(d); };`);
  setTimeout(()=>{
    ok(w.eval('window.__hurt')>0,'정령병 쌍검이 아프다 ('+Math.round(w.eval('window.__hurt'))+' 피해)');
    w.eval(`S.foes.length=0; spawnFoe();
      S.foes[0].k='snake'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
      S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].cd=0; window.__hurt=0;`);
    setTimeout(()=>{
      ok(w.eval('window.__hurt')>0,'방울뱀 물기가 아프다 ('+Math.round(w.eval('window.__hurt'))+' 피해)');

      // 4) 추적자 잎날 — 던졌는지(그림 탄) + 명중(먼지 없음 → 피해 계수)
      w.eval(`S.foes.length=0; S.shots.length=0; spawnFoe();
        S.foes[0].k='stalker'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
        S.foes[0].thCd=0; S.foes[0].cd=99; S.foes[0].atkT=0;
        window.__hurt=0; window.__ssaw=0;
        window.__pin=setInterval(function(){
          if(window.__hurt>0){ clearInterval(window.__pin); return; }
          const b=S.shots.find(b=>b.img==="stalker_shot");
          if(b){ window.__ssaw=1; window.__fly=b.fly?1:0;
                 P.x=b.x; P.y=b.y+HERO.h*0.4; return; }
          S.foes[0].x=P.x+150; S.foes[0].y=P.y; S.foes[0].thCd=0;
        },50);`);
      setTimeout(()=>{
        ok(w.eval('window.__ssaw===1'),'추적자가 잎날을 던진다 (그림 탄)');
        ok(w.eval('window.__fly!==1'),'잎날은 빙글 도는 탄이다 (fly 아님)');
        ok(w.eval('window.__hurt')>0,'잎날이 명중해 아프다 ('+Math.round(w.eval('window.__hurt'))+' 피해)');
        w.eval('clearInterval(window.__pin)');
        ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
        console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
        process.exit(bad?1:0);
      },2400);
    },1400);
  },1400);
},2500);
