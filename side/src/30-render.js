/* ── 그리기 — 장면 띠 ───────────────────────────────────
   순서: 하늘 → 원경 → 밤 안개 → 중경 실루엣 → 땅 → 그림자·인물 → 연출 → 위쪽 어둠.
   **원경만 어둡게 덮고 인물은 그 위에 밝게** 그린다 — 장면이 어두워도 싸움이 읽히는 이유다. */
let gMist = null, gGround = null, gVig = null, gTop = null, gKey = '';
const backBox = () => { const bh = Math.round(VH * BACK.hr), y = GY - bh + BACK.sink; return { bh, y, top: y + Math.round(bh * BACK.top) }; };
function grads(){
  const key = VW + 'x' + VH; if (key === gKey) return; gKey = key;
  try {
    gMist = ctx.createLinearGradient(0, GY - TONE.mistUp, 0, GY + TONE.mistDown);
    gMist.addColorStop(0, 'rgba(' + TONE.mist + ',0)'); gMist.addColorStop(0.78, 'rgba(' + TONE.mist + ',' + TONE.mistA + ')'); gMist.addColorStop(1, 'rgba(' + TONE.mist + ',0)');
    gGround = ctx.createLinearGradient(0, GY, 0, VH);
    gGround.addColorStop(0, 'rgb(' + TONE.groundTop.join(',') + ')'); gGround.addColorStop(1, 'rgb(' + TONE.groundBot.join(',') + ')');
    gVig = ctx.createLinearGradient(0, 0, 0, VH * TONE.vigH);
    gVig.addColorStop(0, 'rgba(' + TONE.vig + ',' + TONE.vigA + ')'); gVig.addColorStop(1, 'rgba(' + TONE.vig + ',0)');
    const B = backBox(), f = Math.round(B.bh * BACK.fade);
    gTop = ctx.createLinearGradient(0, B.top, 0, B.top + f);
    gTop.addColorStop(0, TONE.sky); gTop.addColorStop(1, 'rgba(' + TONE.skyRGB + ',0)');
  } catch(e){ gMist = gGround = gVig = gTop = null; }
}
// 어둡게 구운 판 — 스크래치 캔버스에서 source-atop (화면 ctx 에 치면 사각형이 남는다)
const darkCache = {};
function darkOf(key){
  if (darkCache[key] !== undefined) return darkCache[key];
  const im = img(key); if (!im) return null;
  let out = null;
  try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d');
    g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = TONE.propDark; g.fillStyle = TONE.propTint; g.fillRect(0, 0, c.width, c.height); out = c; } catch(e){ out = null; }
  return darkCache[key] = out;
}
function drawBack(){
  const im = img(zone().bg); if (!im) return;
  const B = backBox(), bh = B.bh, y = B.y, bw = Math.round(im.naturalWidth * bh / im.naturalHeight);
  let x = -((camX * BACK.par) % bw); if (x > 0) x -= bw;
  ctx.imageSmoothingEnabled = true;
  for (; x < VW; x += bw) ctx.drawImage(im, Math.round(x), y, bw, bh);
  ctx.imageSmoothingEnabled = false;
}
function drawMid(){
  const G = MID.grid, mx = camX * MID.par, c0 = Math.floor(mx / G) - 1, c1 = Math.floor((mx + VW) / G) + 1;
  for (let c = c0; c <= c1; c++){
    if (thash(c, 11) > MID.dens) continue;
    const key = MID.pick[Math.floor(thash(c, 12) * MID.pick.length)], dk = darkOf(key); if (!dk) continue;
    const h = Math.round((PROPH[key] || 80) * MID.scale * (0.85 + thash(c, 13) * 0.4)), w = Math.round(h * dk.width / dk.height);
    ctx.drawImage(dk, Math.round(c * G + thash(c, 14) * G - mx - w / 2), GY + MID.sink - h, w, h);
  }
}
function drawGrit(){
  const G = GRIT.grid, c0 = Math.floor(camX / G) - 1, c1 = Math.floor((camX + VW) / G) + 1, dep = VIEW.ground - 14;
  for (let c = c0; c <= c1; c++){
    if (thash(c, 31) > GRIT.dens) continue;
    const d = thash(c, 32), y = GY + 5 + Math.round(d * d * dep), w = Math.round(GRIT.w[0] + thash(c, 33) * (GRIT.w[1] - GRIT.w[0]));
    ctx.globalAlpha = 1 - d * 0.75; ctx.fillStyle = thash(c, 34) < 0.5 ? GRIT.dark : GRIT.lite;
    ctx.fillRect(Math.round(c * G + thash(c, 35) * G - camX), y, w, 1);
  }
  ctx.globalAlpha = 1;
}
function shadow(x, y, w){ ctx.fillStyle = TONE.shadow; ctx.beginPath(); ctx.ellipse(x, y, w, Math.max(2, w * 0.2), 0, 0, Math.PI * 2); ctx.fill(); }
function drawHero(sx){
  const y = GY + 4;
  let key = P.st === 'atk' ? P.key : P.st === 'down' ? 'medit' : P.st === 'run' ? 'run' : 'idle';
  const n = P.st === 'atk' ? ANIM.atk[0] : P.st === 'down' ? ANIM.medit[0] : P.st === 'run' ? ANIM.run[0] : 1;
  const fi = P.st === 'atk' ? Math.min(n - 1, Math.floor(P.af)) : Math.floor(P.af) % n;
  const im = img(key); shadow(sx, y, 13);
  if (!im) return;
  const fw = STRIP[key], fh = im.naturalHeight, dx = Math.round(sx - fw / 2), dy = y - fh + ((STRIPH[key] || [0, 0])[1] ? 0 : 0);
  ctx.drawImage(im, fw * fi, 0, fw, fh, dx, dy, fw, fh);
  if (P.flash > 0){ ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.drawImage(im, fw * fi, 0, fw, fh, dx, dy, fw, fh); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
}
function foeFrame(f){
  const M = foeM(f), a = f.st === 'death' ? 'death' : f.st === 'atk' ? 'atk' : f.st === 'skill' ? 'skill' : f.st === 'hit' ? 'hit' : f.st === 'walk' ? 'walk' : 'idle';
  const fr = M.anim[a] || M.anim.idle, hold = a === 'death' || a === 'atk' || a === 'skill';
  return f.k + '_' + fr[hold ? Math.min(fr.length - 1, Math.floor(f.af)) : Math.floor(f.af) % fr.length];
}
function drawFoe(f, sx){
  const M = foeM(f), sc = M.sc || 1, y = GY + 4 + f.y, im = img(foeFrame(f));
  let a = 1; if (f.dead){ const t = f.dead - M.anim.death.length / M.fps.death; if (t > 0) a = Math.max(0, 1 - t / FOE.fade); }
  ctx.globalAlpha = a; shadow(sx, y, (M.sw || M.w) * sc * 0.42); 
  if (im){
    const w = Math.round(M.w * sc), h = Math.round(M.h * sc);
    ctx.save(); ctx.translate(Math.round(sx), 0); ctx.scale(-1, 1);       // 그림은 오른쪽 보기 — 적은 늘 왼쪽(주인공)을 본다
    ctx.drawImage(im, -w / 2, y - h, w, h);
    if (f.flash > 0){ ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(im, -w / 2, y - h, w, h); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (!f.dead && !f.boss && f.hp < f.hpMax){                               // 다친 적만 얇은 체력 줄
    const bw = 26, by = y - (M.bh || M.h) * sc - 7;
    ctx.fillStyle = 'rgba(8,12,20,0.7)'; ctx.fillRect(Math.round(sx - bw / 2), by, bw, 3);
    ctx.fillStyle = '#d8566a'; ctx.fillRect(Math.round(sx - bw / 2), by, Math.round(bw * Math.max(0, f.hp / f.hpMax)), 3);
  }
}
function drawFx(){
  for (const e of S.fx){
    const sx = e.x - camX, y = GY + e.y;
    if (e.k === 'spark'){ const a = 1 - e.t / FX.spark.life; ctx.fillStyle = 'rgba(' + FX.spark.c + ',' + a.toFixed(2) + ')'; ctx.fillRect(Math.round(sx), Math.round(y), 2, 2); }
    else if (e.k === 'dust'){ const p = e.t / FX.dust.life; ctx.fillStyle = 'rgba(' + FX.dust.c + ',' + (0.42 * (1 - p)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(sx - p * 10, y - p * 7, e.r * (1 + p), 0, Math.PI * 2); ctx.fill(); }
    else if (e.k === 'slash'){ const p = e.t / FX.slash.life; ctx.strokeStyle = 'rgba(' + FX.slash.c + ',' + (0.85 * (1 - p)).toFixed(2) + ')'; ctx.lineWidth = 3 * (1 - p) + 1; ctx.beginPath(); ctx.arc(sx - 10, y, FX.slash.r + p * 8, -0.9, 0.9); ctx.stroke(); }
    else if (e.k === 'ring'){ const p = e.t / 0.5; ctx.strokeStyle = 'rgba(190,120,255,' + (0.7 * (1 - p)).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, GY + 4, e.r * p, e.r * p * 0.22, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (e.k === 'dmg' || e.k === 'coin'){
      const p = e.t / FX.dmg.life, yy = y - p * FX.dmg.rise;
      ctx.font = '700 ' + (e.k === 'coin' ? 11 : FX.dmg.size) + 'px "IBM Plex Sans KR",system-ui,sans-serif'; ctx.textAlign = 'center';
      const txt = e.k === 'coin' ? '+' + fmt(e.v) : fmt(e.v), a = (p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3).toFixed(2);
      ctx.fillStyle = 'rgba(6,10,16,' + a + ')'; ctx.fillText(txt, sx + 1, yy + 1);
      ctx.fillStyle = e.k === 'coin' ? 'rgba(240,208,120,' + a + ')' : e.hero ? 'rgba(255,128,138,' + a + ')' : 'rgba(240,246,255,' + a + ')';
      ctx.fillText(txt, sx, yy);
    }
  }
}
function render(){
  grads();
  const sh = S.shake > 0 ? (Math.random() - 0.5) * FX.shake.boss : 0;
  ctx.setTransform(VIEW.sc, 0, 0, VIEW.sc, Math.round(sh * VIEW.sc), 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = TONE.sky; ctx.fillRect(-8, 0, VW + 16, VH);
  drawBack();
  ctx.fillStyle = TONE.veil; ctx.fillRect(-8, 0, VW + 16, GY + 2);
  { const B = backBox(); ctx.fillStyle = TONE.sky; ctx.fillRect(-8, 0, VW + 16, B.top + 1);          // 원경 윗변을 하늘로 녹인다
    if (gTop){ ctx.fillStyle = gTop; ctx.fillRect(-8, B.top, VW + 16, Math.round(B.bh * BACK.fade)); } }
  drawMid();
  if (gMist){ ctx.fillStyle = gMist; ctx.fillRect(-8, GY - TONE.mistUp, VW + 16, TONE.mistUp + TONE.mistDown); }
  ctx.fillStyle = gGround || 'rgb(' + TONE.groundTop.join(',') + ')'; ctx.fillRect(-8, GY, VW + 16, VH - GY);
  ctx.fillStyle = TONE.line; ctx.fillRect(-8, GY, VW + 16, 1);
  drawGrit();
  const es = S.foes.map(f => ({ y: f.y, f })); es.push({ y: 0.5, hero: true }); es.sort((a, b) => a.y - b.y);
  for (const e of es){ if (e.hero) drawHero(P.x - camX); else { const sx = e.f.x - camX; if (sx > -160 && sx < VW + 160) drawFoe(e.f, sx); } }
  drawFx();
  if (gVig){ ctx.fillStyle = gVig; ctx.fillRect(-8, 0, VW + 16, VH * TONE.vigH); }
}
