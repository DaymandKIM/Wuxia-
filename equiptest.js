/* 장비 검증 (v2.70 표준형) — jsdom 실제 DOM.
   1) 드랍 → 주머니·도감, 빈 자리는 첫 장비를 낀다
   2) 합성은 수동: canMerge/eqMerge/일괄 합성 · 최고 등급은 안 됨
   3) 자동 장착은 장착 효과가 큰 것으로(레벨 반영) · 직접 장착은 가진 것만
   4) 아이템 레벨: 은자 소비·장착/보유 효과 상승·상한 · 안 낀 아이템도 강화 가능(보유 효과)
   5) 보유 효과는 얻어 본 것 전부 영구 · 종류별 부가 효과
   6) 저장·복원 · v2.67 저장(eqLv) 이월 · 깨진 값 잘림
   7) 패널: 탭 3 · 카드 6×5 · 상세 열림·버튼 */
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
  // 1) 드랍
  ok(S.equip.weapon && S.equip.weapon.k==='fist' && S.equip.weapon.g===0 && S.equip.armor && S.equip.armor.g===0 && S.equip.trinket && S.equip.trinket.g===0,
     '시작 장비: 무기 권갑·방어구·장신구 일반 하나 (v2.79 — 권갑 아이콘 eq_fist)');
  ok(w.eval('atkPool()[0].key')==='punch','권갑을 끼면 맨손 무브셋(주먹·발차기)');
  EQ.dropCh=1; S.inv={}; S.codex={}; S.itemLv={}; S.equip={weapon:null,armor:null,trinket:null};
  ok(w.eqKinds(EQ.slots[0]).length===6 && w.eqKinds(EQ.slots[0])[0][0]==='fist','무기 6종(권갑·검·도·창·봉·부채) — 권갑이 첫 자리 (v2.79)');
  S.equip={weapon:null,armor:null,trinket:null};
  for(let i=0;i<40;i++) w.rollDrop(false);
  ok(EQ.slots.every(sl=>S.equip[sl.k]),'40번 드랍에 빈 자리 셋이 첫 장비를 꼈다');
  ok(w.codexCount()>0 && Object.keys(S.inv).length>0,'도감 '+w.codexCount()+'종 · 주머니에 쌓였다 (v2.79 권갑도 떨어진다)');
  // 2) 합성 수동
  S.inv={}; S.codex={}; S.itemLv={}; S.equip={weapon:null,armor:null,trinket:null};
  w.eqGain('sword',0,3);
  ok(S.inv.sword[0]===3 && w.canMerge('sword',0),'3개 모여도 저절로 합쳐지지 않는다 (합성 가능 표시)');
  ok(w.eqMerge('sword',0) && S.inv.sword[0]===0 && S.inv.sword[1]===1 && w.eqSeen('sword',1),'합성: 일반 검 3 → 고급 검 1, 도감에 오른다');
  w.eqGain('sword',1,8);
  ok(w.eqMergeAll()===4 && S.inv.sword[1]===0 && S.inv.sword[2]===0 && S.inv.sword[3]===1,'일괄 합성: 고급 9 → 희귀 3 → 영웅 1 (4회)');
  w.eqGain('fan',4,3);
  ok(!w.canMerge('fan',4),'최고 등급(전설)은 합성 안 됨');
  // 3) 자동 장착·직접 장착
  ok(S.equip.weapon.k==='sword' && S.equip.weapon.g===0,'첫 장비(일반 검)를 끼고 있다');
  ok(w.eqAutoEquipAll()>=1 && S.equip.weapon.k==='fan' && S.equip.weapon.g===4,'자동 장착: 장착 효과 최대(전설 부채)로');
  ok(w.eqWear('sword',3) && S.equip.weapon.k==='sword' && S.equip.weapon.g===3,'직접 장착: 영웅 검');
  ok(w.eqWear('spear',4)===false,'없는 장비는 못 낀다');
  ok(w.eqUnwear('weapon')===true && S.equip.weapon===null,'무기 벗기 → 맨손 (v2.76.9)');
  ok(w.eqUnwear('weapon')===false,'이미 맨손이면 벗을 게 없다');
  ok(w.eqWear('sword',3),'벗은 뒤 다시 낄 수 있다');
  // 레벨 반영 자동 장착 — 영웅 검을 많이 올리면 전설 부채보다 강해진다
  S.silver=1e15; while(w.levelItem('sword',3));
  ok(w.itemLv('sword',3)===EQ.grades[3].lvCap,'영웅 검 레벨 상한 '+EQ.grades[3].lvCap);
  ok(w.itemPct('sword',3)>w.itemPct('fan',4) && !w.eqBetterAny(),'강화한 영웅 검(+'+w.itemPct('sword',3).toFixed(0)+'%)이 전설 부채(+'+w.itemPct('fan',4).toFixed(0)+'%)보다 세다 → 갈아입을 것 없음');
  // 4) 레벨업 비용·효과·안 낀 것도
  S.silver=1e12; const c0=w.lvCost('fan',4); const dmg0=w.eval('heroDmg()'); const hold0=w.eqBonus('atk');
  ok(w.levelItem('fan',4) && S.silver===1e12-c0 && w.itemLv('fan',4)===1,'안 낀 전설 부채도 강화된다 (비용 '+c0+')');
  ok(w.eqBonus('atk')>hold0 && w.eval('heroDmg()')>dmg0,'안 낀 아이템 강화로 보유 효과·피해가 오른다');
  // 5) 보유 효과·부가 효과
  S.inv={}; S.codex={}; S.itemLv={}; S.equip={weapon:null,armor:null,trinket:null};
  S.codex.spear=1|2|4;
  const hb=w.eqBonus('atk'); const expect=(8+14+22)*EQ.codexRate;
  ok(Math.abs(hb-expect)<1e-9,'보유 효과: 얻어 본 창 3등급 = +'+hb.toFixed(2)+'% (장착 없이)');
  w.eqGain('saber',2,1);
  ok(w.eqBonus('aspd')>0 && w.eqBonus('crit')===0,'도를 끼면 공격 속도(부가), 치명타는 없음');
  // 6) 저장·복원·이월
  S.inv={sword:[2,0,0,0,0],robe:[0,0,1,0,0]}; S.itemLv={sword:[5,0,0,0,0]}; S.codex={sword:1,robe:4}; S.equip={weapon:{k:'sword',g:0},armor:{k:'robe',g:2},trinket:null};
  w.saveNow(); const saved=w.localStorage.getItem('wuxia1');
  const {w:w2}=boot(saved);
  setTimeout(()=>{
    const S2=w2.eval('S');
    ok(S2.inv.sword[0]===2 && S2.itemLv.sword[0]===5 && S2.codex.robe===4 && S2.equip.armor.k==='robe','주머니·레벨·도감·장착 그대로');
    const old=JSON.parse(saved); delete old.itemLv; old.eqLv={weapon:7,armor:0,trinket:0}; old.equip={weapon:{k:'saber',g:9},armor:{k:'zzz',g:1},trinket:{k:'ring',g:3,lv:9}};
    const {w:w3}=boot(JSON.stringify(old));
    setTimeout(()=>{
      const S3=w3.eval('S');
      ok(S3.equip.weapon.k==='saber' && S3.equip.weapon.g===4 && S3.itemLv.saber[4]===7 && S3.equip.armor===null && S3.itemLv.ring[3]===9,'옛 저장: 등급 잘림, 자리 강화 7·장비 lv 9는 아이템 레벨로 이월, 없는 종류 버림');
      // 7) 패널
      const d3=w3.document; w3.closeTitle && w3.closeTitle();
      d3.getElementById('tab-equip').click();
      ok(d3.getElementById('epanel').classList.contains('show'),'장비 탭이 패널을 연다');
      ok(d3.querySelectorAll('#etabs .askind').length===3,'[무기][방어구][장신구] 탭');
      ok(d3.querySelectorAll('.eqcard').length===30,'무기 탭 카드 = 6종×5등급 (v2.79 권갑 포함)');
      d3.querySelector('.eqcard.seen').click();
      ok(!d3.getElementById('eqdet').hidden && !!d3.getElementById('eqdlv'),'카드를 누르면 상세(장착·강화·합성)가 열린다');
      d3.querySelector('#etabs .askind[data-t="trinket"]').click();
      ok(d3.querySelectorAll('.eqcard.worn').length===1,'장신구 탭에서 낀 반지가 표시된다');
      ok(errs.length===0,'런타임 오류 '+errs.length+(errs.length?': '+errs[0]:''));
      console.log(bad?'\n★ 실패 '+bad+'건':'\n문제 없음'); process.exit(bad?1:0);
    },1200);
  },1200);
},1500);
