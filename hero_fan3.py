"""부채 3종 (v2.75 — 재작업 시트 sheets/hero_fan3.png: 순마젠타·옅은 격자선·무기 온전).
  1줄 휘두르기 [1,2,3,4] 옆으로 펼침→내려 쓸기→큰 초승달 호→치켜들며 별 · 2줄 회전 [0,2,3,4] 가슴 앞→호 둘→큰 원→낮게 쓸기(흙)
  3줄 찌르기 [0,1,2,3] 기수식→머리 위→나선 호→앞으로 뻗음
gridless 모드. 검사판 review/hero_fan3.png
**뽑은 뒤 `python skinmatch.py`** — 이 시트는 살·옷·도복 톤이 질주 시트와 달라(황갈 살·회청 옷) 질주 톤으로 맞춘다(v2.76.7).
"""
import hero_sheet as HS
STRIPS = {'fansweep': [(0,1),(0,2),(0,3),(0,4)], 'fanspin': [(1,0),(1,2),(1,3),(1,4)], 'fanstrike': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_fan3.png', STRIPS, 'review/hero_fan3.png', center='hair', stand_cell=(0,0))
