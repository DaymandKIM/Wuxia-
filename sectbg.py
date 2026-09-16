"""문파 터 배경 (v2.92.6) — sheets/sect_bg.png (사용자 제미나이, 3/4 시점 마당 한 장, 건물 없음) → assets/sect_bg.png
추출 없이 통째로 쓴다. 팔레트 PNG(디더)로 줄여 넣는다(빌드 16MB 한도 — 원본 RGB 913KB → 220KB).
빈 터(맨땅) 다섯 칸의 위치를 재서 찍는다 — SECT.scene.halls 에 [가운데 x, 아랫변 y, 폭] **그림 비율**로 적는다.
(화면은 기기마다 비율이 달라 그림을 cover 로 깔고, 자리는 그림 비율 → sectBgRect 로 화면 좌표.)
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC, DST = 'sheets/sect_bg.png', 'assets/sect_bg.png'

im = Image.open(SRC).convert('RGB')
W, H = im.size
q = im.quantize(colors=256, method=2, dither=Image.Dither.FLOYDSTEINBERG)   # 무디더는 줄무늬(v2.63.6)
q.save(DST, optimize=True)
import os
print('%s %dx%d → %s %dKB' % (SRC, W, H, DST, os.path.getsize(DST) // 1024))

# 맨땅(황토) 마스크 — r>g>b 따뜻한 갈색. 잔디(초록)·돌(회색)은 빠진다
a = np.array(im).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
m = (r > 150) & (r - b > 40) & (r - g > 10) & (r - g < 45) & (g > 120)
lab, n = ndi.label(m)
sizes = ndi.sum(m, lab, range(1, n + 1)); objs = ndi.find_objects(lab)
print('맨땅 덩어리 (큰 순) — 가장 큰 것은 가운데 수련장, 그다음 다섯이 빈 터:')
for i in np.argsort(-sizes)[:6]:
    s = objs[i]; y0, y1 = s[0].start, s[0].stop; x0, x1 = s[1].start, s[1].stop
    cx = (x0 + x1) / 2
    print('  %6d px  x %3d~%3d  y %3d~%3d   → [%.3f, %.3f, %.3f]' % (sizes[i], x0, x1, y0, y1, cx / W, y1 / H, (x1 - x0) / W))
