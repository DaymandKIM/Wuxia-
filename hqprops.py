"""문파 본진 마당 소품 시트에서 오브젝트를 뽑는다 (사냥터 props_extract.py의 본진판).

사용: python hqprops.py <문파키> [--rows=2] [--cols=4] [--sheet=...] [--pad=...]
  예) python hqprops.py sorim      # sheets/prop_hq_sorim.png → assets/prophq_sorim_0..7.png

시트 규격: 마젠타 배경 + 어두운 테두리 격자(기본 2줄×4칸). 격자는 어두운 보라 줄을
검출해 잡고(칸이 불규칙해도 됨), 검출 결과가 rows/cols와 안 맞으면 균등 격자로 떨어진다.
칸 안에서 마젠타(+AI 보라 그림자)를 걷고, 칸의 조각을 합쳐 tight bbox로 자른다.
워터마크: 떨어진 조각이면 버리고(작은 덩어리), 물체 위에 덧칠된 반투명 별이면
마지막 칸에서 '밝은데 채도 낮은' 픽셀로 가려내 중앙값으로 메운다(--nowm 로 끔).
저장은 팔레트 PNG(투명 인덱스) — 빌드 16MB 한도를 아낀다.
이름은 시트 순서대로 prophq_<문파키>_<번호>, 1줄 왼쪽부터 0.

검사판: review/prophq_<문파키>.png — 죽림 바닥색 위에 실제 표시 높이로 늘어놓고
주인공 대기 컷을 같이 세운다(크기 견주기). 반드시 눈으로 본다(CLAUDE.md 규칙 0).
"""
from PIL import Image
import numpy as np, os, sys
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))

# 화면 표시 높이(px) — 인물 키 48보다 작아야 한다. 없으면 원본 비례로 어림잡아 찍는다.
SHOW = {
    'sorim': [36, 44, 22, 44, 30, 32, 38, 44],
}
LABEL = {
    'sorim': ['향로', '목인장', '방석 더미', '종', '솔잎·빗자루', '돌 물확', '석등', '봉 거치대'],
}
GROUND = (0x6a, 0x7a, 0x52)   # 죽림 바닥색 — 검사판 배경
HERO_AW = 24                  # HFX.aw.idle (00-data)
HERO_H = 48                   # 인물 키 기준


def grid(bord, n, size):
    """어두운 줄 묶음 사이를 칸으로. 검출이 안 맞으면 균등 격자."""
    idx = np.where(bord > 0.5)[0]
    gs = []
    for i in idx:
        if gs and i - gs[-1][1] <= 4: gs[-1][1] = i
        else: gs.append([i, i])
    segs = []
    for i in range(len(gs) - 1):
        a0, a1 = gs[i][1] + 1, gs[i + 1][0] - 1
        if a1 - a0 > 30: segs.append((a0, a1))
    if len(segs) != n:
        print('  ! 줄 검출 %d칸 ≠ %d — 균등 격자로' % (len(segs), n))
        segs = [(round(size * i / n), round(size * (i + 1) / n) - 1) for i in range(n)]
    return segs


