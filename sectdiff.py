"""문파 전각 차분 추출 (v2.92.7) — 배경(sheets/sect_bg.png) 위에 건물을 얹은 그림에서 건물만 떠낸다.

사용법: python sectdiff.py <stage 0|1|2> <sheets/그림.png> [--bg sheets/sect_bg.png] [--thr 45]

원리: 배경과 그림이 픽셀 단위로 거의 같아서 |그림-배경| 차분 마스크(문턱 thr, opening 1·closing 2)가 곧 건물이다.
  - 구멍 메우기(fill_holes)는 **하지 않는다** — 정자 지붕 아래처럼 배경이 비쳐야 하는 곳이 있다. 알파 = 마스크 그대로.
  - 덩어리마다 무게중심에서 가장 가까운 터(SITES)에 배정. 터 중심에서 그림 폭 30% 넘게 떨어진 작은 조각(면적<400)·워터마크(작고 y>880)는 버린다.
    연무장은 정자+깃발·북·허수아비·울타리가 한 세트라 같은 터에 배정된 조각을 합쳐 한 bbox 로 만든다.
    **잔풀 노이즈**: 두 그림의 풀 질감이 미세하게 달라 1~170px 조각이 600개쯤 온 사방에 뜬다 — 면적 < --min(기본 300)은 자리 불문 버린다
    (진짜 부속 중 가장 작은 연무장 깃발이 1167px, 워터마크 별이 528px).
  - 결과 assets/hall_<k>_<stage>.png — **원본 배율 그대로** RGBA(게임이 배경과 같은 배율(sectBgRect.s)로 그린다). 가장자리 1px 는
    마스크 dilate 1 로 알파를 살려 검은 외곽선이 잘리지 않게(그 1px 도 원래 그림 픽셀).
  - review/hall_diff.json 에 {k:{stage:{cx, by, w, h}}} — cx·by 는 그림 비율(SECT.scene.bgHalls 로 옮긴다), w·h 는 px.
  - 검사판 review/halls_diff.png = (a) 마스크 밖을 어둡게 한 그림 | (b) 뽑은 스프라이트 2배(바닥색 배경) | (c) 빈 배경에 cx·by 자리로 되얹은 합성.
  - 옆모습 시트에서 뽑았던 옛 assets/hall_<k>_<stage>.png 는 덮어쓰기 전에 raw/halls_side/ 로 보관한다(이미 있으면 안 건드림).
규칙 0: 검사판을 눈으로 확인받은 뒤 반영. spritetest 는 통합 뒤에 돌린다.
"""
import sys, os, json, shutil, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

# 다섯 터 영역(그림 픽셀, x0 y0 x1 y1) — 그림의 빈 터(맨땅) 위치. 배정은 이 사각형의 중심 거리로
SITES = {
    'yard':    (64, 213, 192, 308),    # 연무장 — 좌상
    'gate':    (224, 256, 350, 350),   # 산문 — 가운데 위
    'clinic':  (381, 213, 511, 309),   # 약방 — 우상
    'library': (96, 641, 222, 749),    # 장경각 — 좌하
    'guest':   (353, 642, 480, 748),   # 객당 — 우하
}
KNAME = {'yard': 'yard 연무장', 'gate': 'gate 산문', 'clinic': 'clinic 약방', 'library': 'library 장경각', 'guest': 'guest 객당'}
GROUND = (106, 122, 82)               # 게임 바닥색(검사판 배경 — 흰 배경은 구멍을 못 보여 준다)
FAR = 0.30                            # 터 중심에서 그림 폭의 이 비율 넘게 떨어진 작은 조각은 버린다
SMALL = 400                           # '작은 조각' 면적(px)
MIN = 300                             # 이보다 작은 조각은 잔풀 노이즈 — 자리 불문 버린다(--min)
WM_Y, WM_AREA = 880, 3000             # 워터마크: 이 아래(y>)에 있는 작은 것
BACKUP = 'raw/halls_side'
JSON_PATH = 'review/hall_diff.json'
REVIEW = 'review/halls_diff.png'


def font(sz):
    try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', sz)
    except Exception: return ImageFont.load_default()


def diff_mask(bg, im, thr):
    """차분 마스크 — |그림-배경| 채널 합 > thr → opening 1 → closing 2 (구멍 메우기 없음)"""
    d = np.abs(im.astype(int) - bg.astype(int)).sum(2)
    m = d > thr
    m = ndi.binary_opening(m, iterations=1)
    m = ndi.binary_closing(m, iterations=2)
    return m


