"""주인공 검 공격 추출 (v2.72.4, 사용자 시트 sheets/hero_staff2.png — 3줄×6칸). 무기 자리에 봉을 끼면 기본공격이 이 3종이 된다.
  1줄 = 사선 쥠·낮게 겨눔·가로 찌르기·머리 위 휘두르기 호·연타(잔상 봉)·세워 쥠
  2줄 = 낮게 쥠·낮게 쓸기 호·큰 원 돌리기·쓸기 호·땅 찍기(흙)·비껴 치켜듦
  3줄 = 뒤로 돌리기 호·가로 겨눔·찌르기·세워 꽂음·낮게 가로 쥠·봉 둘 교차(안 씀)
동작(4컷, 임팩트 index2):
  staffswing 휘두르기 = 1줄 [0,1,3,4]  사선 쥠→낮게 겨눔→머리 위 휘두르기 호→연타
  staffsweep 쓸기     = 2줄 [0,5,1,3]  낮게 쥠→비껴 치켜듦→낮게 쓸기 호→쓸기 호
  staffspin  회전     = 3줄1 · 3줄0 · 2줄2 · 2줄4  가로 겨눔→뒤로 돌리기 호→큰 원→땅 찍기
배율·정렬은 hero_kick2와 같다(머리 중심·칸 바닥). 결과: assets/sword*.png + review/hero_staff2.png
"""
import numpy as np
from PIL import Image
import hero_kick2 as K

SHEET = 'sheets/hero_staff2.png'; STAND_H = 172
STRIPS = { 'staffswing': ([(0,0),(0,1),(0,3),(0,4)], 66),
           'staffsweep': ([(1,0),(1,5),(1,1),(1,3)], 66),
           'staffspin':  ([(2,1),(2,0),(1,2),(1,4)], 66) }
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
    R.save('review/hero_staff2.png'); print('검사판 review/hero_staff2.png')
if __name__ == '__main__': main()
