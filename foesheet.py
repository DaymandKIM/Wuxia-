"""4×4 칸 제미나이 몬스터 시트 공용 추출기 (v2.64 — 강도·주술사 재작업).
extract(sheet, names, body_h, flip)  → {이름: RGBA(작게 줄인 프레임)}
pack(frames, out_prefix)             → 공통 캔버스(바닥 정렬·다리 무게중심 가로 중앙)로 저장
- 배경: 마젠타(초록이 적·청보다 뚜렷이 낮음). 물든 가장자리는 지우지 않고 색만 고친다.
- 칸 테두리 고리·먼지 제거, 나머지 덩어리는 전부 합침(기운·탄도 그림이다).
- declutter(1px 침식→큰 덩어리→팽창)로 얇게 붙은 옆칸 조각을 끊는다.
- 배율은 기준 컷(대기0) 몸높이 → body_h 로 전 프레임 공통(크기 안정).
"""
from PIL import Image
import numpy as np, os
from scipy import ndimage

R = os.path.dirname(os.path.abspath(__file__))
INSET = 10

def _lines(sh):
    """어두운 테두리 줄 검출 → 행/열 경계. 시트 칸이 균등하지 않다(표범: 3행은 172px·
    4~5행은 255px). 고정 격자로 자르면 칸을 걸쳐 두 그림이 섞인다(v2.65)."""
    lum = sh.sum(-1) / 3; dark = lum < 70
    def groups(v):
        g = []
        for i in v:
            if g and i - g[-1][-1] <= 2: g[-1].append(i)
            else: g.append([i])
        return [(x[0], x[-1]) for x in g]
    return groups(np.where(dark.mean(1) > 0.8)[0]), groups(np.where(dark.mean(0) > 0.8)[0])

def _cell(sh, bg, cy, cx, CW, CH, grid=None):
    if grid:
        rl, cl = grid
        y0, y1 = rl[cy][1] + 1, rl[cy + 1][0]; x0, x1 = cl[cx][1] + 1, cl[cx + 1][0]
        y0 += 3; y1 -= 3; x0 += 3; x1 -= 3               # 테두리 번짐만 피한다(그림이 테두리에 닿는다)
    else:
        y0, x0 = cy * CH + INSET, cx * CW + INSET; y1, x1 = y0 + CH - 2 * INSET, x0 + CW - 2 * INSET
    sub = sh[y0:y1, x0:x1].copy()
    m = ~bg[y0:y1, x0:x1]
    lab, n = ndimage.label(m); keep = np.zeros_like(m)
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        ring = bw > sub.shape[1] * 0.85 and bh > sub.shape[0] * 0.85 and len(ys) < bw * bh * 0.3
        if len(ys) < 40 or ring: continue
        keep[lab == i] = 1
    er = ndimage.binary_erosion(keep, iterations=1)
    lab2, n2 = ndimage.label(er)
    if n2:
        sizes = ndimage.sum(er, lab2, range(1, n2 + 1))
        big = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.05])
        keep = ndimage.binary_dilation(big, iterations=2) & keep
    # 가장자리 3px 안쪽만 — 안쪽 색(살색·옷)은 건드리지 않는다
    rim = keep & ~ndimage.binary_erosion(keep, iterations=3)
    tint = rim & (sub[..., 0] > sub[..., 1] + 10) & (sub[..., 2] > sub[..., 1] + 10)
    sub[..., 0][tint] = np.minimum(sub[..., 0][tint], sub[..., 1][tint] + 18)
    sub[..., 2][tint] = np.minimum(sub[..., 2][tint], sub[..., 1][tint] + 18)
    return np.dstack([sub, np.where(keep, 255, 0)]).astype(np.uint8)