def dewatermark(px, m):
    """마지막 칸 오른쪽 아래의 AI 워터마크(반투명 별)를 지운다.
    별은 물체 위에 하얗게 덧칠돼 있어 '밝은데 채도가 낮은'(r-b·g-b가 작은) 픽셀로
    가려낸다 — 뽑아낸 덩어리를 3px 넓혀 중앙값으로 메운다(가장자리 후광까지).
    돌·회색 물체는 이 조건에 통째로 걸리므로, 물체의 12%를 넘게 걸리면 건너뛴다."""
    A = px.astype(int)
    r, g, b = A[..., 0], A[..., 1], A[..., 2]
    H, W = m.shape
    q = np.zeros_like(m); q[int(H * 0.45):, int(W * 0.45):] = True
    f = m & q & (A.max(2) > 95) & ((r - b) < 48) & ((g - b) < 26)
    f = ndi.binary_closing(f, np.ones((3, 3))) & m
    lb, n = ndi.label(f, np.ones((3, 3)))
    if n == 0: return px
    sz = ndi.sum(f, lb, range(1, n + 1))
    f = np.isin(lb, [i + 1 for i in range(n) if sz[i] >= 25])
    f = ndi.binary_dilation(ndi.binary_fill_holes(f), np.ones((3, 3)), iterations=3) & m
    if f.sum() > m.sum() * 0.12:
        print('    · 워터마크 후보가 물체의 %d%% — 건너뜀(회색 물체?)' % (100 * f.sum() / m.sum()))
        return px
    if f.sum() < 60: return px
    out = px.copy(); todo = f.copy()
    for _ in range(120):
        if not todo.any(): break
        known = m & ~todo
        nb = ndi.binary_dilation(known, np.ones((3, 3))) & todo
        if not nb.any(): break
        for y, x in zip(*np.where(nb)):
            k = known[max(0, y - 2):y + 3, max(0, x - 2):x + 3]
            w = out[max(0, y - 2):y + 3, max(0, x - 2):x + 3]
            if k.sum(): out[y, x] = np.median(w[k], axis=0).astype(np.uint8)
        todo &= ~nb
    print('    · 워터마크 %dpx 메움' % f.sum())
    return out


def savepal(rgba, path):
    """팔레트 PNG + 투명 인덱스. 투명 픽셀 RGB는 평균색으로 채워 마젠타 번짐을 막는다."""
    a = np.array(rgba)
    al = a[..., 3] > 0
    rgb = a[..., :3].copy()
    rgb[~al] = rgb[al].mean(0).astype(np.uint8) if al.any() else 0
    q = Image.fromarray(rgb, 'RGB').quantize(colors=255, method=2, dither=Image.FLOYDSTEINBERG)
    pal = list(q.getpalette()[:765]) + [255, 0, 255]          # 255 = 투명
    arr = np.array(q, dtype=np.uint8); arr[~al] = 255
    im = Image.fromarray(arr, 'P'); im.putpalette(pal + [0] * (768 - len(pal)))
    im.save(path, transparency=255, optimize=True)


def extract(key, rows=2, cols=4, sheet=None, ins=5, wm=True):
    src = sheet or '%s/sheets/prop_hq_%s.png' % (R, key)
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    H, W = r.shape
    # 배경 = 마젠타 + 보라 그림자 (회색 돌·갈색 나무·초록 솔잎은 안전)
    mag = (r > g + 18) & (b > g + 18) & (np.abs(r - b) < 42) & (r + b > 60)
    bord = mag & (a.max(2) < 110)                              # 어두운 보라 테두리 줄
    rowseg = grid(bord.mean(1), rows, H)
    colseg = grid(bord.mean(0), cols, W)
    print('%s: %d줄 × %d칸' % (key, len(rowseg), len(colseg)))

    out = []
    for ri, (y0, y1) in enumerate(rowseg):
        for ci, (x0, x1) in enumerate(colseg):
            iy0, iy1, ix0, ix1 = y0 + ins, y1 - ins, x0 + ins, x1 - ins
            m = ~mag[iy0:iy1 + 1, ix0:ix1 + 1]
            lb, n = ndi.label(m, np.ones((3, 3)))
            if n == 0: continue
            sz = ndi.sum(m, lb, range(1, n + 1))
            objs = ndi.find_objects(lb)
            top = int(np.argmax(sz)) + 1
            ty0, ty1 = objs[top - 1][0].start, objs[top - 1][0].stop
            tx0, tx1 = objs[top - 1][1].start, objs[top - 1][1].stop
            keep = [top]
            for i in range(1, n + 1):
                if i == top or sz[i - 1] < 120: continue       # 잡티 버림
                o = objs[i - 1]
                near = (o[0].start < ty1 + 8 and o[0].stop > ty0 - 8 and
                        o[1].start < tx1 + 8 and o[1].stop > tx0 - 8)
                if near: keep.append(i)                        # 붙어 있던 조각만 합침
                else: print('    · 떨어진 조각 %dpx 버림(워터마크?)' % sz[i - 1])
            m = np.isin(lb, keep)
            ys_, xs_ = np.where(m)
            yb0, yb1, xb0, xb1 = ys_.min(), ys_.max(), xs_.min(), xs_.max()
            mm = m[yb0:yb1 + 1, xb0:xb1 + 1]
            px = a[iy0 + yb0:iy0 + yb1 + 1, ix0 + xb0:ix0 + xb1 + 1].astype(np.uint8)
            i = ri * len(colseg) + ci
            if wm and ri == len(rowseg) - 1 and ci == len(colseg) - 1:
                px = dewatermark(px, mm)                        # 시트 오른쪽 아래 = AI 워터마크 자리
            img = Image.fromarray(np.dstack([px, np.where(mm, 255, 0)]).astype(np.uint8), 'RGBA')
            name = 'prophq_%s_%d' % (key, i)
            savepal(img, '%s/assets/%s.png' % (R, name))
            out.append((name, img))
            lab = LABEL.get(key, [''] * 99)[i] if i < len(LABEL.get(key, [])) else ''
            print('  %-16s %3d×%3d  %s' % (name, img.width, img.height, lab))
    return out


