"""강도 시트(sheets/bandit.png, 4×4) → assets/bandit_*.png  (v2.64 재작업, 시트는 오른쪽 보기 — 반전 없음)
대기4 · 걷기4 · 공격4(웅크림·찌르기·참격·갈무리) · 피격1 · 죽음1(무릎).
시체 컷(4행 3열)은 돌바닥이 몸과 색이 같아 못 떼어냄 — 죽음은 피격→무릎 2컷."""
import glob, os
from foesheet import extract, pack, review, R
for f in glob.glob(os.path.join(R, 'assets', 'bandit_*.png')): os.remove(f)
NAMES = [['idle0','idle1','idle2','idle3'], ['walk0','walk1','walk2','walk3'],
         ['atk0','atk1','atk2','atk3'], ['hit','death0',None,None]]
fr, _ = extract('bandit.png', NAMES, 48, flip=False, ref='idle0')   # 시트가 이미 오른쪽을 본다(실기 확인 — 반전하니 등을 돌렸다)
pack(fr, 'bandit')
review('bandit', [n for row in NAMES for n in row if n])
