/* ── 문파 무공도 (스킬트리) ────────────────────────────
   문파 = 탭, 탭 = 거미줄 노드망. 경지 포인트로만 개방(성 1당 +1).
   패시브 노드는 treeBonus(key)로 전투 수식에 합산되고(수련과 별개),
   무공 마디는 S.arts[k]=1로 기존 무공 시스템을 그대로 탄다.
   숫자·노드는 docs/설계-스킬트리.md 계약을 따른다. */

const SKILLTREE = { ptsPerStar: 1 };   // 경지 성 1당 무공점

// TREE[문파키] = [노드…]. bamboo=청죽문은 여기 두고, 유명 문파는
// docs/트리안/*.js 초안을 검수해 아래에 채워 넣는다(v2.45 진행).
const TREE = {
  bamboo: [
    { id:'b0', x:180,y:44, k:'root', g:'竹', n:'청죽 입문', h:'靑竹入門', c:0, eff:{},
      d:'<span class="eff">청죽문의 길이 열린다.</span> 여기서 가지가 뻗어 나간다.' },
    { id:'b1', x:96, y:120, k:'minor', n:'죽엽 보법', h:'竹葉步', c:1, need:['b0'], eff:{castSpd:6},
      d:'<span class="eff">시전 속도 +6%</span> · 잎을 밟듯 가벼이 선다.' },
    { id:'b2', x:264,y:120, k:'minor', n:'청죽 호흡', h:'靑竹吐納', c:1, need:['b0'], eff:{passiveAmp:8},
      d:'<span class="eff">심법 효과 +8%</span> · 곧게 숨을 고른다.' },
    { id:'b3', x:52, y:196, k:'minor', n:'경신 소보', h:'輕身小步', c:1, need:['b1'], eff:{spd:6},
      d:'<span class="eff">이동 속도 +6%</span>' },
    { id:'b4', x:180,y:196, k:'major', g:'竹', n:'청죽공', h:'靑竹功', c:2, need:['b1','b2'], eff:{art:'chulwoo'},
      d:'<span class="eff">심법</span> · 지닌 채 싸우면 내공이 는다. 청죽문의 본(本).' },
    { id:'b5', x:308,y:196, k:'minor', n:'죽로 조식', h:'竹露調息', c:1, need:['b2'], eff:{regen:7},
      d:'<span class="eff">회복 +7%</span>' },
    { id:'b6', x:96, y:272, k:'minor', n:'청강결', h:'靑剛訣', c:1, need:['b3','b4'], eff:{artPower:7},
      d:'<span class="eff">초식 위력 +7%</span>' },
    { id:'b7', x:264,y:272, k:'minor', n:'죽운결', h:'竹韻訣', c:1, need:['b4','b5'], eff:{cdr:6},
      d:'<span class="eff">초식 재사용 -6%</span>' },
    { id:'b8', x:44, y:348, k:'minor', n:'예풍결', h:'銳風訣', c:1, need:['b6'], eff:{crit:5},
      d:'<span class="eff">치명 확률 +5%</span>' },
    { id:'b9', x:180,y:348, k:'minor', n:'죽심 단련', h:'竹心鍛', c:1, need:['b6','b7'], eff:{hp:8},
      d:'<span class="eff">체력 +8%</span>' },
    { id:'b10',x:316,y:348, k:'minor', n:'질풍결', h:'疾風訣', c:1, need:['b7'], eff:{aspd:5},
      d:'<span class="eff">공격 속도 +5%</span>' },
    { id:'b11',x:96, y:424, k:'minor', n:'경죽 권세', h:'勁竹拳勢', c:1, need:['b8','b9'], eff:{atk:7},
      d:'<span class="eff">공격력 +7%</span>' },
    { id:'b12',x:264,y:424, k:'minor', n:'유엽 조식', h:'柔葉調息', c:1, need:['b9','b10'], eff:{castSpd:6},
      d:'<span class="eff">시전 속도 +6%</span>' },
    { id:'b13',x:56, y:500, k:'minor', n:'죽뢰결', h:'竹雷訣', c:1, need:['b11'], eff:{artPower:8},
      d:'<span class="eff">초식 위력 +8%</span>' },
    { id:'b14',x:180,y:500, k:'minor', n:'만죽 심법', h:'萬竹心法', c:2, need:['b11','b12'], eff:{passiveAmp:10},
      d:'<span class="eff">심법 효과 +10%</span> · 대숲이 바람을 머금듯.' },
    { id:'b15',x:304,y:500, k:'minor', n:'청죽 조식', h:'靑竹調息', c:1, need:['b12'], eff:{regen:8},
      d:'<span class="eff">회복 +8%</span>' },
    { id:'b16',x:112,y:576, k:'minor', n:'죽영결', h:'竹影訣', c:1, need:['b13','b14'], eff:{cdr:7},
      d:'<span class="eff">초식 재사용 -7%</span>' },
    { id:'b17',x:248,y:576, k:'minor', n:'죽화결', h:'竹華訣', c:1, need:['b14','b15'], eff:{crit:6},
      d:'<span class="eff">치명 확률 +6%</span>' },
    { id:'b18',x:180,y:656, k:'keystone', g:'萬', n:'청죽만리', h:'靑竹萬里', c:3, need:['b16','b17'],
      eff:{artPower:40, spd:-10},
      d:'<span class="eff">비전</span> · 초식 위력 +40%. 그 대신 몸놀림이 무거워진다(이동 −10%).' },
  ],
  sorim:[], mudang:[], hwasan:[], ami:[], gaebang:[], dangmun:[], magyo:[],
};

