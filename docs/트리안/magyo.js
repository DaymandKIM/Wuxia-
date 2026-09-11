// 마교 魔敎 스킬트리 — docs/설계-스킬트리.md 데이터 계약.
// 문파색 #d86a5c(적) · 기풍 = 흡성·폭발·고위험 고보상.
// 공격/초식위력/치명/치명피해 위주로 짜고, 흡혈은 어휘에 없어 regen으로 대용
// (상대 기운을 빨아들여 '회복'되는 것으로 번역). 일부 노드는 큰 이득 + 작은
// 페널티로 고위험 고보상을 표현한다(y13·y15, 키스톤 y18·y21).
// id 접두사 y (m은 무당이 씀). 노드 23개: root1 · minor17 · major2 · keystone2 · cross1.

const magyoNodes = [
  { id:'y0',  x:180, y:44,  k:'root',    need:[],           g:'',  n:'마교 입문', h:'魔敎入門', c:0,
    eff:{ atk:5 }, d:'마교의 문턱을 넘는다 — <span class="eff">공격 +5%</span>' },

  { id:'y1',  x:100, y:114, k:'minor',   need:['y0'],       g:'',  n:'마기결',   h:'魔氣結',   c:1,
    eff:{ atk:6 }, d:'마기를 손끝까지 끌어올린다 — <span class="eff">공격 +6%</span>' },
  { id:'y2',  x:260, y:114, k:'minor',   need:['y0'],       g:'',  n:'살초결',   h:'殺招結',   c:1,
    eff:{ crit:6 }, d:'급소만을 노리는 살초 — <span class="eff">치명 +6%</span>' },

  { id:'y3',  x:60,  y:184, k:'minor',   need:['y1'],       g:'',  n:'혈참결',   h:'血斬結',   c:1,
    eff:{ cdmg:6 }, d:'베면 반드시 깊게 — <span class="eff">치명 피해 +6%</span>' },
  { id:'y4',  x:180, y:184, k:'minor',   need:['y1','y2'],  g:'',  n:'폭마결',   h:'爆魔結',   c:1,
    eff:{ artPower:6 }, d:'마기가 초식 끝에서 터진다 — <span class="eff">초식 위력 +6%</span>' },
  { id:'y5',  x:300, y:184, k:'minor',   need:['y2'],       g:'',  n:'질풍마보', h:'疾風魔步', c:1,
    eff:{ aspd:6 }, d:'마기로 손발을 재촉한다 — <span class="eff">공격 속도 +6%</span>' },

  { id:'y6',  x:110, y:254, k:'major',   need:['y3','y4'],  g:'崩', n:'붕산장',   h:'崩山掌',   c:2,
    eff:{ art:'bungsan' }, d:'산을 무너뜨리듯 사방을 친다 — <span class="eff">초식 습득 · 붕산장</span>' },
  { id:'y7',  x:250, y:254, k:'minor',   need:['y4','y5'],  g:'',  n:'탈기결',   h:'奪氣結',   c:1,
    eff:{ regen:6 }, d:'상대의 기운을 빨아 상처를 메운다 — <span class="eff">회복 +6%</span>' },

  { id:'y8',  x:60,  y:324, k:'minor',   need:['y6'],       g:'',  n:'마력결',   h:'魔力結',   c:1,
    eff:{ atk:6 }, d:'마력이 몸에 쌓인다 — <span class="eff">공격 +6%</span>' },
  { id:'y9',  x:180, y:324, k:'minor',   need:['y6','y7'],  g:'',  n:'섬살결',   h:'閃殺結',   c:1,
    eff:{ crit:6 }, d:'번뜩이는 순간에 목을 노린다 — <span class="eff">치명 +6%</span>' },
  { id:'y10', x:300, y:324, k:'minor',   need:['y7'],       g:'',  n:'붕격결',   h:'崩擊結',   c:1,
    eff:{ cdmg:6 }, d:'틀을 부수는 일격 — <span class="eff">치명 피해 +6%</span>' },

  { id:'y11', x:110, y:394, k:'minor',   need:['y8','y9'],  g:'',  n:'광마결',   h:'狂魔結',   c:1,
    eff:{ artPower:7 }, d:'미친 듯 몰아치는 마기 — <span class="eff">초식 위력 +7%</span>' },
  { id:'y12', x:250, y:394, k:'minor',   need:['y9','y10'], g:'',  n:'질주마공', h:'疾走魔功', c:1,
    eff:{ aspd:7 }, d:'마공으로 몸이 가벼워진다 — <span class="eff">공격 속도 +7%</span>' },

  { id:'y13', x:60,  y:464, k:'minor',   need:['y11'],      g:'',  n:'주화결',   h:'走火結',   c:1,
    eff:{ atk:10, hp:-5 }, d:'화후를 앞당기니 몸이 먼저 상한다 — <span class="eff">공격 +10%, 체력 -5%</span>' },
  { id:'y14', x:180, y:464, k:'major',   need:['y11','y12'], g:'奪', n:'탈혼공',   h:'奪魂功',   c:2,
    eff:{ art:'talhon', newArt:{ k:'talhon', n:'탈혼공', h:'奪魂功', type:'passive', school:'magyo',
      need:24, cost:90000, d:'상대의 기운을 빼앗아 자신의 것으로 돌린다 — 흡성 심법. 시전 동작 없음(패시브),',
      dmg:0.15, regen:0.15 } }, // 신규 무공 제안 — 패시브라 그림·연출 추가 없음(기존 패시브와 동일하게 절차 없이 적용)
    d:'상대의 기운을 빼앗아 자신의 것으로 돌린다 — <span class="eff">심법 습득 · 탈혼공(공격+회복 증폭)</span>' },
  { id:'y15', x:300, y:464, k:'minor',   need:['y12'],      g:'',  n:'혈갈결',   h:'血竭結',   c:1,
    eff:{ cdmg:10, regen:-5 }, d:'피를 말려 칼끝을 벼린다 — <span class="eff">치명 피해 +10%, 회복 -5%</span>' },

  { id:'y16', x:110, y:534, k:'minor',   need:['y13','y14'], g:'',  n:'귀살결',   h:'鬼殺結',   c:1,
    eff:{ crit:8 }, d:'귀신처럼 스며들어 벤다 — <span class="eff">치명 +8%</span>' },
  { id:'y17', x:250, y:534, k:'minor',   need:['y14','y15'], g:'',  n:'마염결',   h:'魔炎結',   c:1,
    eff:{ artPower:8 }, d:'마기가 불꽃처럼 번진다 — <span class="eff">초식 위력 +8%</span>' },

  { id:'y18', x:180, y:604, k:'keystone', need:['y16','y17'], g:'吸', n:'흡혼대법', h:'吸魂大法', c:3,
    eff:{ atk:30, regen:-15, keystone:'heuphon' },
    d:'별빛마저 빨아들이나 몸은 갈수록 메마른다 — <span class="eff">공격 +30%, 회복 -15%</span>' },

  { id:'y19', x:100, y:674, k:'minor',   need:['y18'],      g:'',  n:'신속결',   h:'迅速結',   c:1,
    eff:{ cdr:8 }, d:'숨 고를 틈도 없이 다음 초식으로 — <span class="eff">재사용 대기 -8%</span>' },
  { id:'y20', x:260, y:674, k:'minor',   need:['y18'],      g:'',  n:'탈재결',   h:'奪財結',   c:1,
    eff:{ gold:8 }, d:'베어 넘긴 자의 재물은 내 것 — <span class="eff">은자 획득 +8%</span>' },

  { id:'y21', x:180, y:744, k:'keystone', need:['y19','y20'], g:'爆', n:'폭혈대법', h:'爆血大法', c:3,
    eff:{ artPower:35, hp:-15, keystone:'poghyeol' },
    d:'주화입마 직전까지 스스로를 몰아붙인다 — <span class="eff">초식 위력 +35%, 체력 -15%</span>' },

  // 문파 교차 — 당문(독·치명피해)과 엮인다. dangmun 트리 노드 id는 아직 없어
  // crossNode는 가칭('d1') — 당문 트리 확정 시 실제 id로 맞춘다.
  { id:'y22', x:180, y:814, k:'cross',   need:['y21'],      g:'',  n:'독마합벽', h:'毒魔合璧', c:2,
    eff:{ cdmg:10, crit:5, cross:'dangmun', crossNode:'d1' },
    d:'독과 마기가 한몸이 되어 흐른다 — <span class="eff">치명 피해 +10%, 치명 +5%</span>' },
];

/* 신규무공 제안: 탈혼공(奪魂功) — 마교 심법(passive), school:'magyo', need:24, cost:90000,
   dmg:+15%·regen:+15%(흡성/흡혈 대용). 상대의 기운을 빼앗아 자신의 공격·회복으로
   돌린다는 설정으로 마교의 '흡성' 기풍을 심법으로 구현. 패시브라 별도 스프라이트·
   시전 동작이 필요 없다(기존 심법들처럼 습득만으로 상시 적용) — 그림 병목 없음.
   최종 채택 여부·수치는 sim.js 검증 후 사람이 확정. */
