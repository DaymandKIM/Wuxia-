"""소림 제자·정예·장로 시트(sheets/sr_*.png) → assets/sr_*_*.png  (v2.95 — gb_disc.py 를 복사해 손본 판)

    python sr_sheet.py sr_disc.png  sr_disc  --body=48 --idle=r0c0,r0c1,r0c2,r0c3 --walk=auto --atk=r2c0,r2c1,r2c2,r2c3 --hit=r3c0 --death=r3c2,r3c3
    python sr_sheet.py sr_elite.png sr_elite --body=50 --blob --idle=b0,b1,b2,b3 ...      # 격자 없이 덩어리 bbox 로
    python sr_sheet.py sr_elder.png sr_elder --body=58 ...
    python sr_sheet.py <시트> <접두어> --blob --map                                          # 덩어리 번호 오버레이만(review/<접두어>_blobs.png)

gb_disc.py 와 다른 점:
  - 컷 키가 r<줄>c<칸>(격자) / b<번호>(덩어리) 로 어느 줄에서든 고를 수 있다 (장로 4줄에서 hit·death 를 섞어 고르려고).
  - 격자 검출이 시트 바깥 테두리를 못 잡으면(장로: 위·아래 줄 없음) 그림 가장자리를 경계로 보탠다.
    한 줄 안에서 칸 폭이 중앙값의 1.6배를 넘으면(장로 2줄: 도포가 세로줄을 덮음) 빠진 세로줄을 그 안에서 가장 어두운 열로 찾아 쪼갠다.
  - --blob: 격자가 아주 불규칙한 시트(정예: 칸이 2~3줄에 걸침)는 마젠타가 아닌 픽셀을 덩어리 라벨링(테두리 줄은 자줏빛이라 배경 판정에 든다)해
    bbox 로 자른다 — CLAUDE.md "그림을 도형으로 가정하지 마라 · 덩어리 라벨링 bbox". 번호는 review/<접두어>_blobs.png 오버레이로 확인.
  - 배율의 기준 높이는 '몸'(가로 12px 이상 차는 줄)만 — 정예는 봉이 머리 위로 솟아 전체 높이가 몸보다 크다.
  - 검은 조각 눈검사판을 review/blackcheck_<접두어>.png 로 따로 만든다(blackcheck.py 는 review/blackcheck.png 하나라 다른 에이전트와 경쟁).
  - death 컷은 전부 solo(부유 반짝이 제거), --solo=키,... 로 더 지정. --decyan=키,... 는 옅은 청록 호를 지운다(정예 atk0 — 축소하면 점만 남는다).
"""
import sys, os, glob, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from foesheet import pack, R

GROUND = (106, 122, 82)       # 죽림 바닥색 — 검사판 배경(흰 배경은 도복 구멍을 못 보여 준다)

def _groups(v):
    g = []
    for i in v:
        if g and i - g[-1][-1] <= 2: g[-1].append(i)
        else: g.append([i])
    return [(int(x[0]), int(x[-1])) for x in g]

def grid_rows(sh):
    """어두운 테두리 줄 → 행 경계(전체 폭) + 행마다 열 경계. 바깥 테두리가 없으면 그림 가장자리를 보탠다.
    한 칸이 중앙값 1.6배보다 넓으면 그 안에서 가장 어두운 열(줄이 그림에 덮인 것)로 쪼갠다."""
    H, W = sh.shape[:2]
    lum = sh.sum(-1) / 3; dark = lum < 70
    rl = _groups(np.where(dark.mean(1) > 0.8)[0])
    if not rl or rl[0][0] > 4: rl = [(-1, -1)] + rl
    if rl[-1][1] < H - 5: rl = rl + [(H, H)]
    cols = []
    for i in range(len(rl) - 1):
        y0, y1 = rl[i][1] + 1, rl[i + 1][0]
        cl = _groups(np.where(dark[y0:y1].mean(0) > 0.8)[0])
        if not cl or cl[0][0] > 4: cl = [(-1, -1)] + cl
        if cl[-1][1] < W - 5: cl = cl + [(W, W)]
        gaps = [cl[j + 1][0] - cl[j][1] for j in range(len(cl) - 1)]
        med = float(np.median(gaps))
        fixed = [cl[0]]
        for j in range(len(cl) - 1):
            g = cl[j + 1][0] - cl[j][1]
            if g > med * 1.6:
                n = int(round(g / med)); x0 = cl[j][1]
                for k in range(1, n):
                    xe = int(round(x0 + g * k / n)); lo, hi = xe - 6, xe + 6
                    prof = dark[y0:y1, lo:hi].mean(0); xs = lo + int(np.argmax(prof))
                    fixed.append((xs, xs))
            fixed.append(cl[j + 1])
        cols.append(fixed)
    return rl, cols

