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

# --patch x,y,w,h : 그 사각형에 **바로 왼쪽 같은 크기 띠를 복사**해 메운다 — 평균색으로
# 칠하면 언덕·땅 경계에 걸친 자리가 연한 상자로 남는다(v2.61 죽림). 복사면 경계 기울기가
# 이어진다. (제미나이 ✦ 워터마크가 땅 띠 위에 찍혀 오는 경우)
for arg in sys.argv[2:]:
    if arg.startswith('--patch'):
        x, y, w, h = map(int, arg.split('=')[1].split(','))
        a[y:y + h, x:x + w] = a[y:y + h, x - w:x]
        r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
        print('패치 (%d,%d %dx%d) ← 왼쪽 띠 복사' % (x, y, w, h))

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

# 좌우 이음새 — 끝 k px를 서로 섞는다(원경은 완전 무봉이 아니라 넓게). **둘 다 불투명인
# 행만** — 한쪽이 하늘(투명)이면 마젠타 RGB가 섞여 들어와 이음새에 분홍 세로선이 생긴다.
k = 24
for i in range(k):
    t = (i + 1) / (k + 1)
    li, ri = i, W - k + i
    both = (rgba[:, li, 3] > 0) & (rgba[:, ri, 3] > 0)
    L, Rr = rgba[:, li, :3].astype(int), rgba[:, ri, :3].astype(int)
    mixL = (L * (1 - t * 0.5) + Rr * (t * 0.5)).astype(np.uint8)
    mixR = (Rr * (1 - (1 - t) * 0.5) + L * ((1 - t) * 0.5)).astype(np.uint8)
    rgba[both, li, :3] = mixL[both]
    rgba[both, ri, :3] = mixR[both]

# 아래 평평한 땅색 띠 잘라내기 — 옛 단색 페이드용이던 띠가 디졸브(v2.61.7)에선 반투명
# 회색 띠로 남는다. 행 표준편차가 작은(균일한) 바닥 행을 위로 올라가며 걷는다.
trim = H
c0, c1 = int(W * 0.05), int(W * 0.95)                 # 가장자리 섞은 열은 뺀다
base = rgba[H - 1, c0:c1, :3].astype(int).mean(0)
while trim > int(H * 0.6):
    row = rgba[trim - 1, c0:c1]
    if row[:, 3].min() == 0: break
    rgb = row[:, :3].astype(int)
    if rgb.std(0).mean() > 14 or np.abs(rgb.mean(0) - base).max() > 14: break
    trim -= 1
if trim < H:
    print('아래 평평한 띠 %dpx 제거' % (H - trim)); rgba = rgba[:trim]
# --pad=N : 아래에 땅 N줄을 덧댄다 — 집·바위가 그림 맨 아래에 붙어 있으면 디졸브가 그걸 녹인다
# (폐촌 "집이 잘려 보여", v2.69.1). 맨 아래 6줄을 위아래 번갈아 이어 붙이고 살짝 흔들어 줄무늬를 죽인다.
for arg in sys.argv[2:]:
    if arg.startswith('--pad'):
        n = int(arg.split('=')[1]); Hh = rgba.shape[0]
        # 덧대기는 축소 전 원본 해상도에서 하니, 2000px 시트는 최종(1024)에서 반으로 준다 —
        # N은 최종 픽셀 기준으로 받아 원본 배율로 환산한다 (v2.69.5: 설산 120이 61이 됐었다)
        n = int(round(n * max(1.0, W / 1024.0)))
        band = rgba[Hh - 6:Hh].astype(int)
        # 집 벽이 맨 아래까지 닿아 있어 그 줄을 그대로 이으면 벽이 물에 비친 듯 줄무늬가 된다 —
        # 줄마다 중앙값에 가까운 픽셀(땅)만 골라 가로로 섞어 벽 구조 없는 땅 띠를 만든다
        rng = np.random.RandomState(7)
        # 땅 픽셀 풀(줄 중앙값 근처)을 2D로 무작위 배치한 뒤 3×3 상자 흐림 — 줄마다 섞으면
        # 가로 줄무늬가 생겼다("부자연스럽다", v2.69.6). 맨 윗줄은 원본 마지막 줄과 섞어 이음새를 없앤다.
        pool = []
        for r in band:
            med = np.median(r[:, :3], axis=0); g = np.abs(r[:, :3] - med).sum(1) < 40
            pool.append(r[g] if g.sum() > 50 else r)
        pool = np.concatenate(pool, 0)
        Wd = rgba.shape[1]
        pad = pool[rng.randint(0, len(pool), size=(n, Wd))].astype(float)
        k = np.pad(pad[:, :, :3], ((1, 1), (1, 1), (0, 0)), mode='edge')
        blur = sum(k[dy:dy + n, dx:dx + Wd] for dy in range(3) for dx in range(3)) / 9.0
        pad[:, :, :3] = blur; pad[:, :, 3] = 255
        # (원본 마지막 줄과 크로스페이드는 하지 않는다 — 그 줄엔 나무 밑동이 섞여 있어 어두운 가로선이 됐다)
        rgba = np.concatenate([rgba, pad.astype(np.uint8)], 0)
        print('아래 땅 %d줄 덧댐' % n)
