"""주인공 대기·피격·경공 컷을 새 시트에서 (v2.73.2 → v2.76.5 얼굴 톤 통일).
  idle     = 주먹4 시트 1줄 1칸 기수식 (v2.76.5 — 주먹2 시트는 얼굴이 창백한 베이지라 주먹4·발차기3의 황갈 얼굴과 달랐다)
  hit      = 주먹4 시트 3줄 4칸 방어 자세 → 1줄 1칸  2컷. 붉은 번쩍임은 렌더가 얹는다
  dashfly  = 발차기2 시트 3줄 2칸 도약 · dashland = 3줄 1칸 웅크림 (옛 시트라 뽑은 뒤 skinmatch로 살색을 맞춘다)
운기조식(medit)·초식 시전(cast*)은 새 시트가 없어 옛 컷 그대로. 결과 폭은 HFX.aw.idle/hit, DASH.fw·lw에 옮긴다.
"""
import hero_sheet as HS
if __name__ == '__main__':
    HS.extract('sheets/hero_punch4.png', {'idle': [(0,0)], 'hit': [(2,3),(0,0)]}, 'review/hero_pose2.png', center='hair', stand_cell=(0,0))
    HS.extract('sheets/hero_kick2.png', {'dashfly': [(2,1)], 'dashland': [(2,0)]}, 'review/hero_pose2_dash.png', center='hair')
