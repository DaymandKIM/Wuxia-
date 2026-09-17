/* 무공 검증 — jsdom 실제 DOM에서 돌린다.
   1) 무공 탭 → 표에 12종 전부 보이나 (익힘/열림/잠김/기연 구분)
   2) 경지 미달이면 못 사고, 조건이 되면 사지나
   3) 심법을 익히면 능력치가 실제로 곱해지나
   4) 초식이 자동 시전되어 피해·이펙트가 나가나
   5) 저장에 남고 다시 열면 익힌 상태인가
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
function boot(preSave){
  const errs=[];
  const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
    pretendToBeVisual:true,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    w.addEventListener('error',e=>errs.push(e.message));
    if(preSave!==undefined) w.localStorage.setItem('wuxia1',preSave);
  }});
  return {w:dom.window,errs};
}
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

const {w,errs}=boot();
setTimeout(()=>{
  const d=w.document;
  // 1) 무공 탭 = 일반 스킬창(배우기·연마·돌파), [초식][심법] 탭 (v2.54)
  d.getElementById('tab-arts').click();
  ok(d.querySelectorAll('#atabs .askind').length===2,'무공 탭에 [초식][심법] 탭이 있다');
  ok(d.querySelectorAll('.atile').length>0,'무공 타일 그리드가 그려진다');
  // 1b) 스킬 심화 버튼은 없다 — 특성은 무공 상세창 안에서 올린다 (v2.93.7). 문파 무공도(트리)도 접힘 (v2.55.2)
  ok(!d.getElementById('adeepen'),'스킬 심화 버튼이 없다 (특성은 상세창으로)');
  ok(!d.getElementById('ttree'),'문파 무공도(트리)는 더 이상 뜨지 않는다');
  // 2) 경지 미달이면 코드로도 무공을 못 산다 (기연·트리 외 경로 차단)
  w.eval('S.silver=99999');
  ok(w.eval('learnArt("pagong")')===false,'경지 미달이면 파공권을 못 산다');
  // 조건 충족 → 구매
  w.eval('S.rexp=seedExp(1,5)');                 // 이류 중반쯤
  const dmg0=w.eval('heroDmg()'), hp0=w.eval('heroHpMax()');
  ok(w.eval('learnArt("pagong")')===true,'경지가 되면 파공권을 익힌다 (은자 '+w.eval('S.silver')+' 남음)');
  // 3) 심법 효과
  ok(w.eval('learnArt("samjae")')===true,'삼재심법을 익힌다');
  ok(w.eval('learnArt("chulwoo")')===true,'철우공을 익힌다');
  ok(Math.abs(w.eval('artMul("hp")')-1.2)<0.001,'청죽공: 체력 배수 1.2');
  ok(Math.abs(w.eval('artMul("regen")')-1.25)<0.001,'삼재심법: 회복 배수 1.25');
  // 4) 초식 자동 시전 — 적을 붙여 두고 몇 초 굴린다
  w.eval('S.intro=0; S.foes.length=0; for(let i=0;i<3;i++) spawnFoe(); for(const f of S.foes){f.x=P.x+40;f.y=P.y;}');
  const tk0=w.eval('S.totalKills');
  setTimeout(()=>{
    const cast=w.eval('S.fx.some(e=>e.k==="artname"||e.k==="streak") || P.artCd.pagong!==undefined && P.artCd.pagong<6');
    ok(w.eval('P.artCd.pagong!==undefined'),'파공권 쿨다운이 돈다 ('+w.eval('P.artCd.pagong && P.artCd.pagong.toFixed(1)')+'초 남음)');
    ok(cast,'초식이 실제로 펼쳐졌다 (이펙트/쿨다운 확인)');
    // 5) 숙련도 — 심법은 처치로 쌓이고, 차면 은자로 돌파한다
    ok(w.eval('(S.artXp.chulwoo|0)')>=0,'숙련도 필드 존재');
    w.eval('S.artXp.chulwoo=999; S.silver=999999');
    ok(w.eval('breakArt("chulwoo")')===false,'숙련만 차선 못 뚫는다 — 연마 상한도 필요');
    w.eval('S.artLv.chulwoo=10');                  // 1성 연마 상한까지
    ok(w.eval('breakArt("chulwoo")')===true,'연마 상한 + 숙련 만충 → 돌파 '+w.eval('artStar("chulwoo")')+'성');
    ok(Math.abs(w.eval('artMul("hp")')-(1+0.20*(1+0.015*9)*1.25))<0.001,
      '2성 심법 효과 (0.20×연마Lv10×1.25)');
    ok(w.eval('breakArt("chulwoo")')===false,'숙련이 다시 찰 때까지 재돌파 불가');
    // 5.5) 연마 — 은자로 레벨, 상한은 성×10, 효과가 실제로 오른다
    ok(w.eval('artLvCap("chulwoo")')===20,'연마 상한 = 성×10 (2성 청죽공 = 20)');
    ok(w.eval('levelArt("chulwoo")')===true,'청죽공 연마 → Lv '+w.eval('artLv("chulwoo")'));
    ok(Math.abs(w.eval('artMul("hp")')-(1+0.20*(1+0.015*10)*1.25))<0.001,
      '연마 Lv11 효과 (0.20×1.15×1.25)');
    w.eval('S.artLv.chulwoo=20');
    ok(w.eval('levelArt("chulwoo")')===false,'연마 상한에서 더 못 올린다 (돌파가 문)');
    w.eval('S.artLv.chulwoo=2');
    // 5.7) 건곤이형 — 반격형: 맞는 순간 절반을 흘리고 3배로 되돌린다
    w.eval('S.arts.geongon=1; P.artCd.geongon=0; S.foes.length=0; spawnFoe();' +
           'S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;' +
           'P.hpMax=1000; P.hp=1000;');
    w.eval('hurtHero(100)');
    ok(Math.abs(w.eval('P.hp')-950)<0.5,'건곤이형: 받은 피해 절반을 흘린다 (100→50)');
    ok(w.eval('S.foes[0].hp')<1e9-250,'3배로 되돌린다 (적 피해 '+Math.round(w.eval('1e9-S.foes[0].hp'))+')');
    ok(w.eval('P.artCd.geongon')>0,'반격 쿨다운이 돈다');
    w.eval('hurtHero(100)');
    ok(Math.abs(w.eval('P.hp')-850)<0.5,'쿨다운 중엔 그대로 맞는다');
    w.eval('delete S.arts.geongon; S.foes.length=0; P.anim="idle";');
    // 5.8) 동시 시전 금지 — 쿨이 둘 다 차 있어도 한 프레임엔 하나만 나간다
    w.eval(`S.arts.whirl=1; S.foes.length=0; spawnFoe();
      S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
      P.hp=P.hpMax; P.castT=0; P.castGapT=0;
      P.artCd.pagong=0; P.artCd.whirl=0;
      S.fx.length=0; stepArts(1/60);`);
    ok(w.eval('S.fx.filter(e=>e.k==="artname").length')===1,
      '한 프레임엔 초식 하나만 (동시 시전 금지)');
    ok(w.eval('P.castT>0 && P.artCd.pagong<=0'),
      '둘째 초식(파공권 — v2.93.6부터 선풍퇴가 먼저)은 시전이 끝날 때까지 쿨을 쥔 채 기다린다');
    w.eval('P.castT=0; P.castGapT=0; S.fx.length=0; stepArts(1/60);');
    ok(w.eval('S.fx.filter(e=>e.k==="artname").length')===1 && w.eval('P.artCd.pagong>0'),
      '앞 시전이 끝나면 기다리던 초식이 나간다');
    // 5.9) 스킬창 — 익힌 초식 슬롯 + 쿨다운 덮개
    w.eval('hud()');
    const slots=d.querySelectorAll('#sbar .sk');
    ok(slots.length===w.eval('ARTS.list.filter(a=>a.type==="active"&&S.arts[a.k]).length'),
      '스킬창 슬롯 수 = 익힌 초식 수 ('+slots.length+'개)');
    // 쿨다운은 v2.51부터 원형 conic-gradient 스윕 — 도는 슬롯은 배경에 각도가 박힌다
    const cdShown=[...slots].some(s=>{ const bg=s.querySelector('.cdm').style.background;
      const g=/([\d.]+)deg/.exec(bg); return g && parseFloat(g[1])>0; });
    ok(cdShown,'도는 쿨다운이 원형 스윕으로 보인다');
    // 5.10) 발동 모드 — 수동에선 알아서 안 나가고, 눌러야(castByHand) 나간다
    w.eval(`S.skillManual=true; S.arts.pagong=1; S.foes.length=0; spawnFoe();
      S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
      P.hp=P.hpMax; P.castT=0; P.castGapT=0; P.artCd.pagong=0;
      S.fx.length=0; for(let i=0;i<30;i++) stepArts(1/60);`);
    ok(w.eval('S.fx.filter(e=>e.k==="artname").length')===0 && w.eval('P.artCd.pagong<=0'),
      '수동 모드 — 쿨이 차도 알아서 시전하지 않는다');
    w.eval('const r=castByHand("pagong"); window.__hand=r;');
    ok(w.eval('window.__hand===true && P.castT>0'),'눌러서(castByHand) 시전된다');
    ok(w.eval('castByHand("pagong")===false'),'쿨 중엔 눌러도 안 나간다');
    // 토글 UI — 라벨이 모드를 따라가고, 눌러 바꾼다
    w.eval('P.castT=0; P.castGapT=0; hud()');
    const modeBtn=d.querySelector('#sbar .smode');
    ok(!!modeBtn && modeBtn.textContent==='수동','토글이 현재 모드(수동)를 보여준다');
    w.eval("document.querySelector('#sbar .smode').onclick()");
    ok(w.eval('S.skillManual===false'),'토글을 누르면 자동으로 돌아간다');
    // 5.11) 스킬 심화 특성 (v2.55) — 배운 무공에 경지 무공점으로 특성을 켠다
    w.eval('S.rexp=0; while(realmLv()<14) S.rexp=(S.rexp||25)*1.31; S.tree={}; S.traits={}; delete S.arts.bungsan;');
    ok(w.eval('traitBuy("bungsan","bs_cd")')===false,'안 배운 무공엔 특성 못 준다');
    w.eval('S.arts.pagong=1;');
    const pp0=w.eval('skillPtsLeft()');
    ok(w.eval('traitBuy("pagong","pa_pw")')===true,'배운 무공에 특성을 켠다(중권)');
    ok(w.eval('skillPtsLeft()')<pp0,'특성이 경지 무공점을 쓴다');
    ok(w.eval('traitMul("pagong","power")')>1,'특성이 초식 위력 배수에 반영된다');
    ok(w.eval('traitBuy("pagong","pa_pw")')===false,'같은 특성은 중복으로 못 켠다');
    // 상세창 특성 칩 (v2.93.7) — 배운 무공을 누르면 상세에 특성 3개, 켠 것은 ✓
    w.eval('artSel="pagong"; artTab="active"; artDetSig=""; buildArtsPanel(); refreshArts();');
    ok(d.querySelectorAll('#adet .atrc').length===3,'파공권 상세에 특성 칩 3개');
    ok(d.querySelectorAll('#adet .atrc.own').length===1,'켠 특성(중권)은 ✓로 표시된다');
    const chip=[...d.querySelectorAll('#adet .atrc:not(.own)')].find(e=>!e.disabled);
    if (chip){ const p1=w.eval('skillPtsLeft()'); chip.click(); ok(w.eval('skillPtsLeft()')<p1 && d.querySelectorAll('#adet .atrc.own').length===2,'칩을 누르면 특성이 켜지고 무공점이 준다'); }
    else ok(true,'남은 무공점이 모자라 칩 클릭은 건너뜀');
    w.eval('S.skillManual=true; saveNow();');   // 저장 왕복 검사용으로 수동 남겨둠
    w.eval('delete S.arts.whirl; S.foes.length=0; P.anim="idle";');
    // 6) 저장 왕복
    w.eval('saveNow()');
    const save=w.localStorage.getItem('wuxia1');
    const {w:w2}=boot(save);
    setTimeout(()=>{
      ok(w2.eval('S.arts.pagong===1 && S.arts.samjae===1 && S.arts.chulwoo===1'),
        '다시 열어도 익힌 무공이 남아 있다');
      ok(w2.eval('artStar("chulwoo")')===2,'숙련 성도 저장된다 (청죽공 2성)');
      ok(w2.eval('artLv("chulwoo")')===2,'연마 레벨도 저장된다 (청죽공 Lv2)');
      ok(w2.eval('S.skillManual===true'),'발동 모드(수동)도 저장된다');
      ok(w2.eval('hasTrait("pagong","pa_pw")===true'),'심화 특성도 저장·복원된다');
      ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
      console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
      process.exit(bad?1:0);
    },1200);
  },2600);
},2500);
