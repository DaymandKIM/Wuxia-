"""부채 3종 (v2.72.1 → v2.73). 휘두르기 1줄[0,2,4,3] · 회전 2줄[0,2,3,4] · 찌르기 3줄[5,0,2,3] (머리 위 부채 컷은 원본에서 테두리에 잘려 있어 뺌)
공용 추출기 hero_sheet.py — 시트 전체 덩어리 라벨링으로 **그림 기준** 크롭(칸 밖으로 나간 무기·기운 포함),
캔버스 폭·높이 자동. 결과 [폭, 높이, 위 여분]을 00-data HFX.aw / HFX.fh 에 옮긴다. 검사판 review/hero_fan2.png
"""
import hero_sheet as HS
STRIPS = {'fansweep': [(0,0),(0,2),(0,4),(0,3)], 'fanspin': [(1,0),(1,2),(1,3),(1,4)], 'fanstrike': [(2,5),(2,0),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_fan2.png', STRIPS, 'review/hero_fan2.png', center='hair')
