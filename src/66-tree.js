/* ── 문파 무공도 (스킬트리) ────────────────────────────
   문파 = 탭, 탭 = 거미줄 노드망. 경지 포인트로만 개방(성 1당 +1).
   패시브 노드는 treeBonus(key)로 전투 수식에 합산되고(수련과 별개),
   무공 마디는 S.arts[k]=1로 기존 무공 시스템을 그대로 탄다.
   숫자·노드는 docs/설계-스킬트리.md 계약을 따른다. */

const SKILLTREE = { ptsPerStar: 2 };   // 경지 성 1당 무공점

// TREE[문파키] = [노드…]. bamboo=청죽문은 여기 두고, 유명 문파는
// docs/트리안/*.js 초안을 검수해 아래에 채워 넣는다(v2.45 진행).
const TREE = TREEDATA;   // 8문파 182노드 데이터는 65b-treedata.js (생성물·에이전트 통합)

const treeNodes = s => TREE[s] || [];
const treeNode  = (s,id) => (TREE[s]||[]).find(n=>n.id===id);
// v2.54.2 — 무공 습득은 '배우기' 버튼(63-arts)만 한다. 트리(심화)는 무공을
// 주지 않고, 이미 배운 무공의 마디를 '익힘'으로 비추기만 한다. 안 그러면
// 트리 마디를 켜는 순간 안 배운 무공이 시전됐다("배우기도 전에 쓰네").
const treeArtNode = n => !!(n && n.eff && n.eff.art);
// 무공 마디는 그 무공을 배웠으면(어느 경로든 S.arts) 무공점 없이 익힘으로 보인다.
const treeGift  = (s,id) => { const n=treeNode(s,id);
  return treeArtNode(n) && !!S.arts[n.eff.art]; };
const treeHas   = (s,id) => !!(S.tree[s] && S.tree[s][id]) || treeGift(s,id);

// 교차 노드: 다른 문파 조건까지 충족돼야 열린다
function treeNeedOk(s,n){
  if (n.need && !n.need.every(id=>treeHas(s,id))) return false;
  if (n.cross && !(S.tree[n.cross] && S.tree[n.cross][n.crossNode])) return false;
  return true;
}
// 무공 마디는 트리로 켤 수 없다 — 무공 탭 '배우기'로 배우면 자동으로 익힘 표시.
const treeAvail = (s,n) => !treeArtNode(n) && !treeHas(s,n.id) && treeNeedOk(s,n);

// 경지 포인트 — 누적 성 개수 × ptsPerStar. 쓴 점은 익힌 트리 노드 + 스킬 심화 특성 비용의 합.
const skillPtsTotal = () => realmLv() * SKILLTREE.ptsPerStar;
function skillPtsSpent(){
  let c=0;
  for (const s in S.tree) for (const id in S.tree[s]){ const n=treeNode(s,id); if(n) c += n.c||0; }
  for (const k in (S.traits||{})) for (const id in S.traits[k]){          // 심화 특성도 같은 무공점을 쓴다
    const t = traitDefs(k).find(x=>x.id===id); if(t) c += t.c||0;
  }
  return c;
}
const skillPtsLeft = () => skillPtsTotal() - skillPtsSpent();

// 스킬 심화 특성 — 배운 무공(S.arts)에만, 경지 무공점으로 켠다. 되돌리기 없음(연마·돌파와 같은 결).
function traitBuy(k, id){
  if (!S.arts[k]) return false;                                   // 안 배운 무공엔 특성 못 준다
  const t = traitDefs(k).find(x=>x.id===id);
  if (!t || hasTrait(k,id) || skillPtsLeft() < (t.c||0)) return false;
  if (!S.traits) S.traits = {};
  if (!S.traits[k]) S.traits[k] = {};
  S.traits[k][id] = 1;
  return true;
}

// 저장에서 돌아온 뒤 — 옛 저장에서 트리가 준 무공(S.treeArt)을 걷어낸다.
// 안 그러면 안 배운 무공이 계속 시전된다. 기연으로 받은 건 별개라 안 건드린다.
function treeReapply(){
  if (S.treeArt) for (const k in S.treeArt){
    const a = (typeof artDef === 'function') ? artDef(k) : null;
    if (!(a && a.fate)) delete S.arts[k];   // 트리가 준 무공만 회수 (기연·구매는 유지)
  }
  S.treeArt = {};
}

function treeAlloc(s,id){
  const n=treeNode(s,id);
  // 무공 마디는 트리로 못 익힌다 — 무공 탭 '배우기' 몫 ("배우기도 전에 쓰네")
  if (!n || treeArtNode(n) || treeHas(s,id) || !treeNeedOk(s,n) || skillPtsLeft() < (n.c||0)) return false;
  if (!S.tree[s]) S.tree[s] = {};
  S.tree[s][id] = 1;
  return true;
}
function treeDealloc(s,id){
  const n=treeNode(s,id);
  if (!n || !treeHas(s,id) || n.k==='root' || treeArtNode(n)) return false;
  if (!(S.tree[s] && S.tree[s][id])) return false;   // 익힘 표시만 되는 마디(무공점 안 씀)는 못 되돌린다
  // 뒤 마디가 이 노드에 기대면 못 되돌린다
  for (const m of treeNodes(s))
    if (treeHas(s,m.id) && m.need && m.need.includes(id)) return false;
  // 다른 문파의 교차 노드가 이 노드를 조건으로 삼고 있으면 못 되돌린다
  for (const os in TREE) for (const m of treeNodes(os))
    if (m.cross===s && m.crossNode===id && treeHas(os,m.id)) return false;
  delete S.tree[s][id];
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
