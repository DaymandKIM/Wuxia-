/* ── 문파 무공도 패널 (스킬트리 UI) ──────────────────
   무공 탭이 이걸 연다. 문파 탭 + 거미줄 노드망 + 정보 칸.
   66-tree.js 엔진(treeAlloc·treeBonus·skillPtsLeft…)을 그린다.
   openArts/closeArts/artsHud를 여기서 재정의해 옛 평면 표(63-arts)를 대체한다. */

let treeSchool = 'bamboo';
let treeSelId = null;
const TREE_ORDER = ['bamboo','sorim','mudang','hwasan','ami','gaebang','dangmun','magyo'];
const treeOrder = () => TREE_ORDER.filter(s => treeNodes(s).length);
const NS_SVG = 'http://www.w3.org/2000/svg';
function svgEl(t,a){ const e=document.createElementNS(NS_SVG,t); for(const k in a) e.setAttribute(k,a[k]); return e; }

function openArts(){ buildTreeUI(); $('apanel').classList.add('show'); renderTreePanel(); }
function closeArts(){ $('apanel').classList.remove('show'); }
// 매 프레임 호출된다(60-ui) — 열린 패널을 매 프레임 통째로 다시 그리면
// 안 된다. SVG·정보칸(익히기 버튼 포함)이 프레임마다 새로 생겨, 탭 도중에
// 버튼이 사라져 클릭이 안 먹고 화면이 깜빡인다("무공 화면 이상함·클릭 안 됨").
// 무공점이 실제로 바뀔 때(경지 상승)만 다시 그린다 — 사용자 조작(노드·탭·
// 습득)은 그 자리에서 renderTreePanel을 직접 부른다.
let _artsPts = null;
function artsHud(){
  const dot = $('tab-arts').firstElementChild;
  if (dot && dot.classList) dot.classList.toggle('on', skillPtsLeft() > 0);   // 쓸 무공점 있으면 알림점
  if ($('apanel').classList.contains('show')){
    const p = skillPtsLeft();
    if (p !== _artsPts){ _artsPts = p; renderTreePanel(); }
  }
}

function buildTreeUI(){
  if (!treeNodes(treeSchool).length) treeSchool = treeOrder()[0] || 'bamboo';
  const body = $('abody');
  body.innerHTML =
    '<div id="tpts"></div>' +
    '<div id="tschtabs"></div>' +
    '<div id="ttreewrap"><svg id="ttree" preserveAspectRatio="xMidYMin meet"></svg></div>' +
    '<div id="tinfo"></div>';
  const tabs = $('tschtabs');
  for (const s of treeOrder()){
    const sc = SCHOOLS[s] || SCHOOLS.none;
    const b = document.createElement('button');
    b.className = 'tsch'; b.dataset.s = s;
    b.innerHTML = sc.n + '<span class="han">' + (sc.han||'') + '</span>';
    b.onclick = () => { treeSchool = s; treeSelId = null; renderTreePanel(); };
    tabs.appendChild(b);
  }
}

function renderTreePanel(){
  const S0 = SCHOOLS[treeSchool] || SCHOOLS.none, col = S0.c;
  const info = realmInfo();
  $('tpts').innerHTML = '<span>남은 무공점 <b>' + fmt(skillPtsLeft()) + '</b></span>' +
    '<span class="rlm">' + realmName(info.k) + ' · 성급당 +1</span>';
  // 탭 상태
  for (const b of $('tschtabs').children){
    const s = b.dataset.s, on = s === treeSchool, c = (SCHOOLS[s]||SCHOOLS.none).c;
    b.style.background = on ? c : 'transparent';
    b.style.borderColor = on ? c : '#3a4756';
    b.style.color = on ? '#12161c' : '#8b95a3';
  }
  drawTree(col);
  drawTreeInfo(col);
  _artsPts = skillPtsLeft();   // 방금 그렸으니 추적값 동기화 (artsHud의 불필요한 재렌더 방지)
}

