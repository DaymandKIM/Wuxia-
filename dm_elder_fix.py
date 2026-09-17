# 당문 장로 시트 전처리 — r3(소맷자락 침 뿌리기) 줄의 자주색 침을 연녹(독구름 톤)으로 물들인다.
#
# 왜: 추출기 배경 판정이 r>g+50 & b>g+50 이라 침 (144,69,154)·(123,35,131)·(163,75,166) 계열이
#     통째로 배경으로 먹힌다(CLAUDE.md "자주·분홍 잔상은 마젠타 배경 판정에 먹혀 못 뽑는다").
#     원래 프롬프트도 "a fan of green needles" 였으니 연녹이 의도에 맞다.
#
# 어떻게 침만 고르나 — 노인의 테두리(같은 자줏빛 블렌드)와 갈라야 한다:
#   warm = 배경 아님 & g >= b-4     → 노인(녹포·갈색·살·백발). 노인 몸 안엔 차가운 색이 없다.
#   seed = 배경 아님 & 차가움 & warm 에서 3px 넘게 떨어진 것 → 침의 은빛 심(노인 테두리는 몸에 붙어 있어 빠진다)
#   침   = 자줏빛/차가운 픽셀 중 "침 심까지 거리 < 노인까지 거리" 인 것
#   → 노인 테두리는 노인 쪽이 가까워 그대로 배경으로 남고, 침의 어두운 윤곽은 침 쪽이 가까워 살아난다.
# 밝기는 그대로 두고 색만 독구름 색(201,239,162)으로 바꾼다.
#
# scratchpad 전용. 원본 sheets/dm_elder2.png 는 안 건드리고 sheets/dm_elder2_fix.png 로 저장한다.
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, DST = 'sheets/dm_elder2.png', 'sheets/dm_elder2_fix.png'
ROW = (279, 372)                       # r3 줄(가로 테두리 줄 사이)
COLS = [0, 94, 191, 295, 407, 511, 639, 767, 858, 945, 1024]
GREEN = np.array([201, 239, 162], float)
SP = sys.argv[1] if len(sys.argv) > 1 else '.'

sh = np.array(Image.open(SRC).convert('RGB')).astype(int)
r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
mx = sh.max(-1)
bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)
pure = (r > g + 150) & (b > g + 150)
art = ~bg
warm = art & (g >= b - 4)
# 침의 밝은 하이라이트도 중성색이라 warm 에 든다 — 노인은 큰 덩어리 하나이므로 작은 warm 조각은 침으로 돌린다.
wl, wn = ndimage.label(warm, structure=np.ones((3, 3)))
if wn:
    wsz = ndimage.sum(warm, wl, range(1, wn + 1))
    warm = np.isin(wl, [i + 1 for i, v in enumerate(wsz) if v >= 150])
cool = art & ~warm
seed = cool & ~ndimage.binary_dilation(warm, iterations=3)

zone = np.zeros_like(bg)
zone[ROW[0] + 3:ROW[1] - 2] = True
for x in COLS:
    zone[:, max(0, x - 5):x + 6] = False       # 칸 테두리 줄과 그 블렌드는 손대지 않는다

dW = ndimage.distance_transform_edt(~warm)
dS = ndimage.distance_transform_edt(~seed)
cand = ((bg & ~pure & (mx > 40)) | cool) & zone
need = cand & (dS <= 4) & (dS < dW)
need |= cand & (dW > 8)     # 은빛 심이 하나도 안 남은 낱개 침(날아가는 침) — 노인에게서 멀면 무조건 침이다
# 손에 맞닿은 침 밑동까지 넓힌다 — 이미 물든 침에 붙어 있고 노인에게서 2px 이상 떨어진 자줏빛만.
for _ in range(3):
    grow = cand & ~need & ndimage.binary_dilation(need, iterations=1) & (dW >= 2)
    if not grow.any(): break
    need |= grow
lab, n = ndimage.label(need, structure=np.ones((3, 3)))
if n:
    sz = ndimage.sum(need, lab, range(1, n + 1))
    need &= np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= 10])
print('침 픽셀 %d — 그중 옛 배경 판정에 먹히던 것 %d, 이미 살던 것 %d'
      % (need.sum(), (need & bg).sum(), (need & ~bg).sum()))

out = sh.astype(float).copy()
L = mx[need].astype(float) / 255.0
out[need] = np.clip(L[:, None] * GREEN[None, :], 0, 255)

# ── 2단계: 작은 이펙트 조각을 1~2px 불려 추출기의 "40px 미만 조각 버림"(sr_sheet.finish)을 넘긴다.
#    독환(30~35px)·날아가는 침 한 대(21px)·구름 물방울(11~22px)이 그 문턱에 걸려 통째로 사라졌다.
#    색은 조각 제 색을 그대로 끌어다 채운다(가장 가까운 픽셀).
ROWS = [(186, 279), (279, 372), (372, 465)]                  # 공격 세 줄만
o = out
bg2 = (o[..., 0] > o[..., 1] + 50) & (o[..., 2] > o[..., 1] + 50) & (np.abs(o[..., 0] - o[..., 2]) < 80)
art = ~bg2
for (ry0, ry1) in ROWS:
    band = np.zeros_like(art); band[ry0 + 4:ry1 - 3] = True
    lab, n = ndimage.label(art & band)
    for i in range(1, n + 1):
        m = lab == i
        sz = int(m.sum())
        if sz < 10 or sz >= 45: continue
        grown = m
        for _ in range(2):
            grown = ndimage.binary_dilation(grown, iterations=1) & band
            if grown.sum() >= 46: break
        new = grown & ~m
        if not new.any(): continue
        _, (iy, ix) = ndimage.distance_transform_edt(~m, return_indices=True)
        ys_, xs_ = np.where(new)
        out[ys_, xs_] = out[iy[ys_, xs_], ix[ys_, xs_]]
        print(' 작은 조각 %d px → %d px 로 불림 (y %d~%d x %d~%d)'
              % (sz, int(grown.sum()), ys_.min(), ys_.max(), xs_.min(), xs_.max()))

Image.fromarray(out.round().astype('uint8')).save(DST)
print('저장', DST)

o = out
bg2 = (o[..., 0] > o[..., 1] + 50) & (o[..., 2] > o[..., 1] + 50) & (np.abs(o[..., 0] - o[..., 2]) < 80)
print('r3 에서 추출기가 살릴 침 픽셀: 손질 전 %d → 후 %d' % (int((need & ~bg).sum()), int((need & ~bg2).sum())))
k1 = sh.copy(); k1[bg] = [255, 255, 255]
k2 = out.copy(); k2[bg2] = [255, 255, 255]
for nm, arr in (('before', k1), ('after', k2)):
    for tag, xa, xb in (('a', 0, 511), ('b', 511, 1024)):
        im = Image.fromarray(arr.round().astype('uint8')).crop((xa, ROW[0], xb, ROW[1]))
        im.resize((im.width * 3, im.height * 3), Image.NEAREST).save('%s/fix_%s_%s.png' % (SP, nm, tag))
print('대조판 →', SP + '/fix_before_*.png · fix_after_*.png')
