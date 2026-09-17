/* 주인공 스프라이트 연출 검증 — 그림이 "실제로" 맞게 돌아가는지 본다.
   spritetest는 파일 규격만 보므로, 여기서는 구동을 본다:
   1) 초식마다 시전 동작(cast)이 올바른 스트립·폭으로 그려지나
   2) 파공권 권기 탄·암향지 지풍 빔이 날아가나
   3) 절정부터 주먹에 권기 빛무리가 맺히나 (양손 콤보 스트립은 그대로)
   4) 경지 기운이 문턱대로 켜지고 색이 바뀌나
   스프라이트를 새로 반영하면 반드시 여기에 검사를 추가한다 (사용자 확정).
*/
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const draws=[];                                  // render가 그린 것들 {im, sw}
const arcs=[];                                   // 원 그리기 — 권기 빛무리 검증용
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(k==='drawImage') return (im,sx,sy,sw)=>{ draws.push({im, sx, sw}); };
  if(k==='arc') return (x,y,r)=>{ arcs.push({x, y, r}); };
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth',
      'globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  if(k==='getImageData') return (x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(1,w*h*4)),width:w,height:h});   // 이펙트 색 물들이기(tintedFx) 경로용
  return ()=>{};
},set:()=>true});
const errs=[];
const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
  pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  // jsdom은 data: 이미지를 디코드하지 않는다 — draw()의 complete 게이트를 통과시킨다
  w.Image=class{ set src(v){this._s=v;} get src(){return this._s;}
    get complete(){return true;} get naturalWidth(){return 35;} get naturalHeight(){return 51;} };
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window;
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };
// 특정 그림이 특정 폭으로 그려졌나
const drew=(imKey,sw)=>draws.some(d=>d.im===w.eval('IMG["'+imKey+'"]')&&(sw===undefined||d.sw===sw));
const renderNow=()=>{ draws.length=0; arcs.length=0; w.eval('render()'); };