function drawTree(col){
  const S1 = SCHOOLS[treeSchool] || SCHOOLS.none;
  const nodes = treeNodes(treeSchool);
  const svg = $('ttree');
  const maxY = Math.max(60, ...nodes.map(n=>n.y)) + 70;
  svg.setAttribute('viewBox', '0 0 360 ' + maxY);
  svg.style.height = Math.round(maxY * ($('ttreewrap').clientWidth || 340) / 360) + 'px';
  svg.innerHTML = '';
  const byId = {}; for (const n of nodes) byId[n.id] = n;
  const dim = S1.dim || '#33404d';
  // 간선
  for (const n of nodes){ if (!n.need) continue;
    for (const pid of n.need){ const p = byId[pid]; if (!p) continue;
      const has = treeHas(treeSchool, n.id);
      const line = svgEl('line', { x1:p.x, y1:p.y, x2:n.x, y2:n.y, 'stroke-width': has?3:2,
        stroke: has ? col : (treeHas(treeSchool,pid) && treeAvail(treeSchool,n) ? dim : '#2b3542') });
      svg.appendChild(line);
    }
  }
  // 노드
  for (const n of nodes){
    const has = treeHas(treeSchool, n.id), avail = treeAvail(treeSchool, n);
    const isK = n.k === 'keystone' || n.k === 'cross';
    const r = isK ? 22 : (n.k==='major' ? 19 : n.k==='root' ? 17 : 13);
    if (isK){
      svg.appendChild(svgEl('circle', { cx:n.x, cy:n.y, r:r+5, fill:'none',
        stroke: has?col:(avail?S1.dim||dim:'#2b3542'), 'stroke-width':1, 'stroke-dasharray':'3 4' }));
    }
    const c = svgEl('circle', { cx:n.x, cy:n.y, r, 'stroke-width': (treeSelId===n.id?4:2.5),
      stroke: has?col:avail?col:'#3f4a58', fill: has?col:'#10151c' });
    if (!has && !avail) c.setAttribute('opacity','.55');
    c.style.cursor = 'pointer';
    c.onclick = () => { treeSelId = n.id; renderTreePanel(); };
    svg.appendChild(c);
    if (n.g){ const t = svgEl('text', { x:n.x, y:n.y+1, 'text-anchor':'middle', 'dominant-baseline':'central',
        'font-family':"'Nanum Myeongjo',serif", 'font-weight':'700',
        'font-size': isK?18:15, fill: has?'#0c130e':avail?col:'#5d6673' });
      t.textContent = n.g; t.style.pointerEvents='none'; svg.appendChild(t); }
    if (n.k !== 'minor'){ const lb = svgEl('text', { x:n.x, y:n.y+r+12, 'text-anchor':'middle',
        'font-family':"'Jua',sans-serif", 'font-size':10.5, fill: has?col:avail?'#9fb0c2':'#4a5462' });
      lb.textContent = n.n; lb.style.pointerEvents='none'; svg.appendChild(lb); }
  }
}

function drawTreeInfo(col){
  const info = $('tinfo');
  const nodes = treeNodes(treeSchool);
  let n = nodes.find(x=>x.id===treeSelId);
  if (!n) n = nodes[0];
  if (!n){ info.innerHTML = ''; return; }
  const has = treeHas(treeSchool, n.id), avail = treeAvail(treeSchool, n);
  const kindMap = { root:'입문', minor:'소절', major:'무공', keystone:'비전', cross:'문파 교차 비전' };
  const enough = skillPtsLeft() >= (n.c||0);
  let btn;
  if (has && n.k!=='root') btn = '<button class="tundo">되돌리기</button>';
  else if (has) btn = '';
  else btn = '<button class="tlearn"' + (avail && enough ? '' : ' disabled') + '>' +
             (avail ? (enough ? '익히기' : '무공점 부족') : '잠김') + '</button>';
  let hint = '';
  if (!has && !avail){
    if (n.cross && !(S.tree[n.cross] && S.tree[n.cross][n.crossNode])){
      const cs = SCHOOLS[n.cross] || SCHOOLS.none;
      const cn = treeNode(n.cross, n.crossNode);
      hint = '다른 문파 조건: <b style="color:' + cs.c + '">' + cs.n + '</b>의 「' + (cn?cn.n:'?') + '」 필요';
    } else hint = '이어진 앞 마디를 먼저 익혀야 한다.';
  } else if (has) hint = '익힘.';
  else if (!enough) hint = '경지를 올려 무공점을 더 모아야 한다.';
  info.innerHTML =
    '<div class="tirow"><span class="tichip" style="border-color:' + (has?col:'#3a4756') +
      ';background:' + (has?col:'#10151c') + ';color:' + (has?'#0c130e':avail?col:'#8b95a3') + '">' +
      (n.g || n.n[0]) + '</span>' +
    '<div class="titx"><div class="tin">' + n.n + '<small>' + (n.h||'') + '</small></div>' +
      '<div class="tik">' + (kindMap[n.k]||'') + '</div></div>' +
    '<div class="tic">' + (n.c ? '<b>' + n.c + '</b> 무공점' : '·') + '</div></div>' +
    '<div class="tid">' + (n.d || '') + '</div>' +
    '<div class="tiact">' + btn + '<span class="tihint">' + hint + '</span></div>';
  const lb = info.querySelector('.tlearn');
  if (lb) lb.onclick = () => { if (treeAlloc(treeSchool, n.id)){ saveNow(); renderTreePanel(); } };
  const ub = info.querySelector('.tundo');
  if (ub) ub.onclick = () => { if (treeDealloc(treeSchool, n.id)){ saveNow(); renderTreePanel(); }
    else toast('뒤 마디를 먼저 되돌려야 한다'); };
}