def review(key, out):
    """죽림 바닥색 위에 실제 표시 높이로 한 줄 + 주인공 대기 컷."""
    show = SHOW.get(key) or [min(44, im.height) for _, im in out]
    hero = Image.open('%s/assets/idle.png' % R).convert('RGBA')
    hero = hero.crop((0, 0, HERO_AW, hero.height))
    hh = HERO_H; hw = max(1, round(hero.width * hh / hero.height))
    hero = hero.resize((hw, hh), Image.NEAREST)

    Z, PAD, BASE = 4, 10, 14
    items = []
    for i, (name, im) in enumerate(out):
        h = show[i] if i < len(show) else 40
        w = max(1, round(im.width * h / im.height))
        items.append((name, im.resize((w, h), Image.NEAREST), h))
    tot = sum(it[1].width + PAD for it in items) + hero.width + PAD * 4
    top = max([it[1].height for it in items] + [hh]) + 22
    W, H = tot * Z, (top + BASE) * Z
    canvas = Image.new('RGB', (W, H), GROUND)
    from PIL import ImageDraw
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, (top) * Z, W, H], fill=(0x5c, 0x6b, 0x47))   # 바닥선
    x = PAD
    for name, im, h in items:
        big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
        canvas.paste(big, (x * Z, (top - im.height) * Z), big)
        d.text((x * Z + 2, (top + 2) * Z), '%s h%d' % (name.split('_')[-1], h), fill=(255, 255, 255))
        x += im.width + PAD
    big = hero.resize((hero.width * Z, hero.height * Z), Image.NEAREST)
    canvas.paste(big, (x * Z, (top - hh) * Z), big)
    d.text((x * Z + 2, (top + 2) * Z), '주인공 h%d' % hh, fill=(255, 255, 0))
    p = '%s/review/prophq_%s.png' % (R, key)
    canvas.save(p); print('검사판 →', p)


if __name__ == '__main__':
    args = [v for v in sys.argv[1:] if not v.startswith('--')]
    key = args[0] if args else 'sorim'
    opt = dict(rows=2, cols=4, sheet=None, ins=5, wm='--nowm' not in sys.argv)
    for v in sys.argv[1:]:
        if v.startswith('--rows='): opt['rows'] = int(v.split('=')[1])
        elif v.startswith('--cols='): opt['cols'] = int(v.split('=')[1])
        elif v.startswith('--sheet='): opt['sheet'] = v.split('=', 1)[1]
        elif v.startswith('--ins='): opt['ins'] = int(v.split('=')[1])
    out = extract(key, **opt)
    review(key, out)
