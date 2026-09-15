#!/usr/bin/env python3
"""단일 HTML로 묶는다. 순서가 곧 의존 순서다."""
import base64, os, glob
R = os.path.dirname(os.path.abspath(__file__))
ORDER = ['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js',
         '40-step.js','50-render.js','60-ui.js','62-train.js','63-arts.js','64-fate.js','65-save.js','65b-treedata.js','66-tree.js','67-treepanel.js','68-equip.js','70-main.js']
# 에셋 → base64
assets = {}
for p in sorted(glob.glob(R + '/assets/*.png')):
    k = os.path.basename(p)[:-4]
    assets[k] = 'data:image/png;base64,' + base64.b64encode(open(p,'rb').read()).decode()
import json
js_assets = 'const ASSET=' + json.dumps(assets) + ';'
code = '\n'.join(open(R+'/src/'+f, encoding='utf-8').read() for f in ORDER)
html = open(R+'/shell.html', encoding='utf-8').read()
html = html.replace('/*ASSETS*/', js_assets).replace('/*CODE*/', code)
# 기본은 저장소 안 dist/. WUXIA_OUT 으로 바꿀 수 있다.
out = os.environ.get('WUXIA_OUT') or os.path.join(R, 'dist', 'wuxia.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out,'w',encoding='utf-8').write(html)
print("빌드 %s · %.0fKB · 에셋 %d" % (out, len(html)/1024, len(assets)))
