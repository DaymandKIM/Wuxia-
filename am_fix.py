"""아미 재작업 시트 2장의 '그림이 아닌 것' 두 가지를 지워 sheets/am_*2_fix.png 로 저장한다 (v2.95.5).
sr_sheet.py 로 뽑기 전에 한 번 돌린다 — 추출기가 못 가르는 것만 손본다.

  python am_fix.py      → sheets/am_disc2_fix.png · sheets/am_elite2_fix.png

1) am_disc2  r2c5 : 그 칸만 '파란 액자 + 실루엣을 두른 하늘색 후광'으로 강조돼 있다(그림이 아니라 강조 표시).
   그대로 뽑으면 공격 10컷 중 한 컷만 파랗게 빛나 딴 인물처럼 번쩍인다.
   - 액자·후광(밝은 하늘색)은 배경으로 지우고,
   - 후광에 물든 몸 외곽선(어두운 청록)은 지우지 말고 색만 중성 어둠으로 되돌린다
     (CLAUDE.md "얇은 것은 통째로 물든다 — 지우지 말고 성분만 걷어낸다"),
   - 손바닥 기운(두꺼운 하늘색 덩어리)은 그림이므로 그대로 둔다.
2) am_elite2 r2c4→c5 : 찌르기 칸의 칼날이 칸 테두리를 넘어 옆칸(c5) 가슴 높이까지 그려져 있다.
   c5 를 그대로 뽑으면 등 뒤로 칼 토막이 튀어나온다. 넘어온 칼날 조각만 배경으로 지운다
   (c4 쪽은 --colsat 로 칸 경계를 오른쪽(521)으로 밀어 칼날을 살린다).
"""
import numpy as np
from PIL import Image
from scipy import ndimage

R = '/home/user/Wuxia-/sheets/'

def disc():
    a = np.array(Image.open(R + 'am_disc2.png').convert('RGB')).astype(int)
    x0, y0, x1, y1 = 513, 281, 612, 417                # r2c5 칸
    sub = a[y0:y1, x0:x1]
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80); M = ~bg
    cy = M & (b > r + 25) & (b > 110)                                                        # 하늘색 전부
    thick = ndimage.binary_dilation(ndimage.binary_erosion(cy, iterations=2), iterations=2) & cy                   # 손바닥 기운(두껍다)
    qi = ndimage.binary_dilation(thick, iterations=2) & M                                               # 기운 둘레는 건드리지 않는다
    outer = M & ~ndimage.binary_erosion(M, iterations=4)
    edge = np.zeros_like(M); edge[:6] = edge[-6:] = True; edge[:, :6] = edge[:, -6:] = True  # 파란 액자
    drop = ((cy & ~qi & outer) | (cy & edge)) & ~thick
    sub[drop] = np.median(sub[bg], axis=0).astype(int)
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    bg2 = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80); M2 = ~bg2
    tint = (M2 & ~ndimage.binary_erosion(M2, iterations=3)) & ~qi & (b > r + 12)                        # 물든 외곽선
    sub[..., 1][tint] = np.minimum(g[tint], r[tint] + 8)
    sub[..., 2][tint] = np.minimum(b[tint], r[tint] + 8)
    a[y0:y1, x0:x1] = sub
    Image.fromarray(a.astype('uint8'), 'RGB').save(R + 'am_disc2_fix.png')
    print('수습 r2c5 강조 지움: 배경으로 %d px · 외곽선 색 되돌림 %d px · 남긴 기운 %d px'
          % (drop.sum(), tint.sum(), thick.sum()))

def elite():
    a = np.array(Image.open(R + 'am_elite2.png').convert('RGB')).astype(int)
    x0, y0, x1, y1 = 513, 276, 536, 286                # c5 로 넘어온 c4 의 칼날 (몸은 x536 부터)
    sub = a[y0:y1, x0:x1]
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)
    n = int((~bg).sum())
    sub[~bg] = np.array([251, 1, 249])
    a[y0:y1, x0:x1] = sub
    Image.fromarray(a.astype('uint8'), 'RGB').save(R + 'am_elite2_fix.png')
    print('정예 c5 로 넘어온 칼날 지움: %d px' % n)

if __name__ == '__main__':
    disc(); elite()
