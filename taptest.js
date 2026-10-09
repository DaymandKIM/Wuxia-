/* 느린 탭 검사 (v3.0) — jsdom 이 못 잡는 것을 **크로뮴 실기**로 본다.
   1) #ui 는 pointer-events:none 이라 auto 를 안 준 단추는 캔버스가 탭을 먹는다
   2) 패널을 초마다 다시 만들면(innerHTML) pointerdown~click 사이에 노드가 바뀌어 click 이 사라진다
   손가락처럼 300ms 눌러 본다. NOHOLD=1 로 가드를 끄고 비교할 수 있다.
   크로뮴 경로는 PW_CHROME 로 바꾼다. node taptest.js */
const {chromium}=require('playwright-core');
const EXE = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+require('path').resolve(__dirname,'dist/wuxia.html'));
  await p.waitForTimeout(4000);
  for(const id of ['tstart','ok','oclose']){ const el=await p.$('#'+id); if(el) try{await el.click({timeout:800});}catch(e){} }
  await p.waitForTimeout(2500);
  if (process.env.NOHOLD) await p.evaluate(()=>{ UITAP.hold = 0; });
  await p.evaluate(()=>{ openQuest(); });
  await p.waitForTimeout(500);
  await p.evaluate(()=>{ window.__rb=0; const b=document.getElementById('qbody');
    const d=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
    Object.defineProperty(b,'innerHTML',{set(v){ window.__rb++; d.set.call(this,v); }, get(){ return d.get.call(this); }}); });
  const k0 = await p.evaluate(()=>S.totalKills|0);
  let okN=0, tries=0;
  const tabs=['week','login','day'];
  for(let i=0;i<12;i++){
    const want = tabs[i%3];
    const el = await p.$('#qbody .qtab[data-t="'+want+'"]');
    if(!el){ console.log('탭 없음 '+want); continue; }
    const bx = await el.boundingBox(); if(!bx) continue;
    await p.mouse.move(bx.x+bx.width/2, bx.y+bx.height/2);
    await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
    await p.waitForTimeout(220);
    const cur = await p.evaluate(()=>dqTab);
    tries++; if (cur===want) okN++;
  }
  // 배속 버튼 — 눌러 칸이 도는지 (v2.99 는 pointer-events 가 없어 아예 안 눌렸다)
  await p.evaluate(()=>closeSheets());
  await p.waitForTimeout(400);
  const seq=[];
  for(let i=0;i<3;i++){ seq.push(await p.$eval('#spdbtn b',e=>e.textContent));
    try{ await p.click('#spdbtn',{timeout:3000}); }catch(e){ seq.push('★안 눌림'); break; }
    await p.waitForTimeout(400); }
  console.log('배속 칸 '+seq.join(' → '));
  if (seq.indexOf('★안 눌림')>=0) errs.push('배속 버튼이 안 눌린다');
  const k1 = await p.evaluate(()=>S.totalKills|0), rb = await p.evaluate(()=>window.__rb|0);
  console.log('처치 '+(k1-k0)+' · qbody 재생성 '+rb+'회');
  console.log((process.env.NOHOLD?'[가드 끔] ':'[가드 켬] ')+'과제 느린 탭 '+okN+'/'+tries+' 먹힘');
  console.log('오류:',errs.length?errs[0]:'없음');
  await b.close();
})();
