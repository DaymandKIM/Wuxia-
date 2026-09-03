/* 저장·오프라인 진행 검증 — jsdom 실제 DOM에서 돌린다.
   1) 자동 저장이 localStorage에 남는가
   2) 오래된 저장을 불러오면 오프라인 진행이 적용되는가 (상한 8시간 포함)
   3) 돌아온 패널이 뜨고, 네 가지 방법(버튼·바깥·ESC)으로 닫히는가
   4) 깨진 저장은 버리고 새로 시작하는가
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
  const errs=[],navs=[];                             // navs: location.reload 시도 횟수
  const vc=new (require('jsdom').VirtualConsole)();
  vc.on('jsdomError',e=>{ if(e.message.includes('navigation')) navs.push(1); });
  const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
    pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    Object.defineProperty(w,'devicePixelRatio',{value:3});
    w.addEventListener('error',e=>errs.push(e.message));
    if(preSave!==undefined) w.localStorage.setItem('wuxia1',preSave);
  }});
  return {w:dom.window,errs,navs};
}

let bad=0;
const ok=(cond,msg)=>{ console.log((cond?'  ':'  ★실패 ')+msg); if(!cond)bad++; };

// ── 1) 새 게임 → 자동 저장 ───────────────────────────
{
  const {w,errs,navs}=boot();
  setTimeout(()=>{
    w.eval('saveNow()');
    const d=JSON.parse(w.localStorage.getItem('wuxia1'));
    ok(d && d.v===1 && d.zi===0 && d.stage>=1 && typeof d.at==='number',
      '새 게임 저장: '+JSON.stringify({zi:d.zi,stage:d.stage,kills:d.kills}));
    // 저장 초기화 버튼 — 단계 이동 핸들러(.sb)가 덮어쓴 사고가 있었다
    w.document.getElementById('zbtn').click();
    w.document.getElementById('zreset').click();
    ok(navs.length>0 && Number.isInteger(w.eval('S.zi')),
      '저장 초기화 버튼 → 새로고침 시도 (S.zi='+w.eval('S.zi')+')');
    w.document.getElementById('zclose').click();
    ok(errs.length===0,'런타임 오류 0 (새 게임)'+(errs.length?': '+errs[0]:''));

    // ── 2) 3시간 전 저장을 불러온다 ────────────────────
    const past=JSON.stringify({v:1,at:Date.now()-3*3600*1000,
      zi:0,stage:4,kills:5,best:4,unlocked:1,totalKills:100,downs:2});
    const {w:w2,errs:e2}=boot(past);
    setTimeout(()=>{
      const S2=w2.eval('S');
      ok(S2.zi*10+S2.stage>4 || S2.zi>0,'3시간 오프라인: 4단계 → '+
        w2.eval('zone()').n+' '+S2.stage+'단계 (총처치 '+S2.totalKills+')');
      ok(S2.totalKills>100,'처치가 늘었다: 100 → '+S2.totalKills);
      ok(S2.silver>0,'은자 정산: +'+S2.silver.toLocaleString()+' (예전 저장에 은자 없음 → 0에서 시작)');
      const op=w2.document.getElementById('opanel');
      ok(op.classList.contains('show'),'돌아온 패널이 떴다: "'+
        w2.document.getElementById('otime').textContent+'"');
      // 닫기 세 가지
      w2.document.getElementById('obtn').click();
      ok(!op.classList.contains('show'),'버튼으로 닫힌다');
      op.classList.add('show'); op.click();
      ok(!op.classList.contains('show'),'바깥 클릭으로 닫힌다');
      op.classList.add('show');
      w2.dispatchEvent(new w2.KeyboardEvent('keydown',{key:'Escape'}));
      ok(!op.classList.contains('show'),'ESC로 닫힌다');
      ok(e2.length===0,'런타임 오류 0 (불러오기)'+(e2.length?': '+e2[0]:''));

      // ── 3) 24시간 = 상한 8시간과 같아야 한다 ─────────
      const mk=h=>JSON.stringify({v:1,at:Date.now()-h*3600*1000,
        zi:0,stage:1,kills:0,best:1,unlocked:1,totalKills:0,downs:0});
      const {w:w8}=boot(mk(8)); const {w:w24}=boot(mk(24));
      setTimeout(()=>{
        const a=w8.eval('S'), b=w24.eval('S');
        ok(b.totalKills===a.totalKills && b.zi===a.zi && b.stage===a.stage,
          '상한 8시간: 8h='+a.totalKills+'처치 '+a.zi+'구역'+a.stage+'단계 · 24h='+
          b.totalKills+'처치 '+b.zi+'구역'+b.stage+'단계');
        ok(a.totalKills>1000,'8시간 진행이 넉넉하다: '+a.totalKills+'처치 (온라인 60분 ≈ 2600)');

        // ── 4) 깨진 저장은 버린다 ───────────────────────
        const {w:w4,errs:e4}=boot('{깨진 json');
        setTimeout(()=>{
          const S4=w4.eval('S');
          ok(S4.zi===0 && S4.stage===1 && S4.totalKills===0,'깨진 저장 → 새로 시작');
          ok(e4.length===0,'런타임 오류 0 (깨진 저장)'+(e4.length?': '+e4[0]:''));
          console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
          process.exit(bad?1:0);
        },900);
      },900);
    },900);
  },1200);
}
