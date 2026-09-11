/* ── 문파 무공도 (스킬트리) ────────────────────────────
   문파 = 탭, 탭 = 거미줄 노드망. 경지 포인트로만 개방(성 1당 +1).
   패시브 노드는 treeBonus(key)로 전투 수식에 합산되고(수련과 별개),
   무공 마디는 S.arts[k]=1로 기존 무공 시스템을 그대로 탄다.
   숫자·노드는 docs/설계-스킬트리.md 계약을 따른다. */

const SKILLTREE = { ptsPerStar: 1 };   // 경지 성 1당 무공점

// TREE[문파키] = [노드…]. bamboo=청죽문은 여기 두고, 유명 문파는
// docs/트리안/*.js 초안을 검수해 아래에 채워 넣는다(v2.45 진행).
const TREE = TREEDATA;   // 8문파 182노드 데이터는 65b-treedata.js (생성물·에이전트 통합)

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