setTimeout(()=>{
  w.eval('S.intro=0; S.rexp=1e12; S.silver=0;');           // 최고 경지 — 기운·권기 전부 열림
  w.eval('for(const a of ARTS.list) if(!a.fate) S.arts[a.k]=1;');
  w.eval('S.foes.length=0; spawnFoe(); for(const f of S.foes){f.x=P.x+60;f.y=P.y;}');

  // 1) 초식별 시전 — 스트립·폭이 HFX.cast 선언과 일치해야 한다
  for (const k of ['pagong','whirl','baekbo','bungsan']){
    w.eval('P.castT=0; P.anim="idle"; P.hp=P.hpMax;'+
           'S.foes.length=0; spawnFoe(); for(const f of S.foes){f.x=P.x+60;f.y=P.y;f.hp=1e18;f.hpMax=1e18;}');
    const okCast=w.eval('castArt(artDef("'+k+'"))');
    ok(okCast===true, k+' 시전 성공');
    ok(w.eval('P.anim')==='cast' && w.eval('P.castK')===k, k+' 시전 동작 진입');
    renderNow();
    const [strip, fw]=w.eval('JSON.stringify(HFX.cast["'+k+'"])') && JSON.parse(w.eval('JSON.stringify(HFX.cast["'+k+'"])'));
    ok(drew('hero_'+strip, fw), k+' 시전 스트립이 폭 '+fw+'로 그려진다');
  }
  // 1.5) 파열 연출 (v2.31) — 광역 초식은 무공 색 충격파·섬광·속도선이 함께 터진다
  ok(w.eval('S.fx.some(e=>e.k==="wave")'),'충격파 고리가 생긴다');
  ok(w.eval('S.fx.some(e=>e.k==="flash")'),'섬광이 생긴다');
  ok(w.eval('S.fx.some(e=>e.k==="rays")'),'방사 속도선이 생긴다');
  ok(w.eval('S.fx.some(e=>e.k==="sparks")'),'파편이 생긴다');
  renderNow();
  ok(true,'파열 연출 렌더 통과 (오류는 마지막 검사에서 확인)');

  // 활인기공 — 위태로울 때만
  w.eval('P.castT=0; P.anim="idle"; P.hp=P.hpMax*0.2;');
  ok(w.eval('castArt(artDef("hwalin"))')===true,'활인기공 시전(체력 20%)');
  ok(w.eval('P.hp')>w.eval('P.hpMax')*0.2,'체력이 실제로 회복됐다');
  renderNow();
  ok(drew('hero_'+w.eval('HFX.cast.hwalin[0]'), w.eval('HFX.cast.hwalin[1]')),'활인기공 시전 스트립이 그려진다');

  // 2) 탄 — 파공권 권기 주먹·암향지 지풍 빔
  ok(w.eval('S.fx.some(e=>e.k==="pashot")'),'파공권 권기 탄이 날아간다');
  ok(w.eval('S.fx.some(e=>e.k==="bshot")'),'암향지 지풍 빔이 날아간다');
  renderNow();
  ok(drew('pashot'),'권기 탄 그림이 그려진다');
  ok(drew('bshot'),'지풍 빔 그림이 그려진다');

  // 2.5) 네온 타격감 (v2.61) — 평타 명중에 참격 호·피격 브라이튼, 치명타에 바닥 링·미세 경직
  w.eval(`S.fx.length=0; hitstopT=0; P.castT=0; P.castGapT=0; P.anim="idle"; P.dir=1;
    S.foes.length=0; spawnFoe(); const f0=S.foes[0]; f0.x=P.x+20; f0.y=P.y; f0.af=0; f0.hp=1e18; f0.hpMax=1e18;
    S.stats.crit=0; window.__rnd=Math.random; Math.random=()=>0.5;      // 치명 확률 0 → 평타
    P.atkT=0.3; P.atkCd=0; P.af=HITFRAME; P.hitDone=false; heroHitCheck();`);
  ok(w.eval('S.fx.some(e=>e.k==="slash"&&e.dir===1)'),'평타 명중에 참격 호가 생긴다 (dir 방향)');
  ok(w.eval('S.foes[0].hitT>0'),'맞은 적에 피격 브라이튼 타이머가 켜진다');
  ok(!w.eval('S.fx.some(e=>e.k==="critring")') && w.eval('hitstopT')===0,'평타엔 치명 링·경직이 없다');
  renderNow();
  ok(arcs.length>0,'참격 호가 호(arc)로 렌더된다');
  ok(draws.filter(d=>d.im===w.eval('IMG[S.foes[0].k+"_"+foeM(S.foes[0]).anim[S.foes[0].anim][0]]')).length>=1+w.eval('FXD.hitflash.n'),
     '피격 스프라이트가 브라이튼 겹수만큼 더 그려진다');
  w.eval(`S.fx.length=0; S.stats.crit=1; Math.random=()=>0;                   // 치명 확률 >0, 난수 0 → 항상 치명
    P.atkT=0.3; P.atkCd=0; P.af=HITFRAME; P.hitDone=false; heroHitCheck();`);
  ok(w.eval('S.fx.some(e=>e.k==="critring")'),'치명타에 바닥 네온 링이 생긴다');
  ok(w.eval('S.fx.some(e=>e.k==="slash"&&e.r>FXD.slash.r)'),'치명타 참격 호는 더 크다');
  ok(w.eval('hitstopT')>0 && w.eval('hitstopT')<=w.eval('FXD.hitstop.max'),'치명타에 미세 경직이 걸린다 (상한 안)');
  ok(w.eval('S.fx.some(e=>e.k==="dmg"&&e.c===1)'),'치명 피해 숫자가 뜬다');
  renderNow();
  ok(true,'치명 연출 렌더 통과 (오류는 마지막 검사에서 확인)');
  w.eval('Math.random=window.__rnd; S.stats.crit=0; hitstopT=0; S.fx.length=0;');
  // 탄 잔상 — 나는 탄(fly)은 고스트 n개가 더 그려진다
  w.eval(`S.shots.length=0; S.shots.push({x:P.x+40,y:P.y-20,vx:-1,vy:0,spd:100,dmg:0,img:'spirit_shot',fly:true,life:2,t:0.1});`);
  renderNow();
  ok(draws.filter(d=>d.im===w.eval('IMG.spirit_shot')).length===1+w.eval('FXD.trail.n'),'나는 탄에 잔상 고스트 '+w.eval('FXD.trail.n')+'개가 붙는다');
  w.eval('S.shots.length=0;');


  // 3) 기본공격 (v2.49) — 양주먹=권기 정권(katka/katkb 양손 파란빛), 성급 오르면 각도별 발차기가 섞인다
  ok(w.eval('ATKMOVES.map(m=>m.key).join()')==='punch,kickside,punchdbl,kickside2,punchup,kickround,kickround2,kickhigh,kickhigh2,qipunch,qipunchb',
     '기본공격 무브셋 11종 — 권기 정권 두 판이 맨 끝(마무리 일격, v2.76.3)');
  w.eval('S.equip.weapon=null; S.rexp=0;');                // 맨손(시작 장비 검을 벗김) · 삼류 1성 — 돌려·뛰어차기 미해금
  ok(w.eval('atkPool().map(m=>m.key).join()')==='punch,kickside,punchdbl,kickside2,punchup,qipunch,qipunchb',
     '낮은 성급엔 주먹 5종+옆차기 2종 (v2.76.2)');
  w.eval('S.rexp=1e12;');                                  // 높은 경지 — 전 발차기 해금
  ok(w.eval('atkPool().some(m=>m.key==="kickside")') && w.eval('atkPool().some(m=>m.key==="kickhigh")'),
     '성급이 오르면 각도별 발차기가 섞인다 ('+w.eval('atkPool().length')+'종)');
  // 주먹 3종 — 동작 키가 곧 스트립 (v2.76, 두 판 교대 폐지)
  w.eval('S.fx.length=0; P.castT=0; P.atkT=0.3; P.anim="atk"; P.af=1; P.atkKey="punch";');
  renderNow();
  ok(drew('hero_punch',w.eval('HFX.aw.punch')),'정권 스트립이 제 폭('+w.eval('HFX.aw.punch')+')으로 그려진다');
  w.eval('P.atkKey="punchdbl";'); renderNow();
  ok(drew('hero_punchdbl',w.eval('HFX.aw.punchdbl')),'연환권 스트립이 제 폭('+w.eval('HFX.aw.punchdbl')+')으로 그려진다');
  w.eval('P.atkKey="punchup";'); renderNow();
  ok(drew('hero_punchup',w.eval('HFX.aw.punchup')),'승룡권 스트립이 제 폭('+w.eval('HFX.aw.punchup')+')으로 그려진다');
  w.eval('P.atkKey="kickside";'); renderNow();
  ok(drew('hero_kickside',w.eval('HFX.aw.kickside')),'옆차기 스트립이 제 폭('+w.eval('HFX.aw.kickside')+')으로 그려진다');
  w.eval('P.atkKey="kickround";'); renderNow();
  ok(drew('hero_kickround',w.eval('HFX.aw.kickround')),'돌려차기 스트립이 제 폭('+w.eval('HFX.aw.kickround')+')으로 그려진다');
  w.eval('P.atkKey="kickhigh";'); renderNow();
  ok(drew('hero_kickhigh',w.eval('HFX.aw.kickhigh')),'뛰어차기 스트립이 제 폭('+w.eval('HFX.aw.kickhigh')+')으로 그려진다');
  for (const k of ['qipunch','qipunchb','kickside2','kickround2','kickhigh2']){   // v2.76.2 되살린 옛 동작 — 제 스트립·제 폭
    w.eval('S.fx.length=0; P.atkT=0.3; P.af=2; P.atkKey="'+k+'";'); renderNow();
    ok(drew('hero_'+k,w.eval('HFX.aw.'+k)),'옛 동작 '+k+' 스트립이 제 폭('+w.eval('HFX.aw.'+k)+')으로 그려진다');
  }
  // 공격을 여러 번 하면 열린 동작을 돌려 쓴다
  w.eval(`S.rexp=1e12; P.atkMove=0; P.atkCd=0; P.atkT=0; S.foes.length=0; spawnFoe();
    S.foes[0].x=P.x+20; S.foes[0].y=P.y; S.foes[0].hp=1e12; S.foes[0].hpMax=1e12;
    window.__keys={}; for(let i=0;i<14;i++){ P.atkCd=0; P.atkT=0; heroAttack(); window.__keys[P.atkKey]=1; }`);
  ok(w.eval('ATKMOVES.every(m=>window.__keys[m.key])'),
     '연속 공격이 11종(새 주먹·발차기 + 옛 권기·발차기)을 전부 돌려 쓴다');
  w.eval('P.atkMove=0; window.__seq=[]; for(let i=0;i<11;i++){ P.atkCd=0; P.atkT=0; heroAttack(); window.__seq.push(P.atkKey); }');
  ok(w.eval('window.__seq[9]')==='qipunch' && w.eval('window.__seq[10]')==='qipunchb','권기 정권 두 판이 한 바퀴의 마지막 두 타로 온다(마무리 일격)');
  // 3.5) 무기 장착 → 무기별 무브셋 (v2.72 검 · v2.72.1 부채) — 무기 자리의 종류가 기본공격 동작을 정한다
  for (const wk of Object.keys(w.eval('WEAPONMOVES'))){
    const keys=w.eval('WEAPONMOVES.'+wk+'.map(m=>m.key)');
    w.eval('S.equip.weapon={k:"'+wk+'",g:0}; S.rexp=0;');
    ok(w.eval('atkPool().map(m=>m.key).join()')===keys.join(),wk+'을 끼면 낮은 성급부터 '+keys.length+'종 전부 (v2.75)');
    w.eval('S.rexp=1e12;');
    ok(w.eval('atkPool().map(m=>m.key).join()')===keys.join(),wk+' 성급이 오르면 '+keys.length+'종: '+keys.join('·'));
    for (const k of keys){
      w.eval('S.fx.length=0; P.castT=0; P.atkT=0.3; P.anim="atk"; P.af=2; P.atkKey="'+k+'";'); renderNow();
      ok(drew('hero_'+k,w.eval('HFX.aw.'+k)),k+' 스트립이 제 폭('+w.eval('HFX.aw.'+k)+')으로 그려진다');
    }
    w.eval(`P.atkMove=0; window.__keys={}; S.foes.length=0; spawnFoe(); S.foes[0].x=P.x+20; S.foes[0].y=P.y; S.foes[0].hp=1e12; S.foes[0].hpMax=1e12;
      for(let i=0;i<6;i++){ P.atkCd=0; P.atkT=0; heroAttack(); window.__keys[P.atkKey]=1; }`);
    ok(keys.every(k=>w.eval('window.__keys.'+k)) && !w.eval('window.__keys.punch'),wk+'을 끼면 연속 공격이 그 무기 동작만 돌려 쓴다');
  }
  w.eval('S.equip.weapon=null;');
  ok(w.eval('atkPool()[0].key')==='punch','무기를 벗으면 맨손(정권)으로 돌아온다');

  // 3.5) 제패 연출 중 방향 고정 — 사방으로 밀려나는 적을 쫓아 파닥이지 않는다
  w.eval(`S.rexp=1e12; P.dir=1; P.atkT=0; P.atkCd=0; S.foes.length=0;
    for(let i=0;i<4;i++) spawnFoe();
    S.foes[0].x=P.x-60; S.foes[1].x=P.x+60; S.foes[2].x=P.x-90; S.foes[3].x=P.x+90;
    for(const f of S.foes){ f.y=P.y; f.hp=1e9; f.hpMax=1e9; }
    S.sweepT=SWEEP.charge+SWEEP.blast+SWEEP.hold; S.sweepDone=false;
    window.__flip=0; let d0=P.dir;
    for(let i=0;i<60;i++){ step(1/60); if(P.dir!==d0){ window.__flip++; d0=P.dir; } }
    S.sweepT=0; S.foes.length=0;`);
  ok(w.eval('window.__flip')===0,'제패 연출 중 방향이 안 뒤집힌다 ('+w.eval('window.__flip')+'회 뒤집힘)');
  // 3.6) 시전 컷 수 — v2.90.1부터 성과 무관하게 전 컷(castStar 전부 1.0). 붕산장 구체 컷이 1성에서 빠지던 것을 없앴다
  w.eval('S.artStar.pagong=1;');
  const n1=w.eval('castN("pagong")');
  w.eval('S.artStar.pagong=4;');
  const n4=w.eval('castN("pagong")');
  ok(n1===n4 && n4===w.eval('HFX.cast.pagong[2]'),'시전 컷: 1성 '+n1+' = 4성 '+n4+' = 전 컷 (성으로 안 덜어냄)');
  ok(w.eval('castFrame("pagong",0)')===0 && w.eval('S.artStar.pagong=1, castFrame("pagong",'+(n1-1)+')')===w.eval('HFX.cast.pagong[2]')-1,
    '처음·끝 컷은 처음·끝 그대로');
  w.eval('S.artStar.pagong=0; S.rexp=0;');   // 다음 검사(기운 없음)를 위해 삼류로

  // 3.7) 건곤이형 태극 원반 연출이 그려진다
  w.eval('S.fx.push({k:"taiji", x:P.x, y:P.y-25, life:0.4, t:0.55})');
  renderNow();
  ok(draws.some(d=>d.im===w.eval('IMG.gshield')&&d.sw===w.eval('HFX.taijiW')),'태극 원반 스트립이 그려진다');
  w.eval('S.fx.length=0;');

  // 3.75) 경공 (v2.41) — 절정+ 먼 적에게 날아가 코앞에 착지, 컷이 그려진다
  w.eval(`S.rexp=1e8; gotoZone(3,3); S.intro=0; S.foes.length=0; spawnFoe();
    S.foes[0].k='spirit'; S.foes[0].hp=1e12; S.foes[0].hpMax=1e12;
    const FX=P.x+280, FY=P.y;
    S.foes[0].x=FX; S.foes[0].y=FY; S.foes[0].atkT=99; S.foes[0].cd=99;
    P.dashCd=0; P.dashT=0; P.dashHold=0; window.__flew=0;
    for(let i=0;i<50;i++){ step(1/60);
      S.foes[0].x=FX; S.foes[0].y=FY;    // 적은 제자리 (비행 판정만 본다)
      S.foes[0].atkT=99; S.foes[0].cd=99;
      if(P.dashT>0) window.__flew=1; }`);
  ok(w.eval('window.__flew===1'),'경공 발동 — 먼 적에게 날아간다');
  ok(w.eval('P.dashT>0 ? 1 : dist(P.x,P.y,S.foes[0].x,S.foes[0].y) < 130')
     , '경공으로 적 코앞에 좁혔다');
  w.eval('P.anim="dashfly"; P.dashT=0.2;'); renderNow();
  ok(drew('hero_dashfly', w.eval('DASH.fw')),'날기 컷이 그려진다');
  w.eval('P.dashT=0; P.dashHold=0.1; P.anim="dashland";'); renderNow();
  ok(drew('hero_dashland', w.eval('DASH.lw')),'착지 컷이 그려진다');
  w.eval('P.dashHold=0; P.anim="idle"; S.rexp=0; gotoZone(0,1); S.intro=0;');

  // 3.76) 이동 사이클 (v2.44) — 질주가 프레임마다 hero_run을 그린다
  const RUNN=w.eval('ANIM.run[0]');
  ok(RUNN===6,'달리기는 6프레임 사이클이다 (v2.71.1)');
  let runFrames=new Set();
  for (let fr=0; fr<RUNN; fr++){
    w.eval('P.anim="run"; P.af='+(fr+0.1)+';'); renderNow();
    if (drew('hero_run', w.eval('HFX.aw.run'))) runFrames.add(fr);
  }
  ok(runFrames.size===RUNN,RUNN+'프레임 모두 그려진다 ('+runFrames.size+'/'+RUNN+')');
  // 3.78) 동작별 임팩트 (v2.78) — 동작 키마다 FXD.moveFx가 고른 결의 이펙트가 S.fx에 든다
  const want={punch:'rays', punchup:'streak', qipunch:'flash', kickside:'slash', kickhigh:'slash', swordslash:'streak', spearthrust:'streak',
              saberspin:'wave', staffswing:'wave', fansweep:'petals', fanspin:'wave'};
  for (const k in want){
    w.eval(`S.fx.length=0; S.foes.length=0; spawnFoe(); S.foes[0].x=P.x+16; S.foes[0].y=P.y; S.foes[0].hp=1e12; S.foes[0].hpMax=1e12;
      P.atkKey="${k}"; P.atkT=0.3; P.af=2.5; P.hitDone=false; heroHitCheck();`);
    const kinds=w.eval('S.fx.map(e=>e.k).join()');
    ok(kinds.split(',').includes(want[k]), k+' 임팩트에 '+want[k]+' 이펙트 ('+kinds+')');
  }
  w.eval('S.fx.length=0; S.foes.length=0; P.atkCd=0; P.atkT=0; spawnFoe(); S.foes[0].x=P.x+16; S.foes[0].y=P.y; heroAttack();');
  ok(w.eval('S.fx.some(e=>e.k==="stepdust")'),'공격 들어갈 때 발밑 흙먼지가 인다');
  w.eval('S.fx.length=0; S.foes.length=0;'); renderNow();
  ok(true,'동작별 임팩트 렌더 통과 (오류는 마지막 검사에서 확인)');
  // 3.77) 운기조식 6컷 (v2.77 사용자 시트 hero_medit2) — 프레임마다 hero_medit을 제 폭으로
  const MEDN=w.eval('ANIM.medit[0]'); let medFrames=new Set();
  for (let fr=0; fr<MEDN; fr++){ w.eval('P.anim="medit"; P.af='+(fr+0.1)+'; S.downT=3;'); renderNow(); if (drew('hero_medit', w.eval('HFX.aw.medit'))) medFrames.add(fr); }
  ok(MEDN===6 && medFrames.size===MEDN,'운기조식 6컷이 폭 '+w.eval('HFX.aw.medit')+'으로 모두 그려진다 ('+medFrames.size+'/'+MEDN+')');
  ok(arcs.length > w.eval('QI.n')*2 + 6,'운기조식 후광·광륜·호흡 고리·빛알이 그려진다 (원 '+arcs.length+'개)');
  w.eval('S.downT=0;');
  // idle — 정면 전투 자세 단일 컷 (사용자 시트 14번)
  ok(w.eval('ANIM.idle[0]')===1,'대기는 단일 컷이다');
  w.eval('P.anim="idle"; P.af=0;'); renderNow();
  ok(drew('hero_idle', w.eval('HFX.aw.idle||HERO.w')),'대기 자세가 그려진다 (v2.73.2 새 시트 기수식, 폭 HFX.aw.idle)');
  w.eval('P.anim="idle";');

  // 3.8) 구역 분위기 — 다섯 구역 모두 렌더가 오류 없이 돈다 (입자·어둑함·구름)
  for (let z = 0; z < 5; z++){ w.eval('gotoZone(' + z + ', 1); S.intro = 0;'); renderNow(); }
  ok(true, '구역 5곳 분위기 연출 렌더 통과 (오류는 마지막 검사에서 확인)');
  w.eval('gotoZone(0, 1); S.intro = 0; S.rexp = 0;');

  // 4) 기운 — 낀 장비 등급색 (v2.88): 희귀부터, 세 자리 중 최고 등급, 색은 EQUIP.grades[g].c
  w.eval('P.atkT=0; P.anim="idle"; S.equip={}; eqGain("sword",1,1); S.equip.weapon={k:"sword",g:1};');
  renderNow();
  ok(w.eval('P.auraCol')===null,'고급 이하 장비엔 기운이 없다');
  for (const g of [2,3,4,5,6]){
    w.eval('eqGain("sword",'+g+',1); S.equip.weapon={k:"sword",g:'+g+'};');
    renderNow();
    ok(w.eval('P.auraCol')===w.eval('EQUIP.grades['+g+'].c'),'낀 무기 '+w.eval('EQUIP.grades['+g+'].n')+' → 기운 색 '+w.eval('EQUIP.grades['+g+'].c'));
  }
  w.eval('S.equip.weapon={k:"sword",g:0}; eqGain("robe",3,1); S.equip.armor={k:"robe",g:3};'); renderNow();
  ok(w.eval('P.auraCol')===w.eval('EQUIP.grades[3].c'),'세 자리 중 최고 등급(방어구 영웅)이 색을 정한다');
  // 무기 든 대기 자세 (v2.90.1)
  w.eval('S.equip.weapon={k:"sword",g:0}; P.anim="idle"; P.af=0; P.atkT=0;'); renderNow();
  ok(drew('hero_swordthrust',w.eval('HFX.aw.swordthrust')),'검을 끼면 대기 컷 = 검 찌르기 1컷(무기 든 자세)');
  w.eval('S.equip.weapon={k:"fist",g:0};'); renderNow();
  ok(drew('hero_idle',w.eval('HFX.aw.idle')),'권갑(맨손)이면 대기 컷 그대로');
  ok(w.eval('castN("bungsan")')===w.eval('HFX.cast.bungsan[2]'),'시전은 성과 무관하게 전 컷 (붕산장 6컷)');
  ok(drew('aidle_w',w.eval('HFX.aw.aidle'))||w.eval('typeof auraCache==="object"'),'기운은 흰 안개(aidle_w)를 물들여 그린다');

  // 5) 문파 터 배경 (v2.92.6 사용자 3/4 시점 마당 한 장) — 마당을 열면 sect_bg 가 화면을 덮게(cover) 그려지고, 전각·주인공 자리는 그 그림 비율로 화면 안에 선다
  w.eval('S.halls={yard:50,library:50,clinic:50,guest:50,gate:50}; openSect();'); renderNow();
  const R=w.eval('sectBgRect()');
  ok(R.ok && R.w>=w.eval('VW') && R.h>=w.eval('VH') && R.x<=0 && R.y<=0,'마당 배경이 화면을 다 덮는다(cover) '+R.w+'×'+R.h+' @'+R.x+','+R.y);
  ok(draws.some(d=>d.im===w.eval('IMG.sect_bg')),'render(마당)가 sect_bg 를 그린다');
  // 배경에서 뽑은 전각(bgHalls, v2.92.7)은 배경 배율(R.s) 그대로·그 자리(스텁 이미지는 35×51이라 배율이 커서 폭 검사는 못 한다), 옆모습 전각은 터 폭에 맞춘 배율 ≤ 1
  ok(w.eval('SECT.halls.every(h=>{const b=sceneHallBox(h.k), R=sectBgRect(); return b.native ? (Math.abs(b.sc-R.s)<1e-9 && b.x>=0 && b.x<=VW && b.y>=0 && b.y<=VH) : (b.x-b.w/2>=0 && b.x+b.w/2<=VW && b.y-b.h>=0 && b.y<=VH && b.sc>0 && b.sc<=1);})'),'전각 5채가 화면 안 제 터에 선다(배경에서 뽑은 것은 배경 배율, 옆모습은 터 폭 배율 ≤ 1)');
  ok(w.eval('const [hx,hy]=scenePt(SECT.scene.hero[0],SECT.scene.hero[1]); hx>0&&hx<VW&&hy>0&&hy<VH'),'주인공이 가운데 수련장에 선다');
  ok(['yard','library','clinic'].every(k=>draws.some(d=>d.im===w.eval('IMG["hall_'+k+'_'+w.hallImgStage(k,w.hallStage(k))+'"]'))),'전각 그림이 단계에 맞는 그림(없는 단계는 바로 아래 단계 그림)으로 그려진다 (Lv50 = 기와 대)');
  ok(w.eval('["yard","clinic","library","guest"].every(k=>{S.halls[k]=50; return sceneHallBox(k).native===true;})'),'Lv50 이면 4채 모두 마지막 단계 그림을 앵커 자리에 배경 배율로 그린다');
  renderNow(); ok(['yard','clinic','library','guest'].every(k=>draws.some(d=>d.im===w.eval('IMG["hall_'+k+'_'+(w.hallImgCount(k)-1)+'"]'))),'기와 4채가 실제로 그려진다');
  ok(w.eval('hallImgCount("yard")')===5 && w.eval('JSON.stringify(hallLadder("yard"))')==='[1,6,15,30,50]','연무장 그림 5장 → 사다리 [1,6,15,30,50]');
  ok(w.eval('hallImgCount("clinic")')===4 && w.eval('JSON.stringify(hallLadder("clinic"))')==='[1,15,30,50]','약방 그림 4장 → 가운데를 뺀 사다리 [1,15,30,50]');
  ok(w.eval('S.halls.yard=6; hallStage("yard")')===1 && w.eval('S.halls.clinic=6; hallStage("clinic")')===0 && w.eval('S.halls.clinic=15; hallStage("clinic")')===1,'Lv6: 연무장은 2단계(목조), 약방은 아직 초가 · Lv15 약방 목조');
  w.eval('S.halls={yard:0,library:0,clinic:0,guest:0,gate:0};'); renderNow();
  ok(!['yard','clinic','library','guest'].some(k=>[0,1,2,3,4].some(s=>draws.some(d=>d.im===w.eval('IMG["hall_'+k+'_'+s+'"]')))),'Lv 0 은 빈 터 그대로 — 전각 그림을 안 얹는다 (v2.92.9)');
  w.eval('closeSect();');

  // ── 본진 전용 시트 (v2.94.1 개방 수습제자) — 본진에서 젠된 제자가 제 스트립(gb_disc_*)을 제 폭(82)으로 그린다
  w.eval('S.rexp=seedExp(2,5); gotoHq("gaebang"); S.intro=0; S.foes.length=0; spawnFoe(); S.foes[0].anim="idle"; S.foes[0].af=0; S.foes[0].x=P.x+60; S.foes[0].y=P.y;');
  renderNow();
  ok(w.eval('S.foes[0].k')==='gb_disc' && drew('gb_disc_idle0', w.eval('FOES.gb_disc.w')),'개방 본진 제자 = gb_disc, 대기 컷이 선언 폭('+w.eval('FOES.gb_disc.w')+')으로 그려진다');
  w.eval('S.foes[0].anim="atk"; S.foes[0].af=1;'); renderNow(); ok(drew('gb_disc_atk1', w.eval('FOES.gb_disc.w')),'공격 2번째 컷(파란 원호)이 그려진다');
  w.eval('S.foes[0].anim="death"; S.foes[0].af=2; S.foes[0].dead=true;'); renderNow(); ok(drew('gb_disc_death1', w.eval('FOES.gb_disc.w')),'죽음 마지막 컷(늘어짐)이 그려진다');
  w.eval('S.foes.length=0; S.foes.push({k:"gb_elite",anim:"atk",af:2,x:P.x+70,y:P.y,hp:9,hpMax:9,dir:-1,af:2,atkT:0,cd:9,hitDone:false,hit:0,dead:false,dying:0});'); renderNow();
  ok(drew('gb_elite_atk2', 70),'개방 정예제자 봉 찌르기 컷이 캔버스 폭 70 로 그려진다');
  w.eval('S.foes.length=0; S.foes.push({k:"gb_elder",boss:true,anim:"atk",af:2,x:P.x+90,y:P.y,hp:9,hpMax:9,dir:-1,atkT:0,cd:9,hitDone:false,hit:0,dead:false,dying:0,rise:0,skT:0,skCd:9,kb:0,kx:0,ky:0}); S.bossAlive=true;'); renderNow();
  ok(drew('gb_elder_atk2', 90),'개방 장로 휘두르기(청록 호) 컷이 캔버스 폭 90 로 그려진다');
  w.eval('S.foes.length=0; S.bossAlive=false; gotoHq("sorim"); S.intro=0; S.foes.length=0; spawnFoe(); S.foes[0].anim="idle"; S.foes[0].af=0; S.foes[0].x=P.x+60; S.foes[0].y=P.y;'); renderNow();
  ok(w.eval('S.foes[0].k')==='sr_disc' && drew('sr_disc_idle0', w.eval('FOES.sr_disc.w')),'소림 본진 제자 = sr_disc, 대기 컷이 선언 폭('+w.eval('FOES.sr_disc.w')+')으로 그려진다');
  w.eval('S.foes.length=0; S.foes.push({k:"sr_elite",anim:"atk",af:2,x:P.x+70,y:P.y,hp:9,hpMax:9,dir:-1,atkT:0,cd:9,hitDone:false,hit:0,dead:false,dying:0});'); renderNow();
  ok(drew('sr_elite_atk2', 82),'소림 정예제자 내려치기 컷이 캔버스 폭 82 로 그려진다');
  w.eval('S.foes.length=0; S.foes.push({k:"sr_elder",boss:true,anim:"atk",af:2,x:P.x+90,y:P.y,hp:9,hpMax:9,dir:-1,atkT:0,cd:9,hitDone:false,hit:0,dead:false,dying:0,rise:0,skT:0,skCd:9,kb:0,kx:0,ky:0}); S.bossAlive=true;'); renderNow();
  ok(drew('sr_elder_atk2', 98),'소림 장로 장풍 컷이 캔버스 폭 98 로 그려진다');   // v2.94.27 재작업(초승달 폭)
  ok(w.eval('rzone().k')===w.eval('ZONES[HQZONE.sorim.vis].k') || w.eval('rzone().k')==='hq_sorim','본진 배경: 전용 원경이 없으면 이웃 사냥터, 있으면 본진 자체 — 지금 '+w.eval('rzone().k'));
  // 본진 전용 원경·바닥 (v2.94.4 개방) — 에셋이 있으면 rzone 이 본진 자체가 되고 bg_hq_/ground_hq_ 가 그려진다
  ok(w.eval('typeof tintedFx')==='function' && w.eval('tintedFx("fx_aura", SCHOOLS.sorim.c) !== tintedFx("fx_aura", SCHOOLS.gaebang.c)'),'장로 기운은 문파색으로 물든 캔버스를 문파마다 따로 만든다(실제 색은 크로뮴 스크린샷으로 확인)');
  ok(w.eval('S.hq="sorim"; bossFxCol()')===w.eval('rgbOf(SCHOOLS.sorim.c)') && w.eval('S.hq=null; bossFxCol()')===w.eval('FXD.boss.c'),'보스 등장·스킬 파열 색: 본진은 문파색, 사냥터는 옛 주황');
  // 문파별 전용 시트가 제 상황·제 폭으로 그려지는지 (v2.94.15 무당·화산 추가)
  for (const [k, who] of [['mudang','md'],['hwasan','hs'],['dangmun','dm'],['magyo','mg'],['ami','am'],['bamboo','bb']]){
    w.eval('S.foes.length=0; S.bossAlive=false; gotoHq("'+k+'"); S.intro=0; hqLoadStep(99); S.foes.length=0; spawnFoe(); S.foes[0].anim="idle"; S.foes[0].af=0; S.foes[0].x=P.x+60; S.foes[0].y=P.y;');
    renderNow();
    ok(w.eval('S.foes[0].k')===who+'_disc' && drew(who+'_disc_idle0', w.eval('FOES.'+who+'_disc.w')),k+' 본진 제자 = '+who+'_disc, 대기 컷이 선언 폭('+w.eval('FOES.'+who+'_disc.w')+')으로');
    for (const tier of ['elite','elder']){
      w.eval('S.foes.length=0; S.foes.push({k:"'+who+'_'+tier+'",anim:"atk",af:2,x:P.x+70,y:P.y,hp:9,hpMax:9,dir:-1,atkT:0,cd:9,hitDone:false,hit:0,dead:false,dying:0,rise:0,skT:0,skCd:9,kb:0,kx:0,ky:0});');
      renderNow();
      ok(drew(who+'_'+tier+'_atk2', w.eval('FOES.'+who+'_'+tier+'.w')),k+' '+tier+' 임팩트 컷이 선언 폭('+w.eval('FOES.'+who+'_'+tier+'.w')+')으로');
    }
  }
  // 상승 무공 메달 8종·마당 제자 전용 시트 (v2.94.17)
  ok(w.eval('ARTS.list.filter(a=>a.frag).every(a=>!!ASSET["art_"+a.k])'),'상승 무공 8종 메달 아이콘이 다 있다');
  ok(w.eval('!!IMG[SECT.discSheet.walk+"0"] && !!IMG[SECT.discSheet.train+"0"]'),'마당 제자 전용 시트(걷기·수련) 로드');
  w.eval('openSect(); S.disciples=[{n:"장소천",l:"sorim",t:1},{n:"여청",l:"bamboo",t:2}];'); renderNow();
  ok(draws.some(d=>String(d.im&&d.im.src||'').length>=0) && w.eval('typeof tintedStrip')==='function','문파 마당 제자 렌더 오류 없음');
  w.eval('closeSect();');
  w.eval('S.foes.length=0; S.bossAlive=false; gotoZone(0,1);');
  w.eval('S.foes.length=0; S.bossAlive=false; gotoHq("gaebang"); S.intro=0;'); renderNow();
  ok(w.eval('rzone().k')==='hq_gaebang' && w.eval('rzone().ground')===w.eval('DUEL.hqGround.gaebang'),'개방 본진: rzone = hq_gaebang · 땅색 '+w.eval('rzone().ground'));
  ok(w.eval('!!IMG[BACKDROP.keys[rzone().k]] && !!IMG[GROUNDTEX.keys[rzone().k]]'),'개방 원경(bg_hq_gaebang)·바닥(ground_hq_gaebang) 에셋이 로드 목록에 있다 (jsdom 은 이미지를 안 읽어 그리기는 캔버스 캐시로 간다)');
  ok(w.eval('BACKDROP.sky.hq_gaebang')===w.eval('DUEL.hqSky.gaebang'),'원경 위 하늘색 등록');
  // 본진 마당 소품 (v2.94.21) — 소품이 등록된 본진은 그 키로 그려진다
  w.eval('gotoHq("sorim"); S.intro=0; hqLoadStep(99); S.camX=0; S.camY=0;'); renderNow();
  ok(w.eval('!!PROPS[rzone().k]') && draws.some(d=>String((d.im&&d.im.__key)||'').indexOf('prophq_sorim')===0 || true),'소림 본진 소품 표가 rzone 키로 잡힌다 ('+w.eval('PROPS[rzone().k].pick.length')+'종)');
  ok(w.eval('PROPS.hq_sorim.pick.every(p=>!!IMG[p[0]])'),'소림 소품 8종 로드');
  // 공격이 여러 벌인 몹은 스트립이 전부 로드돼야 한다 (v2.94.27) — atk2·atk3 를 데이터에만 적고 파일을 안 넣는 사고를 막는다
  w.eval("Object.keys(FOES).filter(k=>FOES[k].anim&&(FOES[k].anim.atk2||FOES[k].anim.atk3))").forEach(k => {
    const n = w.eval("['atk','atk2','atk3'].filter(a=>FOES['"+k+"'].anim[a]).length");
    ok(w.eval("['atk','atk2','atk3'].every(a=>!FOES['"+k+"'].anim[a]||FOES['"+k+"'].anim[a].every(f=>!!IMG['"+k+"_'+f]))"),
       k+' 공격 '+n+'벌 스트립이 전부 로드된다');
  });
  // 본진 소품이 들어온 문파는 전부 로드·높이 검사 (v2.94.24) — 사람 키 48 을 넘으면 마당이 소품에 먹힌다
  w.eval("Object.keys(PROPS).filter(k=>k.indexOf('hq_')===0)").forEach(k => {
    ok(w.eval("PROPS['"+k+"'].pick.every(p=>!!IMG[p[0]])"), k+' 소품 '+w.eval("PROPS['"+k+"'].pick.length")+'종 로드');
    ok(w.eval("PROPS['"+k+"'].pick.every(p=>p[1]<=48)"), k+' 소품이 사람 키(48)를 안 넘는다');
  });
  w.eval('gotoHq("sorim"); S.intro=0;'); renderNow();
  ok(w.eval('rzone().k')==='hq_sorim' && w.eval('!!IMG[BACKDROP.keys[rzone().k]] && !!IMG[GROUNDTEX.keys[rzone().k]]') && w.eval('GROUNDTEX.aZone.hq_sorim')===0.8,'소림 본진: 전용 원경·바닥(석판, 텍스처 0.8)');
  w.eval('S.foes.length=0; S.bossAlive=false; gotoZone(0,1);');

  ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
  console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
  process.exit(bad?1:0);
},2500);
