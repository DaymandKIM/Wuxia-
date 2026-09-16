/* 문파 검증 (v2.91) — jsdom 실제 DOM.
   1) 전각: 비용 곡선·상한(명성 단계)·세우기가 은자를 쓰고 레벨을 올린다·효과가 전투 수식에 먹는다
   2) 명성: 처치·보스·업적 받기로 쌓이고 단계가 오르면 상한이 열린다 · 산문이 획득을 키운다
   3) 장경각(숙련 획득·연마 비용)·약방(쓰러짐 회복 시간)
   4) 저장·복원 · 패널(탭·카드 5·세우기 버튼·명성 띠) · 오프라인 명성 */
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth','globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  return ()=>{};
},set:()=>true});
function boot(preSave){
  const errs=[];
  const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    w.addEventListener('error',e=>errs.push(e.message));
    if(preSave!==undefined) w.localStorage.setItem('wuxia1',preSave);
  }});
  return {w:dom.window,errs};
}
let bad=0; const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };
const {w,errs}=boot();
setTimeout(()=>{
  const S=w.eval('S'), SECT=w.eval('SECT'); w.closeTitle && w.closeTitle();
  // ── 1) 전각
  ok(SECT.halls.length===5 && w.hallLv('yard')===0 && w.fameTier()===0 && w.hallCap()===SECT.fame.tiers[0].cap,'처음: 전각 5채 Lv 0 · 명성 무명 · 상한 '+w.hallCap());
  const c0=w.hallCost('yard'), c1=w.hallCost('yard',1);
  ok(c0===SECT.halls[0].cb && Math.abs(c1/c0-SECT.halls[0].cg)<0.02,'비용: Lv0 '+c0+' → Lv1 '+c1+' (×'+SECT.halls[0].cg+')');
  S.silver=0; ok(w.canBuildHall('yard')===false && w.buildHall('yard')===false,'은자 없으면 못 세운다');
  const d0=w.eval('heroDmg()'), as0=w.eval('heroAtkSpd()');
  S.silver=1e6; ok(w.buildHall('yard')===true && w.hallLv('yard')===1 && S.silver===1e6-c0,'연무장 세우기: 은자 −'+c0+', Lv 1');
  const d1=w.eval('heroDmg()'), as1=w.eval('heroAtkSpd()');
  ok(d1>d0 && d1/d0<1+SECT.halls[0].eff.atk/100+1e-9 && as1>as0,'효과가 수식에 먹는다(수련·장비와 합산): 공격력 ×'+(d1/d0).toFixed(4)+' · 공격 속도 '+as0.toFixed(3)+' → '+as1.toFixed(3));
  ok(w.sectBonus('atk')===SECT.halls[0].eff.atk && w.sectBonus('hp')===0,'sectBonus: atk '+w.sectBonus('atk')+' · hp 0');
  for(let i=0;i<20;i++) w.buildHall('yard');
  ok(w.hallLv('yard')===w.hallCap() && w.canBuildHall('yard')===false,'상한에 닿으면 더 못 올린다 (Lv '+w.hallLv('yard')+' / '+w.hallCap()+')');
  // ── 2) 명성
  const f0=S.fame; w.fameAdd(10); ok(S.fame===f0+10,'fameAdd 10 → '+S.fame);
  S.fame=SECT.fame.tiers[1].need-1; ok(w.fameTier()===0,'문턱 1 아래는 무명');
  const rose=w.fameAdd(1); ok(rose===true && w.fameTier()===1 && w.hallCap()===SECT.fame.tiers[1].cap && w.canBuildHall('yard')===true,'문턱을 넘으면 향리 → 상한 '+w.hallCap()+', 다시 올릴 수 있다');
  ok(w.document.getElementById('toast').textContent.includes('명성이 올랐다'),'단계 오름 토스트');
  const kf=w.killFame(); ok(kf>=SECT.fame.kill && Math.abs(kf-SECT.fame.kill*Math.pow(SECT.fame.killGrow,w.eval('gstage()')-1))<1e-9,'처치 명성 = kill × killGrow^(g−1) = '+kf.toFixed(2));
  // 실제 처치로 쌓이나 — 적 하나 만들어 죽인다
  S.fame=0; S.foes.length=0; w.spawnFoe(); const f=S.foes[0]; f.hp=1; w.eval('P.x=S.foes[0].x; P.y=S.foes[0].y;');
  w.hurtFoe(f,10,false); ok(S.fame>0 && Math.abs(S.fame-kf)<1e-6,'처치 → 명성 +'+S.fame.toFixed(2));
  // 산문 — 명성 획득 +%
  S.silver=1e9; for(let i=0;i<5;i++) w.buildHall('gate'); const g=w.sectBonus('fame'); S.fame=0; w.fameAdd(100);
  ok(g===SECT.halls[4].eff.fame*5 && Math.abs(S.fame-100*(1+g/100))<1e-9,'산문 Lv 5: 명성 획득 +'+g+'% → 100이 '+S.fame);
  // 업적 받기 — 명성
  S.totalKills=200; S.fame=0; w.achvClaim('kills'); ok(Math.abs(S.fame-SECT.fame.achv*(1+g/100))<1e-9,'업적 받기 → 명성 +'+S.fame.toFixed(1));
  // ── 2b) 제자 (v2.92)
  const D=SECT.disciple;
  ok(w.discipleSlots()===D.slotsByFame[w.fameTier()]+Math.floor(w.hallLv('guest')/D.guestPer),'제자 자리 = 명성 단계 '+D.slotsByFame[w.fameTier()]+' + 객당');
  const n0=S.disciples.length; ok(n0>=1,'명성이 올랐을 때 제자가 찾아왔다 ('+n0+'명: '+S.disciples.map(d=>d.n+'/'+d.l).join(', ')+')');
  const rd=w.rollDisciple('sorim'); ok(rd.l==='sorim' && rd.t>=0 && rd.t<D.talents.length && rd.n.length>=2,'rollDisciple: 계보 지정·자질 범위·이름 "'+rd.n+'"');
  S.fame=SECT.fame.tiers[3].need;   // 명문 — 자리 4
  while(w.discipleSlotsFree()>0) w.discipleAdd(w.rollDisciple('sorim'),'duel',true);
  ok(w.discipleSlotsFree()===0 && w.discipleAdd(w.rollDisciple(),'duel',true)===false,'자리가 차면 더 못 온다 ('+S.disciples.length+'명)');
  const lb=w.lineageBonus('sorim'); ok(lb>0 && lb===S.disciples.filter(d=>d.l==='sorim').reduce((a,d)=>a+D.talents[d.t].bonus,0),'소림 계보 보너스 +'+lb+'%');
  S.arts.pagong=1; S.artLv.pagong=1; S.artStar.pagong=1; const ae=w.eval('artEff("pagong")'); ok(Math.abs(ae-(1+lb/100))<1e-9,'소림 무공(파공권) artEff ×'+ae.toFixed(3));
  const yps=w.sectYieldPerSec(); ok(yps>0,'초당 수익 '+yps.toFixed(2)+' (전투 수입 '+(w.eval('killSilver()/offKillTime()')).toFixed(2)+'/s의 '+(yps/w.eval('killSilver()/offKillTime()')*100).toFixed(0)+'%)');
  const sv0=S.silver; w.eval('for(let i=0;i<300;i++) sectStep(1/30)'); ok(S.silver>sv0 && Math.abs((S.silver-sv0)-yps*10)<=yps*10*0.05+2,'10초 → 은자 +'+(S.silver-sv0)+' (≈'+Math.round(yps*10)+')');
  // ── 3) 장경각·약방
  const lvc0=w.eval('artLvCost("pagong")'); S.silver=1e9; for(let i=0;i<4;i++) w.buildHall('library');
  const lvc1=w.eval('artLvCost("pagong")'), xg=w.eval('artXpGain()');
  ok(lvc1<lvc0 && Math.abs(lvc1-Math.round(lvc0/(1+SECT.halls[1].eff.artcost*4/100)))<=1 && Math.abs(xg-(1+SECT.halls[1].eff.artxp*4/100))<1e-9,'장경각 Lv 4: 연마 비용 '+lvc0+' → '+lvc1+' · 숙련 획득 ×'+xg.toFixed(2));
  S.arts.pagong=1; S.artXp.pagong=0; w.castArt && 0; w.eval('S.artXp.pagong=(S.artXp.pagong||0)+artXpGain()'); ok(S.artXp.pagong===xg,'숙련이 배율만큼 쌓인다');
  for(let i=0;i<5;i++) w.buildHall('clinic'); w.eval('P.hp=1; hurtHero(100)');
  ok(S.downT>0 && Math.abs(S.downT-w.eval('DOWN_TIME')/(1+SECT.halls[2].eff.downcut*5/100))<1e-6,'약방 Lv 5: 쓰러짐 회복 '+w.eval('DOWN_TIME')+'s → '+S.downT.toFixed(2)+'s');
  w.eval('S.downT=0; reviveHero()');
  // ── 4) 저장·패널·오프라인
  w.eval('saveNow()'); const d=JSON.parse(w.localStorage.getItem('wuxia1'));
  ok(d.halls && d.halls.yard===w.hallLv('yard') && d.halls.gate===5 && typeof d.fame==='number','저장에 전각·명성이 든다');
  w.document.getElementById('tab-sect').click();
  const sp=w.document.getElementById('spanel');
  ok(!sp.classList.contains('show') && !w.document.getElementById('sover').hidden && w.eval('sectView')===true,'문파 탭 → 시트 없이 마당 + 오버레이(현판·배지) (v2.92.4)');
  ok(w.document.getElementById('sname2').textContent==='무명문' && w.document.getElementById('sfamet').textContent.includes(SECT.fame.tiers[w.fameTier()].n) && w.document.getElementById('sdiscn').textContent.startsWith(S.disciples.length+' /'),'현판 이름·명성 배지·제자 배지');
  w.document.getElementById('sdisc').click();
  ok(sp.classList.contains('show') && w.document.querySelector('#sbody .fame') && w.document.querySelector('#sbody .drow') && !w.document.querySelector('#sbody .hcard'),'제자 배지 → 시트: 명성 띠 + 제자 줄 (전각 카드는 없다 — 마당 팝업으로)');
  w.document.getElementById('sclose').click(); ok(!sp.classList.contains('show') && w.eval('sectView')===true,'시트 ✕ → 시트만 닫히고 마당은 그대로');
  w.document.getElementById('sfame').click(); ok(sp.classList.contains('show'),'명성 배지 → 시트');
  // 마당 배경 (v2.92.6) — jsdom엔 그림이 안 뜨니 화면 전체 사각형으로 떨어지고, 자리는 그 비율로 화면 안 (그림이 뜰 때의 검사는 fxtest)
  const R=w.sectBgRect(); ok(!R.ok && R.x===0 && R.y===0 && R.w===w.eval('VW') && R.h===w.eval('VH'),'배경 그림이 없으면 sectBgRect = 화면 전체(옛 죽림 바닥+원경으로)');
  ok(SECT.halls.every(h=>{const b=w.sceneHallBox(h.k); return b.x>0&&b.x<w.eval('VW')&&b.y>0&&b.y<w.eval('VH');}),'전각 5채 자리가 화면 안');
  // 마당 탭 → 전각 팝업 (v2.92.1)
  const hb=w.sceneHallBox('guest'); ok(w.sectTap(hb.x,hb.y-10)==='guest','마당의 객당을 누르면 객당');
  const hp=w.document.getElementById('hpop'); ok(!hp.hidden && hp.querySelector('.zn').textContent.includes('객당') && hp.style.left!=='','전각 팝업이 뜬다 (객당, 자리 잡힘)');
  const btn=w.document.getElementById('hpbuy'); ok(btn && !btn.disabled,'팝업 [세우기] 활성');
  const lv0=w.hallLv('guest'); btn.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true})); btn.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true}));
  ok(w.hallLv('guest')===lv0+1 && hp.querySelector('.zn').textContent.includes('Lv '+(lv0+1)),'팝업 버튼으로 세우기 → Lv '+w.hallLv('guest'));
  ok(w.sectTap(hb.x, 5)===null && hp.hidden,'빈 곳을 누르면 팝업이 닫힌다');
  w.sectTap(hb.x,hb.y-10); w.document.getElementById('hpclose').click(); ok(hp.hidden,'✕로 닫힌다');
  // 이름 (v2.91.2) — 기본 무명문·짓기·상한·저장
  ok(w.sectName()==='무명문' && w.document.getElementById('sname').textContent==='무명문' && w.document.getElementById('shan').textContent==='無名門' && !w.document.getElementById('snamerow').hidden,'기본 이름 무명문 無名門 · 처음엔 이름 줄이 펼쳐져 있다');
  w.document.getElementById('snamein').value='  천하  제일문 너무길다  '; w.document.getElementById('snameok').click();
  ok(w.sectName()==='천하 제일문 너'.slice(0,SECT.nameMax) && w.document.getElementById('sname').textContent===w.sectName() && w.document.getElementById('shan').textContent==='' && w.document.getElementById('snamerow').hidden,'짓기: 공백 정리·'+SECT.nameMax+'자 상한 → "'+w.sectName()+'", 한자 없음, 줄 접힘');
  w.document.getElementById('sedit').click(); ok(!w.document.getElementById('snamerow').hidden,'✎로 다시 연다');
  w.setSectName(''); ok(w.sectName()==='무명문' && S.sectName==='','빈 이름이면 기본으로');
  w.setSectName('무명문'); ok(S.sectName==='','기본 이름을 그대로 치면 저장값은 빈 값');
  w.setSectName('벽력문');
  w.document.getElementById('sclose2').click(); ok(!sp.classList.contains('show') && w.document.getElementById('sover').hidden && w.eval('sectView')===false,'현판 ✕ → 마당 닫힘');
  ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
  // 복원 + 오프라인 명성
  const d2=JSON.parse(w.localStorage.getItem('wuxia1'));   // 이름까지 저장된 최신본
  const {w:w2,errs:e2}=boot(JSON.stringify(Object.assign(d2,{at:Date.now()-3*3600*1000})));
  setTimeout(()=>{
    const S2=w2.eval('S'); w2.closeTitle();
    ok(w2.hallLv('gate')===5 && w2.hallLv('library')===4 && S2.fame>d.fame && w2.sectName()==='벽력문' && S2.disciples.length>=d2.disciples.length && S2.disciples[0].n===d2.disciples[0].n,'복원: 산문 5·장경각 4·이름 '+w2.sectName()+'·제자 '+S2.disciples.length+'명 · 3시간 오프라인 명성 '+Math.round(d.fame)+' → '+Math.round(S2.fame));
    ok(S2.silver>d2.silver && w2.document.getElementById('obody').innerHTML.includes('제자 수익'),'오프라인 제자 수익이 정산에 붙는다 (복귀 카드에 줄)');
    ok(e2.length===0,'런타임 오류 0 (복원)'+(e2.length?': '+e2[0]:''));
    console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음'); process.exit(bad?1:0);
  },900);
},1200);
