"""바닥 텍스처 시트 → assets/ground_<zone>.png (4방향 무봉화).
사용: python ground_extract.py <zone> [--patch=x,y,w,h]
sheets/ground_<zone>.png 를 읽는다. 투명 없음(꽉 찬 그림). 시트가 완전 무봉이 아니라
가장자리 k px를 반대편과 서로 섞어(가로·세로 모두) 이음새를 죽인다.
--patch 는 제미나이 ✦ 워터마크를 왼쪽 같은 크기 띠 복사로 메운다(bg_extract와 동일).
"""
from PIL import Image
import numpy as np, os, sys

R = os.path.dirname(os.path.abspath(__file__))
zone = sys.argv[1]
a = np.array(Image.open('%s/sheets/ground_%s.png' % (R, zone)).convert('RGB')).astype(float)
H, W, _ = a.shape

for arg in sys.argv[2:]:
    if arg.startswith('--patch'):
        x, y, w, h = map(int, arg.split('=')[1].split(','))
        a[y:y + h, x:x + w] = a[y:y + h, x - w:x]
        print('패치 (%d,%d %dx%d) ← 왼쪽 띠 복사' % (x, y, w, h))

K = 48
def blend_axis(img, axis):
    # 양 끝 K px를 반대편과 섞는다 — 바깥으로 갈수록 반대편 비중이 0.5까지
    out = img.copy()
    n = img.shape[axis]
    for i in range(K):
        t = (i + 0.5) / K                # 0=바깥 끝, 1=안쪽
        wo = 0.5 * (1 - t)               # 반대편 비중
        lo, hi = i, n - K + i
        if axis == 1:
            L, Rr = img[:, lo], img[:, hi]
            out[:, lo] = L * (1 - wo) + Rr * wo
            out[:, hi] = Rr * (1 - wo) + L * wo
        else:
            T, B = img[lo], img[hi]
            out[lo] = T * (1 - wo) + B * wo
            out[hi] = B * (1 - wo) + T * wo
    return out

a = blend_axis(a, 1)
a = blend_axis(a, 0)
out = np.clip(a, 0, 255).astype(np.uint8)
Image.fromarray(out, 'RGB').save('%s/assets/ground_%s.png' % (R, zone))
mean = out.reshape(-1, 3).mean(0).astype(int)
print('바닥 %s → assets/ground_%s.png (%dx%d, 평균색 #%02x%02x%02x)' % (zone, zone, W, H, *mean))
# 검사판 — 2×2 타일링해 이음새가 보이는지
tile = Image.fromarray(out, 'RGB')
board = Image.new('RGB', (W * 2, H * 2))
for i in range(2):
    for j in range(2): board.paste(tile, (i * W, j * H))
board.resize((W, H), Image.NEAREST).save('%s/review/ground_%s.png' % (R, zone))
print('검사판(2×2 타일) → review/ground_%s.png' % zone)
