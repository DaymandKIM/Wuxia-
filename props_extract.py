"""구역 배경 소품 시트에서 오브젝트를 뽑는다 (죽림 bambooprops.py 일반화).
가로 테두리로 행을 나누고, 각 행에서 세로 테두리를 지운 뒤 덩어리를 x순으로
뽑는다 → 칸 수·불규칙 격자 무관. 마젠타 배경 + AI 보라 그림자 함께 제거.
사용: python props_extract.py <zone>   (zone: village|cave|snow|heaven)
"""
from PIL import Image
import numpy as np, os, sys
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))

# 행별 이름 (위 행 → 아래 행, 각 행은 왼→오른쪽)
ZONES = {
  'village': ('village_props', [
      ['vil_jar','vil_pot','vil_post','vil_fence','vil_stump'],
      ['vil_stump2','vil_wheel','vil_tiles','vil_bush','vil_planks'] ]),
  'cave': ('cave_props', [
      ['cav_mite','cav_mite2','cav_crystal','cav_boulder'],
      ['cav_rubble','cav_mushroom','cav_spire','cav_shard'] ]),
  'snow': ('snow_props', [
      ['sno_pine','sno_pine2','sno_deadtree','sno_rock'],
      ['sno_drift','sno_ice','sno_bush','sno_stump'] ]),
  'heaven': ('heaven_props', [
      ['hev_cairn','hev_windtree','hev_boulder','hev_bonsai'],
      ['hev_menhir','hev_grass','hev_stones','hev_flag'] ]),
}

zone = sys.argv[1]
sheet, rowsN = ZONES[zone]
a = np.array(Image.open('%s/sheets/%s.png' % (R, sheet)).convert('RGB')).astype(int)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
H, W = r.shape
# 배경 = 마젠타 + 보라 그림자 (초록·회색·갈색·따뜻한 아웃라인은 안전)
mag = (r > g + 18) & (b > g + 18) & (np.abs(r - b) < 42) & (r + b > 60)
# 테두리 = 어두운 보라선 (밝은 마젠타 배경·오브젝트와 구분). 이걸로 격자를 찾는다.
bord = mag & (a.max(2) < 110)

def lines(frac, th):
    idx = np.where(frac > th)[0]; gs = []
    for i in idx:
        if gs and i - gs[-1][1] <= 4: gs[-1][1] = i
        else: gs.append([i, i])
    return gs

hb = lines(bord.mean(1), 0.5)        # 가로 테두리(행)
vb = lines(bord.mean(0), 0.5)        # 세로 테두리(열)
def cells(bl, lim):
    segs = []
    for i in range(len(bl) - 1):
        a0, a1 = bl[i][1] + 1, bl[i + 1][0] - 1
        if a1 - a0 > 30: segs.append((a0, a1))
    return segs
rowseg, colseg = cells(hb, H), cells(vb, W)
print(zone, '행', len(rowseg), '열', len(colseg))

out = {}
INS = 5
for ri, (y0, y1) in enumerate(rowseg):
    if ri >= len(rowsN): break
    names = rowsN[ri]
    for ci, (x0, x1) in enumerate(colseg):
        if ci >= len(names): break
        name = names[ci]
        iy0, iy1, ix0, ix1 = y0 + INS, y1 - INS, x0 + INS, x1 - INS
        m = ~mag[iy0:iy1 + 1, ix0:ix1 + 1]              # 칸 안 전경(배경·테두리 제외)
        lb, n = ndi.label(m, np.ones((3, 3)))
        if n == 0: continue
        sz = ndi.sum(m, lb, range(1, n + 1))
        big = max(range(1, n + 1), key=lambda i: sz[i - 1])
        keep = [i for i in range(1, n + 1) if sz[i - 1] >= 120]  # 칸의 조각을 다 합친다
        if not keep: continue
        m = np.isin(lb, keep)
        ys_, xs_ = np.where(m)
        y0b, y1b, x0b, x1b = ys_.min(), ys_.max(), xs_.min(), xs_.max()
        mm = m[y0b:y1b + 1, x0b:x1b + 1]
        px = a[iy0 + y0b:iy0 + y1b + 1, ix0 + x0b:ix0 + x1b + 1]
        rgba = np.dstack([px, np.where(mm, 255, 0)]).astype(np.uint8)
        img = Image.fromarray(rgba, 'RGBA')
        img.save('%s/assets/%s.png' % (R, name))
        out[name] = img
        print('  %-14s %dx%d' % (name, img.width, img.height))

# 눈검사 몽타주 (흰 배경 확대)
if out:
    scale, pad = 2, 12
    mw = max(im.width for im in out.values()); mh = max(im.height for im in out.values())
    cols_n = max(len(r) for r in rowsN); rows_n = len(rowsN)
    cw, ch = mw + pad, mh + pad
    mont = Image.new('RGB', (cw * cols_n * scale, ch * rows_n * scale), (255, 255, 255))
    keys = [k for row in rowsN for k in row]
    for i, k in enumerate(keys):
        if k not in out: continue
        im = out[k]; rr, cc = i // cols_n, i % cols_n
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        ox = cc * cw * scale + (cw * scale - big.width) // 2
        oy = rr * ch * scale + (ch * scale - big.height)
        mont.paste(big, (ox, oy), big)
    mont.save('%s/review/props_%s.png' % (R, zone))
    print('몽타주 → review/props_%s.png' % zone)
