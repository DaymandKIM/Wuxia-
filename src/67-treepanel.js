/* ── 문파 무공도 패널 (스킬트리 UI) ──────────────────
   무공 탭이 이걸 연다. 문파 탭 + 거미줄 노드망 + 정보 칸.
   66-tree.js 엔진(treeAlloc·treeBonus·skillPtsLeft…)을 그린다.
   openDeepen/closeDeepen/deepenHud로 심화창(#dpanel)을 그린다. 일반 스킬창
   (무공 배우기·연마·돌파)은 63-arts. (v2.54 — 트리를 심화로 이관) */

let treeSchool = 'bamboo';
let treeSelId = null;
const TREE_ORDER = ['bamboo','sorim','mudang','hwasan','ami','gaebang','dangmun','magyo'];
const treeOrder = () => TREE_ORDER.filter(s => treeNodes(s).length);
const NS_SVG = 'http://www.w3.org/2000/svg';
function svgEl(t,a){ const e=document.createElementNS(NS_SVG,t); for(const k in a) e.setAttribute(k,a[k]); return e; }

// 어떤 노드까지 익히려면 꼭 필요한 (아직 안 익힌) 앞 마디 전부 — need가 all-of라
// 선택지가 없어 자동으로 다 켜도 안전하다("여기까지 한 번에 익히기").
// blocked = 그 안에 다른 문파 교차 조건이 안 채워진 마디가 있어 자동으로 못 여는 것.
function treeClosure(s, id){
  const need = new Set(); let blocked = false;
  const visit = nid => {
    if (treeHas(s, nid) || need.has(nid)) return;
    const n = treeNode(s, nid); if (!n) return;
    need.add(nid);
    if (treeArtNode(n)) blocked = true;   // 무공 마디는 무공 탭에서 배워야 열린다 (자동 습득 불가)
    if (n.cross && !(S.tree[n.cross] && S.tree[n.cross][n.crossNode])) blocked = true;
    if (n.need) n.need.forEach(visit);
  };
  visit(id);
  let cost = 0; for (const nid of need) cost += (treeNode(s, nid).c || 0);
  return { ids: [...need], cost, blocked };
}
// 경로 일괄 습득 — 앞 마디부터(available 순) 반복 할당해 위상순을 스스로 맞춘다.
function treeAllocPath(s, id){
  const { ids, blocked, cost } = treeClosure(s, id);
  if (blocked || cost > skillPtsLeft()) return false;
  let guard = ids.length + 2;
  while (guard-- > 0){
    let prog = false;
    for (const nid of ids) if (!treeHas(s, nid)){
      const n = treeNode(s, nid);
      if (treeAvail(s, n) && skillPtsLeft() >= (n.c||0)){ treeAlloc(s, nid); prog = true; }
    }
    if (treeHas(s, id) || !prog) break;
  }
  return treeHas(s, id);
}

// v2.54 — 트리는 '스킬 심화'창(#dpanel)이다. v2.55: 심화창이 두 갈래다 —
// [스킬 특성](배운 무공에 특성 부여)과 [문파 무공도](패시브 노드망). 둘 다
// 경지 무공점을 쓴다. 상단 토글로 오간다.
let deepMode = 'trait';
function openDeepen(){
  const b = $('dbody');
  b.innerHTML =
    '<div id="dmode">' +
      '<div class="dmtabs">' +
        '<button class="dmb" data-m="trait">스킬 특성</button>' +
        '<button class="dmb" data-m="tree">문파 무공도</button>' +
      '</div><span id="dpts"></span></div>' +
    '<div id="dcontent"></div>';
  for (const el of b.querySelectorAll('.dmb'))
    el.onclick = () => { deepMode = el.dataset.m; renderDeepen(); };
  $('dpanel').classList.add('show');
  renderDeepen();
}
function closeDeepen(){ $('dpanel').classList.remove('show'); }
// 두 갈래를 그린다. 무공점 표시는 상단 고정 바(#dpts)에 공통.
function renderDeepen(){
  const dpts = $('dpts');
  if (dpts) dpts.innerHTML = '남은 무공점 <b>' + fmt(skillPtsLeft()) + '</b>';
  for (const el of $('dbody').querySelectorAll('.dmb'))
    el.classList.toggle('on', el.dataset.m === deepMode);
  if (deepMode === 'tree'){ buildTreeUI(); renderTreePanel(); }
  else renderTraits();
  _artsPts = skillPtsLeft();
}
// 매 프레임 호출된다(60-ui) — 무공점이 실제로 바뀔 때(경지 상승)만 다시 그린다.
// 사용자 조작(노드·탭·특성 구매)은 그 자리에서 renderDeepen을 직접 부른다.
let _artsPts = null;
function deepenHud(){
  if ($('dpanel').classList.contains('show')){
    const p = skillPtsLeft();
    if (p !== _artsPts){ _artsPts = p; renderDeepen(); }
  }
}

