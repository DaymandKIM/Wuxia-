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
  - v2.95.2 (6.5등신 재작업 시트 — 개방 gb_disc 3줄·소림 sr_disc 4줄):
      --walk=auto:r1c0,r1c1,r1c2,r1c3   걷기 후보를 제한(개방 2줄은 걷기 4칸+공격 4칸)
      --inset=위,아래,왼,오른            칸 안쪽 여백(기본 3) — 맨 아래 줄 테두리가 한 줄이면 아래 1 로(발끝이 3px 안에 있다)
      --rowref=r1:r1c0                  줄마다 배율 기준 컷(개방 2줄 인물이 1줄보다 9% 크게 그려짐 — 키로 통일)
      --mend=r2c0,r2c1                  위 테두리 띠에 덮인 머리끝 복원(mend_top)
      격자: 넓은 칸 안의 옅은 줄(lum<110 75% 이상)을 균등 분할보다 먼저 쓴다 — 다시 저장된 시트는 줄이 lum 73 으로 dark(<70) 판정을 살짝 넘긴다.
    예: python sr_sheet.py gb_disc.png gb_disc --body=48 --idle=r0c0,r0c1,r0c2,r0c3 --walk=auto:r1c0,r1c1,r1c2,r1c3 --atk=r1c4,r1c5,r1c6,r1c7 \
          --hit=r2c0 --death=r2c2,r2c3 --mend=r2c0,r2c1 --inset=3,1,3,3 --rowref=r1:r1c0
        python sr_sheet.py sr_disc.png sr_disc --body=48 --idle=r0c0,r0c1,r0c2,r0c3 --walk=auto --atk=r2c1,r2c3,r2c4,r2c6 --hit=r3c0 --death=r3c2,r3c3 --inset=3,1,3,3
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

def grid_rows(sh, nosplit=False, darklv=70):
    """어두운 테두리 줄 → 행 경계(전체 폭) + 행마다 열 경계. 바깥 테두리가 없으면 그림 가장자리를 보탠다.
    한 칸이 중앙값 1.6배보다 넓으면 그 안에서 가장 어두운 열(줄이 그림에 덮인 것)로 쪼갠다.
    nosplit=True 면 그 쪼개기를 끄고 검출한 줄만 믿는다 — 칸 폭이 원래 들쭉날쭉한 시트(무당 정예: 좁은 칸 101 · 내지름 칸 237)는
    넓은 칸이 진짜 한 칸이라 쪼개면 프레임이 두 동강 난다(CLAUDE.md "칸은 프레임 경계가 아니다"). v2.95.3"""
    H, W = sh.shape[:2]
    lum = sh.sum(-1) / 3; dark = lum < darklv       # --dark=N: 시트마다 테두리 줄 밝기가 다르다(무당 장로는 자주 줄이 lum 78~120 이라 70 으론 한 줄도 안 잡힌다)
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
        faintd = (lum[y0:y1] < 110).mean(0)          # 옅은 줄용 — 다시 저장된 시트는 줄 밝기가 70을 살짝 넘는다(소림 수습 x=512 lum 73, v2.95.2)
        def split(a, b):
            """a(왼 줄 오른끝)~b(오른 줄 왼끝) 사이가 칸 중앙값 1.6배보다 넓으면 안의 줄을 찾는다.
            먼저 옅은 줄(lum<110 이 75% 이상인 열)을 찾고 — 그것이 진짜 경계 — 남은 틈이 여전히 넓으면 재귀.
            옅은 줄도 없으면 균등 분할 자리 ±6 에서 가장 어두운 열(장로 2줄: 도포가 줄을 덮음)."""
            g = b - a
            if g <= med * 1.6: return []
            n = int(round(g / med)); lo, hi = a + int(med * 0.5), b - int(med * 0.5)
            faint = _groups(np.where(faintd[lo:hi] > 0.75)[0] + lo)   # 0.4 는 인물 윤곽 열까지 잡았다
            if faint:
                pts = [(a, a)] + faint + [(b, b)]; out = []
                for q in range(len(pts) - 1):
                    out += split(pts[q][1], pts[q + 1][0])
                    if q + 1 < len(pts) - 1: out.append(pts[q + 1])
                return out
            out = []
            for k in range(1, n):
                xe = int(round(a + g * k / n)); l2, h2 = xe - 6, xe + 6
                prof = lum[y0:y1, l2:h2].mean(0); xs = l2 + int(np.argmin(prof))
                out.append((xs, xs))
            return out
        if nosplit:
            cols.append(cl); continue
        fixed = [cl[0]]
        for j in range(len(cl) - 1):
            fixed += split(cl[j][1], cl[j + 1][0]); fixed.append(cl[j + 1])
        cols.append(fixed)
    return rl, cols

