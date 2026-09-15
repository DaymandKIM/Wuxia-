"""발차기 3종 (v2.76.1 — 사용자 발차기 시트 sheets/hero_kick3.png: 순마젠타·선 없음·3줄×6칸, hero_punch4와 같은 계열).
  옆차기 kickside   [(0,0),(1,1),(1,2),(0,1)] 무릎 챔버→차기→푸른 기운 임팩트→수평으로 뻗음
  돌려차기 kickround [(2,0),(2,1),(2,2),(1,4)] 챔버→차기→작은 초승달 임팩트→큰 초승달 뻗음
  뛰어차기 kickhigh  [(1,0),(2,4),(2,3),(0,4)] 챔버→도약(공중)→별 임팩트·흙먼지→착지하며 뻗음
임팩트 index2·마지막 컷 완전히 뻗음. 안 쓰는 칸: 주먹 자세 (0,2)(0,3)(0,5)(1,3 큰 원)(1,5)(2,5).
patch: 150px 미만 부유 조각(얇은 기운 파편) + 자줏빛 덩어리(도약 컷 발밑 그림자 — 마젠타에 물든 색이라 게임 그림자와 겹친다) 제거.
옛 발차기(hero_kick2)는 raw/kick2_old 보관. gridless 모드(기준 컷 (0,0) 162px — hero_punch4의 (0,0) 161px와 같은 배율이라 주먹·발차기 인물 크기가 맞는다), 검사판 review/hero_kick3.png
**뽑은 뒤 `python skinmatch.py`** — 이 시트는 살·옷·도복 톤이 질주 시트와 달라(황갈 살·회청 옷) 질주 톤으로 맞춘다(v2.76.7).
"""
import numpy as np
from scipy import ndimage as ndi
import hero_sheet as HS
MIN_PX = 150
def clean(S, key, cell, rgba):
    lab, n = ndi.label(rgba[..., 3] > 0); out = rgba.copy(); dropped = 0
    sizes = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1)); big = int(np.argmax(sizes)) + 1
    for i in range(1, n + 1):
        m = lab == i
        if i == big: continue
        c = rgba[m][:, :3].astype(int).mean(0)
        purple = c[0] > c[1] + 40 and c[2] > c[1] + 40
        if m.sum() < MIN_PX or purple: out[m] = 0; dropped += 1
    if dropped: print(f'  r{cell[0]}c{cell[1]}: 조각 {dropped}개 제거')
    return out
STRIPS = {'kickside': [(0,0),(1,1),(1,2),(0,1)], 'kickround': [(2,0),(2,1),(2,2),(1,4)], 'kickhigh': [(1,0),(2,4),(2,3),(0,4)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_kick3.png', STRIPS, 'review/hero_kick3.png', center='hair', stand_cell=(0,0), patch=clean)
