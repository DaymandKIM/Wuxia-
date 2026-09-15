"""도 3종 (v2.74.2 — 재작업 시트 sheets/hero_saber3.png: 순마젠타·액자선 없음·무기 온전).
  1줄 베기 [0,1,2,3] 기수식→도 들어 올림→가로 베기 호→큰 호 · 2줄 내려찍기 [0,1,2,3] 뒤로 감음→머리 위→내려찍기 흙→낮게 찍기
  3줄 회전베기 [0,1,2,3] 기수식→뻗음→큰 원→겹호
gridless 모드(균등 6×3, 인물 발끝 땅, 기준 컷 1줄 1칸 배율). 검사판 review/hero_saber3.png
"""
import hero_sheet as HS
STRIPS = {'saberslash': [(0,0),(0,1),(0,2),(0,3)], 'sabersmash': [(1,0),(1,1),(1,2),(1,3)], 'saberspin': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_saber3.png', STRIPS, 'review/hero_saber3.png', center='hair', stand_cell=(0,0))
