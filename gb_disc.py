"""개방 수습제자 시트(sheets/gb_disc.png) → assets/gb_disc_*.png  (v2.95 — 문파 제자 시트 첫 판)

    python gb_disc.py                       # sheets/gb_disc.png → gb_disc_*
    python gb_disc.py <시트.png> <접두어>     # 다른 문파·등급도 같은 틀로 (예: python gb_disc.py wd_disc.png wd_disc)
    python gb_disc.py <시트.png> <접두어> --idle=4,5,6,7 --walk=4,5,6,7 --atk=1,2,3,4 --hit=0 --death=2,3   (--walk=auto 는 다리 IoU 로 고름)

컷 고르기(review/gb_rows.png 로 확인, v2.95): 대기·걷기 8칸은 한 사이클이 아니라 **두 자세 × 4칸**이다 —
  0~3칸은 봉을 허리 아래로 늘어뜨린 자세(걷기 1~3칸은 봉이 아예 안 보임), 4~7칸은 봉을 앞으로 든 자세.
  공격·회수 컷이 봉을 든 자세라 대기·걷기 모두 **4~7칸**(봉 든 자세)으로 통일한다 — 0,2,4,6 처럼 섞으면 봉이 컷마다 튄다.
  걷기 4~7 은 이웃 다리 IoU 0.68~0.79·끝↔처음 0.72 로 사이클이 된다. 공격 0칸(들기 시작)은 1칸과 겹쳐 뺀다.

시트 구성(격자가 **불규칙**하다 — 행마다 열 경계가 다르다):
  1줄 대기 8칸 · 2줄 걷기 8칸 · 3줄 공격(들기·들기·휘두르기[파란 원호, 두 칸 폭]·내려치기[금색 호, 두 칸 폭]·회수·빈 칸)
  4줄 피격 → 뒤로 넘어짐 → 쓰러짐 → 쓰러짐(반짝이 표식 있음), 칸 폭 제각각.
foesheet._lines 는 전체 폭 줄만 잡으므로 여기서 **행별로** 열 경계를 다시 검출한다(foesheet 는 안 고친다).
칸 안은 foesheet._cell 이 처리한다(마젠타 판정=초록이 적·청보다 뚜렷이 낮음, 테두리 고리는 덩어리 고른 뒤 버림,
물든 가장자리는 색만 고침, declutter 로 얇게 붙은 옆칸 조각 끊음). 이펙트(원호)는 그림이라 몸과 같이 살린다.
쓰러짐 컷의 떠 있는 반짝이(워터마크성 표식)는 solo 로 최대 덩어리 근처만 남겨 버린다.
걷기는 4~7칸(아래 참조), --walk=auto 면 8컷 다리 마스크 IoU 로 사이클이 되는 것을 고른다.
배율은 대기0 몸높이 → body_h 48(강도와 같은 급), 캔버스는 foesheet.pack(바닥 정렬·다리 무게중심 가로 중앙, 좌우 대칭).
시트는 오른쪽 보기 — 반전 없음(적 기본 방향은 오른쪽).
"""
import sys, os, glob, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from foesheet import _cell, pack, R

BODY_H = 48
GROUND = (106, 122, 82)       # 죽림 바닥색 — 검사판 배경(흰 배경은 도복 구멍을 못 보여 준다)

def _groups(v, gap=4):
    """줄 픽셀 묶기 — gap 4: 장로 시트는 테두리가 두 줄(138·141)로 그려져 2 로 묶으면 사이가 빈 행이 된다(v2.95.1)."""
    g = []
    for i in v:
        if g and i - g[-1][-1] <= gap: g[-1].append(i)
        else: g.append([i])
    return [(int(x[0]), int(x[-1])) for x in g]

def _edges(gl, n):
    """시트 가장자리에 테두리 줄이 없으면(정예 시트 맨 아래 줄이 반쯤 잘림) 가장자리를 경계로 더한다."""
    if not gl or gl[0][0] > 3: gl = [(0, 0)] + gl
    if gl[-1][1] < n - 4: gl = gl + [(n - 1, n - 1)]
    return gl