const treeNodes = s => TREE[s] || [];
const treeNode  = (s,id) => (TREE[s]||[]).find(n=>n.id===id);
const treeHas   = (s,id) => !!(S.tree[s] && S.tree[s][id]);

// 교차 노드: 다른 문파 조건까지 충족돼야 열린다
function treeNeedOk(s,n){
  if (n.need && !n.need.every(id=>treeHas(s,id))) return false;
  if (n.cross && !(S.tree[n.cross] && S.tree[n.cross][n.crossNode])) return false;
  return true;
}
const treeAvail = (s,n) => !treeHas(s,n.id) && treeNeedOk(s,n);

// 경지 포인트 — 누적 성 개수 × ptsPerStar. 쓴 점은 익힌 노드 비용의 합.
const skillPtsTotal = () => realmLv() * SKILLTREE.ptsPerStar;
function skillPtsSpent(){
  let c=0;
  for (const s in S.tree) for (const id in S.tree[s]){ const n=treeNode(s,id); if(n) c += n.c||0; }
  return c;
}
const skillPtsLeft = () => skillPtsTotal() - skillPtsSpent();

// 무공 마디 = 기존 무공 습득(경지 조건 대신 트리로). 되돌리면 회수.
function treeApplyArt(n, on){
  if (!n.eff || !n.eff.art) return;
  const k = n.eff.art;
  if (!S.treeArt) S.treeArt = {};
  if (on){ S.arts[k] = 1; S.treeArt[k] = 1; }
  else if (S.treeArt[k]){ delete S.treeArt[k]; delete S.arts[k]; }
}
// 저장에서 돌아온 뒤 — 익힌 무공 마디의 습득 상태를 복원한다
function treeReapply(){
  S.treeArt = {};
  for (const s in S.tree) for (const id in S.tree[s]){
    const n=treeNode(s,id); if(n) treeApplyArt(n, true);
  }
}

function treeAlloc(s,id){
  const n=treeNode(s,id);
  if (!n || treeHas(s,id) || !treeNeedOk(s,n) || skillPtsLeft() < (n.c||0)) return false;
  if (!S.tree[s]) S.tree[s] = {};
  S.tree[s][id] = 1;
  treeApplyArt(n, true);
  return true;
}
function treeDealloc(s,id){
  const n=treeNode(s,id);
  if (!n || !treeHas(s,id) || n.k==='root') return false;
  // 뒤 마디가 이 노드에 기대면 못 되돌린다
  for (const m of treeNodes(s))
    if (treeHas(s,m.id) && m.need && m.need.includes(id)) return false;
  // 다른 문파의 교차 노드가 이 노드를 조건으로 삼고 있으면 못 되돌린다
  for (const os in TREE) for (const m of treeNodes(os))
    if (m.cross===s && m.crossNode===id && treeHas(os,m.id)) return false;
  delete S.tree[s][id];
  treeApplyArt(n, false);
  return true;
}

// 트리 패시브 합 — 같은 키의 % 를 모두 더한다 (수련과 별개 축)
function treeBonus(key){
  let sum=0;
  for (const s in S.tree) for (const id in S.tree[s]){
    const n=treeNode(s,id);
    if (n && n.eff && typeof n.eff[key]==='number') sum += n.eff[key];
  }
  return sum;
}
