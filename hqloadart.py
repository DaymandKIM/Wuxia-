"""로딩 화면 공통 그림 손질 → assets/hq_load_frame.png · hq_load_ink.png (v2.94.9)
사용: python hqloadart.py frame <원본> | python hqloadart.py ink <원본>
- 제미나이 ✦ 워터마크(우하단)를 지운다: 테두리는 좌우 거울 자리 복사(모서리 구름이 대칭), 먹은 검게.
- 폭을 줄인다(테두리 560 · 먹 512) — 단일 빌드 16MB 한도. 먹은 회색조 팔레트, 테두리는 알파가 부드러워 RGBA.
"""
from PIL import Image
import numpy as np, sys, os
from scipy import ndimage

R = os.path.dirname(os.path.abspath(__file__))
kind, src = sys.argv[1], sys.argv[2]
art_key = sys.argv[3] if len(sys.argv) > 3 else None   # art 일 때 문파 키
im = Image.open(src).convert('RGBA')
a = np.array(im).astype(int)
H, W, _ = a.shape

# ✦ 찾기 — 우하단 모서리에서 '주변보다 밝고 불투명한' 최대 덩어리
cy, cx = int(H*0.86), int(W*0.72)
sub = a[cy:, cx:]
lum = sub[:, :, :3].mean(-1)
bright = (lum > (np.median(lum) + 40)) & (sub[:, :, 3] > 60)
lab, n = ndimage.label(bright)
if n:
    sz = ndimage.sum(bright, lab, range(1, n+1))
    k = int(np.argmax(sz)) + 1
    ys, xs = np.where(lab == k)
    y0, y1, x0, x1 = ys.min()+cy, ys.max()+cy+1, xs.min()+cx, xs.max()+cx+1
    pad = 6
    y0, y1, x0, x1 = max(0,y0-pad), min(H,y1+pad), max(0,x0-pad), min(W,x1+pad)
    if kind == 'frame':
        a[y0:y1, x0:x1] = a[y0:y1, W-x1:W-x0][:, ::-1]      # 거울 자리 복사
    else:
        a[y0:y1, x0:x1, :3] = 0; a[y0:y1, x0:x1, 3] = 255   # 검게
    print('✦ 지움 (%d,%d %dx%d)' % (x0, y0, x1-x0, y1-y0))

# 체커 무늬로 구워진 '투명' 자리를 진짜 투명으로 (v2.94.9) — 제미나이가 투명을 격자 그림으로 그려 준다.
# 가운데에서 번지며 두 격자 색만 지나간다(어두운 먹 테두리에서 멈춘다). 바깥 종이(흰색)는 테두리 밖이라 안 먹힌다.
if kind == 'frame':
    lum = a[:, :, :3].mean(-1)
    # 격자는 흰색 두 톤(≈253·223)이다 — 톤 하나하나를 맞추지 말고 '밝은 것'으로 잡아
    # 가운데에서 번진다. 바깥 종이도 밝지만 어두운 먹 테두리가 막아 준다.
    near = lum > 172        # 격자 두 톤(≈253·223)과 그 가장자리 반음까지
    seed = np.zeros((H, W), bool); seed[int(H*0.45):int(H*0.55), int(W*0.45):int(W*0.55)] = True
    lab, _ = ndimage.label(near)
    ids = set(lab[seed & near].tolist()) - {0}
    fill = np.isin(lab, list(ids))
    fill = ndimage.binary_closing(fill, np.ones((3, 3)))
    # 안쪽(테두리 줄 안)은 격자가 배경이니 **밝을수록 투명**으로 바꾼다 — 먹 구름 가장자리에
    # 남던 격자 계단이 사라지고 번짐이 부드럽게 비친다. 바깥 종이·테두리 줄은 건드리지 않는다.
    inner = ndimage.binary_fill_holes(fill)
    # 격자는 **무늬**다 — 톤으로 지우면 먹이 옅게 덮인 자리(격자 두 톤이 그대로 두 단계 먹으로 남는다)에
    # 계단이 남는다. 칸 크기만큼 평균을 내 무늬를 뭉갠 뒤 그 밝기로 알파를 만든다.
    row = lum[int(H*0.45):int(H*0.55)].mean(0)
    dev = row - ndimage.uniform_filter1d(row, 33)
    ac = [np.corrcoef(dev[:-k], dev[k:])[0, 1] for k in range(4, 40)]
    q = int(np.argmax(ac) + 4)                      # 격자 한 칸(반주기)
    sm = ndimage.uniform_filter(lum, size=max(3, q))
    al = np.clip((238 - sm) / 178 * 255, 0, 255)
    a[inner, 3] = al[inner]
    print('격자 칸 %dpx — 무늬를 뭉개 알파로' % q)
    print('격자 투명화 %d px (%.0f%%)' % (fill.sum(), fill.sum()/(H*W)*100))

out = Image.fromarray(a.astype('uint8'), 'RGBA')
if kind == 'frame':
    w = min(560, W)
    out = out.resize((w, round(H*w/W)), Image.LANCZOS)
    # 먹 테두리는 회색조라 LA(회색+알파)로 저장하면 RGBA 의 1/3 — 부드러운 알파는 그대로 산다
    px = np.array(out).astype(int)
    la = np.dstack([px[:, :, :3].mean(-1), px[:, :, 3]]).astype('uint8')
    out = Image.fromarray(la, 'LA')
    dst = R + '/assets/hq_load_frame.png'
    out.save(dst, optimize=True)
elif kind == 'ink':
    w = 512
    g = out.convert('L').resize((w, round(H*w/W)), Image.LANCZOS)
    g = g.quantize(colors=48, method=2)                     # 디더 팔레트 (줄무늬 방지)
    dst = R + '/assets/hq_load_ink.png'
    g.save(dst, optimize=True)
else:                                                       # art — 문파 일러스트
    w = min(480, W)
    rgb = out.convert('RGB').resize((w, round(H*w/W)), Image.LANCZOS)
    rgb = rgb.quantize(colors=128, method=2)                # 팔레트+디더 (원경과 같은 규칙)
    dst = R + '/assets/hq_art_%s.png' % art_key
    rgb.save(dst, optimize=True)
print(dst, os.path.getsize(dst)//1024, 'KB', Image.open(dst).size)