function buildTreeUI(){
  if (!treeNodes(treeSchool).length) treeSchool = treeOrder()[0] || 'bamboo';
  const body = $('dcontent');
  body.innerHTML =
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

// 스킬 특성 뷰 — 배운 무공을 카드로, 특성을 칩으로. 경지 무공점으로 켠다.
function renderTraits(){
  const c = $('dcontent');
  const learned = ARTS.list.filter(a => S.arts[a.k] && traitDefs(a.k).length);
  if (!learned.length){
    c.innerHTML = '<div class="dempty">아직 배운 무공이 없다.<br>' +
      '<small>무공 탭에서 무공을 배우면, 여기서 특성을 붙일 수 있다.</small></div>';
    return;
  }
  let h = '';
  for (const sec of [['초식 — 동작을 바꾼다','active'], ['심법 — 효과를 키운다','passive']]){
    const list = learned.filter(a => a.type === sec[1]);
    if (!list.length) continue;
    h += '<div class="dsec">' + sec[0] + '</div>';
    for (const a of list){
      const sc = SCHOOLS[a.school] || SCHOOLS.none;
      h += '<div class="tcard" style="border-color:' + sc.c + '55">' +
        '<div class="tchead"><span class="tcg" style="color:' + sc.c + '">' + a.h[0] + '</span>' +
        '<b>' + a.n + '</b><small>' + a.h + '</small></div><div class="tchips">';
      for (const t of traitDefs(a.k)){
        const own = hasTrait(a.k, t.id), pay = skillPtsLeft() >= (t.c || 0);
        h += '<button class="tchip' + (own ? ' own' : (pay ? '' : ' poor')) + '"' +
          ' data-k="' + a.k + '" data-t="' + t.id + '"' + (own ? ' disabled' : '') +
          (own ? ' style="border-color:' + sc.c + ';background:' + sc.c + '22"' : '') + '>' +
          '<span class="tcn">' + t.n + ' <em>' + t.h + '</em></span>' +
          '<span class="tcd">' + t.d + '</span>' +
          '<span class="tcc">' + (own ? '✓ 익힘' : '<b>' + t.c + '</b> 무공점') + '</span>' +
          '</button>';
      }
      h += '</div></div>';
    }
  }
  c.innerHTML = h;
  for (const el of c.querySelectorAll('.tchip:not(.own)'))
    el.onclick = () => { if (traitBuy(el.dataset.k, el.dataset.t)){ saveNow(); renderDeepen(); } };
}

function renderTreePanel(){
  const S0 = SCHOOLS[treeSchool] || SCHOOLS.none, col = S0.c;
  // 탭 상태
  for (const b of $('tschtabs').children){
    const s = b.dataset.s, on = s === treeSchool, c = (SCHOOLS[s]||SCHOOLS.none).c;
    b.style.background = on ? c : 'transparent';
    b.style.borderColor = on ? c : '#3a4756';
    b.style.color = on ? '#12161c' : '#8b95a3';
  }
  drawTree(col);
  drawTreeInfo(col);
  _artsPts = skillPtsLeft();   // 방금 그렸으니 추적값 동기화 (deepenHud의 불필요한 재렌더 방지)
}

// 색을 흰/검 쪽으로 섞는다 (발광 고리·유리 하이라이트용)
function mixCol(hex, amt, toWhite){
  const h = (hex||'#888888').replace('#','');
  const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
  const t = toWhite ? 255 : 0, m = v => Math.round(v+(t-v)*amt);
  return '#'+[m(r),m(g),m(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
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
  const colHi = mixCol(col, .45, true);   // 밝은 문파색 (익힌 길·구슬 발광)
  // 선택한 (안 익힌) 노드까지의 경로 — 트리에 밝게 표시해 "여기까지" 익힐 마디를 보여준다
  const selN = nodes.find(x=>x.id===treeSelId);
  const pending = new Set();
  if (selN && !treeHas(treeSchool, selN.id)){
    const cl = treeClosure(treeSchool, selN.id);
    if (!cl.blocked) cl.ids.forEach(id=>pending.add(id));
  }
  // 간선 — 익힌 길은 두 겹(넓은 은은한 빛 + 가는 밝은 선)으로 흐른다
  for (const n of nodes){ if (!n.need) continue;
    for (const pid of n.need){ const p = byId[pid]; if (!p) continue;
      const has = treeHas(treeSchool, n.id) && treeHas(treeSchool, pid);
      const onPath = pending.has(n.id) && (treeHas(treeSchool,pid) || pending.has(pid));
      if (has){
        svg.appendChild(svgEl('line', { x1:p.x, y1:p.y, x2:n.x, y2:n.y,
          stroke:col, 'stroke-width':7, 'stroke-linecap':'round', opacity:.22 }));
        svg.appendChild(svgEl('line', { x1:p.x, y1:p.y, x2:n.x, y2:n.y,
          stroke:colHi, 'stroke-width':2.5, 'stroke-linecap':'round' }));
      } else {
        const line = svgEl('line', { x1:p.x, y1:p.y, x2:n.x, y2:n.y, 'stroke-linecap':'round',
          'stroke-width': onPath?3:2,
          stroke: onPath ? col : (treeHas(treeSchool,pid) && treeAvail(treeSchool,n) ? dim : '#2b3542') });
        if (onPath) line.setAttribute('opacity','.6');
        svg.appendChild(line);
      }
    }
  }
  // 노드
  for (const n of nodes){
    const has = treeHas(treeSchool, n.id), avail = treeAvail(treeSchool, n);
    const gift = treeGift(treeSchool, n.id);
    const isK = n.k === 'keystone' || n.k === 'cross';
    const isLand = isK || n.k === 'major';   // 랜드마크(무공·비전 마디) — 크게·빛나게
    const r = isK ? 23 : (n.k==='major' ? 20 : n.k==='root' ? 18 : 12);
    const onPath = pending.has(n.id);
    // 랜드마크 후광 — 익힌 무공·비전은 은은히 빛나 지도의 이정표가 된다
    if (isLand && has){
      svg.appendChild(svgEl('circle', { cx:n.x, cy:n.y, r:r+9, fill:col, opacity:.13 }));
      svg.appendChild(svgEl('circle', { cx:n.x, cy:n.y, r:r+5, fill:col, opacity:.18 }));
    }
    // 지금 익힐 수 있는 마디 — 맥동 고리로 눈에 띄게 (배우기 힘들다 → 프런티어 강조)
    if (avail){
      const ring = svgEl('circle', { cx:n.x, cy:n.y, r:r+4, fill:'none', stroke:col, 'stroke-width':2 });
      ring.setAttribute('class','tpulse'); ring.style.color = col; svg.appendChild(ring);
    }
    // 비전·교차는 점선 고리로 격을 준다
    if (isK){
      svg.appendChild(svgEl('circle', { cx:n.x, cy:n.y, r:r+6, fill:'none',
        stroke: has?colHi:(avail?dim:'#2b3542'), 'stroke-width':1.2, 'stroke-dasharray':'3 4' }));
    }
    // 배운 무공 마디 — 금 점선 고리 (무공 탭·기연으로 익힘, 무공점 안 듦)
    if (gift){
      svg.appendChild(svgEl('circle', { cx:n.x, cy:n.y, r:r+7, fill:'none',
        stroke:'#e9c451', 'stroke-width':1.6, 'stroke-dasharray':'2 4', opacity:.9 }));
    }
    const c = svgEl('circle', { cx:n.x, cy:n.y, r, 'stroke-width': (treeSelId===n.id?4:2.5),
      stroke: has?colHi:(avail||onPath)?col:'#3f4a58', fill: has?col:onPath?'#1a2230':'#10151c' });
    if (!has && !avail && !onPath) c.setAttribute('opacity','.5');
    c.style.cursor = 'pointer';
    c.onclick = () => { treeSelId = n.id; renderTreePanel(); };
    svg.appendChild(c);
    // 유리 하이라이트 — 익힌 구슬 위쪽 광택
    if (has){
      const gl = svgEl('ellipse', { cx:n.x, cy:n.y-r*0.38, rx:r*0.52, ry:r*0.3, fill:'#ffffff', opacity:.28 });
      gl.style.pointerEvents='none'; svg.appendChild(gl);
    }
    if (n.g){ const t = svgEl('text', { x:n.x, y:n.y+1, 'text-anchor':'middle', 'dominant-baseline':'central',
        'font-family':"'Nanum Myeongjo',serif", 'font-weight':'700',
        'font-size': isK?18:(n.k==='major'?16:15), fill: has?'#0c130e':(avail||onPath)?col:'#5d6673' });
      t.textContent = n.g; t.style.pointerEvents='none'; svg.appendChild(t); }
    // 랜드마크·주요 마디는 이름표를 달고 소절만 숨긴다
    if (n.k !== 'minor'){ const lb = svgEl('text', { x:n.x, y:n.y+r+12, 'text-anchor':'middle',
        'font-family':"'Jua',sans-serif", 'font-size': isLand?11.5:10.5,
        fill: has?colHi:(avail||onPath)?'#9fb0c2':'#4a5462' });
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
  const isArt = treeArtNode(n);
  const kindMap = { root:'입문', minor:'소절', major:'무공', keystone:'비전', cross:'문파 교차 비전' };
  // 여기까지 익히는 데 필요한 (안 익힌) 마디 전부 — 앞 마디를 한 번에 켠다
  const cl = has ? {ids:[],cost:0,blocked:false} : treeClosure(treeSchool, n.id);
  const many = cl.ids.length > 1;               // 앞 마디까지 딸려 켜야 하나
  const canPay = skillPtsLeft() >= cl.cost;
  const left = skillPtsLeft();
  let btn, hint = '';
  // 무공 마디는 트리로 못 배운다 — 무공 탭 '배우기'로 배우면 자동 익힘 ("배우기도 전에 쓰네")
  if (isArt){ btn = '';
    hint = has ? '익힌 무공이다 — <b>무공 탭</b>에서 배웠다. (심화 특성은 다음 단계)'
               : '<b>무공 탭</b>에서 「' + n.n + '」을 먼저 배운다 — 배우면 여기가 열린다.'; }
  else if (has && n.k!=='root'){ btn = '<button class="tundo">되돌리기</button>'; hint = '익힘.'; }
  else if (has){ btn = ''; hint = '익힘 (입문).'; }
  else if (cl.blocked){
    btn = '<button class="tlearn" disabled>잠김</button>';
    if (n.cross && !(S.tree[n.cross] && S.tree[n.cross][n.crossNode])){
      const cs = SCHOOLS[n.cross] || SCHOOLS.none, cn = treeNode(n.cross, n.crossNode);
      hint = '다른 문파 조건: <b style="color:' + cs.c + '">' + cs.n + '</b>의 「' + (cn?cn.n:'?') + '」 먼저';
    } else hint = '앞 마디에 다른 문파 교차 조건이 걸려 있다.';
  } else {
    const label = many ? ('여기까지 익히기 · ' + cl.ids.length + '마디 ' + cl.cost + '점')
                       : '익히기';
    btn = '<button class="tlearn"' + (canPay ? '' : ' disabled') + '>' + (canPay ? label : '무공점 부족') + '</button>';
    if (!canPay) hint = (many ? cl.cost + '점 필요' : (n.c||0) + '점 필요') + ' · 지금 ' + left + '점 (경지를 올려 모은다)';
    else if (many) hint = '앞 마디 ' + (cl.ids.length-1) + '개까지 함께 익힌다.';
    else hint = avail ? '바로 익힐 수 있다.' : '';
  }
  info.innerHTML =
    '<div class="tirow"><span class="tichip" style="border-color:' + (has?col:'#3a4756') +
      ';background:' + (has?col:'#10151c') + ';color:' + (has?'#0c130e':(avail||!cl.blocked)?col:'#8b95a3') + '">' +
      (n.g || n.n[0]) + '</span>' +
    '<div class="titx"><div class="tin">' + n.n + '<small>' + (n.h||'') + '</small></div>' +
      '<div class="tik">' + (kindMap[n.k]||'') + '</div></div>' +
    '<div class="tic">' + (n.c ? '<b>' + n.c + '</b> 무공점' : '·') + '</div></div>' +
    '<div class="tid">' + (n.d || '') + '</div>' +
    '<div class="tiact">' + btn + '<span class="tihint">' + hint + '</span></div>';
  const lb = info.querySelector('.tlearn');
  if (lb) lb.onclick = () => {
    const okName = n.n;
    if (treeAllocPath(treeSchool, n.id)){
      saveNow(); renderTreePanel();
      if (many) toast('「' + okName + '」까지 익혔다');
    }
  };
  const ub = info.querySelector('.tundo');
  if (ub) ub.onclick = () => { if (treeDealloc(treeSchool, n.id)){ saveNow(); renderTreePanel(); }
    else toast('뒤 마디를 먼저 되돌려야 한다'); };
}
