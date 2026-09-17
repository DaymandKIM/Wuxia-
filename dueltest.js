/* 본진 비무 검증 (v2.94) — jsdom 실제 DOM.
   1) gotoHq: zone()=본진·전역 단계 gBase·HUD '○○ 본진 1단'·단계 10(제자 젠)
   2) 제자 젠(disc_<k>)·주인공 스트립 렌더 오류 0
   3) 처치 목표 → 장로(보스) 소환 → 격파 → hqKill: 단 +1·조각·hqDone·다시 단계 10
   4) 장문인(10단): 조각 3·무공점 2(skillPtsTotal)·은자 보너스
   5) 상승 무공: 조각 5 없으면 못 배우고, 배우면 조각 소모
   6) 저장 왕복(hq·duel·frag·ptsBonus·단계 클램프) · 오프라인은 처치만(조각·단 그대로) · gotoZone 이 본진을 푼다
   7) 데이터: gBase 문파마다 조각 무공 ≥1 · cast 스트립·탄 키 존재 · 명성 첫 격파는 본진에서 안 준다 */
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(process.env.WUXIA_OUT || __dirname+'/dist/wuxia.html','utf8');
const ctxStub=new Proxy({},{get:(t,k)=>{
  if(k==='canvas') return {width:1170,height:2532};
  if(['imageSmoothingEnabled','globalAlpha','fillStyle','strokeStyle','lineWidth','globalCompositeOperation','font','textAlign','textBaseline'].includes(k)) return 0;
  if(k==='createLinearGradient') return ()=>({addColorStop(){}});
  if(k==='getImageData') return (x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
  if(k==='measureText') return ()=>({width:10});
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
  const S=w.eval('S'), P=w.eval('P'), DUEL=w.eval('DUEL'), ARTS=w.eval('ARTS'), HFX=w.eval('HFX'), FOES=w.eval('FOES'), BOSS_STAGE=w.eval('BOSS_STAGE');
  w.closeTitle && w.closeTitle();
  const steps=(sec,until)=>{ for(let i=0;i<sec*60;i++){ w.step(1/60); if(until&&until()) return true; } return false; };
  const tillBoss=()=>{ for(let n=0;n<4;n++){ S.intro=0; if(steps(6,()=>S.foes.some(x=>x.boss&&x.rise<=0))) return true; } return false; };
  // ── 1) 이동
  S.rexp=w.seedExp(2,5); S.hp=P.hpMax=w.eval('heroHpMax()'); P.hp=P.hpMax;
  ok(w.gotoHq('gaebang')===true && S.hq==='gaebang' && w.eval("zone()").n==='개방 본진' && w.eval("zone()").hq==='gaebang','gotoHq → zone() = '+w.eval("zone()").n);
  ok(S.stage===BOSS_STAGE-1 && S.kills===0,'단계 '+S.stage+'(제자 젠) · 처치 0');
  { const el=w.document.getElementById('hqload'); ok(el && !el.hidden && w.document.getElementById('hqname').textContent==='개방 본진' && w.document.getElementById('hqtip').textContent===DUEL.hqDesc.gaebang,'진입 로딩 화면: "'+w.document.getElementById('hqname').textContent+'" · "'+w.document.getElementById('hqtip').textContent+'"');
    for(let i=0;i<Math.ceil(DUEL.load.dur*60)+4;i++) w.hqLoadStep(1/60);
    ok(el.hidden===true,'로딩 화면은 '+DUEL.load.dur+'초 뒤 스스로 걷힌다'); }
  ok(w.eval("gstage()")===DUEL.gBase.gaebang && w.hqRank('gaebang')===1,'전역 단계 = gBase '+w.eval("gstage()")+' · 1단');
  S.intro=0; w.hud && w.hud();
  const st=w.document.getElementById('stage').textContent;
  ok(/개방 본진 1단/.test(st),'HUD "'+st+'"');
  { const own=w.eval("rzone().k");
    const fall=w.eval("const _t=IMG.bg_hq_gaebang; delete IMG.bg_hq_gaebang; const _k=rzone().k; IMG.bg_hq_gaebang=_t; _k");   // 원경 에셋이 없을 때만 이웃을 빌린다
    ok(own==='hq_gaebang' && fall==='bamboo','배경: 전용 원경이 있으면 본진('+own+'), 없으면 이웃 구역('+fall+')'); }
  // ── 2) 제자 젠·렌더
  S.foes.length=0; w.spawnFoe(); const f=S.foes[0];
  const ZF=w.eval('ZONEFOE'); ok(ZF['hq_gaebang'].includes(f.k) && FOES[f.k].school==='gaebang' && (FOES[f.k].heroStrip || FOES[f.k].anim.idle.length===4),'젠 = '+f.k+' (계보 개방 · '+(FOES[f.k].heroStrip?'주인공 스트립 임시':'전용 시트')+')');
  // 전용 시트가 없는 문파는 여전히 주인공 tint (소림은 시트가 오면 바뀐다)
  { const left = Object.keys(DUEL.gBase).filter(k => !DUEL.art[k]);   // 아직 전용 시트가 없는 문파
    ok(left.every(k => ZF['hq_'+k][0]==='disc_'+k && FOES['disc_'+k].heroStrip),'전용 시트가 없는 문파는 주인공 스트립 임시 ('+(left.join(', ')||'없음 — 8문파 다 전용 시트')+')'); }
  const e0=errs.length; for(let i=0;i<20;i++){ w.step(1/60); w.render(); }
  f.anim='atk'; f.af=1; w.render(); f.anim='hit'; w.render();
  ok(errs.length===e0,'제자 렌더(대기·공격·피격) 오류 '+(errs.length-e0));
  // ── 3) 처치 목표 → 장로 → 격파
  const need=w.eval("stageNeed()"); const sv0=S.silver, sv1=w.eval("killSilver()");
  f.hp=1; P.x=f.x; P.y=f.y; S.frag={}; let fr=0;
  w.hurtFoe(f,10,false);
  ok(Math.round(S.silver-sv0)===Math.round(sv1*DUEL.silverMob),'제자 은자 = 처치 은자 × '+DUEL.silverMob+' ('+Math.round(S.silver-sv0)+')');
  S.kills=need; steps(8);
  ok(S.stage===BOSS_STAGE,'목표 '+need+' 채우면 장로 단계 '+S.stage);
  tillBoss();
  const b=S.foes.find(x=>x.boss);
  ok(!!b && b.k===w.eval('ZONEBOSS')['hq_gaebang'],'장로 소환 = '+(b&&b.k)+' (ZONEBOSS)');
  const hpHq=w.eval("bossHp()"); S.hq=null; const hpZone=w.eval("bossHp()"); S.hq='gaebang';
  ok(Math.abs(b.hpMax-Math.round(hpHq))<=1 && hpHq<hpZone,'장로 체력 = bossHp('+b.hpMax+') — 전역 단계 '+w.eval("gstage()")+' 기준 (죽림 보스 '+Math.round(hpZone)+'보다 낮다)');
  const fame0=S.fame, done0=JSON.stringify(S.bossDone), sv2=S.silver;
  b.hp=1; P.x=b.x-30; P.y=b.y; w.hurtFoe(b,10,false);
  const tt=w.document.getElementById('toast').textContent;
  ok(w.hqRank('gaebang')===2 && S.hqDone.gaebang===1,'격파 → 2단 · hqDone 1');
  const fk=Object.keys(S.frag); fr=fk.reduce((s,k)=>s+S.frag[k],0);
  ok(fk.length===1 && fr===DUEL.frag.elder && w.eval('artDef("'+fk[0]+'")').school==='gaebang','조각 +'+DUEL.frag.elder+' → '+fk[0]+' (개방 무공)');
  ok(JSON.stringify(S.bossDone)===done0 && S.fame-fame0<=w.eval('SECT.fame.boss')+1e-6,'첫 격파 보너스(bossDone·bossFirst 명성)는 본진에서 안 준다');
  ok(tt.includes('개방 1단 장로 격파'),'격파 토스트 "'+tt.replace(/\n/g,' / ')+'"');
  steps(12,()=>S.stage===BOSS_STAGE-1);
  ok(S.stage===BOSS_STAGE-1 && !S.foes.some(x=>x.boss),'격파 뒤 다시 단계 10(제자 젠) — 단계 '+S.stage+' · 처치 '+S.kills+' · 적 '+S.foes.length);
  ok(w.eval("gstage()")===Math.max(DUEL.gBase.gaebang+DUEL.gPerRank,(S.best|0)-DUEL.lag),'2단 전역 단계 = max(사다리 '+(DUEL.gBase.gaebang+DUEL.gPerRank)+', 최고 단계 '+S.best+'−'+DUEL.lag+') = '+w.eval("gstage()"));
  // ── 4) 장문인
  S.duel.gaebang=DUEL.masterEvery; S.frag={}; S.ptsBonus=0; const pt0=w.eval("skillPtsTotal()");
  S.kills=w.eval("stageNeed()"); steps(8,()=>S.stage===BOSS_STAGE); tillBoss();
  const m=S.foes.find(x=>x.boss); ok(!!m && w.hqIsMaster('gaebang'),'10단 = 장문인');
  // 정예제자 — eliteFrom 단부터만 섞인다
  { const ks=new Set(); S.duel.gaebang=1; for(let i=0;i<60;i++){ S.foes.length=0; w.spawnFoe(); ks.add(S.foes[0].k); } ok(!ks.has('gb_elite') && ks.has('gb_disc'),'1단: 정예제자 안 나옴 ('+[...ks]+')');
    ks.clear(); S.duel.gaebang=DUEL.eliteFrom; for(let i=0;i<80;i++){ S.foes.length=0; w.spawnFoe(); ks.add(S.foes[0].k); } ok(ks.has('gb_elite') && ks.has('gb_disc'),DUEL.eliteFrom+'단: 정예제자 섞임 ('+[...ks]+')'); S.foes.length=0; S.foes.push(m); S.duel.gaebang=DUEL.masterEvery; }
  const sv3=S.silver, expM=w.eval("killSilver()*SILVER.bossKill")*(1+DUEL.silverMaster); m.hp=1; P.x=m.x-30; P.y=m.y; w.hurtFoe(m,10,false);
  fr=Object.keys(S.frag).reduce((s,k)=>s+S.frag[k],0);
  ok(fr===DUEL.frag.master && S.ptsBonus===DUEL.pts.master && w.eval("skillPtsTotal()")===pt0+DUEL.pts.master,'장문인: 조각 +'+fr+' · 무공점 +'+S.ptsBonus+' (skillPtsTotal '+pt0+'→'+w.eval("skillPtsTotal()")+')');
  // 보스 드랍(100%)으로 도감 보유 효과(은자 %)가 사이에 바뀔 수 있어 ±5%
  ok(Math.abs((S.silver-sv3)/expM-1)<0.05,'장문인 은자 ≈ 보스 은자 × (1+'+DUEL.silverMaster+') = '+Math.round(S.silver-sv3)+' (기대 '+Math.round(expM)+')');
  ok(w.hqRank('gaebang')===11,'11단');
  // ── 5) 상승 무공 — 조각
  const a=ARTS.list.find(x=>x.school==='gaebang'&&x.frag);
  S.arts[a.k]=0; delete S.arts[a.k]; S.rexp=w.seedExp(4,9); S.silver=1e9; S.frag[a.k]=a.frag-1;
  ok(w.canLearn(a)===false && w.learnArt(a.k)===false,a.n+': 조각 '+(a.frag-1)+'/'+a.frag+' → 못 배운다');
  S.frag[a.k]=a.frag+2; ok(w.canLearn(a)===true && w.learnArt(a.k)===true && S.arts[a.k]===1 && S.frag[a.k]===2,'조각 '+(a.frag+2)+' → 배우고 2 남는다');
  w.openArts && w.openArts(); w.refreshArts && w.refreshArts();
  ok(a.tier===2 && a.cast && HFX.cast[a.cast],'상승 무공 tier 2 · 시전 스트립 '+a.cast);
  // 시전이 돈다
  S.foes.length=0; w.spawnFoe(); const t=S.foes[0]; P.x=t.x-40; P.y=t.y; S.artCd={}; const hp0=t.hp;
  const cast=w.castArt(a); ok(cast!==false && P.castT>0 && t.hp<hp0,a.n+' 시전 → 시전 동작 '+P.castT.toFixed(2)+'초 · 적 체력 '+hp0+'→'+t.hp);
  // ── 6) 저장 왕복·오프라인·복귀
  S.stage=BOSS_STAGE; ok(w.saveNow()!==false,'저장');
  const d=JSON.parse(w.localStorage.getItem('wuxia1'));
  ok(d.hq==='gaebang' && d.duel.gaebang===11 && d.frag[a.k]===2 && d.ptsBonus===DUEL.pts.master,'저장 필드 hq·duel·frag·ptsBonus');
  const {w:w2,errs:e2}=boot(JSON.stringify(d));
  setTimeout(()=>{
    const S2=w2.eval('S');
    ok(S2.hq==='gaebang' && w2.hqRank('gaebang')===11 && S2.frag[a.k]===2 && S2.ptsBonus===DUEL.pts.master && S2.stage>=BOSS_STAGE-1 && w2.eval("zone()").n==='개방 본진','복원: 본진·11단·조각·무공점·단계 '+S2.stage);
    const k0=S2.totalKills, r0=w2.hqRank('gaebang'), fr0=JSON.stringify(S2.frag);
    const g=w2.offlineGains(3600);
    ok(g.kills>0 && S2.totalKills===k0+g.kills && w2.hqRank('gaebang')===r0 && JSON.stringify(S2.frag)===fr0,'오프라인 1시간: 처치 '+g.kills+' · 단·조각 그대로');
    w2.gotoZone(0,3); ok(S2.hq===null && w2.eval("zone()").k==='bamboo' && S2.stage===3,'gotoZone → 본진 해제 · 죽림 3단계');
    // 깨진 저장
    const bad2=Object.assign({},d,{hq:'nosuch',duel:{x:3},frag:{zz:9}});
    const {w:w3}=boot(JSON.stringify(bad2));
    setTimeout(()=>{
      const S3=w3.eval('S');
      ok(S3.hq===null && !S3.duel.x && S3.frag.zz===undefined,'모르는 문파·무공 키는 버린다');
      // ── 7) 데이터
      let miss=[];
      for(const k in DUEL.gBase){ const arts=ARTS.list.filter(x=>x.school===k&&x.frag); if(!arts.length) miss.push(k);
        for(const x of arts){ if(!HFX.cast[x.cast]) miss.push(x.k+':cast '+x.cast); if(x.shot && !['pashot','bshot'].includes(x.shot)) miss.push(x.k+':shot'); if(x.tier!==2||x.frag!==DUEL.fragNeed) miss.push(x.k+':tier/frag'); }
        if(!FOES['disc_'+k]||!FOES['elder_'+k]) miss.push(k+':foes'); if(!w.eval('HQZONE')[k]) miss.push(k+':zone'); }
      ok(miss.length===0,'문파 8곳 조각 무공·시전 스트립·제자·장로·본진 데이터 (빠짐: '+miss.join(', ')+')');
      ok(errs.length===0 && e2.length===0,'런타임 오류 '+(errs.length+e2.length)+(errs.length?'\n'+errs.join('\n'):''));
      console.log(bad?'\n★ 실패 '+bad:'\n문제 없음'); process.exit(bad?1:0);
    },700);
  },700);
},900);
