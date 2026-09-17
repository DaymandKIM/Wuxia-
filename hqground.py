#!/usr/bin/env python3
"""본진 바닥 타일 추출 (v2.94.4) — sheets/ground_hq_<문파>.png → assets/ground_hq_<문파>.png + 검사판.
사용: python hqground.py <문파키> [--period=N|auto] [--vperiod=N|auto] [--patch=x,y,w,h | --nopatch] [--k=16] [--contrast=0.7]
  1. 자기상관(FFT)으로 가로·세로 반복 주기를 잰다 — 제미나이가 같은 무늬를 두 번 찍어 오는 일이 있다(개방 시트 주기 512).
     상관 0.6↑ 봉우리(폭의 1/3~ 끝-64)가 있으면 **한 주기만** 자른다. 없으면 통째.
  2. 워터마크 ✦(우하단 밝은 덩어리)는 잘라낸 타일 안에 있을 때만 왼쪽 띠 복사로 메운다. 자동이 틀리면 --patch(시트 좌표).
  3. 가장자리 k px 크로스페이드(ground_extract 는 48 — 시트가 이미 무봉이면 약하게).
  4. --contrast 로 평균을 중심으로 대비를 낮춘다(인물 가독성 — 기존 사냥터 바닥 휘도 std 4~5).
  5. 256색 미디언컷 + 플로이드 디더 팔레트 PNG. 검사판 review/ground_hq_<k>.png = 2×2 타일(1:1) + 이음새 표시.
"""
from PIL import Image, ImageDraw
import numpy as np, os, sys

R = os.path.dirname(os.path.abspath(__file__))
key = sys.argv[1]; zone = 'hq_' + key
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in sys.argv[2:] if a.startswith('--'))
K = int(opts.get('--k', 16)); kc = float(opts.get('--contrast', 1.0))

a = np.array(Image.open('%s/sheets/ground_%s.png' % (R, zone)).convert('RGB')).astype(float)
H, W, _ = a.shape
g = a.mean(2); g = g - g.mean()

def period(axis):
    n = g.shape[axis]
    f = np.fft.rfft(g, axis=axis); r = np.fft.irfft(f * np.conj(f), n=n, axis=axis)
    r = r.sum(1 - axis); r = r / r[0]
    lo, hi = n // 3, n - 64
    cand = [(r[p], p) for p in range(lo, hi) if r[p] == r[max(0, p - 24):p + 24].max() and r[p] >= 0.6]
    return (max(cand)[1], max(cand)[0]) if cand else (n, None)
def pick(opt, axis):
    v = opts.get(opt, 'auto')
    if v != 'auto': return int(v), None
    return period(axis)
pw, cw = pick('--period', 1); ph, ch = pick('--vperiod', 0)
print('가로 주기 %s%s · 세로 주기 %s%s' % (pw, ' (상관 %.2f)' % cw if cw else ' (반복 없음)', ph, ' (상관 %.2f)' % ch if ch else ' (반복 없음)'))
if pw < W: print('  좌·우 반쪽 평균차 %.2f — 한 주기(폭 %d)만 쓴다' % (np.abs(a[:, :W - pw] - a[:, pw:]).mean(), pw))
t = a[:ph, :pw].copy(); th, tw = t.shape[:2]

# 워터마크
patch = None
if '--patch' in opts:
    x, y, w, h = map(int, opts['--patch'].split(','))
    if x + w <= tw and y + h <= th: patch = (x, y, w, h)
    else: print('--patch 가 잘라낸 타일 밖 — 메울 것 없음')
