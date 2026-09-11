// 개방 丐幫 스킬트리 — docs/설계-스킬트리.md 계약 준수
// 문파색 #b08a5c(갈) · 기풍 = 취권·타구·야행 → 회피/이동/기습(치명)/공격속도
// 좌표: 폭 0~360, 중앙 180, 위 44부터 아래로 ~70 간격, 2~3노드 지그재그 + 거미줄 need
// eff 잔가지·키스톤 값은 정수 % (design doc 규약). 새 효과 키 없음 — 표의 12키만 사용.
// 무공 마디는 art 습득만 트리거(eff:{art:k}) — 실제 수치는 src/00-data.js ARTS.list가 갖는다.
const gaebangNodes = [
  { id:'g0',  x:180, y:44,  k:'root',    need:[],           g:'',  n:'개방 입문', h:'丐幫入門', c:0,
    eff:{ gold:3 }, d:'거리에서 배운 것이 무공이 된다 · <span class="eff">은자 획득 +3%</span>' },

  { id:'g1',  x:90,  y:114, k:'minor',   need:['g0'],       g:'',  n:'표풍결', h:'飄風訣', c:1,
    eff:{ spd:5 }, d:'바람처럼 가볍게 딛는 첫걸음 · <span class="eff">이동 +5%</span>' },
  { id:'g2',  x:270, y:114, k:'minor',   need:['g0'],       g:'',  n:'타구식', h:'打狗式', c:1,
    eff:{ aspd:5 }, d:'몽둥이를 짧게 짧게 놀린다 · <span class="eff">공격 속도 +5%</span>' },

  { id:'g3',  x:60,  y:184, k:'minor',   need:['g1'],       g:'',  n:'야보공', h:'夜步功', c:1,
    eff:{ spd:6 }, d:'밤길을 걷듯 발소리가 없다 · <span class="eff">이동 +6%</span>' },
  { id:'g4',  x:180, y:184, k:'minor',   need:['g1','g2'],  g:'',  n:'급소결', h:'急所訣', c:1,
    eff:{ crit:5 }, d:'어디를 노려야 할지 안다 · <span class="eff">치명 확률 +5%</span>' },
  { id:'g5',  x:300, y:184, k:'minor',   need:['g2'],       g:'',  n:'연환장', h:'連環杖', c:1,
    eff:{ aspd:6 }, d:'지팡이가 끊임없이 이어진다 · <span class="eff">공격 속도 +6%</span>' },

  { id:'g6',  x:90,  y:254, k:'minor',   need:['g3','g4'],  g:'',  n:'구걸결', h:'求乞訣', c:1,
    eff:{ gold:6 }, d:'손을 벌리면 어디서든 챙긴다 · <span class="eff">은자 획득 +6%</span>' },
  { id:'g7',  x:270, y:254, k:'minor',   need:['g4','g5'],  g:'',  n:'기습보', h:'奇襲步', c:1,
    eff:{ crit:6 }, d:'그림자처럼 다가가 허를 찌른다 · <span class="eff">치명 확률 +6%</span>' },

  { id:'g8',  x:60,  y:324, k:'minor',   need:['g6'],       g:'',  n:'취리보', h:'醉履步', c:1,
    eff:{ spd:8 }, d:'취한 듯 흐트러진 걸음이 오히려 빠르다 · <span class="eff">이동 +8%</span>' },
  { id:'g9',  x:180, y:324, k:'minor',   need:['g6','g7'],  g:'',  n:'걸신공', h:'乞身功', c:1,
    eff:{ hp:6 }, d:'거리에서 구른 몸이 맷집도 는다 · <span class="eff">체력 +6%</span>' },
  { id:'g10', x:300, y:324, k:'minor',   need:['g7'],       g:'',  n:'난봉결', h:'亂棒訣', c:1,
    eff:{ aspd:8 }, d:'몽둥이질이 어지러이 빨라진다 · <span class="eff">공격 속도 +8%</span>' },

  { id:'g11', x:90,  y:394, k:'major',   need:['g8','g9'],  g:'夜', n:'야행심법', h:'夜行心法', c:2,
    eff:{ art:'yuwoon' }, d:'밤길을 걷듯 흐르고 스민다 — 심법 습득 · <span class="eff">공격 속도 계열과 함께 상시 발동</span>' },
  { id:'g12', x:270, y:394, k:'major',   need:['g9','g10'], g:'旋', n:'선풍퇴', h:'旋風腿', c:2,
    eff:{ art:'whirl' }, d:'휘돌아 차서 주위를 쓸어낸다 — 초식 습득 · <span class="eff">범위 공격 자동 시전</span>' },

  { id:'g13', x:60,  y:464, k:'minor',   need:['g11'],        g:'',  n:'연격결', h:'連擊訣', c:1,
    eff:{ cdr:8 }, d:'숨 돌릴 틈 없이 다음 수를 잇는다 · <span class="eff">초식 재사용 -8%</span>' },
  { id:'g14', x:180, y:464, k:'minor',   need:['g11','g12'],  g:'',  n:'강호술', h:'江湖術', c:1,
    eff:{ gold:8 }, d:'저잣거리 소문이 곧 밥벌이다 · <span class="eff">은자 획득 +8%</span>' },
  { id:'g15', x:300, y:464, k:'minor',   need:['g12'],        g:'',  n:'봉법결', h:'棒法訣', c:1,
    eff:{ artPower:7 }, d:'몽둥이 초식에 실리는 힘을 더한다 · <span class="eff">초식 위력 +7%</span>' },

  { id:'g16', x:90,  y:534, k:'minor',   need:['g13','g14'], g:'',  n:'만금안', h:'萬金眼', c:1,
    eff:{ gold:10 }, d:'어디에 은자가 굴러다니는지 보인다 · <span class="eff">은자 획득 +10%</span>' },
  { id:'g17', x:270, y:534, k:'minor',   need:['g14','g15'], g:'',  n:'야습공', h:'夜襲功', c:1,
    eff:{ crit:8 }, d:'밤의 습격은 한 수가 곱절이다 · <span class="eff">치명 확률 +8%</span>' },

  // 신규 무공 마디 — 패시브라 시전 연출이 없다(그림 병목 없음). 자세한 스펙은 파일 끝 제안 참고.
  { id:'g18', x:180, y:604, k:'major',   need:['g16','g17'], g:'醉', n:'취권결', h:'醉拳訣', c:3,
    eff:{ art:'chwigwon', newArt:{
      k:'chwigwon', n:'취권결', h:'醉拳訣', type:'passive', school:'gaebang', need:14, cost:4000,
      d:'취한 듯 흐트러진 몸놀림이 오히려 빈틈을 없앤다', dmg:0.12, spd:0.08,
    } },
    d:'술 취한 척 몸을 놀려 빈틈을 만들지 않는다 — 심법 습득(연출 재사용 없음, 신규 패시브) · <span class="eff">공격력·이동 상시 증폭</span>' },

  { id:'g19', x:90,  y:674, k:'keystone', need:['g18'], g:'仙', n:'취팔선', h:'醉八仙', c:4,
    eff:{ keystone:'chwipalseon', spd:30, crit:15, hp:-10 },
    d:'여덟 잔을 다 비우면 비틀거림도 공격이 된다 — 빠르고 매섭지만 몸은 허술해진다 · <span class="eff">이동 +30% · 치명 확률 +15%</span> / <span class="eff">체력 -10%</span>' },
  { id:'g20', x:270, y:674, k:'keystone', need:['g18'], g:'丐', n:'개방원로결', h:'丐幫元老訣', c:4,
    eff:{ keystone:'gaebangwonro', gold:35, cdr:15, hp:-10 },
    d:'떠돌며 쌓은 관록이 손속에 여유를 준다 — 실속은 챙기되 몸은 사린다 · <span class="eff">은자 획득 +35% · 초식 재사용 -15%</span> / <span class="eff">체력 -10%</span>' },

  // 문파 교차 — 당문(dangmun)의 대응 노드는 아직 없다(당문 트리 미작성). 'd7'은 잠정 id, 당문 트리 작성 시 확정한다.
  { id:'g21', x:180, y:744, k:'cross', need:['g19','g20'], g:'', n:'암야합', h:'暗夜合', c:3,
    eff:{ cross:'dangmun', crossNode:'d7', crit:10, cdmg:10 },
    d:'개방의 야행에 당문의 독이 스민다 — 밤손님의 일격이 곱절로 아프다 · <span class="eff">치명 확률 +10% · 치명 피해 +10%</span>' },
];

/* 신규무공 제안:
 * 1) 취권결 醉拳訣 (school:gaebang, type:passive) — 트리 g18에 이미 반영됨.
 *    패시브라 시전 연출·cast 스트립이 필요 없다(그림 병목 없음). ARTS.list 편입만 하면 된다.
 *    스펙 제안: need:14, cost:4000, dmg:0.12, spd:0.08.
 * 2) (미채택, 참고용) 난영각권 亂影脚拳 — 타구/취권 계열 신규 액티브 초식 후보.
 *    "그림자가 어지러이 흩어지듯 연달아 걷어찬다" — 다단 히트형(선풍퇴와 차별화, 단일 표적 연타).
 *    액티브라 sheets/ 원본 시트와 cast 스트립이 새로 필요하다 — 그림 병목이라 이번 트리에는
 *    넣지 않았다. 넣게 되면 선풍퇴(whirl)의 castw 동작 후반부를 재사용/변형하는 방안부터
 *    검토할 것(전혀 새 시트를 뽑기 전에 기존 개방 초식 연출 재활용 가능한지 먼저 확인).
 */
