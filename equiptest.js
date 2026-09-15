/* 장비 검증 (v2.67 도감형) — jsdom 실제 DOM.
   1) 드랍은 주머니에 쌓이고 도감에 오르며, 빈 자리엔 자동 장착
   2) 같은 것 3개 → 한 품계 위로 자동 합성(연쇄) · 더 높은 품계면 갈아입고 같은 품계면 유지
   3) 보유 효과: 얻어 본 칸이 늘면 장착 없이도 보너스가 는다 · 종류별 부가 효과
   4) 자리 강화: 은자 소비·효과 반영·상한 · 갈아껴도 남는다
   5) 직접 장착(eqWear)은 가진 것만
   6) 저장·복원 · v2.66 저장(lv 든 장비) 이월 · 깨진 값은 잘린다
   7) 장비 탭 패널: 자리 카드 3장 + 도감 80칸 */
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
  const d=w.document, S=w.eval('S'), EQ=w.eval('EQUIP');
  w.closeTitle && w.closeTitle();
  // 1) 드랍 → 주머니·도감·자동 장착
  EQ.dropCh=1;
  let bag=0,eq=0;
  for(let i=0;i<40;i++){ const r=w.rollDrop(false); if(r==='bag')bag++; else if(r==='equip')eq++; }
  ok(eq>=3 && EQ.slots.every(sl=>S.equip[sl.k]),'40번 드랍에 세 자리가 다 찼다 (장착 '+eq+'·주머니 '+bag+')');
  ok(w.codexCount()>0 && Object.keys(S.inv).length>0,'도감 '+w.codexCount()+'칸 · 주머니에 쌓였다');
  // 2) 합성 — 범품 검 3개 → 양품 검 1개, 연쇄
  S.inv={}; S.codex={}; S.equip={weapon:null,armor:null,trinket:null};
  w.eqGain('sword',0,1); w.eqGain('sword',0,1);
  ok(S.inv.sword[0]===2 && S.inv.sword[1]===0,'2개까지는 그대로 (범품 검 ×2)');
  w.eqGain('sword',0,1);
  ok(S.inv.sword[0]===0 && S.inv.sword[1]===1 && (S.codex.sword&2),'3개째에 양품 검 1개로 합쳐지고 도감에 오른다');
  ok(S.equip.weapon && S.equip.weapon.g===1,'합친 양품이 자동 장착됐다');
  w.eqGain('sword',1,8);
  ok(S.inv.sword[1]===0 && S.inv.sword[2]===3-3 && S.inv.sword[3]===1,'양품 9개 → 진품 3 → 보물 1 연쇄 합성');
  ok(S.equip.weapon.g===3,'보물 검이 자동 장착');
  w.eqGain('saber',3,1);
  ok(S.equip.weapon.k==='sword','같은 품계(보물 도)는 지금 것(검)을 지킨다');
  w.eqGain('saber',4,1);
  ok(S.equip.weapon.k==='saber' && S.equip.weapon.g===4,'더 높은 품계(신물 도)면 갈아입는다');
  // 3) 보유 효과·부가 효과
  S.inv={}; S.codex={}; S.equip={weapon:null,armor:null,trinket:null}; S.eqLv={weapon:0,armor:0,trinket:0};
  const b0=w.eqBonus('atk');
  S.codex.spear=1|2|4;                       // 창 범·양·진 얻어 봄 (장착 없음)
  const bc=w.eqBonus('atk');
  ok(b0===0 && Math.abs(bc-(8+14+22)*EQ.codexRate)<1e-9,'보유 효과: 얻어 본 칸 3개 = +'+bc.toFixed(2)+'% (장착 없이)');
  w.eqGain('sword',2,1);
  ok(w.eqBonus('crit')>0 && w.eqBonus('atk')>bc,'진품 검 장착: 공격 + 치명타(검의 부가 효과)');
  w.eqWear('sword',2); w.eqGain('saber',2,1); const critBefore=w.eqBonus('crit'); w.eqWear('saber',2);
  ok(w.eqBonus('crit')<critBefore && w.eqBonus('aspd')>0,'도를 끼면 치명타 대신 공격 속도');
  // 4) 자리 강화
  S.silver=1e12; const dmg0=w.eval('heroDmg()'); const cost=w.enhCost('weapon');
  ok(w.enhance('weapon') && S.eqLv.weapon===1 && S.silver===1e12-cost && w.eval('heroDmg()')>dmg0,'강화 +1: 비용 '+cost+' 차감·피해 상승');
  while(w.enhance('weapon'));
  ok(S.eqLv.weapon===EQ.lvCap && !w.canEnhance('weapon'),'자리 강화 상한 +'+EQ.lvCap);
  w.eqGain('spear',4,1);
  ok(S.equip.weapon.k==='spear' && S.eqLv.weapon===EQ.lvCap,'갈아껴도 자리 강화는 남는다');
  // 5) 직접 장착
  ok(w.eqWear('fan',4)===false,'없는 장비는 못 낀다');
  // 6) 저장·복원 (+ v2.66 이월)
  S.inv={sword:[2,0,0,0,0],robe:[0,0,1,0,0]}; S.codex={sword:1,robe:4}; S.equip={weapon:{k:'sword',g:0},armor:{k:'robe',g:2},trinket:null}; S.eqLv={weapon:5,armor:0,trinket:0};
  w.saveNow(); const saved=w.localStorage.getItem('wuxia1');
  const {w:w2}=boot(saved);
  setTimeout(()=>{
    const S2=w2.eval('S');
    ok(S2.inv.sword[0]===2 && S2.inv.robe[2]===1 && S2.codex.sword===1 && S2.codex.robe===4,'주머니·도감 그대로');
    ok(S2.equip.armor.k==='robe' && S2.equip.armor.g===2 && S2.eqLv.weapon===5,'장착·자리 강화 그대로');
    const old=JSON.parse(saved); delete old.inv; delete old.codex; delete old.eqLv; old.equip={weapon:{k:'saber',g:9,lv:99},armor:{k:'zzz',g:1,lv:3},trinket:{k:'ring',g:3,lv:7}};
    const {w:w3}=boot(JSON.stringify(old));
    setTimeout(()=>{
      const S3=w3.eval('S');
      ok(S3.equip.weapon.g===4 && S3.eqLv.weapon===40 && S3.equip.armor===null && S3.eqLv.trinket===7,'v2.66 저장: 품계·강화는 잘리고 lv는 자리 강화로 이월, 없는 종류는 버림');
      ok((S3.codex.ring&8)!==0,'이월된 장착품은 도감에 오른다');
      // 7) 패널
      const d3=w3.document; w3.closeTitle && w3.closeTitle();
      d3.getElementById('tab-equip').click();
      ok(d3.getElementById('epanel').classList.contains('show'),'장비 탭이 패널을 연다');
      ok(d3.querySelectorAll('.eqrow').length===3,'자리 카드 3장');
      ok(d3.querySelectorAll('.eqc').length===80,'도감 80칸');
      ok(d3.querySelectorAll('.eqc.worn').length===2,'끼고 있는 칸 2개에 표시');
      ok(errs.length===0,'런타임 오류 '+errs.length+(errs.length?': '+errs[0]:''));
      console.log(bad?'\n★ 실패 '+bad+'건':'\n문제 없음'); process.exit(bad?1:0);
    },1200);
  },1200);
},1500);
