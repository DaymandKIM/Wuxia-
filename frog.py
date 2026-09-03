"""대나무 개구리 — 대기 4 + 도약 1 + 공격 4 = 9프레임.
   대기 시트는 마젠타 배경에 검은 테두리 칸, 공격 시트는 회청 박스 안이다.
   혀는 원본에 '최대 길이' 하나뿐이라, 중간 마디를 잘라 뻗는 단계를 만든다.
"""
from PIL import Image
import numpy as np, json, os
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))
IDLE_SHEET = R + '/sheets/frog_idle.png'
ATK_SHEET  = R + '/sheets/frog_atk.png'

TARGET_H = 30            # 앉은 자세의 몸 높이 (강도 51 · 유령불 37 사이)


def cut(path):
    """배경(마젠타 + 회청 박스 + 검은 테두리)을 빼고 알파를 만든다.
       개구리의 어두운 초록이 박스 회색과 붙어 있어, 회색 판정에
       'b >= g' 를 넣어야 몸이 뜯기지 않는다."""
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    sat = a.max(2) - a.min(2)
    mag     = (r > 70) & (b > 60) & (g < r * 0.72) & (g < b * 0.78)
    neutral = (sat < 30) & (a.max(2) < 95) & (b >= g - 3)
    cand = mag | neutral
    # 바깥과 이어진 것만 배경이다 (눈 흰자·혀 속살이 뚫리지 않게)
    lb, n = ndi.label(cand, np.ones((3, 3)))
    edge = set(lb[0, :]) | set(lb[-1, :]) | set(lb[:, 0]) | set(lb[:, -1])
    edge.discard(0)
    fg = ~np.isin(lb, list(edge))
    fg = ndi.binary_opening(ndi.binary_closing(fg, np.ones((3, 3))), np.ones((2, 2)))
    # 몸에 붙은 검은 외곽선을 되살린다.
    # 위 판정은 '어둡고 채도 낮은 것'을 전부 배경으로 보기 때문에,
    # 개구리 머리 위의 두꺼운 검은 테두리까지 지워져 정수리가 납작하게 잘렸다.
    fg |= ndi.binary_dilation(fg, np.ones((3, 3)), iterations=2) & (a.max(2) < 30)
    return np.dstack([a, np.where(fg, 255, 0)]).astype(np.uint8)