elif '--nopatch' not in opts:
    def find(img):
        # 우하단 220×220 에서 주변 중앙값보다 40↑ 밝은 픽셀을 연결 성분으로 묶어 **가장 큰 덩어리**를 본다 —
        # ✦ 는 폭·높이 20px↑ 의 큰 균일 덩어리(개방 ~50×47, 소림 ~40×40). 지푸라기·석판 하이라이트(작은 조각)를
        # 잡아 지운 오검출이 있었다. 덩어리 픽셀 150↑ 이고 bbox 가 20px 넘을 때만 워터마크로 본다.
        hh, ww = img.shape[:2]; y0, x0 = max(0, hh - 220), max(0, ww - 220)
        reg = img[y0:, x0:].mean(2); med = np.median(reg); m = reg > med + 40
        if m.sum() < 150: return None
        try:
            from scipy import ndimage
            lab, n = ndimage.label(m)
            if not n: return None
            sizes = ndimage.sum(m, lab, range(1, n + 1)); big = int(np.argmax(sizes)) + 1
            ys, xs = np.where(lab == big)
        except ImportError:
            ys, xs = np.where(m)
        if len(xs) < 150 or xs.max() - xs.min() < 20 or ys.max() - ys.min() < 20: return None
        return (xs.min() + x0 - 3, ys.min() + y0 - 3, xs.max() - xs.min() + 7, ys.max() - ys.min() + 7)
    full = find(a); patch = find(t)
    if full and not patch: print('워터마크(시트 x %d y %d %dx%d)는 잘라낸 타일 밖 — 메울 것 없음' % full)
    elif patch: print('워터마크 자동 검출 → --patch=%d,%d,%d,%d' % patch)
    else: print('워터마크 못 찾음')
if patch:
    x, y, w, h = patch; t[y:y + h, x:x + w] = t[y:y + h, x - w:x]; print('패치 (%d,%d %dx%d) ← 왼쪽 띠 복사' % patch)

# 이음새 — 자른 자리(끝열 vs 첫열)의 차를 자연 이웃열과 비교해 보고
nat = (np.abs(t[:, 1:] - t[:, :-1]).mean() + np.abs(t[1:] - t[:-1]).mean()) / 2
print('이음새 차: 가로 %.2f · 세로 %.2f (자연 이웃 %.2f) → 크로스페이드 k=%d' % (np.abs(t[:, 0] - t[:, -1]).mean(), np.abs(t[0] - t[-1]).mean(), nat, K))
def blend_axis(img, axis):
    out = img.copy(); n = img.shape[axis]
    for i in range(K):
        wo = 0.5 * (1 - (i + 0.5) / K); lo, hi = i, n - K + i
        if axis == 1:
            L, Rr = img[:, lo], img[:, hi]; out[:, lo] = L * (1 - wo) + Rr * wo; out[:, hi] = Rr * (1 - wo) + L * wo
        else:
            T, B = img[lo], img[hi]; out[lo] = T * (1 - wo) + B * wo; out[hi] = B * (1 - wo) + T * wo
    return out
if K > 0: t = blend_axis(blend_axis(t, 1), 0)

std0 = t.mean(2).std()
if kc != 1.0:
    mean = t.reshape(-1, 3).mean(0); t = np.clip((t - mean) * kc + mean, 0, 255)
print('휘도 std %.1f → %.1f (대비 ×%.2f; 사냥터 바닥 4~5)' % (std0, t.mean(2).std(), kc))

im = Image.fromarray(np.clip(t, 0, 255).astype(np.uint8), 'RGB')
q = im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
out = '%s/assets/ground_%s.png' % (R, zone); q.save(out, optimize=True)
res = np.array(q.convert('RGB')); mean = res.reshape(-1, 3).mean(0)
print('바닥 %s → %s (%dx%d, 평균색 #%02x%02x%02x, %.1fKB)' % (zone, out, tw, th, *mean.astype(int), os.path.getsize(out) / 1024))

# 검사판 — 2×2 타일 1:1 + 이음새 눈금
tile = q.convert('RGB'); board = Image.new('RGB', (tw * 2, th * 2 + 16), (30, 30, 30))
for i in range(2):
    for j in range(2): board.paste(tile, (i * tw, j * th + 16))
d = ImageDraw.Draw(board)
for x in (tw,): d.line([(x, 16), (x, 24)], fill=(255, 40, 40), width=3); d.line([(x, th * 2 + 8), (x, th * 2 + 16)], fill=(255, 40, 40), width=3)
for y in (th + 16,): d.line([(0, y), (8, y)], fill=(255, 40, 40), width=3); d.line([(tw * 2 - 8, y), (tw * 2, y)], fill=(255, 40, 40), width=3)
d.text((4, 2), '%s 바닥 %dx%d 2x2 타일 — 빨간 눈금이 이음새 자리' % (zone, tw, th), fill=(255, 255, 255))
board.save('%s/review/ground_%s.png' % (R, zone)); print('검사판(2×2 타일) → review/ground_%s.png' % zone)
