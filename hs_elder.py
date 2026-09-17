"""화산 장로 — sheets/hs_elder2.png → assets/hs_elder_*.png (58컷) + assets/fx_dust.png  (v2.94.28)

    python hs_elder.py

sr_sheet.py 를 **고치지 않고**(다른 시트를 같이 뽑는 중이라) 두 군데만 갈아끼워 돌린다.
이 시트에서 그 두 가지를 안 고치면 그림이 이렇게 망가진다 —

 1) **작은 덩어리 문턱 40 → 8.** 올려 베는 나선(atk2) 줄의 **흰 매화 꽃잎**이 8~40px 짜리
    조각이라 통째로 사라진다. 꽃잎이 이 공격의 정체라 살려야 한다. 같은 이유로 --nodeclutter
    (1px 침식은 꽃잎·술을 다 먹는다). 이 시트는 칸을 넘어 이어진 그림이 없어(덩어리 라벨링으로
    확인) 침식 없이도 옆칸 조각이 안 붙는다.
 2) **마젠타 걷어내기(rim tint) 조건에 |r-b|<40 을 더한다.** 원래 조건(r>g+10 & b>g+10)은
    **붉은 술·진홍 장포**(r 200 · b 60)까지 r=min(r,g+18) 으로 눌러 **검은 막대**로 만든다
    (CLAUDE.md "검은 조각" — 대기 컷 칼자루 술이 새카매졌다). 마젠타 번짐은 r≈b 라 이 조건으로도 걷힌다.

칸: 6줄×12칸 균등(85px), 가로 테두리 띠 3px·세로 2px → --inset=1,1,0,0 이 딱 맞는다(그림을 한 열도 안 버린다).
뺀 칸: r1c0(서 있는 컷) · r1c6(r1c5 와 다리 IoU 0.95) · r2c10,c11 · r3c10,c11 · r4c11(같은 갈무리 자세) ·
       r4c8(인물 없는 먼지 단독 칸 → fx_dust) · r4c9(검 끝이 칸 왼쪽 테두리에서 평평하게 잘림) ·
       r5c0,c6,c8,c10,c11.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

R = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, R)
import sr_sheet as S

MIN = 8          # 덩어리 최소 픽셀 (원래 40 — 매화 꽃잎이 8~40px)
DIFF = 40        # |r-b| 가 이보다 작을 때만 마젠타로 보고 걷는다 (붉은 술 보존)


def _demag(sub, keep):
    rim = keep & ~ndimage.binary_erosion(keep, iterations=3)
    r_, g_, b_ = sub[..., 0].astype(int), sub[..., 1].astype(int), sub[..., 2].astype(int)
    t = rim & (r_ > g_ + 10) & (b_ > g_ + 10) & (np.abs(r_ - b_) < DIFF)
    sub[..., 0][t] = np.minimum(r_[t], g_[t] + 18)
    sub[..., 2][t] = np.minimum(b_[t], g_[t] + 18)


def finish(sub, m):
    """sr_sheet.finish 와 같되 최소 덩어리 MIN · 마젠타 조건에 |r-b|<DIFF."""
    lab, n = ndimage.label(m); keep = np.zeros_like(m)
    H_, W_ = sub.shape[:2]
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        ring = bw > W_ * 0.85 and bh > H_ * 0.85 and len(ys) < bw * bh * 0.3
        if ring:
            edge = (xs < 8) | (xs >= W_ - 8) | (ys < 8) | (ys >= H_ - 8)
            ring = edge.mean() > 0.6
        if len(ys) < MIN or ring: continue
        keep[lab == i] = 1
    if S.DECLUTTER:
        er = ndimage.binary_erosion(keep, iterations=1)
        lab2, n2 = ndimage.label(er)
        if n2:
            sizes = ndimage.sum(er, lab2, range(1, n2 + 1))
            big = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.05])
            keep = ndimage.binary_dilation(big, iterations=2) & keep
    _demag(sub, keep)
    return np.dstack([sub, np.where(keep, 255, 0)]).astype(np.uint8)


def shrink(rgba, scale):
    """sr_sheet.shrink 와 같되 마젠타 조건에 |r-b|<DIFF."""
    al = rgba[..., 3] > 0
    _, (iy, ix) = ndimage.distance_transform_edt(~al, return_indices=True)
    rgb = rgba[..., :3][iy, ix]
    w, h = max(1, round(rgba.shape[1] * scale)), max(1, round(rgba.shape[0] * scale))
    src = ndimage.binary_dilation(al, iterations=1) if S.FAT else al
    c = np.array(Image.fromarray(rgb, 'RGB').resize((w, h), Image.LANCZOS))
    a = np.array(Image.fromarray((src * 255).astype(np.uint8), 'L').resize((w, h), Image.LANCZOS))
    out = np.dstack([c, np.where(a >= (96 if S.FAT else 110), 255, 0)]).astype(np.uint8)
    out[out[..., 3] == 0] = 0
    al2 = out[..., 3] > 0; rim = al2 & ~ndimage.binary_erosion(al2, iterations=1)
    r_, g_, b_ = out[..., 0].astype(int), out[..., 1].astype(int), out[..., 2].astype(int)
    t = rim & (r_ > g_ + 15) & (b_ > g_ + 15) & (np.abs(r_ - b_) < DIFF)
    out[..., 0][t] = np.minimum(r_[t], g_[t] + 12); out[..., 2][t] = np.minimum(b_[t], g_[t] + 12)
    return out


def save_pal(rgba, dst):
    """팔레트 PNG + 투명 인덱스 255 (sectdiff.save_pal 과 같다)."""
    al = rgba[..., 3] > 127
    q = Image.fromarray(rgba[..., :3], 'RGB').quantize(colors=255, method=2, dither=Image.Dither.FLOYDSTEINBERG)
    idx = np.array(q, np.uint8); idx[~al] = 255
    p = Image.fromarray(idx, 'P'); p.putpalette(q.getpalette()[:255 * 3] + [255, 0, 255])
    p.info['transparency'] = 255
    p.save(dst, optimize=True, transparency=255)


def fx_dust():
    """r4c8 — 인물 없이 먼지만 그려진 칸. 칸 좌·우 테두리에서 잘려 있다(시트가 그렇다).
    게임에 쓰려면 **원본 배율 그대로** 둔다 — 초식 이펙트 후보(사용자)."""
    sh = np.array(Image.open(os.path.join(R, 'sheets', 'hs_elder2.png')).convert('RGB')).astype(int)
    r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)
    y0, y1, x0, x1 = 374, 464, 683, 766           # 위·아래 띠 1px 안, 좌·우는 띠 밖
    sub = sh[y0:y1, x0:x1].copy(); m = ~bg[y0:y1, x0:x1]
    lab, n = ndimage.label(m); keep = np.zeros_like(m)
    for i in range(1, n + 1):
        if (lab == i).sum() >= MIN: keep[lab == i] = 1
    _demag(sub, keep)
    a = np.dstack([sub, np.where(keep, 255, 0)]).astype(np.uint8)
    ys, xs = np.where(a[..., 3] > 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    save_pal(a, os.path.join(R, 'assets', 'fx_dust.png'))
    print('fx_dust %dx%d → assets/fx_dust.png' % (a.shape[1], a.shape[0]))


ARGS = ('hs_elder2.png hs_elder --body=58 --inset=1,1,0,0 --nodeclutter'
        ' --idle=r0c0,r0c1,r0c2,r0c3,r0c4,r0c5,r0c6,r0c7,r0c8,r0c9,r0c10,r0c11'
        ' --walk=r1c1,r1c2,r1c3,r1c4,r1c5,r1c7,r1c8,r1c9,r1c10,r1c11'
        ' --atk=r2c0,r2c1,r2c2,r2c3,r2c4,r2c5,r2c6,r2c7,r2c8,r2c9'
        ' --atk2=r3c0,r3c1,r3c2,r3c3,r3c4,r3c5,r3c6,r3c7,r3c8,r3c9'
        ' --atk3=r4c0,r4c1,r4c2,r4c3,r4c4,r4c5,r4c6,r4c7,r4c10'
        ' --hit=r5c1 --death=r5c2,r5c3,r5c4,r5c5,r5c7,r5c9').split()

if __name__ == '__main__':
    S.finish = finish; S.shrink = shrink
    sys.argv = [sys.argv[0]] + (sys.argv[1:] or ARGS)
    S.main()
    fx_dust()
