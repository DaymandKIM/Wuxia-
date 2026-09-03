"""대나무 마왕 — 시트에서 24프레임을 뽑는다.

칸(검은 사각 테두리)이 프레임 경계가 아니다. 머리 위 촉수가 칸 위로
삐져나와 있어서, 칸대로 자르면 촉수가 잘린다. 실제로 잘려 있었다.

그래서 칸은 '어느 덩어리를 고를지' 정하는 데만 쓰고, 실제로 자르는 범위는
칸보다 위로 넉넉히 잡는다. 칸 테두리(검정)는 덩어리를 고른 뒤에 지운다.
먼저 지우면 테두리를 가로지르는 촉수가 두 동강 나서 위쪽이 버려진다.

칸 배치는 아래 테두리에서 실측한다.
  1행  대기 5 · 포효 5
  2행  대형 공격 5 · 에너지 폭발 5
  3행  사망 4
"""
from PIL import Image
import numpy as np, json, os
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))
SHEET = R + '/sheets/demon.png'
UP = 34          # 칸 위로 이만큼까지 촉수를 찾는다
SIDE = 4         # 좌우 여유 (칸 간격이 6px 뿐이라 좁게)

a = np.array(Image.open(SHEET).convert('RGB')).astype(int)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
mag = (r > 140) & (g < 120) & (b > 140) & (np.abs(r - b) < 80)
blk = a.max(2) < 45
H, W = mag.shape

# 글자 — 촉수가 라벨 높이까지 올라와서 y로 잘라낼 수가 없다.
# 글자가 있는 띠 안에서 '흰 속살 + 검은 테두리'만 배경으로 돌린다.
# 촉수는 초록·자주라 여기 안 걸린다.
white = a.min(2) > 200
tb = []
ys = np.where(white.any(1))[0]
if len(ys):
    st = pv = ys[0]
    for y in ys[1:]:
        if y - pv > 3:
            tb.append((st, pv)); st = y
        pv = y
    tb.append((st, pv))
text = np.zeros_like(mag)
for y0t, y1t in tb:
    if y1t - y0t < 6:            # 스프라이트 안의 흰 점은 띠가 아니다
        continue
    band = slice(max(0, y0t - 2), min(H, y1t + 3))
    sub = a[band]
    sat = sub.max(2) - sub.min(2)
    blend = (sub[:, :, 0] - sub[:, :, 1] > 25) & (sub[:, :, 2] - sub[:, :, 1] > 20) & (sub.max(2) < 150)
    # 흰 속살 · 검은 테두리 · 회색 번짐 · 마젠타와 섞인 자국
    text[band] |= white[band] | blk[band] | (sat < 22) | blend
mag = mag | text



def runs(line, minlen=50):
    out, s = [], None
    for i, v in enumerate(line):
        if v and s is None:
            s = i
        elif not v and s is not None:
            if i - s >= minlen:
                out.append((s, i - 1))
            s = None
    if s is not None and len(line) - s >= minlen:
        out.append((s, len(line) - 1))
    return out


# 칸 테두리는 순검정이 아니라 마젠타와 섞인 어두운 보라다 (예: 115,11,113).
# 검정으로만 찾으면 못 찾는다.
dark = a.max(2) < 130

# 가로 테두리 줄을 모두 찾아 위·아래로 짝짓는다.
# 촉수가 위 테두리를 끊어놓지만, 줄 자체는 남아 있어서 짝은 맞는다.
cand = [y for y in range(H) if len(runs(dark[y])) >= 4]
groups = []
for y in cand:
    if groups and y - groups[-1][1] <= 3:
        groups[-1][1] = y
    else:
        groups.append([y, y])
assert len(groups) % 2 == 0, '테두리 줄이 짝이 안 맞는다: %s' % groups
boxes = []
ROWS = []
for i in range(0, len(groups), 2):
    ytop, ybot = groups[i][0], groups[i + 1][1]
    ROWS.append(ybot)
    for x0, x1 in runs(dark[ybot]):
        boxes.append((x0, ytop, x1, ybot))

