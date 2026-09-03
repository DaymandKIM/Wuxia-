"""샤먼 두 동작을 게임과 같은 계산으로 미리 그려 본다.
   drawFoe 의 배치·크기·투명도 식을 그대로 옮겼다."""
from PIL import Image, ImageDraw, ImageFont
import re, json, os
R = os.path.dirname(os.path.abspath(__file__))
src = open(R + '/src/00-data.js', encoding='utf-8').read()

SH = src[src.index('shaman:'):]
anim = {}
for a in ['atk', 'skill']:
    m = re.search(a + r':\[([^\]]*)\]', SH)
    anim[a] = re.findall(r"'(\w+)'", m.group(1))
fps = dict(re.findall(r'(\w+):([\d.]+)', re.search(r'fps:\{([^}]*)\}', SH).group(1)))

CW, CH = 210, 78                       # 미리보기 칸
FX, FY = 72, 70                        # 칸 안에서 발밑 원점
Z = 4
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
except Exception: font = ImageFont.load_default()

def frame(name, tag):
    c = Image.new('RGBA', (CW, CH), (106, 122, 82, 255))
    sp = Image.open('%s/assets/shaman_%s.png' % (R, name)).convert('RGBA')
    c.alpha_composite(sp, (FX - sp.width // 2, FY - sp.height))
    d = ImageDraw.Draw(c); d.text((4, 3), tag, font=font, fill=(30, 40, 24))
    return c

rows = [('BASIC ATTACK (atk)',   [frame(n, '%s  %d' % (n, i)) for i, n in enumerate(anim['atk'])]),
        ('SKILL CAST (skill)',   [frame(n, '%s  %d' % (n, i)) for i, n in enumerate(anim['skill'])])]

W = CW * max(len(r[1]) for r in rows)
H = sum(CH + 20 for r in rows)
img = Image.new('RGB', (W, H), (34, 38, 44))
d = ImageDraw.Draw(img); y = 0
for title, row in rows:
    d.text((6, y + 5), title, font=font, fill=(226, 232, 238))
    for i, c in enumerate(row):
        img.paste(c.convert('RGB'), (i * CW, y + 20))
    y += CH + 20
img = img.resize((W * Z // 2, H * Z // 2), Image.NEAREST)
os.makedirs(R + '/review', exist_ok=True)
img.save(R + '/review/shaman-motions.png')
print('기본 공격', anim['atk'])
print('스킬     ', anim['skill'])
print(img.size)
