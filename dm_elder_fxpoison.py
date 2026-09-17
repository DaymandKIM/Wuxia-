# 당문 장로 독환이 터지는 칸(r4c3)에서 **인물과 떨어져 터진 독구름**만 따로 뽑는다 → assets/fx_poison.png
# 시트에 이펙트 단독 칸이 없어, 인물과 확실히 떨어진 덩어리를 쓴다. 원본 배율 그대로,
# 칸 처리(테두리 고리 버림·물든 가장자리 색 고침)는 sr_sheet.finish 를 그대로 쓴다. 팔레트 PNG + 투명 인덱스.
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, '/home/user/Wuxia-')
from sr_sheet import finish
from sectdiff import save_pal

SH = '/home/user/Wuxia-/sheets/dm_elder2_fix.png'
y0, y1, x0, x1 = 372 + 4, 465 - 3, 290 + 4, 511 - 4          # r4c3
sh = np.array(Image.open(SH).convert('RGB')).astype(int)
sub = sh[y0:y1, x0:x1]
r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
m = ~((r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80))
rgba = finish(sub.copy(), m)

al = rgba[..., 3] > 0
lab, n = ndimage.label(al, structure=np.ones((3, 3)))
sz = ndimage.sum(al, lab, range(1, n + 1))
man = int(np.argmax(sz)) + 1
mx_man = np.where(lab == man)[1].max()
keep = np.zeros_like(al)
for i in range(1, n + 1):
    if i == man: continue
    ys, xs = np.where(lab == i)
    print('  덩어리 %d: %d px  x %d~%d (노인 오른끝 %d)' % (i, sz[i - 1], xs.min(), xs.max(), mx_man))
    if xs.min() > mx_man + 60 and sz[i - 1] >= 40: keep |= lab == i     # 멀리 터진 구름만
ys, xs = np.where(keep)
out = np.zeros((ys.max() - ys.min() + 1, xs.max() - xs.min() + 1, 4), np.uint8)
out[ys - ys.min(), xs - xs.min()] = rgba[ys, xs]
save_pal(out, '/home/user/Wuxia-/assets/fx_poison.png')
print('assets/fx_poison.png %dx%d · %d px' % (out.shape[1], out.shape[0], keep.sum()))
im = Image.open('/home/user/Wuxia-/assets/fx_poison.png').convert('RGBA')
c = Image.new('RGBA', (im.width * 8, im.height * 8), (245, 245, 245, 255))
c.alpha_composite(im.resize((im.width * 8, im.height * 8), Image.NEAREST))
c.convert('RGB').save('/home/user/Wuxia-/review/blackcheck_fx_poison.png')
print('눈검사판 review/blackcheck_fx_poison.png')