def cut(sh, bg, y0, y1, x0, x1, inset=3):
    """foesheet._cell 의 칸 안 처리 그대로(테두리 고리 버림·5% 미만 조각 버림·물든 가장자리 색만 고침), 영역만 직접 받는다.
    inset 은 한 값(네 변 같음) 또는 (위, 아래, 왼, 오른) — 개방 시트 3줄은 아래 테두리가 한 줄이라 발끝이 3px 안에 있다(v2.95.2)."""
    t, b_, l, r_ = (inset,) * 4 if isinstance(inset, int) else inset
    y0 += t; y1 -= b_; x0 += l; x1 -= r_
    sub = sh[y0:y1, x0:x1].copy()
    m = ~bg[y0:y1, x0:x1]
    return finish(sub, m)

def finish(sub, m):
    lab, n = ndimage.label(m); keep = np.zeros_like(m)
    H_, W_ = sub.shape[:2]
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        # 테두리 고리: 칸을 가득 채우면서 속이 빈 것. 단, "칸만큼 크고 성기다"만 보면 칸을 가로지르는 그림도 걸린다
        # (v2.95.3 무당 정예 내지름 칸 237x137: 검을 쭉 뻗은 인물이 고리로 몰려 통째로 버려졌다) —
        # 그래서 제 픽셀의 60% 이상이 칸 가장자리 8px 안에 있을 때만 고리로 본다.
        ring = bw > W_ * 0.85 and bh > H_ * 0.85 and len(ys) < bw * bh * 0.3
        if ring:
            edge = (xs < 8) | (xs >= W_ - 8) | (ys < 8) | (ys >= H_ - 8)
            ring = edge.mean() > 0.6
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

def mend_top(sh, bg, rl, cl, cy, cx, inset=3, ext=14):
    """위 테두리 띠에 덮인 머리끝 복원(v2.95.2, 개방 수습제자 3줄 피격·비틀 — 머리카락이 띠를 지나 윗줄 칸 바닥에 조각으로 남는다).
    CLAUDE.md "가로 줄 띠에 걸친 머리·발은 되살린다": 칸 위로 ext px 를 더 잘라 붙이고, 띠 줄은 위·아래 3줄이 다 그림인 열만 다리로 남겨
    위·아래 색을 선형으로 섞어 채운다(나머지 띠 픽셀은 배경으로). 다리로 이어진 조각만 살아남고, 띠 위에만 있는 조각(윗줄 인물의 발)은 버린다."""
    t, b_, l, r_ = (inset,) * 4 if isinstance(inset, int) else inset
    yb0, yb1 = rl[cy]                                  # 띠 줄(포함)
    y0 = max(0, yb0 - ext); y1 = rl[cy + 1][0] - b_; x0 = cl[cx][1] + 1 + l; x1 = cl[cx + 1][0] - r_
    sub = sh[y0:y1, x0:x1].copy(); m = ~bg[y0:y1, x0:x1]
    b0, b1 = yb0 - y0, yb1 - y0
    above = m[max(0, b0 - 3):b0].any(0); below = m[b1 + 1:b1 + 4].any(0)
    bridge = above & below
    m[b0:b1 + 1] = bridge[None, :]
    ca, cb = sub[b0 - 1].astype(float), sub[b1 + 1].astype(float)
    for i, yy in enumerate(range(b0, b1 + 1)):
        w = (i + 1) / (b1 - b0 + 2)
        sub[yy] = np.where(bridge[:, None], (ca * (1 - w) + cb * w).round(), np.array([255, 0, 255]))
    out = finish(sub, m)
    al = out[..., 3] > 0; lab, n = ndimage.label(al)
    for i in range(1, n + 1):
        ys = np.where(lab == i)[0]
        if ys.max() <= b1: out[lab == i] = 0                 # 띠 위에만 있는 조각
    print(' %s 띠 위 머리 복원: 다리 %d열, 위 조각 %d px' % ('r%dc%d' % (cy, cx), int(bridge.sum()), int((out[:b0, :, 3] > 0).sum())))
    return out

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

