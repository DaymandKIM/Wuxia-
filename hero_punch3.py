"""정권 두 판 = 옛 권기 정권 시트(sheets/hero_fx.png 2·3줄, 4칸 격자)를 새 추출기로 다시 뽑는다 (v2.74.1).
사용자: "이전 시트에 쓸 만한 게 있으면 버리지 말고 조합해, 지금 주먹은 마음에 안 든다" — 새 주먹 시트(hero_punch2)
1·3줄은 네 컷이 같은 자세라 밋밋했고, 권기 정권은 기수식→권기 내지름→흙먼지 임팩트→거둠으로 동작이 살아 있다.
그림체도 새 시트와 같은 계열. punch = 2줄(오른손), punchb = 3줄(왼손). 1줄(심법 안개)은 안 쓴다.
"""
import hero_sheet as HS
STRIPS = {'punch': [(1,0),(1,1),(1,2),(1,3)], 'punchb': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_fx.png', STRIPS, 'review/hero_punch3.png', center='hair', share_width=True, stand_cell=(1,0), rows=3, cols=4)
