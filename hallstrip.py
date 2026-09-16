"""문파 전각 단계 스트립 추출 검사판 (v2.93 준비) — sheets/hall_<k>_strip.png (사용자 제미나이, 세로 3칸 또는 가로 1줄×N칸, 마젠타 배경)
→ raw/hallstrip/hall_<k>_<i>.png (배경 sect_bg 원본 배율 그대로) + hall_<k>.json + 검사판 review/hallstrip_<k>.png.
**assets 에는 쓰지 않는다** — 규칙 0: 눈검사 받은 뒤에야 반영. 시점(아이소메트릭 vs 정면 3/4)이 배경과 어긋나는지 보는 게 목적.

사용법: python hallstrip.py <k> <sheets/그림.png> [--ref-w N] [--ref-kind yard] [--out raw/hallstrip] [--n 3]
  --ref-w 없으면 review/hall_diff.json 의 <k>.3.w(마지막 단계 폭)를 기준으로 마지막 칸 폭이 그 값이 되게 배율을 정해 모든 칸에 같은 배율.
  k 끝의 숫자(yard2)는 결과 이름에만 쓰고 참조(hall_diff·assets/hall_<k>_3·터)는 뗀 이름(yard)으로 본다.
칸 나누기(v2.93 불규칙 격자): 줄 띠(가로 전폭 60%·각 띠 안 세로 60%)를 전부 지운 뒤 마젠타 아닌 덩어리를 라벨링해
  무게중심의 (띠 순서, x 순서)로 칸을 정한다 — 고정 격자 없음. 같은 띠에서 bbox 가로 간격이 칸 폭 40% 미만이면 같은 칸(부속 조각).
  3칸 세로 스트립·첫 띠만 두 칸인 약방·2줄×3칸 격자가 한 코드로 된다.
"""
import sys, os, json, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

GROUND = (106, 122, 82)             # 게임 바닥색 — 흰 배경은 도복·베이지가 비치는 구멍을 못 보여 준다
BG_SHEET = 'sheets/sect_bg.png'
DIFF_JSON = 'review/hall_diff.json'
YARD_RECT = None                    # 검사판(b)에 덧그릴 배경 터 직사각 (x0,y0,x1,y1) — main 에서 종류별로 채운다
TERRAIN = {'yard': (64, 213, 192, 308), 'clinic': (381, 213, 511, 309), 'guest': (353, 642, 480, 748), 'library': (96, 641, 222, 749), 'gate': (224, 256, 350, 350)}
ANCHOR = {'gate': {'cx': 0.502, 'by': 0.340}}   # hall_diff.json 에 차분이 없는 전각(산문)의 되얹기 앵커 — 폭은 --ref-w 로 준다   # sect_bg 맨땅 터 자리(sectbg.py 가 잰 것). 다른 종류는 잰 뒤 더한다

def font(sz=11, bold=True):
    try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else ''), sz)
    except Exception: return ImageFont.load_default()

# ── 1. 칸 나누기 ─────────────────────────────────────────────────────────────
def dark_px(im):
    """줄 픽셀 판정 — 순검정이 아니다: 장경각 시트의 둘째 가로 줄은 (116,0,108)·세로 줄 (96,0,86)으로 합 182~223 이라 <180 에 빠졌다(마왕 시트 사고와 같은 어두운 자주).
    합<180 이거나, 어두운 자주(합<270·g<45·r·b 가 g 보다 30 넘게 큼)면 줄 후보. 건물의 어두운 붉은 픽셀은 b 가 g 보다 안 크고, 어차피 줄은 전폭 60% 를 넘어야 한다"""
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    s = r + g + b
    return (s < 180) | ((s < 270) & (g < 45) & (r > g + 30) & (b > g + 30))

