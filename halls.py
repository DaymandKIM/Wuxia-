"""문파 전각 시트 추출 (v2.92.2) — sheets/halls.png (사용자 제미나이, 5줄 × 3칸: 터·초가·기와) → assets/hall_<k>_<s>.png
+ 패널 아이콘 hall_<k>.png(기와 축소). 검사판 review/halls.png (게임 바닥색·주인공 키 47px 자 포함).
규칙 0: 눈검사 받은 뒤 반영. 워터마크(산문 칸 우상단 별)는 '땅에 안 닿은 작은 조각' 규칙으로 버린다.
"""
import sys, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

SHEET = 'sheets/halls.png'
KINDS = ['yard', 'library', 'clinic', 'guest', 'gate']
TARGET_H = 110            # 최대 높이(px) — 장경각 탑(3층)이 가장 높다. 대전은 54쯤(주인공 키 47보다 조금 큼)
TARGET_W = 165            # 최대 폭 — 화면 390에 뒷줄 2·가운데 1·앞줄 2로 서야 한다 (첫 안 높이 118은 폭 355로 화면을 넘겼다)
GROUND = (106, 122, 82)

def load():
    im = np.array(Image.open(SHEET).convert('RGB')).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    dark = (r + g + b < 180)
    rows = [i for i, v in enumerate(dark.mean(1)) if v > 0.6]
    cols = [i for i, v in enumerate(dark.mean(0)) if v > 0.6]
    def groups(idx):
        out = []
        for i in idx:
            if out and i - out[-1][-1] <= 2: out[-1].append(i)
            else: out.append([i])
        return [(g[0], g[-1]) for g in out]
    return im, groups(rows), groups(cols)

