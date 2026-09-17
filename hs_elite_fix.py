# -*- coding: utf-8 -*-
"""화산 정예제자 시트 전처리 — 찌르기(r3) 칸5 의 잘린 칼끝 잇기.

원본 sheets/hs_elite2.png 은 건드리지 않고 sheets/hs_elite2_fix.png 를 새로 쓴다.

무엇이 문제였나
  r3c5(최대 내지름) 의 칼날이 칸 오른쪽 테두리에서 **평평하게 잘려** 있다
  (끝 세 열 픽셀 수 [5,5,4] — 줄지 않고 끝난다 = 절단. CLAUDE.md "잘림 판별법").
  옆칸으로 이어지지도 않아 라벨링으로는 못 살린다.

어떻게 고치나 (CLAUDE.md "짧은 무기는 같은 시트의 온전한 컷에서 잘라 붙인다")
  1. 온전한 컷(r3c6·c7·c8)에서 칼날 길이를 잰다 — 코등이 바로 뒤부터 칼끝까지 37px.
     r3c5 는 지금 15px 뿐이다(코등이 495 → 절단면 509).
  2. 잘린 자리 직전의 **온전한 칼날 단면(열)** 을 축 방향으로 반복해 늘리고,
  3. 맨 끝에 r3c7 의 칼끝(10열)을 떼어 붙인다. 색은 그 컷(c5) 의 단면 색으로
     줄마다 밝기 비율을 지켜 바꿔 칠한다 — 시트마다 칼날 톤이 달라(c7 은 청록빛,
     c5 는 라벤더빛) 그대로 붙이면 끝만 칙칙해진다.
  4. 손질한 컷은 원래 칸(85px)에 안 들어가므로(76 → 98px) **시트 아래에 6번째 줄을
     새로 만들어** 거기 넣는다. r3 은 손대지 않는다 → 추출 때 r3c5 대신 r5c0 을 쓴다.
"""
import numpy as np
from PIL import Image, ImageDraw

R = '/home/user/Wuxia-'
SRC = R + '/sheets/hs_elite2.png'
DST = R + '/sheets/hs_elite2_fix.png'
REV = R + '/review/hs_elite_graft.png'

BGC = (252, 2, 250)          # 시트 배경 마젠타
LINE = (75, 0, 75)           # 칸 테두리 줄(어두운 자주)

sh = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W = sh.shape[:2]

def isbg(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > g + 50) & (b > g + 50) & (np.abs(r - b) < 80)

# ── 1) 칼날 재기 ────────────────────────────────────────────────
ROWY = (336, 447)                       # r3 줄 범위
CELL5 = (427, 511)                      # r3c5 칸 x 범위
BLADE_Y = (388, 393)                    # c5 칼날 5줄 (388~392)
BLADE_X0 = 495                          # 코등이 바로 뒤 칼날 시작
CUT_X = 509                             # 잘린 끝
TARGET = 37                             # 온전한 컷(c6·c7·c8)의 칼날 길이
print('c5 칼날 지금 %d px (x %d~%d) → 목표 %d px, %d px 잇는다'
      % (CUT_X - BLADE_X0 + 1, BLADE_X0, CUT_X, TARGET, TARGET - (CUT_X - BLADE_X0 + 1)))

# ── 2) 새 시트: 원본 + 6번째 줄 ─────────────────────────────────
ROW5_Y0, ROW5_H = H + 1, 112            # 560, 줄 높이 112
NEWH = ROW5_Y0 + ROW5_H                 # 672
im = Image.new('RGB', (W, NEWH), BGC)
im.paste(Image.fromarray(sh.astype(np.uint8), 'RGB'), (0, 0))
d = ImageDraw.Draw(im)
d.line((0, H, W - 1, H), fill=LINE)                       # r4/r5 경계 줄 y=559
d.line((0, NEWH - 1, W - 1, NEWH - 1), fill=LINE)         # 아래 테두리
d.line((0, ROW5_Y0, 0, NEWH - 1), fill=LINE)
d.line((W - 1, ROW5_Y0, W - 1, NEWH - 1), fill=LINE)

# c5 칸의 **그림 픽셀만** 새 줄로 옮긴다 — 칸 테두리 잔재(세로 줄)가 따라오면
# 머리 위 검은 막대가 된다(CLAUDE.md "칸 테두리 잔재"). 배경 판정에 걸리는 픽셀은 안 옮긴다.
DEST_X, DEST_Y = 40, ROW5_Y0
dx = DEST_X - CELL5[0]                  # -387
dy = DEST_Y - (ROWY[0] + 1)             # 560-337 = 223
can = np.array(im).astype(int)
src = sh[ROWY[0] + 1:ROWY[1], CELL5[0]:CELL5[1]]
sm = ~isbg(src)
ys_, xs_ = np.where(sm)
can[ys_ + DEST_Y, xs_ + DEST_X] = src[ys_, xs_]
print('옮긴 그림 픽셀 %d' % len(ys_))

