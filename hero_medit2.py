"""운기조식 6컷 (v2.77 — 사용자 운기조식 시트 sheets/hero_medit2.png: 순마젠타·선 없음·3줄×6칸, 주먹4 계열 톤).
  medit [(0,2),(1,1),(1,2),(1,3),(1,4),(1,5)] 가부좌 → 기운 한 줄기 → 고리 → 고리 여럿 → 손안 빛 → 가부좌 (반복 루프)
안 쓰는 칸: (0,0)서기·(0,1)앉는 중·(0,3)(0,4)(1,0)앉음 반복·(2,0)팔 벌림·(2,1)큰 원·(2,2)온몸 발광(캔버스가 너무 넓다)·
(2,4)(2,5)서기, (0,5)(2,3)은 확대 컷이라 배율이 달라 못 쓴다.
gridless, 기준 컷 (0,0) 서 있는 자세. 뽑은 뒤 **python skinmatch.py medit** (질주 톤으로). 옛 컷은 raw/medit_old.
검사판 review/hero_medit2.png
"""
import numpy as np
from scipy import ndimage as ndi
import hero_sheet as HS
MIN_PX = 150
def desmall(S, key, cell, rgba):
    lab, n = ndi.label(rgba[..., 3] > 0); out = rgba.copy(); d = 0
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < MIN_PX: out[m] = 0; d += 1
    if d: print(f'  r{cell[0]}c{cell[1]}: 부유 조각 {d}개 제거')
    return out
STRIPS = {'medit': [(0,2),(1,1),(1,2),(1,3),(1,4),(1,5)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_medit2.png', STRIPS, 'review/hero_medit2.png', center='hair', stand_cell=(0,0), patch=desmall)
