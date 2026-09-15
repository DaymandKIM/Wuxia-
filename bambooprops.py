"""죽림 배경 소품 시트에서 8종을 뽑는다.
2행×4열, 마젠타 배경(#FF00FF 계열), 순검정 칸 테두리.
칸 테두리 선을 찾아 칸을 나누고, 칸 '안쪽'에서 마젠타만 걷어낸다
(테두리는 인셋으로 제외 → 오브젝트의 검은 아웃라인은 보존).
각 소품은 tight bbox로 잘라 assets/에 개별 저장. drawProps가 바닥 중앙으로 그린다.
"""
from PIL import Image
import numpy as np, os
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))
a = np.array(Image.open(R + '/sheets/bamboo_props.png').convert('RGB')).astype(int)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
H, W = r.shape

# 마젠타 배경 + AI가 그린 보라색 그림자 + 테두리 보라 블렌드를 배경으로 본다.
# 보라 = r·b가 g보다 높고 r≈b. (초록·회색·갈색·따뜻한 검정 아웃라인은 안전)
mag = (r > g + 18) & (b > g + 18) & (np.abs(r - b) < 42) & (r + b > 60)
blk = a.max(2) < 60                       # 칸 테두리(순검정)

# 테두리 선 찾기 — 검정 비율이 높은 행/열
def lines(axis):
    frac = blk.mean(axis=axis)
    idx = np.where(frac > 0.5)[0]
    groups = []
    for i in idx:
        if groups and i - groups[-1][1] <= 3: groups[-1][1] = i
        else: groups.append([i, i])
    return groups

vb = lines(0)   # 세로 테두리 (열)
hb = lines(1)   # 가로 테두리 (행)
print('세로 테두리', len(vb), '가로 테두리', len(hb))

# 칸 = 테두리 사이 구간
def cells(borders, size):
    segs = []
    prev = 0
    edges = [b for b in borders]
    # 바깥 경계 포함 처리: 테두리 사이를 칸으로
    pts = []
    for lo, hi in edges: pts.append((lo, hi))
    for i in range(len(pts) - 1):
        x0 = pts[i][1] + 1
        x1 = pts[i + 1][0] - 1
        if x1 - x0 > 20: segs.append((x0, x1))
    return segs

cols = cells(vb, W)
rows = cells(hb, H)
print('열', len(cols), '행', len(rows))

NAMES = [['bamboo_big', 'bamboo_mid', 'bamboo_one', 'bamboo_shoot'],
         ['bamboo_rock', 'bamboo_fern', 'bamboo_log', 'bamboo_grass']]

out = {}
INS = 4     # 테두리 안쪽 블렌드 링을 건너뛰는 인셋
for ri, (y0, y1) in enumerate(rows):
    for ci, (x0, x1) in enumerate(cols):
        name = NAMES[ri][ci]
        iy0, iy1, ix0, ix1 = y0 + INS, y1 - INS, x0 + INS, x1 - INS
        sub = ~mag[iy0:iy1 + 1, ix0:ix1 + 1]
        px = a[iy0:iy1 + 1, ix0:ix1 + 1]
        lb, n = ndi.label(sub, np.ones((3, 3)))
        if n == 0:
            continue
        sz = ndi.sum(sub, lb, range(1, n + 1))
        area = sub.size
        keep = [i + 1 for i in range(n) if sz[i] >= area * 0.003]   # 잡티만 제거
        m = np.isin(lb, keep)
        ys, xs = np.where(m)
        if not len(ys):
            continue
        rgba = np.dstack([px, np.where(m, 255, 0)]).astype(np.uint8)
        crop = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        img = Image.fromarray(crop, 'RGBA')
        img.save('%s/assets/%s.png' % (R, name))
        out[name] = img
        print('  %-14s %dx%d' % (name, img.width, img.height))

# 눈검사 몽타주 — 흰 배경 확대
scale = 2
pad = 12
maxw = max(im.width for im in out.values())
maxh = max(im.height for im in out.values())
cols_n = 4
rows_n = (len(out) + cols_n - 1) // cols_n
cw, ch = maxw + pad, maxh + pad
mont = Image.new('RGB', (cw * cols_n * scale, ch * rows_n * scale), (255, 255, 255))
for i, (k, im) in enumerate(out.items()):
    r_, c_ = i // cols_n, i % cols_n
    big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    ox = c_ * cw * scale + (cw * scale - big.width) // 2
    oy = r_ * ch * scale + (ch * scale - big.height)
    mont.paste(big, (ox, oy), big)
mont.save(R + '/review/bamboo_props.png')
print('몽타주 → review/bamboo_props.png')
