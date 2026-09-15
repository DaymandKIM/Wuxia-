"""무기 아이콘 등급 시트 → assets/eq_<종류>_<등급>.png 6장 (v2.80, 사용자: "6종씩 무기 뽑을 프롬프트").
시트: 1줄 6칸(권갑·검·도·창·봉·부채 순), 마젠타/분홍 배경, 칸 사이 세로선(어둡거나 흰색). 시트 전체 덩어리 라벨링 → 픽셀이 가장 많은 칸에 통째로(칸을 넘는 칼끝도 잘리지 않음). 구분선은 '칸 높이 85%↑·폭 24px↓ 덩어리'로 버림.
배경 = 마젠타(r-g>50·b-g>50) 또는 자줏빛 근접(중앙값 ±70·r>g+8·b>g+8). 가장 큰 덩어리(+150px 넘는 조각)만 남기고 tight bbox →
96×96 안에 긴 변 92px(기존 아이콘 채움 0.96)로 LANCZOS 축소, 알파 문턱 96. 검사판 review/eq_weapons_<등급>.png
사용: python eqicons.py <등급 0~6> [시트 경로] [--slot weapon|armor|trinket]  (기본 무기, 시트 기본 sheets/eq_<자리>_<등급>.png)
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
SLOTS = { 'weapon': ['fist', 'sword', 'saber', 'spear', 'staff', 'fan'], 'armor': ['robe', 'vest', 'lamellar', 'cloak'],
          'trinket': ['pendant', 'ring', 'beads', 'talisman', 'gourd', 'ribbon'] }   # 자리별 종류 순서 = 게임 순서 (v2.82 방어구·장신구)
KINDS = SLOTS['weapon']
FILL = 92
def main(grade, path, slot='weapon'):
    global KINDS; KINDS = SLOTS[slot]; N = len(KINDS)
    im = Image.open(path).convert('RGB'); A = np.array(im).astype(int); H, W = A.shape[:2]
    r, g, b = A[..., 0], A[..., 1], A[..., 2]; BG = np.median(A.reshape(-1, 3), 0)
    bg = (((r - g) > 50) & ((b - g) > 50)) | ((np.abs(A - BG) < 70).all(2) & ((r - g) > 8) & ((b - g) > 8))
    fg = ~bg
    # 칸 구분선은 시트마다 색이 다르다(어두운 선·흰 선) — 칸 높이의 85% 넘게 뻗은 가는(≤24px) 세로 덩어리는 버린다
    lab, n = ndi.label(fg); objs = ndi.find_objects(lab); sizes = ndi.sum(np.ones(lab.shape), lab, range(1, n + 1))
    def bar(sl): return (sl[0].stop - sl[0].start) >= H * 0.85 and (sl[1].stop - sl[1].start) <= 24
    # 그림 기준(v2.80.3 영웅 시트: 검이 옆 칸까지 넘어가 칼끝·자루가 옆 아이콘에 조각으로 붙었다) — 시트 전체 덩어리를
    # 라벨링해 각 덩어리를 픽셀이 가장 많이 든 칸에 통째로 준다. 칸 단위 크롭 금지(hero_sheet와 같은 원칙).
    cells = {i: [] for i in range(N)}
    for j in range(n):
        sl = objs[j]
        if sizes[j] < 150 or bar(sl): continue
        yy, xx = np.where(lab[sl] == j + 1); xx = xx + sl[1].start
        ci = int(np.bincount(np.clip((xx * N) // W, 0, N - 1)).argmax()); cells[ci].append(j + 1)
    out = []
    for i, k in enumerate(KINDS):
        # 칸 안 가장 큰 덩어리의 50% 미만 조각은 버린다(봉 토막은 0.28, 장갑 두 짝은 0.94↑)(v2.81.1 전설 봉 시트: 봉 옆에 떨어진 짧은 토막·큰 반짝임 — 아이콘에선 잡동사니).
        # 권갑은 두 장갑이 비슷한 크기라 둘 다 남는다.
        big = max(sizes[j - 1] for j in cells[i]); cells[i] = [j for j in cells[i] if sizes[j - 1] >= big * 0.5]
        m = np.isin(lab, cells[i]); yy, xx = np.where(m)
        crop = np.zeros((yy.max() - yy.min() + 1, xx.max() - xx.min() + 1, 4), np.uint8)
        crop[..., :3] = A[yy.min():yy.max() + 1, xx.min():xx.max() + 1]; crop[..., 3] = m[yy.min():yy.max() + 1, xx.min():xx.max() + 1] * 255
        ci = Image.fromarray(crop); s = FILL / max(ci.size)
        sm = ci.resize((max(1, round(ci.width * s)), max(1, round(ci.height * s))), Image.LANCZOS)
        al = np.array(sm); al = np.dstack([al[..., :3], (al[..., 3] >= 96) * 255]).astype(np.uint8); sm = Image.fromarray(al)
        icon = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); icon.paste(sm, ((96 - sm.width) // 2, (96 - sm.height) // 2), sm)
        icon.save(f'assets/eq_{k}_{grade}.png'); out.append(icon)
        print(f'  eq_{k}_{grade}: 원본 {ci.size} → {sm.size}, 덩어리 {len(cells[i])}')
    R = Image.new('RGB', (N * 96 * 3 + 70, 96 * 3), (14, 19, 25))
    for i, ic in enumerate(out):
        big = ic.resize((288, 288), Image.NEAREST); R.paste(big, (i * 298, 0), big)
    R.save(f'review/eq_{slot}_{grade}.png'); print('검사판', f'review/eq_{slot}_{grade}.png')
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; slot = 'weapon'
    for a in sys.argv[1:]:
        if a.startswith('--slot='): slot = a.split('=', 1)[1]
    grade = int(args[0]); path = args[1] if len(args) > 1 else f'sheets/eq_{"weapons" if slot == "weapon" else slot}_{grade}.png'; main(grade, path, slot)
