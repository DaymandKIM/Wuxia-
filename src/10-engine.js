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

  // 픽셀아트가 너무 작아지지 않게 최소 2배는 확보한다
  const raw = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
  let pw = Math.round(w * raw), ph = Math.round(h * raw);
  if (pw * ph > MAXPX){
    const k = Math.sqrt(MAXPX / (pw * ph));
    pw = Math.round(pw * k); ph = Math.round(ph * k);
  }
  cv.width = pw; cv.height = ph;

  SC = Math.max(1, Math.round(pw / BASE_W));
  VW = Math.ceil(pw / SC); VH = Math.ceil(ph / SC);
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
  if (n < 10000) return n.toLocaleString();
  for (const [u, s] of FMTU){
    if (n >= u){
      const v = n / u;
      // 10 이상이면 정수, 미만이면 소수 1자리 (240만 · 7.4만)
      return (v >= 10 ? Math.round(v) : (Math.round(v * 10) / 10)) + s;
    }
  }
}
