"""주인공 대기·피격·경공 컷을 새 시트에서 (v2.73.2 — 옛 시트 컷은 흰 도복·날씬한 체형이라 새 공격·질주 컷과 번갈아
보이면 딴 인물 같았다). 새 시트엔 전용 컷이 없어 가까운 자세를 쓴다:
  idle     = 주먹 시트 1줄 1칸 기수식(정면 전투 자세 — 옛 idle과 같은 뜻)
  hit      = 주먹 시트 3줄 6칸(뒤로 기운 기수식) → 1줄 1칸  2컷. 붉은 번쩍임은 렌더가 얹는다
  dashfly  = 발차기 시트 3줄 2칸 도약 · dashland = 3줄 1칸 웅크림
운기조식(medit)·초식 시전(cast*)은 새 시트가 없어 옛 컷 그대로. 결과 폭은 HFX.aw.idle/hit, DASH.fw·lw에 옮긴다.
"""
import hero_sheet as HS
if __name__ == '__main__':
    HS.extract('sheets/hero_punch2.png', {'idle': [(0,0)], 'hit': [(2,5),(0,0)]}, 'review/hero_pose2.png', center='hair')
    HS.extract('sheets/hero_kick2.png', {'dashfly': [(2,1)], 'dashland': [(2,0)]}, 'review/hero_pose2_dash.png', center='hair')
