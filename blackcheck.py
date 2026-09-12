# 검은 조각 눈검사판 — 스프라이트를 흰 배경에 크게 얹어, 머리 위 검은 막대·
# 테두리 잔재·부유 조각을 사람(또는 비전 에이전트)이 한눈에 잡게 한다.
# spritetest(기하 검사)는 '가교로 붙은 검은 막대' 같은 걸 못 잡는다(CLAUDE.md 규칙 0).
# 그래서 스프라이트를 자르면 이 그림을 반드시 눈으로(에이전트로) 확인한다.
#
#   python blackcheck.py                 # 주인공 몸 스프라이트 전부
#   python blackcheck.py kickside kickhigh   # 특정 에셋만 (assets/<이름>.png)
#
# 결과: review/blackcheck.png
import sys, os
from PIL import Image

R = os.path.dirname(os.path.abspath(__file__))
ASSET = os.path.join(R, 'assets')
OUT = os.path.join(R, 'review'); os.makedirs(OUT, exist_ok=True)

# 기본 = 주인공 몸(단일 캐릭터) 스트립. 검은 막대가 가장 잘 숨는 곳.
DEFAULT = ['idle', 'run', 'katka', 'katkb', 'kickside', 'kickhigh']
names = sys.argv[1:] or DEFAULT

SCALE = 7          # 확대 배율
PAD = 10
WHITE = (245, 245, 245)
LABELC = (20, 20, 20)

rows = []
for nm in names:
    p = os.path.join(ASSET, nm + '.png')
    if not os.path.exists(p):
        print('없음:', p); continue
    im = Image.open(p).convert('RGBA')
    big = im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)
    canvas = Image.new('RGBA', big.size, WHITE + (255,))
    canvas.alpha_composite(big)
    rows.append((nm, canvas))

if not rows:
    print('그릴 것이 없다'); sys.exit(1)

W = max(c.width for _, c in rows) + PAD * 2
H = sum(c.height for _, c in rows) + PAD * (len(rows) + 1) + 22 * len(rows)
sheet = Image.new('RGB', (W, H), WHITE)
try:
    from PIL import ImageDraw
    d = ImageDraw.Draw(sheet)
except Exception:
    d = None

y = PAD
for nm, c in rows:
    if d: d.text((PAD, y), nm, fill=LABELC)
    y += 22
    sheet.paste(c, (PAD, y), c)
    y += c.height + PAD

path = os.path.join(OUT, 'blackcheck.png')
sheet.save(path)
print('검은조각 눈검사판 →', path, '(', ', '.join(nm for nm, _ in rows), ')')
