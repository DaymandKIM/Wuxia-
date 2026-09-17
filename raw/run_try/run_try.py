"""질주 사이클 후보 실험 (hero_run2.py 복사본 — 저장소 assets/ 는 건드리지 않는다).
hero_sheet.extract 는 상대경로 assets/<키>.png · review/hero_specs.json 에 쓰므로, 스크래치 작업 폴더로 chdir 해서 돌리고
결과를 raw/run_try/ 로 옮긴다. 시트 sheets/hero_run2.png 1줄 6칸은 1·2·5·6이 같은 포즈라 사이클이 안 됐다.
  후보 A: 3줄 2~5칸 4컷
  후보 B: 3줄 2~5칸 + 1줄 3칸(큰 보폭)·1줄 4칸(체공) 6컷, 다리 위상 순서로
"""
import os, sys, shutil, json, numpy as np
from PIL import Image, ImageDraw
SP = '/tmp/claude-0/-home-user-Wuxia-/843a48b6-53d5-5478-ae27-cbecdf2e9384/scratchpad'
REPO = '/home/user/Wuxia-'
WD = SP + '/runwd'; os.makedirs(WD + '/assets', exist_ok=True); os.makedirs(WD + '/review', exist_ok=True)
sys.path.insert(0, REPO); os.chdir(WD)
import hero_sheet as HS

# 다리 위상(지지발 x·뒷발 높이로 판독): 접지(r3c2) → 지지발 몸 밑·뒷발 중간(r3c4) → 뒷발 뒤로 높이(r3c5) → 큰 보폭(r1c3)
#  → 뒷발 엉덩이 밑으로 접힘(r3c3) → 뒷발 차고 앞발 앞으로(r1c4, 체공 직전) → 접지(r3c2)…
STRIPS = {
    'run_A': [(2,1),(2,2),(2,3),(2,4)],
    'run_B': [(2,1),(2,3),(2,4),(0,2),(2,2),(0,3)],
}
specs = HS.extract(REPO + '/sheets/hero_run2.png', STRIPS, WD + '/review/hero_run_try.png', center='torso', scale_mul=1.02)
OUT = REPO + '/raw/run_try'; os.makedirs(OUT, exist_ok=True)
for k in STRIPS: shutil.copy(WD + f'/assets/{k}.png', OUT + f'/{k}.png')
json.dump({k: list(v) for k, v in specs.items()}, open(OUT + '/specs.json', 'w'), indent=1)
print('규격', specs)

# ---- 계측: 컷별 키(발바닥~정수리)·발바닥 y·폭 ----
def frames_of(path, W):
    im = np.array(Image.open(path).convert('RGBA')); return [im[:, i*W:(i+1)*W] for i in range(im.shape[1] // W)]
def measure(name, frs):
    rows = []
    for i, f in enumerate(frs):
        a = f[..., 3] > 0; yy, xx = np.where(a)
        rows.append((i, int(yy.max() - yy.min() + 1), int(yy.min()), int(yy.max()), int(xx.min()), int(xx.max()), int(xx.max() - xx.min() + 1)))
    print(f'[{name}] 컷: (i, 키, 정수리y, 발바닥y, x0, x1, 폭)')
    for r in rows: print('   ', r)
    return rows
allf = {}
for k, (W, Hc, top) in specs.items():
    allf[k] = frames_of(OUT + f'/{k}.png', W); measure(k, allf[k])
Wn = 34; now = frames_of(REPO + '/assets/run.png', Wn); measure('run(현재)', now)

# 이웃 컷 다리 IoU (아래 40%) — 같은 포즈가 이웃하면 0.85↑
def legiou(a, b):
    ha = a.shape[0]; A = a[int(ha*0.6):, :, 3] > 0; B = b[int(ha*0.6):, :, 3] > 0
    return (A & B).sum() / max(1, (A | B).sum())
for k, frs in allf.items():
    n = len(frs); print(f'[{k}] 이웃 다리 IoU:', ' '.join(f'{i}->{(i+1)%n}:{legiou(frs[i], frs[(i+1)%n]):.2f}' for i in range(n)))

# ---- 검사판 review/run_try.png ----
BG = (106, 122, 82); SC = 3; PAD = 10
def row_img(frs, label, sc=SC, gap=6):
    h = frs[0].shape[0]; w = frs[0].shape[1]
    R = Image.new('RGB', (PAD*2 + len(frs)*(w*sc+gap), h*sc + 18 + PAD), BG)
    d = ImageDraw.Draw(R); d.text((PAD, 2), label, fill=(255, 255, 200))
    x = PAD
    for i, f in enumerate(frs):
        im = Image.fromarray(f).resize((w*sc, h*sc), Image.NEAREST); R.paste(im, (x, 18), im)
        d.text((x+2, 18), str(i), fill=(255, 255, 0)); x += w*sc + gap
    return R
def film(frs, label, fps=10, sec=0.6, cycles=2, sc=2):
    seq = []
    for c in range(cycles):
        for i in range(len(frs)): seq.append(frs[i])
    t = np.arange(0, sec * cycles, 1.0 / fps)   # 컷 순서대로 두 사이클 — fps 10, 컷당 0.1초
    return row_img(seq, f'{label}  (10fps · 컷 순서대로 두 사이클 · {len(frs)/fps:.1f}초/사이클)', sc=sc, gap=2)
parts = [row_img(now, f'(b) 지금 assets/run.png 6컷 {Wn}x{now[0].shape[0]} — 1·2·5·6 같은 포즈')]
for k, frs in allf.items():
    W, Hc, top = specs[k]; parts.append(row_img(frs, f'(a) 후보 {k[-1]} {len(frs)}컷 {W}x{Hc} 위여분{top}  칸 {STRIPS[k]}'))
for k, frs in allf.items(): parts.append(film(frs, f'(c) 후보 {k[-1]} 필름'))
parts.append(film(now, '(c) 지금 run 필름'))
Wt = max(p.width for p in parts); Ht = sum(p.height for p in parts)
R = Image.new('RGB', (Wt, Ht), BG); y = 0
for p in parts: R.paste(p, (0, y)); y += p.height
os.makedirs(REPO + '/review', exist_ok=True); R.save(REPO + '/review/run_try.png'); print('검사판', REPO + '/review/run_try.png', R.size)

# ---- blackcheck 식 흰 배경 7배 확대판 ----
WHITE = (245, 245, 245); S7 = 7
rows = []
for k in list(specs) + ['run']:
    p = OUT + f'/{k}.png' if k != 'run' else REPO + '/assets/run.png'
    im = Image.open(p).convert('RGBA'); big = im.resize((im.width*S7, im.height*S7), Image.NEAREST)
    c = Image.new('RGBA', big.size, WHITE + (255,)); c.alpha_composite(big); rows.append((k, c))
Wb = max(c.width for _, c in rows) + 20; Hb = sum(c.height + 32 for _, c in rows) + 10
B = Image.new('RGB', (Wb, Hb), WHITE); d = ImageDraw.Draw(B); y = 10
for k, c in rows:
    d.text((10, y), k, fill=(20, 20, 20)); y += 22; B.paste(c, (10, y), c); y += c.height + 10
B.save(REPO + '/review/run_try_black.png'); print('검은조각판', REPO + '/review/run_try_black.png', B.size)
