"""상승 무공 메달 8종 시트(sheets/art_hq8.png, 마젠타 배경 2줄x4칸) → assets/art_<이름>.png (96x96 팔레트 PNG)  v2.95.4

    python arthq8.py

규격은 기존 메달(assets/art_pagong.png 96x96 P)에 맞춘다 — **원형 문양이 96 을 꽉 채우고 네 모서리만 투명**이다
(art_pagong 은 여백 0 · 투명 픽셀 1992 = 96 원 바깥 넓이). 여백을 주면 무공 탭·스킬창에서 새 메달만 작아 보인다.
칸 안은 마젠타가 아닌 픽셀 전부(빛무리·광선 포함, 20px 미만 티끌만 버림) — eqicons 의 '최대 덩어리 50%' 규칙은
광선이 따로 떨어진 이 시트에선 문양을 갉아먹는다.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

R = os.path.dirname(os.path.abspath(__file__))
NAMES = ['geumgang', 'taegeukhwan', 'pyomae', 'geumjeong', 'chwibo', 'bichim', 'mayeom', 'jukyeop']
ROWS, COLS, FILL = 2, 4, 96
INSET = 12        # 칸마다 5~7px 안쪽에 어두운 테두리 액자가 그려져 있다 — 안 걷으면 그 액자가 bbox 가 돼 문양이 찌그러진다

def main():
    sh = np.array(Image.open(os.path.join(R, 'sheets', 'art_hq8.png')).convert('RGB')).astype(int)
    H, W = sh.shape[:2]
    r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)
    out = []
    for i, nm in enumerate(NAMES):
        cy, cx = i // COLS, i % COLS
        y0, y1 = int(round(cy * H / ROWS)), int(round((cy + 1) * H / ROWS))
        x0, x1 = int(round(cx * W / COLS)), int(round((cx + 1) * W / COLS))
        y0 += INSET; y1 -= INSET; x0 += INSET; x1 -= INSET
        m = ~bg[y0:y1, x0:x1]
        lab, n = ndimage.label(m, structure=np.ones((3, 3)))
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = np.isin(lab, [j + 1 for j, s in enumerate(sizes) if s >= 20])
        ys, xs = np.where(keep)
        sub = sh[y0:y1, x0:x1]
        crop = np.zeros((ys.max() - ys.min() + 1, xs.max() - xs.min() + 1, 4), np.uint8)
        crop[..., :3] = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        crop[..., 3] = keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255
        # 마젠타 물든 가장자리 색만 걷어낸다(지우지 않는다 — CLAUDE.md "얇은 것은 통째로 배경색에 물든다")
        al = crop[..., 3] > 0
        rim = al & ~ndimage.binary_erosion(al, iterations=2)
        r2, g2, b2 = (crop[..., k].astype(int) for k in range(3))
        t = rim & (r2 > g2 + 12) & (b2 > g2 + 12)
        crop[..., 0][t] = np.minimum(r2[t], g2[t] + 14); crop[..., 2][t] = np.minimum(b2[t], g2[t] + 14)
        ci = Image.fromarray(crop); s = FILL / max(ci.size)
        sm = ci.resize((max(1, round(ci.width * s)), max(1, round(ci.height * s))), Image.LANCZOS)
        a2 = np.array(sm); a2 = np.dstack([a2[..., :3], (a2[..., 3] >= 96) * 255]).astype(np.uint8); sm = Image.fromarray(a2)
        icon = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); icon.paste(sm, ((96 - sm.width) // 2, (96 - sm.height) // 2), sm)
        # 네모 타일로 그려진 칸(비침: 원형 문양 + 짙은 청록 네모 바탕)은 원형 슬롯에서 혼자 사각으로 보인다.
        # 투명 비율이 10% 미만이면(다른 일곱은 20%↑) 반지름 48 원으로 깎는다 — 문양이 아니라 바탕 모서리만 잘린다.
        ia = np.array(icon)
        if (ia[..., 3] == 0).mean() < 0.10:
            yy, xx = np.mgrid[0:96, 0:96]
            ia[((yy - 47.5) ** 2 + (xx - 47.5) ** 2) > 48 ** 2] = 0
            icon = Image.fromarray(ia); print('    (네모 바탕 → 원형 마스크)')
        q = icon.convert('RGBA'); alpha = np.array(q)[..., 3] > 0
        quant = q.convert('RGB').quantize(colors=127, method=2, dither=Image.NONE)
        palette = list(quant.getpalette()[:381]) + [255, 0, 255]
        arr = np.array(quant, dtype=np.uint8); arr[~alpha] = 127
        pal = Image.fromarray(arr, 'P'); pal.putpalette(palette + [0] * (768 - len(palette)))
        p = os.path.join(R, 'assets', 'art_%s.png' % nm)
        pal.save(p, transparency=127, optimize=True); out.append(icon)
        print('  art_%-12s 원본 %sx%s → %s, 투명 %d px' % (nm, ci.width, ci.height, sm.size, int((~alpha).sum())))
    S = 3
    board = Image.new('RGB', (len(out) * (96 * S + 8) + 8, 96 * S + 28), (14, 19, 25))
    from PIL import ImageDraw
    d = ImageDraw.Draw(board)
    for i, ic in enumerate(out):
        big = ic.resize((96 * S, 96 * S), Image.NEAREST); x = 8 + i * (96 * S + 8)
        board.paste(big, (x, 24), big); d.text((x, 6), NAMES[i], fill=(230, 230, 230))
    p = os.path.join(R, 'review', 'art_hq8.png'); board.save(p); print('검사판 →', p)

if __name__ == '__main__':
    main()
