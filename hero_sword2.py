"""주인공 검 공격 추출 (v2.72, 사용자 시트 sheets/hero_sword2.png — 3줄×6칸). 무기 자리에 검을 끼면 기본공격이 이 3종이 된다.
  1줄 = 기수식·발도 호·검 내림·찌르기(별)·사선 베기 호·검 세움
  2줄 = 치켜듦·내려베기(별 폭발)·사선 호·큰 원 베기·낮은 베기(흙)·기수식
  3줄 = 치켜듦·큰 세로 호·찌르기·찌르기(별)·베기 호(별)·낮은 기수식
동작(4컷, 임팩트 index2):
  swordthrust 찌르기 = 1줄 [0,2,3,4]  기수식→검 내림→찌르기 별→사선 호
  swordslash  베기   = 3줄0 + 2줄 [0,1,2]  치켜듦→더 높이→내려베기 별→사선 호
  swordspin   회전베기 = 2줄5 · 3줄1 · 2줄3 · 2줄4  기수식→큰 세로 호→큰 원 베기→낮은 베기
배율·정렬은 hero_kick2와 같다(머리 중심·칸 바닥). 결과: assets/sword*.png + review/hero_sword2.png
"""
import numpy as np
from PIL import Image
import hero_kick2 as K

SHEET = 'sheets/hero_sword2.png'; STAND_H = 172
STRIPS = { 'swordthrust': ([(0,0),(0,2),(0,3),(0,4)], 60),
           'swordslash':  ([(2,0),(1,0),(1,1),(1,2)], 60),
           'swordspin':   ([(1,5),(2,1),(1,3),(1,4)], 64) }
def main():
    A = np.array(Image.open(SHEET).convert('RGB')).astype(int)
    xs, ys = K.grid(A); assert len(xs) == 6 and len(ys) == 3, (xs, ys)
    scale = K.BODY_PX / STAND_H
    review = []
    for key, (picks, W) in STRIPS.items():
        strip = np.zeros((K.H, W * 4, 4), np.uint8)
        for fi, (row, ci) in enumerate(picks):
            x0, x1 = xs[ci]; y0, y1 = ys[row]
            rgba, gap, hx, bb = K.cell_rgba(A, x0, x1, y0, y1)
            sm = K.shrink(rgba, scale); sh, sw = sm.shape[:2]
            ox = int(round(W / 2 - hx * scale)); oy = K.GROUND - int(round(gap * scale)) - sh + 1
            if ox < 0 or ox + sw > W or oy < 0: print(f'  ! {key}[{fi}] 캔버스 밖: ox{ox} sw{sw} W{W} oy{oy} sh{sh}')
            x0c, y0c = max(0, ox), max(0, oy)
            src = sm[max(0, -oy):, max(0, -ox):][:K.H - y0c, :W - x0c]
            dst = strip[y0c:y0c + src.shape[0], W * fi + x0c:W * fi + x0c + src.shape[1]]
            m = src[..., 3] > 0; dst[m] = src[m]
            print(f'  {key}[{fi}] 칸 r{row}c{ci} 크기{sw}x{sh} 머리x{hx*scale:.1f} 뜸{gap*scale:.1f}')
        Image.fromarray(strip).save(f'assets/{key}.png'); review.append(strip)
    S = 4; pad = 8
    R = Image.new('RGB', (max(s.shape[1] for s in review) * S + pad * 2, (K.H * S + pad) * len(review) + pad), 'white'); y = pad
    for s in review:
        im = Image.fromarray(s).resize((s.shape[1] * S, K.H * S), Image.NEAREST); R.paste(im, (pad, y), im); y += K.H * S + pad
    R.save('review/hero_sword2.png'); print('검사판 review/hero_sword2.png')
if __name__ == '__main__': main()