def dark_bands(im, axis):
    """어두운(dark_px) 픽셀 비율 60% 넘는 줄들을 띠로 묶는다. axis=1 → 가로 줄(행), axis=0 → 세로 줄(열).
    **줄은 양옆이 배경(마젠타)이어야 한다** — 장경각 큰 탑의 어두운 붉은 가장자리 열(x 442)이 띠 높이 60%를 넘어 줄로 오판돼 탑을 자르고 종을 갈랐다.
    띠 양옆 3px 의 배경 비율이 50% 넘는 쪽이 둘 다(그림 가장자리에 붙은 띠는 안쪽 한쪽만) 돼야 줄"""
    dark = dark_px(im); bg = bg_mask(im)
    if axis == 0: dark, bg = dark.T, bg.T          # 열 검사는 전치해 행처럼
    ratio = dark.mean(1); L = dark.shape[0]
    idx = [i for i, v in enumerate(ratio) if v > 0.6]
    bands = []
    for i in idx:
        if bands and i - bands[-1][1] <= 2: bands[-1][1] = i
        else: bands.append([i, i])
    out = []
    for a0, a1 in bands:
        before = bg[max(0, a0 - 3):a0].mean() if a0 > 0 else None
        after = bg[a1 + 1:a1 + 4].mean() if a1 < L - 1 else None
        sides = [s for s in (before, after) if s is not None]
        if sides and all(s > 0.5 for s in sides): out.append((a0, a1))
    return out

def gaps(bands, L, minlen=20):
    """띠 사이의 빈 구간 [(a0, a1), ...] — 가장자리 테두리 띠는 구간을 만들지 않는다(20px 미만 버림)"""
    out, cur = [], 0
    for band in bands + [(L, L)]:
        if band[0] - cur >= minlen: out.append((cur, band[0]))
        cur = band[1] + 1
    return out

def find_lines(im):
    """줄 띠를 전부 찾는다 — 가로 줄(전폭 60%) → 각 가로 띠 안의 세로 줄(띠 높이의 60%). 가로 줄이 없으면 세로 줄 → 각 세로 띠 안의 가로 줄.
    반환 (줄 마스크, 띠 구간 목록[(a0,a1)], 띠 방향 axis: 1=가로 띠(y 구간), 0=세로 띠(x 구간), 띠별 칸 구간 목록)
    v2.93 약방 스트립: 첫 가로 띠만 가운데 세로 줄로 두 칸 — 불규칙 격자라 고정 격자를 쓰지 않는다"""
    H, W = im.shape[:2]
    line = np.zeros((H, W), bool)
    hb = dark_bands(im, 1)
    axis = 1
    if len(gaps(hb, H)) < 2:
        vb = dark_bands(im, 0)
        if len(gaps(vb, W)) >= 2: axis = 0
    if axis == 1:
        for a0, a1 in hb: line[a0:a1 + 1, :] = True
        strips = gaps(hb, H)
        cells = []
        for a0, a1 in strips:                       # 띠 안에서만 세로 줄을 찾는다(전체 높이 비율로는 안 잡힌다) — 양옆 배경 검사 포함
            vb = dark_bands(im[a0:a1], 0)
            for x0, x1 in vb: line[a0:a1, x0:x1 + 1] = True
            cells.append(gaps(vb, W))
    else:
        for a0, a1 in vb: line[:, a0:a1 + 1] = True
        strips = gaps(vb, W)
        cells = []
        for a0, a1 in strips:
            hb2 = dark_bands(im[:, a0:a1], 1)
            for y0, y1 in hb2: line[y0:y1 + 1, a0:a1] = True
            cells.append(gaps(hb2, H))
    return line, strips, axis, cells

