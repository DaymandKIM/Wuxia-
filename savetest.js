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
    // 저장 초기화 버튼 — 다른 핸들러가 덮어쓴 사고가 있었다 (시험 패널 안에 있다)
    w.document.getElementById('tbtn').click();
    w.document.getElementById('treset').click();
    ok(navs.length>0 && Number.isInteger(w.eval('S.zi')),
      '저장 초기화 버튼 → 새로고침 시도 (S.zi='+w.eval('S.zi')+')');
    w.document.getElementById('tclose').click();
    ok(errs.length===0,'런타임 오류 0 (새 게임)'+(errs.length?': '+errs[0]:''));

    // ── 2) 3시간 전 저장을 불러온다 ────────────────────
    const past=JSON.stringify({v:1,at:Date.now()-3*3600*1000,
      zi:0,stage:4,kills:5,best:4,unlocked:1,totalKills:100,downs:2});
    const {w:w2,errs:e2}=boot(past);
    setTimeout(()=>{
      const S2=w2.eval('S');
      // 타이틀 화면(v2.65)이 복귀 카드를 걷힐 때까지 미룬다 — 누른 셈 친다
      if (typeof w2.closeTitle === 'function') w2.closeTitle();
      // v2.95.6 — 입산 뒤 로딩 화면이 뜨고, **바가 다 차야** 복귀 카드가 나온다.
      // jsdom 은 그림을 decode 하지 않아 바가 0% 라 안 끝난다 → 다 찬 셈 친다
      if (typeof w2.loadSkip === 'function') w2.loadSkip();
      ok(S2.zi===0 && S2.stage===4,'3시간 오프라인: 단계는 그대로 (죽림 '+S2.stage+'단계 유지 — 진행은 직접)');
      ok(S2.totalKills>100,'제자리 사냥 정산: 처치 100 → '+S2.totalKills);
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
        ok(b.totalKills===a.totalKills && b.silver===a.silver,
          '상한 8시간: 8h='+a.totalKills+'처치·은자'+a.silver+' · 24h='+b.totalKills+'처치·은자'+b.silver);
        ok(a.totalKills>1000,'8시간 정산이 넉넉하다: '+a.totalKills+'처치');
        ok(a.stage===1 && a.zi===0,'상한 케이스도 단계는 그대로');

        // ── 3.5) 앱 전환 복귀 정산 — 모바일은 페이지를 다시 로드하지 않는다
        //         (hidden→visible 사이가 길면 그 자리에서 정산해야 한다)
        const dv=w2.eval(`(function(){
          const s0=S.silver;
          Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});
          document.dispatchEvent(new Event('visibilitychange'));
          hiddenAt = Date.now() - 2*3600*1000;
          Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
          document.dispatchEvent(new Event('visibilitychange'));
          return { d:S.silver-s0, shown:document.getElementById('opanel').classList.contains('show') };
        })()`);
        ok(dv.d>0 && dv.shown,'앱 전환 복귀(2시간)에도 정산·패널이 뜬다 (은자 +'+dv.d+')');

        // ── 4) 깨진 저장은 버린다 ───────────────────────
        const {w:w4,errs:e4}=boot('{깨진 json');
        setTimeout(()=>{
          const S4=w4.eval('S');
          ok(S4.zi===0 && S4.stage===1 && S4.totalKills===0,'깨진 저장 → 새로 시작');
          ok(e4.length===0,'런타임 오류 0 (깨진 저장)'+(e4.length?': '+e4[0]:''));

          // ── 5) 저장 코드 · 막힌 저장소 (v2.90.2 "저장이 안 됨") ───────────
          // 코드 왕복: 뽑은 코드를 새 창에 불러오면 은자·단계·업적이 그대로
          w4.eval('S.silver=98765; S.totalKills=321; S.achv={kills:2}; S.zi=1; S.stage=3;');
          const code=w4.eval('saveCode()');
          ok(typeof code==='string' && code.startsWith('WX1.') && !/[^A-Za-z0-9+/=.]/.test(code),'저장 코드는 WX1. + base64 ('+code.length+'자)');
          ok(w4.eval('parseCode("아무 글")')===null && w4.eval('parseCode("WX1.@@@")')===null,'엉뚱한 글·깨진 코드는 거부');
          const {w:w5,errs:e5}=boot();
          setTimeout(()=>{
            const got=w5.eval('loadCode('+JSON.stringify(code)+')');
            const S5=w5.eval('S');
            ok(got===true && S5.silver===98765 && S5.totalKills===321 && S5.achv.kills===2 && S5.zi===1 && S5.stage===3,
              '코드 불러오기 → 은자 '+S5.silver+' · 폐촌 '+S5.stage+'단계 · 업적 백인참 '+S5.achv.kills+'단계');
            ok(w5.eval('loadCode("WX1.zzz")')===false,'못 읽는 코드는 false — 진행 그대로');
            // 시트: 열면 글상자에 코드, 불러오기 버튼이 loadCode를 부른다
            w5.document.getElementById('menubtn').click(); w5.document.getElementById('mcode').click();
            ok(w5.document.getElementById('cpanel').classList.contains('show') && w5.document.getElementById('ctext').value.startsWith('WX1.'),'≡ → 저장 코드 시트: 글상자에 코드');
            w5.document.getElementById('cclose').click();
            ok(!w5.document.getElementById('cpanel').classList.contains('show'),'시트 닫힘');
            // 막힌 저장소: setItem이 던지면 saveNow가 false, ≡ 메뉴 '지금 저장'이 "막힘"
            w5.eval('Object.defineProperty(window,"localStorage",{value:{getItem(){return null;},setItem(){throw new Error("blocked");},removeItem(){}}})');
            ok(w5.eval('saveNow()')===false && w5.eval('saveOk')===false,'저장소가 막히면 saveNow=false');
            w5.document.getElementById('menubtn').click();
            ok(w5.document.querySelector('#msave .mv').textContent==='막힘','≡ 메뉴 "지금 저장"에 막힘 표시');
            w5.document.getElementById('msave').click();
            ok(w5.document.getElementById('toast').textContent.includes('저장 못 했다'),'지금 저장 → "저장 못 했다" 토스트 (거짓 "저장했다" 없음)');
            ok(e5.length===0,'런타임 오류 0 (저장 코드)'+(e5.length?': '+e5[0]:''));
            console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
            process.exit(bad?1:0);
          },900);
        },900);
      },900);
    },900);
  },1200);
}
