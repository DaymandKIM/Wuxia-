// 아미(峨嵋) 스킬트리 — docs/설계-스킬트리.md 노드 형식.
// 기풍: 자비·기공·요상 → 회복·심법증폭·초식위력·광역. 문파색 #b9a6d8.
// eff 어휘는 설계-스킬트리.md 표 그대로(새 키 없음). g는 마디·키스톤만 채움.
const amiNodes = [
  { id:'a0',  x:180, y:44,  k:'root',     need:[],           g:'',  n:'아미입문', h:'峨嵋入門', c:0, eff:{}, d:'아미파의 산문(山門)을 넘는다.' },

  { id:'a1',  x:110, y:114, k:'minor',    need:['a0'],       g:'',  n:'자비결',   h:'慈悲訣',   c:1, eff:{regen:6}, d:'베풀수록 스스로도 차오른다.<span class="eff">회복 +6%</span>' },
  { id:'a2',  x:250, y:114, k:'minor',    need:['a0'],       g:'',  n:'조기결',   h:'調氣訣',   c:1, eff:{passiveAmp:6}, d:'기운을 고르게 다스려 심법이 깊어진다.<span class="eff">심법 효과 +6%</span>' },

  { id:'a3',  x:60,  y:184, k:'minor',    need:['a1'],       g:'',  n:'토납결',   h:'吐納訣',   c:1, eff:{regen:6}, d:'묵은 숨을 내쉬고 맑은 숨을 들인다.<span class="eff">회복 +6%</span>' },
  { id:'a4',  x:180, y:184, k:'minor',    need:['a1','a2'],  g:'',  n:'정심결',   h:'定心訣',   c:2, eff:{hp:6, regen:4}, d:'흔들리지 않는 마음이 몸을 지킨다.<span class="eff">체력 +6% · 회복 +4%</span>' },
  { id:'a5',  x:300, y:184, k:'minor',    need:['a2'],       g:'',  n:'묘공결',   h:'妙功訣',   c:1, eff:{artPower:6}, d:'오묘한 손끝에서 초식이 여문다.<span class="eff">초식 위력 +6%</span>' },

  { id:'a6',  x:70,  y:254, k:'minor',    need:['a3'],       g:'',  n:'백광결',   h:'白光訣',   c:1, eff:{regen:7}, d:'하얀 빛이 상처를 스치고 지난다.<span class="eff">회복 +7%</span>' },
  { id:'a7',  x:190, y:254, k:'minor',    need:['a4'],       g:'',  n:'연심결',   h:'蓮心訣',   c:2, eff:{passiveAmp:7, hp:5}, d:'연꽃처럼 진흙 속에서도 맑다.<span class="eff">심법 효과 +7% · 체력 +5%</span>' },
  { id:'a8',  x:310, y:254, k:'minor',    need:['a5'],       g:'',  n:'관조결',   h:'觀照訣',   c:1, eff:{artPower:7}, d:'고요히 살펴 급소를 짚는다.<span class="eff">초식 위력 +7%</span>' },

  { id:'a9',  x:130, y:324, k:'major',    need:['a6','a7'],  g:'活', n:'활인기공', h:'活人氣功', c:3, eff:{art:'hwalin'}, d:'위태로우면 숨을 불어넣는다 — 아미의 손이 닿으면 죽어가던 이도 산다.<span class="eff">초식 습득 · 활인기공</span>' },
  { id:'a10', x:280, y:324, k:'minor',    need:['a8'],       g:'',  n:'설법결',   h:'說法訣',   c:1, eff:{passiveAmp:6}, d:'말 한마디가 마음의 짐을 던다.<span class="eff">심법 효과 +6%</span>' },

  { id:'a11', x:90,  y:394, k:'minor',    need:['a9'],       g:'',  n:'보시결',   h:'普施訣',   c:1, eff:{regen:8}, d:'널리 베푸는 손에는 마름이 없다.<span class="eff">회복 +8%</span>' },
  { id:'a12', x:210, y:394, k:'minor',    need:['a7','a8'],  g:'',  n:'원융결',   h:'圓融訣',   c:2, eff:{hp:7, artPower:5}, d:'모난 곳 없이 둥글게 이어진다.<span class="eff">체력 +7% · 초식 위력 +5%</span>' },
  { id:'a14', x:330, y:394, k:'minor',    need:['a10'],      g:'',  n:'유화결',   h:'柔和訣',   c:1, eff:{hp:6}, d:'부드러움이 단단함을 이긴다.<span class="eff">체력 +6%</span>' },

  { id:'a13', x:180, y:464, k:'major',    need:['a11','a12'], g:'白', n:'백련심공', h:'白蓮心功', c:3,
    eff:{ art:'baekryeon', newArt:{ k:'baekryeon', n:'백련심공', h:'白蓮心功', type:'passive', school:'ami', need:20, cost:30000,
      d:'진흙 속에서도 물들지 않는 흰 연꽃 — 자비로운 기운이 몸을 감싼다', regen:0.25, hp:0.10 } },
    d:'백련이 피어나듯 자비의 기운이 몸 안에 돈다.<span class="eff">심법 습득 · 백련심공(회복+체력)</span>' },

  { id:'a15', x:90,  y:534, k:'minor',    need:['a13'],       g:'',  n:'묵향결',   h:'墨香訣',   c:1, eff:{artPower:8}, d:'붓끝처럼 정교하게 급소를 찌른다.<span class="eff">초식 위력 +8%</span>' },
  { id:'a16', x:200, y:534, k:'minor',    need:['a13','a14'], g:'',  n:'행운결',   h:'行雲訣',   c:2, eff:{regen:8, passiveAmp:5}, d:'구름처럼 걸림 없이 기운이 흐른다.<span class="eff">회복 +8% · 심법 효과 +5%</span>' },
  { id:'a22', x:320, y:534, k:'minor',    need:['a12'],       g:'',  n:'월영결',   h:'月影訣',   c:1, eff:{hp:8}, d:'달그림자처럼 은은히 몸을 지킨다.<span class="eff">체력 +8%</span>' },

  { id:'a17', x:140, y:604, k:'keystone', need:['a15','a16'], g:'大', n:'대자대비', h:'大慈大悲', c:4,
    eff:{ keystone:'daejadaebi', regen:40, atk:-10 },
    d:'모두를 살리려는 마음은 내 창끝을 무디게 한다.<span class="eff">회복 +40% · 공격력 -10%</span>' },
  { id:'a18', x:280, y:604, k:'minor',    need:['a22'],       g:'',  n:'보련결',   h:'寶蓮訣',   c:1, eff:{passiveAmp:8}, d:'보배로운 연꽃이 심법을 밝힌다.<span class="eff">심법 효과 +8%</span>' },

  { id:'a19', x:150, y:674, k:'minor',    need:['a17'],       g:'',  n:'공심결',   h:'空心訣',   c:2, eff:{artPower:8, regen:5}, d:'비운 마음에 초식이 절로 여문다.<span class="eff">초식 위력 +8% · 회복 +5%</span>' },
  { id:'a20', x:280, y:674, k:'cross',    need:['a18'],       g:'',  n:'인연결',   h:'因緣訣',   c:2,
    eff:{ cross:'bamboo', crossNode:'b0', regen:6, artPower:6 },
    d:'청죽문과 아미의 인연이 닿아 자비와 곧음이 하나 된다.<span class="eff">회복 +6% · 초식 위력 +6% (청죽문 인연 필요)</span>' },

  { id:'a21', x:200, y:744, k:'keystone', need:['a19','a20'], g:'妙', n:'묘상신결', h:'妙相神訣', c:4,
    eff:{ keystone:'myosang', artPower:35, cdr:15, hp:-15 },
    d:'천 개의 손이 천 개의 초식을 편다 — 그 대가로 몸을 돌보지 못한다.<span class="eff">초식 위력 +35% · 재사용 -15% · 체력 -15%</span>' },
];

/* 신규무공 제안: 백련심공(白蓮心功) — 아미 심법, k:'baekryeon', school:'ami'.
   자비/기공 계열 패시브: 회복 +25%, 체력 +10% (ARTS 기존 표기 방식 그대로,
   chulwoo·honwon과 같은 패턴). 습득 경로는 트리 전용(a13, 경지 조건 대신
   need:['a11','a12'] 두 갈래 회복·체력 잔가지 수렴) — need:20/cost:30000은
   기존 표(ARTS.list)에 병행 등록할 때 참고용 기본값이며, hwalin(need19)
   보다 살짝 뒤, bungsan(need22) 보다 앞에 오도록 잡았다. 액티브 아님(자동
   시전·연출 신규 불필요) — 그림 병목 없이 바로 채택 가능한 후보.
   최종 채택·ARTS.list 편입 여부는 사람 확인 후 진행. */
