"""옛 시트 스트립의 살색을 새 시트 톤에 맞춘다 (v2.76.4, 사용자: "권기 중 피부색이 오묘하게 다른 게 있더라").
옛 시트(hero_fx 권기·hero_kick2 발차기)는 살색이 (224,152,120) 주황빛, 새 시트(hero_punch4·hero_kick3)는 (208,176,144)
베이지다. 살색 픽셀(r>140 · r-g>40 · g-b>15 — 흙먼지·도복 베이지는 r-g 20 안팎이라 안 잡힘)만 채널별 비율로 옮긴다.
사용: python skinmatch.py [키...]  (기본: qipunch qipunchb kickside2 kickround2 kickhigh2 dashfly dashland)
기준색 TARGET은 새 시트 밝은 살색 (210,178,146)(hero_punch4 상위 색 (208,176,144)·(216,184,152)) — 자동으로 재면 새 시트는
살색과 도복 베이지(185,165,130)가 r-g 20~32로 겹쳐 마스크가 그늘만 잡는다(첫 시도 사고). 옛 스트립을 다시 뽑으면 다시 돌린다.
"""
import sys
import numpy as np
from PIL import Image
OLD = ['qipunch', 'qipunchb', 'kickside2', 'kickround2', 'kickhigh2', 'dashfly', 'dashland']
def skin_mask(F):
    a = F[..., 3] > 0; r, g, b = F[..., 0], F[..., 1], F[..., 2]
    return a & (r > 140) & ((r - g) > 40) & ((g - b) > 15) & (b < 170)
TARGET = np.array([210., 178., 146.])     # 새 시트 밝은 살색
if __name__ == '__main__':
    keys = sys.argv[1:] or OLD
    target = TARGET
    print('기준 살색(새 시트 밝은 살색)', target)
    for k in keys:
        p = f'assets/{k}.png'; A = np.array(Image.open(p).convert('RGBA')).astype(int)
        m = skin_mask(A)
        if not m.any(): print(f'  {k}: 살색 없음'); continue
        # 밝은 살색(마스크 안 상위 30%)의 평균을 기준색으로 옮긴다 — 그늘은 같은 비율로 따라간다
        lum = A[m][:, :3].sum(1); bright = A[m][:, :3][lum >= np.percentile(lum, 70)]
        src = bright.mean(0); ratio = target / src
        rgb = np.clip(A[..., :3] * ratio, 0, 255)
        A[..., :3][m] = rgb[m]
        Image.fromarray(A.astype(np.uint8)).save(p)
        print(f'  {k}: {src.round(0)} → {A[m][:, :3].mean(0).round(0)}  ({int(m.sum())}px)')
