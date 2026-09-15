"""주먹 3종 (v2.76 — 사용자 주먹 시트 sheets/hero_punch4.png: 순마젠타·선 없음·3줄×6칸).
  정권 punch      [1줄 0,1,2,3] 기수식→잽→내지름→초승달 기운
  연환권 punchdbl [(1,0),(1,1),(1,5),(1,3)] 기수식→잽→내지름 흙먼지→큰 원
      (1,2) 잔상 두 방 컷은 잔상 픽셀이 마젠타 계열(224,0,224)이라 배경과 못 가른다 — 윤곽만 남아 폐기
  승룡권 punchup  [(2,0),(2,5),(1,4),(0,4)] 기수식→뒤로 당김→치켜올림 흙먼지→올려치기 별 (줄을 섞어 조합)
임팩트는 index2·마지막 컷이 완전히 뻗은 것. 안 쓰는 칸: (0,5)잽 반복·(1,2)잔상·(2,1)잽·(2,2)뒤 초승달·(2,3)방어·(2,4)잽.
얇은 흰 별빛·흙 곁 분홍 점(마젠타에 물든 파편)은 patch(desmall)로 원본에서 150px 미만 부유 조각을 지운다 — 크롭은 안 바꿔 정렬 유지.
옛 권기 정권(hero_punch3, 두 판 교대)은 raw/punch3_old에 보관. gridless 모드, 검사판 review/hero_punch4.png
**뽑은 뒤 `python skinmatch.py`** — 이 시트는 살·옷·도복 톤이 질주 시트와 달라(황갈 살·회청 옷) 질주 톤으로 맞춘다(v2.76.7).
"""
import numpy as np
from scipy import ndimage as ndi
import hero_sheet as HS
MIN_PX = 150
def desmall(S, key, cell, rgba):
    lab, n = ndi.label(rgba[..., 3] > 0); out = rgba.copy(); dropped = 0
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < MIN_PX: out[m] = 0; dropped += 1
    if dropped: print(f'  r{cell[0]}c{cell[1]}: 부유 조각 {dropped}개 제거')
    return out
STRIPS = {'punch': [(0,0),(0,1),(0,2),(0,3)], 'punchdbl': [(1,0),(1,1),(1,5),(1,3)], 'punchup': [(2,0),(2,5),(1,4),(0,4)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_punch4.png', STRIPS, 'review/hero_punch4.png', center='hair', stand_cell=(0,0), patch=desmall)