def cut(sh, bg, y0, y1, x0, x1, inset=3):
    """foesheet._cell 의 칸 안 처리 그대로(테두리 고리 버림·5% 미만 조각 버림·물든 가장자리 색만 고침), 영역만 직접 받는다."""
    y0 += inset; y1 -= inset; x0 += inset; x1 -= inset
    sub = sh[y0:y1, x0:x1].copy()
    m = ~bg[y0:y1, x0:x1]
    lab, n = ndimage.label(m); keep = np.zeros_like(m)
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        ring = bw > sub.shape[1] * 0.85 and bh > sub.shape[0] * 0.85 and len(ys) < bw * bh * 0.3
        if len(ys) < 40 or ring: continue
        keep[lab == i] = 1
    er = ndimage.binary_erosion(keep, iterations=1)
    lab2, n2 = ndimage.label(er)
    if n2:
        sizes = ndimage.sum(er, lab2, range(1, n2 + 1))
        big = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.05])
        keep = ndimage.binary_dilation(big, iterations=2) & keep
    rim = keep & ~ndimage.binary_erosion(keep, iterations=3)
    tint = rim & (sub[..., 0] > sub[..., 1] + 10) & (sub[..., 2] > sub[..., 1] + 10)
    sub[..., 0][tint] = np.minimum(sub[..., 0][tint], sub[..., 1][tint] + 18)
    sub[..., 2][tint] = np.minimum(sub[..., 2][tint], sub[..., 1][tint] + 18)
    return np.dstack([sub, np.where(keep, 255, 0)]).astype(np.uint8)

