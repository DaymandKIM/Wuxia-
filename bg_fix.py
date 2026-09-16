#!/usr/bin/env python3
"""원경 시트 손질 (v2.87.5, 사용자: "아직도 선이 있어 좀 더 옅게") — assets/bg_<zone>.png 를 제자리에서 고친다.
  1. 불투명 첫 줄이 테두리 줄(다음 3줄 평균과 밝기 차 8↑)이면 투명으로 — 상단 바 바로 아래 선
  2. 아래 균일 띠 위 6줄 안의 1px 이상줄(위아래와 차 20↑)은 위아래 평균으로 — 죽림 293줄·천산 179줄 사고
  3. 띠 경계 ±BLEND 줄을 선형 블렌드 — 띠 윗변이 디졸브 중간에서 선으로 보이던 것
  --crop-top=N : 불투명 첫 줄부터 N줄을 잘라낸다(빈 안개) — 죽림 24
저장은 bg_extract와 같은 팔레트 PNG-8(투명 인덱스 255)."""
import sys, numpy as np
from PIL import Image
BLEND = 5
def save_pal(arr, out):
    op = arr[:, :, 3] >= 100; rows = np.where(op.any(1))[0]
    skyc = arr[rows[0], op[rows[0]], :3].mean(0).astype(np.uint8)
    rgb = arr[:, :, :3].copy(); rgb[~op] = skyc
    q = Image.fromarray(rgb, 'RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    idx = np.array(q); idx[~op] = 255
    pal = q.getpalette()[:255 * 3] + list(int(v) for v in skyc)
    im = Image.fromarray(idx.astype(np.uint8), 'P'); im.putpalette(pal)
    im.save(out, optimize=True, transparency=bytes([255] * 255 + [0]))
def fix(zone, crop_top=0):
    p = f'assets/bg_{zone}.png'; arr = np.array(Image.open(p).convert('RGBA')).astype(int); H = arr.shape[0]
    al = arr[:, :, 3].mean(1); L = arr[:, :, :3].mean(2).mean(1)
    top = int(np.argmax(al > 0)); log = []
    # 1. 위 테두리 줄
    while top < H - 4 and abs(L[top] - L[top + 1:top + 4].mean()) > 8:
        arr[top, :, 3] = 0; log.append(f'위 테두리 줄 {top} 제거({int(L[top])} vs {int(L[top+1:top+4].mean())})'); top += 1
    if crop_top:
        arr = np.concatenate([arr[:top], arr[top + crop_top:]]); H = arr.shape[0]; log.append(f'위 {crop_top}줄 잘라냄')
        L = arr[:, :, :3].mean(2).mean(1)
    # 아래 균일 띠
    base = L[-1]; n = 0
    for y in range(H - 1, -1, -1):
        if abs(L[y] - base) <= 3: n += 1
        else: break
    bt = H - n
    # 2. 띠 위 이상줄
    for y in range(max(1, bt - 6), bt):
        if L[y] < min(L[y - 1], L[y + 1]) - 20 or L[y] > max(L[y - 1], L[y + 1]) + 20:
            arr[y, :, :3] = (arr[y - 1, :, :3] + arr[y + 1, :, :3]) // 2; log.append(f'이상줄 {y} 메움({int(L[y])})')
    L = arr[:, :, :3].mean(2).mean(1)
    # 3. 띠 경계 블렌드
    a, b = bt - BLEND - 1, bt + BLEND
    if a > 0 and b < H:
        for i, y in enumerate(range(a + 1, b)):
            t = (i + 1) / (b - a); arr[y, :, :3] = (arr[a, :, :3] * (1 - t) + arr[b, :, :3] * t).astype(int)
        log.append(f'띠 경계 {a}~{b} 블렌드(띠 {n}줄)')
    save_pal(arr.astype(np.uint8), p)
    print(zone, '→', '; '.join(log) or '변경 없음')
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; ct = 0
    for a in sys.argv[1:]:
        if a.startswith('--crop-top='): ct = int(a.split('=')[1])
    for z in (args or ['bamboo', 'village', 'cave', 'snow', 'heaven']): fix(z, ct if len(args) == 1 else 0)