def find_cells(im, n_default, near_ratio=0.4):
    """줄을 지운 뒤 마젠타 아닌 덩어리를 라벨링해 무게중심의 (띠 순서, x 순서)로 칸을 정한다.
    같은 띠 안에서 bbox 가로 간격이 칸 폭×near_ratio 보다 작은 덩어리는 같은 칸(부속 조각).
    반환 [ {'region': (y0,y1,x0,x1) 라벨 구간, 'labels': [라벨...], 'lab': 라벨맵, 'sizes': 면적} ... ] — 칸 순서대로"""
    H, W = im.shape[:2]
    line, strips, axis, strip_cells = find_lines(im)
    if not strips:                                   # 줄이 하나도 없으면 세로 균등 분할
        step = H / n_default
        strips = [(int(round(i * step)), int(round((i + 1) * step))) for i in range(n_default)]
        strip_cells = [[(0, W)]] * n_default; axis = 1
    fg = ~bg_mask(im) & ~line
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    coms = ndi.center_of_mass(fg, lab, range(1, n + 1))
    objs = ndi.find_objects(lab)
    blobs = []
    for i in range(n):
        if sizes[i] < 8: continue                    # 점 잡음
        cy, cx = coms[i]; sl = objs[i]
        along = cy if axis == 1 else cx              # 띠 축 좌표
        si = next((j for j, (a0, a1) in enumerate(strips) if a0 <= along < a1), None)
        if si is None: continue
        blobs.append({'id': i + 1, 'strip': si, 'cx': cx, 'cy': cy, 'x0': sl[1].start, 'x1': sl[1].stop, 'y0': sl[0].start, 'y1': sl[0].stop, 'area': int(sizes[i])})
    cells = []
    for si in range(len(strips)):
        bs = sorted([b for b in blobs if b['strip'] == si], key=lambda b: b['cx'] if axis == 1 else b['cy'])
        if not bs: continue
        # 칸 폭 = 그 띠의 (세로 줄로 나뉜) 칸 구간 폭 중앙값 — 줄이 없으면 띠 전체 폭
        segs = strip_cells[si] or [(0, W if axis == 1 else H)]
        cellw = float(np.median([a1 - a0 for a0, a1 in segs]))
        def seg_of(v): return next((j for j, (a0, a1) in enumerate(segs) if a0 <= v < a1), -1)
        groups = []
        for b in bs:
            v = b['cx'] if axis == 1 else b['cy']
            lo, hi = (b['x0'], b['x1']) if axis == 1 else (b['y0'], b['y1'])
            if groups:
                g = groups[-1]
                # 같은 줄 칸 구간이고 (무게중심(면적 가중)이 칸 폭 40% 안 이거나 bbox 가 겹치거나 12px 안) 이면 부속 조각(깃발·울타리·종) —
                # 말뚝·초가(간격 70, 무게중심 290 차이)는 갈리고, 장경각 종(무게중심 120 차이, bbox 겹침)은 붙는다
                if seg_of(v) == g['seg'] and (abs(v - g['c']) < cellw * near_ratio or lo - g['hi'] < 12):
                    g['ids'].append(b['id']); g['c'] = (g['c'] * g['a'] + v * b['area']) / (g['a'] + b['area']); g['a'] += b['area']; g['hi'] = max(g['hi'], hi); continue
            groups.append({'ids': [b['id']], 'seg': seg_of(v), 'c': v, 'a': b['area'], 'hi': hi})
        for g in groups: cells.append({'strip': si, 'ids': g['ids']})
    return cells, lab, sizes, strips, axis, line

# ── 2. 배경 판정·덩어리 고르기 ───────────────────────────────────────────────
def bg_mask(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # 마젠타 계열 — 색상 조건. 어두운 자주(테두리 잔재·그림자)도 같은 조건에 들어온다
    return ((r > g + 40) & (b > g + 40)) | ((np.abs(r - b) < 60) & (g < r - 40) & (g < b - 40))

def cell_from_labels(im, lab, sizes, ids, pad=14):
    """칸에 배정된 라벨들 → (칸 크롭 RGB, 그 안의 fg 마스크). 크롭은 라벨 bbox + pad(팽창·조각 여유)"""
    m = np.isin(lab, ids)
    ys, xs = np.where(m)
    H, W = m.shape
    y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1); x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
    return im[y0:y1, x0:x1], m[y0:y1, x0:x1], (int(x0), int(y0), int(x1), int(y1))

