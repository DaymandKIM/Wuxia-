"""대나무 샤먼 m2 (기운 덩어리) — 잘린 앞머리를 되살린다.

지팡이와 같은 사고다. 처음 뽑을 때 칸을 인물 기준으로 재서, 앞으로 터져
나가는 부분이 세로로 뚝 잘렸다. 마지막 열까지 49픽셀이 꽉 찬 채로 끝난다.

원본 시트가 없으니, 잘린 면 앞쪽 열들을 원 프로필로 눌러 이어 붙여
둥근 앞머리를 만든다. 결과 캔버스는 여백 4px로 다시 잡는다.

읽기: raw/shaman/shaman_m2.png (68x56)
쓰기: assets/shaman_m2.png
"""
from PIL import Image
import numpy as np, os, json

R = os.path.dirname(os.path.abspath(__file__))
CAP = 15      # 이어 붙일 길이
PAD = 4       # 결과 여백

a = np.array(Image.open(R + '/raw/shaman/shaman_m2.png').convert('RGBA'))
al = a[:, :, 3] > 0
ys, xs = np.where(al)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()

W = (x1 - x0 + 1) + CAP + PAD * 2
H = (y1 - y0 + 1) + PAD * 2
out = np.zeros((H, W, 4), np.uint8)
out[PAD:PAD + (y1 - y0 + 1), PAD:PAD + (x1 - x0 + 1)] = a[y0:y1 + 1, x0:x1 + 1]

# 잘린 면(원본 마지막 열)의 세로 범위
col = np.where(al[:, x1])[0]
c = (col.min() + col.max()) / 2
half = (col.max() - col.min()) / 2

cutx = PAD + (x1 - x0)          # 결과 좌표계에서의 절단면
for k in range(1, CAP + 1):
    s = float(np.sqrt(max(0.0, 1 - (k / (CAP + 1.0)) ** 2)))   # 원 프로필
    if s <= 0.02:
        break
    for ty in range(int(round(c - half * s)), int(round(c + half * s)) + 1):
        sy = int(round(c + (ty - c) / s))                       # 눌린 만큼 되돌려 표본
        sx = x1 - k                                             # 안쪽 열을 되짚는다
        if not (0 <= sy < a.shape[0] and 0 <= sx < a.shape[1]):
            continue
        if a[sy, sx, 3] == 0:
            continue
        oy, ox = ty - y0 + PAD, cutx + k
        if 0 <= oy < H and 0 <= ox < W and out[oy, ox, 3] == 0:
            out[oy, ox] = a[sy, sx]

img = Image.fromarray(out, 'RGBA')
img.save(R + '/assets/shaman_m2.png')
al2 = out[:, :, 3] > 0
ys2, xs2 = np.where(al2)
print("m2 %dx%d → %dx%d · 내용 x%d-%d y%d-%d (앞머리 %dpx 복원)"
      % (a.shape[1], a.shape[0], W, H, xs2.min(), xs2.max(), ys2.min(), ys2.max(), CAP))