def assign(mask, W, H, minarea):
    """덩어리 라벨링 → 터 배정. 돌려주는 것: {k: [(label, area, bbox)...]}, 버린 목록 [(이유, area, bbox)...]"""
    lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    objs = ndi.find_objects(lab)
    areas = ndi.sum(mask, lab, range(1, n + 1))
    cents = ndi.center_of_mass(mask, lab, range(1, n + 1))
    centers = {k: ((s[0] + s[2]) / 2, (s[1] + s[3]) / 2) for k, s in SITES.items()}
    got, dropped = {k: [] for k in SITES}, []
    for i in range(n):
        area = int(areas[i]); cy, cx = cents[i]
        s = objs[i]; bbox = (s[1].start, s[0].start, s[1].stop, s[0].stop)
        if area < minarea:
            dropped.append(('noise', area, bbox)); continue
        if cy > WM_Y and area < WM_AREA:
            dropped.append(('watermark', area, bbox)); continue
        k, dist = min(((k, ((cx - c[0]) ** 2 + (cy - c[1]) ** 2) ** .5) for k, c in centers.items()), key=lambda t: t[1])
        if dist > FAR * W and area < SMALL:
            dropped.append(('far(%s %.0fpx)' % (k, dist), area, bbox)); continue
        if dist > FAR * W:
            print('  경고: 큰 덩어리가 터에서 멀다 — %s 로 배정 (거리 %.0fpx, 면적 %d, bbox %s)' % (k, dist, area, bbox))
        got[k].append((i + 1, area, bbox))
    return lab, got, dropped


def cut(im, lab, labels):
    """배정된 덩어리들을 합쳐 RGBA 로 자른다 — 알파 = 마스크 dilate 1(외곽선 보호), 색은 원본 그림 픽셀"""
    m = np.isin(lab, labels)
    m = ndi.binary_dilation(m, iterations=1)
    ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    out[..., :3] = im[y0:y1, x0:x1]
    out[..., 3] = m[y0:y1, x0:x1] * 255
    return out, (int(x0), int(y0), int(x1), int(y1))