# ── 2. 배경 판정·덩어리 고르기 ───────────────────────────────────────────────
def bg_mask(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # 마젠타 계열 — 색상 조건. 어두운 자주(테두리 잔재·그림자)도 같은 조건에 들어온다
    return ((r > g + 40) & (b > g + 40)) | ((np.abs(r - b) < 60) & (g < r - 40) & (g < b - 40))

def pick_figure(fg, near=12, tiny=80, far=20):
    """fg(칸에 배정된 덩어리 마스크) 중 최대 덩어리 + 그 bbox 주변 near px 안의 조각. 작은 조각(면적<tiny)이 최대 덩어리에서 far px 넘게 떨어졌으면 버린다.
    반환 (keep 마스크, 버린 조각 목록[(면적, bbox, 이유)])"""
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    if n == 0: return None, []
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    big = int(np.argmax(sizes)) + 1
    bm = lab == big
    ys, xs = np.where(bm)
    y0, y1, x0, x1 = ys.min() - near, ys.max() + near, xs.min() - near, xs.max() + near
    dist = ndi.distance_transform_edt(~bm)          # 최대 덩어리까지의 거리
    keep = bm.copy(); dropped = []
    for i in range(1, n + 1):
        if i == big: continue
        m = lab == i
        cy, cx = np.where(m)
        bbox = (int(cx.min()), int(cy.min()), int(cx.max()), int(cy.max()))
        area = int(sizes[i - 1])
        inside = cy.min() >= y0 and cy.max() <= y1 and cx.min() >= x0 and cx.max() <= x1
        if area < tiny and (not inside or dist[m].min() > far): dropped.append((area, bbox, '작은 부유 조각(>%dpx)' % far)); continue
        # 큰 것은 bbox 밖이라도 살린다 — 칸 배정(무게중심)이 이미 이 칸의 것으로 정했다(말뚝·통나무·멍석은 본체와 안 이어진다)
        keep |= m
    return keep, dropped

def cell_rgba(c, fg):
    """칸(크롭 RGB c, 배정 덩어리 마스크 fg) → RGBA(그림 bbox로 크롭). 알파는 마스크 1px 팽창(검은 외곽선 보호 — 단 순마젠타로는 안 번지게), 마젠타 성분은 지우지 않고 걷어낸다"""
    keep, dropped = pick_figure(fg)
    if keep is None: return None, dropped
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # 옅은 마젠타(분홍 별 워터마크 (254,90,254) 류)는 색상 조건에서 이미 배경으로 떨어진다 — 뭐가 그렇게 버려졌는지 보고만 한다
    pale = bg_mask(c) & (g > 60) & (r + g + b > 450)
    lab, n = ndi.label(pale, structure=np.ones((3, 3)))
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < 40: continue
        cy, cx = np.where(m)
        dropped.append((int(m.sum()), (int(cx.min()), int(cy.min()), int(cx.max()), int(cy.max())), '옅은 마젠타 — 배경 판정으로 버림(워터마크류)'))
    pure = (r + g + b > 450) & (g < 60)            # 순마젠타 배경 — 여기로 팽창하면 어두운 테 한 줄이 생긴다
    grown = ndi.binary_dilation(keep, np.ones((3, 3), bool)) & ~pure
    rr, gg, bb = r.copy(), g.copy(), b.copy()
    tint = grown & (r - g > 25) & (b - g > 25)   # 얇은 것에 밴 마젠타 — halls.unmix 와 같은 식(r·b를 g 쪽으로)
    rr[tint] = np.minimum(rr[tint], gg[tint] + 30); bb[tint] = np.minimum(bb[tint], np.maximum(gg[tint] - 8, 0))
    out = np.zeros(c.shape[:2] + (4,), np.uint8)
    out[..., 0] = np.clip(rr, 0, 255); out[..., 1] = np.clip(gg, 0, 255); out[..., 2] = np.clip(bb, 0, 255); out[..., 3] = grown * 255
    ys, xs = np.where(grown)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1], dropped

