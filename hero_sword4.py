"""검 3종 (v2.74.5 — 두 번째 재작업 시트 sheets/hero_sword4.png). hero_sword3와 비교(review/sword34_compare.png):
검기가 다른 무기와 같은 하늘색이고 자세 기울임·임팩트가 더 살아 있어 이쪽을 쓴다(사용자: 쓸 만한 걸 비교해서 조합).
  1줄 찌르기 [0,2,3,4] 기수식→검 내림→찌르기 별→찌르기 뻗음 · 2줄 베기 [0,1,2,3] 치켜듦→더 높이→내려베기 별→사선 호
  3줄 회전베기 [0,1,2,3] 가로 겨눔→큰 세로 호→큰 원→땅에 꽂음(흙)
gridless 모드. 검사판 review/hero_sword4.png
"""
import hero_sheet as HS
import numpy as np
from scipy import ndimage as ndi

# ── 칼날 이어 붙이기 (v2.74.6, 사용자: "검끝이 짧은 건 어디서 잘라다가 좀 붙여라") ──
# 찌르기 별 컷(1줄 4칸)·내려베기 별 컷(2줄 3칸)은 별 임팩트 뒤로 칼날이 20~34px(원본)로 짧게 끝난다.
# 온전한 칼날(1줄 3칸 검 내림, 55px)을 잘라 자루 끝을 맞추고 칼날 축을 따라 회전해 **투명한 자리에만** 덧댄다 —
# 별은 그대로 위에 남고 칼끝이 별 너머로 삐져나온다.
def _steel(rgba):
    C = rgba[..., :3].astype(int); a = rgba[..., 3] > 0; r, g, b = C[..., 0], C[..., 1], C[..., 2]
    m = a & (r > 120) & (g > 135) & (b > 150) & (b >= r - 5) & (np.abs(r - g) < 45) & ~((r > 238) & (g > 238) & (b > 238))
    lab, n = ndi.label(m)
    if n == 0: return m
    sizes = ndi.sum(m, lab, range(1, n + 1)); return lab == (int(np.argmax(sizes)) + 1)
def _blade(rgba):
    """강철 덩어리의 축(자루→칼끝 방향)·자루 끝점. 자루 끝 = 몸(강철 아닌 픽셀) 무게중심에 가까운 쪽."""
    m = _steel(rgba); yy, xx = np.where(m); pts = np.stack([xx, yy], 1).astype(float); c = pts.mean(0)
    d = np.linalg.svd(pts - c)[2][0]; proj = (pts - c) @ d
    body = rgba[..., 3] > 0; by, bx = np.where(body & ~m); bc = np.array([bx.mean(), by.mean()])
    e1, e2 = c + d * proj.min(), c + d * proj.max()
    if np.linalg.norm(e1 - bc) > np.linalg.norm(e2 - bc): e1, e2 = e2, e1; d = -d
    return m, e1, d
DONOR = (0, 2); TARGETS = {(0, 3), (1, 2)}; BLADE_LEN = 100  # 원본 px — 별(반지름 ~25) 너머로 칼끝이 나오는 길이
def graft(S, key, cell, rgba):
    """기증 칼날을 자루 끝에 맞춰 목표 축으로 돌리고 BLADE_LEN까지 늘려 그린다(역사상: 목표 픽셀마다 기증 픽셀을 샘플).
    투명한 자리와 별(순백) 위에만 칠한다 — 칼날이 별을 꿰뚫고 칼끝이 별 너머로 나온다."""
    if cell not in TARGETS: return rgba
    don, _, _ = S.cell(*DONOR); md, hd, dd = _blade(don); nd = np.array([-dd[1], dd[0]])
    yy, xx = np.where(md); pd = (np.stack([xx, yy], 1) - hd); Ld = float((pd @ dd).max()); wd = float(np.abs(pd @ nd).max()) + 1
    mt, ht, dt = _blade(rgba); nt = np.array([-dt[1], dt[0]])
    PAD = 60                                             # 크롭 경계 너머로 칼끝이 나가게 여유를 두고, 끝나면 다시 잘라낸다
    out = np.pad(rgba, ((PAD, PAD), (PAD, PAD), (0, 0))); ht = ht + PAD; H, W = out.shape[:2]; added = 0
    C = out[..., :3].astype(int); white = (out[..., 3] > 0) & (C.min(2) > 238)
    for s_ in np.arange(0, BLADE_LEN, 0.5):
        for t_ in np.arange(-wd, wd + 0.5, 0.5):
            q = ht + s_ * dt + t_ * nt; qx, qy = int(round(q[0])), int(round(q[1]))
            if not (0 <= qx < W and 0 <= qy < H): continue
            if not (out[qy, qx, 3] == 0 or white[qy, qx]): continue
            p = hd + (s_ * Ld / BLADE_LEN) * dd + t_ * nd; px, py = int(round(p[0])), int(round(p[1]))
            if 0 <= px < don.shape[1] and 0 <= py < don.shape[0] and md[py, px]:
                out[qy, qx] = don[py, px]; added += 1
    print(f'  칼날 이어 붙임 r{cell[0]}c{cell[1]}: +{added}px (기증 r{DONOR[0]}c{DONOR[1]} {Ld:.0f}px → {BLADE_LEN}px)')
    ay, ax = np.where(out[..., 3] > 0)
    return out[ay.min():ay.max() + 1, ax.min():ax.max() + 1]

STRIPS = {'swordthrust': [(0,0),(0,2),(0,3),(0,4)], 'swordslash': [(1,0),(1,1),(1,2),(1,3)], 'swordspin': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_sword4.png', STRIPS, 'review/hero_sword4.png', center='hair', stand_cell=(0,0), patch=graft)
