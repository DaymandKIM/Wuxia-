"""무기 등급색 물들이기 검사판 (v2.90.3 시험, 사용자 "png만 만들어서 보여줘봐").
무기 스트립에서 무기 픽셀(칼날 회색·자루 갈색·부채 종이)만 마스크로 뽑아 장비 등급색으로 물들여 본다.
게임 반영 전 눈검사용 — review/weapon_tint.png. 마스크 규칙은 종류별(KINDS).
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

GRADES = [('일반', (0x9a,0xa7,0xb5)), ('고급', (0x6f,0xd3,0xa8)), ('희귀', (0x69,0xa8,0xdd)), ('영웅', (0xc5,0x8c,0xff)),
          ('전설', (0xff,0xb3,0x47)), ('신화', (0xff,0x6b,0x81)), ('초월', (0x9d,0xf5,0xff))]
GROUND = (96, 112, 64)
# 종류: (스트립, 컷 폭, 보여줄 컷들, 마스크 규칙 집합)
KINDS = {
  'sword': ('swordthrust', 90, [0, 1, 2], ('metalw', 'wood')),  # 검 시트(hero_sword4)는 칼날·칼집이 따뜻한 회색
  'saber': ('saberslash',  60, [0, 1, 2], ('metal', 'wood')),
  'spear': ('spearthrust', 58, [0, 1, 2], ('metal', 'wood')),
  'staff': ('staffswing',  58, [0, 1, 2], ('wood',)),
  'fan':   ('fansweep',    58, [0, 1, 2], ('paper', 'wood')),
}

def rules(rgb, a, names):
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat, lum = mx - mn, (r * 299 + g * 587 + b * 114) // 1000
    on = a > 0
    # 검기·부채 호 같은 하늘색 이펙트는 물들이지 않는다 — 하늘색을 2px 부풀려 제외(흰 심까지)
    fx = ndi.binary_dilation((b > r + 40) & (g > r + 20) & (lum > 120) & on, iterations=3)
    m = np.zeros(a.shape, bool)
    if 'metal' in names: m |= (sat < 30) & (lum > 100) & (lum < 232) & (b + 4 >= r)   # 회색 쇠 = 차가운 회색 — 도복 그늘(따뜻한 회색, r>b)·바지 그늘(어두움)·검기 흰 별(순백)은 제외
    if 'metalw' in names: m |= (sat < 30) & (lum > 60) & (lum < 232) & (r >= b)      # 따뜻한 회색 쇠·칼집(검 시트) — 바지 그늘(푸른 회색)은 r<b라 제외
    if 'wood'  in names: m |= (r > g) & (g > b) & (r - b > 34) & (r - b < 95) & (lum > 50) & (lum < 140) & (r < 185)   # 갈색 나무·칼집 — 살(225,160,132)·살 그늘(191,…)은 r로 제외
    if 'paper' in names:                                                     # 종이는 도복과 같은 베이지 — 색으로 못 가르고, 윤곽선으로 끊긴 덩어리 중 몸 중심에서 떨어진 것만
        pp = (sat < 48) & (lum > 150) & on & ~fx
        lab, n = ndi.label(pp)                                                # 4방 — 검은 윤곽선이 덩어리를 가른다
        cx = a.shape[1] / 2
        for i in range(1, n + 1):
            ys, xs = np.where(lab == i)
            if len(xs) < 8 or len(xs) > 150: continue                       # 150 넘는 흰 덩어리는 부채 호(이펙트)
            if abs(xs.mean() - cx) > 9: m[lab == i] = True
    return m & on & ~fx

def clean(m, minpx=6, minlen=10):
    """작은 조각 버림 — 길쭉한 덩어리(무기)만 남긴다"""
    lab, n = ndi.label(m, structure=np.ones((3, 3)))
    out = np.zeros_like(m)
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < minpx: continue
        if max(ys.max() - ys.min(), xs.max() - xs.min()) + 1 < minlen: continue
        out[lab == i] = True
    return out

def tint(rgb, m, col, strength=0.82):
    out = rgb.astype(float).copy()
    lum = (rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114) / 255.0
    c = np.array(col, float)
    t = np.clip(c[None, None, :] * (0.45 + 0.85 * lum[..., None]), 0, 255)
    out[m] = out[m] * (1 - strength) + t[m] * strength
    return out.astype(np.uint8)

def frame(strip, fw, i):
    return strip.crop((i * fw, 0, (i + 1) * fw, strip.height))

def main():
    S = 3
    cells = []   # (kind, frame_idx) → list of PIL images: 원본, 마스크, 등급 7
    rows = []
    for kind, (name, fw, idxs, names) in KINDS.items():
        strip = Image.open('assets/' + name + '.png').convert('RGBA')
        for i in idxs:
            fr = np.array(frame(strip, fw, i))
            rgb, a = fr[..., :3], fr[..., 3]
            m = clean(rules(rgb, a, names))
            imgs = []
            def onground(rgbx, ax):
                bg = np.zeros_like(rgbx); bg[...] = GROUND
                al = ax[..., None] / 255.0
                return Image.fromarray((rgbx * al + bg * (1 - al)).astype(np.uint8))
            imgs.append(onground(rgb, a))
            mk = rgb.copy(); mk[m] = (255, 0, 255)
            imgs.append(onground(mk, a))
            for gn, col in GRADES:
                imgs.append(onground(rgb if gn == '일반' else tint(rgb, m, col), a))
            rows.append((kind + ' ' + str(i), imgs))
    cw = max(im.width for _, imgs in rows for im in imgs) * S + 6
    ch = max(im.height for _, imgs in rows for im in imgs) * S + 6
    ncol = 2 + len(GRADES)
    board = Image.new('RGB', (cw * ncol + 90, ch * len(rows) + 30), (24, 24, 28))
    from PIL import ImageDraw
    d = ImageDraw.Draw(board)
    heads = ['원본', '마스크'] + [g for g, _ in GRADES]
    for c, h in enumerate(heads): d.text((90 + c * cw + 6, 8), h, fill=(230, 230, 230))
    for r, (label, imgs) in enumerate(rows):
        d.text((6, 30 + r * ch + ch // 2 - 6), label, fill=(230, 230, 230))
        for c, im in enumerate(imgs):
            big = im.resize((im.width * S, im.height * S), Image.NEAREST)
            board.paste(big, (90 + c * cw + 3, 30 + r * ch + 3))
    board.save('review/weapon_tint.png')
    print('review/weapon_tint.png', board.size)

if __name__ == '__main__':
    main()
