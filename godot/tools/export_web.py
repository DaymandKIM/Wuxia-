#!/usr/bin/env python3
"""웹 내보내기 → dist/ (아티팩트에 올릴 수 있는 모양으로)
   아티팩트는 파일 하나가 15MB 를 못 넘고 정해진 확장자만 받는다. 그래서
   - 엔진(index.wasm 38MB)을 13MB 조각 w0~w2.wasm 으로 나누고 페이지에서 다시 잇는다
   - 게임 묶음 index.pck 는 pack.wasm 이라는 이름으로 싣는다
   python tools/export_web.py   (그림·키가 바뀌었으면 먼저 sync_art → --import)"""
import os, sys, shutil, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import godot
P = godot.PROJ
B, DIST = os.path.join(P, 'build', 'web'), os.path.join(P, 'dist')
CHUNK = 13_000_000
godot.ensure(web=True)
shutil.rmtree(B, ignore_errors=True); os.makedirs(B)
r = godot.run(['--headless', '--export-release', 'Web', os.path.join(B, 'index.html')], capture_output=True, text=True)
if not os.path.exists(os.path.join(B, 'index.wasm')):
    print(r.stdout[-2000:], r.stderr[-2000:]); sys.exit('★ 내보내기 실패')
shutil.rmtree(DIST, ignore_errors=True); os.makedirs(DIST)
for f in ('index.js', 'index.audio.worklet.js', 'index.audio.position.worklet.js', 'index.png', 'index.icon.png'):
    shutil.copy(os.path.join(B, f), DIST)
shutil.copy(os.path.join(B, 'index.pck'), os.path.join(DIST, 'pack.wasm'))
w = open(os.path.join(B, 'index.wasm'), 'rb').read()
n = 0
while n * CHUNK < len(w):
    open(os.path.join(DIST, 'w%d.wasm' % n), 'wb').write(w[n * CHUNK:(n + 1) * CHUNK]); n += 1
html = open(os.path.join(B, 'index.html'), encoding='utf8').read()
tag = '<script src="index.js"></script>'
assert tag in html
patch = '''<script>
/* 아티팩트는 파일 하나가 15MB 를 못 넘는다 — 엔진을 조각으로 싣고 여기서 다시 잇는다 (tools/export_web.py) */
(() => { const of = window.fetch.bind(window), N = %d;
  window.fetch = (u, o) => { const s = String((u && u.url) || u);
    if (/index\\.wasm(\\?|$)/.test(s)) return Promise.all([...Array(N)].map((_, i) => of('w' + i + '.wasm').then(r => { if (!r.ok) throw new Error('엔진 조각 ' + i + ' 실패'); return r.arrayBuffer(); })))
      .then(bs => new Response(new Blob(bs, { type: 'application/wasm' }), { status: 200, headers: { 'Content-Type': 'application/wasm' } }));
    if (/index\\.pck(\\?|$)/.test(s)) return of('pack.wasm', o);
    return of(u, o); }; })();
</script>
		''' % n + tag
html = html.replace(tag, patch, 1).replace('"ensureCrossOriginIsolationHeaders":true', '"ensureCrossOriginIsolationHeaders":false')
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf8').write(html)
tot = sum(os.path.getsize(f) for f in glob.glob(os.path.join(DIST, '*')))
print('dist/ %d개 · %.1fMB (엔진 조각 %d · 게임 묶음 %dKB)' % (len(os.listdir(DIST)), tot / 1e6, n, os.path.getsize(os.path.join(DIST, 'pack.wasm')) // 1024))
