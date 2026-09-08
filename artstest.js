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
  const rows=d.querySelectorAll('#abody .zrow').length;
  ok(rows===w.eval('ARTS.list.length'),'표에 무공 '+rows+'종 전부 보인다');
  ok(d.querySelectorAll('#abody em.fate').length===2,'기연 전용 2종이 표시된다');
  // 2) 경지 미달 → 구매 불가
  const pg=d.querySelector('.trbuy[data-k="pagong"]');
  w.eval('S.silver=99999');
  ok(pg && pg.disabled,'경지 미달이면 파공권을 못 산다 (이류 1성 필요)');
  ok(w.eval('learnArt("pagong")')===false,'코드로도 못 산다');
  // 조건 충족 → 구매
  w.eval('S.rexp=seedExp(1,5)');                 // 이류 중반쯤
  const dmg0=w.eval('heroDmg()'), hp0=w.eval('heroHpMax()');
  ok(w.eval('learnArt("pagong")')===true,'경지가 되면 파공권을 익힌다 (은자 '+w.eval('S.silver')+' 남음)');
  // 3) 심법 효과
  ok(w.eval('learnArt("samjae")')===true,'삼재심법을 익힌다');
  ok(w.eval('learnArt("chulwoo")')===true,'철우공을 익힌다');
  const hpMul=w.eval('heroHpMax()')/w.eval('Math.round((HERO.hp+realmLv()*GROW.hp+statBonus("hp")))');
  ok(Math.abs(hpMul-1.2)<0.01,'철우공: 체력이 1.2배가 된다 ('+hpMul.toFixed(2)+')');
  ok(Math.abs(w.eval('artMul("regen")')-1.25)<0.001,'삼재심법: 회복 배수 1.25');
  // 4) 초식 자동 시전 — 적을 붙여 두고 몇 초 굴린다
  w.eval('S.intro=0; S.foes.length=0; for(let i=0;i<3;i++) spawnFoe(); for(const f of S.foes){f.x=P.x+40;f.y=P.y;}');
  const tk0=w.eval('S.totalKills');
  setTimeout(()=>{
    const cast=w.eval('S.fx.some(e=>e.k==="artname"||e.k==="streak") || P.artCd.pagong!==undefined && P.artCd.pagong<6');
    ok(w.eval('P.artCd.pagong!==undefined'),'파공권 쿨다운이 돈다 ('+w.eval('P.artCd.pagong && P.artCd.pagong.toFixed(1)')+'초 남음)');
    ok(cast,'초식이 실제로 펼쳐졌다 (이펙트/쿨다운 확인)');
    // 5) 저장 왕복
    w.eval('saveNow()');
    const save=w.localStorage.getItem('wuxia1');
    const {w:w2}=boot(save);
    setTimeout(()=>{
      ok(w2.eval('S.arts.pagong===1 && S.arts.samjae===1 && S.arts.chulwoo===1'),
        '다시 열어도 익힌 무공이 남아 있다');
      ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
      console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
      process.exit(bad?1:0);
    },1200);
  },2600);
},2500);
