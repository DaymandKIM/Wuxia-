/* ── 엔진 — 캔버스·크기·그림·헬퍼 ─────────────────────── */
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const VW = VIEW.w; let VH = VIEW.hMin, GY = VH - VIEW.ground;   // 장면 논리 크기 · 땅 줄

// 화면은 세로. 넓은 화면(패드·PC)에선 폰 모양 기둥으로 자른다.
function resize(){
  const iw = innerWidth || 390, ih = innerHeight || 844;
  const w = Math.min(iw, Math.round(ih * 0.62));
  VH = clamp(Math.round(VW * (ih / w) * VIEW.part), VIEW.hMin, VIEW.hMax); GY = VH - VIEW.ground;
  cv.width = VW * VIEW.sc; cv.height = VH * VIEW.sc;
  const app = $('app');
  app.style.width = w + 'px';
  app.style.setProperty('--w', w + 'px');                     // 글자·간격은 전부 이 폭에 비례 (em)
  app.style.setProperty('--sceneh', (w * VH / VW) + 'px');
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
