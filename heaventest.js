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
  for (const [k,nm] of [['eagle','천산수리'],['jbeetle','옥갑충']]){
    const miss=w.eval(`(function(){
      const miss=[];
      for(const a in FOES.${k}.anim)
        for(const f of FOES.${k}.anim[a]) if(!ASSET['${k}_'+f]) miss.push(f);
      return miss.join(',');
    })()`);
    ok(miss==='',nm+' 에셋 전부 존재'+(miss?' (빠짐: '+miss+')':''));
  }
  ok(w.eval('ZONEFOE.heaven.includes("eagle") && ZONEFOE.heaven.includes("jbeetle")'),
    '천산 등장 목록에 수리·옥갑충');

  // 경공(v2.41)은 먼 적에게 날아가므로, 거리를 고정해 재는 이 검사에선 끈다
  w.eval('DASH.min = 1e9;');
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
      S.foes[0].thCd=0; S.foes[0].dhCd=999; S.foes[0].cd=99; S.foes[0].atkT=0;
      window.__burst=0; window.__gsaw=0;
      const _pf=S.fx.push.bind(S.fx);
      S.fx.push=function(e){ if(e&&e.k==="burst") window.__burst++; return _pf(e); };
      window.__pin=setInterval(function(){
        if(window.__burst>0){ clearInterval(window.__pin); return; }
        const b=S.shots.find(b=>b.img==="guard_shot");
        if(b){ window.__gsaw=1; P.x=b.x; P.y=b.y+HERO.h*0.4; return; }
        S.foes[0].x=P.x+220; S.foes[0].y=P.y; S.foes[0].thCd=0; S.foes[0].dhCd=999;
      },50);`);
    setTimeout(()=>{
      ok(w.eval('window.__gsaw===1'),'수호무사가 초승달 검기를 날린다 (그림 탄)');
      ok(w.eval('window.__burst')>0,'검기가 명중해 터졌다 ('+w.eval('window.__burst')+'회 폭발)');
      w.eval('clearInterval(window.__pin)');

      // 5) 돌격 — 중거리에서 찌르기 자세로 미끄러져 들어와 꿰뚫는다
      w.eval(`S.foes.length=0; S.shots.length=0; spawnFoe();
        S.foes[0].k='guard'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
        S.foes[0].x=P.x+120; S.foes[0].y=P.y;
        S.foes[0].dhCd=0; S.foes[0].thCd=999; S.foes[0].cd=99;
        window.__hurt=0;`);
      const gx0=w.eval('S.foes[0].x - P.x');
      setTimeout(()=>{
        ok(w.eval('window.__hurt')>0,'돌격이 명중해 아프다 ('+Math.round(w.eval('window.__hurt'))+' 피해)');
        ok(w.eval('S.foes[0] ? dist(S.foes[0].x,S.foes[0].y,P.x,P.y) : 0')<gx0,
          '돌격으로 실제로 파고들었다');

        // 6) 천산 보스 = 뇌운신장 — 에셋·갈래 번개 탄 검증 (v2.32)
        const bmiss=w.eval(`(function(){
          const miss=[];
          for(const a in FOES.thunder.anim)
            for(const f of FOES.thunder.anim[a]) if(!ASSET['thunder_'+f]) miss.push(f);
          if(!ASSET.thunder_shot) miss.push('shot');
          return miss.join(',');
        })()`);
        ok(bmiss==='','뇌운신장 에셋 전부 존재'+(bmiss?' (빠짐: '+bmiss+')':''));
        ok(w.eval('ZONEBOSS.heaven==="thunder"'),'천산 보스는 뇌운신장');
        w.eval(`S.shots.length=0; gotoZone(4,11); S.intro=0; S.foes.length=0; spawnBoss();
          const b=S.foes[0]; b.rise=0; b.skCd=0; b.hp=1e15; b.hpMax=1e15;
          // 명중 증거는 fly 탄 폭발(burst) — 보스 근접타(전천후)와 구분된다
          window.__burst=0;
          const _pf2=S.fx.push.bind(S.fx);
          S.fx.push=function(e){ if(e&&e.k==="burst") window.__burst++; return _pf2(e); };
          window.__bsaw=0;
          window.__bpin=setInterval(function(){
            const b=S.foes.find(f=>f.boss); if(!b) return;
            b.x=P.x+240; b.y=P.y;
            const s=S.shots.find(s=>s.img==='thunder_shot');
            if(s){ window.__bsaw=1; P.x=s.x; P.y=s.y+HERO.h*0.4; }
          },50);`);
        setTimeout(()=>{
          ok(w.eval('window.__bsaw===1'),'뇌운신장이 갈래 번개를 던진다 (그림 탄)');
          ok(w.eval('window.__burst')>0,'번개가 명중해 터졌다 ('+w.eval('window.__burst')+'회 폭발)');
          w.eval('clearInterval(window.__bpin)');
          ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
          console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
          process.exit(bad?1:0);
        },2600);
      },1400);
    },2400);
  },1600);
},2500);
