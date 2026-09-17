#!/usr/bin/env python3
"""본진 바닥 타일 추출 (v2.94.4) — sheets/ground_hq_<문파>.png → assets/ground_hq_<문파>.png + 검사판.
사용: python hqground.py <문파키> [--period=N|auto] [--vperiod=N|auto] [--cut=joints] [--patch=x,y,w,h | --nopatch] [--patch-src=left] [--k=16] [--contrast=0.7]
  --cut=joints : 어두운 줄눈 격자 시트(소림 석판)는 첫·끝 줄눈 한가운데로 잘라 이음새를 줄눈 안에 넣는다(크로스페이드 k=4)
  --patch-src=left : 워터마크를 왼쪽 띠 복사로(기본은 시트에서 가장 매끈한 같은 크기 창 복사 + 4px 페더)
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
    # 석판 격자처럼 규칙적인 무늬도 상관이 높게 나온다(소림 512 · 0.85). 진짜 복사본은 밀린 그림끼리의 차가
    # 이웃 픽셀끼리의 차보다 작다 — 그 조건을 더한다(개방 1.6 < 2.0 통과, 소림 5.2 > 3.5 탈락).
    nat = np.abs(np.diff(a, axis=axis)).mean()
    ok = []
    for c, p in cand:
        sh = np.abs(a[:, :n - p] - a[:, p:]).mean() if axis == 1 else np.abs(a[:n - p] - a[p:]).mean()
        if sh <= nat: ok.append((c, p))
        else: print('  주기 %d(상관 %.2f) 버림 — 밀린 차 %.2f > 이웃 %.2f (복사가 아니라 규칙 무늬)' % (p, c, sh, nat))
    return (max(ok)[1], max(ok)[0]) if ok else (n, None)
def pick(opt, axis):
    v = opts.get(opt, 'auto')
    if v != 'auto': return int(v), None
    return period(axis)
pw, cw = pick('--period', 1); ph, ch = pick('--vperiod', 0)
print('가로 주기 %s%s · 세로 주기 %s%s' % (pw, ' (상관 %.2f)' % cw if cw else ' (반복 없음)', ph, ' (상관 %.2f)' % ch if ch else ' (반복 없음)'))
if pw < W: print('  좌·우 반쪽 평균차 %.2f — 한 주기(폭 %d)만 쓴다' % (np.abs(a[:, :W - pw] - a[:, pw:]).mean(), pw))
t = a[:ph, :pw].copy(); th, tw = t.shape[:2]

# --cut=joints : 석판·포석처럼 어두운 줄눈 격자가 있는 시트는 크로스페이드가 어긋난 줄눈을 겹쳐 유령 줄을 만든다
# (소림 2×2 검사판). 대신 **첫 줄눈과 끝 줄눈의 한가운데**를 잘라 이음새가 줄눈 안에 들어가게 한다 —
# 위 가장자리는 줄눈 아래 반, 아래 가장자리는 줄눈 위 반이라 맞물리면 온전한 줄눈이 된다.
def joints(lum2d, axis, minsp=24, cover=0.9):
    """어두운 줄눈의 중심 좌표 목록 — 줄 평균이 (평균−0.8·std) 아래인 연속 구간의 중심. 그 중 **전폭 덮임**
    (중심 ±3줄 안에 어두운 픽셀이 있는 열의 비율)이 cover 이상인 것만 돌려준다 — 석판이 가로지르는 잔줄눈(덮임 0.3~0.7)
    에서 자르면 이음새에 석판이 직선으로 잘린다(소림 1차: 62·944). 간격 60 으로 합치면 앞선 잔줄눈이 진짜 줄눈(254·894)을
    먹으니 24 로만 합친다."""
    prof = lum2d.mean(1 - axis); thr = lum2d.mean() - 0.8 * lum2d.std(); dark = prof < thr
    cands = []; i = 0
    while i < len(prof):
        if dark[i]:
            j = i
            while j + 1 < len(prof) and dark[j + 1]: j += 1
            c = (i + j) // 2
            if 10 <= c <= len(prof) - 11 and (not cands or c - cands[-1] >= minsp): cands.append(c)
            i = j + 1
        else: i += 1
    out = []
    for c in cands:
        band = lum2d[max(0, c - 3):c + 4, :] if axis == 0 else lum2d[:, max(0, c - 3):c + 4]
        cv = (band < thr).any(axis=axis).mean()
        out.append((c, round(float(cv), 2)))
    print('  %s 줄눈 후보(중심, 전폭 덮임):' % ('가로' if axis == 0 else '세로'), out)
    return [c for c, cv in out if cv >= cover]
if opts.get('--cut') == 'joints':
    lumt = t.mean(2); rows = joints(lumt, 0); cols = joints(lumt, 1)
    print('전폭 줄눈 줄 y', rows, '· 열 x', cols)
    if len(rows) >= 2 and len(cols) >= 2:
        y0, y1, x0, x1 = rows[0], rows[-1], cols[0], cols[-1]
        t = t[y0:y1, x0:x1].copy(); th, tw = t.shape[:2]
        print('줄눈 한가운데로 자름 → x %d~%d, y %d~%d (%dx%d)' % (x0, x1, y0, y1, tw, th))
        if K > 8: K = 4; print('  크로스페이드는 k=4 로(줄눈 안 이음새)')
    else: print('줄눈이 2줄 미만 — 자르지 않음')

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
        reg = img[y0:, x0:].mean(2); med = np.median(reg); m = reg > med + 30   # 소림 ✦ 는 +40 문턱을 못 넘었다(옅음)
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
    x, y, w, h = patch
    if opts.get('--patch-src') == 'left':
        src = t[y:y + h, x - w:x].copy(); where = '왼쪽 띠'
    else:
        # 왼쪽 띠 복사는 석판 줄눈을 석판 안으로 끌고 온다(소림). 시트에서 **가장 매끈한(휘도 std 최소) 같은 크기 창** 중
        # 평균 밝기가 ✦ 둘레와 10 안인 것을 골라 복사하고, 가장자리 4px 는 페더로 섞는다.
        lt = t.mean(2); ring = np.ones((th, tw), bool); ring[max(0, y - 8):y + h + 8, max(0, x - 8):x + w + 8] = False
        ring[y:y + h, x:x + w] = False; around = lt[max(0, y - 8):y + h + 8, max(0, x - 8):x + w + 8][~ring[max(0, y - 8):y + h + 8, max(0, x - 8):x + w + 8]]
        tgt = lt[max(0, y - 8):y + h + 8, max(0, x - 8):x + w + 8]; tgtm = np.median(tgt)
        best = None
        for yy in range(0, th - h, 4):
            for xx in range(0, tw - w, 4):
                if abs(yy - y) < h and abs(xx - x) < w: continue
                win = lt[yy:yy + h, xx:xx + w]; mu = win.mean()
                if abs(mu - tgtm) > 10: continue
                sd = win.std()
                if best is None or sd < best[0]: best = (sd, xx, yy)
        if best is None: src = t[y:y + h, x - w:x].copy(); where = '왼쪽 띠(매끈한 창 없음)'
        else: src = t[best[2]:best[2] + h, best[1]:best[1] + w].copy(); where = '매끈한 창 (%d,%d) std %.1f' % (best[1], best[2], best[0])
    f = 4; wy = np.minimum(np.arange(h) + 1, np.arange(h)[::-1] + 1); wx = np.minimum(np.arange(w) + 1, np.arange(w)[::-1] + 1)
    m = np.minimum(np.minimum.outer(wy, wx) / float(f), 1.0)[:, :, None]
    t[y:y + h, x:x + w] = t[y:y + h, x:x + w] * (1 - m) + src * m
    print('패치 (%d,%d %dx%d) ← %s 복사, 가장자리 %dpx 페더' % (x, y, w, h, where, f))

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
