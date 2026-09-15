/* 장비 검증 (v2.66) — jsdom 실제 DOM.
   1) 드랍: 확률 1로 처치하면 자리에 장착되고, 낮은 품계는 판매되어 은자가 는다
   2) 자동 장착은 더 높은 품계만 · 강화 레벨 전승
   3) 강화: 은자를 쓰고 레벨이 오르며 효과(heroDmg 등)에 실제로 곱해진다 · 상한
   4) 저장·복원 · 깨진 장비는 버린다
   5) 장비 탭 패널이 열리고 세 자리가 그려진다 */
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
  // 1) 드랍 — 확률 1, 첫 드랍은 빈 자리라 장착
  EQ.dropCh=1;
  S.equip={weapon:null,armor:null,trinket:null};
  let equips=0, sells=0;
  for(let i=0;i<60;i++){ const r=w.rollDrop(false); if(r==='equip')equips++; else if(r==='sell')sells++; }
  ok(equips>=3,'60번 드랍에 세 자리가 다 찼다 (장착 '+equips+'회)');
  ok(EQ.slots.every(sl=>S.equip[sl.k]),'무기·방어구·장신구 전부 장착됨');
  ok(sells>0,'낮거나 같은 품계는 판매됐다 ('+sells+'회)');
  // 2) 더 높은 품계만 갈아입고 강화 레벨은 전승
  S.equip.weapon={k:'sword',g:1,lv:7}; S.silver=0;
  const rnd0=w.Math.random; w.Math.random=()=>0.0;   // 드랍 굴림: 자리 weapon·종류 첫째·품계 첫째(범품)
  const before=S.equip.weapon;
  const r1=w.rollDrop(false);
  ok(r1==='sell' && S.equip.weapon===before && S.silver>0,'같거나 낮은 품계(범품)는 판매되고 양품 검은 그대로다');
  S.equip.weapon={k:'sword',g:1,lv:7};
  w.Math.random=rnd0;
  // 신물을 강제로 얹는 드랍: gradeW를 신물만으로
  const gw=EQ.gradeW.map(r=>r.slice()); for(const r of EQ.gradeW) r.splice(0,5,0,0,0,0,1);
  let got=null; for(let i=0;i<40 && !got;i++){ const r=w.rollDrop(false); if(S.equip.weapon.g===4) got=S.equip.weapon; }
  ok(got && got.lv===7,'신물이 떨어지면 갈아입고 강화 +7이 전승된다');
  for(let i=0;i<5;i++) EQ.gradeW[i]=gw[i];
  // 3) 강화 — 은자 소비·효과 반영·상한
  S.equip={weapon:{k:'sword',g:0,lv:0},armor:null,trinket:null};
  const dmg0=w.eval('heroDmg()'); const b0=w.eqBonus('atk');
  S.silver=1e12;
  const cost=w.enhCost('weapon');
  ok(w.enhance('weapon') && S.silver===1e12-cost && S.equip.weapon.lv===1,'강화 1회: 비용 '+cost+' 차감·+1');
  ok(w.eqBonus('atk')>b0 && w.eval('heroDmg()')>dmg0,'강화 뒤 공격 보너스·실제 피해가 오른다 ('+b0.toFixed(1)+'% → '+w.eqBonus('atk').toFixed(1)+'%)');
  while(w.enhance('weapon'));
  ok(S.equip.weapon.lv===EQ.lvCap[0] && !w.canEnhance('weapon'),'범품 상한 +'+EQ.lvCap[0]+'에서 멈춘다');
  S.equip.armor={k:'robe',g:2,lv:0}; S.equip.trinket={k:'pendant',g:3,lv:0};
  const hp0=w.eval('heroHpMax()'); S.equip.armor=null;
  ok(hp0>w.eval('heroHpMax()'),'방어구가 체력에 곱해진다');
  ok(w.eqBonus('crit')>0 && w.eqBonus('gold')>0,'장신구는 은자 획득 + 치명타 절반');
  // 4) 저장·복원
  S.equip={weapon:{k:'saber',g:4,lv:12},armor:{k:'vest',g:1,lv:3},trinket:null};
  w.saveNow();
  const saved=w.localStorage.getItem('wuxia1');
  const {w:w2}=boot(saved);
  setTimeout(()=>{
    const S2=w2.eval('S');
    ok(S2.equip.weapon && S2.equip.weapon.k==='saber' && S2.equip.weapon.g===4 && S2.equip.weapon.lv===12,'저장 → 다시 열면 신물 도 +12 그대로');
    ok(S2.equip.armor && S2.equip.armor.lv===3 && S2.equip.trinket===null,'방어구 +3 · 빈 장신구도 그대로');
    const broken=JSON.parse(saved); broken.equip={weapon:{k:'zzz',g:9,lv:99},armor:{k:'robe',g:99,lv:-5}};
    const {w:w3}=boot(JSON.stringify(broken));
    setTimeout(()=>{
      const S3=w3.eval('S');
      ok(S3.equip.weapon===null,'없는 종류의 장비는 버린다');
      ok(S3.equip.armor && S3.equip.armor.g===4 && S3.equip.armor.lv===0,'품계·강화는 범위로 잘린다');
      // 5) 패널
      const d3=w3.document; w3.closeTitle && w3.closeTitle();
      d3.getElementById('tab-equip').click();
      ok(d3.getElementById('epanel').classList.contains('show'),'장비 탭이 패널을 연다');
      ok(d3.querySelectorAll('.eqrow').length===3,'자리 카드 3장이 그려진다');
      ok(d3.getElementById('eqn-armor').textContent.includes('신물'),'방어구 카드에 품계 이름이 보인다');
      ok(errs.length===0,'런타임 오류 '+errs.length+(errs.length?': '+errs[0]:''));
      console.log(bad?'\n★ 실패 '+bad+'건':'\n문제 없음'); process.exit(bad?1:0);
    },1200);
  },1200);
},1500);