def save_pal(rgba, dst):
    """팔레트 PNG 로 저장 — 색 255가지(디더) + 투명 전용 인덱스 255. 알파는 이진 마스크라 손실 없다.
    (RGBA 그대로는 4장 340KB → base64 460KB 로 빌드가 16MB 를 넘봤다. 투명 픽셀은 전용 인덱스로 격리 — 검은 외곽선과 묶이지 않게)"""
    a = rgba[..., 3] > 127
    rgb = Image.fromarray(rgba[..., :3], 'RGB')
    q = rgb.quantize(colors=255, method=2, dither=Image.Dither.FLOYDSTEINBERG)
    idx = np.array(q, np.uint8)
    idx[~a] = 255
    p = Image.fromarray(idx, 'P')
    pal = q.getpalette()[:255 * 3] + [255, 0, 255]
    p.putpalette(pal)
    p.info['transparency'] = 255
    p.save(dst, optimize=True, transparency=255)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('stage', type=int, choices=[0, 1, 2])
    ap.add_argument('src')
    ap.add_argument('--bg', default='sheets/sect_bg.png')
    ap.add_argument('--thr', type=int, default=45)
    ap.add_argument('--min', type=int, default=MIN, help='이보다 작은 조각은 잔풀 노이즈로 버린다')
    a = ap.parse_args()
    stage = str(a.stage)

    bg = np.array(Image.open(a.bg).convert('RGB'))
    im = np.array(Image.open(a.src).convert('RGB'))
    if bg.shape != im.shape:
        sys.exit('크기가 다르다: 배경 %s vs 그림 %s' % (bg.shape[:2], im.shape[:2]))
    H, W = im.shape[:2]

    mask = diff_mask(bg, im, a.thr)
    lab, got, dropped = assign(mask, W, H, a.min)

    os.makedirs('assets', exist_ok=True); os.makedirs('review', exist_ok=True); os.makedirs(BACKUP, exist_ok=True)
    rec = {}
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, encoding='utf-8') as f: rec = json.load(f)

    sprites, kept = {}, np.zeros_like(mask)
    print('그림 %dx%d  문턱 %d  최소 면적 %d  덩어리 %d' % (W, H, a.thr, a.min, lab.max()))
    for k in SITES:
        parts = got[k]
        if not parts:
            print('  경고: %s — 이 그림엔 없다, 건너뜀' % KNAME[k]); continue
        rgba, bb = cut(im, lab, [p[0] for p in parts])
        kept |= np.isin(lab, [p[0] for p in parts])
        x0, y0, x1, y1 = bb; w, h = x1 - x0, y1 - y0
        area = sum(p[1] for p in parts)
        print('  %-14s bbox x %3d~%3d  y %3d~%3d  (%3dx%3d)  면적 %6d  조각 %d개' % (KNAME[k], x0, x1, y0, y1, w, h, area, len(parts)))
        for _, pa, pb in sorted(parts, key=lambda p: -p[1]):
            print('      조각 면적 %6d  x %3d~%3d y %3d~%3d' % (pa, pb[0], pb[2], pb[1], pb[3]))
        # 옛 파일 보관(옆모습 시트) — 이미 보관본이 있으면 건드리지 않는다(두 번째 실행이 차분 결과를 덮어쓰지 않게)
        dst = 'assets/hall_%s_%s.png' % (k, stage)
        if os.path.exists(dst):
            bak = os.path.join(BACKUP, os.path.basename(dst))
            if not os.path.exists(bak):
                shutil.copy2(dst, bak); print('      옛 파일 보관 → %s' % bak)
        save_pal(rgba, dst)                        # 팔레트 PNG(빌드 16MB 한도 — RGBA 4장 340KB가 base64로 460KB였다)
        cx, by = round((x0 + x1) / 2 / W, 4), round(y1 / H, 4)
        rec.setdefault(k, {})[stage] = {'cx': cx, 'by': by, 'w': w, 'h': h}
        sprites[k] = (rgba, cx, by)
    noise = [d for d in dropped if d[0] == 'noise']
    if noise:
        print('  버림 [noise <%d] %d개 (최대 면적 %d)' % (a.min, len(noise), max(d[1] for d in noise)))
    for reason, area, bb in dropped:
        if reason == 'noise': continue
        print('  버림 [%s] 면적 %5d  x %3d~%3d y %3d~%3d' % (reason, area, bb[0], bb[2], bb[1], bb[3]))

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(rec, f, indent=1, ensure_ascii=False)
    print('기록 → %s' % JSON_PATH)

    # ---- 검사판 ----
    # (a) 마스크 밖을 어둡게
    dark = im.astype(float) * 0.3
    km = ndi.binary_dilation(kept, iterations=1)
    pa = np.where(km[..., None], im, dark).astype(np.uint8)
    pa = Image.fromarray(pa, 'RGB')
    da = ImageDraw.Draw(pa)
    for k, s in SITES.items():                       # 터 영역 사각형(청록)
        da.rectangle(s, outline=(80, 220, 220))
    da.text((6, 4), '(a) diff mask  thr=%d' % a.thr, fill=(255, 255, 0), font=font(14))
    # (b) 스프라이트 2배 나열
    f = font(14); pad = 8
    bw = max([sp[0].shape[1] * 2 for sp in sprites.values()] + [200]) + pad * 2
    bh = pad
    for k in SITES:
        if k in sprites: bh += sprites[k][0].shape[0] * 2 + 22 + pad
    pb = Image.new('RGB', (bw, max(bh, H)), GROUND)
    db = ImageDraw.Draw(pb)
    y = pad
    for k in SITES:
        if k not in sprites: continue
        rgba, cx, by = sprites[k]
        db.text((pad, y), '%s_%s  %dx%d  cx %.4f by %.4f' % (k, stage, rgba.shape[1], rgba.shape[0], cx, by), fill=(255, 255, 255), font=f)
        y += 18
        sp = Image.fromarray(rgba, 'RGBA').resize((rgba.shape[1] * 2, rgba.shape[0] * 2), Image.NEAREST)
        pb.paste(sp, (pad, y), sp)
        y += sp.height + pad + 4
    # (c) 빈 배경에 되얹기 — 원본과 같아 보여야 한다
    pc = Image.fromarray(bg, 'RGB').copy()
    for k, (rgba, cx, by) in sprites.items():
        sp = Image.fromarray(rgba, 'RGBA')
        x = int(round(cx * W - sp.width / 2)); yy = int(round(by * H - sp.height))
        pc.paste(sp, (x, yy), sp)
    ImageDraw.Draw(pc).text((6, 4), '(c) recomposed on sect_bg', fill=(255, 255, 0), font=font(14))
    out = Image.new('RGB', (pa.width + pb.width + pc.width + 8, max(pa.height, pb.height, pc.height)), (40, 40, 40))
    out.paste(pa, (0, 0)); out.paste(pb, (pa.width + 4, 0)); out.paste(pc, (pa.width + pb.width + 8, 0))
    out.save(REVIEW)
    print('검사판 → %s' % REVIEW)


if __name__ == '__main__':
    main()
