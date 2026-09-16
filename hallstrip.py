"""문파 전각 단계 스트립 추출 검사판 (v2.93 준비) — sheets/hall_<k>_strip.png (사용자 제미나이, 세로 3칸 또는 가로 1줄×N칸, 마젠타 배경)
→ raw/hallstrip/hall_<k>_<i>.png (배경 sect_bg 원본 배율 그대로) + hall_<k>.json + 검사판 review/hallstrip_<k>.png.
**assets 에는 쓰지 않는다** — 규칙 0: 눈검사 받은 뒤에야 반영. 시점(아이소메트릭 vs 정면 3/4)이 배경과 어긋나는지 보는 게 목적.

사용법: python hallstrip.py <k> <sheets/그림.png> [--ref-w N] [--out raw/hallstrip] [--n 3]
  --ref-w 없으면 review/hall_diff.json 의 <k>.4.w(마지막 단계 폭)를 기준으로 마지막 칸 폭이 그 값이 되게 배율을 정해 모든 칸에 같은 배율.
"""
import sys, os, json, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

GROUND = (106, 122, 82)             # 게임 바닥색 — 흰 배경은 도복·베이지가 비치는 구멍을 못 보여 준다
BG_SHEET = 'sheets/sect_bg.png'
DIFF_JSON = 'review/hall_diff.json'
YARD_RECT = None                    # 검사판(b)에 덧그릴 배경 터 직사각 (x0,y0,x1,y1) — main 에서 종류별로 채운다
TERRAIN = {'yard': (64, 213, 192, 308)}   # sect_bg 맨땅 터 자리(sectbg.py 가 잰 것). 다른 종류는 잰 뒤 더한다

def font(sz=11, bold=True):
    try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else ''), sz)
    except Exception: return ImageFont.load_default()

# ── 1. 칸 나누기 ─────────────────────────────────────────────────────────────
def dark_bands(im, axis):
    """어두운(r+g+b<180) 픽셀 비율 60% 넘는 줄들을 띠로 묶는다. axis=1 → 가로 줄(행), axis=0 → 세로 줄(열)"""
    dark = im.sum(2) < 180
    ratio = dark.mean(axis)
    idx = [i for i, v in enumerate(ratio) if v > 0.6]
    bands = []
    for i in idx:
        if bands and i - bands[-1][1] <= 2: bands[-1][1] = i
        else: bands.append([i, i])
    return [tuple(b) for b in bands]

def split_cells(im, n_default):
    """반환 (방향, [(a0, a1), ...], 띠 목록). 방향 'v' = 세로로 쌓인 칸(가로 줄로 나뉨), 'h' = 가로로 늘어선 칸"""
    H, W = im.shape[:2]
    for axis, L, name in ((1, H, 'v'), (0, W, 'h')):
        bands = dark_bands(im, axis)
        # 가장자리에 붙은 얇은 띠(액자 테두리)는 경계로 쓰되 칸(20px 미만)을 만들진 않는다
        cells, cur = [], 0
        for band in bands + [(L, L)]:
            a0, a1 = cur, band[0]
            if a1 - a0 >= 20: cells.append((a0, a1))
            cur = band[1] + 1
        if bands and len(cells) >= 2: return name, cells, bands
    # 줄이 없으면 세로 균등 분할
    step = H / n_default
    return 'v', [(int(round(i * step)), int(round((i + 1) * step))) for i in range(n_default)], []