def grid_rows(sh):
    """어두운 테두리 줄 → 행 경계(전체 폭) + 행마다 열 경계."""
    lum = sh.sum(-1) / 3; dark = lum < 70
    H, W = dark.shape
    rl = _edges(_groups(np.where(dark.mean(1) > 0.8)[0]), H)
    cols = []
    for i in range(len(rl) - 1):
        y0, y1 = rl[i][1] + 1, rl[i + 1][0]
        cl = _edges(_groups(np.where(dark[y0:y1].mean(0) > 0.8)[0]), W)
        cols.append(cl)
    return rl, cols

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
    """축소 — foesheet._shrink(프리멀티 → 되나눔)는 얇은 봉이 알파 링잉으로 **하얗게 바랬다**(idle 봉이 흰 막대).
    대신 엣지 확장(투명 픽셀을 가장 가까운 그림 픽셀 색으로 채움) 뒤 RGB·알파를 따로 LANCZOS, 알파 문턱 110."""
    al = rgba[..., 3] > 0
    _, (iy, ix) = ndimage.distance_transform_edt(~al, return_indices=True)
    rgb = rgba[..., :3][iy, ix]                                   # 엣지 확장 — 마젠타/검정 번짐 차단
    w, h = max(1, round(rgba.shape[1] * scale)), max(1, round(rgba.shape[0] * scale))
    c = np.array(Image.fromarray(rgb, 'RGB').resize((w, h), Image.LANCZOS))
    a = np.array(Image.fromarray((al * 255).astype(np.uint8), 'L').resize((w, h), Image.LANCZOS))
    out = np.dstack([c, np.where(a >= 110, 255, 0)]).astype(np.uint8)
    out[out[..., 3] == 0] = 0
    # 축소 뒤 윤곽 1px 에 남은 마젠타 물(분홍 점) — 색만 고친다(_cell 의 rim 보정과 같은 식, 안쪽은 안 건드림)
    al2 = out[..., 3] > 0; rim = al2 & ~ndimage.binary_erosion(al2, iterations=1)
    r_, g_, b_ = out[..., 0].astype(int), out[..., 1].astype(int), out[..., 2].astype(int)
    t = rim & (r_ > g_ + 15) & (b_ > g_ + 15)
    out[..., 0][t] = np.minimum(r_[t], g_[t] + 12); out[..., 2][t] = np.minimum(b_[t], g_[t] + 12)
    return out

def _aligned(a, W=160, H=160):
    """비교용 정렬 — 칸 크기가 제각각(걷기 줄은 폭이 다르다)이라 바닥·다리 무게중심 기준으로 공통 캔버스에 놓는다(v2.95.1)."""
    al = a[..., 3] > 0; ys, xs = np.where(al)
    sel = ys >= ys.max() - (ys.max() - ys.min()) * 0.3; cx = xs[sel].mean()
    m = np.zeros((H, W), bool); dx = int(round(W / 2 - cx)); dy = H - 1 - ys.max()
    ok = (xs + dx >= 0) & (xs + dx < W) & (ys + dy >= 0)
    m[ys[ok] + dy, xs[ok] + dx] = True
    return m

def legmask(a, frac=0.3):
    m = _aligned(a); ys = np.where(m)[0]
    cut = ys.max() - (ys.max() - ys.min()) * frac
    m = m.copy(); m[:int(cut)] = False
    return m

def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())

def pick_walk(frames, n=4):
    """8컷 걷기에서 다리 IoU 로 사이클(이웃끼리 다르고 끝↔처음이 이어지는) 4컷을 고른다.
    후보: 균등 간격 4개 조합 전부 — 인접 IoU 의 최소가 가장 큰 것(끊김 없음)·평균이 가장 작은 것(움직임) 균형."""
    import itertools
    keys = list(frames); ms = [legmask(frames[k]) for k in keys]
    best = None
    for comb in itertools.combinations(range(len(keys)), n):
        adj = [iou(ms[comb[i]], ms[comb[(i + 1) % n]]) for i in range(n)]
        # 같은 포즈가 이어지면(IoU 0.9↑) 사이클이 안 된다
        if max(adj) > 0.9: continue
        score = -np.mean(adj) + 0.5 * min(adj)
        if best is None or score > best[0]: best = (score, comb, adj)
    return [keys[i] for i in best[1]], best[2]

