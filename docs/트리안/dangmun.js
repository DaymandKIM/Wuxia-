// 당문(唐門) 스킬트리 — 설계안 (docs/설계-스킬트리.md 계약 준수)
// 문파색 #c99ad0(자) · 기풍 = 암기·독 → 관통/치명피해/치명/지속.
// 효과 어휘는 docs/설계-스킬트리.md의 eff 표만 쓴다. 새 키 없음.
// 좌표: 폭 0~360, 중앙 180, y 44부터 70 간격, 줄당 2~3노드 지그재그.
// need는 대부분 두 갈래 부모를 걸어 거미줄(교차 간선)을 만든다.

const dangmunNodes = [
  { id:'d0',  x:180, y:44,  k:'root',     need:[],            g:'',  n:'당문 입문',   h:'唐門',       c:0,
    eff:{ crit:3 },
    d:'당문 문하로 들어선다. 첫 손속에 <span class="eff">치명 확률 +3%</span>가 실린다.' },

  { id:'d1',  x:100, y:114, k:'minor',    need:['d0'],        g:'',  n:'지력결',     h:'指力訣',     c:1,
    eff:{ crit:6 },
    d:'손가락 끝에 힘을 모으는 첫걸음. <span class="eff">치명 확률 +6%</span>' },
  { id:'d2',  x:260, y:114, k:'minor',    need:['d0'],        g:'',  n:'독아결',     h:'毒牙訣',     c:1,
    eff:{ cdmg:7 },
    d:'독니처럼 급소를 문다. <span class="eff">치명 피해 +7%</span>' },

  { id:'d3',  x:60,  y:184, k:'minor',    need:['d1'],        g:'',  n:'파갑결',     h:'破甲訣',     c:1,
    eff:{ cdmg:8 },
    d:'갑주 틈을 파고드는 손속. <span class="eff">치명 피해 +8%</span>' },
  { id:'d4',  x:180, y:184, k:'minor',    need:['d1','d2'],   g:'',  n:'급소결',     h:'急所訣',     c:1,
    eff:{ crit:7 },
    d:'급소를 짚어내는 눈썰미. <span class="eff">치명 확률 +7%</span>' },
  { id:'d5',  x:300, y:184, k:'minor',    need:['d2'],        g:'',  n:'표창공',     h:'鏢槍功',     c:1,
    eff:{ artPower:6 },
    d:'표창을 다루는 기본기. <span class="eff">초식 위력 +6%</span>' },

  { id:'d6',  x:120, y:254, k:'minor',    need:['d3','d4'],   g:'',  n:'은침보',     h:'隱針步',     c:1,
    eff:{ spd:6 },
    d:'숨은 걸음, 소리 없는 접근. <span class="eff">이동 속도 +6%</span>' },
  { id:'d7',  x:240, y:254, k:'minor',    need:['d4','d5'],   g:'',  n:'잠행결',     h:'潛行訣',     c:1,
    eff:{ aspd:6 },
    d:'기척을 죽이고 손을 빨리 놀린다. <span class="eff">공격 속도 +6%</span>' },

  { id:'d8',  x:180, y:324, k:'major',    need:['d6','d7'],   g:'暗', n:'암향지',     h:'暗香指',     c:3,
    eff:{ art:'baekbo' },
    d:'어둠 속 향기가 닿으면 이미 늦었다. <span class="eff">초식 습득 — 암향지</span> (기존 무공, cd14·범위280)' },

  { id:'d9',  x:80,  y:394, k:'minor',    need:['d6','d8'],   g:'',  n:'연환지',     h:'連環指',     c:1,
    eff:{ cdr:6 },
    d:'한 번 짚으면 연달아 짚는다. <span class="eff">초식 재사용 -6%</span>' },
  { id:'d10', x:180, y:394, k:'minor',    need:['d8'],        g:'',  n:'자하결',     h:'紫霞訣',     c:1,
    eff:{ atk:6 },
    d:'자줏빛 기운을 손끝에 두른다. <span class="eff">공격력 +6%</span>' },
  { id:'d11', x:280, y:394, k:'minor',    need:['d7','d8'],   g:'',  n:'산공결',     h:'散功訣',     c:1,
    eff:{ artPower:7 },
    d:'흩어 뿌리는 요결. <span class="eff">초식 위력 +7%</span>' },

  { id:'d12', x:60,  y:464, k:'minor',    need:['d9'],        g:'',  n:'축독결',     h:'蓄毒訣',     c:1,
    eff:{ cdmg:9 },
    d:'독을 갈무리해 두었다 한 번에 터뜨린다. <span class="eff">치명 피해 +9%</span>' },
  { id:'d13', x:160, y:464, k:'minor',    need:['d9','d10'],  g:'',  n:'쾌수결',     h:'快手訣',     c:1,
    eff:{ aspd:8 },
    d:'눈에 보이지 않는 손놀림. <span class="eff">공격 속도 +8%</span>' },
  { id:'d14', x:260, y:464, k:'minor',    need:['d10','d11'], g:'',  n:'명중결',     h:'命中訣',     c:1,
    eff:{ crit:8 },
    d:'빗나가지 않는 감각. <span class="eff">치명 확률 +8%</span>' },

  { id:'d15', x:120, y:534, k:'minor',    need:['d12','d13'], g:'',  n:'파혼지',     h:'破魂指',     c:2,
    eff:{ cdmg:12 },
    d:'혼백까지 흔드는 일격. <span class="eff">치명 피해 +12%</span>' },
  { id:'d16', x:240, y:534, k:'minor',    need:['d13','d14'], g:'',  n:'은형보',     h:'隱形步',     c:1,
    eff:{ spd:7 },
    d:'그림자에 몸을 감추고 파고든다. <span class="eff">이동 속도 +7%</span>' },

  { id:'d17', x:180, y:604, k:'major',    need:['d15','d16'], g:'毒', n:'만독불침공', h:'萬毒不侵功', c:3,
    eff:{ art:'mandok', newArt:{
      k:'mandok', n:'만독불침공', h:'萬毒不侵功', type:'passive', school:'dangmun', need:15, cost:8000,
      d:'온갖 독에 물들어 오히려 독이 힘이 된다', dmg:0.12, hp:0.12 } },
    d:'온갖 독에 물들어 오히려 독이 힘이 된다. <span class="eff">심법 습득 — 만독불침공</span> (지닌 채 싸우면 공+12%·체+12%)' },

  { id:'d18', x:90,  y:674, k:'minor',    need:['d17'],       g:'',  n:'진기결',     h:'眞氣訣',     c:1,
    eff:{ passiveAmp:6 },
    d:'독기와 진기가 뒤섞여 돈다. <span class="eff">심법 효과 +6%</span>' },
  { id:'d19', x:180, y:674, k:'minor',    need:['d17'],       g:'',  n:'탐낭결',     h:'探囊訣',     c:1,
    eff:{ gold:7 },
    d:'떨어진 재물을 놓치지 않는다. <span class="eff">은자 획득 +7%</span>' },
  { id:'d20', x:270, y:674, k:'minor',    need:['d17'],       g:'',  n:'환약결',     h:'丸藥訣',     c:1,
    eff:{ regen:6 },
    d:'상비한 영단으로 몸을 다스린다. <span class="eff">회복 +6%</span>' },

  { id:'d21', x:110, y:744, k:'keystone', need:['d18','d19'], g:'花', n:'만천화우',   h:'萬天花雨',   c:5,
    eff:{ keystone:'mancheonhwau', cdmg:35, crit:15, hp:-10 },
    d:'하늘 가득 암기를 흩뿌린다. <span class="eff">치명 피해 +35% · 치명 확률 +15%</span>, 대신 몸이 그만큼 상해 <span class="eff">체력 -10%</span>.' },
  { id:'d22', x:260, y:744, k:'keystone', need:['d19','d20'], g:'骨', n:'화골산공',   h:'化骨散功',   c:5,
    eff:{ keystone:'hwagolsan', artPower:30, cdr:20, regen:-15 },
    d:'뼈를 녹이는 극독을 스스로 두른다. <span class="eff">초식 위력 +30% · 재사용 -20%</span>, 대신 몸이 갉혀 <span class="eff">회복 -15%</span>.' },

  { id:'d23', x:180, y:814, k:'cross',    need:['d21','d22'], g:'',  n:'독풍합격',   h:'毒風合擊',   c:4,
    // cross: 개방(가벼운 몸놀림·기습)과의 교차 — crossNode는 개방 트리 확정 시 채운다(자리표시).
    eff:{ cross:'gaebang', crossNode:'TBD', crit:10, cdr:10 },
    d:'당문의 독과 개방의 그림자가 만나 은밀히 급소를 노린다. 개방 무공도 함께 익혔다면 <span class="eff">치명 확률 +10% · 재사용 -10%</span>가 더해진다.' },
];

/* 신규무공 제안: 만독불침공(萬毒不侵功) — 심법(passive), 당문.
   "온갖 독에도 상하지 않는다"는 무협 공용 관용구(특정 창작명 아님, 조사 문서의
   "한국 장르 공용 자산" 기준 적용) 위에 접미사 문법(~공)만 얹었다.
   효과: dmg+12%·hp+12% (기존 청죽공·혼원일기공과 같은 형식 — heroDmg/heroHpMax에
   artMul('dmg')·artMul('hp')로 그대로 얹힌다). **패시브라 신규 그림/연출 필요 없음**
   — chulwoo·honwon처럼 습득 즉시 조용히 적용되는 심법이라 그림 병목이 없다.
   need:15·cost:8000은 baekbo(need13·5000)보다 한 단계 위, honwon(need16·12000)보다
   아래로 잡았다 — 트리 8번째 줄(major) 위치와 맞춘 임시값, 최종은 사람 확인 후.
   art 키 'mandok'은 00-data.js ARTS.list에 아직 없음 — 채택 시 그 배열에 추가. */
