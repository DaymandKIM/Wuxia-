"""대나무 샤먼 마법 시트 — 4칸을 3동작으로 뽑는다.

시트는 Charging · Casting · Impact · Settling 네 칸인데, 가운데 두 칸은
따로 그린 게 아니라 **하나의 그림이 칸 경계로 나뉜 것**이다. 기운이
지팡이 끝에서 나와 오른쪽 칸으로 이어진다. 그래서 가운데 둘은 잘라서
한 장으로 쓴다. (전에 칸마다 잘라서 기운 앞머리가 뭉텅 날아갔다.)

  charging  → m0   기본 공격에도 쓴다
  casting + impact → m1   시전 (기운까지 한 장)
  settling  → m3   마무리

m2 는 날아가는 탄으로만 쓴다. m1 에서 기운 부분만 떼어낸다.

읽기: 시트 원본
쓰기: assets/shaman_m{0,1,2,3}.png (다른 동작과 같은 규격으로 맞춤)
"""
from PIL import Image
import numpy as np, json, os, glob
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))
SHEET = R + '/sheets/shaman_magic.png'

# 칸 — 마젠타가 아닌 덩어리로 실측했다. 가운데 둘은 하나로 이어져 있다.
PANEL = {
    'm0': (14, 36, 244, 282),     # Charging
    'm1': (256, 22, 778, 285),    # Casting + Impact — 한 장
    'm3': (789, 36, 1019, 282),   # Settling down
}


def cut(a):
    """마젠타 배경 + 보라 칸 + 검은 테두리를 뺀다.
       몸에 붙은 검은 외곽선은 되살린다 (안 그러면 정수리가 납작해진다)."""
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    sat = a.max(2) - a.min(2)
    mag = (r > 150) & (g < 110) & (b > 150) & (abs(r - b) < 80)
    # 칸 배경(보라)과 칸 테두리(어두운 보라). 테두리가 어두워서 임계를 낮게 잡는다.
    # 사람의 갈색 외곽선은 r>g>b 라 여기 안 걸린다.
    panel = (r > 30) & (b > 25) & (r - g > 18) & (b - g > 14)
    dark = (sat < 26) & (a.max(2) < 60)
    cand = mag | panel | dark
    lb, n = ndi.label(cand, np.ones((3, 3)))
    edge = set(lb[0, :]) | set(lb[-1, :]) | set(lb[:, 0]) | set(lb[:, -1])
    edge.discard(0)
    fg = ~np.isin(lb, list(edge))
    fg = ndi.binary_opening(ndi.binary_closing(fg, np.ones((3, 3))), np.ones((2, 2)))
    fg |= ndi.binary_dilation(fg, np.ones((3, 3)), iterations=2) & (a.max(2) < 34)
    return np.dstack([a, np.where(fg, 255, 0)]).astype(np.uint8)


