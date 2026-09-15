"""주인공 발차기 3종 (v2.71 → v2.73 그림 기준 재추출). 1줄 옆차기 [0,1,2,3] · 2줄 돌려차기 [0,2,3,4] · 3줄 뛰어차기 [0,1,2,3]
공용 추출기 hero_sheet.py — 시트 전체 덩어리 라벨링으로 **그림 기준** 크롭(칸 밖으로 나간 무기·기운 포함),
캔버스 폭·높이 자동. 결과 [폭, 높이, 위 여분]을 00-data HFX.aw / HFX.fh 에 옮긴다. 검사판 review/hero_kick2.png
"""
import hero_sheet as HS
STRIPS = {'kickside': [(0,0),(0,1),(0,2),(0,3)], 'kickround': [(1,0),(1,2),(1,3),(1,4)], 'kickhigh': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_kick2.png', STRIPS, 'review/hero_kick2.png', center='hair')