# ── 3. 축소 ───────────────────────────────────────────────────────────────────
def edge_expand(rgba, n=3):
    """색을 가장자리 밖으로 번지게 해 축소 때 투명 픽셀(검정)이 섞이지 않게"""
    arr = rgba.astype(float); alpha = arr[..., 3:4] / 255.0; rgb = arr[..., :3] * alpha
    for _ in range(n):
        pad = ndi.maximum_filter(rgb, size=(3, 3, 1)); pa = ndi.maximum_filter(alpha, size=(3, 3, 1))
        m = alpha[..., 0] < 0.01
        rgb[m] = pad[m]; alpha[m, 0] = pa[m, 0]
    col = np.clip(rgb / np.maximum(alpha, 1e-3), 0, 255).astype(np.uint8)
    return np.dstack([col, rgba[..., 3]])

def shrink(rgba, s):
    """축소 — 알파 1px 팽창 후 LANCZOS, 문턱 96 (hero_sheet.shrink 요령: 얇은 창·밧줄이 사라지지 않게)"""
    if abs(s - 1.0) < 1e-6: return rgba
    e = edge_expand(rgba)
    a = ndi.binary_dilation(e[..., 3] > 0, np.ones((3, 3), bool))
    w = max(1, round(e.shape[1] * s)); h = max(1, round(e.shape[0] * s))
    rgb = Image.fromarray(e[..., :3]).resize((w, h), Image.LANCZOS)
    al = Image.fromarray((a * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    out = np.dstack([np.array(rgb), (np.array(al) >= 96) * 255]).astype(np.uint8)
    lab, n = ndi.label(out[..., 3] > 0)
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() <= 2: out[m] = 0          # 축소 뒤 떨어진 점
    ys, xs = np.where(out[..., 3] > 0)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# ── 4. 검사판 ─────────────────────────────────────────────────────────────────
def paste_rgba(dst, rgba, x, y, zoom=1):
    im = Image.fromarray(rgba)
    if zoom != 1: im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
    dst.alpha_composite(im, (int(x), int(y)))

def overlay_panel(bg_img, rgba, cx_r, by_r, crop, zoom, label):
    """배경 sect_bg 위에 그림을 자리(cx·by 그림 비율, 가로 중앙·아랫변)에 얹고 crop(x0,y0,x1,y1) 영역을 zoom 배 확대"""
    W, H = bg_img.size
    canvas = bg_img.convert('RGBA').copy()
    cx, by = cx_r * W, by_r * H
    x = round(cx - rgba.shape[1] / 2); y = round(by - rgba.shape[0])
    paste_rgba(canvas, rgba, x, y)
    x0, y0, x1, y1 = crop
    d = ImageDraw.Draw(canvas)
    if YARD_RECT: d.rectangle(YARD_RECT, outline=(0, 230, 230, 200))   # 배경의 맨땅 터(직사각) — 마름모 흙바닥과 겹쳐 보기 위해
    d.line([(x0, by), (x1, by)], fill=(255, 255, 0, 160))                  # 아랫변 자리 표시
    d.line([(cx, y0), (cx, y1)], fill=(255, 255, 0, 110))                  # 가로 중앙 표시
    tile = canvas.crop(crop).resize(((x1 - x0) * zoom, (y1 - y0) * zoom), Image.NEAREST)
    d = ImageDraw.Draw(tile); d.rectangle([0, 0, tile.width - 1, 15], fill=(0, 0, 0, 170)); d.text((3, 2), label, fill=(255, 255, 255, 255), font=font(11))
    return tile

def review_sheet(k, base, sheet, cells_rgba, dims, scale, out_path, ref, maxh=720):
    """k = 결과 이름(yard2 등), base = 참조 종류(yard — assets/hall_<base>_3·터·앵커)"""
    F = font(11); Z = 2; PAD = 8
    # (a) 칸별 그림 2배, 바닥색 위 나열 — 칸이 많으면(6칸 격자) maxh 를 넘을 때 옆 열로 넘긴다
    cols, col, y = [], [], PAD
    for i, r in enumerate(cells_rgba):
        hh = 16 + r.shape[0] * Z + PAD
        if col and y + hh > maxh: cols.append(col); col, y = [], PAD
        col.append((i, r, y)); y += hh
    cols.append(col)
    colw = [max(r.shape[1] for _, r, _ in c) * Z + PAD * 2 for c in cols]
    aw = sum(colw); ah = max(c[-1][2] + 16 + c[-1][1].shape[0] * Z + PAD for c in cols)
    a = Image.new('RGBA', (aw, ah), GROUND + (255,))
    d = ImageDraw.Draw(a); x = 0
    for c, w in zip(cols, colw):
        for i, r, yy in c:
            d.text((x + PAD, yy), 'cell %d  %dx%d' % (i, r.shape[1], r.shape[0]), fill=(255, 255, 255, 255), font=F)
            paste_rgba(a, r, x + PAD, yy + 16, Z)
        x += w
    # (b) 배경 위 되얹은 판 — 칸마다 + 기존 assets 그림. 잘라 보는 창은 앵커 cx 를 가운데 둔 폭 300, y 100~420
    panels = []
    if os.path.exists(BG_SHEET) and ref:
        bg = Image.open(BG_SHEET).convert('RGB')
        cxp = ref['cx'] * bg.width; byp = ref['by'] * bg.height
        x0 = int(min(max(0, cxp - 150), bg.width - 300)); y0 = int(min(max(0, byp - 255), bg.height - 320))   # 앵커 위 255·아래 65 (연무장 by 355 → y 100~420)
        crop = (x0, y0, x0 + 300, y0 + 320)
        for i, r in enumerate(cells_rgba):
            panels.append(overlay_panel(bg, r, ref['cx'], ref['by'], crop, Z, 'strip cell %d on sect_bg' % i))
        # 기존 차분 전각(정면 3/4) — 이름이 _0 으로 바뀐 것(장경각)이 있으면 그걸, 없으면 _3
        old = next((p for p in ('assets/hall_%s_0.png' % base, 'assets/hall_%s_3.png' % base) if os.path.exists(p)), None)
        if old:
            o = np.array(Image.open(old).convert('RGBA'))
            panels.append(overlay_panel(bg, o, ref['cx'], ref['by'], crop, Z, 'current %s (front 3/4)' % old[7:-4]))
    # (c) 스트립 원본 축소판 — 높이는 (b) 판에 맞춘다(가로 시트가 너무 커지지 않게)
    thumb = Image.fromarray(sheet.astype(np.uint8)).convert('RGBA')
    th = panels[0].height if panels else ah; tw = round(thumb.width * th / thumb.height)
    thumb = thumb.resize((tw, th), Image.LANCZOS)
    parts = [a] + panels + [thumb]
    W = sum(p.width for p in parts) + PAD * (len(parts) + 1); H = max(p.height for p in parts) + 40
    out = Image.new('RGBA', (W, H), (40, 40, 44, 255))
    d = ImageDraw.Draw(out)
    d.text((PAD, 6), '%s strip: scale %.3f (last cell -> ref w %s)  |  (a) cells x2 on ground  (b) on sect_bg x2, yellow = cx/by anchor  (c) source' % (k, scale, ref['w'] if ref else '-'), fill=(255, 255, 255, 255), font=F)
    x = PAD
    for p in parts:
        out.alpha_composite(p, (x, 30)); x += p.width + PAD
    out.convert('RGB').save(out_path)

# ── 주 흐름 ───────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('kind'); ap.add_argument('sheet')
    ap.add_argument('--ref-w', type=int, default=None, help='마지막 칸 그림 폭 기준(px). 없으면 review/hall_diff.json 의 <k>.4.w')
    ap.add_argument('--out', default='raw/hallstrip'); ap.add_argument('--n', type=int, default=3, help='줄이 없을 때 균등 분할 칸 수')
    ap.add_argument('--ref-kind', default=None, help='참조 종류(hall_diff·assets·터). 없으면 kind 의 끝 숫자를 뗀 것(yard2 → yard)')
    A = ap.parse_args()
    k = A.kind; base = A.ref_kind or k.rstrip('0123456789')
    global YARD_RECT; YARD_RECT = TERRAIN.get(base)
    im = np.array(Image.open(A.sheet).convert('RGB')).astype(int)
    H, W = im.shape[:2]
    cells, lab, sizes, strips, axis, line = find_cells(im, A.n)
    print('시트 %s %dx%d — %s 띠 %d개 %s, 칸 %d개 (줄 지운 뒤 덩어리 무게중심의 (띠, %s) 순)' % (
        A.sheet, W, H, '가로' if axis == 1 else '세로', len(strips), strips, len(cells), 'x' if axis == 1 else 'y'))
    raws = []
    for i, cell in enumerate(cells):
        c, fg, region = cell_from_labels(im, lab, sizes, cell['ids'])
        rgba, dropped = cell_rgba(c, fg)
        if rgba is None: print('  칸 %d: 그림 없음' % i); continue
        print('  칸 %d 띠 %d 덩어리 %d개 bbox %s → 그림 %dx%d' % (i, cell['strip'], len(cell['ids']), region, rgba.shape[1], rgba.shape[0]))
        for area, bbox, why in dropped: print('      버림: 면적 %d bbox %s — %s' % (area, bbox, why))
        raws.append(rgba)
    # 칸에 안 든 덩어리(띠 밖·점 잡음) 보고
    used = set(i for cell in cells for i in cell['ids'])
    for i in range(1, len(sizes) + 1):
        if i in used or sizes[i - 1] < 8: continue
        ys, xs = np.where(lab == i)
        print('  칸 밖 덩어리 버림: 면적 %d bbox (%d,%d,%d,%d)' % (sizes[i - 1], xs.min(), ys.min(), xs.max(), ys.max()))
    ref = None
    if os.path.exists(DIFF_JSON):
        d = json.load(open(DIFF_JSON)).get(base, {})
        ref = d.get('3') or (d[max(d, key=int)] if d else None)      # 단계 키가 바뀌어도(4→3→…) 가장 높은 단계의 차분 폭을 쓴다
    if ref is None and base in ANCHOR: ref = dict(ANCHOR[base], w=None)   # 차분 없는 전각(산문) — 앵커만, 폭은 --ref-w
    ref_w = A.ref_w or (ref and ref['w'])
    if not ref_w: sys.exit('--ref-w 를 주거나 review/hall_diff.json 에 %s.3.w 가 있어야 한다' % base)
    if ref: ref = dict(ref, w=ref_w)                                  # 검사판 제목에 실제 기준 폭(--ref-w 우선)을 찍는다
    s = ref_w / raws[-1].shape[1]
    print('배율 s = %d / %d = %.4f (모든 칸 공통)' % (ref_w, raws[-1].shape[1], s))
    os.makedirs(A.out, exist_ok=True)
    outs, dims = [], {}
    for i, r in enumerate(raws):
        sm = shrink(r, s); outs.append(sm)
        p = os.path.join(A.out, 'hall_%s_%d.png' % (k, i))
        Image.fromarray(sm).save(p)
        dims[i] = {'w': int(sm.shape[1]), 'h': int(sm.shape[0])}
        print('  → %s %dx%d' % (p, sm.shape[1], sm.shape[0]))
    json.dump(dims, open(os.path.join(A.out, 'hall_%s.json' % k), 'w'), indent=1)
    os.makedirs('review', exist_ok=True)
    rp = 'review/hallstrip_%s.png' % k
    review_sheet(k, base, im, outs, dims, s, rp, ref)
    print('검사판 %s' % rp)

if __name__ == '__main__':
    main()
