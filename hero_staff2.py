"""봉 3종 (v2.72.4 → v2.73). 휘두르기 1줄[0,1,3,2] (연타 컷은 잔상 봉이 옅어 끊겨 보여 뺌) · 쓸기 2줄[0,5,1,3] · 회전 3줄1·3줄0·2줄2·2줄4
공용 추출기 hero_sheet.py — 시트 전체 덩어리 라벨링으로 **그림 기준** 크롭(칸 밖으로 나간 무기·기운 포함),
캔버스 폭·높이 자동. 결과 [폭, 높이, 위 여분]을 00-data HFX.aw / HFX.fh 에 옮긴다. 검사판 review/hero_staff2.png
"""
import hero_sheet as HS
STRIPS = {'staffswing': [(0,0),(0,1),(0,3),(0,2)], 'staffsweep': [(1,0),(1,5),(1,1),(1,3)], 'staffspin': [(2,1),(2,0),(1,2),(1,4)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_staff2.png', STRIPS, 'review/hero_staff2.png', center='hair')
