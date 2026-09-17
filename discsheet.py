"""문파 마당 제자 시트(sheets/disciple2.png, 1줄 걷기 8칸 · 2줄 수련 8칸) → assets/disciple_walk0~5 · disciple_train0~5  v2.95.4

    python discsheet.py

- 칸은 균등 8칸(빈 세로줄로 확인). 줄 경계는 y 207~221 의 빈 띠.
- 배율은 '몸'(가로 12px 이상 차는 줄) 높이를 body_h(기본 44 — 주인공 47보다 조금 작은 마당 제자)로 맞춘다.
- 8칸 중 6칸을 다리 IoU 로 골라 사이클을 만든다(sr_sheet.pick_walk 와 같은 방식, n=6).
- 12컷을 한 캔버스 규격으로 묶는다(foesheet.pack) — 렌더가 fw 를 고정으로 쓰기 때문.
- 도복이 회색이라 69b-sect tintedStrip 이 계보색으로 물들인다: 물드는 조건은 '채도(max-min) < 52 · 밝기 110~236 · r>=b'.
  살·머리·신발이 그 조건에 들어가면 같이 물드니 추출 뒤 색을 재서 보고한다.
"""
import os, sys, itertools
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from foesheet import pack, R
from sr_sheet import finish, shrink, body_height, legmask, iou, GROUND

ROWB = [(2, 207), (218, 413)]     # 줄마다 (y0, y1)
COLS = 8

def pick_cycle(frames, n=6):
    keys = list(frames); ms = [legmask(frames[k]) for k in keys]
    best = None
    for comb in itertools.combinations(range(len(keys)), n):
        adj = [iou(ms[comb[i]], ms[comb[(i + 1) % n]]) for i in range(n)]
        if max(adj) > 0.93: continue
        score = -np.mean(adj) + 0.5 * min(adj)
        if best is None or score > best[0]: best = (score, comb, adj)
    if best is None: return keys[:n], []
    return [keys[i] for i in best[1]], best[2]

def main():
    body_h = int([a.split('=')[1] for a in sys.argv[1:] if a.startswith('--body=')] [0]) if any(a.startswith('--body=') for a in sys.argv[1:]) else 44
    sh = np.array(Image.open(os.path.join(R, 'sheets', 'disciple2.png')).convert('RGB')).astype(int)
    H, W = sh.shape[:2]
    r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)
    raw = {}
    for ri, (y0, y1) in enumerate(ROWB):
        for cx in range(COLS):
            x0, x1 = int(round(cx * W / COLS)) + 3, int(round((cx + 1) * W / COLS)) - 3
            sub = sh[y0:y1, x0:x1].copy(); m = ~bg[y0:y1, x0:x1]
            a = finish(sub, m)
            if (a[..., 3] > 0).sum() < 40: print(' %d줄 %d칸 빈 칸' % (ri, cx)); continue
            raw['r%dc%d' % (ri, cx)] = a
    ref = raw['r0c0']; scale = body_h / body_height(ref, 12)
    print('기준 r0c0 몸높이 %d → 배율 %.3f' % (body_height(ref, 12), scale))
    small = {k: shrink(v, scale) for k, v in raw.items()}
    out = {}
    for ri, nm in ((0, 'walk'), (1, 'train')):
        pool = {k: v for k, v in small.items() if k.startswith('r%dc' % ri)}
        ks, adj = pick_cycle(pool, 6)
        print('%s 사이클' % nm, ks, '이웃 IoU', ['%.2f' % v for v in adj])
        for i, k in enumerate(ks): out['%s%d' % (nm, i)] = pool[k]
    for f in [p for p in os.listdir(os.path.join(R, 'assets')) if p.startswith('disciple_')]:
        os.remove(os.path.join(R, 'assets', f))
    CW, CH = pack(out, 'disciple')
    for k, a in out.items():
        ys, xs = np.where(a[..., 3] > 0)
        print('  %-8s 그림 %2dx%-3d (몸 높이 %d)' % (k, xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min(), body_height(a, 6)))
    # 검사판 — 게임 바닥색 + 흰 배경 두 벌
    names = list(out)
    for tag, bgc in (('review-disciple', GROUND), ('blackcheck_disciple', (245, 245, 245))):
        S = 5
        c = Image.new('RGB', (6 * (CW * S + 8) + 8, 2 * (CH * S + 22) + 8), bgc); d = ImageDraw.Draw(c)
        for i, n2 in enumerate(names):
            im = Image.open(os.path.join(R, 'assets', 'disciple_%s.png' % n2))
            big = im.resize((CW * S, CH * S), Image.NEAREST)
            x = 8 + (i % 6) * (CW * S + 8); y = 8 + (i // 6) * (CH * S + 22)
            c.paste(big, (x, y + 20), big); d.text((x, y + 2), n2, fill=(255, 255, 255) if tag[0] == 'r' else (0, 0, 0))
        p = os.path.join(R, 'review', '%s.png' % tag); c.save(p); print('검사판 →', p)

if __name__ == '__main__':
    main()
