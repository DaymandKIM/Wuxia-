"""도 3종 (v2.72.2 → v2.73). 베기 1줄[0,1,2,3] · 내려찍기 3줄0·3줄5·1줄4·2줄4 · 회전베기 2줄[0,1,2,3]
공용 추출기 hero_sheet.py — 시트 전체 덩어리 라벨링으로 **그림 기준** 크롭(칸 밖으로 나간 무기·기운 포함),
캔버스 폭·높이 자동. 결과 [폭, 높이, 위 여분]을 00-data HFX.aw / HFX.fh 에 옮긴다. 검사판 review/hero_saber2.png
"""
import hero_sheet as HS
STRIPS = {'saberslash': [(0,0),(0,1),(0,2),(0,3)], 'sabersmash': [(2,0),(2,5),(0,4),(1,4)], 'saberspin': [(1,0),(1,1),(1,2),(1,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_saber2.png', STRIPS, 'review/hero_saber2.png', center='hair')
