/* 상점 검증 — 영옥·보상형 광고·하루치 사다리 (v2.96) + 장비 소환 (v2.96.1)
   1) 영옥 가감 — 음수·모자람은 거절
   2) 광고 자리 하루 횟수 — 다 쓰면 거절, 날짜가 바뀌면 다시 찬다
   3) 모의 광고는 3초 뒤에 then() 을 부른다 (adStep 으로 시간을 돌린다)
   4) 사다리 — 계단은 순서대로 하나씩, 못 미치면 안 받아진다
   5) 오프라인 정산·장로 격파·업적이 영옥을 준다
   6) 저장 왕복 (영옥·광고 기록)
   7) 상점 시트가 열리고 사다리 줄이 그려진다
   8) 장비 소환 — 값·10연 할인·등급 범위·천장·주머니 반영·저장·화면
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
function boot(){
  const errs=[];
  const vc=new (require('jsdom').VirtualConsole)();
  const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
    pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    Object.defineProperty(w,'devicePixelRatio',{value:2});
    w.addEventListener('error',e=>errs.push(e.message));
  }});
  return {w:dom.window,errs};
}
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

const {w,errs}=boot();
setTimeout(()=>{
  if (typeof w.closeTitle==='function') w.closeTitle();
  if (typeof w.loadSkip==='function') w.loadSkip();

  // ── 1) 영옥 ──────────────────────────────────
  w.eval('S.jade = 0');
  w.eval('jadeAdd(120)');
  ok(w.eval('S.jade')===120, '영옥 더하기 120 → '+w.eval('S.jade'));
  ok(w.eval('jadeAdd(-5)')===0 && w.eval('S.jade')===120, '음수는 안 더해진다');
  ok(w.eval('jadeSpend(100)')===true && w.eval('S.jade')===20, '쓰기 100 → 잔고 '+w.eval('S.jade'));
  ok(w.eval('jadeSpend(999)')===false && w.eval('S.jade')===20, '모자라면 거절 (잔고 그대로)');

  // ── 2) 광고 자리 횟수 ─────────────────────────
  w.eval('S.ad = null; adState()');
  const slotN = w.eval('BM.slots.fate.n');
  ok(w.eval('adLeft("fate")')===slotN, '기연 자리 하루 '+slotN+'회로 시작');
  // 자리를 다 쓴다 — 모의 광고를 즉시 끝내며 (adStep 으로 시간 진행)
  let fired=0;
  w.eval('window.__fired = 0');
  for (let i=0;i<slotN;i++){
    const started = w.eval('adShow("fate", () => { window.__fired++; })');
    if (!started) break;
    w.eval('adStep(BM.adSec + 0.1)');
  }
  fired = w.eval('window.__fired');
  ok(fired===slotN, '자리 횟수만큼 then() 이 불렸다 ('+fired+'/'+slotN+')');
  ok(w.eval('adLeft("fate")')===0, '다 쓰면 남은 횟수 0');
  ok(w.eval('adShow("fate", ()=>{})')===false, '횟수 소진 뒤엔 거절');
  ok(w.eval('adSeen()')===slotN, '오늘 본 광고 수 = '+w.eval('adSeen()'));

  // ── 3) 모의 광고는 시간이 지나야 끝난다 ────────
  w.eval('S.ad = null; adState(); window.__f2 = 0');
  w.eval('adShow("off2x", () => { window.__f2++; })');
  ok(w.eval('adBusy()')===true && w.eval('window.__f2')===0, '광고 중엔 아직 보상이 없다');
  w.eval('adStep(BM.adSec * 0.5)');
  ok(w.eval('window.__f2')===0, '절반 지나도 아직');
  w.eval('adStep(BM.adSec)');
  ok(w.eval('window.__f2')===1 && w.eval('adBusy')&&!w.eval('adBusy()'), '다 지나면 보상 + 덮개가 걷힌다');

  // ── 4) 하루치 사다리 ──────────────────────────
  w.eval('S.ad = { d: bmDay(), n: 0, s: {}, L: 0 }');
  ok(w.eval('ladderClaim()')===null, '광고 0편이면 첫 계단도 못 받는다');
  w.eval('S.ad.n = 1');
  ok(w.eval('ladderReady()')===true, '1편이면 첫 계단이 열린다');
  const st0 = w.eval('JSON.stringify(ladderClaim())');
  ok(st0 && st0!=='null' && w.eval('ladderDone()')===1, '첫 계단 수령 → '+st0);
  ok(w.eval('ladderClaim()')===null, '같은 편수로 두 계단은 못 받는다');
  const last = w.eval('BM.ladder[BM.ladder.length-1]');
  w.eval('S.ad.n = BM.ladder[BM.ladder.length-1].n; S.jade = 0');
  let got=0; while (w.eval('ladderClaim()')!==null) { got++; if (got>9) break; }
  ok(w.eval('ladderDone()')===w.eval('BM.ladder.length'), '끝 편수를 채우면 남은 계단이 다 열린다');
  ok(w.eval('S.jade')===w.eval('BM.ladder[BM.ladder.length-1].jade'), '마지막 계단 영옥 '+w.eval('S.jade'));
  ok(w.eval('ladderReady()')===false, '다 받으면 알림점이 꺼진다');

  // ── 5) 수급처 ────────────────────────────────
  const j1h = w.eval('jadeOffline(3600)');
  ok(j1h>=w.eval('BM.gain.offPerHour'), '오프라인 1시간 영옥 '+j1h+' (시간당 '+w.eval('BM.gain.offPerHour')+' 이상)');
  ok(w.eval('jadeOffline(0)')===0, '0초면 0');
  w.eval('S.zi = 4');
  ok(w.eval('jadeOffline(3600)')>j1h, '뒤 구역일수록 많다 ('+w.eval('jadeOffline(3600)')+')');
  w.eval('S.zi = 0');
  ok(w.eval('jadeAchv(0)')>0 && w.eval('jadeAchv(4)')>w.eval('jadeAchv(0)'), '업적 단계가 오를수록 영옥이 는다 ('+w.eval('jadeAchv(0)')+' → '+w.eval('jadeAchv(4)')+')');
  ok(w.eval('jadeAchv(30)')<=w.eval('BM.gain.achvCap'), '업적 영옥 상한 '+w.eval('BM.gain.achvCap'));
  // 오프라인 정산이 실제로 영옥을 얹는가
  w.eval('S.jade = 0');
  const g = w.eval('JSON.parse(JSON.stringify(offlineGains(3600)))');
  ok(g.jade>0 && w.eval('S.jade')===g.jade, '정산 결과에 영옥이 들어 있다 (+'+g.jade+')');

  // ── 6) 저장 왕복 ─────────────────────────────
  w.eval('S.jade = 777; S.ad = { d: bmDay(), n: 4, s: { fate: 2 }, L: 2 }');
  w.eval('saveNow()');
  const d = JSON.parse(w.localStorage.getItem('wuxia1'));
  ok(d.jade===777 && d.ad && d.ad.n===4 && d.ad.L===2, '저장에 영옥·광고 기록이 담긴다');
  w.eval('S.jade = 0; S.ad = null');
  w.eval('applySave(' + JSON.stringify(d) + ')');
  ok(w.eval('S.jade')===777, '불러오면 영옥이 돌아온다');
  ok(w.eval('S.ad && S.ad.n')===4 && w.eval('S.ad.L')===2, '광고 기록도 돌아온다');
  // 날짜가 바뀌면 리셋
  w.eval('S.ad.d = "1999-1-1"');
  ok(w.eval('adState().n')===0 && w.eval('adLeft("fate")')===w.eval('BM.slots.fate.n'), '날짜가 바뀌면 횟수가 다시 찬다');

  // ── 7) 상점 시트 ─────────────────────────────
  w.document.getElementById('shopb').click();
  ok(w.document.getElementById('gpanel').classList.contains('show'), 'HUD + 를 누르면 상점이 열린다');
  const rows = w.document.querySelectorAll('#gbody .grow').length;
  ok(rows===w.eval('BM.ladder.length'), '사다리 줄 '+rows+'개 (계단 '+w.eval('BM.ladder.length')+')');
  const slots = w.document.querySelectorAll('#gbody .gslot').length;
  ok(slots===Object.keys(w.eval('BM.slots')).length, '광고 자리 '+slots+'칸');
  w.document.getElementById('gclose').click();
  ok(!w.document.getElementById('gpanel').classList.contains('show'), '✕ 로 닫힌다');

  // ── 8) 장비 소환 (v2.96.1) ─────────────────────
  w.eval('S.jade = 0; S.pity = 0; S.summons = 0');
  ok(w.eval('eqSummon(1)')===null, '영옥이 없으면 못 뽑는다');
  w.eval('S.jade = BM.summon.cost');
  const one = w.eval('JSON.stringify(eqSummon(1))');
  ok(one && one!=='null' && JSON.parse(one).length===1, '1회 소환 → '+one);
  ok(w.eval('S.jade')===0, '1회 값만큼 빠진다');
  w.eval('S.jade = BM.summon.cost10');
  const ten = JSON.parse(w.eval('JSON.stringify(eqSummon(BM.summon.n10))'));
  ok(ten && ten.length===w.eval('BM.summon.n10'), '10연 → '+(ten?ten.length:0)+'개');
  ok(w.eval('S.jade')===0 && w.eval('BM.summon.cost10') < w.eval('BM.summon.cost * BM.summon.n10'), '10연이 낱개보다 싸다');
  ok(w.eval('S.summons')===1+w.eval('BM.summon.n10'), '소환 누계 '+w.eval('S.summons'));
  // 등급 범위 — 일반(0)·초월(6)은 안 나온다
  w.eval('S.jade = BM.summon.cost * 300; window.__gs = {}');
  w.eval('for (let i=0;i<300;i++){ const o = eqSummon(1); if(o) for(const it of o) window.__gs[it.g]=(window.__gs[it.g]|0)+1; }');
  const gs = JSON.parse(w.eval('JSON.stringify(window.__gs)'));
  ok(!gs['0'] && !gs['6'], '300회에 일반·초월은 안 나온다 (등급 분포 '+JSON.stringify(gs)+')');
  // 천장 — 영웅 이상 없이 pity 를 넘길 수 없다
  w.eval('S.jade = 1e9; S.pity = BM.summon.pity - 1');
  const forced = JSON.parse(w.eval('JSON.stringify(eqSummon(1))'));
  ok(forced[0].g >= w.eval('BM.summon.pityG'), '천장 직전 1회는 '+w.eval('EQUIP.grades[BM.summon.pityG].n')+' 이상 (나온 등급 '+forced[0].g+')');
  ok(w.eval('S.pity')===0, '영웅 이상이 나오면 천장이 0 으로');
  let maxPity = 0;
  w.eval('S.pity = 0; window.__mp = 0; for (let i=0;i<400;i++){ eqSummon(1); if (S.pity > window.__mp) window.__mp = S.pity; }');
  maxPity = w.eval('window.__mp');
  ok(maxPity < w.eval('BM.summon.pity'), '400회 동안 천장 카운터가 '+w.eval('BM.summon.pity')+' 에 닿지 않는다 (최대 '+maxPity+')');
  // 주머니로 들어가 도감이 받는다
  const before = w.eval('codexCount()');
  w.eval('S.jade = BM.summon.cost10; eqSummon(BM.summon.n10)');
  ok(w.eval('codexCount()') >= before, '뽑은 것이 주머니·도감으로 간다 ('+before+' → '+w.eval('codexCount()')+')');
  // 저장 왕복
  w.eval('S.pity = 4; S.summons = 77; saveNow()');
  const d2 = JSON.parse(w.localStorage.getItem('wuxia1'));
  ok(d2.pity===4 && d2.summons===77, '천장·누계가 저장된다');
  // 시트에 소환 구역이 그려지는가
  w.eval('S.jade = 5000'); w.document.getElementById('shopb').click();
  ok(w.document.querySelectorAll('#gbody .gsb').length===2, '소환 버튼 둘 (1회·10연)');
  ok(/\uBC88 \uC548\uC5D0/.test(w.document.querySelector('#gbody .gpity').textContent), '천장을 글자로 보여 준다: '+w.document.querySelector('#gbody .gpity').textContent);
  w.document.querySelectorAll('#gbody .gsb')[0].click();
  ok(w.document.querySelectorAll('#gbody .gres .gitem').length===1, '뽑으면 결과 칸이 늘어선다');
  w.document.getElementById('gclose').click();

  ok(errs.length===0, '런타임 오류 0'+(errs.length?': '+errs[0]:''));
  console.log(bad? '\n★ 실패 '+bad+'건' : '\n전부 통과');
  process.exit(bad?1:0);
}, 400);
