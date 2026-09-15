"""주인공 시트 공용 추출기 (v2.73) — **그림 기준으로 자른다**(사용자: "무기 형태가 잘리면 안 돼, 이미지 기준으로 잘라라").

칸(격자)은 '어느 그림이 어느 칸 것인가'를 정하는 데만 쓰고, 자르는 경계는 **덩어리 라벨링 bbox**다.
AI 시트는 창 끝·큰 원 검기가 칸 테두리를 넘어 여백까지 그려져 있어(감사 결과 창 r1c1은 여백에 1062px),
칸 단위로 자르면 무기가 잘린다.

절차
  1. 격자: 배경보다 훨씬 어두운 얇은 줄(≤4px, 70%↑)이 테두리. 배경 판정 = 진한 마젠타 | 시트 중앙값 ±40.
  2. 테두리 줄은 지우되, 줄 양쪽에 그림이 붙어 있으면(무기가 줄을 가로지름) 그 줄 픽셀을 **이어 붙인다**
     (색은 가장 가까운 그림 픽셀). 그래야 줄 너머 조각이 몸과 한 덩어리가 된다.
  3. 시트 전체 덩어리 라벨링 → 덩어리마다 픽셀이 가장 많이 든 칸에 배정. 어느 칸 안에도 안 든 덩어리(여백의
     ㄱ자·눈금 표식)는 버림. 40px 미만 점·칸 모서리의 400px 미만 조각(모서리 표식)·얇은 줄도 버림.
  4. 칸에 배정된 덩어리들의 합집합 bbox로 자른다 — 칸 밖으로 나간 무기·기운이 그대로 들어온다.
  5. 공통 배율(서 있는 컷 172px → 대기 컷 몸높이 47px). 가로 정렬은 **머리카락(어두운 픽셀) 무게중심**을
     캔버스 가운데에(무기·기운이 어디로 뻗든 머리가 제자리). 세로는 **칸 바닥 = 땅**(뛰는 컷은 뜬 만큼 공중).
  6. 캔버스 폭·높이는 동작마다 **그림에 맞춰 자동**: 폭 = 머리 중심 기준 양쪽 최대 뻗음×2, 높이 = 기본 51에
     위(머리 위로 든 무기)·아래(발 아래 기운) 넘치는 만큼 더한다. 결과의 [폭, 높이, 위 여분]을 찍으니
     00-data HFX.aw / HFX.fh 에 옮긴다(높이가 51이면 fh 불필요).
  7. 축소는 가장자리 색 확장 뒤 LANCZOS·알파 128 문턱, 축소 뒤 떨어진 1~2px 점 제거.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

H0 = 51; GROUND = 48          # HERO.h · 대기 컷의 발 끝 행 (기본 캔버스: 땅 위 49행, 아래 2행)
BODY_PX = 47                  # 대기 컷 몸높이(행 2~48)
STAND_H = 172                 # 주인공 시트의 서 있는 컷 높이(원본 px) — 모든 주인공 시트가 같은 배율로 그려졌다

def groups(v):
    out, s, p = [], None, None
    for x in v:
        if s is None: s = p = x
        elif x != p + 1: out.append((s, p)); s = x
        p = x
    if s is not None: out.append((s, p))
    return out

def _lines(frac, maxw=4):
    out = []
    for (a, b) in groups(np.where(frac > 0.7)[0]):
        if b - a + 1 > maxw: continue
        while a > 0 and frac[a - 1] > 0.3 and b - a < 5: a -= 1
        while b + 1 < len(frac) and frac[b + 1] > 0.3 and b - a < 5: b += 1
        out.append((a, b))
    return out

class Sheet:
    def __init__(self, path, rows=3, cols=6):
        A = np.array(Image.open(path).convert('RGB')).astype(int)
        self.A = A; self.BG = np.median(A.reshape(-1, 3), 0)
        r, g, b = A[..., 0], A[..., 1], A[..., 2]
        # 배경 = 진한 마젠타 | (중앙값 ±40 **이면서 자줏빛**: r·b가 g보다 큼). 옅은 시트(도·창·봉·주먹)는 배경이
        # (171,138,167)라 도복의 어두운 베이지(185,165,130)가 ±40 안에 들어 배경으로 지워졌다("도복이 배경에 묻힘",
        # v2.73.1) — 베이지·살색·흰 도복은 b<g라 자줏빛 조건에서 걸러진다.
        # 자줏빛이면 ±70까지 배경(줄 곁 안티에일리어스 119,94,124가 52 벗어나 그림으로 남았다 — 머리카락 80,55,85는 90 벗어나 안전)
        near = (np.abs(A - self.BG) < 70).all(2) & ((r - g) > 8) & ((b - g) > 8)
        fg0 = ~((((r - g) > 50) & ((b - g) > 50)) | near)
        dark = A.sum(2) < self.BG.sum() - 150
        mw = 20 if A.shape[1] >= 1500 else 4           # 큰 시트(2000px, hero_fx)는 줄이 12~17px라 두께 상한을 키운다
        # 격자선은 칸 피치(크기÷칸 수)의 배수 자리에만 있다 — 그 자리 ±12% 밖의 후보(인물의 어두운 열, 0.72)는 버린다
        def on_pitch(lines, size, n):
            pitch = size / n
            return [(a, b) for (a, b) in lines if min(abs((a + b) / 2 - k * pitch) for k in range(n + 1)) < pitch * 0.12]
        rl = on_pitch(_lines(dark.mean(1), maxw=mw), A.shape[0], rows)
        self.ys = [(rl[i][1] + 1, rl[i + 1][0] - 1) for i in range(len(rl) - 1) if rl[i + 1][0] - rl[i][1] > 40]
        cl = on_pitch(_lines(dark.mean(0), maxw=mw), A.shape[1], cols)
        xs = [(cl[i][1] + 1, cl[i + 1][0] - 1) for i in range(len(cl) - 1) if cl[i + 1][0] - cl[i][1] > 40]
        # 칸 폭 검증 — 부채 시트는 4번째 칸 오른쪽 줄이 행마다 1~2px 어긋나 한 열로는 70%를 못 넘어 빠졌고, 그 칸이
        # 여백까지 합쳐진 170px로 잡혀 줄(1px 어두운 선)이 그림으로 남았다(v2.73.1). 중앙값보다 15% 넘게 넓은 칸은
        # '앞 칸 폭만큼 간 자리' ±6px에서 어두운 비율이 가장 높은 열을 줄로 삼아 쪼갠다.
        med = int(np.median([b - a for (a, b) in xs])) if xs else 0
        fixed = []
        for (a, b) in xs:
            if b - a > med * 1.15:
                lo, hi = a + med - 6, a + med + 6
                fr = dark[:, lo:hi + 1].mean(0); x = lo + int(fr.argmax())
                if fr.max() > 0.35: fixed.append((a, x - 3)); cl.append((x - 2, x + 2)); continue
            fixed.append((a, b))
        cl.sort(); self.xs = fixed
        # 격자선이 없는 시트(v2.74 재작업 시트 — 순마젠타 배경, 액자선 없음)는 균등 분할로 칸을 잡는다.
        # 칸은 '어느 그림이 어느 칸 것인가'만 정하고, 땅은 칸 바닥이 아니라 **인물 발끝**으로 잡는다(gridless).
        self.gridless = len(self.xs) != cols or len(self.ys) != rows
        if self.gridless:
            Hh, Ww = A.shape[:2]
            self.xs = [(round(i * Ww / cols), round((i + 1) * Ww / cols) - 1) for i in range(cols)]
            self.ys = [(round(i * Hh / rows), round((i + 1) * Hh / rows) - 1) for i in range(rows)]
            cl, rl = [], []
        assert len(self.xs) == cols and len(self.ys) == rows, (self.xs, self.ys)
        # 테두리 줄 띠(안티에일리어스 포함)
        # 줄 띠는 양옆 2px 더 — 줄 곁 안티에일리어스 열(119,94,124)은 '어두운 줄' 판정 밖이라 여백에 세로 띠로
        # 남아 인물에 붙었다(v2.73.1 "자주 세로선"). 넓힌 띠는 무기가 가로지르면 어차피 이어 붙인다.
        cl = [(max(0, a - 2), b + 2) for (a, b) in cl]; rl = [(max(0, a - 2), b + 2) for (a, b) in rl]
        band = np.zeros(fg0.shape, bool)
        for (a, b) in cl: band[:, a:b + 1] = True
        for (a, b) in rl: band[a:b + 1, :] = True
        fgA = fg0 & ~band
        # 가로 줄 띠에 머리카락·발이 걸치면 그 부분이 같이 지워진다(v2.76.8 "뛸 때 머리 잘림" — 질주 시트 4칸은 머리끈이 위 액자선
        # 위까지 올라간다). 띠 바로 밖 행에 그림이 있는 열은, 띠 안의 어두운 비배경 픽셀을 그 가장자리부터 이어진 만큼 되살린다.
        # 세로 줄은 안 건드린다(무기 끝이 걸치면 줄 조각이 칼날에 붙는다) — 가로 줄엔 어두운 머리·신발만 걸친다.
        for (a, b) in rl:
            for edge, step in ((b + 1, -1), (a - 1, 1)):           # 띠 아래 그림(머리) / 띠 위 그림(발)
                if not (0 <= edge < fg0.shape[0]): continue
                cols = np.where(fg0[edge] & dark[edge])[0]
                for x in cols:
                    y = edge + step
                    while max(a, 0) <= y <= min(b, fg0.shape[0] - 1) and fg0[y, x] and dark[y, x]:
                        fgA[y, x] = True; y += step
        # 덩어리(줄 없이) → 인물(칸 안 2000px↑)과 조각으로 나눈다
        lab, n = ndi.label(fgA); objs = ndi.find_objects(lab)
        if self.gridless:
            # 선 없는 시트는 옆 칸 검기가 옆 인물과 붙어 한 덩어리가 된다(도 시트 3줄 1·2칸). 두 칸에 각각 2000px 넘게
            # 걸친 덩어리는 칸 경계(균등 분할선)에서 잘라 다시 라벨링한다 — 한쪽이 작은 조각(넘친 검기)이면 그대로 둔다.
            cutx = [x1 for (x0, x1) in self.xs[:-1]]; cuty = [y1 for (y0, y1) in self.ys[:-1]]
            for i in range(1, n + 1):
                sl = objs[i - 1]; m = lab[sl] == i
                yy, xx = np.where(m); yy = yy + sl[0].start; xx = xx + sl[1].start
                big = 0
                for (y0, y1) in self.ys:
                    for (x0, x1) in self.xs:
                        if int(((yy >= y0) & (yy <= y1) & (xx >= x0) & (xx <= x1)).sum()) >= 2000: big += 1
                if big >= 2:
                    for cx in cutx: fgA[:, cx:cx + 2][lab[:, cx:cx + 2] == i] = False
                    for cy in cuty: fgA[cy:cy + 2, :][lab[cy:cy + 2, :] == i] = False
            lab, n = ndi.label(fgA); objs = ndi.find_objects(lab)
        owner = {}; figure = set(); mass = {}
        for i in range(1, n + 1):
            sl = objs[i - 1]; m = lab[sl] == i; s = int(m.sum())
            if s < 40: continue
            yy, xx = np.where(m); yy = yy + sl[0].start; xx = xx + sl[1].start
            if yy.max() - yy.min() < 2 or xx.max() - xx.min() < 2: continue
            best, bc = None, 0
            for ri, (y0, y1) in enumerate(self.ys):
                for ci, (x0, x1) in enumerate(self.xs):
                    c = int(((yy >= y0) & (yy <= y1) & (xx >= x0) & (xx <= x1)).sum())
                    if c > bc: best, bc = (ri, ci), c
            if best is not None:
                y0, y1 = self.ys[best[0]]; x0, x1 = self.xs[best[1]]
                corner = (xx.min() <= x0 + 8 or xx.max() >= x1 - 8) and (yy.min() <= y0 + 8 or yy.max() >= y1 - 8)
                if corner and s < 400: continue                      # 칸 모서리 ㄱ자 표식
            else:
                # 여백에만 있는 작은 조각이 칸 모서리·변 가운데 표식 자리면 버린다(부채 시트의 ㄱ자·눈금 —
                # 인물에 붙으면 세로선으로 떠 보였다). 큰 조각(300px↑)은 무기 끝일 수 있어 남긴다.
                w_, h_ = xx.max() - xx.min() + 1, yy.max() - yy.min() + 1
                if (h_ > 80 and w_ <= 8) or (w_ > 80 and h_ <= 8): continue   # 여백의 가늘고 긴 것 = 줄 잔재
                cx_, cy_ = xx.mean(), yy.mean(); mark = False
                for (y0, y1) in self.ys:
                    for (x0, x1) in self.xs:
                        for px in (x0, x1, (x0 + x1) / 2):
                            for py in (y0, y1, (y0 + y1) / 2):
                                if abs(cx_ - px) < 22 and abs(cy_ - py) < 22: mark = True
                if mark and s < 300: continue
            mass[i] = (best, bc)
            if bc >= 2000: figure.add(i); owner[i] = best
        # 줄 너머 접촉 — 줄 양쪽 3px 안의 라벨 쌍과 접촉 길이. 인물끼리는 절대 안 잇는다(윗줄 발↔아랫줄 머리).
        # 조각(무기 끝·기운)은 접촉이 가장 긴 인물(또는 이미 인물에 붙은 조각)에 붙는다 → 그 줄 픽셀을 이어 붙인다.
        contacts = {}   # (l, r, 축, a, b) → [줄 위치들]
        def side_lab(M):   # 3px 띠에서 0이 아닌 라벨(첫 것)
            out = np.zeros(M.shape[0], int)
            for k in range(M.shape[1]):
                col = M[:, k]; out = np.where((out == 0) & (col > 0), col, out)
            return out
        for (a, b) in cl:                                  # 줄에 바로 붙은 2px만 본다(넓히면 옆을 지나는 그림까지 이어져 세로선이 뜬다)
            L = side_lab(lab[:, max(0, a - 2):a][:, ::-1]); R = side_lab(lab[:, b + 1:b + 3])
            for y in np.where((L > 0) & (R > 0))[0]:
                contacts.setdefault((int(L[y]), int(R[y]), 'v', a, b), []).append(int(y))
        for (a, b) in rl:
            U = side_lab(lab[max(0, a - 2):a, :][::-1, :].T); D = side_lab(lab[b + 1:b + 3, :].T)
            for x in np.where((U > 0) & (D > 0))[0]:
                contacts.setdefault((int(U[x]), int(D[x]), 'h', a, b), []).append(int(x))
        attach = {}                                   # 조각 라벨 → 붙은 인물 라벨
        pairs = sorted(contacts.items(), key=lambda kv: -len(kv[1]))
        bridged = np.zeros(fg0.shape, bool)
        def root(i): return i if i in figure else attach.get(i)
        # v2.73.3: 여백에만 있는 조각은 붙이지 않는다 — 시트마다 칸 안쪽에 얇은 액자선이 있어 무기가 거기서 잘린 채
        # 그려졌고, 액자 밖 여백의 조각은 그 무기의 이어짐이 아니라 딴 자리에 놓인 파편이라 붙이면 떠 있는 조각이 됐다
        # (사용자: "무기 끝이 다 잘려 있어"). 원본이 잘린 것이라 복구 불가 → 시트를 액자선 없이 다시 받는다.
        for _ in range(4):                            # 조각 사슬(인물→칸 안 조각)
            for (l, r, ax, a, b), pos in pairs:
                if l not in mass or r not in mass: continue
                if mass[l][0] is None or mass[r][0] is None: continue   # 여백 조각
                if l in figure and r in figure: continue
                rl_, rr_ = root(l), root(r)
                if rl_ is None and rr_ is None: continue
                if rl_ is not None and rr_ is not None and rl_ != rr_: continue
                tgt = rl_ if rl_ is not None else rr_
                for i in (l, r):
                    if i not in figure and i not in attach: attach[i] = tgt
                if ax == 'v': bridged[pos, a:b + 1] = True
                else: bridged[a:b + 1, pos] = True
        # 붙지 않은 조각은 칸 안에 들어 있으면 그 칸(불꽃 파편 등), 여백뿐이면 버림
        self.cells = {}
        for i, (best, bc) in mass.items():
            if i in figure: self.cells.setdefault(owner[i], []).append(i)
            elif i in attach: self.cells.setdefault(owner[attach[i]], []).append(i)
            elif best is not None and bc > 0: self.cells.setdefault(best, []).append(i)
        fgB = fgA | bridged
        rgb = A.astype(np.uint8).copy()
        if bridged.any():
            idx = ndi.distance_transform_edt(~fgA, return_distances=False, return_indices=True)
            rgb[bridged] = A.astype(np.uint8)[idx[0][bridged], idx[1][bridged]]
        # 마젠타 물든 가장자리·옅은 분홍 기운 — g 쪽으로 걷는다
        rr, gg, bb = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
        pink = fgB & ((rr - gg) > 35) & ((bb - gg) > 35) & (gg > 60)
        rgb[pink, 0] = np.clip(gg[pink] + 20, 0, 255); rgb[pink, 2] = np.clip(gg[pink] + 25, 0, 255)
        lite = fgB & ~pink & (gg > 150) & ((rr - gg) > 12) & ((bb - gg) > 12)
        rgb[lite, 0] = (gg[lite] + (rr[lite] - gg[lite]) * 0.3).astype(np.uint8); rgb[lite, 2] = (gg[lite] + (bb[lite] - gg[lite]) * 0.3).astype(np.uint8)
        self.rgb = rgb; self.dark = dark; self.lab = lab; self.bridged = bridged
        # 이어 붙인 줄 픽셀은 인접한 덩어리 라벨을 물려받는다(크롭 때 같이 들어오게)
        if bridged.any():
            idx = ndi.distance_transform_edt(~fgA, return_distances=False, return_indices=True)
            self.lab = lab.copy(); self.lab[bridged] = lab[idx[0][bridged], idx[1][bridged]]

    def cell(self, ri, ci):
        """칸에 배정된 덩어리 합집합 → (rgba 크롭, 땅까지 간격[칸 바닥−그림 바닥, 음수면 아래로 넘침], 머리 중심 x)"""
        labs = self.cells.get((ri, ci), [])
        assert labs, f'r{ri}c{ci} 그림 없음'
        m = np.isin(self.lab, labs)
        yy, xx = np.where(m); top, bot, l, rgt = yy.min(), yy.max(), xx.min(), xx.max()
        rgba = np.zeros((bot - top + 1, rgt - l + 1, 4), np.uint8)
        rgba[..., :3] = self.rgb[top:bot + 1, l:rgt + 1]; rgba[..., 3] = m[top:bot + 1, l:rgt + 1] * 255
        y0, y1 = self.ys[ri]; x0, x1 = self.xs[ci]
        if self.gridless:                                # 땅 = 인물 덩어리(가장 큰 것) 발끝
            big = max(labs, key=lambda L: int((self.lab == L).sum())); by = np.where(self.lab == big)[0]; y1 = by.max()
        # 머리 중심 = 칸 안에 든 그림 중 위 30% 행의 어두운(머리카락) 픽셀 무게중심 — 무기·기운에 안 끌린다
        inc = m & (self.dark) ; sub = inc[max(top, y0):y1 + 1, max(l, x0):x1 + 1]
        syy, sxx = np.where(sub)
        if len(syy):
            hh = syy.max() - syy.min() + 1; hy = syy < syy.min() + hh * 0.3
            hx = sxx[hy].mean() + max(l, x0) - l
        else: hx = (rgt - l) / 2
        return rgba, (y1 - bot), hx

    def stand_h(self, ri, ci):
        """기준 칸(서 있는 컷)의 인물 덩어리 높이 — 시트마다 배율이 달라 이걸로 47px에 맞춘다"""
        labs = self.cells[(ri, ci)]; big = max(labs, key=lambda L: int((self.lab == L).sum()))
        yy = np.where(self.lab == big)[0]; return int(yy.max() - yy.min() + 1)

def edge_expand(rgba):
    a = rgba[..., 3] > 0
    if a.all(): return rgba
    idx = ndi.distance_transform_edt(~a, return_distances=False, return_indices=True)
    out = rgba.copy(); out[..., :3] = rgba[..., :3][idx[0], idx[1]]; return out

def shrink(rgba, scale):
    e = edge_expand(rgba)
    # 얇은 것(찌르기 칼날은 원본 2px → 0.5px)이 축소에서 사라지지 않게 알파를 1px 두껍게 하고 문턱을 96으로 (v2.73.1)
    a = ndi.binary_dilation(e[..., 3] > 0, np.ones((3, 3), bool))
    w = max(1, round(e.shape[1] * scale)); h = max(1, round(e.shape[0] * scale))
    rgb = Image.fromarray(e[..., :3]).resize((w, h), Image.LANCZOS)
    al = Image.fromarray((a * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    out = np.dstack([np.array(rgb), (np.array(al) >= 96) * 255]).astype(np.uint8)
    lab, n = ndi.label(out[..., 3] > 0)
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() <= 2: out[m] = 0          # 축소 뒤 떨어진 점
    return out

def extract(sheet_path, strips, review_path, center='hair', share_width=False, stand_cell=None, rows=3, cols=6, patch=None, scale_mul=1.0):
    """strips = {키: [(줄, 칸), ...]} → assets/<키>.png. 캔버스는 그림에 맞춰 자동. 반환 {키: (폭, 높이, 위 여분)}"""
    S = Sheet(sheet_path, rows=rows, cols=cols); scale = BODY_PX / (S.stand_h(*stand_cell) if stand_cell else STAND_H) * scale_mul
    # scale_mul: 비율이 다른 시트(hero_fx는 머리가 큰 치비)를 머리 폭 기준으로 다른 시트에 맞출 때 (v2.76.3 권기 정권 0.86)
    if stand_cell: print(f'  기준 컷 r{stand_cell[0]}c{stand_cell[1]} 높이 {S.stand_h(*stand_cell)} → 배율 {scale:.3f}')
    specs, review, all_frames, dims = {}, [], {}, {}
    for key, picks in strips.items():
        frames = []
        for (ri, ci) in picks:
            rgba, gap, hx = S.cell(ri, ci)
            if patch: rgba = patch(S, key, (ri, ci), rgba)      # 원본 해상도 손질(칼날 이어 붙이기 등) — 축소 전에
            sm = shrink(rgba, scale); sh, sw = sm.shape[:2]
            if center == 'torso':                                   # 질주 — 몸통 무게중심
                a = sm[..., 3] > 0; yy, xx = np.where(a); mid = (yy > sh * 0.35) & (yy < sh * 0.65); cx = xx[mid].mean()
            else: cx = hx * scale
            below = max(0, -gap * scale)                            # 땅 아래로 넘친 픽셀
            frames.append((sm, cx, gap * scale, below, ri, ci))
        half = max(max(cx, sw - cx) for (sm, cx, g, below, _, _) in frames for sw in [sm.shape[1]])
        W = int(np.ceil(half)) * 2 + 2
        # 위·아래 여분: 그림이 캔버스 끝 행에 닿으면 1행 더 준다(가장자리 접촉 = 잘림으로 보는 spritetest 규약)
        need_top = max((sm.shape[0] - below + max(0, g)) - (GROUND + 1) for (sm, cx, g, below, _, _) in frames)   # 뜬 컷은 g만큼 더 위
        need_bot = max(below - (H0 - GROUND - 1) for (sm, cx, g, below, _, _) in frames)
        top_extra = int(np.ceil(need_top)) + 1 if need_top > -1 else 0     # 반올림으로 0행에 닿는 경우까지 여분
        bot_extra = int(np.ceil(need_bot)) + 1 if need_bot > -1 else 0
        all_frames[key] = frames; dims[key] = (W, top_extra, bot_extra)
    if share_width:                                     # 교대로 트는 두 판(정권)은 폭이 같아야 한다
        Wm = max(w for (w, t, b) in dims.values()); dims = {k: (Wm, t, b) for k, (w, t, b) in dims.items()}
    for key, frames in all_frames.items():
        W, top_extra, bot_extra = dims[key]
        Hc = H0 + top_extra + bot_extra; ground = GROUND + top_extra
        strip = np.zeros((Hc, W * len(frames), 4), np.uint8)
        for fi, (sm, cx, g, below, ri, ci) in enumerate(frames):
            sh, sw = sm.shape[:2]
            ox = int(round(W / 2 - cx)); oy = ground - int(round(g)) - sh + 1
            assert ox >= 0 and ox + sw <= W and oy >= 0 and oy + sh <= Hc, (key, fi, ox, sw, W, oy, sh, Hc)
            dst = strip[oy:oy + sh, W * fi + ox:W * fi + ox + sw]; mm = sm[..., 3] > 0; dst[mm] = sm[mm]
            print(f'  {key}[{fi}] 칸 r{ri}c{ci} 크기{sw}x{sh} 머리x{cx:.1f} 땅간격{g:.1f}')
        Image.fromarray(strip).save(f'assets/{key}.png'); review.append(strip)
        specs[key] = (W, Hc, top_extra)
        print(f'  → {key}: 폭 {W} · 높이 {Hc} · 위 여분 {top_extra} · 아래 여분 {bot_extra}')
    Sc = 4; pad = 8
    # 검사판 배경은 게임 바닥색 — 흰 배경은 도복이 비치는 구멍을 못 보여 줬다(v2.73.1)
    R = Image.new('RGB', (max(s.shape[1] for s in review) * Sc + pad * 2, sum(s.shape[0] * Sc + pad for s in review) + pad), (112, 128, 84)); y = pad
    for s in review:
        im = Image.fromarray(s).resize((s.shape[1] * Sc, s.shape[0] * Sc), Image.NEAREST); R.paste(im, (pad, y), im); y += s.shape[0] * Sc + pad
    R.save(review_path); print('검사판', review_path)
    import json, os
    allspec = json.load(open('review/hero_specs.json')) if os.path.exists('review/hero_specs.json') else {}
    allspec.update({k: list(v) for k, v in specs.items()}); json.dump(allspec, open('review/hero_specs.json', 'w'), indent=1)
    return specs
