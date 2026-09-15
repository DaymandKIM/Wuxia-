"""검 3종 (v2.72 → v2.73). 찌르기 1줄[0,2,3]+3줄2 · 베기 3줄0+2줄[0,1,2] · 회전베기 2줄5·3줄1·2줄3·2줄4
공용 추출기 hero_sheet.py — 시트 전체 덩어리 라벨링으로 **그림 기준** 크롭(칸 밖으로 나간 무기·기운 포함),
캔버스 폭·높이 자동. 결과 [폭, 높이, 위 여분]을 00-data HFX.aw / HFX.fh 에 옮긴다. 검사판 review/hero_sword2.png
"""
import hero_sheet as HS
STRIPS = {'swordthrust': [(0,0),(0,2),(0,3),(2,2)], 'swordslash': [(2,0),(1,0),(1,1),(1,2)], 'swordspin': [(1,5),(2,1),(1,3),(1,4)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_sword2.png', STRIPS, 'review/hero_sword2.png', center='hair')