boxes.sort(key=lambda t: (t[1] // 40, t[0]))
print('칸 %d개' % len(boxes))

NAMES = (['idle%d' % i for i in range(5)] + ['roar%d' % i for i in range(5)] +
         ['swing%d' % i for i in range(5)] + ['burst%d' % i for i in range(5)] +
         ['death%d' % i for i in range(4)])
assert len(boxes) == len(NAMES), '칸 수가 %d, 이름이 %d' % (len(boxes), len(NAMES))

raw = {}
ROWTOP = {}                     # 윗 행의 아래 테두리 — 이보다 위로는 안 본다
for i, (x0, y0, x1, y1) in enumerate(boxes):
    above = [yb for yb in ROWS if yb < y0 - 10]
    ROWTOP[i] = (max(above) + 3) if above else 0

for bi, (name, (x0, y0, x1, y1)) in enumerate(zip(NAMES, boxes)):
    gx0, gy0 = max(0, x0 - SIDE), max(ROWTOP[bi], y0 - UP)
    gx1, gy1 = min(W - 1, x1 + SIDE), min(H - 1, y1 + SIDE)
    sub = ~mag[gy0:gy1 + 1, gx0:gx1 + 1]
    lb, n = ndi.label(ndi.binary_closing(sub, np.ones((3, 3))), np.ones((3, 3)))
    core = np.zeros_like(sub)
    core[y0 - gy0 + 3:y1 - gy0 - 2, x0 - gx0 + 3:x1 - gx0 - 2] = True
    keep = [i for i in range(1, n + 1)
            if (lb == i).sum() >= 40 and (core & (lb == i)).any()]
    m = np.isin(lb, keep)

    # 칸 테두리 지우기 — 덩어리를 고른 뒤에 한다.
    # 검정만 지우므로, 테두리를 가로지르는 촉수(초록)는 남는다.
    px = a[gy0:gy1 + 1, gx0:gx1 + 1]

    # 칸 테두리 지우기 — 덩어리를 고른 뒤에 한다.
    # 먼저 지우면 테두리를 가로지르는 촉수가 두 동강 나서 위쪽이 버려진다.
    # 테두리는 검정 아니면 마젠타와 섞인 보라(r≈b, g가 낮다)다.
    # 초록 촉수(g가 높다)와 폭발의 밝은 분홍(밝기 170 초과)은 남긴다.
    def border_junk(q):
        purple = (q[..., 2] > q[..., 1] + 20) & (q[..., 0] > q[..., 1] + 20)
        return (q.max(-1) < 50) | (purple & (q.max(-1) <= 170))

    band = np.zeros(m.shape, bool)
    for yy in range(y0 - 2, y0 + 3):
        i = yy - gy0
        if 0 <= i < m.shape[0]: band[i] = True
    for yy in range(y1 - 2, y1 + 3):
        i = yy - gy0
        if 0 <= i < m.shape[0]: band[i] = True
    for xx in list(range(x0 - 2, x0 + 3)) + list(range(x1 - 2, x1 + 3)):
        i = xx - gx0
        if 0 <= i < m.shape[1]: band[:, i] = True
    m &= ~(band & border_junk(px))

    # 테두리를 지우고 나면 이웃 칸 조각이 떨어져 나온다. 큰 덩어리와
    # 그에 가까운 것만 남긴다.
    lb2, n2 = ndi.label(m, np.ones((3, 3)))
    if n2 > 1:
        sz = ndi.sum(m, lb2, range(1, n2 + 1))
        main = int(np.argmax(sz)) + 1
        near = ndi.binary_dilation(lb2 == main, np.ones((3, 3)), iterations=3)
        m = np.isin(lb2, [i + 1 for i in range(n2)
                          if sz[i] >= 12 and (near & (lb2 == i + 1)).any()])

    ys, xs = np.where(m)
    rgba = np.dstack([px, np.where(m, 255, 0)]).astype(np.uint8)
    raw[name] = Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')

# ── 공통 캔버스 ─────────────────────────────────────────
# 가로 기준은 아랫도리(치마)의 중앙. 낫이 왼쪽으로 길게 나가는 프레임이 있어서
# 그림 전체의 중앙으로 잡으면 몸이 프레임마다 좌우로 튄다.
def base_cx(im):
    m = np.array(im)[:, :, 3] > 0
    h = m.shape[0]
    low = m[int(h * 0.72):]
    xs = np.where(low.any(0))[0]
    return float(np.median(np.where(low)[1])) if len(xs) else m.shape[1] / 2


cx = {k: base_cx(im) for k, im in raw.items()}
reach = max(max(cx[k], im.width - cx[k]) for k, im in raw.items())
Wc = int(np.ceil(reach)) * 2 + 4
Hc = max(im.height for im in raw.values()) + 3

for k, im in raw.items():
    canv = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0))
    canv.alpha_composite(im, (int(round(Wc / 2 - cx[k])), Hc - 2 - im.height))
    canv.save('%s/assets/demon_%s.png' % (R, k))

json.dump({"w": Wc, "h": Hc, "frames": NAMES},
          open(R + '/bossmeta.json', 'w'), indent=1)
print('대나무 마왕 %dx%d · 프레임 %d' % (Wc, Hc, len(raw)))
for k in NAMES:
    im = raw[k]
    print('  %-7s 원본 %dx%d' % (k, im.width, im.height))
