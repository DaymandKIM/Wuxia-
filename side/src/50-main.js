/* ── 시작·루프 ─────────────────────────────────────────── */
loadSave();
buildUi();
P.hp = heroHpMax();
camX = P.x - VW * VIEW.heroX;
S.waveX = P.x + WAVE.first;
let last = 0, saveT = 0;
function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  try { step(dt); render(); ui(); } catch(e){ if (!window.__err){ window.__err = e; console.error(e); const d = $('err'); if (d){ d.textContent = e.message; d.hidden = false; } } }
  saveT += dt; if (saveT > SAVE.every){ saveT = 0; saveNow(); }
  requestAnimationFrame(loop);
}
addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
$('ver').textContent = GAME_VER;
requestAnimationFrame(loop);
