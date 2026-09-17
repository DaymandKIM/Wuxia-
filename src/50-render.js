/* ── 그리기 ───────────────────────────────────────── */
// 그리는 구역 — 문파 터 화면(v2.92)은 어느 구역에 있든 죽림 원경·바닥으로 그린다
// 그리기용 구역 — 문파 마당은 죽림, 본진은 전용 원경(bg_hq_<k>)이 있으면 본진 자체, 없으면 가까운 사냥터를 빌린다 (v2.94 → v2.94.3)
function rzone(){
  if (typeof sectView !== 'undefined' && sectView) return ZONES[0];
  if (S.hq){ const hz = HQZONE[S.hq]; return IMG[BACKDROP.keys[hz.k]] ? hz : ZONES[hz.vis]; }
  return zone();
}
// 바닥 타일을 **불투명하게 한 번만 굽는다** (v2.95.5 사용자 "화면이 느리게 굴러간다").
// 옛 판은 매 프레임 ⑴ 화면 전체를 땅색으로 칠하고 ⑵ 1024×559 텍스처를 열 번 확대해 ⑶ 알파로 섞었다.
// 폰 해상도(1170×2532)면 3M 픽셀을 두 번 블렌드하는 셈이다 — CPU 6배 측정에서 한 프레임 42ms 중 24ms 가 여기였다.
// 이제 땅색+텍스처를 미리 합성한 **불투명 타일**을 한 장 구워, 배율도 알파도 없이 그대로 깐다.
const groundTileCache = {};
function groundTile(tex, tw, th, base, alpha){
  const key = (tex.__key || tex.src || '') + ':' + tw + 'x' + th + ':' + base + ':' + alpha;
  if (groundTileCache[key] !== undefined) return groundTileCache[key];
  let c = null;
  try{
    c = document.createElement('canvas'); c.width = tw; c.height = th;
    const g = c.getContext('2d');
    if (!g || !g.drawImage) c = null;
    else {
      g.fillStyle = base; g.fillRect(0, 0, tw, th);
      g.globalAlpha = alpha; g.imageSmoothingEnabled = false;
      g.drawImage(tex, 0, 0, tw, th);
    }
  } catch(e){ c = null; }
  groundTileCache[key] = c;
  return c;
}

function drawGround(ox, oy){
  // 바닥 텍스처(시트) — 카메라와 1:1로 2D 타일링. 있으면 격자는 생략.
  const tex = IMG[GROUNDTEX.keys[rzone().k]];
  if (tex && tex.complete && tex.naturalWidth){
    const gsc = GROUNDTEX.scale * (GROUNDTEX.scaleZone[rzone().k] || 1);   // 구역별 배율 — 본진 석판이 1:1 이면 인물 세 배 크기였다 (v2.94.5)
    const tw = Math.max(1, Math.round(tex.naturalWidth * gsc));
    const th = Math.max(1, Math.round(tex.naturalHeight * gsc));
    const sx = -(((ox % tw) + tw) % tw), sy = -(((oy % th) + th) % th);
    ctx.save(); ctx.globalAlpha = GROUNDTEX.aZone[rzone().k] || GROUNDTEX.a;
    // **한 번 만든 타일 패턴으로 한 번에 칠한다** (v2.95.5 사용자 "화면이 느리게 굴러간다") —
    // 옛 판은 1024×559 텍스처를 **매 프레임 열 번씩 확대해** 그렸다(폰 해상도 1170×2532 기준 5.7M 픽셀).
    // CPU 6배 느리게 건 측정에서 한 프레임 42ms 중 24ms 가 여기였다. 패턴은 한 번 굽고 fillRect 한 번이면 끝난다.
    const tile = groundTile(tex, tw, th, rzone().ground, GROUNDTEX.aZone[rzone().k] || GROUNDTEX.a);
    // 원경이 덮는 위쪽은 안 그린다 — 화면의 3분의 1이 그냥 낭비였다 (v2.95.5)
    const top = Math.max(0, Math.min(VH, Math.floor(horizonY())));
    const y0 = sy + Math.floor((top - sy) / th) * th;
    if (tile) for (let y = y0; y < VH; y += th)
      for (let x = sx; x < VW; x += tw) ctx.drawImage(tile, Math.round(x), Math.round(y));
    else {                                     // 타일을 못 굽는 환경(jsdom 스텁) — 옛 방식
      ctx.fillStyle = rzone().ground; ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = GROUNDTEX.aZone[rzone().k] || GROUNDTEX.a;
      for (let y = sy; y < VH; y += th)
        for (let x = sx; x < VW; x += tw) draw(tex, Math.round(x), Math.round(y), tw, th);
    }
    if (top > 0){ ctx.globalAlpha = 1; ctx.fillStyle = rzone().ground; ctx.fillRect(0, 0, VW, Math.min(top, VH)); }
    ctx.restore();
    return;
  }
  // 옅은 격자로 이동감만 준다
  ctx.fillStyle = rzone().ground; ctx.fillRect(0, 0, VW, VH);
  ctx.strokeStyle = 'rgba(0,0,0,.055)'; ctx.lineWidth = 1;
  const T = 32;
  const sx = -((ox % T) + T) % T, sy = -((oy % T) + T) % T;
  ctx.beginPath();
  for (let x = sx; x < VW; x += T){ ctx.moveTo(x+0.5, 0); ctx.lineTo(x+0.5, VH); }
  for (let y = sy; y < VH; y += T){ ctx.moveTo(0, y+0.5); ctx.lineTo(VW, y+0.5); }
  ctx.stroke();
}

// 셀 좌표 정수 해시 → 0~1. 같은 셀은 항상 같은 값(무상태).
function thash(cx, cy, s){
  let h = (cx * 374761393 + cy * 668265263 + s * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) >>> 0) * 1274126177 >>> 0;
  return (h >>> 0) / 4294967296;
}
// (옛 절차 지형 스캐터 TERR·drawTerr는 폐기 — 시트 스프라이트로 대체, v2.59.
//  날씨 입자는 AMB/drawAmbient에서 계속 그린다.)

