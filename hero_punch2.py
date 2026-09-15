"""주인공 정권 두 판 (v2.71.2 → v2.73). 오른손 punch = 1줄 [0,1,3,2] · 왼손 punchb = 3줄 [1,0,2,5]
공용 추출기 hero_sheet.py — 시트 전체 덩어리 라벨링으로 **그림 기준** 크롭(칸 밖으로 나간 무기·기운 포함),
캔버스 폭·높이 자동. 결과 [폭, 높이, 위 여분]을 00-data HFX.aw / HFX.fh 에 옮긴다. 검사판 review/hero_punch2.png
"""
import hero_sheet as HS
STRIPS = {'punch': [(0,0),(0,1),(0,3),(0,2)], 'punchb': [(2,1),(2,0),(2,2),(2,5)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_punch2.png', STRIPS, 'review/hero_punch2.png', center='hair', share_width=True)