def blobs(sh, bg, merge=10, minpx=400):
    """마젠타가 아닌 픽셀을 merge px 팽창해 라벨링 → 원본 픽셀의 bbox 목록(위→아래 띠, 왼→오른 순)."""
    m = ~bg
    big = ndimage.binary_dilation(m, iterations=merge)
    lab, n = ndimage.label(big)
    out = []
    for i in range(1, n + 1):
        sel = (lab == i) & m
        if sel.sum() < minpx: continue
        ys, xs = np.where(sel)
        out.append((int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1, int(sel.sum())))
    # 정렬: 아래변 기준 띠(높이 1/3 단위) → x
    H = sh.shape[0]
    out.sort(key=lambda b: (int(b[1] // (H / 3.0 + 1)), b[2]))
    return out

def blobmap(sh, bl, prefix):
    im = Image.fromarray(sh.astype(np.uint8), 'RGB'); d = ImageDraw.Draw(im)
    for i, (y0, y1, x0, x1, n) in enumerate(bl):
        d.rectangle((x0, y0, x1 - 1, y1 - 1), outline=(0, 255, 255))
        d.text((x0 + 2, y0 + 2), 'b%d' % i, fill=(255, 255, 255)); d.text((x0 + 3, y0 + 3), 'b%d' % i, fill=(0, 0, 0))
    p = os.path.join(R, 'review', prefix + '_blobs.png'); im.save(p); print('덩어리 지도 →', p)
    for i, b in enumerate(bl): print('  b%-2d y %d~%d x %d~%d (%dx%d) px %d' % (i, b[0], b[1], b[2], b[3], b[3] - b[2], b[1] - b[0], b[4]))

def solo(rgba, pad=6):
    """최대 덩어리와 그 pad px 안에 닿는 덩어리만 남긴다(쓰러짐 컷의 떠 있는 반짝이 제거)."""
    m = rgba[..., 3] > 0
    lab, n = ndimage.label(m)
    if n <= 1: return rgba
    sizes = ndimage.sum(m, lab, range(1, n + 1)); big = lab == (int(np.argmax(sizes)) + 1)
    near = ndimage.binary_dilation(big, iterations=pad)
    keep = np.zeros_like(m)
    for i in range(1, n + 1):
        if (near & (lab == i)).any(): keep |= lab == i
    out = rgba.copy(); out[~keep] = 0
    return out

def shrink(rgba, scale):
    """축소 — 엣지 확장(투명 픽셀을 가장 가까운 그림 픽셀 색으로 채움) 뒤 RGB·알파를 따로 LANCZOS, 알파 문턱 110(gb_disc 와 같다)."""
    al = rgba[..., 3] > 0
    _, (iy, ix) = ndimage.distance_transform_edt(~al, return_indices=True)
    rgb = rgba[..., :3][iy, ix]
    w, h = max(1, round(rgba.shape[1] * scale)), max(1, round(rgba.shape[0] * scale))
    c = np.array(Image.fromarray(rgb, 'RGB').resize((w, h), Image.LANCZOS))
    a = np.array(Image.fromarray((al * 255).astype(np.uint8), 'L').resize((w, h), Image.LANCZOS))
    out = np.dstack([c, np.where(a >= 110, 255, 0)]).astype(np.uint8)
    out[out[..., 3] == 0] = 0
    al2 = out[..., 3] > 0; rim = al2 & ~ndimage.binary_erosion(al2, iterations=1)
    r_, g_, b_ = out[..., 0].astype(int), out[..., 1].astype(int), out[..., 2].astype(int)
    t = rim & (r_ > g_ + 15) & (b_ > g_ + 15)
    out[..., 0][t] = np.minimum(r_[t], g_[t] + 12); out[..., 2][t] = np.minimum(b_[t], g_[t] + 12)
    return out

def body_height(a, minw=12):
    """가로 minw px 이상 차는 줄만 몸으로 본다 — 봉(6px) 이 머리 위로 솟은 컷에서 봉을 빼고 잰다."""
    rows = (a[..., 3] > 0).sum(1); ys = np.where(rows >= minw)[0]
    return int(ys.max() + 1 - ys.min())

def legmask(a, frac=0.3, W=160, H=160):
    """다리(아래 30%) 마스크를 바닥·다리 무게중심 기준 공통 캔버스에 얹는다 — 컷마다 폭이 달라도 IoU 를 잴 수 있게."""
    al = a[..., 3] > 0; ys, xs = np.where(al)
    cut_ = ys.max() - (ys.max() - ys.min()) * frac
    m = al.copy(); m[:int(cut_)] = False
    sel = ys >= cut_; cx = xs[sel].mean()
    can = np.zeros((H, W), bool); dx = int(round(W / 2 - cx)); dy = H - 1 - ys.max()
    yy, xx = np.where(m); ok = (xx + dx >= 0) & (xx + dx < W) & (yy + dy >= 0)
    can[yy[ok] + dy, xx[ok] + dx] = True
    return can

def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())

def pick_walk(frames, n=4):
    import itertools
    keys = list(frames); ms = [legmask(frames[k]) for k in keys]
    best = None
    for comb in itertools.combinations(range(len(keys)), n):
        adj = [iou(ms[comb[i]], ms[comb[(i + 1) % n]]) for i in range(n)]
        if max(adj) > 0.9: continue
        score = -np.mean(adj) + 0.5 * min(adj)
        if best is None or score > best[0]: best = (score, comb, adj)
    return [keys[i] for i in best[1]], best[2]

def ioumat(frames):
    keys = list(frames); ms = [legmask(frames[k]) for k in keys]
    print('   ' + ' '.join('%5s' % k[-4:] for k in keys))
    for i, k in enumerate(keys):
        print('%5s ' % k[-4:] + ' '.join('%5.2f' % iou(ms[i], ms[j]) for j in range(len(keys))))

def review(prefix, names, cols=4, S=4):
    ims = [(n, Image.open(os.path.join(R, 'assets', '%s_%s.png' % (prefix, n)))) for n in names]
    W, H = ims[0][1].size; rows = (len(ims) + cols - 1) // cols
    c = Image.new('RGB', (cols * (W * S + 8) + 8, rows * (H * S + 20) + 8), GROUND); d = ImageDraw.Draw(c)
    for i, (n, im) in enumerate(ims):
        x = 8 + (i % cols) * (W * S + 8); y = 8 + (i // cols) * (H * S + 20); big = im.resize((W * S, H * S), Image.NEAREST)
        d.rectangle((x - 1, y + 15, x + W * S, y + 16 + H * S), outline=(60, 70, 50)); c.paste(big, (x, y + 16), big)
        d.line((x, y + 16 + H * S - 1, x + W * S, y + 16 + H * S - 1), fill=(230, 200, 90))
        d.text((x, y), '%s %dx%d' % (n, W, H), fill=(255, 255, 255))
    p = os.path.join(R, 'review', 'review-%s.png' % prefix); c.save(p); print('검사판 →', p)

def blackcheck(prefix, names, S=7, PAD=10):
    """blackcheck.py 와 같은 흰 배경 확대판 — 출력만 review/blackcheck_<접두어>.png."""
    WHITE = (245, 245, 245); rows = []
    for nm in names:
        p = os.path.join(R, 'assets', '%s_%s.png' % (prefix, nm))
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGBA'); big = im.resize((im.width * S, im.height * S), Image.NEAREST)
        c = Image.new('RGBA', big.size, WHITE + (255,)); c.alpha_composite(big); rows.append((nm, c))
    W = max(c.width for _, c in rows) + PAD * 2; H = sum(c.height for _, c in rows) + PAD * (len(rows) + 1) + 22 * len(rows)
    sheet = Image.new('RGB', (W, H), WHITE); d = ImageDraw.Draw(sheet); y = PAD
    for nm, c in rows:
        d.text((PAD, y), nm, fill=(20, 20, 20)); y += 22; sheet.paste(c, (PAD, y), c); y += c.height + PAD
    p = os.path.join(R, 'review', 'blackcheck_%s.png' % prefix); sheet.save(p); print('검은조각 눈검사판 →', p)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict((a[2:].split('=', 1) + ['1'])[:2] for a in sys.argv[1:] if a.startswith('--'))
    sheet, prefix = args[0], args[1]
    body_h = int(opts.get('body', 48))
    os.makedirs(os.path.join(R, 'review'), exist_ok=True)

    sh = np.array(Image.open(os.path.join(R, 'sheets', sheet)).convert('RGB')).astype(int)
    r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)

    raw = {}
    if 'blob' in opts:
        bl = blobs(sh, bg, merge=int(opts.get('merge', 10)))
        blobmap(sh, bl, prefix)
        if 'map' in opts: return
        for i, (y0, y1, x0, x1, n) in enumerate(bl):
            raw['b%d' % i] = cut(sh, bg, y0 - 4, y1 + 4, x0 - 4, x1 + 4, inset=0)
    else:
        rl, cols = grid_rows(sh)
        print('행 경계', rl); [print(' %d줄 열 %d칸' % (i + 1, len(cl) - 1), cl) for i, cl in enumerate(cols)]
        for cy, cl in enumerate(cols):
            for cx in range(len(cl) - 1):
                a = cut(sh, bg, rl[cy][1] + 1, rl[cy + 1][0], cl[cx][1] + 1, cl[cx + 1][0])
                if (a[..., 3] > 0).sum() < 40: print(' %d줄 %d칸 빈 칸' % (cy + 1, cx)); continue
                raw['r%dc%d' % (cy, cx)] = a
        if 'map' in opts:
            for k, a in raw.items():
                ys, xs = np.where(a[..., 3] > 0); print('  %s 그림 %dx%d px %d' % (k, xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min(), len(ys)))
            return

    def idx(s): return s.split(',')
    sel = {'idle': idx(opts['idle']), 'walk': opts['walk'], 'atk': idx(opts['atk']), 'hit': idx(opts['hit']), 'death': idx(opts['death'])}
    solos = set(sel['death']) | set(idx(opts.get('solo', '')) if opts.get('solo') else [])
    for k in (idx(opts['decyan']) if opts.get('decyan') else []):          # 옅은 청록 호(정예 봉 휘두르기) — 축소하면 점만 남아 떠 보인다
        a = raw[k]; r_, g_, b_ = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
        cy = (b_ > r_ + 20) & (b_ > 150) & (g_ > 120); a[cy] = 0        # 옅은 라벤더~흰 (190,180,255) 계열; raw[k] = solo(a)
        print(' %s 청록 호 픽셀 %d 제거' % (k, cy.sum()))
    for k in solos: raw[k] = solo(raw[k])

    ref = opts.get('ref', sel['idle'][0])
    bh0 = body_height(raw[ref], int(opts.get('bodymin', 12)))
    scale = body_h / bh0
    print('%s %s 몸높이 %d → 배율 %.3f' % (sheet, ref, bh0, scale))
    small = {k: shrink(v, scale) for k, v in raw.items()}

    out = {}
    for i, k in enumerate(sel['idle']): out['idle%d' % i] = small[k]
    if sel['walk'].startswith('auto'):
        pool = sel['walk'][5:].split(',') if ':' in sel['walk'] else [k for k in small if k.startswith('r1c')]
        ioumat({k: small[k] for k in pool})
        wk, adj = pick_walk({k: small[k] for k in pool})
        print('걷기 사이클', wk, '이웃 IoU', ['%.2f' % v for v in adj])
    else:
        wk = idx(sel['walk']); ioumat({k: small[k] for k in wk})
    for i, k in enumerate(wk): out['walk%d' % i] = small[k]
    for i, k in enumerate(sel['atk']): out['atk%d' % i] = small[k]
    out['hit'] = small[sel['hit'][0]]
    for i, k in enumerate(sel['death']): out['death%d' % i] = small[k]

    for f in glob.glob(os.path.join(R, 'assets', prefix + '_*.png')): os.remove(f)
    W, H = pack(out, prefix)
    spec = {}
    for k, a in out.items():
        ys, xs = np.where(a[..., 3] > 0)
        spec[k] = dict(w=int(xs.max() + 1 - xs.min()), h=int(ys.max() + 1 - ys.min()), body=body_height(a, 6))
    body = [spec[k] for k in spec if k.startswith(('idle', 'walk'))]
    print('규격: 캔버스 %dx%d · 몸(대기·걷기) 폭 %d~%d 높이 %d~%d' % (W, H, min(s['w'] for s in body), max(s['w'] for s in body),
          min(s['h'] for s in body), max(s['h'] for s in body)))
    for k, s in spec.items(): print('  %-8s 그림 %3dx%3d (몸 높이 %d)' % (k, s['w'], s['h'], s['body']))
    json.dump(dict(canvas=[W, H], frames=spec, sel=dict(sel, walk=wk), scale=scale), open(os.path.join(R, 'review', prefix + '_specs.json'), 'w'), indent=1)
    review(prefix, list(out))
    blackcheck(prefix, ['idle0', 'walk0', 'atk1', 'atk2', 'hit', 'death1'])

if __name__ == '__main__':
    main()