// 상단 원경 — 지평선(hz)에 그림 바닥을 맞추고, 그림 위 남는 하늘은 시트 윗줄 색으로.
// 가로 타일링, 카메라 x에 par 배로 느리게 흐른다. 아래 fade px는 그림 알파를 계단으로
// 빼서 **바닥 텍스처 위로 디졸브**한다 — 평균색을 칠하면 평평한 띠가 생겼다(v2.61.7).
// 상단 바 높이(캔버스 단위) — v2.85 사용자: "원경 위쪽 반복 텍스처 쓰는 곳 가리고 거기 둬라, 원경 가리지 말고".
// 원경 시트는 윗줄이 투명하다(죽림 32·폐촌 83·설산 32·천산 63줄, 동굴은 알파 경사) — 거기로 바닥 타일이 비쳤다.
// 바가 그 투명 띠를 덮고, 그림의 **불투명한 첫 줄**이 바 바로 아래 오게 y0를 잡는다(y0 = max(바 − 투명 띠, 지평선 − 높이)).
// 투명 띠 높이(clearTop)는 backdropScaled가 축소 캔버스에서 한 번 재서 bdClear에 둔다. jsdom은 둘 다 0.
const bdClear = {}, bdBand = {};   // bdBand: 아래 균일 띠 높이(px) — 디졸브가 이 띠를 다 덮게 (v2.87.4)
function uiTopUnits(){
  const tb = document.getElementById('topbar');
  if (!tb || !tb.offsetHeight || !VIEW.h) return 0;
  return Math.ceil(tb.offsetHeight * VH / VIEW.h);
}
function backdropClear(zk, sw, sh){ return bdClear[zk + ':' + sw + 'x' + sh] || 0; }
// 디졸브 길이 — 그림 높이 비율과 '아래 균일 띠 + 여유' 중 큰 쪽. 띠 윗변이 불투명 선으로 남지 않게 (v2.87.4 "원경 아래 선이 거슬림")
function backdropFade(zk, sw, sh){
  const band = bdBand[zk + ':' + sw + 'x' + sh] || 0;
  return Math.min(sh - 2, Math.max(BACKDROP.fadeMin, Math.round(sh * BACKDROP.fadeR), band + BACKDROP.fadePad));
}
function backdropTop(zk, sw, sh){ return Math.max(uiTopUnits() - backdropClear(zk, sw, sh), Math.round(VH * BACKDROP.hz) - sh); }
function drawBackdrop(ox){
  const zk = rzone().k, img = IMG[BACKDROP.keys[zk]];
  if (!img || !img.complete || !img.naturalWidth) return;
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const sh = Math.round(VH * (BACKDROP.h[zk] || BACKDROP.hDef));
  const sw = Math.max(1, Math.round(sh * nw / nh));
  // 시트(폭 1024)를 화면 크기(≈290)로 nearest 축소하면 안개 층의 가로 줄이 모아레
  // 줄무늬로 떴다(v2.63.6). 표시 크기로 한 번만 부드럽게 줄인 캔버스를 쓴다.
  const src = backdropScaled(zk, img, sw, sh);
  const y0 = backdropTop(zk, sw, sh);
  const off = -(((ox * BACKDROP.par) % sw) + sw) % sw;
  ctx.save();
  ctx.fillStyle = BACKDROP.sky[zk] || rzone().ground;              // 그림 위 하늘 — 투명 윗줄까지 덮는다(바닥 타일이 비치지 않게)
  const skyTo = y0 + backdropClear(zk, sw, sh);
  if (skyTo > 0) ctx.fillRect(0, 0, VW, skyTo + 1);
  const F = backdropFade(zk, sw, sh), solid = sh - F, n = BACKDROP.fadeSteps;
  // 좌우가 안 이어지는 시트는 한 장 걸러 뒤집어 깐다 (v2.94.14) — 거울이라 이음새가 반드시 맞는다.
  // 타일 인덱스는 카메라 오프셋(off)이 한 장 넘어갈 때마다 바뀌어야 하므로 스크롤 거리에서 센다.
  const mir = BACKDROP.mirror && BACKDROP.mirror[zk];
  const t0 = mir ? Math.floor((((ox * BACKDROP.par) % (sw*2)) + sw*2) % (sw*2) / sw) : 0;
  const tile = (sy, th, dy) => {
    for (let x = off, ti = 0; x < VW; x += sw, ti++){
      const flip = mir && ((ti + t0) & 1);
      if (flip){
        ctx.save(); ctx.translate(Math.round(x) + sw, 0); ctx.scale(-1, 1);
        ctx.drawImage(src, 0, sy, sw, th, 0, dy, sw, th);
        ctx.restore();
      } else ctx.drawImage(src, 0, sy, sw, th, Math.round(x), dy, sw, th);
    }
  };
  tile(0, solid, y0);                                                            // 위쪽 불투명부
  // 띠 경계는 정수로 잘라 겹치지 않게 — 겹친 반투명 띠가 알파를 쌓아 가로 줄무늬가 됐다
  const nb = Math.min(n, F);
  for (let i = 0; i < nb; i++){                                    // 아래 디졸브 계단
    ctx.globalAlpha = Math.pow(1 - (i + 0.5) / nb, BACKDROP.fadePow);   // 아래로 갈수록 빨리 빠진다
    const a0 = solid + Math.round(i * F / nb), a1 = solid + Math.round((i + 1) * F / nb);
    if (a1 <= a0) continue;
    tile(a0, a1 - a0, y0 + a0);
  }
  ctx.restore();
}
// 원경을 표시 크기로 부드럽게 줄인 캔버스 — 구역·크기가 같으면 재사용.
// 오프스크린 캔버스를 못 만드는 환경(jsdom)은 원본을 그대로 돌려준다.
const bdCache = {};
function backdropScaled(zk, img, sw, sh){
  const key = zk + ':' + sw + 'x' + sh;
  if (bdCache[key]) return bdCache[key];
  let out = img;
  try {
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    const g = c.getContext('2d');
    if (g && g.drawImage){
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      // 2단 축소(절반 → 최종)가 한 번에 줄이는 것보다 덜 뭉개진다
      let cur = img, cw = img.naturalWidth, ch = img.naturalHeight;
      while (cw / 2 > sw){
        const t = document.createElement('canvas'); t.width = Math.round(cw / 2); t.height = Math.round(ch / 2);
        const tg = t.getContext('2d'); tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high';
        tg.drawImage(cur, 0, 0, t.width, t.height); cur = t; cw = t.width; ch = t.height;
      }
      g.drawImage(cur, 0, 0, sw, sh);
      out = c;
      // 윗쪽 투명 띠 — 줄 평균 알파가 200을 넘는 첫 줄까지 (v2.85, 상단 바가 이 띠를 덮는다)
      try {
        const d = g.getImageData(0, 0, sw, sh).data;
        let top = 0;
        for (let y = 0; y < sh; y++){
          let a = 0; for (let x = 0; x < sw; x++) a += d[(y * sw + x) * 4 + 3];
          if (a / sw > 200){ top = y; break; }
        }
        bdClear[key] = top;
        // 아래 균일 띠 — 줄 평균 밝기가 맨 아랫줄과 3 이내로 이어지는 줄 수 (bg_extract --pad 띠·설산 눈밭)
        const lum = y => { let a = 0; for (let x = 0; x < sw; x++){ const i = (y * sw + x) * 4; a += d[i] + d[i + 1] + d[i + 2]; } return a / (3 * sw); };
        const base = lum(sh - 1); let band = 0;
        for (let y = sh - 1; y >= 0; y--){ if (Math.abs(lum(y) - base) <= 3) band++; else break; }
        bdBand[key] = band;
      } catch(e) {}
    }
  } catch(e) {}
  bdCache[key] = out;
  return out;
}
// 원경이 깔린 구역의 지평선 화면 y — 이 위는 '하늘'이라 소품을 세우지 않는다
function horizonY(){
  const img = IMG[BACKDROP.keys[rzone().k]];
  if (!img || !img.complete || !img.naturalWidth) return -1e9;
  const sh = Math.round(VH * (BACKDROP.h[rzone().k] || BACKDROP.hDef));
  const sw = Math.max(1, Math.round(sh * img.naturalWidth / img.naturalHeight));
  return backdropTop(rzone().k, sw, sh) + sh - backdropFade(rzone().k, sw, sh) * BACKDROP.cull;
}
// 배경 소품 — 시트 스프라이트를 넓은 격자에 성기게. 인물 뒤 층. 가시 셀만.
function drawProps(ox, oy){
  const D = PROPS[rzone().k]; if (!D) return;
  const G = D.grid;
  const cx0 = Math.floor(ox / G) - 1, cx1 = Math.floor((ox + VW) / G) + 1;
  const cy0 = Math.floor(oy / G) - 1, cy1 = Math.floor((oy + VH) / G) + 1;
  const hy = horizonY();
  ctx.save();
  for (let cx = cx0; cx <= cx1; cx++){
    for (let cy = cy0; cy <= cy1; cy++){
      if (thash(cx, cy, 31) > D.dens) continue;
      const x = Math.round(cx * G + thash(cx, cy, 32) * G - ox);
      const y = Math.round(cy * G + thash(cx, cy, 33) * G - oy);
      if (y < hy) continue;                           // 지평선 위(원경 띠)엔 소품 없음
      propSprite(D, x, y, cx, cy, hy);
    }
  }
  ctx.restore();
}
// 스프라이트 소품 — 가중 랜덤으로 하나 골라 바닥 중앙에 그린다(네이티브 종횡비 유지).
function propSprite(D, x, y, cx, cy, hy){
  let tot = 0; for (const p of D.pick) tot += p[2];
  let r = thash(cx, cy, 34) * tot, sel = D.pick[0];
  for (const p of D.pick){ r -= p[2]; if (r <= 0){ sel = p; break; } }
  const img = IMG[sel[0]]; if (!img) return;
  const gh = sel[1], nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
  // 소품은 원경 뒤 층이다(원경이 항상 위, v2.62) — 키 큰 소나무가 지평선 바로 아래 서면
  // 머리가 원경에 덮여 잘려 보였다("설산 나무가 잘림", v2.69.3). 꼭대기가 원경에 닿으면 안 세운다.
  if (hy !== undefined && y - gh < hy) return;
  const gw = Math.max(1, Math.round(gh * nw / nh));
  ctx.globalAlpha = 1;
  pixShadow(x, y, Math.round(gw * 0.66));
  draw(img, Math.round(x - gw/2), Math.round(y - gh), gw, gh);
}
function pixShadow(x, y, w){                            // 픽셀 타원 그림자 3단
  ctx.fillStyle = 'rgba(0,0,0,.17)';
  ctx.fillRect(Math.round(x - w*0.32), Math.round(y),   Math.round(w*0.64), 1);
  ctx.fillRect(Math.round(x - w*0.5),  Math.round(y)+1, Math.round(w),     1);
  ctx.fillRect(Math.round(x - w*0.32), Math.round(y)+2, Math.round(w*0.64), 1);
}
function shadow(x, y, w){
  ctx.save();
  ctx.globalAlpha = 0.26; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y, w*0.34, w*0.13, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// 무공 색 빛무리 — 동심원 3겹, 가산 합성. 그라디언트 없이 픽셀풍으로.
function glowBall(x, y, g, r, alpha){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgb(' + g.c + ')';
  for (let i = 3; i >= 1; i--){
    ctx.globalAlpha = alpha / (i * 1.4);
    ctx.beginPath();
    ctx.arc(x, y, r * (0.35 + 0.3 * i), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
// 시전 중 손끝(또는 발밑) 발광 — 작은 스프라이트 점이 안 보인다는 피드백
// v2.61: FXD.castGlow 배율로 반경·알파를 키우고 바깥에 얇은 네온 테를 두른다
function drawCastGlow(ox, oy){
  const g = HFX.glow[P.castK];
  if (!g || P.anim !== 'cast') return;
  const pul = 0.8 + 0.2 * Math.sin(S.t * 16);
  const gx = Math.round(P.x + P.dir * g.dx - ox), gy = Math.round(P.y - g.dy - oy);
  const r = g.r * pul * FXD.castGlow.r;
  glowBall(gx, gy, g, r, FXD.castGlow.a);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgb(' + g.c + ')';
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = FXD.castGlow.rim * pul;
  ctx.beginPath(); ctx.arc(gx, gy, r * 1.15, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
// 탄 잔상 (v2.61) — 현재 변환(진행 방향 = +x)에서 -x 쪽으로 고스트 n개를 lighter로.
// 스프라이트 원본 칸(sx,sy,sw,sh)을 그대로 쓰므로 drawImage 2~3회면 끝난다.
function drawTrail(im, sx, sy, sw, sh, base){
  const T = FXD.trail;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= T.n; i++){
    const k = 1 - (i - 1) / T.n, s = 1 - T.shrink * i;
    ctx.globalAlpha = base * T.a * k;
    const w = sw * s, h = sh * s;
    draw(im, sx, sy, sw, sh, -Math.round(w/2) - T.gap * i, -Math.round(h/2), w, h);
  }
  ctx.restore();
}

// 등급색 기운 (v2.88) — 옛 안개 스트립(aidle_*)은 평균 알파 6에 회보라라 색을 입혀도 안 보였다. 대신 **이 컷의 실루엣**을 등급색으로
// 칠해 8방향×(pad-1)px 번지게 한 발광 캔버스를 (동작·컷·색)마다 한 번 만들고 'lighter'로 몸 뒤에 얹는다(시험판 review/weapon_overlay2와 같은 결).
// 스크래치 캔버스라 source-in을 써도 본 캔버스에 자국이 없다. jsdom은 null(안 그림).
const auraCache = {};
function auraGlow(im, sx, fw, fh, ck, col){
  const k = ck + ':' + col;
  if (auraCache[k] !== undefined) return auraCache[k];
  let out = null;
  try {
    const PAD = HFX.auraGrade.pad;
    const sil = document.createElement('canvas'); sil.width = fw; sil.height = fh;
    const sg = sil.getContext('2d');
    if (sg && sg.drawImage && sg.getImageData){
      sg.drawImage(im, sx, 0, fw, fh, 0, 0, fw, fh);
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, fw, fh);
      const c = document.createElement('canvas'); c.width = fw + PAD * 2; c.height = fh + PAD * 2;
      const g = c.getContext('2d'); g.globalAlpha = HFX.auraGrade.layer;
      for (let r = 1; r < PAD; r++) for (let d = 0; d < 8; d++){
        const a = d * Math.PI / 4; g.drawImage(sil, PAD + Math.round(Math.cos(a) * r), PAD + Math.round(Math.sin(a) * r));
      }
      out = c;
    }
  } catch(e) {}
  auraCache[k] = out;
  return out;
}
// 기운 얹기 — 어느 동작이든 (v2.88.1 사용자: "오라가 모든 모션에 들어가야지"). 보스 등장 연출 중엔 끈다(v2.42 흐림 제보).
function drawAuraGlow(im, sx, fw, fh, ck, dx, dy){
  const ak = auraKey();
  P.auraCol = ak ? ak.col : null;                 // 검증용(fxtest) — 저장 안 함
  if (!ak || (S.summonT > 0) || (S.gateT > 0) || !im || !im.complete || !im.naturalWidth) return;
  const glow = auraGlow(im, sx, fw, fh, ck, ak.col), PAD = HFX.auraGrade.pad;
  if (!glow) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = ak.a * (1 - HFX.auraGrade.pulse + HFX.auraGrade.pulse * Math.sin(S.t * 3));   // 숨 쉬듯 맥동
  ctx.drawImage(glow, dx - PAD, dy - PAD);        // draw() 헬퍼는 캔버스(complete 없음)를 거른다 — 직접 그린다
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawHero(ox, oy){
  const x = Math.round(P.x - ox), y = Math.round(P.y - oy);
  // 경공 (v2.41) — 날기는 공중에 떠서, 착지는 바닥에. 단일 컷.
  if (P.anim === 'dashfly' || P.anim === 'dashland'){
    const fly = P.anim === 'dashfly';
    const im = IMG[fly ? 'hero_dashfly' : 'hero_dashland'];
    const w = fly ? DASH.fw : DASH.lw, h = fly ? DASH.fh : DASH.lh;
    const lift = fly ? DASH.lift : 0;
    shadow(x, y, HERO.w * (fly ? 0.7 : 1));       // 뜬 만큼 그림자 작게
    ctx.save();
    ctx.translate(x, y - lift);
    if (P.dir < 0) ctx.scale(-1, 1);
    drawAuraGlow(im, 0, im && im.naturalWidth || w, im && im.naturalHeight || h, P.anim, -Math.round(w/2), -h);
    draw(im, -Math.round(w/2), -h, w, h);
    ctx.restore();
    return;
  }
  shadow(x, y, HERO.w);
  if (P.anim === 'medit') drawMeditAura(x, y);   // 운기조식 — 몸 뒤 후광·발밑 광륜·호흡 고리 (v2.78)
  let [n] = ANIM[P.anim];
  // 절정부터 정권에 권기가 붙는다 — 같은 동작, 다른 그림.
  // 시전(cast)은 초식마다 스트립·프레임 수가 다르다.
  let key = P.anim, fw = HERO.w;
  // 정권 — 오른손(katka)·왼손(katkb) 권기 스트립을 공격마다 교대한다.
  // v2.36: 전 경지에서 권기 판을 쓴다. 맨손 판(atka·atkb)은 권기를 지운
  // 자리에 주먹이 배 앞 살덩이로 떠 옷이 뚫린 듯 보였다("옷이 이상해" 피드백) —
  // 시트에 권기가 구워져 있어 맨손 합성이 무리였다. 성장 표현은 경지 기운이 담당.
  if (P.anim === 'atk'){
    // 기본공격 (v2.48) — 동작 키가 곧 스트립(주먹 3종·발차기 3종·무기 동작). v2.76: 두 판 교대(punchb) 폐지, 주먹도 세 동작이 돌아간다.
    key = P.atkKey || 'punch'; fw = HFX.aw[key] || HERO.w;
  }
  else if (P.anim === 'cast'){
    const ck = HFX.cast[P.castK] || HFX.cast.pagong;
    key = ck[0]; fw = ck[1]; n = castN(P.castK);   // 성이 낮으면 컷을 덜어낸 판
  }
  else if (P.anim === 'idle' && WEAPONMOVES[heroWeaponKind()]){
    // 무기를 끼면 대기 = 그 무기 첫 동작의 1컷(무기 든 자세) (v2.90.1, 사용자: "무기는 어차피 우리 이미지 있는데") — 시트 없이 손에 무기가 보인다
    key = WEAPONMOVES[heroWeaponKind()][0].key; fw = HFX.aw[key] || HERO.w; n = 1;
  }
  else if (HFX.aw[key]) fw = HFX.aw[key];
  const im = IMG['hero_' + key];
  let fi = Math.floor(P.af);
  fi = (P.anim === 'atk' || P.anim === 'hit' || P.anim === 'cast')
       ? Math.min(fi, n-1) : (fi % n);
  if (P.anim === 'cast') fi = castFrame(P.castK, fi);       // 성긴 판 → 원본 칸 번호
  ctx.save();
  ctx.translate(x, y);
  if (P.dir < 0) ctx.scale(-1, 1);
  // 기운(장비 등급색 발광, v2.88) — 모든 동작에 붙는다. 보스 등장 연출 중만 끈다(v2.42 흐림 제보)
  const FH = HFX.fh && HFX.fh[key], fh = FH ? FH[0] : HERO.h, ftop = FH ? FH[1] : 0;   // 키 큰 캔버스(머리 위 무기) — 땅은 그대로 (v2.73)
  drawAuraGlow(im, fi * fw, fw, fh, key + ':' + fi, -Math.round(fw/2), -HERO.h - ftop);
  const hurt = P.hitT > 0;
  if (hurt) ctx.globalAlpha = 0.62 + Math.sin(S.t*46)*0.22;
  draw(im, fi*fw, 0, fw, fh, -Math.round(fw/2), -HERO.h - ftop, fw, fh);
  // 주먹 끝 흰 점(FIST)은 v2.31에서 은퇴 — 옛 35px 스트립 전용 좌표였고,
  // 지금 쓰는 양손 판(atka·atkb·katka·katkb)은 주먹이 그림에 다 있다.
  if (hurt){                       // 붉게 번쩍여 맞은 것을 알린다
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.5, P.hitT*2.4);
    draw(im, fi*fw, 0, fw, fh, -Math.round(fw/2), -HERO.h - ftop, fw, fh);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // 체력바 — 다치면 머리 위에 뜬다. 적(빨강)과 구분되게 초록.
  if (!P.dead && P.hp < P.hpMax - 0.5){
    const w = 30, h = 3;
    const by = y - HERO.h - 6;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x-w/2, by, w, h);
    ctx.fillStyle = '#63b06a';
    ctx.fillRect(x-w/2, by, w*(P.hp/P.hpMax), h);
  }
  // 운기조식 — 기운 방울은 몸 위에 얹는다
  if (P.anim === 'medit') drawQi(x, y);
}

function drawFoe(f, ox, oy){
  const M = foeM(f);
  // 문에서 걸어 나오는 중이면 아래부터 드러난다
  const rise = f.rise > 0 ? clamp(1 - f.rise/SUMMON.rise, 0, 1) : 1;
  // 종류별 그리기 배율 M.sc (v2.87, 사용자: "표범·풍뎅이 크기가 너무 큼") — 그림·그림자·체력바가 같이 줄어든다
  const sc = (f.boss && !ZONEBOSS[zone().k]) ? BOSS.scale : (M.sc || 1);
  const x = Math.round(f.x - ox), y = Math.round(f.y - oy);
  // 개구리처럼 캔버스가 몸보다 넓은 적은 실제 몸 폭 sw 를 쓴다
  const BW = M.sw || M.w;
  if (!f.boss) shadow(x, y, BW * sc);     // 보스는 그림자 대신 오라를 쓴다
  ctx.save();
  ctx.translate(x, y);
  if (f.dir < 0) ctx.scale(-1, 1);
  if (f.dead) ctx.globalAlpha = Math.max(0, f.dying/0.22);
  // 공격 중엔 앞으로 기운다
  let dw = Math.round(M.w*sc), dh = Math.round(M.h*sc), off = 0, lx = 1, ly = 1;
  if (f.atkT > 0){
    const k = 1 - Math.abs(1 - (1 - f.atkT/FOE.dur)/FOE.hitAt);
    lx = 1+0.10*k; ly = 1+0.06*k;
    dw = Math.round(M.w*sc*lx); dh = Math.round(M.h*sc*ly);
    off = Math.round(BW*sc*0.14*k);
  }
  const seq = M.anim[f.anim] || M.anim.idle;
  let fi = Math.floor(f.af);
  fi = (f.anim.indexOf('atk')===0 || f.anim==='death') ? Math.min(fi, seq.length-1) : (fi % seq.length);   // atk·atk2·atk3 는 마지막 컷에서 멈춘다
  // 주인공 스트립을 빌려 쓰는 몹(본진 제자·장로, v2.94) — 도복만 문파색으로 물들인 캔버스, 컷은 스트립 오프셋
  const HS = M.heroStrip ? (M.heroStrip[f.anim] || M.heroStrip.idle) : null;
  let im, sx = 0, sw = 0;
  if (HS){
    const col = (SCHOOLS[M.school] || SCHOOLS.none).c;
    im = (typeof tintedStrip === 'function' && tintedStrip(HS[0], col)) || IMG[HS[0]];
    sw = HFX.aw[HS[1]] || HERO.w; sx = fi * sw;
    dw = Math.round(sw*sc*lx); dh = Math.round(HERO.h*sc*ly);
  } else im = IMG[f.k + '_' + seq[fi]];
  const blit = () => { if (HS){ if (im) try{ ctx.drawImage(im, sx, 0, sw, HERO.h, -Math.round(dw/2)+off, -dh, dw, dh); }catch(e){} } else draw(im, -Math.round(dw/2)+off, -dh, dw, dh); };
  if (rise < 1){
    // 아래 절반부터 서서히 드러난다
    ctx.save();
    ctx.beginPath();
    ctx.rect(-dw, -dh*rise, dw*2, dh*rise + 4);
    ctx.clip();
    ctx.globalAlpha = 0.35 + rise*0.65;
    blit();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.restore();                // 바깥 save(translate)도 닫는다 — 안 닫으면 rise 동안 뒤에 그리는 주인공·탄이 보스 좌표만큼 밀려 화면 밖으로(v2.94, 스크린샷 에이전트 발견)
    return;
  }
  // 상시 오라 — 발밑에서 시작해 몸을 타고 오른다
  // 상시 오라 — 점을 이어 하나의 면으로 그린다
  if (f.boss && f.rise <= 0){
    drawAura(0, 0, dw, dh, M.school ? (SCHOOLS[M.school] || SCHOOLS.none).c : null);   // 본진 장로는 문파색 기운 (v2.94.6)
  }
  blit();
  if (f.boss){                     // 보스는 몸에만 붉은 기운이 돈다
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14 + Math.sin(S.t*3.4)*0.06;
    blit();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  if (f.hit > 0){
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.45, f.hit*4);
    blit();
    ctx.globalCompositeOperation = 'source-over';
  }
  // 피격 브라이튼 (v2.61) — 같은 스프라이트를 lighter로 n겹 더 얹어 실루엣 그대로
  // 하얗게 번쩍인다. 스크래치 캔버스·source-atop 없이(사각 자국 방지) 알파만으로.
  if (f.hitT > 0 && !f.dead){
    const k = FXD.hitflash.a * Math.min(1, f.hitT / FXD.hitflash.life);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k;
    for (let i = 0; i < FXD.hitflash.n; i++) blit();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 체력바 — 보스는 화면 상단에 따로 그린다
  if (!f.dead && f.hp < f.hpMax && !f.boss){
    const w = 24, h = 3;
    const by = y - (M.bh || M.h) * sc - 6;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x-w/2, by, w, h);
    ctx.fillStyle = '#d2564a';
    ctx.fillRect(x-w/2, by, w*(f.hp/f.hpMax), h);
  }
}

function drawFx(ox, oy){
  for (const e of S.fx){
    const a = e.life / e.t;
    const x = Math.round(e.x - ox), y = Math.round(e.y - oy);
    if (e.k === 'burst'){
      // 파열 — 가산 합성 심광 + 튀는 파편 (v2.31 강화: 단색 점 → 빛이 쌓인다)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cc = e.c || '255,224,160';
      ctx.fillStyle = 'rgb(' + cc + ')';
      for (let i = 3; i >= 1; i--){                  // 중심 섬광 — 커지며 스러진다
        ctx.globalAlpha = a * 0.6 / (i * 1.3);
        ctx.beginPath();
        ctx.arc(x, y, (5 + (1-a)*10) * (0.4 + 0.28*i), 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = a * 0.9;
      const r = 4 + (1-a)*20;
      for (let i=0;i<6;i++){
        const ang = i/6*Math.PI*2 + (e.sd||0);
        ctx.fillRect(x+Math.cos(ang)*r-1, y+Math.sin(ang)*r*0.7-1, 3, 3);
      }
      ctx.restore();
    } else if (e.k === 'wave'){
      // 충격파 고리 — 밝은 심 + 넓은 여운이 빠르게 퍼지다 잦아든다
      const r = e.r * (1 - a*a);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + (e.c || '220,236,255') + ')';
      ctx.globalAlpha = a * 0.8;
      ctx.lineWidth = FXD.wave.w + a * 3;
      ctx.beginPath(); ctx.ellipse(x, y, r, r/HERO.atkFlat, 0, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = a * 0.28;
      ctx.lineWidth = (FXD.wave.w + a*3) * 2.6;
      ctx.beginPath(); ctx.ellipse(x, y, r*0.86, r*0.86/HERO.atkFlat, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    } else if (e.k === 'ripple'){
      // 바닥 파문 — 납작한 고리 두 겹이 서로 다른 속도로 자란다 (아미 장로 석장 내려꽂기·청죽 장로 발구르기)
      const D = FXD.ripple;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + (e.c || '190,255,200') + ')';
      for (let i = 0; i < 2; i++){
        const rr = (i ? D.r2 : D.r) * (1 - a*a);
        ctx.globalAlpha = a * (i ? 0.35 : 0.75);
        ctx.lineWidth = D.w + a * (i ? 1 : 2);
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr * D.sq, 0, 0, Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    } else if (e.k === 'cloud'){
      // 독무 — 반투명 덩이 여럿이 저마다 다른 속도로 커지며 옅어진다 (당문 장로 장풍·독환)
      const D = FXD.cloud, p = 1 - a;
      ctx.save();
      ctx.fillStyle = 'rgb(' + (e.c || '201,239,162') + ')';
      for (let i = 0; i < D.n; i++){
        const h1 = ambHash(i, 11), h2 = ambHash(i, 23);
        ctx.globalAlpha = a * D.a * (0.5 + h1 * 0.5);
        const rr = D.r + p * D.grow * (0.6 + h2 * 0.8);
        const dx = (h1 - 0.5) * D.grow * p * 1.4 * (e.dir || 1);
        const dy = (h2 - 0.5) * D.r * 1.2;
        ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rr, rr * 0.7, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else if (e.k === 'rays'){
      // 방사 속도선 — 큰 순간의 "번쩍". 바깥으로 쏘아지며 사라진다
      const p = 1 - a;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + (e.c || '236,244,255') + ')';
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = a * 0.85;
      const RN = e.n || FXD.rays.n, RL = e.len || FXD.rays.len, RS = e.n ? 40 : 95;   // 동작별 임팩트(v2.78)는 짧고 촘촘·덜 뻗는다
      for (let i = 0; i < RN; i++){
        const ang = i/RN*Math.PI*2 + (e.sd||0);
        const r0 = (e.r||20) + p*RS, ln = RL * (0.5 + ambHash(i,7)*0.8) * a;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang)*r0,      y + Math.sin(ang)*r0*0.62);
        ctx.lineTo(x + Math.cos(ang)*(r0+ln), y + Math.sin(ang)*(r0+ln)*0.62);
        ctx.stroke();
      }
      ctx.restore();
    } else if (e.k === 'sparks'){
      // 타격 파편 — 포물선으로 튀는 불티. 상태 없이 시간으로 위치를 만든다
      const el = e.t - e.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgb(' + (e.c || '255,220,150') + ')';
      for (let i = 0; i < FXD.spark.n; i++){
        const h1 = ambHash(i, 11 + (e.sd||0)), h2 = ambHash(i, 23 + (e.sd||0));
        const ang = e.up ? (-Math.PI/2 + (h1 - 0.5) * 1.3) : h1 * Math.PI * 2, spd = FXD.spark.spd * (0.4 + h2);   // up: 위로 튄다(승룡권, v2.78)
        const px = e.x + Math.cos(ang)*spd*el - ox;
        const py = e.y + Math.sin(ang)*spd*el*0.6 + FXD.spark.g*el*el*0.5 - oy;
        ctx.globalAlpha = a;
        ctx.fillRect(Math.round(px)-1, Math.round(py)-1, 2, 2);
        ctx.globalAlpha = a * 0.3;
        ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else if (e.k === 'flash'){
      // 섬광 — 넓은 가산 원광이 확 밝았다 스러진다 (화면 전체가 살짝 물든다)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgb(' + (e.c || '255,240,220') + ')';
      for (let i = 3; i >= 1; i--){
        ctx.globalAlpha = a * 0.42 / (i * 1.6);
        const rr = e.r * (0.35 + 0.3*i);
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr*0.7, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else if (e.k === 'slash'){
      // 참격 호 (v2.61) — 임팩트 지점에 dir 쪽으로 볼록한 네온 초승달. 확장+페이드.
      // 그라디언트 없이 동심 호 세 겹(넓은 여운·중간·흰 심)으로 발광을 낸다.
      const D = FXD.slash, p = 1 - a;
      const r = e.r * (0.55 + 0.45 * Math.sqrt(p));
      const base = (e.dir < 0 ? Math.PI : 0) + (e.sd || 0) * D.tilt + (e.tiltA || 0) * (e.dir < 0 ? -1 : 1);   // tiltA: 뛰어차기 위로 기운 호(v2.78)
      const SPAN = e.span || D.span;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.82);                          // 옆에서 본 시점 — 살짝 납작하게
      ctx.rotate(base);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const layers = [[3.2, 0.22, 'rgb(' + e.c + ')'], [1.7, 0.55, 'rgb(' + e.c + ')'], [0.8, 0.95, '#ffffff']];
      for (const [wk, ak, col] of layers){
        ctx.strokeStyle = col;
        ctx.lineWidth = D.w * wk * (0.6 + a * 0.6);
        ctx.globalAlpha = a * ak;
        ctx.beginPath(); ctx.arc(-r * 0.35, 0, r, -SPAN, SPAN); ctx.stroke();
      }
      ctx.restore();
    } else if (e.k === 'streak'){
      // 검흔·관통선·솟는 빛줄기 (v2.78) — 임팩트 지점을 지나는 한 줄기. 안쪽 흰 심 + 바깥 색 여운, 늘어나며 옅어진다.
      const p = 1 - a, L = e.len * (0.5 + 0.5 * Math.sqrt(p)), c = Math.cos(e.ang), sn = Math.sin(e.ang);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const [wk, ak, col] of [[3.0, 0.2, 'rgb(' + e.c + ')'], [1.5, 0.55, 'rgb(' + e.c + ')'], [0.7, 0.95, '#ffffff']]){
        ctx.strokeStyle = col; ctx.lineWidth = e.w * wk * (0.5 + a * 0.5); ctx.globalAlpha = a * ak;
        ctx.beginPath(); ctx.moveTo(x - c * L, y - sn * L * 0.8); ctx.lineTo(x + c * L, y + sn * L * 0.8); ctx.stroke();
      }
      ctx.restore();
    } else if (e.k === 'petals'){
      // 부채 — 청록 잎 조각(작은 호)이 보는 쪽으로 흩날리며 돌다 잦아든다 (v2.78)
      const el = e.t - e.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + e.c + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let i = 0; i < e.n; i++){
        const h1 = ambHash(i, 31 + (e.sd||0)), h2 = ambHash(i, 47 + (e.sd||0));
        const ang = (e.dir < 0 ? Math.PI : 0) + (h1 - 0.5) * 1.6, spd = e.spd * (0.5 + h2);
        const px = e.x + Math.cos(ang) * spd * el - ox, py = e.y + Math.sin(ang) * spd * el * 0.6 - 18 * el + 40 * el * el - oy;
        const rot = h2 * 6.28 + el * 9;
        ctx.globalAlpha = a * 0.9;
        ctx.beginPath(); ctx.arc(px, py, 3, rot, rot + 2.2); ctx.stroke();
      }
      ctx.restore();
    } else if (e.k === 'stepdust'){
      // 발밑 흙먼지 (v2.78) — 가산 없이 옅은 흙색 원 몇 개가 뒤로 밀리며 떠올라 스러진다
      const D = FXD.stepdust, el = e.t - e.life;
      ctx.save();
      ctx.fillStyle = 'rgb(' + D.c + ')';
      for (let i = 0; i < D.n; i++){
        const h1 = ambHash(i, 53 + (e.sd||0)), h2 = ambHash(i, 71 + (e.sd||0));
        const px = x - e.dir * (4 + h1 * 10) * (el / e.t) - e.dir * i * 2, py = y - 1 - (2 + h2 * 6) * (el / e.t);
        ctx.globalAlpha = a * 0.5;
        ctx.beginPath(); ctx.arc(px, py, D.r * (0.7 + h2 * 0.6) * (0.6 + (el / e.t) * 0.8), 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else if (e.k === 'critring'){
      // 치명타 바닥 네온 링 (v2.61) — 발밑에서 타원이 퍼지며 짧게 스러진다
      const D = FXD.critring, p = 1 - a;
      const r = e.r * (0.3 + 0.7 * Math.sqrt(p));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + e.c + ')';
      ctx.globalAlpha = a * 0.9;
      ctx.lineWidth = D.w;
      ctx.beginPath(); ctx.ellipse(x, y, r, r / HERO.atkFlat / 1.4, 0, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = a * 0.3;
      ctx.lineWidth = D.w * 2.8;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.9 / HERO.atkFlat / 1.4, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    } else if (e.k === 'dmg'){
      // 타격 숫자 — 평타는 조그맣게 희끗, 회심은 크고 노랗게 튄다.
      // v2.61: 등장 스케일 팝(pop→1) + 어두운 스트로크·밝은 채움의 네온 외곽선.
      const D = FXD.dmgpop, p = 1 - a, el = e.t - e.life;
      const pop = 1 + (D.pop - 1) * Math.max(0, 1 - el / D.popT);
      const size = e.c ? D.critSize : D.size, rise = e.c ? 15 : 10;
      ctx.save();
      ctx.translate(x, Math.round(y - p * rise));
      ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = '900 ' + size + 'px Jua,sans-serif';
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = e.c ? D.critStroke : D.stroke;
      ctx.strokeStyle = e.c ? '#3a2400' : 'rgba(8,12,22,.9)';
      ctx.strokeText(e.v, 0, 0);
      ctx.fillStyle = e.c ? D.cc : D.c;
      ctx.fillText(e.v, 0, 0);
      if (e.c){                                    // 치명타 — 금빛 잔광을 가산으로 한 겹
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * D.glowA;
        ctx.fillStyle = 'rgb(' + D.glow + ')';
        ctx.fillText(e.v, 0, 0);
      }
      ctx.restore();
    } else if (e.k === 'pashot' || e.k === 'bshot'){
      // 초식 탄 — 권기 주먹(파공권)·지풍 빔(암향지)이 실제로 날아간다
      const pa = e.k === 'pashot';
      const bw = pa ? HFX.shotW : HFX.bshotW, bh = pa ? HFX.shotH : HFX.bshotH;
      const el = e.t - e.life;
      const p = Math.min(1, el / HFX.shotT);
      const sx = e.x + (e.tx - e.x) * p - ox, sy = e.y + (e.ty - e.y) * p - oy;
      // 파공권은 비행 2 + 소멸 2, 지풍은 통짜 1프레임(알파로만 사라진다)
      const fi = !pa ? 0
               : el < HFX.shotT ? (Math.floor(el * 22) % 2)
               : (el - HFX.shotT >= HFX.fadeT * 0.5 ? 3 : 2);
      ctx.save();
      ctx.translate(Math.round(sx), Math.round(sy));
      // 날아가는 방향으로 기운다 — 왼쪽이면 거울 뒤 반전각 (뒤집힘 방지)
      const dx = e.tx - e.x, dy = e.ty - e.y;
      if (dx < 0){ ctx.scale(-1, 1); ctx.rotate(Math.atan2(dy, -dx)); }
      else ctx.rotate(Math.atan2(dy, dx));
      const sa = el < HFX.shotT ? 1 : Math.min(1, a * 2);
      // 탄 잔상 (v2.61) — 비행 중 진행 반대쪽(회전 뒤 -x)에 고스트를 lighter로 깔아 속도감
      if (el < HFX.shotT) drawTrail(IMG[e.k], fi*bw, 0, bw, bh, sa);
      ctx.globalAlpha = sa;
      draw(IMG[e.k], fi*bw, 0, bw, bh, -Math.round(bw/2), -Math.round(bh/2), bw, bh);
      // 무공 색 빛무리 — 파공권은 몸통, 지풍은 촉끝. 어두운 탄이 배경에 묻히지 않게
      const gk = HFX.glow[pa ? 'pagong' : 'baekbo'];
      if (gk) glowBall(pa ? 0 : Math.round(bw * 0.4), 0, gk,
                       bh * 0.5, (el < HFX.shotT ? 1 : a) * 0.55);
      ctx.restore();
    } else if (e.k === 'imgburst'){
      // 그림 파열 — 명중 지점에서 먼지 등이 퍼지며 사라진다
      const im = IMG[e.im];
      if (im && im.complete && im.naturalWidth){
        const sc2 = 0.6 + (1 - a) * 0.7;
        const w = im.naturalWidth * sc2, h2 = im.naturalHeight * sc2;
        ctx.save();
        ctx.globalAlpha = a * 0.9;
        draw(im, Math.round(x - w/2), Math.round(y - h2/2), w, h2);
        ctx.restore();
      }
    } else if (e.k === 'taiji'){
      // 건곤이형 — 태극 원반이 돌다가 힘을 되쏜다
      const fi = Math.min(HFX.taijiN - 1, Math.floor((1 - a) * HFX.taijiN));
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 3);
      draw(IMG.gshield, fi * HFX.taijiW, 0, HFX.taijiW, HFX.taijiH,
           Math.round(e.x - ox - HFX.taijiW/2), Math.round(e.y - oy - HFX.taijiH/2),
           HFX.taijiW, HFX.taijiH);
      ctx.restore();
    } else if (e.k === 'streak'){
      // 기파 — 손에서 적까지 빛줄기가 쏘아진다
      const tx = Math.round(e.tx - ox), ty = Math.round(e.ty - oy);
      const p = 1 - a;                              // 0→1 진행
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#cfe8ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + (tx-x)*Math.max(0, p-0.35), y + (ty-y)*Math.max(0, p-0.35));
      ctx.lineTo(x + (tx-x)*Math.min(1, p*1.6), y + (ty-y)*Math.min(1, p*1.6));
      ctx.stroke();
      ctx.fillStyle = '#f0f8ff';
      ctx.beginPath(); ctx.arc(x + (tx-x)*Math.min(1, p*1.6), y + (ty-y)*Math.min(1, p*1.6), 3, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    } else if (e.k === 'ring'){
      // 기의 고리 — 발밑에서 퍼져 나간다 (탑다운 보정으로 납작하게)
      // v2.31: 가산 합성 + 무공 색 — 빛이 쌓여 훨씬 두텁게 보인다
      const p = 1 - a;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + (e.c || '216,236,255') + ')';
      ctx.globalAlpha = a * 0.9;
      ctx.lineWidth = 2 + a*2;
      ctx.beginPath();
      ctx.ellipse(x, y, e.r * p, e.r * p / HERO.atkFlat, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.3;
      ctx.lineWidth = (2 + a*2) * 2.4;
      ctx.beginPath();
      ctx.ellipse(x, y, e.r * p * 0.92, e.r * p * 0.92 / HERO.atkFlat, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    } else if (e.k === 'heal'){
      // 활인 — 초록 기운 고리가 몸을 타고 오른다
      const p = 1 - a;
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = '#8fe0a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y - p * HERO.h, 15 * (1-p*0.5), 5, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    } else if (e.k === 'artname'){
      // 초식명 외치기 — 파공권! 외치는 순간 커졌다 잦아든다 (낫표는 뺐다)
      // v2.63.6: 피해 숫자(dmgpop)와 같은 네온 결 — 굵은 글자·어두운 스트로크·등장 팝·문파색 잔광
      const D = FXD.artname, p = 1 - a, el = e.t - e.life;
      const pop = 1 + (D.pop - 1) * Math.max(0, 1 - el / D.popT);
      const t = e.v + '!';
      ctx.save();
      ctx.translate(x, Math.round(y - p * D.rise));
      ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = '900 ' + D.size + 'px Jua,sans-serif';
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = D.stroke;
      ctx.strokeStyle = 'rgba(8,12,22,.92)';
      ctx.strokeText(t, 0, 0);
      ctx.fillStyle = D.c;
      ctx.fillText(t, 0, 0);
      if (e.col){                                  // 문파색 잔광 한 겹 (가산)
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * D.glowA;
        ctx.fillStyle = e.col;
        ctx.fillText(t, 0, 0);
      }
      ctx.restore();
    }
  }
}

// 구역 분위기 — 무상태 입자. i번 입자의 좌표를 해시(i)와 시간으로 만든다.
// 저장할 것이 없어 저장·시뮬에 영향이 없고, 화면 좌표라 카메라와 무관히 채워진다.
function ambHash(i, s){ return ((i * 2654435761 + s * 97) % 1000) / 1000; }
function drawAmbient(front){
  const A = AMB[rzone().k];
  if (!A) return;
  ctx.save();
  if (!front && A.kind === 'cloud'){
    // 구름 그림자 — 땅 위에 큰 타원이 천천히 흐른다
    for (let i = 0; i < A.n; i++){
      const w = 150 + ambHash(i, 1) * 170;
      const x = ((ambHash(i, 2) * (VW + 400) + S.t * A.spd) % (VW + 400)) - 200;
      const y = ambHash(i, 3) * VH;
      // 두 겹의 옅은 타원 — 가장자리가 부드럽게 읽힌다
      ctx.fillStyle = 'rgba(' + A.c + ',0.07)';
      ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y, w * 0.72, w * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (!front && (A.dark || A.haze)){
    // 가장자리 비네트 — 겹겹이 (동굴은 어둠, 설산은 옅은 한기). 가운데로 시선.
    ctx.fillStyle = A.dark ? 'rgba(6,8,10,' + A.dark + ')'
                           : 'rgba(' + A.haze + ',' + A.hazeA + ')';
    for (let i = 0; i < 3; i++){
      const inset = i * 34;
      ctx.beginPath();
      ctx.rect(-4, -4, VW + 8, VH + 8);
      ctx.ellipse(VW/2, VH/2, VW*0.86 - inset, VH*0.78 - inset, 0, 0, Math.PI*2);
      ctx.fill('evenodd');
    }
  } else if (front && A.kind === 'wind'){
    // 바람 줄기 — 옅은 흰 가로 줄이 빠르게 흐르며 살짝 출렁인다 (천산)
    for (let i = 0; i < A.n; i++){
      const h1 = ambHash(i, 4), h2 = ambHash(i, 5), h3 = ambHash(i, 6);
      const len = 10 + h3 * 16;
      const x = ((h1 * (VW + 60) + S.t * A.spd * (0.7 + h2 * 0.6)) % (VW + 60)) - 30;
      const y = h2 * VH + Math.sin(S.t * 1.1 + i * 1.7) * 6;
      ctx.globalAlpha = 0.16 + h3 * 0.16;
      ctx.fillStyle = 'rgb(' + A.c + ')';
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(len), 1);
    }
  } else if (front && (A.kind === 'leaf' || A.kind === 'snow' || A.kind === 'fire')){
    for (let i = 0; i < A.n; i++){
      const h1 = ambHash(i, 4), h2 = ambHash(i, 5), h3 = ambHash(i, 6);
      if (A.kind === 'snow'){
        const y = (h1 * VH + S.t * A.spd * (0.7 + h2 * 0.6)) % (VH + 8) - 4;
        const x = (h2 * VW + Math.sin(S.t * 1.3 + i) * 14 + S.t * 9) % (VW + 8) - 4;
        ctx.globalAlpha = 0.5 + h3 * 0.4;
        ctx.fillStyle = 'rgb(' + A.c + ')';
        ctx.fillRect(Math.round(x), Math.round(y), h3 > 0.6 ? 2 : 1, h3 > 0.6 ? 2 : 1);
      } else if (A.kind === 'leaf'){
        const x = (h1 * VW + S.t * A.spd * (0.6 + h2)) % (VW + 12) - 6;
        const y = (h2 * VH + Math.sin(S.t * 1.7 + i * 2.1) * 22 + S.t * A.spd * 0.35) % (VH + 12) - 6;
        ctx.globalAlpha = 0.55 + h3 * 0.3;
        ctx.fillStyle = 'rgb(' + A.c + ')';
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      } else {                                   // 반딧불 — 제자리에서 떠다니며 깜빡인다
        const x = h1 * VW + Math.sin(S.t * 0.6 + i * 1.9) * 26;
        const y = h2 * VH + Math.cos(S.t * 0.5 + i * 1.3) * 18;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(S.t * 1.1 + i * 2.7));
        ctx.globalAlpha = 0.5 * tw;
        ctx.fillStyle = 'rgb(' + A.c + ')';
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
        ctx.globalAlpha = 0.16 * tw;
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

function render(){
  const inSect = typeof sectView !== 'undefined' && sectView;
  const sh = (shakeV>0 && !inSect) ? (Math.random()-0.5)*shakeV : 0;   // 마당에선 전투 흔들림을 안 준다 (v2.92.5 "문파에서 계속 흔들림")
  ctx.setTransform(SC,0,0,SC, Math.round(sh*SC), Math.round(sh*SC));
  const ox = S.camX - VW/2, oy = S.camY - VH/2;
  // 문파 터 화면 (v2.92) — 문파 탭이 열려 있으면 전투 대신 마당을 그린다(전투는 뒤에서 계속). 카메라 고정
  if (inSect){
    drawSectBg();                             // v2.92.6 사용자 3/4 시점 마당 그림(cover). 없으면 죽림 바닥+원경
    drawSectScene();
    return;
  }
  drawGround(ox, oy);
  drawProps(ox, oy);                          // 뒤 층 — 배경 소품 스프라이트(시트 추출)
  drawBackdrop(ox);                           // 원경은 항상 소품 위 (v2.62.2 — 키 큰 소품이 원경으로 삐져나왔다).
                                              // 디졸브 구간에선 소품이 안개에 잠기듯 가려진다. 인물·몹은 이 띠에 안 온다.
  drawAmbient(false);                        // 땅 위 층 — 구름 그림자·동굴 어둑함
  drawGateFade(ox, oy);                       // 보스 등장 후 문이 어둠 속으로 스러진다 (뒤에)
  // y 순서로 겹침 정리
  const ents = S.foes.map(f=>({y:f.y, f}));
  ents.push({ y:P.y, hero:true });
  ents.sort((a,b)=>a.y-b.y);
  for (const e of ents){
    if (e.hero){ drawHero(ox, oy); drawCastGlow(ox, oy); } else drawFoe(e.f, ox, oy);
  }
  drawShots(ox, oy);
  drawFx(ox, oy);
  drawAmbient(true);                         // 앞층 — 눈·낙엽·반딧불이 인물 위로 흩날린다
  drawSweep(ox, oy);
  drawSummon(ox, oy);
  drawBossBar(ox, oy);
  drawIntro();
}

/* ── 단계 진입 연출 ────────────────────────────────
   배경 3장이 차례로 화면을 채우며 흐른다.
   각 장은 자기 구간에서 나타나 → 머물다 → 사라진다.
*/
function beginIntro(msg, top){
  S.intro = INTRO.dur;
  S.introMsg = msg;
  S.introTop = top || '';
  S.introSfx = [0,0,0];
}

function drawIntro(){
  if (S.intro <= 0) return;
  const W = cv.width, H = cv.height;
  const el = INTRO.dur - S.intro;                 // 흐른 시간
  ctx.setTransform(1,0,0,1,0,0);
  // 끝날 무렵 덮개를 걷어 게임 화면이 서서히 드러나게 한다
  const veil = clamp(S.intro / 0.45, 0, 1);
  ctx.globalAlpha = veil;
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,H);
  ctx.globalAlpha = 1;

  // 3장을 세로로 쌓았을 때의 배치를 미리 잰다
  const im0 = IMG[rzone().k + '1'];
  if (!im0 || !im0.complete || !im0.naturalWidth){ drawIntroText(W,H,el); return; }
  const sc = W / im0.naturalWidth;
  const ih = im0.naturalHeight * sc;              // 장당 높이 (셋이 같다)
  const gap = H * INTRO.gap;
  const total = ih*3 + gap*2;
  const top = (H - total) / 2;                    // 화면 세로 가운데

  for (let i=0; i<3; i++){
    const im = IMG[rzone().k + (i+1)];
    if (!im || !im.complete || !im.naturalWidth) continue;
    const t0 = i * INTRO.stagger;                 // 이 장이 출발하는 시각
    const k = clamp((el - t0) / INTRO.slide, 0, 1);
    if (k <= 0) continue;
    if (!S.introSfx[i] && k > 0){ S.introSfx[i] = 1; sfx('swoosh'); }
    // 부드럽게 감속하며 제자리로
    const e = 1 - Math.pow(1-k, 3);
    const yTo = top + i*(ih+gap);
    const y = yTo - (1-e) * (ih + gap) * 1.6;     // 위에서 내려온다
    ctx.globalAlpha = Math.min(1, k*1.8) * veil;
    draw(im, 0, y, W, ih);
    ctx.globalAlpha = 1;
  }
  drawIntroText(W, H, el);
}

function drawIntroText(W, H, el){
  const start = INTRO.stagger*2 + INTRO.slide;    // 셋 다 들어온 뒤
  const a = clamp((el - start) / 0.22, 0, 1) * clamp(S.intro/0.45, 0, 1);
  if (a <= 0.01) return;
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // 배경 3장이 놓인 자리를 재서 위아래 여백 가운데에 쓴다
  const im0 = IMG[rzone().k + '1'];
  let topY = H*0.118, botY = H*0.881;
  if (im0 && im0.complete && im0.naturalWidth){
    const ih = im0.naturalHeight * (W / im0.naturalWidth);
    const gap = H * INTRO.gap;
    const total = ih*3 + gap*2;
    const top = (H - total) / 2;
    topY = top / 2;                     // 위 여백 가운데
    botY = (top + total + H) / 2;        // 아래 여백 가운데
  }

  // 위 — 구역 이름 (크게)
  if (S.introTop){
    ctx.fillStyle = '#f0e2b8';
    ctx.font = Math.round(H*0.044) + 'px Jua,-apple-system,sans-serif';
    ctx.fillText(S.introTop, W/2, topY);
    ctx.strokeStyle = 'rgba(240,226,184,.45)'; ctx.lineWidth = 2;
    const tw = W*0.14;
    ctx.beginPath();
    ctx.moveTo(W/2-tw, topY + H*0.032);
    ctx.lineTo(W/2+tw, topY + H*0.032);
    ctx.stroke();
  }

  // 아래 — 단계 (작게)
  ctx.fillStyle = '#d8cba4';
  ctx.font = Math.round(H*0.030) + 'px Jua,-apple-system,sans-serif';
  ctx.fillText(S.introMsg, W/2, botY);
  ctx.globalAlpha = 1;
}



/* ── 보스 체력바 ────────────────────────────────── */
function drawBossBar(ox, oy){
  if (!isBoss()) return;
  const b = S.foes.find(f => f.boss && !f.dead);
  if (!b || b.rise > 0) return;              // 나오는 중엔 감춘다
  const M = foeM(b);
  const x = Math.round(b.x - ox);
  const y = Math.round(b.y - oy) - M.h - 16; // 머리 위
  const w = Math.max(64, M.w * 1.05), h = 6;
  ctx.fillStyle = 'rgba(8,10,14,.85)';
  ctx.fillRect(x - w/2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#3a1c18';
  ctx.fillRect(x - w/2, y, w, h);
  ctx.fillStyle = '#d2564a';
  ctx.fillRect(x - w/2, y, w * Math.max(0, b.hp/b.hpMax), h);
  // 이름 — 크고 또렷하게 (v2.35 "보스 이름이 너무 작다"). 붉은 표제 + 검은 외곽
  ctx.font = '14px Jua,-apple-system,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const nm = zone().boss, ny = y - 4;
  ctx.fillStyle = 'rgba(6,8,12,.92)';
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) ctx.fillText(nm, x + dx, ny + dy);
  ctx.fillStyle = '#ffd9a0';
  ctx.fillText(nm, x, ny);
}


/* ── 운기조식 기운 ─────────────────────────────────
   바닥에서 피어올라 몸을 타고 흩어진다. 방울마다 시작 시각이 달라
   끊이지 않고 이어진다.
*/
// 운기조식 연출 (v2.78, 사용자: "운기조식에 알맞게 이펙트") — 스프라이트 뒤에 그린다.
// 후광: 몸 뒤 온기 원광(가산, 아주 옅게) · 광륜: 발밑 타원이 숨 쉬듯 맥동 · 호흡 고리: 6컷 루프 위상에 맞춰 발밑에서 퍼진다
function drawMeditAura(x, y){
  const M = FXD.meditFx, fade = Math.min(1, S.downT / 0.5), br = 0.5 + 0.5 * Math.sin(S.t * 2.2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgb(' + M.halo.c + ')';
  for (let i = 3; i >= 1; i--){                                     // 후광 — 동심원 세 겹
    ctx.globalAlpha = fade * M.halo.a * (0.6 + 0.4 * br) / i;
    ctx.beginPath(); ctx.arc(x, y - HERO.h * 0.5, M.halo.r * (0.5 + 0.3 * i), 0, Math.PI*2); ctx.fill();
  }
  const rr = M.ring.r * (1 + M.ring.pulse * br);                    // 광륜 — 발밑 타원
  ctx.strokeStyle = 'rgb(' + M.ring.c + ')'; ctx.lineWidth = M.ring.w; ctx.globalAlpha = fade * M.ring.a * (0.7 + 0.3 * br);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 / HERO.atkFlat / 1.4);
  ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha *= 0.35; ctx.lineWidth = M.ring.w * 2.6;
  ctx.beginPath(); ctx.arc(0, 0, rr * 0.92, 0, Math.PI*2); ctx.stroke();
  // 호흡 고리 — 루프 한 바퀴마다 한 번, 발밑에서 퍼지며 옅어진다
  const ph = (P.af % ANIM.medit[0]) / ANIM.medit[0];
  const br2 = M.breath.r0 + (M.breath.r1 - M.breath.r0) * Math.sqrt(ph);
  ctx.globalAlpha = fade * M.breath.a * (1 - ph); ctx.lineWidth = M.breath.w; ctx.strokeStyle = 'rgb(' + M.breath.c + ')';
  ctx.beginPath(); ctx.arc(0, 0, br2, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
  ctx.restore();
}
function drawQi(x, y){
  const fade = Math.min(1, S.downT / 0.5);      // 끝날 때 잦아든다
  for (let i = 0; i < QI.n; i++){
    // 방울마다 고유한 위상 — 같은 자리에서 반복되지 않게
    const seed = i * 2.399;
    const t = ((S.t / QI.rise) + i / QI.n) % 1;   // 0 → 1
    const up = t * QI.top;
    // 올라가며 좌우로 흔들린다
    const sway = Math.sin(seed + t * 5.2) * QI.spread * (0.35 + t * 0.65);
    // 위로 갈수록 옅어지고, 막 나올 때도 옅다
    const a = Math.min(t * 4, 1) * (1 - t) * 0.85 * fade;
    if (a <= 0.02) continue;
    const r = QI.r * (1.15 - t * 0.45);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#bfe8ff';
    ctx.beginPath();
    ctx.arc(x + sway, y - 2 - up, r + 0.9, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = '#f2fbff';
    ctx.beginPath();
    ctx.arc(x + sway, y - 2 - up, r * 0.55, 0, Math.PI*2);
    ctx.fill();
  }
  // 반짝이는 빛알 (v2.78) — 몸 둘레에서 천천히 떠오르며 깜빡인다(가산)
  const M = FXD.meditFx.motes;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgb(' + M.c + ')';
  for (let i = 0; i < M.n; i++){
    const h1 = ambHash(i, 91), h2 = ambHash(i, 97);
    const t = ((S.t / M.period) + h1) % 1, tw = 0.5 + 0.5 * Math.sin(S.t * (5 + h2 * 4) + i);
    const a = Math.sin(t * Math.PI) * tw * 0.9 * fade; if (a <= 0.03) continue;
    const px = x + (h2 - 0.5) * 2 * M.spread + Math.sin(S.t * 1.3 + i) * 2, py = y - 8 - t * M.rise;
    ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(px, py, M.r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = a * 0.35; ctx.beginPath(); ctx.arc(px, py, M.r * 2.4, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}


/* ── 보스 등장 ─────────────────────────────────────
   문이 서고, 청록 기운이 회오리치며 문 가운데로 빨려든다.
*/
// 보스 등장 뒤 문이 어둠 속으로 스러진다 (v2.40) — 아래로 살짝 가라앉으며
// 어두워지고 옅어진다. 소환 연출이 끝난 직후 boss가 걸어 나오는 동안 보인다.
function drawGateFade(ox, oy){
  if (!(S.gateT > 0)) return;
  const g = IMG.fx_gate;
  if (!g || !g.complete || !g.naturalWidth) return;
  const t = S.gateT / SUMMON.fade;                 // 1→0
  const x = Math.round((S.gateX||0) - ox);
  const y = Math.round((S.gateYb||0) - oy);
  const gw = 92, gh = 88;
  const sink = (1 - t) * 16;                        // 아래로 가라앉는다
  const ghh = gh * (0.72 + t * 0.28);               // 살짝 눌리며 잠긴다
  ctx.save();
  // 어둠 속으로 — 옅어지며(t*t) 가라앉는다. 배경에 사각 자국을 안 남긴다.
  ctx.globalAlpha = t * t * 0.9;
  draw(g, x - gw/2, y - gh + sink, gw, ghh);
  // 그림자가 삼키듯 — 아래에서 올라오는 어둠(문 폭 타원)으로 밑동을 가린다
  ctx.globalAlpha = (1 - t) * 0.6;
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.ellipse(x, y - 6, gw*0.42, 10 + (1-t)*14, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawSummon(ox, oy){
  if (S.summonT <= 0) return;
  const el = SUMMON.dur - S.summonT;
  const x = Math.round(S.summonX - ox);
  const y = Math.round(S.summonY - oy);
  const cy = y - 46;
  const ck = clamp(el / SUMMON.swirl, 0, 1);
  const bt = el - SUMMON.swirl;

  // 문 — 검은 기운 위에 아래에서 솟아오른다
  const gk = clamp(el/0.6, 0, 1);
  const ge = 1 - Math.pow(1-gk, 3);
  if (ge > 0.05){
    ctx.globalAlpha = ge;
    drawAura(x, y, 132, 128);      // 문도 같은 기운 안에 선다
    ctx.globalAlpha = 1;
  }
  const g = IMG.fx_gate;
  if (g && g.complete && g.naturalWidth){
    const gw = 92, gh = 88;
    ctx.globalAlpha = ge * 0.94;
    draw(g, x - gw/2, y - gh*ge, gw, gh*ge);
    ctx.globalAlpha = 1;
  }

  // 바닥 소용돌이 — 알갱이들이 이 위를 따라 돈다
  if (ck > 0.05 && bt < 0){
    for (let i = 0; i < 3; i++){
      const r = SUMMON.r * (1 - ck) * (0.5 + i*0.26);
      const a = ck * (0.30 - i*0.07);
      if (a <= 0.02 || r < 4) continue;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#3fd8c0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, cy, r, r*0.52, S.t*0.9 + i, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  // 회오리 — 궤적을 이어 하나의 리본으로 감아 든다
  if (bt < 0 && ck > 0.02){
    const LANES = 3;
    for (let L = 0; L < LANES; L++){
      const laneR = 0.55 + L*0.22;
      const head = ck;                      // 앞머리 진행도
      // 리본 바깥선 → 안쪽선을 이어 닫는다
      ctx.beginPath();
      const SEG = 26;
      const pts = [];
      for (let j = 0; j <= SEG; j++){
        const t = clamp(head - (j/SEG)*0.55, 0, 1);
        if (t <= 0) break;
        const e = t*t;
        const rad = SUMMON.r * (1 - e) * laneR;
        const ang = e * Math.PI * 2 * SUMMON.turns + L*2.09;
        pts.push([x + Math.cos(ang)*rad, cy + Math.sin(ang)*rad*0.52, 1-j/SEG]);
      }
      if (pts.length < 3) continue;
      // 바깥선
      for (let j = 0; j < pts.length; j++){
        const [px,py,w] = pts[j];
        const th = 1.2 + w*3.4;
        if (j === 0) ctx.moveTo(px, py - th); else ctx.lineTo(px, py - th);
      }
      // 되돌아오며 안쪽선
      for (let j = pts.length-1; j >= 0; j--){
        const [px,py,w] = pts[j];
        const th = 1.2 + w*3.4;
        ctx.lineTo(px, py + th);
      }
      ctx.closePath();
      const a = Math.min(ck*3, 1) * (0.55 - L*0.11);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#3fd8c0';
      ctx.fill();
      ctx.globalAlpha = a * 1.2;
      ctx.strokeStyle = '#d8fff4';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 앞머리 알갱이
      const [hx, hy] = pts[0];
      ctx.globalAlpha = Math.min(ck*3, 1);
      ctx.fillStyle = '#d8fff4';
      ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 중심 — 모일수록 커지고, 다 모이면 터진다
  if (bt < 0 && ck > 0.06){
    const cr = 3 + ck*ck * 17;
    ctx.globalAlpha = 0.28 + ck*0.55;
    ctx.fillStyle = '#7fffe4';
    ctx.beginPath(); ctx.arc(x, cy, cr, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.5 + ck*0.45;
    ctx.fillStyle = '#eafff9';
    ctx.beginPath(); ctx.arc(x, cy, cr*0.42, 0, Math.PI*2); ctx.fill();
  } else if (bt >= 0 && bt < SUMMON.burst){
    const b = bt / SUMMON.burst;
    for (let i = 0; i < 2; i++){
      const t2 = clamp(b - i*0.15, 0, 1);
      if (t2 <= 0) continue;
      const r2 = 14 + t2 * 132;
      ctx.globalAlpha = (1-t2) * (0.9 - i*0.3);
      ctx.strokeStyle = i ? '#eafff9' : '#7fffe4';
      ctx.lineWidth = 4 - t2*2.5 - i;
      ctx.beginPath(); ctx.ellipse(x, cy, r2, r2*0.5, 0, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = Math.pow(1-b, 2) * 0.95;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, cy, 20 * (1-b), 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 문구 — 터진 뒤 떠오른다
  if (bt >= 0){
    const ta = clamp(bt/0.3, 0, 1) * clamp(S.summonT/0.45, 0, 1);
    if (ta > 0.02){
      const W = cv.width, H = cv.height;
      const cry = (BOSSCRY[zone().k] || zone().boss + ' 등장');
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      ctx.globalAlpha = ta;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f0d9a8';
      let fpx = Math.round(H*0.038);
      ctx.font = fpx + 'px Jua,-apple-system,sans-serif';
      const yy = H*0.30 - (1-clamp(bt/0.3,0,1)) * H*0.02;
      const face = IMG[BOSSFACE[zone().k]];
      const hasFace = !!(face && face.complete && face.naturalWidth);
      const fh = hasFace ? Math.round(H * FACECUT.h) : 0;
      const fw = hasFace ? Math.round(fh * face.naturalWidth / face.naturalHeight) : 0;
      // 초상이 있으면 문구는 초상 왼쪽 남는 폭 가운데, 넘치면 폰트를 줄여 맞춘다 (v2.63)
      const margin = Math.round(W * 0.03);
      const leftW = hasFace ? Math.round(W * FACECUT.x - fw/2 - FACECUT.pad*2) - margin : W - margin*2;
      const tx = hasFace ? margin + leftW/2 : W/2;
      const mt = ctx.measureText ? ctx.measureText(cry) : null;           // jsdom 스텁 가드
      const tw = (mt && mt.width) || 0;
      if (tw > leftW){ fpx = Math.max(10, Math.floor(fpx * leftW / tw)); ctx.font = fpx + 'px Jua,-apple-system,sans-serif'; }
      ctx.fillText(cry, tx, yy);
      // 초상 컷인 — 문구 오른쪽, 같은 알파, 살짝 오른쪽에서 밀려든다
      if (hasFace){
        const fx = Math.round(W * FACECUT.x + (1 - clamp(bt/0.3, 0, 1)) * H * FACECUT.slide - fw/2);
        const fy = Math.round(yy - fh * 0.62);
        ctx.fillStyle = 'rgba(8,10,14,.55)';
        ctx.fillRect(fx - FACECUT.pad, fy - FACECUT.pad, fw + FACECUT.pad*2, fh + FACECUT.pad*2);
        draw(face, fx, fy, fw, fh);
        ctx.strokeStyle = 'rgba(240,217,168,.6)'; ctx.lineWidth = 2;
        ctx.strokeRect(fx - FACECUT.pad + 1, fy - FACECUT.pad + 1, fw + FACECUT.pad*2 - 2, fh + FACECUT.pad*2 - 2);
      }
      ctx.strokeStyle = 'rgba(240,217,168,.45)'; ctx.lineWidth = 2;
      const lw = W*0.20;
      ctx.beginPath();
      ctx.moveTo(tx-lw, yy + H*0.028); ctx.lineTo(tx+lw, yy + H*0.028);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}


/* ── 단계 제패 ─────────────────────────────────────
   기운을 몸으로 모았다가 한 번에 터뜨린다.
   주먹 이펙트와 같은 청백색으로 맞춘다.
*/
function drawSweep(ox, oy){
  if (S.sweepT <= 0) return;
  const TOT = SWEEP.charge + SWEEP.blast + SWEEP.hold;
  const el = TOT - S.sweepT;
  const x = Math.round(P.x - ox);
  const y = Math.round(P.y - oy) - Math.round(HERO.h*0.42);

  /* ── 모으는 동안 — 리본이 감겨 든다 ── */
  if (el < SWEEP.charge){
    const k = el / SWEEP.charge;
    for (let L = 0; L < 3; L++){
      const laneR = 0.55 + L*0.22;
      const SEG = 24;
      const pts = [];
      for (let j = 0; j <= SEG; j++){
        const t = clamp(k - (j/SEG)*0.5, 0, 1);
        if (t <= 0) break;
        const e = t*t;
        const rad = 126 * (1 - e) * laneR;
        const ang = e * Math.PI * 2 * 2.4 + L*2.09;
        pts.push([x + Math.cos(ang)*rad, y + Math.sin(ang)*rad*0.5, 1-j/SEG]);
      }
      if (pts.length < 3) continue;
      ctx.beginPath();
      for (let j = 0; j < pts.length; j++){
        const [px,py,w] = pts[j]; const th = 1.1 + w*3.2;
        if (j === 0) ctx.moveTo(px, py - th); else ctx.lineTo(px, py - th);
      }
      for (let j = pts.length-1; j >= 0; j--){
        const [px,py,w] = pts[j]; const th = 1.1 + w*3.2;
        ctx.lineTo(px, py + th);
      }
      ctx.closePath();
      const a = Math.min(k*3, 1) * (0.55 - L*0.11);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#a8d4f0'; ctx.fill();
      ctx.globalAlpha = a * 1.2;
      ctx.strokeStyle = '#f8fcff'; ctx.lineWidth = 1; ctx.stroke();
      const [hx, hy] = pts[0];
      ctx.globalAlpha = Math.min(k*3, 1);
      ctx.fillStyle = '#f8fcff';
      ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, Math.PI*2); ctx.fill();
    }
    // 몸에 맺히는 빛
    const cr = 4 + k*k * 17;
    ctx.globalAlpha = 0.30 + k*0.55;
    ctx.fillStyle = '#a8d4f0';
    ctx.beginPath(); ctx.arc(x, y, cr, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.5 + k*0.45;
    ctx.fillStyle = '#f8fcff';
    ctx.beginPath(); ctx.arc(x, y, cr*0.42, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  /* ── 터진 뒤 — 곡면 꺼풀이 이어져 퍼진다 ── */
  const k = clamp((el - SWEEP.charge) / SWEEP.blast, 0, 1);
  const fade = S.sweepT < SWEEP.hold ? S.sweepT/SWEEP.hold : 1;

  // 꺼풀마다 안팎 두 곡선을 이어 하나의 띠 면으로 만든다
  for (let B = SWEEP.bands-1; B >= 0; B--){
    const t = clamp(k - B*0.085, 0, 1);
    if (t <= 0) continue;
    const eb = 1 - Math.pow(1-t, 2.6);
    const R  = SWEEP.range * eb * (1 - B*0.08);
    const th = 34 + eb*44 - B*5;                 // 띠 두께
    const a  = (1-t) * (0.17 - B*0.03) * fade;
    if (a <= 0.005) continue;
    const ph = B * 1.7 + k * 2.2;

    ctx.beginPath();
    // 바깥 곡선
    const outer = [];
    for (let i = 0; i < SWEEP.pts; i++){
      const ang = (i/SWEEP.pts) * Math.PI * 2;
      const w = 1 + Math.sin(ang*3 + ph)*SWEEP.wave
                  + Math.sin(ang*5 - ph*1.3)*SWEEP.wave*0.6;
      outer.push([x + Math.cos(ang)*R*w, y + Math.sin(ang)*R*0.44*w]);
    }
    curveLoop(outer);
    // 안쪽 곡선 (반대로 돌아 구멍을 낸다)
    const inner = [];
    const R2 = Math.max(2, R - th);
    for (let i = SWEEP.pts-1; i >= 0; i--){
      const ang = (i/SWEEP.pts) * Math.PI * 2;
      const w = 1 + Math.sin(ang*3 + ph + 0.4)*SWEEP.wave*0.8;
      inner.push([x + Math.cos(ang)*R2*w, y + Math.sin(ang)*R2*0.44*w]);
    }
    curveLoop(inner);
    ctx.globalAlpha = a;
    ctx.fillStyle = B === 0 ? '#f4faff' : '#cfe8ff';
    ctx.fill('evenodd');
    // 앞머리 꺼풀만 테두리를 옅게 둘러 파면을 알린다
    if (B === 0){
      ctx.globalAlpha = a * 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); curveLoop(outer); ctx.stroke();
    }
  }

  // 중심에서 피어오르는 빛
  if (k < 0.32){
    const f = 1 - k/0.32;
    ctx.globalAlpha = f * 0.30;
    ctx.fillStyle = '#f4faff';
    ctx.beginPath(); ctx.ellipse(x, y, 12 + f*30, (12 + f*30)*0.55, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* 점 목록을 부드러운 닫힌 곡선으로 잇는다 */
function curveLoop(P2){
  const n = P2.length;
  if (n < 3) return;
  ctx.moveTo((P2[n-1][0]+P2[0][0])/2, (P2[n-1][1]+P2[0][1])/2);
  for (let i = 0; i < n; i++){
    const cur = P2[i], nx = P2[(i+1)%n];
    ctx.quadraticCurveTo(cur[0], cur[1], (cur[0]+nx[0])/2, (cur[1]+nx[1])/2);
  }
  ctx.closePath();
}


/* ── 보스 오라 ─────────────────────────────────────
   준 이미지를 연하게 여러 겹 겹쳐 주변을 감싼다.
*/
// 이펙트 그림을 통째로 다른 색으로 (v2.94.6 본진 장로 — 문파색 기운).
// tintedStrip 은 도복 픽셀만 고르지만 이건 밝기·알파를 두고 색만 갈아 끼운다.
const fxTintCache = {};
function tintedFx(key, col){
  const ck = key + ':' + col; if (fxTintCache[ck] !== undefined) return fxTintCache[ck];
  const im = IMG[key]; if (!im || !im.complete || !im.naturalWidth) return null;
  let c = null;
  try{
    c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); if (!g || !g.getImageData) return null;
    g.drawImage(im, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height), p = id.data;
    const cr = parseInt(col.slice(1, 3), 16), cg = parseInt(col.slice(3, 5), 16), cb = parseInt(col.slice(5, 7), 16);
    for (let i = 0; i < p.length; i += 4){
      if (!p[i + 3]) continue;
      const k = Math.max(p[i], p[i + 1], p[i + 2]) / 255;      // 밝기만 남긴다
      p[i] = cr * k; p[i + 1] = cg * k; p[i + 2] = cb * k;
    }
    g.putImageData(id, 0, 0);
  }catch(e){ c = null; }
  fxTintCache[ck] = c; return c;
}
function drawAura(cx, cy, dw, dh, col){
  const au = col ? (tintedFx('fx_aura', col) || IMG.fx_aura) : IMG.fx_aura;
  if (!au || (au.complete !== undefined && (!au.complete || !au.naturalWidth))) return;
  for (let i = 0; i < AURA.layers; i++){
    const ph = S.t * AURA.sway + i * 2.1;
    const grow = 0.94 + Math.sin(ph) * 0.07;
    const aw = Math.max(2, Math.round(dw * AURA.wide * (0.80 + i*0.14) * grow));
    const ah = Math.max(2, Math.round(dh * AURA.tall * (0.82 + i*0.12) * grow));
    const sx = Math.sin(ph*0.6) * (1.5 + i);
    ctx.globalAlpha = Math.max(0, (AURA.alpha - i*0.08) + Math.sin(ph*1.4)*0.04);
    // 물들인 것은 캔버스라 draw() 헬퍼(complete 검사)를 못 쓴다 — 직접 그린다
    const dx = cx - Math.round(aw/2) + sx, dy = cy + dh*AURA.drop - ah;
    if (au.complete === undefined) { try{ ctx.drawImage(au, dx, dy, aw, ah); }catch(e){} }
    else draw(au, dx, dy, aw, ah);
  }
  ctx.globalAlpha = 1;
}

/* ── 적의 원거리 탄 ────────────────────────────────
   작은 탄은 주먹 이펙트와 같은 이중 구조. 큰 구체는 덩굴이 감긴다.
*/
function drawShots(ox, oy){
  for (const b of S.shots){
    const x = Math.round(b.x - ox), y = Math.round(b.y - oy);
    const pulse = 1 + Math.sin(b.t*14)*0.12;
    // 그림 탄 — 낭인 술병처럼 스프라이트가 있는 탄은 빙글빙글 돌며 난다
    if (b.img && IMG[b.img]){
      const im = IMG[b.img];
      ctx.save();
      ctx.translate(x, y);
      // 나는 탄(얼음 조각·해골 귀화 등) — 진행 방향으로 기울여 난다 (v2.39).
      // 왼쪽이면 거울 뒤 반전각으로 돌려 뒤집힘을 막는다(파공권과 같은 방식).
      // 술병류(fly 아님)는 빙글빙글 돈다.
      if (b.fly){
        if (b.vx < 0){ ctx.scale(-1, 1); ctx.rotate(Math.atan2(b.vy, -b.vx)); }
        else ctx.rotate(Math.atan2(b.vy, b.vx));
        // 탄 잔상 (v2.61) — 나는 탄(얼음·번개·해골 등)은 뒤로 고스트를 끈다
        drawTrail(im, 0, 0, im.naturalWidth, im.naturalHeight, 1);
      }
      else ctx.rotate(b.t * 9 * (b.vx < 0 ? -1 : 1));
      draw(im, -Math.round(im.naturalWidth/2), -Math.round(im.naturalHeight/2),
           im.naturalWidth, im.naturalHeight);
      ctx.restore();
      continue;
    }
    if (b.big){
      const R = b.r;
      // 주술사 시트의 구체 그림을 쓴다
      const orb = IMG.shaman_m2;
      if (orb && orb.complete && orb.naturalWidth){
        const w = R*2.6, h = R*2.2;
        ctx.save();
        ctx.translate(x, y);
        if (b.vx < 0) ctx.scale(-1, 1);
        ctx.globalAlpha = 0.30;
        ctx.strokeStyle = '#5ee08a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-Math.abs(b.vx)*26, -b.vy*26); ctx.lineTo(0, 0); ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.globalAlpha = 0.92;
        draw(orb, -w/2, -h/2, w, h);
        ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = '#5ee08a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - b.vx*26, y - b.vy*26); ctx.lineTo(x, y); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = '#2f9e55';
      ctx.beginPath(); ctx.arc(x, y, R*pulse, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = '#5ee08a';
      ctx.beginPath(); ctx.arc(x, y, R*0.68*pulse, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#d8ffe4'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++){
        ctx.beginPath();
        for (let j = 0; j <= 14; j++){
          const a2 = (j/14)*Math.PI*2 + b.t*3 + i*2.09;
          const rr = R*(0.55 + Math.sin(a2*2 + b.t*4)*0.30);
          const px = x + Math.cos(a2)*rr, py = y + Math.sin(a2)*rr*0.85;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#f0fff5';
      ctx.beginPath(); ctx.arc(x, y, R*0.30*pulse, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = '#5ee08a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - b.vx*13, y - b.vy*13); ctx.lineTo(x, y); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#3fbf6a';
    ctx.beginPath(); ctx.arc(x, y, 4.6*pulse, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#d8ffe4';
    ctx.beginPath(); ctx.arc(x, y, 2.4*pulse, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