# ── 2. 배경 판정·덩어리 고르기 ───────────────────────────────────────────────
def bg_mask(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # 마젠타 계열 — 색상 조건. 어두운 자주(테두리 잔재·그림자)도 같은 조건에 들어온다
    return ((r > g + 40) & (b > g + 40)) | ((np.abs(r - b) < 60) & (g < r - 40) & (g < b - 40))

def pick_figure(c, near=12, tiny=80, far=20):
    """배경 아닌 덩어리 중 최대 덩어리 + 그 bbox 주변 near px 안의 조각. 작은 조각(면적<tiny)이 최대 덩어리에서 far px 넘게 떨어졌으면 버린다.
    반환 (keep 마스크, 버린 조각 목록[(면적, bbox, 이유)])"""
    fg = ~bg_mask(c)
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
        if not inside: dropped.append((area, bbox, 'bbox+%dpx 밖' % near)); continue
        if area < tiny and dist[m].min() > far: dropped.append((area, bbox, '작은 부유 조각(>%dpx)' % far)); continue
        keep |= m
    return keep, dropped

def cell_rgba(c):
    """칸 → RGBA(그림 bbox로 크롭). 알파는 마스크 1px 팽창(검은 외곽선 보호 — 단 순마젠타로는 안 번지게), 마젠타 성분은 지우지 않고 걷어낸다"""
    keep, dropped = pick_figure(c)
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

def review_sheet(k, sheet, cells_rgba, dims, scale, out_path, ref):
    F = font(11); Z = 2; PAD = 8
    # (a) 칸별 그림 2배, 바닥색 위 세로 나열
    aw = max(r.shape[1] for r in cells_rgba) * Z + PAD * 2
    ah = sum(r.shape[0] * Z + 18 + PAD for r in cells_rgba) + PAD
    a = Image.new('RGBA', (aw, ah), GROUND + (255,))
    d = ImageDraw.Draw(a); y = PAD
    for i, r in enumerate(cells_rgba):
        d.text((PAD, y), 'cell %d  %dx%d' % (i, r.shape[1], r.shape[0]), fill=(255, 255, 255, 255), font=F); y += 16
        paste_rgba(a, r, PAD, y, Z); y += r.shape[0] * Z + PAD
    # (b) 배경 위 되얹은 판 — 칸마다 + 기존 assets 그림
    panels = []
    if os.path.exists(BG_SHEET) and ref:
        bg = Image.open(BG_SHEET).convert('RGB')
        crop = (0, 100, 300, 420)
        for i, r in enumerate(cells_rgba):
            panels.append(overlay_panel(bg, r, ref['cx'], ref['by'], crop, Z, 'strip cell %d on sect_bg' % i))
        old = 'assets/hall_%s_3.png' % k
        if os.path.exists(old):
            o = np.array(Image.open(old).convert('RGBA'))
            panels.append(overlay_panel(bg, o, ref['cx'], ref['by'], crop, Z, 'current assets/hall_%s_3 (front 3/4)' % k))
    # (c) 스트립 원본 축소판
    thumb = Image.fromarray(sheet.astype(np.uint8)).convert('RGBA')
    th = ah; tw = round(thumb.width * th / thumb.height)
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
    A = ap.parse_args()
    k = A.kind
    global YARD_RECT; YARD_RECT = TERRAIN.get(k)
    im = np.array(Image.open(A.sheet).convert('RGB')).astype(int)
    H, W = im.shape[:2]
    orient, cells, bands = split_cells(im, A.n)
    print('시트 %s %dx%d — %s 칸 %d개, 줄 띠 %s' % (A.sheet, W, H, '세로' if orient == 'v' else '가로', len(cells), bands or '없음(균등 분할)'))
    raws = []
    for i, (a0, a1) in enumerate(cells):
        c = im[a0:a1, :] if orient == 'v' else im[:, a0:a1]
        rgba, dropped = cell_rgba(c)
        if rgba is None: print('  칸 %d: 그림 없음' % i); continue
        ys, xs = np.where(rgba[..., 3] > 0)
        print('  칸 %d 범위 %d~%d → 그림 %dx%d' % (i, a0, a1, rgba.shape[1], rgba.shape[0]))
        for area, bbox, why in dropped: print('      버림: 면적 %d bbox %s — %s' % (area, bbox, why))
        raws.append(rgba)
    ref = None
    if os.path.exists(DIFF_JSON):
        ref = json.load(open(DIFF_JSON)).get(k, {}).get('3')
    ref_w = A.ref_w or (ref and ref['w'])
    if not ref_w: sys.exit('--ref-w 를 주거나 review/hall_diff.json 에 %s.4.w 가 있어야 한다' % k)
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
    review_sheet(k, im, outs, dims, s, rp, ref)
    print('검사판 %s' % rp)

if __name__ == '__main__':
    main()
