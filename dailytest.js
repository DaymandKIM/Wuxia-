/* 일일·주간 과제 + 접속 보상 검증 (v2.97.2)
   1) 진행도는 누계 스냅샷 차이로 잰다 — 날짜가 바뀌면 기준점이 다시 잡힌다
   2) 점수는 **다 채운 항목**의 합이고, 사다리 계단은 순서대로 하나씩
   3) 접속 보상 — 하루 한 칸, **연속을 요구하지 않는다**
   4) 보상 지급(영옥·은자 분당 비례·조각·장비)
   5) 저장 왕복 · 패널
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
const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
  pretendToBeVisual:true,virtualConsole:new (require('jsdom').VirtualConsole)(),beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  Object.defineProperty(w,'devicePixelRatio',{value:2});
  w.addEventListener('error',e=>errs.push(e.message));
}});
const errs=[]; const w=dom.window;
let bad=0; const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

setTimeout(()=>{
  if (typeof w.closeTitle==='function') w.closeTitle();
  if (typeof w.loadSkip==='function') w.loadSkip();

  // ── 1) 진행도 = 누계 차이 ──────────────────
  w.eval('S.dq = null; S.wq = null; S.totalKills = 1000; dqState()');
  ok(w.eval('dqProg(dqState(), DAILY.day[0])')===0, '기준점을 잡은 직후 진행도 0 (누계 1000 이어도)');
  w.eval('S.totalKills += 30');
  ok(w.eval('dqProg(dqState(), DAILY.day[0])')===30, '30 잡으면 진행도 30');
  w.eval('S.totalKills += 1e6');
  ok(w.eval('dqProg(dqState(), DAILY.day[0])')===w.eval('DAILY.day[0].g'), '목표에서 잘린다');
  // 과제 항목이 전부 "놀다 보면 되는 것" 인가 — 접속·구매형 키가 없어야 한다
  const keys = JSON.parse(w.eval('JSON.stringify(DAILY.day.map(x=>x.k).concat(DAILY.week.map(x=>x.k)))'));
  ok(!keys.some(k=>/login|open|buy|watch|ad/.test(k)), '과제에 접속·구매·광고 강제 항목이 없다 ('+[...new Set(keys)].join(',')+')');

  // ── 2) 점수와 사다리 ───────────────────────
  w.eval('S.dq = null; S.totalKills = 0; S.clears = 0; S.merges = 0; S.levels = 0; S.summons = 0; S.elders = 0; dqState()');
  ok(w.eval('dqPoints(false)')===0, '아무것도 안 하면 0점');
  w.eval('S.totalKills = DAILY.day[0].g');
  ok(w.eval('dqPoints(false)')===w.eval('DAILY.day[0].p'), '한 항목 완료 → '+w.eval('dqPoints(false)')+'점');
  ok(w.eval('dqReady(false)')===true, '첫 계단이 열린다');
  w.eval('S.jade = 0');
  const st1 = JSON.parse(w.eval('JSON.stringify(dqClaim(false))'));
  ok(st1 && w.eval('dqDone(false)')===1, '첫 계단 수령 '+JSON.stringify(st1));
  ok(w.eval('dqClaim(false)')===null, '점수가 모자라면 다음 계단은 안 받아진다');
  // 전부 채우면 전부 열린다
  w.eval('S.clears = 999; S.merges = 999; S.levels = 999; S.summons = 999; S.elders = 999');
  let n = 0; while (w.eval('dqClaim(false)') !== null) { n++; if (n > 9) break; }
  ok(w.eval('dqDone(false)')===w.eval('DAILY.dayLadder.length'), '전부 채우면 남은 계단이 다 열린다');
  ok(w.eval('dqReady(false)')===false, '다 받으면 알림점이 꺼진다');
  // 날짜가 바뀌면 처음부터
  w.eval('S.dq.d = "1999-1-1"');
  ok(w.eval('dqPoints(false)')===0 && w.eval('dqDone(false)')===0, '날짜가 바뀌면 과제가 다시 선다');
  // 주간은 주 키로 선다
  w.eval('S.wq = null; wqState()');
  ok(w.eval('S.wq.w')===w.eval('dqWeek()'), '주간은 주 키로 선다');
  w.eval('S.wq.w = 0');
  ok(w.eval('wqState().w')===w.eval('dqWeek()'), '주가 바뀌면 다시 선다');

  // ── 3) 접속 보상 ──────────────────────────
  w.eval('S.login = null; S.jade = 0');
  ok(w.eval('loginReady()')===true, '첫 접속 보상이 열려 있다');
  w.eval('loginClaim()');
  ok(w.eval('S.login.n')===1 && w.eval('loginReady()')===false, '하루 한 칸 (받은 뒤 잠김)');
  w.eval('S.login.d = "1999-1-1"');
  ok(w.eval('loginReady()')===true, '다음 날 다시 열린다');
  // 연속을 요구하지 않는다 — 며칠 건너뛰어도 n 은 이어진다
  w.eval('loginClaim(); S.login.d = "1990-1-1"');
  ok(w.eval('S.login.n')===2 && w.eval('loginReady()')===true, '며칠 걸러도 다음 칸을 이어 받는다 (n='+w.eval('S.login.n')+')');
  // 7칸을 다 받으면 끝
  w.eval('S.login = { n: DAILY.login.length, d: "1999-1-1" }');
  ok(w.eval('loginReady()')===false && w.eval('loginClaim()')===null, '7칸을 다 받으면 더 없다');
  ok(w.eval('DAILY.login[DAILY.login.length-1].jade') > w.eval('DAILY.login[0].jade'), '7일차가 1일차보다 크다');

  // ── 4) 보상 지급 ──────────────────────────
  w.eval('S.jade = 0; S.silver = 0; S.frag = {}');
  w.eval('grantReward({ jade: 50 })');
  ok(w.eval('S.jade')===50, '영옥 보상');
  const sv0 = w.eval('silverPerMin()');
  w.eval('grantReward({ silverMin: 10 })');
  ok(Math.abs(w.eval('S.silver') - sv0*10) < 2, '은자 보상은 분당 수입 × 분 ('+Math.round(w.eval('S.silver'))+')');
  w.eval('grantReward({ frag: 3 })');
  ok(w.eval('Object.keys(S.frag).length')>0, '조각 보상');
  const cx = w.eval('codexCount()');
  w.eval('grantReward({ box: 1, boxG: 4 })');
  ok(w.eval('codexCount()') >= cx, '장비 보상이 주머니로');

  // ── 5) 저장 왕복 ──────────────────────────
  w.eval('S.clears = 12; S.elders = 3; S.dq = { d: bmDay(), base: { kill: 5 }, L: 1 }; S.login = { n: 4, d: bmDay() }; saveNow()');
  const d = JSON.parse(w.localStorage.getItem('wuxia1'));
  ok(d.clears===12 && d.elders===3 && d.dq && d.dq.L===1 && d.login.n===4, '과제·접속·누계가 저장된다');
  w.eval('S.clears = 0; S.elders = 0; S.dq = null; S.login = null');
  w.eval('applySave(' + JSON.stringify(d) + ')');
  ok(w.eval('S.clears')===12 && w.eval('S.elders')===3 && w.eval('S.login.n')===4, '불러오면 돌아온다');

  // ── 6) 패널 ──────────────────────────────
  w.eval('S.dq = null; S.wq = null; S.login = null');
  w.document.getElementById('menubtn').click();
  w.document.getElementById('mquest').click();
  ok(w.document.getElementById('qpanel').classList.contains('show'), '≡ 과제로 패널이 열린다');
  ok(w.document.querySelectorAll('#qbody .qtab').length===3, '탭 셋 (일일·주간·접속)');
  ok(w.document.querySelectorAll('#qbody .qitem').length===w.eval('DAILY.day.length'), '일일 항목 '+w.eval('DAILY.day.length')+'줄');
  w.document.querySelectorAll('#qbody .qtab')[1].click();
  ok(w.document.querySelectorAll('#qbody .qitem').length===w.eval('DAILY.week.length'), '주간 탭으로 바뀐다');
  w.document.querySelectorAll('#qbody .qtab')[2].click();
  ok(w.document.querySelectorAll('#qbody .qday').length===w.eval('DAILY.login.length'), '접속 탭 '+w.eval('DAILY.login.length')+'칸');
  ok(!!w.document.querySelector('#qbody .qclaim.big'), '오늘 것 받기 버튼');
  w.document.querySelector('#qbody .qclaim.big').click();
  ok(w.eval('S.login.n')===1, '눌러서 받아진다');
  w.document.getElementById('qclose').click();
  ok(!w.document.getElementById('qpanel').classList.contains('show'), '✕ 로 닫힌다');

  ok(errs.length===0, '런타임 오류 0'+(errs.length?': '+errs[0]:''));
  console.log(bad? '\n★ 실패 '+bad+'건' : '\n전부 통과');
  process.exit(bad?1:0);
}, 400);
