"""창 3종 (v2.74.3 — 재작업 시트 sheets/hero_spear3.png: 순마젠타·옅은 마젠타 격자선(배경으로 걷힘)·무기 온전).
  1줄 찌르기 [0,1,3,2] 사선 쥠→낮게 겨눔→찌르기 기운→가로 찌르기 · 2줄 쓸기 [0,1,2,3] 기수식→비껴 치켜듦→낮게 쓸기 호→쓸기 호
  3줄 회전 [0,1,2,3] 가로 겨눔→뒤로 돌리기 호→큰 원→땅에 꽂음(흙)
gridless 모드(균등 6×3, 인물 발끝 땅, 기준 컷 1줄 1칸 배율). 검사판 review/hero_spear3.png
"""
import hero_sheet as HS
STRIPS = {'spearthrust': [(0,0),(0,1),(0,3),(0,2)], 'spearsweep': [(1,0),(1,1),(1,2),(1,3)], 'spearspin': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_spear3.png', STRIPS, 'review/hero_spear3.png', center='hair', stand_cell=(0,0))
