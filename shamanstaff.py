"""대나무 샤먼 — 잘린 지팡이 끝을 되살린다.

원본 시트가 없다. 처음 뽑을 때 인물 덩어리를 기준으로 칸을 재고 여백 8px만
줬는데, 지팡이가 그 밖으로 나가 있어서 양 끝이 칸 경계에서 뚝 잘렸다.
공격·마법 동작에서 특히 눈에 띈다.

시트를 다시 뽑을 수 없으니, 잘린 단면에서 막대의 기울기를 재고 같은 단면을
그 방향으로 이어 붙인 뒤 끝을 둥글린다. 색은 단면에서 그대로 가져오므로
나뭇결과 외곽선이 이어진다.

읽기: raw/shaman/*.png (68x56 원본)
쓰기: assets/shaman_*.png (92x70, 몸은 그대로 · 여백만 넓힘)
"""
from PIL import Image
import numpy as np, json, os, glob

R = os.path.dirname(os.path.abspath(__file__))
SRC, DST = R + '/raw/shaman', R + '/assets'

OW, OH = 68, 56          # 원본 규격
PADX, PADY = 12, 14      # 지팡이가 뻗어 나갈 여백
W, H = OW + PADX * 2, OH + PADY      # 92 x 70 (바닥은 그대로 둔다)

EXT      = 11            # 이어 붙이는 길이
TAPER    = 4             # 끝에서 둥글리는 구간
MIN_T, MAX_T = 2, 6      # 이 두께의 단면만 지팡이로 본다 (팔·옷자락 제외)
TRACK    = 8             # 기울기를 재는 구간


def runs(v):
    out, s = [], None
    for i, x in enumerate(v):
        if x and s is None: s = i
        elif not x and s is not None: out.append((s, i - 1)); s = None
    if s is not None: out.append((s, len(v) - 1))
    return out


def slope_at(al, col, r0, r1, step):
    """단면에서 안쪽으로 들어가며 막대의 기울기(행 변화/열 변화)를 잰다."""
    cy = [(r0 + r1) / 2]
    lo, hi = r0, r1
    for k in range(1, TRACK + 1):
        c = col + step * k
        if not (0 <= c < al.shape[1]): break
        cand = [(a, b) for a, b in runs(al[:, c])
                if b >= lo - 3 and a <= hi + 3 and MIN_T <= b - a + 1 <= MAX_T + 2]
        if not cand: break
        a, b = min(cand, key=lambda t: abs((t[0] + t[1]) / 2 - cy[-1]))
        cy.append((a + b) / 2); lo, hi = a, b
    if len(cy) < 3: return 0.0
    x = np.arange(len(cy), dtype=float)
    return float(np.polyfit(x, np.array(cy), 1)[0])


def extend(img, side):
    """side: -1 왼쪽으로, +1 오른쪽으로"""
    a = np.array(img)
    al = a[:, :, 3] > 0
    xs = np.where(al.any(0))[0]
    col = xs.min() if side < 0 else xs.max()
    for r0, r1 in runs(al[:, col]):
        t = r1 - r0 + 1
        if not (MIN_T <= t <= MAX_T):
            continue                      # 팔·옷자락은 건드리지 않는다
        sl = slope_at(al, col, r0, r1, -side)      # 안쪽 방향으로 재고
        sl = -sl                                   # 바깥으로 뒤집는다
        sample = a[r0:r1 + 1, col + (-side) * 2].copy()   # 깨끗한 단면 한 줄
        if sample[:, 3].min() == 0:
            sample = a[r0:r1 + 1, col].copy()
        # 두꺼운 끝(지팡이 밑동)은 짧게 이어 붙인다. 길게 빼면 몽둥이가 된다.
        ext = EXT if t <= 4 else EXT - 3
        for k in range(1, ext + 1):
            c = col + side * k
            if not (0 <= c < a.shape[1]): break
            dy = int(round(sl * k))
            cut = 0 if k <= ext - TAPER else (k - (ext - TAPER))
            if t - cut * 2 < 1: break
            for i in range(cut, t - cut):
                y = r0 + dy + i
                if 0 <= y < a.shape[0] and a[y, c, 3] == 0:
                    a[y, c] = sample[i]
    return Image.fromarray(a, 'RGBA')


out = {}
for p in sorted(glob.glob(SRC + '/*.png')):
    k = os.path.basename(p)[len('shaman_'):-4]
    src = Image.open(p).convert('RGBA')
    if k == 'm2':
        # m2는 인물이 아니라 구체 그림이다. 탄으로 그릴 때 그림 전체를
        # 통째로 늘려 쓰므로, 여백을 붙이면 구체가 작아지고 어긋난다.
        canv = src
    else:
        canv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canv.alpha_composite(src, (PADX, PADY))      # 가로 중앙 · 바닥 유지
        canv = extend(extend(canv, -1), +1)
    canv.save('%s/shaman_%s.png' % (DST, k))
    a = np.array(canv); ys, xs = np.where(a[:, :, 3] > 0)
    out[k] = [int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())]

json.dump({"w": W, "h": H, "body_w": OW, "body_h": OH,
           "frames": sorted(out)}, open(R + '/shamanmeta.json', 'w'), indent=1)
print("대나무 샤먼 %dx%d (원본 %dx%d · 지팡이 %dpx 복원)" % (W, H, OW, OH, EXT))
for k in sorted(out):
    x0, x1, y0, y1 = out[k]
    print("  %-5s 내용 x%d-%d y%d-%d" % (k, x0, x1, y0, y1))
