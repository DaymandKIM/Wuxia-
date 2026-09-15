"""주인공 스트립의 살색·옷색·도복색을 **질주 컷 톤**에 맞춘다 (v2.76.7, 사용자 확정: "걷고 뛰는 거에 톤을 다 맞춰, 모든 동작").
기준 = 질주(hero_run2 원본)·옛 발차기(kick2)·권기(hero_fx)·경공·무기 5종(sword4·saber3·spear3·staff3)이 공유하는 톤:
  살색 (225,160,132) 주황빛 · 허리띠·바지 파랑 (75,80,121) · 도복 (212,191,167)
다른 톤인 시트 = hero_punch4·hero_kick3·hero_fan3(+거기서 뽑은 대기·피격): 살 황갈 (203,139,125)·옷 회청 (88,78,112)·
도복 (217,182,155). 이 스트립들을 뽑은 뒤 이 스크립트를 돌린다(기본 대상). 마스크는 밝은 30% 평균을 목표로 채널별
비율 이동 — 그늘은 같은 비율로 따라간다.
  살색: r>140·r-g>40·g-b>0 (도복 r-g 20·흙먼지 30은 안 잡힘)
  옷:   b>r+12·b>g+15·r<120·b<=150·g<=110 (기운 이펙트는 밝고 g가 높아 제외, 머리카락은 b-r 0)
  도복: 150<r<=226·g<=200·r>g>b·8<=r-g<40·25<r-b<90 (살색은 r-g 64라 제외. **크림 초승달(241,226,206)은 r·g 상한으로 제외** —
        처음엔 초승달이 '밝은 30%'가 돼 도복이 그만큼 어두워졌다. 흙먼지는 조금 따라오지만 비율이 작아 무해)
v2.76.4~6의 반대 방향(새 시트 톤으로 옛 것을 맞춤)은 폐기 — 사용자가 질주 톤을 골랐다.
사용: python skinmatch.py [키...]
"""
import sys
import numpy as np
from PIL import Image
NEW = ['punch', 'punchdbl', 'punchup', 'kickside', 'kickround', 'kickhigh', 'idle', 'hit', 'fansweep', 'fanspin', 'fanstrike']
SKIN  = np.array([225., 160., 132.])
CLOTH = np.array([75., 80., 121.])
ROBE  = np.array([212., 191., 167.])
def masks(A):
    a = A[..., 3] > 0; r, g, b = A[..., 0], A[..., 1], A[..., 2]
    skin  = a & (r > 140) & ((r - g) > 40) & ((g - b) > 0) & ((r - b) > 50) & (b < 170)
    cloth = a & (b > r + 12) & (b > g + 15) & (r < 120) & (b <= 150) & (g <= 110)
    robe  = a & (r > 150) & (r <= 226) & (g <= 200) & (r > g) & (g > b) & ((r - g) >= 8) & ((r - g) < 40) & ((r - b) > 25) & ((r - b) < 90)
    return skin, cloth, robe
def shift(A, m, target, label):
    if m.sum() < 20: return None
    lum = A[m][:, :3].sum(1); bright = A[m][:, :3][lum >= np.percentile(lum, 70)]
    src = bright.mean(0); ratio = target / src
    rgb = np.clip(A[..., :3] * ratio, 0, 255); A[..., :3][m] = rgb[m]
    return f'{label} {src.round(0).astype(int)}→{target.astype(int)} {int(m.sum())}px'
if __name__ == '__main__':
    keys = sys.argv[1:] or NEW
    for k in keys:
        p = f'assets/{k}.png'; A = np.array(Image.open(p).convert('RGBA')).astype(int)
        skin, cloth, robe = masks(A); notes = []
        for m, t, l in ((skin, SKIN, '살색'), (cloth, CLOTH, '옷'), (robe, ROBE, '도복')):
            n = shift(A, m, t, l)
            if n: notes.append(n)
        Image.fromarray(A.astype(np.uint8)).save(p)
        print(f'  {k}: ' + ' · '.join(notes))
