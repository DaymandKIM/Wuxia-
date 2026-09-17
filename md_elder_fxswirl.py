# 무당 장로 시트(sheets/md_elder.png)의 **인물 없는 파란 나선 단독 칸** 둘(r0c6·r1c6)만 따로 뽑는다
#   → assets/fx_swirl.png (r0c6, 촘촘한 나선) · assets/fx_swirl2.png (r1c6, 트인 나선)
# 공격 스트립에 넣으면 몸이 한 컷 사라져 보여서 뺀 칸이다(CLAUDE.md "없는 동작을 합성하지 마라" 계열).
# 원본 배율 그대로(축소 안 함), 칸 처리(테두리 고리 버림·물든 가장자리 색 고침)는 sr_sheet.finish 를 그대로 쓴다.
# 팔레트 PNG + 투명 인덱스(sectdiff.save_pal) — 빌드 16MB 한도.
#   python md_elder_fxswirl.py
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, '/home/user/Wuxia-')
import sr_sheet as S
from sectdiff import save_pal

R = '/home/user/Wuxia-'
SH = R + '/sheets/md_elder.png'
# grid_rows(darklv=140) 이 잡은 격자에서 6번 칸(0-기준)만. 테두리 줄은 마젠타라 inset 0 으로 충분하다.
CELLS = [('fx_swirl', 1, 134, 771, 894), ('fx_swirl2', 139, 277, 771, 894)]

sh = np.array(Image.open(SH).convert('RGB')).astype(int)
r, g, b = sh[..., 0], sh[..., 1], sh[..., 2]
bg = (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)

for name, y0, y1, x0, x1 in CELLS:
    rgba = S.cut(sh, bg, y0, y1, x0, x1, inset=0)
    ys, xs = np.where(rgba[..., 3] > 0)
    out = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    save_pal(out, '%s/assets/%s.png' % (R, name))
    print('assets/%s.png %dx%d · %d px' % (name, out.shape[1], out.shape[0], len(ys)))

# 흰 배경 확대 눈검사판
ims = [Image.open('%s/assets/%s.png' % (R, n)).convert('RGBA') for n, *_ in CELLS]
S_ = 5
W = sum(i.width for i in ims) * S_ + 30
H = max(i.height for i in ims) * S_ + 20
c = Image.new('RGBA', (W, H), (245, 245, 245, 255))
x = 10
for im in ims:
    big = im.resize((im.width * S_, im.height * S_), Image.NEAREST)
    c.alpha_composite(big, (x, 10)); x += big.width + 10
c.convert('RGB').save(R + '/review/blackcheck_fx_swirl.png')
print('눈검사판 review/blackcheck_fx_swirl.png')
