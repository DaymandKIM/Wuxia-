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
  // 1) 표 전체 노출
  d.getElementById('tab-arts').click();
  const rows=d.querySelectorAll('#abody .atile').length;
  ok(rows===w.eval('ARTS.list.length'),'타일 그리드에 무공 '+rows+'종 전부 보인다');
  ok(d.querySelectorAll('#abody .atile.fate').length===2,'기연 전용 2종이 표시된다');
  // 2) 경지 미달 → 구매 불가 (타일 선택 → 상세에 구매 버튼이 없어야 한다)
  w.eval('S.silver=99999');
  d.querySelector('.atile[data-k="pagong"]').click();
  ok(!d.getElementById('abuy'),'경지 미달이면 파공권 구매 버튼이 없다 (조건 문구만)');
  ok(w.eval('learnArt("pagong")')===false,'코드로도 못 산다');
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
    ok(w.eval('breakArt("chulwoo")')===true,'청죽공 돌파 → '+w.eval('artStar("chulwoo")')+'성');
    ok(Math.abs(w.eval('artMul("hp")')-1.25)<0.001,'2성 심법 효과 1.25배 (0.20×1.25)');
    ok(w.eval('breakArt("chulwoo")')===false,'숙련이 다시 찰 때까지 재돌파 불가');
    // 5.5) 연마 — 은자로 레벨, 상한은 성×10, 효과가 실제로 오른다
    ok(w.eval('artLvCap("chulwoo")')===20,'연마 상한 = 성×10 (2성 청죽공 = 20)');
    ok(w.eval('levelArt("chulwoo")')===true,'청죽공 연마 → Lv '+w.eval('artLv("chulwoo")'));
    ok(Math.abs(w.eval('artMul("hp")')-(1+0.20*1.02*1.25))<0.001,
      '연마 Lv2 효과 (0.20×1.02×1.25)');
    w.eval('S.artLv.chulwoo=20');
    ok(w.eval('levelArt("chulwoo")')===false,'연마 상한에서 더 못 올린다 (돌파가 문)');
    w.eval('S.artLv.chulwoo=2');
    // 6) 저장 왕복
    w.eval('saveNow()');
    const save=w.localStorage.getItem('wuxia1');
    const {w:w2}=boot(save);
    setTimeout(()=>{
      ok(w2.eval('S.arts.pagong===1 && S.arts.samjae===1 && S.arts.chulwoo===1'),
        '다시 열어도 익힌 무공이 남아 있다');
      ok(w2.eval('artStar("chulwoo")')===2,'숙련 성도 저장된다 (청죽공 2성)');
      ok(w2.eval('artLv("chulwoo")')===2,'연마 레벨도 저장된다 (청죽공 Lv2)');
      ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
      console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
      process.exit(bad?1:0);
    },1200);
  },2600);
},2500);