def cell_rgba(im, y0, y1, x0, x1):
    c = im[y0:y1, x0:x1]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # 배경 = 자줏빛(마젠타): r·b가 g보다 확실히 크다. 어두운 마젠타(테두리 번짐)도 포함
    bg = (r - g > 60) & (b - g > 60)
    fg = ~bg
    # 덩어리 라벨링 — 땅(칸 바닥)에 닿은 것만. 작은 부유 조각(워터마크)은 버린다
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    keep = np.zeros_like(fg)
    H = fg.shape[0]
    bottoms = [np.where(lab == i)[0].max() for i in range(1, n + 1)]
    ground = max(bottoms) if bottoms else H
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 40: continue
        if ys.max() < ground - 28 and len(ys) < 900: continue     # 떠 있는 작은 것 = 워터마크·파편
        keep[lab == i] = True
    # 마젠타 성분 걷기 — 가장자리에 밴 자주끼(r·b를 g 쪽으로)
    out = np.zeros((c.shape[0], c.shape[1], 4), np.uint8)
    rr, gg, bb = r.copy(), g.copy(), b.copy()
    # 자주끼 판정: r·b가 g보다 25 넘게 크면(진짜 갈색은 b<g, 붉은 기둥은 b-g<0, 청회색 기와는 b-g<25) 마젠타가 밴 것 — 말뚝·밧줄처럼 얇은 것이 통째로 분홍이었다
    tint = keep & (r - g > 25) & (b - g > 25)
    rr[tint] = np.minimum(rr[tint], gg[tint] + 30); bb[tint] = np.minimum(bb[tint], gg[tint] + 12)
    out[..., 0] = np.clip(rr, 0, 255); out[..., 1] = np.clip(gg, 0, 255); out[..., 2] = np.clip(bb, 0, 255); out[..., 3] = keep * 255
    ys, xs = np.where(keep)
    if not len(ys): return None
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def shrink(rgba, s):
    """축소 — 얇은 선이 사라지지 않게 알파는 따로 줄여 문턱, 색은 알파로 가중"""
    im = Image.fromarray(rgba)
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    a = im.getchannel('A').resize((w, h), Image.LANCZOS)
    # 색은 투명 픽셀이 섞이지 않게 가장자리를 바깥으로 번지게 한 뒤 줄인다
    arr = np.array(im).astype(float)
    alpha = arr[..., 3:4] / 255.0
    rgb = arr[..., :3] * alpha
    for _ in range(3):
        pad = ndi.maximum_filter(rgb, size=(3, 3, 1)); pa = ndi.maximum_filter(alpha, size=(3, 3, 1))
        m = alpha < 0.01
        rgb[m[..., 0]] = pad[m[..., 0]]; alpha[m] = pa[m]
    col = Image.fromarray(np.clip(rgb / np.maximum(alpha, 1e-3), 0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    an = np.array(a); an = np.where(an >= 96, 255, 0).astype(np.uint8)
    out = np.dstack([np.array(col), an])
    ys, xs = np.where(an > 0)
    return Image.fromarray(out[ys.min():ys.max() + 1, xs.min():xs.max() + 1])

# 시트 2판(v2.92.3): 5줄 × 4칸 — 제미나이가 기와를 두 판 그렸고, 칸 경계가 줄마다 어긋나며(464/484·700/722/854) 탑은 2·3줄에 걸쳐 있다.
# 그래서 격자 자르기를 버리고 **덩어리 라벨링**: 테두리 줄(긴 직선 어두운 픽셀)만 지운 뒤 마젠타 아닌 덩어리를 라벨링해 무게중심이 든 칸 영역으로 배정한다.
LAYOUT = {   # 종류 → 단계별 (줄 범위, 칸 index)
  'yard':    [((0, 0), 0), ((0, 0), 1), ((0, 0), 3)],
  'library': [((1, 1), 0), ((1, 1), 1), ((1, 2), 2)],
  'clinic':  [((2, 2), 0), ((2, 2), 1), ((2, 2), 3)],
  'guest':   [((3, 3), 0), ((3, 3), 1), ((3, 3), 3)],
  'gate':    [((4, 4), 0), ((4, 4), 1), ((4, 4), 3)],
}
COLX = [2, 232, 470, 715, 1021]   # 대략의 칸 x 경계(무게중심 배정용 — 정확할 필요 없다)

BORDER_X = [2, 232, 464, 484, 700, 722, 854, 1021]   # 이 시트의 세로 테두리 후보(줄마다 어긋난다) — 후보 ±6px 안의 어두운 세로 줄만 지운다
def line_mask(im, dark, rows):
    """테두리 줄: 가로는 rows(전체 폭 검출), 세로는 줄 띠마다 후보 근처에서 60% 이상 어두운 열"""
    H, W = dark.shape
    m = np.zeros_like(dark)
    for (a, b) in rows: m[max(0, a - 1):b + 2, :] = dark[max(0, a - 1):b + 2, :]
    for rr in range(len(rows) - 1):
        y0, y1 = rows[rr][1] + 1, rows[rr + 1][0]
        frac = dark[y0:y1].mean(0)
        for x in range(W):
            if frac[x] >= 0.6 and any(abs(x - bx) <= 6 for bx in BORDER_X): m[y0:y1, x] = dark[y0:y1, x]
    return m

def seal_seams(rgba):
    """테두리 줄을 지운 자리(1~3px 가로 홈)를 위아래로 메운다 — 탑처럼 줄에 걸친 그림"""
    a = rgba[..., 3] > 0
    closed = ndi.binary_closing(a, structure=np.ones((5, 1)))
    holes = closed & ~a
    if not holes.any(): return rgba
    out = rgba.copy()
    ys, xs = np.where(holes)
    for y, x in zip(ys, xs):
        up = y - 1
        while up >= 0 and not a[up, x]: up -= 1
        dn = y + 1
        while dn < a.shape[0] and not a[dn, x]: dn += 1
        if up >= 0 and dn < a.shape[0]:
            out[y, x, :3] = (rgba[up, x, :3].astype(int) + rgba[dn, x, :3].astype(int)) // 2; out[y, x, 3] = 255
    return out

def main():
    im, rows, _ = load()
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    bg = (r - g > 60) & (b - g > 60)
    dark = (r + g + b < 180)
    lines = line_mask(im, dark, rows)
    fg = ~bg & ~lines
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    objs = ndi.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs, 1):
        ys, xs = np.where(lab[sl] == i)
        if len(ys) < 40: continue
        cy, cx = ys.mean() + sl[0].start, xs.mean() + sl[1].start
        bh, bw = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if bh > 300 or bw > 500: continue                       # 남은 테두리 줄 조각
        if bw <= 5 and bh >= 30: continue                        # 얇고 긴 세로 조각 = 자주색 테두리 잔재(초가 왼쪽에 붙어 왔다)
        comps.append({ 'i': i, 'cy': cy, 'cx': cx, 'n': len(ys), 'bot': ys.max() + sl[0].start })
    def rowband(rr): return rows[rr][1] + 1, rows[rr + 1][0]
    cells = {}
    for k, stages in LAYOUT.items():
        for st, ((r0, r1), ci) in enumerate(stages):
            y0, y1 = rowband(r0)[0], rowband(r1)[1]
            x0, x1 = COLX[ci], COLX[ci + 1]
            mine = [c for c in comps if y0 <= c['cy'] < y1 and x0 <= c['cx'] < x1]
            if not mine: cells[(k, st)] = None; continue
            ground = max(c['bot'] for c in mine)
            mine = [c for c in mine if not (c['bot'] < ground - 28 and c['n'] < 900)]   # 떠 있는 작은 것(워터마크·파편) 버림
            mask = np.zeros(fg.shape, bool)
            for c in mine: mask |= (lab == c['i'])
            ys, xs = np.where(mask)
            by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            sub = im[by0:by1, bx0:bx1]; sm = mask[by0:by1, bx0:bx1]
            rr, gg, bb = sub[..., 0].copy(), sub[..., 1].copy(), sub[..., 2].copy()
            tint = sm & (rr - gg > 25) & (bb - gg > 25)
            rr[tint] = np.minimum(rr[tint], gg[tint] + 30); bb[tint] = np.minimum(bb[tint], np.maximum(gg[tint] - 8, 0))   # 분홍 밧줄 → 갈색(b<g)
            out = np.dstack([np.clip(rr, 0, 255), np.clip(gg, 0, 255), np.clip(bb, 0, 255), sm * 255]).astype(np.uint8)
            cells[(k, st)] = seal_seams(out)
    hmax = max(c.shape[0] for c in cells.values() if c is not None)
    wmax = max(c.shape[1] for c in cells.values() if c is not None)
    s = min(TARGET_H / hmax, TARGET_W / wmax)
    tiles, specs = {}, {}
    for (k, st), c in cells.items():
        if c is None: print('빈 칸', k, st); continue
        t = shrink(c, s)
        t.save(f'assets/hall_{k}_{st}.png'); tiles[(k, st)] = t; specs[f'{k}_{st}'] = [t.width, t.height]
        if st == 2:
            ic = t.copy(); ic.thumbnail((44, 44), Image.LANCZOS); ic.save(f'assets/hall_{k}.png')
    json.dump({'scale': s, 'src_hmax': hmax, 'src_wmax': wmax, 'specs': specs}, open('review/hall_specs.json', 'w'), ensure_ascii=False, indent=1)
    S = 3; cw = max(t.width for t in tiles.values()) * S + 12; ch = (max(t.height for t in tiles.values()) + 24) * S
    board = Image.new('RGB', (cw * 3 + 80, ch * 5 + 20), GROUND)
    d = ImageDraw.Draw(board)
    for ri, k in enumerate(KINDS):
        gy = 20 + ri * ch + ch - 12 * S
        for st in range(3):
            t = tiles.get((k, st))
            if t is None: continue
            x = 80 + st * cw + (cw - t.width * S) // 2; y = gy - t.height * S
            big = t.resize((t.width * S, t.height * S), Image.NEAREST); board.paste(big, (x, y), big)
            d.text((x, y - 12), f'{k}_{st} {t.width}x{t.height}', fill=(240, 240, 240))
        d.line([(80, gy), (80 + 3 * cw, gy)], fill=(70, 80, 50))
        d.rectangle([10, gy - 47 * S, 24, gy], outline=(255, 230, 120)); d.text((6, gy - 47 * S - 12), '키47', fill=(255, 230, 120))
    board.save('review/halls.png')
    print('scale', round(s, 3), 'hmax', hmax, 'wmax', wmax, specs)

if __name__ == '__main__':
    main()
