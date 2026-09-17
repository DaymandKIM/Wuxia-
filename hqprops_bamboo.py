"""청죽문 본진 소품 추출 — 시트 격자가 줄마다 다르다(윗줄 5칸·아랫줄 4칸).

hqprops.py 의 마젠타 제거·워터마크 제거·tight bbox·팔레트 저장을 그대로 쓰고,
칸 검출만 '줄 띠 안에서 세로 줄을 따로 검출'하도록 바꿨다.
9칸 중 바구니가 둘이라 하나(--skip)를 버리고 0..7 로 번호를 다시 매긴다.

사용: python hqprops_bamboo.py [--skip=5] [--dry]   (--dry 면 scratchpad 에만)
"""
from PIL import Image
import numpy as np, os, sys
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, R)
from hqprops import grid, dewatermark, savepal

HERE = os.path.dirname(os.path.abspath(__file__))
ROWCOLS = [5, 4]          # 줄별 칸 수
LABEL = ['자른 대나무 묶음', '봉 거치대', '짚 인형', '대통 물받이', '바구니(윗줄)',
         '바구니(아랫줄)', '이끼 낀 바위', '대나무 울타리', '댓잎 더미']


def drop_wm_frag(img, minpx=300):
    """워터마크 칸에서 ✦ 에 물든 **떨어진 작은 조각**을 버리고 다시 tight crop.
    ✦ 는 오른쪽 아래에 찍히므로 그 사분면의 작은 덩어리만 본다(본체는 안 건드린다)."""
    a = np.array(img); al = a[..., 3] > 0
    lb, n = ndi.label(al, np.ones((3, 3)))
    if n <= 1: return img
    sz = ndi.sum(al, lb, range(1, n + 1)); objs = ndi.find_objects(lb)
    H, W = al.shape; keep = np.ones(n + 1, bool); keep[0] = False
    for i in range(1, n + 1):
        o = objs[i - 1]
        if sz[i - 1] < minpx and o[0].start > H * 0.5 and o[1].start > W * 0.5:
            keep[i] = False
            print('    · 워터마크 자리 조각 %dpx 버림' % sz[i - 1])
    m = keep[lb]
    a[..., 3] = np.where(m, a[..., 3], 0)
    ys, xs = np.where(m)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')


def run(skip=5, dry=False, ins=5):
    a = np.array(Image.open('%s/sheets/prop_hq_bamboo.png' % R).convert('RGB')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    H, W = r.shape
    mag = (r > g + 18) & (b > g + 18) & (np.abs(r - b) < 42) & (r + b > 60)
    bord = mag & (a.max(2) < 110)
    rowseg = grid(bord.mean(1), len(ROWCOLS), H)
    print('줄: %s' % (rowseg,))

    raw, idx = [], 0
    for ri, (y0, y1) in enumerate(rowseg):
        band = bord[y0 + 2:y1 - 1, :]                 # 그 줄 안에서만 세로 줄 검출
        colseg = grid(band.mean(0), ROWCOLS[ri], W)
        print('%d줄 → %d칸 %s' % (ri, len(colseg), colseg))
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
                if i == top or sz[i - 1] < 120: continue
                o = objs[i - 1]
                if (o[0].start < ty1 + 8 and o[0].stop > ty0 - 8 and
                        o[1].start < tx1 + 8 and o[1].stop > tx0 - 8): keep.append(i)
                else: print('    · 떨어진 조각 %dpx 버림(워터마크?)' % sz[i - 1])
            m = np.isin(lb, keep)
            ys_, xs_ = np.where(m)
            yb0, yb1, xb0, xb1 = ys_.min(), ys_.max(), xs_.min(), xs_.max()
            mm = m[yb0:yb1 + 1, xb0:xb1 + 1]
            px = a[iy0 + yb0:iy0 + yb1 + 1, ix0 + xb0:ix0 + xb1 + 1].astype(np.uint8)
            if ri == len(rowseg) - 1 and ci == len(colseg) - 1:
                px = dewatermark(px, mm)              # 마지막 칸 = ✦ 워터마크
            img = Image.fromarray(np.dstack([px, np.where(mm, 255, 0)]).astype(np.uint8), 'RGBA')
            if ri == len(rowseg) - 1 and ci == len(colseg) - 1:
                img = drop_wm_frag(img)
            raw.append((idx, img)); idx += 1

    out = []
    for i, img in raw:
        if i == skip:
            print('  (버림) %d %s %d×%d' % (i, LABEL[i], img.width, img.height)); continue
        j = len(out)
        name = 'prophq_bamboo_%d' % j
        savepal(img, ('%s/%s.png' % (HERE, name)) if dry else ('%s/assets/%s.png' % (R, name)))
        print('  %-18s %3d×%3d  ← 칸%d %s' % (name, img.width, img.height, i, LABEL[i]))
        out.append((name, img))
    return out


if __name__ == '__main__':
    sk = 5; dry = '--dry' in sys.argv
    for v in sys.argv[1:]:
        if v.startswith('--skip='): sk = int(v.split('=')[1])
    run(skip=sk, dry=dry)
