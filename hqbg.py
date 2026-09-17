#!/usr/bin/env python3
"""본진 원경 한 벌 추출 (v2.94.4) — sheets/bg_hq_<문파>.png → assets/bg_hq_<문파>.png + 검사판.
사용: python hqbg.py <문파키> [--patch=x,y,w,h | --nopatch] [--pad=48] [--crop-top=N] [--ground=#rrggbb]
  1. 제미나이 ✦ 워터마크 자동 검출(아래 균일 땅 띠 바로 위 우하단, 주변보다 밝은 덩어리) → --patch 좌표.
     자동이 틀리면 --patch 로 직접 준다. --nopatch 는 메우지 않는다.
  2. bg_extract.py hq_<k> --patch=… --pad=N   (띠 제거·땅 덧대기·팔레트 디더 저장)
  3. bg_fix.py hq_<k> [--crop-top=N]          (딱 한 번 — 블렌드가 누적되니 다시 돌리려면 1부터)
  4. 결과 검사: 첫 불투명 줄 테두리·아래 균일 띠 높이·1px 이상줄·좌우 이음새·띠 색 vs 땅색(DUEL.hqGround)
  5. 검사판 review/bg_hq_<k>.png — 땅색(바닥 텍스처가 있으면 그것) 위에 결과를 얹고, 게임과 같은 디졸브를
     흉내 낸 줄과 흉내 안 낸 줄을 위아래로. 빨간 선 = 디졸브 구간, 노란 선 = 좌우 이음새(1.5장 타일링).
땅색은 src/00-data.js 의 DUEL.hqGround 에서 읽는다(읽기만 한다). 없으면 --ground.
"""
from PIL import Image, ImageDraw
import numpy as np, os, sys, re, subprocess

R = os.path.dirname(os.path.abspath(__file__))
key = sys.argv[1]; zone = 'hq_' + key
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in sys.argv[2:] if a.startswith('--'))
pad = int(opts.get('--pad', 48))

def hex2rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
ground = opts.get('--ground')
if not ground:
    src = open(os.path.join(R, 'src/00-data.js'), encoding='utf-8').read()
    m = re.search(r'DUEL\.hqGround\s*=\s*\{([^}]*)\}', src)
    m2 = re.search(r'%s\s*:\s*[\'"](#[0-9a-fA-F]{6})' % key, m.group(1)) if m else None
    ground = m2.group(1) if m2 else '#6e6349'
gc = hex2rgb(ground)

sheet = '%s/sheets/bg_%s.png' % (R, zone)
a = np.array(Image.open(sheet).convert('RGB')).astype(int)
H, W, _ = a.shape
lum = a.mean(2)

# ── 1. 워터마크 자동 검출 ──
def band_top():
    # bg_extract 와 같은 규칙으로 아래 균일 띠 시작줄
    c0, c1 = int(W * 0.05), int(W * 0.95); base = a[H - 1, c0:c1].mean(0); t = H
    while t > int(H * 0.6):
        row = a[t - 1, c0:c1]
        if row.std(0).mean() > 14 or np.abs(row.mean(0) - base).max() > 14: break
        t -= 1
    return t
bt = band_top()
patch = None
if '--patch' in opts: patch = tuple(map(int, opts['--patch'].split(',')))
elif '--nopatch' not in opts:
    y0, y1, x0, x1 = max(0, bt - 70), bt, max(0, W - 160), W
    reg = lum[y0:y1, x0:x1]; med = np.median(reg)
    m = reg > med + 25
    # 밝은 픽셀을 연결 성분으로 묶어 가장 큰 덩어리만 — 소림 시트에선 밝은 나무·산 조각까지 묶여 111×58 로 넓게
    # 잡아 패치가 과했다. ✦ 는 25~50px 의 한 덩어리다.
    try:
        from scipy import ndimage
        lab, nn = ndimage.label(m)
        if nn:
            sizes = ndimage.sum(m, lab, range(1, nn + 1)); m = lab == (int(np.argmax(sizes)) + 1)
    except ImportError: pass
    ys, xs = np.where(m)
    if len(xs) >= 30 and xs.max() - xs.min() >= 12 and ys.max() - ys.min() >= 12:
        px0, px1, py0, py1 = xs.min() + x0 - 3, xs.max() + x0 + 4, ys.min() + y0 - 3, ys.max() + y0 + 4
        patch = (px0, py0, px1 - px0, py1 - py0)
        print('워터마크 자동 검출: 밝은 픽셀 %d개 x %d~%d y %d~%d → --patch=%d,%d,%d,%d' % (len(xs), xs.min() + x0, xs.max() + x0, ys.min() + y0, ys.max() + y0, *patch))
    else:
        print('워터마크 못 찾음(밝은 픽셀 %d개) — 메우지 않는다. 있으면 --patch 로' % len(xs))
print('시트 %dx%d, 아래 균일 띠 %d줄(y %d~), 띠 평균색 #%02x%02x%02x vs 땅색 %s (차 %s)' % (
    W, H, H - bt, bt, *a[bt:].reshape(-1, 3).mean(0).astype(int), ground, (a[bt:].reshape(-1, 3).mean(0) - gc).round(0)))