def tight(rgba, drop=60):
    al = rgba[:, :, 3] > 0
    lb, n = ndi.label(al, np.ones((3, 3)))
    sz = ndi.sum(al, lb, range(1, n + 1))
    objs = ndi.find_objects(lb)
    keep = []
    for i in range(n):
        if sz[i] < drop: continue
        o = objs[i]
        h, w = o[0].stop - o[0].start, o[1].stop - o[1].start
        if min(h, w) <= 2 and max(h, w) >= 20: continue   # 칸 테두리 조각
        keep.append(i + 1)
    al = np.isin(lb, keep)
    out = rgba.copy(); out[:, :, 3] = np.where(al, out[:, :, 3], 0)
    ys, xs = np.where(al)
    return Image.fromarray(out[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')


A = np.array(Image.open(SHEET).convert('RGB')).astype(int)
raw = {}
for k, (x0, y0, x1, y1) in PANEL.items():
    raw[k] = tight(cut(A[y0:y1 + 1, x0:x1 + 1]))
    print("  %-3s 원본 %dx%d" % (k, raw[k].width, raw[k].height))


def person_box(im):
    """사람만 — 초록 기운(형광)과 마젠타 잔재를 뺀 덩어리"""
    a = np.array(im).astype(int)
    al = a[:, :, 3] > 0
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    glow = al & (g > 120) & (g > r + 40) & (g > b + 20)       # 형광 초록 = 기운
    body = al & ~ndi.binary_dilation(glow, np.ones((3, 3)), iterations=2)
    lb, n = ndi.label(body, np.ones((3, 3)))
    if n == 0: return None
    sz = ndi.sum(body, lb, range(1, n + 1))
    ys, xs = np.where(lb == int(np.argmax(sz)) + 1)
    return xs.min(), xs.max(), ys.min(), ys.max()


# ── 배율 — 기존 동작(idle 등)의 사람 키에 맞춘다 ──────────
ref = np.array(Image.open(R + '/raw/shaman/shaman_idle.png').convert('RGBA'))
ry = np.where((ref[:, :, 3] > 0).any(1))[0]
TARGET_H = int(ry.max() - ry.min() + 1)          # 기존 사람 키
pb = person_box(raw['m0'])
SCALE = TARGET_H / (pb[3] - pb[2] + 1)
print("  사람 키 %d → %d · 배율 %.3f" % (pb[3] - pb[2] + 1, TARGET_H, SCALE))

scaled = {}
for k, im in raw.items():
    w2, h2 = max(2, round(im.width * SCALE)), max(2, round(im.height * SCALE))
    mid = im.resize((w2 * 2, h2 * 2), Image.LANCZOS).resize((w2, h2), Image.LANCZOS)
    a = np.array(mid); a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    scaled[k] = Image.fromarray(a, 'RGBA')

# ── 공통 캔버스 ─────────────────────────────────────────
# 렌더러는 가로 중앙·바닥 기준으로 그린다. 기운이 오른쪽으로만 뻗으므로
# 사람 중심에서 먼 쪽 거리의 두 배를 폭으로 잡아야 좌우 반전에서 안 잘린다.
def trim(im):
    a = np.array(im); ys, xs = np.where(a[:, :, 3] > 0)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')

# 기존 5동작은 shamanstaff.py 가 지팡이를 이어 붙인 결과(assets/)를 쓴다
frames = {}
for p in sorted(glob.glob(R + '/assets/shaman_*.png')):
    k = os.path.basename(p)[7:-4]
    if k.startswith('m'): continue
    frames[k] = trim(Image.open(p).convert('RGBA'))
for k, im in scaled.items():
    frames[k] = trim(im)

# 자리 잡기 — 사람의 발바닥과 좌우 중심을 기준으로 맞춘다.
# 기운이 발밑보다 내려가는 프레임이 있어서, 그림 전체가 아니라
# 사람 위치를 기준으로 재야 몸이 위아래로 안 튄다.
box = {k: (person_box(im) or (0, im.width - 1, 0, im.height - 1)) for k, im in frames.items()}
reach = up = down = 0
for k, im in frames.items():
    x0, x1, y0, y1 = box[k]
    cx, foot = (x0 + x1) / 2, y1
    a = np.array(im); al = a[:, :, 3] > 0
    ax = np.where(al.any(0))[0]; ay = np.where(al.any(1))[0]
    reach = max(reach, cx - ax.min(), ax.max() - cx)
    up = max(up, foot - ay.min())
    down = max(down, ay.max() - foot)
W = int(np.ceil(reach)) * 2 + 6
H = int(np.ceil(up + down)) + 5

for k, im in frames.items():
    x0, x1, y0, y1 = box[k]
    cx, foot = (x0 + x1) / 2, y1
    canv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canv.alpha_composite(im, (int(round(W / 2 - cx)), int(round(H - 3 - down - foot))))
    canv.save('%s/assets/shaman_%s.png' % (R, k))

# ── 탄 — m1 에서 기운만 떼어낸다 ────────────────────────
a = np.array(Image.open('%s/assets/shaman_m1.png' % R).convert('RGBA')).astype(int)
al = a[:, :, 3] > 0
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
glow = al & (g > 110) & (g > r + 30) & (g > b + 10)
glow = ndi.binary_closing(glow, np.ones((5, 5)))
lb, n = ndi.label(glow, np.ones((3, 3)))
sz = ndi.sum(glow, lb, range(1, n + 1))
big = lb == int(np.argmax(sz)) + 1
big = ndi.binary_dilation(big, np.ones((3, 3)), iterations=2) & al   # 기운 속 어두운 덩굴까지
ys, xs = np.where(big)
orb = a.copy(); orb[:, :, 3] = np.where(big, orb[:, :, 3], 0)
Image.fromarray(orb[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.uint8),
                'RGBA').save(R + '/assets/shaman_m2.png')

meta = {"w": W, "h": H, "body_w": 68, "body_h": 56,
        "frames": sorted(k for k in frames)}
json.dump(meta, open(R + '/shamanmeta.json', 'w'), indent=1)
m2 = Image.open(R + '/assets/shaman_m2.png')
print("대나무 샤먼 %dx%d · 프레임 %d · 탄 %dx%d" % (W, H, len(frames), m2.width, m2.height))
for k in sorted(frames):
    a = np.array(Image.open('%s/assets/shaman_%s.png' % (R, k)))
    ys, xs = np.where(a[:, :, 3] > 0)
    print("  %-5s 내용 x%d-%d y%d-%d" % (k, xs.min(), xs.max(), ys.min(), ys.max()))
