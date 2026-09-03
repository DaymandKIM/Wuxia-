"""대나무 마왕 — 칸 테두리 잔재를 지운다.

시트에서 뽑을 때 칸의 검은 테두리가 실루엣 바깥쪽에 한두 줄 붙어 나왔다.
발밑에 까만 막대가 깔린 것처럼 보인다. 마젠타 파편도 몇 장에 남아 있다.

몸의 외곽선도 거의 검정이라 '검은 픽셀'을 통째로 지울 수는 없다.
테두리 잔재만 골라내는 조건:
  · 실루엣의 가장 바깥 줄이고
  · 그 줄의 불투명 픽셀이 거의 다 검정(밝기 45 미만)이며
  · 10픽셀 이상 곧게 이어지고
  · 한 가지 색으로 균일하다 (색 편차 4 미만)
몸의 외곽선도 같은 검정이지만 명암이 섞여 균일하지 않다. 이 조건이
낫날 끝 같은 진짜 그림을 지우지 않게 막아준다.

    python demonclean.py          지우고 저장
    python demonclean.py --dry    무엇을 지울지만 출력
"""
from PIL import Image
import numpy as np, glob, os, sys
from scipy import ndimage as ndi

R = os.path.dirname(os.path.abspath(__file__))
DRY = '--dry' in sys.argv
DARK = 130         # 테두리는 순검정이 아니라 마젠타와 섞인 어두운 보라다
MINLEN = 10        # 이만큼 이어져야 테두리로 본다
RATIO = 0.85       # 줄의 이 비율 이상이 검정이어야 한다
DEPTH = 3          # 가장자리에서 이만큼까지만 본다


def strip(al, rgb, axis, rev):
    """한쪽 가장자리에서 안쪽으로 들어가며 테두리 줄을 찾는다"""
    hit = []
    n = al.shape[0] if axis == 0 else al.shape[1]
    order = range(n - 1, -1, -1) if rev else range(n)
    seen = 0
    for i in order:
        line = al[i] if axis == 0 else al[:, i]
        if not line.any():
            continue
        seen += 1
        if seen > DEPTH:
            break
        idx = np.where(line)[0]
        px = rgb[i][idx] if axis == 0 else rgb[:, i][idx]
        dark = (px.max(1) < DARK)
        flat = px.std(0).max() < 4.0        # 테두리는 한 가지 색으로 균일하다
        if len(idx) >= MINLEN and dark.mean() >= RATIO and flat:
            hit.append((axis, i))
        else:
            break          # 몸이 시작되면 멈춘다
    return hit


total = 0
for p in sorted(glob.glob(R + '/assets/demon_*.png')):
    k = os.path.basename(p)[6:-4]
    a = np.array(Image.open(p).convert('RGBA'))
    al = a[:, :, 3] > 0
    rgb = a[:, :, :3].astype(int)
    hits = []
    for axis, rev in ((0, True), (0, False), (1, True), (1, False)):
        hits += strip(al, rgb, axis, rev)
    removed = 0
    for axis, i in hits:
        if axis == 0:
            removed += int(al[i].sum()); a[i, :, 3] = 0
        else:
            removed += int(al[:, i].sum()); a[:, i, 3] = 0

    # 몸에서 떨어져 나온 마젠타 파편 — 배경 조각이다
    al2 = a[:, :, 3] > 0
    lb, n = ndi.label(al2, np.ones((3, 3)))
    if n > 1:
        sz = ndi.sum(al2, lb, range(1, n + 1))
        main = int(np.argmax(sz)) + 1
        for i in range(1, n + 1):
            if i == main:
                continue
            m = lb == i
            px = rgb[m]
            mag = ((px[:, 0].astype(int) - px[:, 1] > 30) &
                   (px[:, 2].astype(int) - px[:, 1] > 20)).mean()
            if mag > 0.5 or sz[i - 1] < 5:
                removed += int(m.sum()); a[:, :, 3][m] = 0

    # 마젠타 잔털 — 배경(마젠타)이 실루엣 가장자리에 번진 자국이다.
    # 촉수가 1~2px 이라 통째로 분홍이 됐다. 지우면 촉수가 사라지므로
    # 지우지 않고 **마젠타 성분만 걷어낸다** (r·b 를 g 쪽으로 끌어내린다).
    # 폭발·포효처럼 자주색이 그림인 프레임은 분홍 비율로 걸러낸다.
    al3 = a[:, :, 3] > 0
    q = a[:, :, :3].astype(int)
    pink = al3 & (q[:, :, 0] - q[:, :, 1] > 20) & (q[:, :, 2] - q[:, :, 1] > 20)
    if al3.any() and pink.sum() < al3.sum() * 0.35:
        edge = pink & ~ndi.binary_erosion(al3, np.ones((5, 5)))   # 가장자리 2px
        if edge.any():
            g2 = q[:, :, 1][edge]
            a[:, :, 0][edge] = np.minimum(q[:, :, 0][edge], g2 + 12)
            a[:, :, 2][edge] = np.minimum(q[:, :, 2][edge], g2 + 12)
            removed += int(edge.sum())

    if removed:
        total += removed
        print('  %-8s %3d픽셀 손질  %s' % (k, removed,
              ' '.join(('행%d' if ax == 0 else '열%d') % i for ax, i in hits)))
        if not DRY:
            Image.fromarray(a, 'RGBA').save(p)
print('%s %d픽셀' % ('지울 것' if DRY else '정리 완료', total))
