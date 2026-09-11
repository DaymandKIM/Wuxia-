/* 낭인 검증 — jsdom 실제 실행.
   1) 폐촌에 낭인이 등장하는가
   2) 근접 베기가 실제로 아픈가
   3) 거리가 뜨면 병을 던지는가 (그림 탄 + 시전 동작)
   4) 병이 명중하면 먼지가 터지는가
   5) 프레임 에셋이 전부 있는가
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
const errs=[];
const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
  pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  w.Image=class{ set src(v){this._s=v;} get src(){return this._s;}
    get complete(){return true;} get naturalWidth(){return 18;} get naturalHeight(){return 15;} };
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window;
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

setTimeout(()=>{
  // 5) 에셋 존재 — 선언한 프레임이 전부 파일로 있는가
  const missing=w.eval(`(function(){
    const miss=[];
    for(const a in FOES.ronin.anim)
      for(const f of FOES.ronin.anim[a])
        if(!ASSET['ronin_'+f]) miss.push(f);
    if(!ASSET.ronin_shot) miss.push('shot');
    if(!ASSET.ronin_dust) miss.push('dust');
    return miss.join(',');
  })()`);
  ok(missing==='','낭인 에셋 전부 존재'+(missing?' (빠짐: '+missing+')':''));

  // 1) 폐촌 등장 목록
  ok(w.eval('ZONEFOE.village.includes("ronin")'),'폐촌 등장 목록에 낭인');

  // 무대 준비 — 폐촌 1단계, 낭인 하나만
  w.eval(`gotoZone(1,1); S.intro=0; S.foes.length=0; spawnFoe();
    S.foes[0].k='ronin'; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
    P.hpMax=100000; P.hp=100000;`);

  // 2) 근접 베기
  w.eval('S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].cd=0; S.foes[0].thCd=999;');
  const hp0=w.eval('P.hp');
  setTimeout(()=>{
    ok(w.eval('P.hp')<hp0,'근접 베기가 아프다 ('+Math.round(hp0-w.eval('P.hp'))+' 피해)');

    // 3) 던지기 — 거리 120, 쿨 0. 먼지는 순간이라 생성 자체를 계수한다
    w.eval(`window.__dust=0;
      const _pf=S.fx.push.bind(S.fx);
      S.fx.push=function(e){ if(e&&e.k==="imgburst") window.__dust++; return _pf(e); };
      S.foes[0].x=P.x+120; S.foes[0].y=P.y;
      S.foes[0].thCd=0; S.foes[0].cd=99; S.foes[0].atkT=0;`);
    setTimeout(()=>{
      const threw=w.eval('S.shots.some(b=>b.img==="ronin_shot") || S.fx.some(e=>e.k==="imgburst")');
      ok(threw,'병을 던졌다 (그림 탄 발사)');
      // 4) 명중 먼지 — 탄이 도달할 때까지 기다린다
      setTimeout(()=>{
        ok(w.eval('window.__dust')>0,'병이 명중해 먼지가 터졌다 ('+w.eval('window.__dust')+'회)');
        ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
        console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
        process.exit(bad?1:0);
      },1300);
    },900);
  },1600);
},2500);
