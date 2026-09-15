"""상단 원경 배경 시트 → assets/bg_<zone>.png (하늘 마젠타만 투명).
사용: python bg_extract.py <zone>   (sheets/bg_<zone>.png 를 읽는다)

원경은 보라·자주 안개가 그림일 수 있어 소품 추출처럼 '보라 계열'을 넓게 걷지 않고
**밝은 순마젠타만** 투명으로 만든다. 마젠타와 섞인 가장자리는 알파를 부드럽게.
좌우 이음새는 시트가 seamless라고 믿되, 끝 4px를 서로 섞어 눈에 띄는 줄을 죽인다.
"""
from PIL import Image
import numpy as np, os, sys

R = os.path.dirname(os.path.abspath(__file__))
zone = sys.argv[1]
src = '%s/sheets/bg_%s.png' % (R, zone)
a = np.array(Image.open(src).convert('RGB')).astype(int)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
H, W = r.shape

# 순마젠타에 가까울수록 0, 멀수록 255 — 경계는 부드럽게
mag = (r > 190) & (b > 190) & (g < 90)
edge = (r > 150) & (b > 150) & (g < 130) & ~mag          # 마젠타 물든 가장자리
alpha = np.where(mag, 0, 255).astype(np.uint8)
alpha[edge] = 120
# 물든 가장자리에서 마젠타 성분 걷기 — r·b를 g 쪽으로
rr, gg, bb = r.copy(), g.copy(), b.copy()
rr[edge] = np.minimum(rr[edge], gg[edge] + 40)
bb[edge] = np.minimum(bb[edge], gg[edge] + 40)
rgba = np.dstack([rr, gg, bb, alpha]).astype(np.uint8)

# 좌우 이음새 — 끝 4px를 서로 섞는다. **둘 다 불투명인 행만** — 한쪽이 하늘(투명)이면
# 마젠타 RGB가 섞여 들어와 이음새에 분홍 세로선이 생긴다.
k = 4
for i in range(k):
    t = (i + 1) / (k + 1)
    li, ri = i, W - k + i
    both = (rgba[:, li, 3] > 0) & (rgba[:, ri, 3] > 0)
    L, Rr = rgba[:, li, :3].astype(int), rgba[:, ri, :3].astype(int)
    mixL = (L * (1 - t * 0.5) + Rr * (t * 0.5)).astype(np.uint8)
    mixR = (Rr * (1 - (1 - t) * 0.5) + L * ((1 - t) * 0.5)).astype(np.uint8)
    rgba[both, li, :3] = mixL[both]
    rgba[both, ri, :3] = mixR[both]

out = '%s/assets/bg_%s.png' % (R, zone)
Image.fromarray(rgba, 'RGBA').save(out)
print('원경 %s → %s (%dx%d, 투명 %.0f%%)' % (zone, out, W, H, 100 * (alpha == 0).mean()))
prev = Image.new('RGB', (W, H), (0, 0, 0))
prev.paste(Image.fromarray(rgba, 'RGBA'), (0, 0), Image.fromarray(rgba, 'RGBA'))
prev.save('%s/review/bg_%s.png' % (R, zone))
print('검사판 → review/bg_%s.png' % zone)
