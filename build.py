#!/usr/bin/env python3
"""단일 HTML로 묶는다. 순서가 곧 의존 순서다."""
import base64, os, glob
R = os.path.dirname(os.path.abspath(__file__))
ORDER = ['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js',
         '40-step.js','50-render.js','60-ui.js','62-train.js','63-arts.js','64-fate.js','65-save.js','65b-treedata.js','66-tree.js','67-treepanel.js','68-equip.js','69-achv.js','69b-sect.js','70-main.js']
# 에셋 → base64
assets = {}
for p in sorted(glob.glob(R + '/assets/*.png')):
    k = os.path.basename(p)[:-4]
    assets[k] = 'data:image/png;base64,' + base64.b64encode(open(p,'rb').read()).decode()
import json
js_assets = 'const ASSET=' + json.dumps(assets) + ';'
code = '\n'.join(open(R+'/src/'+f, encoding='utf-8').read() for f in ORDER)
# 판번 — VERSION.md 첫 제목("# v2.85 — …")에서 읽어 GAME_VER로 넣는다 (≡ 메뉴 정보 줄, v2.85). 손으로 안 맞춘다.
import re
m = re.search(r'^#\s*(v[\d.]+)', open(R+'/VERSION.md', encoding='utf-8').read(), re.M)
code = "const GAME_VER = '" + (m.group(1) if m else 'dev') + "';\n" + code
html = open(R+'/shell.html', encoding='utf-8').read()
html = html.replace('/*ASSETS*/', js_assets).replace('/*CODE*/', code)
# 기본은 저장소 안 dist/. WUXIA_OUT 으로 바꿀 수 있다.
out = os.environ.get('WUXIA_OUT') or os.path.join(R, 'dist', 'wuxia.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out,'w',encoding='utf-8').write(html)
print("빌드 %s · %.0fKB · 에셋 %d" % (out, len(html)/1024, len(assets)))

# ── 웹(게시)용 분리 빌드 (v2.93.4, 사용자 확정 "두 번째로 하자") ──
# 아티팩트는 한 페이지 16MB 한도라 단일 파일이 한계에 닿았다. 로컬용 단일 파일은 그대로 두고, 게시용은
# index.html(껍데기+로더) · game.js(코드) · assets<N>.json(에셋 base64 조각, 조각당 CHUNK_MB 이하)으로 나눈다.
# 로더가 조각을 다 받아 window.ASSET 을 만든 뒤 game.js 를 붙인다 — 코드는 ASSET 을 읽기만 하니 그대로 돈다.
# fetch 라 file:// 로는 안 열린다(서버·아티팩트에서만). 테스트는 단일 파일(dist/wuxia.html)로 그대로.
web = os.environ.get('WUXIA_WEB') or os.path.join(R, 'dist', 'web')
CHUNK_MB = 7
os.makedirs(web, exist_ok=True)
for f in glob.glob(os.path.join(web, 'assets*.json')): os.remove(f)
chunks, cur, size = [], {}, 0
for k, v in assets.items():
    if cur and size + len(v) > CHUNK_MB * 1024 * 1024: chunks.append(cur); cur, size = {}, 0
    cur[k] = v; size += len(v)
if cur: chunks.append(cur)
for i, c in enumerate(chunks): open(os.path.join(web, 'assets%d.json' % i), 'w', encoding='utf-8').write(json.dumps(c))
ver = m.group(1) if m else 'dev'
loader = ("(function(){var N=%d,V=%s;var el=document.createElement('div');el.id='wload';el.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0e12;color:#c9a66b;font:16px sans-serif;z-index:99';el.textContent='불러오는 중…';document.body.appendChild(el);"
          "Promise.all(Array.from({length:N},function(_,i){return fetch('assets'+i+'.json?v='+V).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}))"
          ".then(function(parts){window.ASSET=Object.assign.apply(null,[{}].concat(parts));var s=document.createElement('script');s.src='game.js?v='+V;s.onload=function(){el.remove();};document.body.appendChild(s);})"
          ".catch(function(e){el.textContent='에셋을 못 불러왔다 ('+e.message+') — 이 빌드는 서버에서 열어야 한다. 로컬은 wuxia.html';});})();"
          % (len(chunks), json.dumps(ver)))
open(os.path.join(web, 'game.js'), 'w', encoding='utf-8').write(code)
open(os.path.join(web, 'index.html'), 'w', encoding='utf-8').write(
    open(R+'/shell.html', encoding='utf-8').read().replace('/*ASSETS*/', loader).replace('/*CODE*/', ''))
print("웹 빌드 %s · index+game.js %.0fKB · 에셋 조각 %d개 (%s)" % (web, (os.path.getsize(os.path.join(web,'index.html'))+len(code))/1024, len(chunks),
      ' '.join('%.1fMB' % (os.path.getsize(os.path.join(web,'assets%d.json'%i))/1048576) for i in range(len(chunks)))))
