"""봉 3종 (v2.74.4 — 재작업 시트 sheets/hero_staff3.png: 순마젠타·옅은 격자선·무기 온전).
  1줄 휘두르기 [0,1,3,2] 사선 쥠→낮게 겨눔→머리 위 호→가로 찌르기 (5칸 연타 잔상은 반투명이라 뺌)
  2줄 쓸기 [0,1,2,3] 낮게 쥠→비껴 치켜듦→낮게 쓸기 호→쓸기 호 · 3줄 회전 [0,1,2,3] 가로 겨눔→뒤로 돌리기 호→큰 원→세워 꽂음
gridless 모드. 검사판 review/hero_staff3.png
"""
import hero_sheet as HS
STRIPS = {'staffswing': [(0,0),(0,1),(0,3),(0,2)], 'staffsweep': [(1,0),(1,1),(1,2),(1,3)], 'staffspin': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_staff3.png', STRIPS, 'review/hero_staff3.png', center='hair', stand_cell=(0,0))