def piece(rgba, x0, y0, x1, y1, drop=40, grow=26):
    """칸에서 개구리만 잘라낸다.
       좌표는 몸이 확실히 들어가는 '속' 범위를 준다. 실제로는 그보다
       grow 만큼 넓게 보고, 속 범위에 걸친 덩어리만 남긴다.
       이렇게 해야 속 범위 밖으로 삐져나온 외곽선·혀가 안 잘리고,
       칸 테두리 같은 남의 덩어리는 안 딸려온다."""
    H, W = rgba.shape[:2]
    gx0, gy0 = max(0, x0 - grow), max(0, y0 - grow)
    gx1, gy1 = min(W - 1, x1 + grow), min(H - 1, y1 + grow)
    c = rgba[gy0:gy1 + 1, gx0:gx1 + 1].copy()
    al = c[:, :, 3] > 0
    lb, n = ndi.label(al, np.ones((3, 3)))
    core = np.zeros_like(al)
    core[y0 - gy0:y1 - gy0 + 1, x0 - gx0:x1 - gx0 + 1] = True
    keep = [i for i in range(1, n + 1)
            if (lb == i).sum() >= drop and (core & (lb == i)).any()]
    al = np.isin(lb, keep)
    c[:, :, 3] = np.where(al, c[:, :, 3], 0)
    ys, xs = np.where(al)
    return Image.fromarray(c[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')


def tongue_mask(im):
    """혀(살구빛 덩어리)만 골라낸다. 외곽선까지 조금 넓혀 잡는다.
       '초록의 끝'을 기준으로 삼으면 안 된다 — 주둥이 끝은 누런빛이라
       초록 판정에서 빠지고, 그 자리에서 자르면 얼굴이 잘려나간다."""
    a = np.array(im); c = a[:, :, :3].astype(int); al = a[:, :, 3] > 0
    warm = al & (c[:, :, 0] - c[:, :, 1] > 25) & (c[:, :, 0] > 140)
    lb, n = ndi.label(warm, np.ones((3, 3)))
    if n == 0:
        return None
    sz = ndi.sum(warm, lb, range(1, n + 1))
    m = lb == int(np.argmax(sz)) + 1
    # 살구빛만으로는 혀의 검은 외곽선이 빠진다. 그러면 혀를 당겨도
    # 외곽선이 제자리에 남아 폭이 안 줄어든다. 열마다 혀가 지나는
    # 높이를 재서, 그 높이에 걸친 덩어리를 통째로 혀로 본다.
    x0 = int(np.where(m.any(0))[0].min())
    out = np.zeros_like(al)
    band = None
    for c in range(x0, al.shape[1]):
        ws = np.where(m[:, c])[0]
        if len(ws):
            band = (int(ws.min()), int(ws.max()))
        if band is None:
            continue
        lo, hi = band[0] - 3, band[1] + 3
        lab2, n2 = ndi.label(al[:, c])
        for i in range(1, n2 + 1):
            ys = np.where(lab2 == i)[0]
            if ys.max() >= lo and ys.min() <= hi:
                out[ys, c] = True
    return out


def tongue(im, frac):
    """혀를 줄인다. 세로로 통째 자르면 앞다리가 같이 잘린다 — 실제로 그랬다.
       그래서 **혀만 따로 떼어** 중간 마디를 자르고, 몸 위에 다시 얹는다."""
    a = np.array(im)
    m = tongue_mask(im)
    if m is None:
        return im.copy()
    xs = np.where(m.any(0))[0]
    x0, xe = int(xs.min()), int(xs.max())
    L = xe - x0
    cut_n = L - int(L * frac)
    if cut_n <= 0:
        return im.copy()
    cs = x0 + max(6, int(L * 0.14))          # 입에 붙은 부분은 남긴다
    ce = min(cs + cut_n, xe - 8)             # 혀끝 8px 은 건드리지 않는다
    if ce <= cs:
        return im.copy()

    rest = a.copy(); rest[:, :, 3][m] = 0            # 몸 (혀 제외)
    tong = a.copy(); tong[:, :, 3][~m] = 0           # 혀만
    short = np.concatenate([tong[:, :cs], tong[:, ce:]], 1)   # 혀에서만 마디를 뺀다

    out = rest.copy()
    ov = short[:, :out.shape[1]]
    put = ov[:, :, 3] > 0
    out[:, :ov.shape[1]][put] = ov[put]
    # 여기서 딱 맞게 잘라내지 않는다. 그러면 프레임마다 잘리는 자리가 달라져
    # 몸이 1px 씩 흔들린다. 남는 여백은 어차피 공통 캔버스에서 정리된다.
    return Image.fromarray(out, 'RGBA')


# ── 원본 조각 ────────────────────────────────────────────
ri = cut(IDLE_SHEET)
# 검은 테두리 실측: 세로선 x=33·274·515·755·996, 가로선 y=235·486
idle = [piece(ri, *c) for c in [(39, 239, 273, 485), (279, 239, 514, 485),
                                (520, 239, 754, 485), (760, 239, 995, 485)]]
ra = cut(ATK_SHEET)
sit   = piece(ra,  51, 104, 205, 229)   # 앉은 자세 — 배율 기준
hop   = piece(ra, 294,  87, 474, 229)   # 몸을 세운 도약 — 혀가 없는 유일한 동작
lunge = piece(ra, 286, 335, 739, 510)   # 도약 + 혀 최대
# 마지막 칸(806,360)에는 워터마크가 뒷다리에 겹쳐 있어 쓰지 않는다

raw = {}
# 대기 — 원본 프레임 높이가 168~188로 들쭉날쭉하다.
# 그대로 두면 숨쉬기가 아니라 부풀었다 줄었다 한다. 편차를 40%로 누른다.
med = float(np.median([im.size[1] for im in idle]))
for i, im in enumerate(idle):
    h = im.size[1]
    want = TARGET_H * (1 + 0.4 * (h / med - 1))       # 결과 높이를 직접 정한다
    raw['idle%d' % i] = (im, want / h)

sa = TARGET_H / sit.size[1]
# 이동(뜀)과 공격 준비는 같은 그림이다. 혀를 지워 만들지 않는다 —
# 그렇게 만들면 잘라내는 자리가 얼굴을 파먹는다.
raw['hop']  = (hop,                 sa)
raw['atk1'] = (tongue(lunge, 0.30), sa)
raw['atk2'] = (lunge,               sa)
raw['atk3'] = (tongue(lunge, 0.55), sa)

# ── 공통 규격으로 맞춘다 ────────────────────────────────
# 렌더러가 -w/2, -h 로 그린다. 즉 가로 중앙 · 바닥 기준이다.
# 혀가 오른쪽으로만 뻗으므로, 몸 중심에서 오른쪽 끝까지 거리의
# 두 배를 폭으로 잡아야 좌우 반전에서도 잘리지 않는다.
scaled = {}
for k, (im, s) in raw.items():
    w2, h2 = max(2, round(im.width * s)), max(2, round(im.height * s))
    mid = im.resize((w2 * 2, h2 * 2), Image.LANCZOS).resize((w2, h2), Image.LANCZOS)
    a = np.array(mid)
    a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    # 줄이고 나서 새로 생기는 티끌을 턴다 (원본 단계 필터로는 안 잡힌다)
    al = a[:, :, 3] > 0
    lb, n = ndi.label(al, np.ones((3, 3)))
    sz = ndi.sum(al, lb, range(1, n + 1))
    keep = np.isin(lb, [i + 1 for i in range(n) if sz[i] >= 5])
    a[:, :, 3] = np.where(keep, a[:, :, 3], 0)
    scaled[k] = Image.fromarray(a, 'RGBA')

reach = 0
for k, im in scaled.items():
    a = np.array(im); al = a[:, :, 3] > 0
    rgb = a[:, :, :3].astype(int)
    gm = al & (rgb[:, :, 1] > rgb[:, :, 0] + 4) & (rgb[:, :, 1] > rgb[:, :, 2] + 4)
    xs = np.where(gm.any(0))[0]
    cx = (xs.min() + xs.max()) / 2                    # 몸 중심
    ax = np.where(al.any(0))[0]
    reach = max(reach, cx - ax.min(), ax.max() - cx)  # 중심에서 가장 먼 쪽
W = int(np.ceil(reach)) * 2 + 4
H = max(im.height for im in scaled.values()) + 2

os.makedirs(R + '/assets', exist_ok=True)
for k, im in scaled.items():
    a = np.array(im); al = a[:, :, 3] > 0
    rgb = a[:, :, :3].astype(int)
    gm = al & (rgb[:, :, 1] > rgb[:, :, 0] + 4) & (rgb[:, :, 1] > rgb[:, :, 2] + 4)
    xs = np.where(gm.any(0))[0]
    cx = (xs.min() + xs.max()) / 2
    canv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canv.alpha_composite(im, (int(round(W / 2 - cx)), H - 1 - im.height))
    canv.save('%s/assets/frog_%s.png' % (R, k))

# 혀 사거리 — 몸 중심에서 혀끝까지 (게임 px)
a = np.array(Image.open(R + '/assets/frog_atk2.png'))
xs = np.where((a[:, :, 3] > 0).any(0))[0]
lash = int(xs.max() - W / 2)

meta = {"w": W, "h": H, "lash": lash, "frames": sorted(scaled)}
json.dump(meta, open(R + '/frogmeta.json', 'w'), indent=1)
print("대나무 개구리 %dx%d · 프레임 %d · 혀 사거리 %dpx"
      % (W, H, len(scaled), lash))
for k in sorted(scaled):
    print("  %-6s %dx%d" % (k, scaled[k].width, scaled[k].height))