def _shrink(rgba, scale, flip):
    a = rgba[..., 3:4] / 255.0
    pm = np.dstack([rgba[..., :3] * a, rgba[..., 3:4]]).astype(np.uint8)
    w, h = max(1, round(rgba.shape[1] * scale)), max(1, round(rgba.shape[0] * scale))
    s = np.array(Image.fromarray(pm, 'RGBA').resize((w, h), Image.LANCZOS)).astype(float)
    al = s[..., 3:4]; rgb = np.where(al > 0, s[..., :3] / np.maximum(al, 1) * 255, 0)
    out = np.dstack([np.clip(rgb, 0, 255), np.where(al >= 110, 255, 0)]).astype(np.uint8)
    out[out[..., 3] == 0] = 0
    return out[:, ::-1] if flip else out

def extract(sheet, names, body_h, flip=True, ref=None, scale=None):
    sh = np.array(Image.open(os.path.join(R, 'sheets', sheet)).convert('RGB')).astype(int)
    H, W = sh.shape[:2]; rows = len(names); cols = max(len(r) for r in names); CW, CH = W // cols, H // rows
    r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)
    rl, cl = _lines(sh)
    grid = (rl, cl) if len(rl) == rows + 1 and len(cl) == cols + 1 else None
    print('격자:', '테두리 검출 %d행 %d열' % (rows, cols) if grid else '고정 %dx%d' % (CW, CH))
    raw = {}
    for cy in range(rows):
        for cx in range(len(names[cy])):
            nm = names[cy][cx]
            if nm: raw[nm] = _cell(sh, bg, cy, cx, CW, CH, grid)
    if scale is None:
        ys = np.where(raw[ref or list(raw)[0]][..., 3] > 0)[0]
        scale = body_h / (ys.max() + 1 - ys.min())
        print('%s 기준 몸높이 %d → 배율 %.3f' % (sheet, ys.max() + 1 - ys.min(), scale))
    return {k: _shrink(v, scale, flip) for k, v in raw.items()}, scale

def _legcx(a):
    ys, xs = np.where(a[..., 3] > 0); sel = ys >= ys.max() - (ys.max() - ys.min()) * 0.3
    return xs[sel].mean()

def pack(frames, prefix):
    ext = 0; top = 0
    for a in frames.values():
        ys, xs = np.where(a[..., 3] > 0); cx = _legcx(a)
        ext = max(ext, cx - xs.min(), xs.max() + 1 - cx); top = max(top, ys.max() + 1 - ys.min())
    CANW = int(np.ceil(ext)) * 2 + 2; CANH = int(top) + 1
    print('%s 캔버스 %dx%d' % (prefix, CANW, CANH))
    for k, a in frames.items():
        ys, xs = np.where(a[..., 3] > 0); cx = _legcx(a)
        can = np.zeros((CANH, CANW, 4), np.uint8)
        dx = int(round(CANW / 2 - cx)); dy = CANH - 1 - ys.max()
        ok = (xs + dx >= 0) & (xs + dx < CANW) & (ys + dy >= 0)
        can[ys[ok] + dy, xs[ok] + dx] = a[ys[ok], xs[ok]]
        Image.fromarray(can, 'RGBA').save(os.path.join(R, 'assets', '%s_%s.png' % (prefix, k)))
    return CANW, CANH

def review(prefix, names, cols=4, S=4):
    from PIL import ImageDraw
    ims = [(n, Image.open(os.path.join(R, 'assets', '%s_%s.png' % (prefix, n)))) for n in names]
    W, H = ims[0][1].size; rows = (len(ims) + cols - 1) // cols
    c = Image.new('RGB', (cols * (W * S + 8) + 8, rows * (H * S + 20) + 8), (245, 245, 245)); d = ImageDraw.Draw(c)
    for i, (n, im) in enumerate(ims):
        x = 8 + (i % cols) * (W * S + 8); y = 8 + (i // cols) * (H * S + 20); big = im.resize((W * S, H * S), Image.NEAREST)
        d.rectangle((x - 1, y + 15, x + W * S, y + 16 + H * S), outline=(200, 200, 200)); c.paste(big, (x, y + 16), big); d.text((x, y), n, fill=(0, 0, 0))
    p = os.path.join(R, 'review', 'review-%s.png' % prefix); c.save(p); print('검사판 →', p)
