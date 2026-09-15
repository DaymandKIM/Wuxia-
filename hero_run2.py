"""주인공 질주 추출 (v2.71.1, 사용자 시트 sheets/hero_run2.png — 3줄×6칸)
  1줄 = 곧게 선 질주 6컷(쓴다) · 2줄 = 무릎 높이 걷기(안 씀) · 3줄 = 앞뒤 컷이 웅크림이라 사이클 불가(안 씀)
hero_kick2의 격자·칸 추출·축소를 그대로 쓴다. 배율도 발차기와 같은 값(서 있는 컷 172px → 47px)이라
동작끼리 인물 크기가 맞는다. 가로는 몸통(35~65% 행) 무게중심을 캔버스 가운데에 — 좌우 흔들림 방지.
결과: assets/run.png (6컷 × HFX.aw.run 46 × 51) + review/hero_run2.png
"""
import numpy as np
from PIL import Image
import hero_kick2 as K

SHEET = 'sheets/hero_run2.png'; ROW = 0; W = 46; STAND_H = 172   # 발차기 시트의 서 있는 컷 높이(같은 배율)
def main():
    A = np.array(Image.open(SHEET).convert('RGB')).astype(int)
    xs, ys = K.grid(A); assert len(xs) == 6 and len(ys) == 3, (xs, ys)
    scale = K.BODY_PX / STAND_H
    y0, y1 = ys[ROW]; n = len(xs)
    strip = np.zeros((K.H, W * n, 4), np.uint8)
    for fi, (x0, x1) in enumerate(xs):
        rgba, gap, hx, bb = K.cell_rgba(A, x0, x1, y0, y1)
        a = rgba[..., 3] > 0; yy, xx = np.where(a)
        hh = rgba.shape[0]; mid = (yy > hh * 0.35) & (yy < hh * 0.65)
        cx = xx[mid].mean()
        sm = K.shrink(rgba, scale); sh, sw = sm.shape[:2]
        ox = int(round(W / 2 - cx * scale)); oy = K.GROUND - int(round(gap * scale)) - sh + 1
        if ox < 0 or ox + sw > W or oy < 0: print(f'  ! run[{fi}] 캔버스 밖: ox{ox} sw{sw} oy{oy} sh{sh}')
        x0c, y0c = max(0, ox), max(0, oy)
        src = sm[max(0, -oy):, max(0, -ox):][:K.H - y0c, :W - x0c]
        dst = strip[y0c:y0c + src.shape[0], W * fi + x0c:W * fi + x0c + src.shape[1]]
        m = src[..., 3] > 0; dst[m] = src[m]
        print(f'  run[{fi}] 크기{sw}x{sh} 몸통x{cx*scale:.1f} 뜸{gap*scale:.1f}')
    Image.fromarray(strip).save('assets/run.png')
    S = 4; im = Image.fromarray(strip).resize((strip.shape[1] * S, K.H * S), Image.NEAREST)
    R = Image.new('RGB', (im.width + 16, im.height + 16), 'white'); R.paste(im, (8, 8), im); R.save('review/hero_run2.png')
    print('검사판 review/hero_run2.png')
if __name__ == '__main__': main()
