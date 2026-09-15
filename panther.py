"""표범 시트(sheets/panther.png, 5행×4칸) → assets/panther_*.png (v2.65 재작업, 오른쪽 보기)
1행 대기4 · 2행 질주4(→walk) · 3행 기어가기4(prowl, 미사용 보관) · 4행 발톱 공격4(일어섬·도약·
할큄·착지) · 5행 피격1+죽음3(비틀·엎어짐·쓰러짐)."""
import glob, os
from foesheet import extract, pack, review, R
for f in glob.glob(os.path.join(R, 'assets', 'panther_*.png')): os.remove(f)
NAMES = [['idle0','idle1','idle2','idle3'], ['walk0','walk1','walk2','walk3'],
         ['prowl0','prowl1','prowl2','prowl3'], ['atk0','atk1','atk2','atk3'],
         ['hit','death0','death1','death2']]
fr, _ = extract('panther.png', NAMES, 40, flip=False, ref='idle0')   # 짐승 몸높이 40
pack(fr, 'panther')
review('panther', [n for row in NAMES for n in row if n])
