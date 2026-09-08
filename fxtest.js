/* 주인공 스프라이트 연출 검증 — 그림이 "실제로" 맞게 돌아가는지 본다.
   spritetest는 파일 규격만 보므로, 여기서는 구동을 본다:
   1) 초식마다 시전 동작(cast)이 올바른 스트립·폭으로 그려지나
   2) 파공권 권기 탄·암향지 지풍 빔이 날아가나
   3) 절정부터 정권이 권기 스트립으로 바뀌나 (미만이면 맨손)
   4) 경지 기운이 문턱대로 켜지고 색이 바뀌나
   스프라이트를 새로 반영하면 반드시 여기에 검사를 추가한다 (사용자 확정).
*/
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const draws=[];                                  // render가 그린 것들 {im, sw}
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(k==='drawImage') return (im,sx,sy,sw)=>{ draws.push({im, sw}); };
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
const renderNow=()=>{ draws.length=0; w.eval('render()'); };

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
  // 활인기공 — 위태로울 때만
  w.eval('P.castT=0; P.anim="idle"; P.hp=P.hpMax*0.2;');
  ok(w.eval('castArt(artDef("hwalin"))')===true,'활인기공 시전(체력 20%)');
  ok(w.eval('P.hp')>w.eval('P.hpMax')*0.2,'체력이 실제로 회복됐다');
  renderNow();
  ok(drew('hero_casth',34),'활인기공 시전 스트립이 그려진다');

  // 2) 탄 — 파공권 권기 주먹·암향지 지풍 빔
  ok(w.eval('S.fx.some(e=>e.k==="pashot")'),'파공권 권기 탄이 날아간다');
  ok(w.eval('S.fx.some(e=>e.k==="bshot")'),'암향지 지풍 빔이 날아간다');
  renderNow();
  ok(drew('pashot'),'권기 탄 그림이 그려진다');
  ok(drew('bshot'),'지풍 빔 그림이 그려진다');

  // 3) 권기 정권 — 절정 이상이면 katk, 미만이면 맨손 atk
  w.eval('S.fx.length=0; P.castT=0; P.atkT=0.3; P.anim="atk"; P.af=1;');
  renderNow();
  ok(drew('hero_katk',w.eval('HFX.aw.katk')),'절정 이상 정권 = 권기 스트립');
  w.eval('S.rexp=0;');                                     // 삼류로
  renderNow();
  ok(drew('hero_atk',w.eval('HERO.w')),'절정 미만 정권 = 맨손 스트립');

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
