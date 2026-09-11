/* 문파 무공도(스킬트리) 엔진 검증 — jsdom 실제 실행.
   "그만큼 스킬을 다 만들고 사용이 가능한가"의 답을 코드로 증명한다:
   1) 패시브 노드가 실제 전투 수식에 먹힌다 (공격 노드 → heroDmg 상승)
   2) 무공 마디를 익히면 그 무공이 습득되고 자동 시전된다
   3) 경지 포인트로만 개방되고, 앞 마디 없이는 못 익힌다(경로 의존)
   4) 되돌리기 — 뒤 마디가 있으면 막히고, 없으면 회수된다
   5) 저장·복원 — 익힌 노드와 무공 마디가 되살아난다
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
function boot(save){
  const dom=new JSDOM(html,{url:'http://wuxia.test/',runScripts:'dangerously',
    pretendToBeVisual:true,beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
    w.Image=class{ set src(v){this._s=v;} get src(){return this._s;}
      get complete(){return true;} get naturalWidth(){return 35;} get naturalHeight(){return 12;} };
    w.addEventListener('error',e=>errs.push(e.message));
    if(save) w.localStorage.setItem('wuxia1', save);
  }});
  return dom.window;
}
let bad=0;
const ok=(c,m)=>{ console.log((c?'  ':'  ★실패 ')+m); if(!c)bad++; };

const w=boot(null);
setTimeout(()=>{
  // 경지를 넉넉히 올려 무공점을 준다
  w.eval('S.rexp=0; while(realmLv()<14) S.rexp=(S.rexp||25)*1.31; S.tree={}; S.arts={}; treeReapply();');
  const pts0=w.eval('skillPtsLeft()');
  ok(pts0>0,'경지 포인트가 주어진다 (무공점 '+pts0+' · 성당 +1)');

  // 3) 경로 의존 — b0(입문) 없이 b11(공격 노드)은 못 익힌다
  ok(w.eval('treeAlloc("bamboo","b11")')===false,'앞 마디 없이는 못 익힌다 (경로 의존)');
  ok(w.eval('treeAlloc("bamboo","b0")')===true,'입문(b0)을 익힌다');

  // 1) 패시브가 전투에 먹힌다 — b0→b1→b6→b8→b9→b11(공격+7%) 경로
  const dmg0=w.eval('heroDmg()');
  for(const id of ['b1','b2','b6','b7','b8','b9','b11'])
    w.eval('S.tree.bamboo.'+id+'=1');   // 경로대로 채운다
  const dmg1=w.eval('heroDmg()');
  ok(w.eval('treeBonus("atk")')>=7,'공격 노드가 treeBonus에 합산된다 (+'+w.eval('treeBonus("atk")')+'%)');
  ok(dmg1>dmg0,'공격 노드가 실제 heroDmg를 올린다 ('+Math.round(dmg0)+' → '+Math.round(dmg1)+')');

  // 시전 속도·재사용도 수식에 닿는지
  w.eval('S.tree.bamboo.b12=1;');   // castSpd 노드
  ok(w.eval('treeBonus("castSpd")')>0,'시전 속도 노드가 합산된다');

  // 2) 무공 마디 — b4=청죽공(심법 chulwoo) 익히면 습득된다
  ok(w.eval('treeAlloc("bamboo","b4")')===true,'무공 마디(청죽공)를 익힌다');
  ok(w.eval('S.arts.chulwoo===1'),'무공 마디를 익히면 그 무공이 습득된다(S.arts)');
  ok(w.eval('S.treeArt.chulwoo===1'),'트리가 준 무공으로 표시된다');
  // 심법이 실제 배수에 반영 (청죽공은 hp 계열 → artMul('hp'))
  ok(w.eval('artMul("hp")')>1,'익힌 심법이 artMul에 반영된다 (hp '+w.eval('artMul("hp").toFixed(3)')+')');

  // 액티브 초식 마디 습득 → 자동 시전 검증 (파공권을 트리로 습득시켜 본다)
  w.eval(`TREE.bamboo.push({id:'bx',x:0,y:900,k:'major',n:'시험초식',h:'',c:2,need:['b0'],eff:{art:'pagong'}});`);
  ok(w.eval('treeAlloc("bamboo","bx")')===true && w.eval('S.arts.pagong===1'),'액티브 초식 마디도 습득된다(파공권)');
  w.eval(`gotoZone(0,3); S.intro=0; S.foes.length=0; spawnFoe();
    S.foes[0].x=P.x+30; S.foes[0].y=P.y; S.foes[0].hp=1e9; S.foes[0].hpMax=1e9;
    P.hp=P.hpMax; P.castT=0; P.castGapT=0; P.artCd={}; S.fx.length=0;
    for(let i=0;i<40;i++) stepArts(1/60);`);
  ok(w.eval('P.artCd.pagong!==undefined'),'습득한 초식이 자동 시전 루프를 탄다 (쿨 진입)');

  // 4) 되돌리기 — b0은 뒤 마디가 많아 못 되돌린다, 잎 노드는 회수된다
  ok(w.eval('treeDealloc("bamboo","b0")')===false,'뒤 마디가 있으면 되돌릴 수 없다');
  const spentA=w.eval('skillPtsSpent()');
  ok(w.eval('treeDealloc("bamboo","b11")')===true,'잎 노드는 되돌려진다');
  ok(w.eval('skillPtsSpent()')<spentA,'되돌리면 무공점이 회수된다');
  // 무공 마디 되돌리면 습득 해제
  w.eval('treeDealloc("bamboo","bx")');
  ok(w.eval('!S.arts.pagong'),'무공 마디를 되돌리면 습득이 해제된다');

  // 5) 저장·복원
  w.eval('saveNow()');
  const save=w.localStorage.getItem('wuxia1');
  const w2=boot(save);
  setTimeout(()=>{
    ok(w2.eval('S.tree.bamboo && S.tree.bamboo.b4===1'),'익힌 노드가 저장·복원된다');
    ok(w2.eval('S.arts.chulwoo===1 && S.treeArt.chulwoo===1'),'무공 마디 습득도 복원된다');
    ok(w2.eval('treeBonus("atk")')>=0,'복원 뒤 treeBonus가 다시 계산된다');
    ok(errs.length===0,'런타임 오류 0'+(errs.length?': '+errs[0]:''));
    console.log(bad?('\n★ 실패 '+bad+'건'):'\n문제 없음');
    process.exit(bad?1:0);
  },1200);
},2500);
