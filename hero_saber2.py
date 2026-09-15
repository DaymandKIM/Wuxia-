"""주인공 검 공격 추출 (v2.72.2, 사용자 시트 sheets/hero_saber2.png — 3줄×6칸). 무기 자리에 도(刀)를 끼면 기본공격이 이 3종이 된다.
  1줄 = 기수식·도 쥠·가로 베기 호·큰 호 베기·내려찍기(흙)·올려베기 호
  2줄 = 기수식·앞으로 뻗음·큰 원 베기·겹호 베기·낮게 찍기(흙)·뒤로 치켜듦
  3줄 = 뒤로 감아 쥠·가로 겨눔·나선 호·땅에 꽂음(흙)·쥐고 섬·머리 위 치켜듦
동작(4컷, 임팩트 index2):
  saberslash 베기     = 1줄 [0,1,2,3]  기수식→쥠→가로 베기 호→큰 호
  sabersmash 내려찍기 = 3줄0 · 3줄5 · 1줄4 · 2줄4  뒤로 감음→머리 위→내려찍기 흙→낮게 찍기
  saberspin  회전베기 = 2줄 [0,1,2,3]  기수식→뻗음→큰 원→겹호
배율·정렬은 hero_kick2와 같다(머리 중심·칸 바닥). 결과: assets/sword*.png + review/hero_saber2.png
"""
import numpy as np
from PIL import Image
import hero_kick2 as K

SHEET = 'sheets/hero_saber2.png'; STAND_H = 172
STRIPS = { 'saberslash': ([(0,0),(0,1),(0,2),(0,3)], 62),
           'sabersmash': ([(2,0),(2,5),(0,4),(1,4)], 62),
           'saberspin':  ([(1,0),(1,1),(1,2),(1,3)], 64) }
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
    R.save('review/hero_saber2.png'); print('검사판 review/hero_saber2.png')
if __name__ == '__main__': main()