def review(prefix, names, cols=4, S=4):
    ims = [(n, Image.open(os.path.join(R, 'assets', '%s_%s.png' % (prefix, n)))) for n in names]
    W, H = ims[0][1].size; rows = (len(ims) + cols - 1) // cols
    c = Image.new('RGB', (cols * (W * S + 8) + 8, rows * (H * S + 20) + 8), GROUND); d = ImageDraw.Draw(c)
    for i, (n, im) in enumerate(ims):
        x = 8 + (i % cols) * (W * S + 8); y = 8 + (i // cols) * (H * S + 20); big = im.resize((W * S, H * S), Image.NEAREST)
        d.rectangle((x - 1, y + 15, x + W * S, y + 16 + H * S), outline=(60, 70, 50)); c.paste(big, (x, y + 16), big)
        d.line((x, y + 16 + H * S - 1, x + W * S, y + 16 + H * S - 1), fill=(230, 200, 90))   # 발밑 기준선
        d.text((x, y), '%s %dx%d' % (n, W, H), fill=(255, 255, 255))
    p = os.path.join(R, 'review', 'review-%s.png' % prefix); c.save(p); print('검사판 →', p)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
    sheet = args[0] if args else 'gb_disc.png'; prefix = args[1] if len(args) > 1 else 'gb_disc'
    body_h = int(opts.get('body', BODY_H))
    sel = {'idle': opts.get('idle', '4,5,6,7'), 'walk': opts.get('walk', '4,5,6,7'),
           'atk': opts.get('atk', '1,2,3,4'), 'hit': opts.get('hit', '0'), 'death': opts.get('death', '2,3')}

    sh = np.array(Image.open(os.path.join(R, 'sheets', sheet)).convert('RGB')).astype(int)
    r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
    bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)
    rl, cols = grid_rows(sh)
    print('행 경계', rl); [print(' %d줄 열 %d칸' % (i + 1, len(cl) - 1), cl) for i, cl in enumerate(cols)]
    assert len(rl) - 1 == 4, '4줄이어야 한다: %d' % (len(rl) - 1)

    # 행별로 전 칸 추출(원본 해상도) — 빈 칸(픽셀 40 미만)은 버림
    raw = {}
    for cy, cl in enumerate(cols):
        for cx in range(len(cl) - 1):
            a = _cell(sh, bg, cy, cx, 0, 0, grid=(rl, cl))
            if (a[..., 3] > 0).sum() < 40: print(' %d줄 %d칸 빈 칸' % (cy + 1, cx)); continue
            raw['r%dc%d' % (cy, cx)] = a
    for k in list(raw):
        if k.startswith('r3'): raw[k] = solo(raw[k])   # 쓰러짐 줄 — 부유 표식 제거

    # 배율: 대기0 몸높이 → body_h
    ys = np.where(raw['r0c0'][..., 3] > 0)[0]
    scale = body_h / (ys.max() + 1 - ys.min())
    print('%s 대기0 몸높이 %d → 배율 %.3f' % (sheet, ys.max() + 1 - ys.min(), scale))
    small = {k: shrink(v, scale) for k, v in raw.items()}

    def rowkeys(cy): return [k for k in small if k.startswith('r%d' % cy)]
    def idx(s): return [int(x) for x in s.split(',')]
    for cy, nm in ((0, '대기'), (1, '걷기')):            # 다리 IoU 표 — 두 자세 × N칸인지·사이클인지 눈으로 판단하는 근거
        ks = rowkeys(cy); ms = [legmask(small[k]) for k in ks]; bs = [_aligned(small[k]) for k in ks]
        print('%s 다리 IoU (괄호는 온몸)' % nm)
        [print('  ', ks[i], ' '.join('%.2f(%.2f)' % (iou(ms[i], ms[j]), iou(bs[i], bs[j])) for j in range(len(ks)))) for i in range(len(ks))]
    out = {}
    for i, j in enumerate(idx(sel['idle'])): out['idle%d' % i] = small['r0c%d' % j]
    if sel['walk'] == 'auto':
        wk, adj = pick_walk({k: small[k] for k in rowkeys(1)})
        print('걷기 사이클', wk, '이웃 IoU', ['%.2f' % v for v in adj])
    else: wk = ['r1c%d' % j for j in idx(sel['walk'])]
    for i, k in enumerate(wk): out['walk%d' % i] = small[k]
    for i, j in enumerate(idx(sel['atk'])): out['atk%d' % i] = small['r2c%d' % j]
    out['hit'] = small['r3c%d' % idx(sel['hit'])[0]]
    for i, j in enumerate(idx(sel['death'])): out['death%d' % i] = small['r3c%d' % j]

    for f in glob.glob(os.path.join(R, 'assets', prefix + '_*.png')): os.remove(f)
    W, H = pack(out, prefix)
    spec = {}
    for k, a in out.items():
        ys, xs = np.where(a[..., 3] > 0)
        spec[k] = dict(w=int(xs.max() + 1 - xs.min()), h=int(ys.max() + 1 - ys.min()))
    body = [spec[k] for k in spec if k.startswith(('idle', 'walk'))]
    print('규격: 캔버스 %dx%d · 몸(대기·걷기) 폭 %d~%d 높이 %d~%d' % (W, H, min(s['w'] for s in body), max(s['w'] for s in body),
          min(s['h'] for s in body), max(s['h'] for s in body)))
    for k, s in spec.items(): print('  %-8s 그림 %3dx%3d' % (k, s['w'], s['h']))
    os.makedirs(os.path.join(R, 'review'), exist_ok=True)
    json.dump(dict(canvas=[W, H], frames=spec), open(os.path.join(R, 'review', prefix + '_specs.json'), 'w'), indent=1)
    review(prefix, list(out))

if __name__ == '__main__':
    main()
