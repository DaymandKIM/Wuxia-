"""무기 아이콘 등급 시트 → assets/eq_<종류>_<등급>.png 6장 (v2.80, 사용자: "6종씩 무기 뽑을 프롬프트").
시트: 1줄 6칸(권갑·검·도·창·봉·부채 순), 마젠타/분홍 배경, 칸 사이 세로선(어둡거나 흰색). 칸은 균등 6분할, 구분선은 '칸 높이 85%↑·폭 24px↓ 덩어리'로 버림.
배경 = 마젠타(r-g>50·b-g>50) 또는 자줏빛 근접(중앙값 ±70·r>g+8·b>g+8). 가장 큰 덩어리(+150px 넘는 조각)만 남기고 tight bbox →
96×96 안에 긴 변 92px(기존 아이콘 채움 0.96)로 LANCZOS 축소, 알파 문턱 96. 검사판 review/eq_weapons_<등급>.png
사용: python eqicons.py <등급 0~4> [sheets/eq_weapons_<등급>.png]
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
KINDS = ['fist', 'sword', 'saber', 'spear', 'staff', 'fan']
FILL = 92
def main(grade, path):
    im = Image.open(path).convert('RGB'); A = np.array(im).astype(int); H, W = A.shape[:2]
    r, g, b = A[..., 0], A[..., 1], A[..., 2]; BG = np.median(A.reshape(-1, 3), 0)
    bg = (((r - g) > 50) & ((b - g) > 50)) | ((np.abs(A - BG) < 70).all(2) & ((r - g) > 8) & ((b - g) > 8))
    fg = ~bg; out = []
    for i, k in enumerate(KINDS):
        x0, x1 = round(i * W / 6), round((i + 1) * W / 6)
        cell = fg[:, x0:x1].copy(); cell[:, :3] = False; cell[:, -3:] = False   # 칸 경계 세로선
        lab, n = ndi.label(cell); sizes = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1)); objs = ndi.find_objects(lab)
        # 칸 구분선은 시트마다 색이 다르다(어두운 선·흰 선, v2.80.2 희귀 시트) — 칸 높이의 85% 넘게 뻗은 가는(≤24px) 세로 덩어리는 버린다
        def bar(sl): return (sl[0].stop - sl[0].start) >= H * 0.85 and (sl[1].stop - sl[1].start) <= 24
        keep = [j + 1 for j, s in enumerate(sizes) if s >= 150 and not bar(objs[j])]
        m = np.isin(lab, keep); yy, xx = np.where(m)
        crop = np.zeros((yy.max() - yy.min() + 1, xx.max() - xx.min() + 1, 4), np.uint8)
        sub = A[yy.min():yy.max() + 1, x0 + xx.min():x0 + xx.max() + 1]
        crop[..., :3] = sub; crop[..., 3] = m[yy.min():yy.max() + 1, xx.min():xx.max() + 1] * 255
        ci = Image.fromarray(crop); s = FILL / max(ci.size)
        sm = ci.resize((max(1, round(ci.width * s)), max(1, round(ci.height * s))), Image.LANCZOS)
        al = np.array(sm); al = np.dstack([al[..., :3], (al[..., 3] >= 96) * 255]).astype(np.uint8); sm = Image.fromarray(al)
        icon = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); icon.paste(sm, ((96 - sm.width) // 2, (96 - sm.height) // 2), sm)
        icon.save(f'assets/eq_{k}_{grade}.png'); out.append(icon)
        print(f'  eq_{k}_{grade}: 원본 {ci.size} → {sm.size}, 조각 {len(keep)}')
    R = Image.new('RGB', (6 * 96 * 3 + 70, 96 * 3), (14, 19, 25))
    for i, ic in enumerate(out):
        big = ic.resize((288, 288), Image.NEAREST); R.paste(big, (i * 298, 0), big)
    R.save(f'review/eq_weapons_{grade}.png'); print('검사판', f'review/eq_weapons_{grade}.png')
if __name__ == '__main__':
    grade = int(sys.argv[1]); path = sys.argv[2] if len(sys.argv) > 2 else f'sheets/eq_weapons_{grade}.png'; main(grade, path)
