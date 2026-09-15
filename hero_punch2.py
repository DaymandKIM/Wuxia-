"""주인공 주먹 공격 추출 (v2.71.2, 사용자 시트 sheets/hero_punch2.png — 3줄×6칸)
  1줄 = 정권: 기수식→뻗음→뻗음→별 임팩트→(주먹 클로즈업: 안 씀)→기수식
  2줄 = 초승달 정권·올려치기·잔상 연타·내려치기 (잔상 컷은 회색 분신이 작게는 얼룩으로 보여 안 씀)
  3줄 = 정권·휘감는 기운 정권·별 임팩트·웅크려 치기·뛰어 치기·기운 정권
오른손 판 punch = 1줄 [0,1,3,2](기수식→뻗음→임팩트→뻗음), 왼손 판 punchb = 3줄 [1,0,2,5](기운 휘감기→뻗음→임팩트→뻗음).
두 판을 공격마다 번갈아 튼다(P.atkAlt — 옛 katka/katkb 자리). 배율·정렬은 hero_kick2와 같다(머리 중심).
결과: assets/punch.png · punchb.png (4컷 × HFX.aw.punch 48 × 51) + review/hero_punch2.png
"""
import numpy as np
from PIL import Image
import hero_kick2 as K

SHEET = 'sheets/hero_punch2.png'; W = 48; STAND_H = 172
STRIPS = { 'punch': (0, [0, 1, 3, 2]), 'punchb': (2, [1, 0, 2, 5]) }
def main():
    A = np.array(Image.open(SHEET).convert('RGB')).astype(int)
    xs, ys = K.grid(A); assert len(xs) == 6 and len(ys) == 3, (xs, ys)
    scale = K.BODY_PX / STAND_H
    review = []
    for key, (row, picks) in STRIPS.items():
        y0, y1 = ys[row]
        strip = np.zeros((K.H, W * 4, 4), np.uint8)
        for fi, ci in enumerate(picks):
            x0, x1 = xs[ci]
            rgba, gap, hx, bb = K.cell_rgba(A, x0, x1, y0, y1)
            sm = K.shrink(rgba, scale); sh, sw = sm.shape[:2]
            ox = int(round(W / 2 - hx * scale)); oy = K.GROUND - int(round(gap * scale)) - sh + 1
            if ox < 0 or ox + sw > W or oy < 0: print(f'  ! {key}[{fi}] 캔버스 밖: ox{ox} sw{sw} oy{oy} sh{sh}')
            x0c, y0c = max(0, ox), max(0, oy)
            src = sm[max(0, -oy):, max(0, -ox):][:K.H - y0c, :W - x0c]
            dst = strip[y0c:y0c + src.shape[0], W * fi + x0c:W * fi + x0c + src.shape[1]]
            m = src[..., 3] > 0; dst[m] = src[m]
            print(f'  {key}[{fi}] 칸 r{row}c{ci} 크기{sw}x{sh} 머리x{hx*scale:.1f} 뜸{gap*scale:.1f}')
        Image.fromarray(strip).save(f'assets/{key}.png'); review.append(strip)
    S = 4; pad = 8
    R = Image.new('RGB', (W * 4 * S + pad * 2, (K.H * S + pad) * 2 + pad), 'white'); y = pad
    for s in review:
        im = Image.fromarray(s).resize((s.shape[1] * S, K.H * S), Image.NEAREST); R.paste(im, (pad, y), im); y += K.H * S + pad
    R.save('review/hero_punch2.png'); print('검사판 review/hero_punch2.png')
if __name__ == '__main__': main()
