"""주술사 두 시트 → assets/shaman_*.png (v2.64 재작업, 두 시트 다 오른쪽 보기 — 반전 없음)
A(sheets/shaman.png): 대기4 · 걷기4 · 주문(들기·구체 빛·기탄 발사·내림)4 · 피격1+죽음3
B(sheets/shaman_b.png): 3행 지팡이 공격(들기·내리치기·찌르기·뻗음)4 — 스킬(큰 구체) 동작으로.
구체 탄 그림 shaman_m2(옛 시트)는 그대로 쓴다(50-render의 big 탄)."""
import glob, os
from foesheet import extract, pack, review, R
for f in glob.glob(os.path.join(R, 'assets', 'shaman_*.png')):
    if not f.endswith('shaman_m2.png'): os.remove(f)
A = [['idle0','idle1','idle2','idle3'], ['walk0','walk1','walk2','walk3'],
     ['cast0','cast1','cast2','cast3'], ['hit','death0','death1','death2']]
B = [[None]*4, [None]*4, ['staff0','staff1','staff2','staff3'], [None]*4]
fa, sc = extract('shaman.png', A, 50, flip=False, ref='idle0')   # 이 시트는 이미 오른쪽을 본다
fb, _  = extract('shaman_b.png', B, 50, flip=False, scale=sc)      # 같은 배율 — 두 시트 인물 크기가 같다
fa.update(fb)
pack(fa, 'shaman')
review('shaman', [n for row in A for n in row if n] + B[2])
