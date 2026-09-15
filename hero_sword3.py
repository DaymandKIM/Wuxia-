"""검 3종 (v2.74 — 재작업 시트 sheets/hero_sword3.png: 순마젠타 배경·액자선 없음·무기 온전, docs/프롬프트-주인공.md 규격).
  1줄 찌르기 [0,2,3,4] 기수식→검 내림→찌르기 별→찌르기 뻗음 · 2줄 베기 [0,1,2,3] 치켜듦→더 높이→내려베기 별→사선 호
  3줄 회전베기 [0,1,2,3] 기수식→큰 세로 호→큰 원→낮은 베기(흙)
격자선이 없어 hero_sheet가 균등 6×3 분할·인물 발끝 땅·기준 컷(1줄 1칸) 키로 배율을 잡는다. 검사판 review/hero_sword3.png
"""
import hero_sheet as HS
STRIPS = {'swordthrust': [(0,0),(0,2),(0,3),(0,4)], 'swordslash': [(1,0),(1,1),(1,2),(1,3)], 'swordspin': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_sword3.png', STRIPS, 'review/hero_sword3.png', center='hair', stand_cell=(0,0))
