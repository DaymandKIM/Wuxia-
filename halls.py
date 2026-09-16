"""문파 전각 시트 추출 (v2.92.2) — sheets/halls.png (사용자 제미나이, 5줄 × 3칸: 터·초가·기와) → assets/hall_<k>_<s>.png
+ 패널 아이콘 hall_<k>.png(기와 축소). 검사판 review/halls.png (게임 바닥색·주인공 키 47px 자 포함).
규칙 0: 눈검사 받은 뒤 반영. 워터마크(산문 칸 우상단 별)는 '땅에 안 닿은 작은 조각' 규칙으로 버린다.
"""
import sys, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

SHEET = 'sheets/halls.png'
KINDS = ['yard', 'library', 'clinic', 'guest', 'gate']
TARGET_H = 60             # 기와 최대 높이(px, 게임 단위)
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

def main():
    im, rows, cols = load()
    assert len(rows) >= 6 and len(cols) >= 4, (rows, cols)
    cells = {}
    for ri in range(5):
        y0, y1 = rows[ri][1] + 1, rows[ri + 1][0]
        for ci in range(3):
            x0, x1 = cols[ci][1] + 1, cols[ci + 1][0]
            cells[(ri, ci)] = cell_rgba(im, y0, y1, x0, x1)
    hmax = max(c.shape[0] for c in cells.values() if c is not None)
    wmax = max(c.shape[1] for c in cells.values() if c is not None)
    s = min(TARGET_H / hmax, TARGET_W / wmax)
    specs = {}
    tiles = {}
    for (ri, ci), c in cells.items():
        if c is None: continue
        t = shrink(c, s)
        k = KINDS[ri]
        t.save(f'assets/hall_{k}_{ci}.png')
        tiles[(ri, ci)] = t
        specs[f'{k}_{ci}'] = [t.width, t.height]
        if ci == 2:                                  # 패널 아이콘 = 기와를 44px 안에
            ic = t.copy(); ic.thumbnail((44, 44), Image.LANCZOS); ic.save(f'assets/hall_{k}.png')
    json.dump({'scale': s, 'src_hmax': hmax, 'src_wmax': wmax, 'specs': specs}, open('review/hall_specs.json', 'w'), ensure_ascii=False, indent=1)
    # 검사판 — 게임 바닥색, 3배 확대, 주인공 키 자
    S = 3; cw = max(t.width for t in tiles.values()) * S + 12; ch = (max(t.height for t in tiles.values()) + 24) * S
    board = Image.new('RGB', (cw * 3 + 80, ch * 5 + 20), GROUND)
    d = ImageDraw.Draw(board)
    for (ri, ci), t in tiles.items():
        x = 80 + ci * cw + (cw - t.width * S) // 2; y = 20 + ri * ch + ch - 12 * S - t.height * S
        board.paste(t.resize((t.width * S, t.height * S), Image.NEAREST), (x, y), t.resize((t.width * S, t.height * S), Image.NEAREST))
        d.line([(80 + ci * cw, 20 + ri * ch + ch - 12 * S), (80 + (ci + 1) * cw, 20 + ri * ch + ch - 12 * S)], fill=(70, 80, 50))
        d.text((x, y - 12), f'{KINDS[ri]}_{ci} {t.width}x{t.height}', fill=(240, 240, 240))
    for ri in range(5):
        y = 20 + ri * ch + ch - 12 * S
        d.rectangle([10, y - 47 * S, 24, y], outline=(255, 230, 120)); d.text((6, y - 47 * S - 12), '키47', fill=(255, 230, 120))
    board.save('review/halls.png')
    print('scale', round(s, 3), 'hmax', hmax, specs)

if __name__ == '__main__':
    main()
