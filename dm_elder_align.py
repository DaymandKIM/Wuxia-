# 당문 장로 후처리 — 독구름이 낀 컷의 가로 정렬을 노인 다리 기준으로 다시 잡는다.
#
# 왜: foesheet.pack 은 컷 아래 30% 띠의 평균 x(_legcx)로 가운데를 잡는데,
#     독무 장풍(r2c3~c5)은 구름이 바닥까지 깔려 그 평균이 오른쪽으로 끌려간다.
#     → 노인이 atk3 에서 50px 왼쪽으로 튄다(순환 중 몸이 미끄러짐).
# 어떻게: 구름은 단색 연녹 (201,239,162) 이라 색으로 정확히 갈린다.
#         구름을 뺀 '노인'만으로 다리 중심을 다시 재고, 모든 컷을 그 중심으로 다시 얹는다.
#         캔버스 폭은 노인 중심 기준 최대 좌우 폭에서 다시 구한다(세로·바닥 정렬은 그대로).
import os, glob, json
import numpy as np
from PIL import Image
from scipy import ndimage

R = os.path.dirname(os.path.abspath(__file__))
A = '/home/user/Wuxia-/assets'
PRE = 'dm_elder'

def split(a):
    al = a[..., 3] > 0
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    cloud = al & (g > 190) & (r > 150) & (g > b + 40) & (g > r + 15)
    cloud = ndimage.binary_dilation(cloud, iterations=1) & al
    man = al & ~cloud
    lab, n = ndimage.label(man, structure=np.ones((3, 3)))
    if n > 1:
        sz = ndimage.sum(man, lab, range(1, n + 1))
        man = lab == (int(np.argmax(sz)) + 1)
    return al, man

def legcx(man):
    ys, xs = np.where(man)
    sel = ys >= ys.max() - (ys.max() - ys.min()) * 0.3
    return float(xs[sel].mean())

frames = {}
for p in sorted(glob.glob(os.path.join(A, PRE + '_*.png'))):
    k = os.path.basename(p)[len(PRE) + 1:-4]
    frames[k] = np.array(Image.open(p).convert('RGBA'))

ext = 0; top = 0
info = {}
for k, a in frames.items():
    al, man = split(a)
    cx = legcx(man)
    ys, xs = np.where(al)
    info[k] = (cx, xs.min(), xs.max(), ys.min(), ys.max())
    ext = max(ext, cx - xs.min(), xs.max() + 1 - cx)
    top = max(top, ys.max() + 1 - ys.min())
CANW = int(np.ceil(ext)) * 2 + 2; CANH = int(top) + 1
print('노인 다리 기준 캔버스 %dx%d' % (CANW, CANH))

spec = {}
for k, a in frames.items():
    cx, x0, x1, y0, y1 = info[k]
    can = np.zeros((CANH, CANW, 4), np.uint8)
    ys, xs = np.where(a[..., 3] > 0)
    dx = int(round(CANW / 2 - cx)); dy = CANH - 1 - ys.max()
    ok = (xs + dx >= 0) & (xs + dx < CANW) & (ys + dy >= 0) & (ys + dy < CANH)
    can[ys[ok] + dy, xs[ok] + dx] = a[ys[ok], xs[ok]]
    if ok.sum() < len(xs): print('  %s 잘림 %d px' % (k, len(xs) - ok.sum()))
    Image.fromarray(can, 'RGBA').save(os.path.join(A, '%s_%s.png' % (PRE, k)))
    yy, xx = np.where(can[..., 3] > 0)
    rows = (can[..., 3] > 0).sum(1); by = np.where(rows >= 6)[0]
    spec[k] = dict(w=int(xx.max() + 1 - xx.min()), h=int(yy.max() + 1 - yy.min()), body=int(by.max() + 1 - by.min()))

# 다시 잰 뒤 노인 다리 중심이 다 같은지 확인
print('정렬 확인(노인 다리 중심, 캔버스 가운데 %.1f):' % (CANW / 2))
bad = 0
for k in sorted(frames):
    a = np.array(Image.open(os.path.join(A, '%s_%s.png' % (PRE, k))).convert('RGBA'))
    al, man = split(a); c = legcx(man)
    if abs(c - CANW / 2) > 1.5: print('  %-8s %.1f  ← 어긋남' % (k, c)); bad += 1
print('  어긋난 컷 %d' % bad)

sp = '/home/user/Wuxia-/review/dm_elder_specs.json'
j = json.load(open(sp))
j['canvas'] = [CANW, CANH]; j['frames'] = spec
j['align'] = '노인 다리 기준 재정렬(dm_elder_align.py) — 독구름 픽셀 제외'
json.dump(j, open(sp, 'w'), indent=1)
body = [spec[k] for k in spec if k.startswith(('idle', 'walk'))]
print('몸(대기·걷기) 폭 %d~%d 높이 %d~%d' % (min(s['w'] for s in body), max(s['w'] for s in body),
      min(s['h'] for s in body), max(s['h'] for s in body)))
