"""권기 정권 두 판 = 옛 hero_fx 시트(2·3줄, 4칸 격자)를 새 추출기로 (v2.74.1 → v2.76.2 qipunch·qipunchb로 되살림).
사용자: "이전 시트에 쓸 만한 게 있으면 버리지 말고 조합해" → v2.76.2 "기존 것들도 잘 살려서" — 무브셋 맨 끝의
기 모아 치는 마무리 일격. 기수식→권기 내지름→흙먼지 임팩트→거둠. qipunch = 2줄(오른손), qipunchb = 3줄(왼손).
**머리가 크다**(v2.76.3 사용자 "머리가 왜 이리 크냐"): hero_fx는 머리 큰 치비 비율이라 몸 높이 47로 맞추면 머리 폭이
27px(새 시트 20~23). scale_mul 0.86으로 머리 폭 ~23에 맞춘다(몸은 40px로 조금 작아지지만 머리가 먼저 눈에 띈다).
"""
import hero_sheet as HS
STRIPS = {'qipunch': [(1,0),(1,1),(1,2),(1,3)], 'qipunchb': [(2,0),(2,1),(2,2),(2,3)]}
if __name__ == '__main__':
    HS.extract('sheets/hero_fx.png', STRIPS, 'review/hero_punch3.png', center='hair', share_width=True, stand_cell=(1,0), rows=3, cols=4, scale_mul=0.86)