def pick_side(rgba, side, pad=6):
    """한 칸에 인물이 둘 들어 있을 때(화산 수습 4줄 첫 칸: 피격 2연속) 왼쪽('L')/오른쪽('R') 것만 남긴다. v2.95.3
    큰 덩어리(최대의 20% 이상)들 중 요청한 쪽 끝의 것을 고르고, 그 pad px 안에 닿는 조각(검·머리끈)을 같이 남긴다."""
    m = rgba[..., 3] > 0
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n <= 1: return rgba
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    big = [i + 1 for i, sz in enumerate(sizes) if sz > sizes.max() * 0.2]
    cx = {i: float(np.where(lab == i)[1].mean()) for i in big}
    tgt = min(big, key=lambda i: cx[i]) if side.upper().startswith('L') else max(big, key=lambda i: cx[i])
    near = ndimage.binary_dilation(lab == tgt, iterations=pad)
    keep = np.zeros_like(m)
    for i in range(1, n + 1):
        if (near & (lab == i)).any(): keep |= lab == i
    out = rgba.copy(); out[~keep] = 0
    print(' %s쪽 인물만 남김: 덩어리 %d → %d px' % (side, n, int(keep.sum())))
    return out

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
        rl, cols = grid_rows(sh, nosplit='nosplit' in opts, darklv=int(opts.get('dark', 70)))
        # --nocol=r2:37;158;162,r3:40 — 잘못 잡힌 세로줄 버리기. 어두운 세로 물건(아미 장로 석장·고리)이 칸 테두리로 잡힌다
        # (문턱을 낮추면 이번엔 진짜 테두리를 놓친다 — 시트마다 줄 밝기가 달라서. v2.95.3)
        for it in (opts['nocol'].split(',') if opts.get('nocol') else []):
            rk, xs_ = it.split(':'); ri = int(rk[1:]); drops = [int(v) for v in xs_.split(';')]
            cols[ri] = [g for j, g in enumerate(cols[ri])
                        if j in (0, len(cols[ri]) - 1) or not any(abs(g[0] - x) <= 3 for x in drops)]
            print(' %s줄 세로줄 %s 버림 → %d칸' % (rk, drops, len(cols[ri]) - 1))
        print('행 경계', rl); [print(' %d줄 열 %d칸' % (i + 1, len(cl) - 1), cl) for i, cl in enumerate(cols)]
        inset = tuple(int(v) for v in opts['inset'].split(',')) if 'inset' in opts else 3      # --inset=위,아래,왼,오른
        mend = set(opts['mend'].split(',')) if opts.get('mend') else set()                       # --mend=r2c0,... 띠 위 머리 복원
        for cy, cl in enumerate(cols):
            for cx in range(len(cl) - 1):
                k = 'r%dc%d' % (cy, cx)
                a = mend_top(sh, bg, rl, cols[cy], cy, cx, inset) if k in mend else cut(sh, bg, rl[cy][1] + 1, rl[cy + 1][0], cl[cx][1] + 1, cl[cx + 1][0], inset)
                if (a[..., 3] > 0).sum() < 40: print(' %d줄 %d칸 빈 칸' % (cy + 1, cx)); continue
                raw['r%dc%d' % (cy, cx)] = a
        if 'map' in opts:
            for k, a in raw.items():
                ys, xs = np.where(a[..., 3] > 0); print('  %s 그림 %dx%d px %d' % (k, xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min(), len(ys)))
            return

    def idx(s): return s.split(',')
    sel = {'idle': idx(opts['idle']), 'walk': opts['walk'], 'atk': idx(opts['atk']), 'hit': idx(opts['hit']), 'death': idx(opts['death'])}
    solos = (set(sel['death']) | set(idx(opts.get('solo', '')) if opts.get('solo') else [])) - set(idx(opts['nosolo']) if opts.get('nosolo') else [])
    # --nosolo=키,... : 그 컷만 solo(최대 덩어리만 남기기)를 끈다 — 쓰러짐 칸에 그림으로 그려진 조각이 따로 있을 때
    # (v2.95.3 무당 정예 넘어짐: 놓친 검이 땅에 떨어져 몸과 떨어져 있다. 반짝이가 아니라 그림이라 살린다)
    for k in (idx(opts['decyan']) if opts.get('decyan') else []):          # 옅은 청록 호(정예 봉 휘두르기) — 축소하면 점만 남아 떠 보인다
        a = raw[k]; r_, g_, b_ = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
        cy = (b_ > r_ + 20) & (b_ > 150) & (g_ > 120); a[cy] = 0        # 옅은 라벤더~흰 (190,180,255) 계열; raw[k] = solo(a)
        print(' %s 청록 호 픽셀 %d 제거' % (k, cy.sum()))
    for it in (idx(opts['pick']) if opts.get('pick') else []):      # --pick=r3c0:L — 한 칸에 인물이 둘일 때 한쪽만
        pk, pside = it.split(':'); raw[pk] = pick_side(raw[pk], pside)
    for k in solos: raw[k] = solo(raw[k])

    ref = opts.get('ref', sel['idle'][0])
    bh0 = body_height(raw[ref], int(opts.get('bodymin', 12)))
    scale = body_h / bh0
    print('%s %s 몸높이 %d → 배율 %.3f' % (sheet, ref, bh0, scale))
    # --rowref=r1:r1c0,... 줄마다 배율 기준 컷(v2.95.2 — 개방 시트는 2줄 인물이 1줄보다 9% 크게 그려져 대기↔걷기에서 키가 튄다.
    # CLAUDE.md "크기는 키로 통일한다 — 머리 비율보다 먼저"). 안 적은 줄은 전체 배율.
    rowscale = {}
    for it in (opts['rowref'].split(',') if opts.get('rowref') else []):
        rk, rr = it.split(':'); bhr = body_height(raw[rr], int(opts.get('bodymin', 12))); rowscale[rk] = body_h / bhr
        print('  %s줄 기준 %s 몸높이 %d → 배율 %.3f' % (rk, rr, bhr, rowscale[rk]))
    small = {k: shrink(v, rowscale.get(k.split('c')[0], scale)) for k, v in raw.items()}

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