# ── 2·3. 추출 → 손질 ──
cmd = [sys.executable, os.path.join(R, 'bg_extract.py'), zone, '--pad=%d' % pad]
if patch: cmd.append('--patch=%d,%d,%d,%d' % patch)
print('$', ' '.join(cmd)); subprocess.run(cmd, check=True, cwd=R)
cmd = [sys.executable, os.path.join(R, 'bg_fix.py'), zone] + (['--crop-top=' + opts['--crop-top']] if '--crop-top' in opts else [])
print('$', ' '.join(cmd)); subprocess.run(cmd, check=True, cwd=R)

# ── 4. 검사 ──
out = '%s/assets/bg_%s.png' % (R, zone)
b = np.array(Image.open(out).convert('RGBA')).astype(int); Hb, Wb = b.shape[:2]
al = b[:, :, 3].mean(1); L = b[:, :, :3].mean(2).mean(1)
top = int(np.argmax(al > 200))
print('결과 %dx%d, 첫 불투명 줄 y=%d 밝기 %.0f (다음 3줄 %.0f) → %s' % (Wb, Hb, top, L[top], L[top + 1:top + 4].mean(), '테두리 선 의심' if abs(L[top] - L[top + 1:top + 4].mean()) > 8 else '정상'))
base = L[-1]; n = 0
for y in range(Hb - 1, -1, -1):
    if abs(L[y] - base) <= 3: n += 1
    else: break
bandc = b[Hb - n:, :, :3].reshape(-1, 3).mean(0)
print('아래 균일 띠 %d줄, 색 #%02x%02x%02x vs 땅색 %s (차 %s)' % (n, *bandc.astype(int), ground, (bandc - gc).round(0)))
odd = [y for y in range(top + 1, Hb - 1) if abs(L[y] - (L[y - 1] + L[y + 1]) / 2) > 20]
print('1px 이상줄(위아래 평균과 20↑ 차):', odd or '없음')
op = b[:, :, 3] > 0
both = op[:, 0] & op[:, -1]
print('좌우 끝열 차(불투명 줄) %.1f' % np.abs(b[both, 0, :3] - b[both, -1, :3]).mean())

# ── 5. 검사판 ──
tex = '%s/assets/ground_%s.png' % (R, zone)
def floor(w, h):
    im = Image.new('RGB', (w, h), gc)
    if os.path.exists(tex):
        t = Image.open(tex).convert('RGB'); ov = Image.new('RGB', (w, h))
        for y in range(0, h, t.height):
            for x in range(0, w, t.width): ov.paste(t, (x, y))
        im = Image.blend(im, ov, 0.9)     # GROUNDTEX.a 0.9 와 같게
    return im
res = Image.fromarray(b.astype(np.uint8), 'RGBA')
tw = int(Wb * 1.5); rh = Hb + 60; margin = 40
board = Image.new('RGB', (tw, rh * 2 + margin * 3), (30, 30, 30)); d = ImageDraw.Draw(board)
def tile(dst, y, img):
    for x in (0, Wb): dst.paste(img, (x, y), img)
# 위: 디졸브 없이
f1 = floor(tw, rh); tile(f1, 0, res); board.paste(f1, (0, margin))
# 아래: 게임 디졸브 흉내 — F = max(0.14·H, 띠+16), 48 계단
F = min(Hb - 2, max(8, round(Hb * 0.14), n + 16)); solid = Hb - F; steps = 48
f2 = floor(tw, rh)
sol = res.crop((0, 0, Wb, solid)); tile(f2, 0, sol)
for i in range(min(steps, F)):
    a0 = solid + round(i * F / steps); a1 = solid + round((i + 1) * F / steps)
    if a1 <= a0: continue
    s = res.crop((0, a0, Wb, a1)); al_ = s.split()[3].point(lambda v: int(v * (1 - (i + 0.5) / steps)))
    for x in (0, Wb): f2.paste(s, (x, a0), al_)
board.paste(f2, (0, margin * 2 + rh))
for yy in (margin, margin * 2 + rh):
    d.line([(Wb, yy), (Wb, yy + rh)], fill=(255, 220, 0), width=1)           # 이음새
    d.line([(0, yy + solid), (tw, yy + solid)], fill=(255, 40, 40), width=1)  # 디졸브 시작
    d.line([(0, yy + Hb), (tw, yy + Hb)], fill=(255, 40, 40), width=1)        # 그림 끝
    d.line([(0, yy + Hb - n), (tw, yy + Hb - n)], fill=(80, 200, 255), width=1)  # 균일 띠 윗변
d.text((6, 4), '%s 원경 — 위: 디졸브 없음 / 아래: 게임 디졸브 흉내(F=%dpx). 노랑=좌우 이음새, 빨강=디졸브 구간, 하늘=균일 띠 윗변(%d줄). 땅색 %s' % (zone, F, n, ground), fill=(255, 255, 255))
board.save('%s/review/bg_%s.png' % (R, zone)); print('검사판 → review/bg_%s.png' % zone)