# ── 3) 단면 잡기: 마젠타에 안 물든 마지막 온전한 열들의 중앙값 ──
ref = np.median(sh[BLADE_Y[0]:BLADE_Y[1], 500:506], axis=1)       # 5줄 × RGB
print('c5 칼날 단면(중앙값):', [tuple(int(v) for v in c) for c in ref])

# ── 4) 기증 칼끝: r3c8 (온전) 마지막 10열 ───────────────────────
# c7·c8 둘 다 온전하지만 c7 은 칼날 아랫줄이 7px 물러나 잘린 듯한 계단이 생긴다.
# c8 은 위·아래가 고르게(-2 / -5) 좁아져 뾰족한 끝이 자연스럽다.
D_Y = (386, 391)                        # c8 칼날 5줄(386~390) — c5 388~392 와 같은 구조
D_X1, T = 763, 10                       # 칼끝 맨 끝 x, 떼어 올 열 수
dsub = sh[D_Y[0]:D_Y[1], D_X1 - T + 1:D_X1 + 1]
dmask = ~isbg(dsub)
dref = np.median(sh[D_Y[0]:D_Y[1], 745:754], axis=1)
print('c8 칼끝 단면(중앙값):', [tuple(int(v) for v in c) for c in dref])
print('c8 칼끝 줄별 끝 x(맨 끝 기준):', [int(np.where(dmask[i])[0].max()) - T + 1 if dmask[i].any() else None
                            for i in range(5)])

# 줄마다 밝기 비율을 지키며 c5 색으로 바꿔 칠한다
tip = np.zeros(dsub.shape, int); tipm = dmask.copy()
for i in range(5):
    rl = dref[i].mean()
    for j in range(dsub.shape[1]):
        if not dmask[i, j]: continue
        k = 1.0 if rl < 25 else min(1.05, dsub[i, j].mean() / rl)
        tip[i, j] = np.clip(ref[i] * k, 0, 255)

# ── 5) 새 줄에 칼날 그리기 ──────────────────────────────────────
by0 = BLADE_Y[0] + dy                                  # 611
sx0 = BLADE_X0 + dx                                    # 108  (칼날 시작)
end = sx0 + TARGET - 1                                 # 144  (칼끝 맨 끝)
tip_x0 = end - T + 1                                   # 135
# 절단면 주변(마젠타 물든 507~509 포함) 싹 지우고 다시 그린다
can[by0 - 3:by0 + 8, CUT_X + dx - 2:end + 6] = BGC
for x in range(CUT_X + dx - 2, tip_x0):                # 단면 반복 (120~134)
    for i in range(5):
        can[by0 + i, x] = ref[i]
for j in range(T):                                     # 기증 칼끝 (135~144)
    for i in range(5):
        if tipm[i, j]: can[by0 + i, tip_x0 + j] = tip[i, j]

im = Image.fromarray(can.astype(np.uint8), 'RGB')
im.save(DST)
print('손질본 →', DST, im.size)

# ── 6) 손질 전후 대조판 ─────────────────────────────────────────
S = 7
a = Image.open(SRC).convert('RGB').crop((CELL5[0], ROWY[0] + 1, CELL5[1], ROWY[1]))
bfull = im.crop((DEST_X - 4, DEST_Y, DEST_X + 120, DEST_Y + ROW5_H - 2))
c = Image.open(SRC).convert('RGB').crop((683, ROWY[0] + 1, 768, ROWY[1]))
cw = max(a.width, bfull.width, c.width)
cv = Image.new('RGB', (cw * S + 40, (a.height + bfull.height + c.height) * S + 100), (245, 245, 245))
dr = ImageDraw.Draw(cv); y = 10
for lab, img in [('BEFORE  r3c5 (칼끝 잘림)', a), ('AFTER   r5c0 (단면 반복 + c8 칼끝)', bfull),
                 ('REF     r3c8 (온전한 칼끝 — 기증 컷)', c)]:
    dr.text((10, y), lab, fill=(0, 0, 0)); y += 20
    cv.paste(img.resize((img.width * S, img.height * S), Image.NEAREST), (20, y))
    y += img.height * S + 10
cv.save(REV); print('대조판 →', REV)
