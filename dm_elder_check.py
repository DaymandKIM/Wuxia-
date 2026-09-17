# 당문 장로 눈검사판 — 흰 배경 확대(검은 막대·테두리 잔재·부유 조각) + 게임 바닥색 대조판.
# blackcheck.py 는 review/blackcheck.png 하나만 써서 다른 에이전트와 겹친다 → 접두어판을 따로 만든다.
import os, sys
import numpy as np
from PIL import Image, ImageDraw
A = '/home/user/Wuxia-/assets'; V = '/home/user/Wuxia-/review'
PRE = 'dm_elder'

def sheet(names, out, S=6, cols=5, bgc=(245, 245, 245), pad=2):
    ims = []
    for n in names:
        p = os.path.join(A, '%s_%s.png' % (PRE, n))
        im = Image.open(p).convert('RGBA')
        a = np.array(im); ys, xs = np.where(a[..., 3] > 0)
        im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), xs.max() + 1 + pad, ys.max() + 1 + pad))
        ims.append((n, im))
    CW = max(im.width for _, im in ims) * S + 10
    CH = max(im.height for _, im in ims) * S + 24
    rows = (len(ims) + cols - 1) // cols
    c = Image.new('RGB', (cols * CW + 8, rows * CH + 8), bgc); d = ImageDraw.Draw(c)
    for i, (n, im) in enumerate(ims):
        x = 4 + (i % cols) * CW; y = 4 + (i // cols) * CH
        big = im.resize((im.width * S, im.height * S), Image.NEAREST)
        d.text((x + 2, y + 2), '%s %dx%d' % (n, im.width, im.height), fill=(20, 20, 20) if sum(bgc) > 380 else (255, 255, 255))
        c.paste(big, (x + 4, y + 20), big)
        d.rectangle((x + 3, y + 19, x + 4 + big.width, y + 20 + big.height), outline=(200, 160, 160))
    c.save(out); print(out, c.size)

idle = ['idle%d' % i for i in range(13)]; walk = ['walk%d' % i for i in range(13)]
atk = ['atk%d' % i for i in range(9)]; atk2 = ['atk2_%d' % i for i in range(10)]
atk3 = ['atk3_%d' % i for i in range(7)]; rest = ['hit', 'death0', 'death1', 'death2']
sheet(idle + walk, os.path.join(V, 'blackcheck_dm_elder_move.png'), S=6, cols=7)
sheet(atk + rest, os.path.join(V, 'blackcheck_dm_elder.png'), S=5, cols=5)
sheet(atk2, os.path.join(V, 'blackcheck_dm_elder_atk2.png'), S=7, cols=5)
sheet(atk3, os.path.join(V, 'blackcheck_dm_elder_atk3.png'), S=5, cols=4)
sheet(idle[:1] + walk[:2] + atk[:4] + atk2[:3] + atk3[:2] + rest,
      os.path.join(V, 'review-dm_elder.png'), S=5, cols=4, bgc=(106, 122, 82))
