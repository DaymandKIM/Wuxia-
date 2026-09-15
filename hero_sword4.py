"""검 3종 (v2.74.5 — 두 번째 재작업 시트 sheets/hero_sword4.png). hero_sword3와 비교(review/sword34_compare.png):
검기가 다른 무기와 같은 하늘색이고 자세 기울임·임팩트가 더 살아 있어 이쪽을 쓴다(사용자: 쓸 만한 걸 비교해서 조합).
  1줄 찌르기 [0,2,3,4] 기수식→검 내림→찌르기 별→찌르기 뻗음 · 2줄 베기 [0,1,2,3] 치켜듦→더 높이→내려베기 별→사선 호
  3줄 회전베기 [0,1,2,3] 가로 겨눔→큰 세로 호→큰 원→땅에 꽂음(흙)
gridless 모드. 검사판 review/hero_sword4.png
"""
import hero_sheet as HS
STRIPS = {'swordthrust': [(0,0),(0,2),(0,3),(0,4)], 'swordslash': [(1,0),(1,1),(1,2),(1,3)], 'swordspin': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_sword4.png', STRIPS, 'review/hero_sword4.png', center='hair', stand_cell=(0,0))
