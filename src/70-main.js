/* ── 시작 ─────────────────────────────────────────── */
loadImg('hero_idle',  ASSET.idle);
loadImg('hero_run',   ASSET.run);
loadImg('hero_atk',   ASSET.atk);
loadImg('hero_hit',   ASSET.hit);
loadImg('hero_medit', ASSET.medit);
for (const k in FOES){
  const seen = {};
  for (const a in FOES[k].anim)
    for (const f of FOES[k].anim[a]){
      if (seen[f]) continue; seen[f] = 1;
      loadImg(k + '_' + f, ASSET[k + '_' + f]);
    }
}
for (const z of ZONES)
  for (let i = 1; i <= 3; i++) loadImg(z.k + i, ASSET[z.k + i]);

loadImg('fx_gate', ASSET.fx_gate);
loadImg('fx_aura', ASSET.fx_aura);
loadImg('fx_dark', ASSET.fx_dark);
loadImg('shaman_m2', ASSET.shaman_m2);

$('zbtn').onclick   = openZonePanel;
// 테스트 모드에서만 보이는 운기조식 버튼
if (TEST){
  $('dbtn').classList.add('on');
  $('dbtn').onclick = () => { if (!P.dead && S.intro <= 0) downHero(); };
}
$('zclose').onclick = closeZonePanel;
$('zpanel').onclick = e => { if (e.target.id === 'zpanel') closeZonePanel(); };

beginIntro('1단계', zone().n);

let last = performance.now();
function loop(now){
  try{
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt);
    render();
    hud();
    if (toastT > 0){ toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  } catch(e){
    if (!window.__err){ window.__err = 1; console.error(e);
      const d = document.createElement('div');
      d.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99;background:rgba(30,12,12,.95);'+
        'color:#ffb3a7;font:11px/1.5 monospace;padding:10px;border-radius:8px;white-space:pre-wrap;';
      d.textContent = e.message + '\n' + (e.stack||'').split('\n')[1];
      document.body.appendChild(d);
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
