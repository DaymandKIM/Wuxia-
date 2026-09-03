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
// [테스트 전용] 강제 쓰러짐 · 배속 — TEST를 끄면 전부 사라진다
let TESTSPEED = 1;
if (TEST){
  $('dbtn').classList.add('on');
  $('dbtn').onclick = () => { if (!P.dead && S.intro <= 0) downHero(); };
  const sp = $('spd');
  sp.classList.add('on');
  for (const m of [1, 2, 3, 5, 10, 100]){
    const b = document.createElement('button');
    b.textContent = 'x' + m;
    if (m === 1) b.classList.add('on');
    b.onclick = () => {
      TESTSPEED = m;
      sp.querySelectorAll('button').forEach(e => e.classList.toggle('on', e === b));
    };
    sp.appendChild(b);
  }
}
$('zclose').onclick = closeZonePanel;
$('zpanel').onclick = e => { if (e.target.id === 'zpanel') closeZonePanel(); };
$('obtn').onclick   = closeOffline;
$('opanel').onclick = e => { if (e.target.id === 'opanel') closeOffline(); };
addEventListener('keydown', e => {
  if (e.key === 'Escape'){ closeOffline(); closeZonePanel(); }
});

// 저장 불러오기 → 자리 비운 만큼 진행 → 시작
const sv = loadSave();
let og = null;
if (sv){
  applySave(sv);
  const away = (Date.now() - sv.at) / 1000;
  if (away >= OFFLINE.min) og = offlineGains(away);
}
enterStage();
if (og && og.kills > 0) showOffline(og);

saveNow();
setInterval(saveNow, SAVE.every * 1000);
document.addEventListener('visibilitychange',
  () => { if (document.visibilityState === 'hidden') saveNow(); });
addEventListener('pagehide', saveNow);

let last = performance.now();
function loop(now){
  try{
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // [테스트 전용] 배속 — 같은 dt로 여러 번 밟아야 물리가 안 깨진다
    for (let i = 0; i < (TEST ? TESTSPEED : 1); i++) step(dt);
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
