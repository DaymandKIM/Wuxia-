/* ── 엔진 — 캔버스·크기·그림·헬퍼 ─────────────────────── */
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const VW = VIEW.w; let VH = Math.round(VW * VIEW.minR), GY = VH - VIEW.ground;   // 장면 논리 크기 · 땅 줄

/* 화면은 세로. **패널이 먼저 제 높이를 갖고, 남는 세로를 장면이 쓴다.**
   (v0.1 은 장면이 세로의 56% 를 먼저 가져가서 아티팩트 뷰어처럼 낮은 화면에선 패널 아래가 잘렸다)
   그래도 모자라면 기둥 폭을 줄인다 — 넓은 화면(패드·PC)에서도 같은 식으로 폰 모양 기둥이 된다. */
function resize(){
  const iw = innerWidth || 390, ih = innerHeight || 844;
  const w = Math.floor(Math.min(iw, ih / (VIEW.minR + VIEW.panelEm * VIEW.em)));
  const sh = clamp(ih - VIEW.panelEm * VIEW.em * w, w * VIEW.minR, w * VIEW.maxR);
  VH = Math.round(sh * VW / w); GY = VH - VIEW.ground;
  cv.width = VW * VIEW.sc; cv.height = VH * VIEW.sc;
  const app = $('app');
  app.style.width = w + 'px';
  app.style.fontSize = (w * VIEW.em) + 'px';                  // 글자·간격은 전부 이 폭에 비례 (em)
  app.style.setProperty('--sceneh', sh + 'px');
  let inFrame = false; try { inFrame = window.self !== window.top; } catch(e){ inFrame = true; }
  app.style.setProperty('--sat', (inFrame ? VIEW.satIframe : 0) + 'px');
}
addEventListener('resize', resize);
resize();

// 그림 — 기다리지 않는다. 준비된 것만 그린다.
const IMG = {};
function img(key){
  let i = IMG[key];
  if (!i){ i = IMG[key] = new Image(); if (typeof ASSET !== 'undefined' && ASSET[key]) i.src = ASSET[key]; }
  return (i.complete && i.naturalWidth) ? i : null;
}
// 결정적 해시 — 중경 소품 자리 (저장 필요 없음)
function thash(a, b){ let h = (a * 374761393 + b * 668265263) >>> 0; h = ((h ^ (h >>> 13)) >>> 0) * 1274126177 >>> 0; return h / 4294967296; }
const fmt = n => n < 1e4 ? String(Math.floor(n)) : n < 1e8 ? (n / 1e4).toFixed(n < 1e5 ? 2 : 1).replace(/\.?0+$/, '') + '만' : (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억';
