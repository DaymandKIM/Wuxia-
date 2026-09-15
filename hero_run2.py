"""주인공 질주 6컷 (v2.71.1 → v2.73). 1줄 전부. 가로 정렬은 몸통 무게중심
공용 추출기 hero_sheet.py — 시트 전체 덩어리 라벨링으로 **그림 기준** 크롭(칸 밖으로 나간 무기·기운 포함),
캔버스 폭·높이 자동. 결과 [폭, 높이, 위 여분]을 00-data HFX.aw / HFX.fh 에 옮긴다. 검사판 review/hero_run2.png
v2.76.6: 질주 시트도 머리 큰 비율(머리 폭 27 vs 새 시트 20~23)이라 scale_mul 0.85 — 서 있는 기준 컷이 없어 STAND_H 기준.
뽑은 뒤 `python skinmatch.py run`으로 살색·옷색(파란 허리띠·바지 → 회청)을 새 시트에 맞춘다.
"""
import hero_sheet as HS
STRIPS = {'run': [(0,0),(0,1),(0,2),(0,3),(0,4),(0,5)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_run2.png', STRIPS, 'review/hero_run2.png', center='torso', scale_mul=0.85)
