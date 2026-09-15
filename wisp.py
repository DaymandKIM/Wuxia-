"""유령불 시트(sheets/wisp.png, 4×4) → assets/wisp_*.png (v2.65 재작업, 오른쪽 보기)
1행(불꽃 해골·글자 박힘)은 디자인이 달라 버린다. 2행 떠다님4(→대기·이동) · 3행 공격4
(손 들기·구체·파동·손끝 구체) · 4행 피격1(웅크림)+죽음2(녹아내림·불꽃)."""
import glob, os
from foesheet import extract, pack, review, R
for f in glob.glob(os.path.join(R, 'assets', 'wisp_*.png')): os.remove(f)
NAMES = [[None]*4, ['float0','float1','float2','float3'],
         ['atk0','atk1','atk2','atk3'], ['hit','death0','death1',None]]   # 불티 컷은 조각이 작아 안 남는다 — 죽음 2컷
fr, _ = extract('wisp.png', NAMES, 34, flip=False, ref='float0')   # 떠 있는 귀신 몸높이 34
pack(fr, 'wisp')
review('wisp', [n for row in NAMES for n in row if n])
