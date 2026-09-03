"""스프라이트 검사판 — 자른 결과를 사람이 눈으로 보게 만든다.

규칙: 시트에서 프레임을 자르거나 다시 재단했으면, 게임에 넣기 전에
이걸로 PNG를 뽑아 먼저 확인받는다. 검사기(spritetest.js)가 통과해도
'그림이 이상한 것'은 못 잡는다.

    python review.py              모든 종류
    python review.py shaman frog  특정 종류만

나오는 것: review/review-<종류>.png
  · 프레임마다 캔버스 테두리와 발밑 기준선을 함께 그린다
  · 그림이 캔버스에 닿거나(=잘림) 단면이 직선으로 끝나면 빨간 표시
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np, re, os, sys, glob

R = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('WUXIA_REVIEW') or os.path.join(R, 'review')
Z = 4                      # 확대 배율
GROUND = (106, 122, 82)    # 죽림 바닥색 — 게임에서 보게 될 배경
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    big = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc", 19)
except Exception:
    try:
        big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except Exception:
        font = big = ImageFont.load_default()

src = open(R + '/src/00-data.js', encoding='utf-8').read()


def foes():
    """00-data.js 의 FOES 에서 종류마다 규격과 프레임 목록을 읽는다"""
    out = {}
    body = src[src.index('const FOES'):src.index('// 구역별 등장 목록')]
    for m in re.finditer(r'\n  (\w+): \{', body):
        k = m.start()
        nxt = body.find('\n  },', k)
        blk = body[k:nxt]
        name = re.search(r"n:'([^']*)'", blk).group(1)
        w = int(re.search(r'\bw:(\d+)', blk).group(1))
        h = int(re.search(r'\bh:(\d+)', blk).group(1))
        seq, order = {}, []
        for a, lst in re.findall(r'(\w+):\[([^\]]*)\]', blk):
            fr = re.findall(r"'(\w+)'", lst)
            seq[a] = fr
            for f in fr:
                if f not in order:
                    order.append(f)
        out[m.group(1)] = dict(n=name, w=w, h=h, frames=order, anim=seq)
    return out


def flags(path, W, H):
    """잘림 의심 신호를 찾는다"""
    a = np.array(Image.open(path).convert('RGBA'))
    al = a[:, :, 3] > 0
    bad = []
    if a.shape[1] != W or a.shape[0] != H:
        bad.append('규격 %dx%d' % (a.shape[1], a.shape[0]))
    if al[0].any():  bad.append('위 닿음')
    if al[:, 0].any():  bad.append('왼쪽 닿음')
    if al[:, -1].any(): bad.append('오른쪽 닿음')
    # 단면이 직선으로 끝나는가 — 끝 세 열/행의 픽셀 수가 줄지 않으면 절단
    cols = al.sum(0); rows = al.sum(1)
    nz = np.where(cols > 0)[0]
    if len(nz) > 4:
        for side, seq in (('오른끝', cols[nz][-3:]), ('왼끝', cols[nz][:3][::-1])):
            if seq.min() >= 8 and seq[-1] >= seq.max() * 0.9:
                bad.append(side + ' 직선절단?')
    nz = np.where(rows > 0)[0]
    if len(nz) > 4 and rows[nz][:3][::-1].min() >= 8 and rows[nz][0] >= rows[nz][:3].max() * 0.9:
        bad.append('위끝 직선절단?')
    return bad


def sheet(key, M):
    fs = [f for f in M['frames'] if os.path.exists('%s/assets/%s_%s.png' % (R, key, f))]
    if not fs:
        return None
    W, H = M['w'], M['h']
    cell_w, cell_h = W + 6, H + 22
    cols = min(len(fs), max(1, 2600 // max(1, cell_w * Z)))   # 최종 폭 2600px 안쪽
    rows = (len(fs) + cols - 1) // cols
    TOP = 34
    img = Image.new('RGB', (cell_w * cols * Z, rows * cell_h * Z + TOP), (34, 38, 44))
    d = ImageDraw.Draw(img)
    title = '%s (%s)  캔버스 %dx%d  프레임 %d' % (M['n'], key, W, H, len(fs))
    for i, f in enumerate(fs):
        p = '%s/assets/%s_%s.png' % (R, key, f)
        cx, cy = (i % cols) * cell_w * Z, TOP + (i // cols) * cell_h * Z
        cell = Image.new('RGBA', (cell_w, cell_h), GROUND + (255,))
        im = Image.open(p).convert('RGBA')
        cell.alpha_composite(im, (3, 16))
        cd = ImageDraw.Draw(cell)
        cd.rectangle([3, 16, 3 + W - 1, 16 + H - 1], outline=(60, 70, 48))     # 캔버스 경계
        cd.line([3, 16 + H - 1, 3 + W - 1, 16 + H - 1], fill=(150, 120, 60))   # 발밑 기준선
        cd.line([3 + W // 2, 16, 3 + W // 2, 16 + H - 1], fill=(70, 82, 56))   # 가로 중앙
        bad = flags(p, W, H)
        cd.text((4, 3), f, font=font, fill=(226, 232, 238) if not bad else (255, 150, 140))
        if bad:
            cd.text((4 + len(f) * 7 + 8, 3), ' / '.join(bad), font=font, fill=(255, 150, 140))
            cd.rectangle([2, 15, 4 + W, 17 + H], outline=(220, 90, 80))
        img.paste(cell.convert('RGB').resize((cell_w * Z, cell_h * Z), Image.NEAREST), (cx, cy))
    d.text((10, 9), title, font=big, fill=(226, 232, 238))
    path = '%s/review-%s.png' % (OUT, key)
    img.save(path)
    return path, sum(1 for f in fs if flags('%s/assets/%s_%s.png' % (R, key, f), W, H))


F = foes()
want = sys.argv[1:] or sorted(F)
os.makedirs(OUT, exist_ok=True)
for k in want:
    if k not in F:
        print('  ? %s — FOES 에 없다' % k); continue
    r = sheet(k, F[k])
    if not r:
        print('  ? %s — 파일 없음' % k); continue
    p, nbad = r
    print('%-8s %s%s' % (k, p, '   ★의심 %d장' % nbad if nbad else ''))
