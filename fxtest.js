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
  ok(w.eval('ATKMOVES.length')===4 && w.eval('ATKMOVES[0].key')==='punch'
     && w.eval('ATKMOVES[1].key')==='kickside' && w.eval('ATKMOVES[2].key')==='kickround' && w.eval('ATKMOVES[3].key')==='kickhigh',
     '기본공격 무브셋 = 양주먹·옆차기·돌려차기·뛰어차기 4종');
  w.eval('S.equip.weapon=null; S.rexp=0;');                // 맨손(시작 장비 검을 벗김) · 삼류 1성 — 발차기 미해금
  ok(w.eval('atkPool().length')===1 && w.eval('atkPool()[0].key')==='punch',
     '낮은 성급엔 양주먹만');
  w.eval('S.rexp=1e12;');                                  // 높은 경지 — 전 발차기 해금
  ok(w.eval('atkPool().some(m=>m.key==="kickside")') && w.eval('atkPool().some(m=>m.key==="kickhigh")'),
     '성급이 오르면 각도별 발차기가 섞인다 ('+w.eval('atkPool().length')+'종)');
  // 양주먹 = 권기 정권 katka/katkb 교대
  w.eval('S.fx.length=0; P.castT=0; P.atkT=0.3; P.anim="atk"; P.af=1; P.atkKey="punch"; P.atkAlt=0;');
  renderNow();
  ok(drew('hero_punch',w.eval('HFX.aw.punch')),'양주먹 = 오른손 정권 판(punch, v2.71.2)');
  w.eval('P.atkAlt=1;'); renderNow();
  ok(drew('hero_punchb',w.eval('HFX.aw.punch')),'왼손 판(punchb)으로 교대된다');
  w.eval('P.atkKey="kickside";'); renderNow();
  ok(drew('hero_kickside',w.eval('HFX.aw.kickside')),'옆차기 스트립이 제 폭(54)으로 그려진다');
  w.eval('P.atkKey="kickround";'); renderNow();
  ok(drew('hero_kickround',w.eval('HFX.aw.kickround')),'돌려차기 스트립이 제 폭(56)으로 그려진다');
  w.eval('P.atkKey="kickhigh";'); renderNow();
  ok(drew('hero_kickhigh',w.eval('HFX.aw.kickhigh')),'뛰어차기 스트립이 제 폭(60)으로 그려진다');
  // 공격을 여러 번 하면 열린 동작을 돌려 쓴다
  w.eval(`S.rexp=1e12; P.atkMove=0; P.atkCd=0; P.atkT=0; S.foes.length=0; spawnFoe();
    S.foes[0].x=P.x+20; S.foes[0].y=P.y; S.foes[0].hp=1e12; S.foes[0].hpMax=1e12;
    window.__keys={}; for(let i=0;i<9;i++){ P.atkCd=0; P.atkT=0; heroAttack(); window.__keys[P.atkKey]=1; }`);
  ok(w.eval('window.__keys.punch && window.__keys.kickside && window.__keys.kickround && window.__keys.kickhigh'),
     '연속 공격이 양주먹·옆차기·돌려차기·뛰어차기를 돌려 쓴다');
  // 3.5) 무기 장착 → 무기별 무브셋 (v2.72 검 · v2.72.1 부채) — 무기 자리의 종류가 기본공격 동작을 정한다
  for (const wk of Object.keys(w.eval('WEAPONMOVES'))){
    const keys=w.eval('WEAPONMOVES.'+wk+'.map(m=>m.key)');
    w.eval('S.equip.weapon={k:"'+wk+'",g:0}; S.rexp=0;');
    ok(w.eval('atkPool().length')===1 && w.eval('atkPool()[0].key')===keys[0],wk+'을 끼고 낮은 성급이면 '+keys[0]+'만');
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
  ok(w.eval('atkPool()[0].key')==='punch','무기를 벗으면 맨손(양주먹)으로 돌아온다');

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
  // 3.6) 시전 컷 수 = 숙련 성 비례
  w.eval('S.artStar.pagong=1;');
  const n1=w.eval('castN("pagong")');
  w.eval('S.artStar.pagong=4;');
  const n4=w.eval('castN("pagong")');
  ok(n1<n4 && n4===w.eval('HFX.cast.pagong[2]'),'시전 컷: 1성 '+n1+' < 4성 '+n4+' (성이 오르면 신컷)');
  ok(w.eval('castFrame("pagong",0)')===0 && w.eval('S.artStar.pagong=1, castFrame("pagong",'+(n1-1)+')')===w.eval('HFX.cast.pagong[2]')-1,
    '성긴 판도 처음·끝 컷은 지킨다');
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
  // idle — 정면 전투 자세 단일 컷 (사용자 시트 14번)
  ok(w.eval('ANIM.idle[0]')===1,'대기는 단일 컷이다');
  w.eval('P.anim="idle"; P.af=0;'); renderNow();
  ok(drew('hero_idle', w.eval('HFX.aw.idle||HERO.w')),'대기 자세가 그려진다 (v2.73.2 새 시트 기수식, 폭 HFX.aw.idle)');
  w.eval('P.anim="idle";');

  // 3.8) 구역 분위기 — 다섯 구역 모두 렌더가 오류 없이 돈다 (입자·어둑함·구름)
  for (let z = 0; z < 5; z++){ w.eval('gotoZone(' + z + ', 1); S.intro = 0;'); renderNow(); }
  ok(true, '구역 5곳 분위기 연출 렌더 통과 (오류는 마지막 검사에서 확인)');
  w.eval('gotoZone(0, 1); S.intro = 0; S.rexp = 0;');

  // 4) 경지 기운 — 문턱·색
  w.eval('P.atkT=0; P.anim="idle";');
  renderNow();
  ok(!drew('aidle_w')&&!drew('aidle_p'),'일류 이하엔 기운이 없다');
  const tiers=w.eval('JSON.stringify(HFX.auras)') && JSON.parse(w.eval('JSON.stringify(HFX.auras)'));
  for (const [need,t] of tiers.slice().reverse()){
    w.eval('S.rexp=0; while(realmLv()<'+need+') S.rexp=(S.rexp||25)*1.31;');
    renderNow();
    ok(drew('aidle_'+t,w.eval('HFX.aw.aidle')),'경지 '+need+' → 기운 '+t+' ('+w.eval('realmInfo().name')+')');
  }

  ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
  console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
  process.exit(bad?1:0);
},2500);
