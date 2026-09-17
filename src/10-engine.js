/* ── 캔버스 · 에셋 ─────────────────────────────────
   모바일·패드·PC를 함께 지원한다.
   화면이 넓으면 세로 비율로 잘라 게임판을 가운데 둔다.
*/
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let SC = 3, VW = 400, VH = 800;
let VIEW = { x:0, y:0, w:0, h:0 };   // 실제 그려지는 화면 영역(CSS px)

const MAXPX  = 4.0e6;   // iOS 캔버스 픽셀 상한
const ASPECT = 0.52;    // 게임판 가로/세로 비율 (세로로 긴 화면)
const BASE_W = 400;     // 아트 기준 폭 (이 값이 SC를 정한다)

// 지금 화질 배율 — S.qual 이 null 이면 자동(QUALITY.start), 숫자면 손으로 고른 칸 (v2.95.5)
function qualStep(){
  // S 는 const 라 아직 안 만들어졌으면 typeof 도 던진다(TDZ) — resize() 는 그 전에 한 번 돈다
  let q = QUALITY.start;
  try{ if (S && S.qual != null) q = S.qual; }catch(e){}
  return Math.max(0, Math.min(QUALITY.steps.length - 1, q | 0));
}
function qualScale(){ return QUALITY.steps[qualStep()]; }
function setQual(i){
  const n = Math.max(0, Math.min(QUALITY.steps.length - 1, i | 0));
  if (S.qual === n) return false;
  S.qual = n; resize();
  return true;
}

function resize(){
  const cw = innerWidth, ch = innerHeight;
  // 화면이 가로로 넓으면(패드·PC) 세로 비율로 잘라 가운데 배치
  let w = cw, h = ch;
  if (cw / ch > ASPECT){
    h = ch;
    w = Math.round(ch * ASPECT);
  }
  VIEW.w = w; VIEW.h = h;
  VIEW.x = Math.round((cw - w) / 2);
  VIEW.y = Math.round((ch - h) / 2);

  cv.style.width  = w + 'px';
  cv.style.height = h + 'px';
  cv.style.left   = VIEW.x + 'px';
  cv.style.top    = VIEW.y + 'px';

  // **화면판은 늘 가로 400 단위다** (v2.95.6, 사용자 "화면 크기에 따라 캐릭터 크기도 변하더라") —
  // 옛 판은 백버퍼를 화면 px 에 맞추고 SC 를 정수로 반올림해서, 폰 390 은 VW 390 · 패드 710 은 VW 355 가 됐다.
  // 같은 인물이 기기마다 화면의 12%도 되고 13%도 됐다는 뜻이다. 이제 VW 를 BASE_W 로 못 박고
  // 백버퍼를 VW×SC 로 잡아 CSS 로 늘린다 — 그리기는 정수 배율이라 그대로 또렷하고(#cv image-rendering:pixelated),
  // 화면이 크든 작든 보이는 세상의 폭이 같다.
  VW = BASE_W;
  VH = Math.max(1, Math.round(BASE_W * h / w));
  // 백버퍼 배율 — 화질 단계에서 나온다 (v2.95.5). 옛 판은 무조건 max(2, min(DPR,3)) 이라
  // DPR 3 폰에서 1170×2532 를 매 프레임 칠했다(11fps). 이제 기본이 2배다.
  const raw = Math.max(1, Math.min(window.devicePixelRatio || 1, qualScale()));
  SC = Math.max(1, Math.round(w * raw / BASE_W));
  if (VW * SC < w) SC++;                                 // CSS 폭보다 백버퍼가 작으면 늘려 그린 게 뭉갠다 — 한 칸 올린다
  while (SC > 1 && VW * SC * VH * SC > MAXPX) SC--;      // iOS 캔버스 픽셀 상한
  cv.width = VW * SC; cv.height = VH * SC;
  ctx.imageSmoothingEnabled = false;

  // UI도 같은 영역에 맞춘다
  const ui = document.getElementById('ui');
  if (ui){
    ui.style.width  = w + 'px';
    ui.style.height = h + 'px';
    ui.style.left   = VIEW.x + 'px';
    ui.style.top    = VIEW.y + 'px';
  }
}
addEventListener('resize', resize);
addEventListener('orientationchange', ()=> setTimeout(resize, 120));
resize();

// 이미지는 기다리지 않는다. 준비되는 대로 그린다.
const IMG = {};
function loadImg(key, src){ const i = new Image(); i.src = src; IMG[key] = i; return i; }
function draw(img, ...a){
  if (!img || !img.complete || !img.naturalWidth) return;
  try { ctx.drawImage(img, ...a); } catch(e) {}
}

/* ── 잡다 ─────────────────────────────────────────── */
const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
const rnd = (a,b)=> a + Math.random()*(b-a);
const dist = (ax,ay,bx,by)=> Math.hypot(ax-bx, ay-by);
const $ = id => document.getElementById(id);

// 큰 수를 한국식 만·억·조·경 단위로 줄여 읽기 쉽게 (v2.33 — "백만을 쉼표도
// 없이 읽으라는 건 무리"라는 피드백). 1만 미만은 그대로 쉼표만.
const FMTU = [[1e16,'경'],[1e12,'조'],[1e8,'억'],[1e4,'만']];
function fmt(n){
  n = Math.round(n);
  if (!isFinite(n)) return '∞';
  if (n >= 1e21) return n.toExponential(1).replace('e+', '×10^');   // 경을 넘는 자리는 지수로 (테스트 보상·후반 수련치, v2.95.7)
  if (n < 10000) return n.toLocaleString();
  for (const [u, s] of FMTU){
    if (n >= u){
      const v = n / u;
      // 10 이상이면 정수, 미만이면 소수 1자리 (240만 · 7.4만)
      return (v >= 10 ? Math.round(v) : (Math.round(v * 10) / 10)) + s;
    }
  }
}

// '#rrggbb' → 'r,g,b' (fxBlast 색 문자열). 본진 장로 이펙트를 문파색으로 쓸 때 (v2.94.6)
function rgbOf(hex){
  if (!hex || hex[0] !== '#') return hex;
  return parseInt(hex.slice(1,3),16) + ',' + parseInt(hex.slice(3,5),16) + ',' + parseInt(hex.slice(5,7),16);
}
// 지금 보스 계열의 이펙트 색 — 본진이면 문파색, 아니면 옛 주황
function bossFxCol(){
  const k = S.hq && ZONEBOSS['hq_' + S.hq];
  const sc = k && FOES[k] && FOES[k].school;
  return sc ? rgbOf((SCHOOLS[sc] || SCHOOLS.none).c) : FXD.boss.c;
}