for arg in sys.argv[2:]:
    if arg.startswith('--contrast'):
        kc = float(arg.split('=')[1]); op = rgba[:, :, 3] > 0
        rgb = rgba[:, :, :3].astype(float); mean = rgb[op].mean()
        rgb[op] = np.clip((rgb[op] - mean) * kc + mean, 0, 255)
        rgba[:, :, :3] = rgb.astype(np.uint8); print('대비 ×%.2f' % kc)
out = '%s/assets/bg_%s.png' % (R, zone)
im = Image.fromarray(rgba, 'RGBA')
# 용량 — 게임은 높이 ~290px로 그리니 폭 1024면 충분(2000px 시트는 2배 오버샘플).
# 팔레트 PNG-8(알파 유지)로 저장: 빌드 16MB 한도(v2.61.6, 15MB에서 급제동).
MAXW = 1024
if im.width > MAXW:
    im = im.resize((MAXW, round(im.height * MAXW / im.width)), Image.LANCZOS)
# v2.63.6: quantize(256, method=2)(fastoctree, 디더 없음)는 안개 그라데이션을 18~72색으로
# 뭉개 게임에서 가로 줄무늬가 됐다("원경 줄무늬"). 미디언컷 255색 + 플로이드 디더로 바꾸고,
# 투명(하늘)은 전용 인덱스 255에 격리한다 — RGB 팔레트에 마젠타가 끼지 않게 투명 픽셀
# RGB는 하늘색(첫 불투명 행 평균)으로 채운 뒤 양자화한다.
arr = np.array(im.convert('RGBA'))
op = arr[:, :, 3] >= 100
rows = np.where(op.any(1))[0]
skyc = arr[rows[0], op[rows[0]], :3].mean(0).astype(np.uint8) if len(rows) else np.array([128, 128, 128], np.uint8)
rgb = arr[:, :, :3].copy(); rgb[~op] = skyc
q = Image.fromarray(rgb, 'RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
idx = np.array(q); idx[~op] = 255
pal = q.getpalette()[:255 * 3] + list(int(v) for v in skyc)
im = Image.fromarray(idx.astype(np.uint8), 'P'); im.putpalette(pal)
im.info['transparency'] = bytes([255] * 255 + [0])
im.save(out, optimize=True, transparency=bytes([255] * 255 + [0]))
print('원경 %s → %s (%dx%d, 투명 %.0f%%)' % (zone, out, W, H, 100 * (alpha == 0).mean()))
prev = Image.new('RGB', (W, H), (0, 0, 0))
prev.paste(Image.fromarray(rgba, 'RGBA'), (0, 0), Image.fromarray(rgba, 'RGBA'))
prev.save('%s/review/bg_%s.png' % (R, zone))
print('검사판 → review/bg_%s.png' % zone)
