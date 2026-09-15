"""주인공 발차기 3종 추출 (v2.71, 사용자 시트 sheets/hero_kick2.png — 3줄×6칸, 마젠타 배경·어두운 자주 테두리)

  1줄 옆차기(kickside) · 2줄 돌려차기(kickround) · 3줄 뛰어차기(kickhigh — 도약 후 공중 발차기)

규칙(CLAUDE.md 스프라이트 파이프라인):
  - 격자는 어두운 테두리 줄을 검출해 잡는다(고정 격자 금지).
  - 배경 판정은 '초록이 적·청 둘보다 훨씬 낮음'(r-g>50 & b-g>50) — 테두리의 어두운 자주까지 걷고,
    머리카락의 어두운 자주갈색(r-g 작음)은 남는다.
  - 칸마다 덩어리 라벨링으로 그림을 고르고(초승달 기운은 발에서 떨어진 조각이라 25px 이상은 다 살림),
    얇은 줄(높이·폭 2px 이하)은 테두리 잔재로 버린다.
  - 공통 배율(서 있는 컷 170px → 대기 컷 몸높이 47px)로 전 프레임 같은 크기.
  - 바닥 정렬은 **칸 바닥 기준** — 뛰는 컷은 칸 바닥에서 뜬 만큼 공중에 둔다.
  - 가로는 머리(윗 22% 행) 무게중심을 캔버스 중앙에 — 발이 뻗어도 몸이 안 흔들린다.
  - 축소는 가장자리 색 확장(투명 픽셀에 가장 가까운 불투명 색) 뒤 LANCZOS, 알파는 128 문턱(도트 유지).

결과: assets/kickside.png · kickround.png · kickhigh.png (각 4컷 × 폭 HFX.aw, 높이 51) + review/hero_kick2.png
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEET = 'sheets/hero_kick2.png'
H = 51; GROUND = 48            # HERO.h · 대기 컷의 발 끝 행
BODY_PX = 47                   # 대기 컷 몸높이(행 2~48)
# 동작별 [줄, 쓸 칸 4개(임팩트 index2·마지막=완전히 뻗음), 캔버스 폭]
MOVES = { 'kickside': (0, [0, 1, 2, 3], 54),
          'kickround': (1, [0, 2, 3, 4], 56),   # 1칸(구름 자세)→뻗음→초승달→별 임팩트. 2칸은 3칸과 거의 같아 뺐다
          'kickhigh': (2, [0, 1, 2, 3], 60) }    # 웅크림→도약→공중 발차기×2. 5칸(착지 높은차기)은 다리가 뒤로 뻗어 뺐다

def groups(v):
    out, s, p = [], None, None
    for x in v:
        if s is None: s = p = x
        elif x != p + 1: out.append((s, p)); s = x
        p = x
    if s is not None: out.append((s, p))
    return out

def grid(A):
    r, g, b = A[..., 0], A[..., 1], A[..., 2]
    dark = (r < 140) & (g < 60) & (b < 140) & (r > 40)
    cols = [c for c in groups(np.where(dark.mean(0) > 0.6)[0])]
    rows = [c for c in groups(np.where(dark.mean(1) > 0.6)[0])]
    xs = [(cols[i][1] + 1, cols[i + 1][0] - 1) for i in range(len(cols) - 1) if cols[i + 1][0] - cols[i][1] > 40]
    ys = [(rows[i][1] + 1, rows[i + 1][0] - 1) for i in range(len(rows) - 1) if rows[i + 1][0] - rows[i][1] > 40]
    return xs, ys

def cell_rgba(A, x0, x1, y0, y1):
    """칸 안 그림 → RGBA(원본 배율) + 칸 바닥까지 간격 + 머리 무게중심 x"""
    C = A[y0:y1 + 1, x0:x1 + 1]
    r, g, b = C[..., 0], C[..., 1], C[..., 2]
    fg = ~(((r - g) > 50) & ((b - g) > 50))
    lab, n = ndi.label(fg)
    keep = np.zeros_like(fg)
    for i in range(1, n + 1):
        m = lab == i; s = int(m.sum())
        if s < 25: continue
        yy, xx = np.where(m)
        if yy.max() - yy.min() < 2 or xx.max() - xx.min() < 2: continue   # 테두리 잔재 줄
        keep |= m
    yy, xx = np.where(keep)
    top, bot, l, rgt = yy.min(), yy.max(), xx.min(), xx.max()
    rgba = np.zeros((C.shape[0], C.shape[1], 4), np.uint8)
    rgba[..., :3] = C; rgba[..., 3] = keep * 255
    # 마젠타 물든 가장자리 — r·b가 g보다 훨씬 높은 픽셀은 g 쪽으로 눌러 분홍 번짐을 걷는다
    pink = keep & ((r - g) > 35) & ((b - g) > 35) & (g > 60)
    rgba[pink, 0] = np.clip(g[pink] + 20, 0, 255); rgba[pink, 2] = np.clip(g[pink] + 25, 0, 255)
    # 밝은 초승달 기운의 옅은 분홍 — 흰빛으로 되돌린다(r·b를 g 쪽으로 70%)
    lite = keep & ~pink & (g > 150) & ((r - g) > 12) & ((b - g) > 12)
    rgba[lite, 0] = (g[lite] + (r[lite] - g[lite]) * 0.3).astype(np.uint8); rgba[lite, 2] = (g[lite] + (b[lite] - g[lite]) * 0.3).astype(np.uint8)
    gap = (C.shape[0] - 1) - bot
    hy = yy < top + (bot - top) * 0.22
    hx = xx[hy].mean()
    return rgba[top:bot + 1, l:rgt + 1], gap, hx - l, (top, bot, l, rgt)

def edge_expand(rgba):
    a = rgba[..., 3] > 0
    if a.all(): return rgba
    idx = ndi.distance_transform_edt(~a, return_distances=False, return_indices=True)
    out = rgba.copy()
    out[..., :3] = rgba[..., :3][idx[0], idx[1]]
    return out

def shrink(rgba, scale):
    e = edge_expand(rgba)
    w = max(1, round(e.shape[1] * scale)); h = max(1, round(e.shape[0] * scale))
    rgb = Image.fromarray(e[..., :3]).resize((w, h), Image.LANCZOS)
    al = Image.fromarray(e[..., 3]).resize((w, h), Image.LANCZOS)
    out = np.dstack([np.array(rgb), (np.array(al) >= 128) * 255]).astype(np.uint8)
    return out

def main():
    A = np.array(Image.open(SHEET).convert('RGB')).astype(int)
    xs, ys = grid(A)
    assert len(xs) == 6 and len(ys) == 3, (xs, ys)
    cells = [[cell_rgba(A, x0, x1, y0, y1) for (x0, x1) in xs] for (y0, y1) in ys]
    stand_h = cells[0][0][3][1] - cells[0][0][3][0] + 1          # 서 있는 컷(1줄 1칸)
    scale = BODY_PX / stand_h
    print('격자', xs, ys, '서 있는 컷 높이', stand_h, '배율 %.3f' % scale)
    review = []
    for key, (row, picks, W) in MOVES.items():
        strip = np.zeros((H, W * 4, 4), np.uint8)
        for fi, ci in enumerate(picks):
            rgba, gap, hx, bb = cells[row][ci]
            sm = shrink(rgba, scale)
            sh, sw = sm.shape[:2]
            ox = int(round(W / 2 - hx * scale))               # 머리 중심을 캔버스 가운데에
            oy = GROUND - int(round(gap * scale)) - sh + 1     # 칸 바닥 = 땅
            # 캔버스 밖으로 나가는 부분은 알린다(폭·높이를 다시 정한다)
            if ox < 0 or ox + sw > W or oy < 0:
                print(f'  ! {key}[{fi}] 캔버스 밖: ox{ox} sw{sw} W{W} oy{oy} sh{sh}')
            x0, y0 = max(0, ox), max(0, oy)
            src = sm[max(0, -oy):, max(0, -ox):][:H - y0, :W - x0]
            dst = strip[y0:y0 + src.shape[0], W * fi + x0:W * fi + x0 + src.shape[1]]
            m = src[..., 3] > 0; dst[m] = src[m]
            print(f'  {key}[{fi}] 칸 r{row}c{ci} 크기{sw}x{sh} 머리x{hx*scale:.1f} 뜸{gap*scale:.1f}px')
        Image.fromarray(strip).save(f'assets/{key}.png')
        review.append((key, strip))
    # 검사판 — 흰 배경 4배 확대, 세 동작을 세로로
    S = 4; pad = 8
    RW = max(s.shape[1] for _, s in review) * S + pad * 2
    RH = sum(H * S + pad for _, s in review) + pad
    R = Image.new('RGB', (RW, RH), 'white'); y = pad
    for key, s in review:
        im = Image.fromarray(s).resize((s.shape[1] * S, H * S), Image.NEAREST)
        R.paste(im, (pad, y), im); y += H * S + pad
    R.save('review/hero_kick2.png'); print('검사판 review/hero_kick2.png')

if __name__ == '__main__':
    main()
