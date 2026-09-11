// 화산(華山) 무공도 — 스킬트리 노드 데이터
// docs/설계-스킬트리.md 계약 · docs/조사-무공작명.md 작명 규칙 준수.
//
// 기풍: 매화 검법·표홀(飄忽)·연격 → 우리 게임은 무기 없는 맨손이라
// "매화 장/지/권"으로 번안(설계-스킬트리.md의 화산 항목 그대로 따름).
// 치명(crit·cdmg)·속도(aspd·spd) 위주 잔가지, 연격/위력 결정타는 artPower.
//
// 화산은 기존 ARTS에 무공이 하나도 없다(00-data.js 주석: "아직 무공 없음").
// 그래서 이 트리에 신규 무공 2개를 얹어 제안한다 — 액티브 1(표매권)·
// 심법 1(매향심결). 상세 스펙은 파일 끝 /* 신규무공 제안 */ 참고.
//
// 노드 23개: root 1 · minor(잔가지) 17 · major(무공) 2 · keystone 2 · cross 1.
// id 접두사 h. 좌표는 폭 0~360(중앙 180), y 44부터 70 간격 안팎으로 지그재그,
// need를 여러 갈래로 모아(h4·h6·h7·h8·h12·h13·h14·h18·h19·h22) 거미줄을 만든다.

const hwasanNodes = [
  // ── 입문 ──────────────────────────────────────────────
  { id:'h0', x:180, y:44,  k:'root', need:[],
    g:'華', n:'화산입문', h:'華山入門', c:0,
    eff:{ spd:3 },
    d:'화산의 문턱을 넘는다 — <span class="eff">이동 +3%</span>, 몸놀림이 한결 가벼워진다' },

  // ── 1단: 첫 갈래 ──────────────────────────────────────
  { id:'h1', x:100, y:114, k:'minor', need:['h0'],
    g:'', n:'매섬결', h:'梅閃訣', c:1,
    eff:{ crit:6 },
    d:'매화잎이 스치듯 빈틈을 노린다 — <span class="eff">치명 확률 +6%</span>' },
  { id:'h2', x:260, y:114, k:'minor', need:['h0'],
    g:'', n:'표신보', h:'飄身步', c:1,
    eff:{ spd:6 },
    d:'꽃잎처럼 가볍게 내딛는다 — <span class="eff">이동 +6%</span>' },

  // ── 2단: 갈라졌다 다시 모인다 ─────────────────────────
  { id:'h3', x:60,  y:184, k:'minor', need:['h1'],
    g:'', n:'연화수', h:'連花手', c:1,
    eff:{ aspd:6 },
    d:'손이 꽃잎 떨어지듯 연달아 나간다 — <span class="eff">공격 속도 +6%</span>' },
  { id:'h4', x:180, y:184, k:'minor', need:['h1','h2'],
    g:'', n:'매화안', h:'梅花眼', c:1,
    eff:{ crit:8 },
    d:'빈틈이 꽃잎처럼 눈에 들어온다 — <span class="eff">치명 확률 +8%</span>' },
  { id:'h5', x:300, y:184, k:'minor', need:['h2'],
    g:'', n:'매경결', h:'梅勁訣', c:1,
    eff:{ artPower:6 },
    d:'한 수에 매화의 힘을 싣는다 — <span class="eff">초식 위력 +6%</span>' },

  // ── 3단: 합류 ─────────────────────────────────────────
  { id:'h6', x:110, y:254, k:'minor', need:['h3','h4'],
    g:'', n:'쇄매결', h:'碎梅訣', c:1,
    eff:{ cdmg:8 },
    d:'스치면 반드시 부순다 — <span class="eff">치명 피해 +8%</span>' },
  { id:'h7', x:250, y:254, k:'minor', need:['h4','h5'],
    g:'', n:'경신결', h:'輕身訣', c:1,
    eff:{ spd:6 },
    d:'걸음이 눈처럼 가볍다 — <span class="eff">이동 +6%</span>' },

  // ── 4단: 무공 마디 — 심법 ────────────────────────────
  { id:'h8', x:180, y:324, k:'major', need:['h6','h7'],
    g:'梅', n:'매향심결', h:'梅香心訣', c:3,
    eff:{ art:'maehyang', newArt:{
      k:'maehyang', n:'매향심결', h:'梅香心訣', type:'passive', school:'hwasan',
      need:8, cost:1000, d:'매화 향기가 스미듯 몸에 밴다',
      aspd:0.15, crit:0.08 } },
    d:'매화 향이 몸에 배어 손이 빨라지고 눈이 밝아진다 — 심법을 <span class="eff">습득</span>한다(상세는 파일 끝 제안 참고)' },

  // ── 5단: 세 갈래 ──────────────────────────────────────
  { id:'h9', x:80,  y:394, k:'minor', need:['h6'],
    g:'', n:'질풍수', h:'疾風手', c:1,
    eff:{ aspd:7 },
    d:'손이 바람보다 빠르다 — <span class="eff">공격 속도 +7%</span>' },
  { id:'h10', x:180, y:394, k:'minor', need:['h8'],
    g:'', n:'점화지', h:'點花指', c:1,
    eff:{ crit:7 },
    d:'꽃점 하나로 급소를 찍는다 — <span class="eff">치명 확률 +7%</span>' },
  { id:'h11', x:280, y:394, k:'minor', need:['h7'],
    g:'', n:'매환결', h:'梅環訣', c:1,
    eff:{ cdr:6 },
    d:'초식이 고리 돌듯 금세 다시 찬다 — <span class="eff">초식 재사용 -6%</span>' },

  // ── 6단: 합류 ─────────────────────────────────────────
  { id:'h12', x:130, y:464, k:'minor', need:['h9','h10'],
    g:'', n:'난격결', h:'亂擊訣', c:1,
    eff:{ aspd:8 },
    d:'어지러이 흩날리듯 친다 — <span class="eff">공격 속도 +8%</span>' },
  { id:'h13', x:230, y:464, k:'minor', need:['h10','h11'],
    g:'', n:'파화장', h:'破花掌', c:1,
    eff:{ cdmg:10 },
    d:'꽃이 부서지듯 상대가 무너진다 — <span class="eff">치명 피해 +10%</span>' },

  // ── 7단: 무공 마디 — 액티브 ──────────────────────────
  { id:'h14', x:180, y:534, k:'major', need:['h12','h13'],
    g:'拳', n:'표매권', h:'飄梅拳', c:3,
    eff:{ art:'pyomae', newArt:{
      k:'pyomae', n:'표매권', h:'飄梅拳', type:'active', school:'hwasan',
      need:17, cost:17000, d:'매화 흩날리듯 표홀하게 세 번 스쳐 친다',
      cd:7, mul:4.2, range:70, hits:3 } },
    d:'표홀한 신법으로 파고들어 연달아 세 번 친다 — 초식을 <span class="eff">습득</span>한다(상세는 파일 끝 제안 참고)' },

  // ── 8단: 세 갈래 ──────────────────────────────────────
  { id:'h15', x:70,  y:604, k:'minor', need:['h12'],
    g:'', n:'매첨결', h:'梅尖訣', c:1,
    eff:{ crit:9 },
    d:'가장 여린 곳을 찌른다 — <span class="eff">치명 확률 +9%</span>' },
  { id:'h16', x:180, y:604, k:'minor', need:['h14'],
    g:'', n:'매혼결', h:'梅魂訣', c:1,
    eff:{ artPower:8 },
    d:'초식에 매화의 혼을 싣는다 — <span class="eff">초식 위력 +8%</span>' },
  { id:'h17', x:290, y:604, k:'minor', need:['h13'],
    g:'', n:'답설보', h:'踏雪步', c:1,
    eff:{ spd:7 },
    d:'눈을 밟듯 소리 없이 다가선다 — <span class="eff">이동 +7%</span>' },

  // ── 9단: 비전(키스톤) + 문파 교차 ────────────────────
  { id:'h18', x:110, y:674, k:'keystone', need:['h15','h16'],
    g:'滿', n:'매화만개', h:'梅花滿開', c:4,
    eff:{ keystone:'hwasan_manggae', crit:30, hp:-12 },
    d:'만개한 매화처럼 찰나에 전부를 건다 — <span class="eff">치명 확률 +30%</span>, 대신 몸이 트인다(<span class="eff">체력 -12%</span>)' },
  { id:'h19', x:260, y:674, k:'cross', need:['h16','h17'],
    g:'合', n:'매죽합일', h:'梅竹合一', c:2,
    eff:{ cross:'bamboo', crossNode:'b_castspd', castSpd:10, artPower:8 },
    d:'화산의 표홀함이 청죽의 흐름과 맞닿는다 — <span class="eff">시전 속도 +10%</span>, <span class="eff">초식 위력 +8%</span> (청죽문 계보 노드와 연결, 실제 id는 청죽 트리 확정 후 맞춘다)' },

  // ── 10단: 마지막 갈래 ─────────────────────────────────
  { id:'h20', x:100, y:744, k:'minor', need:['h18'],
    g:'', n:'질화수', h:'疾花手', c:1,
    eff:{ aspd:9 },
    d:'손끝에서 꽃잎이 흩날린다 — <span class="eff">공격 속도 +9%</span>' },
  { id:'h21', x:260, y:744, k:'minor', need:['h19'],
    g:'', n:'낙매섬', h:'落梅閃', c:1,
    eff:{ crit:9 },
    d:'떨어지는 꽃잎처럼 스쳐 벤다 — <span class="eff">치명 확률 +9%</span>' },

  // ── 11단: 두 번째 비전 ────────────────────────────────
  { id:'h22', x:180, y:814, k:'keystone', need:['h20','h21'],
    g:'影', n:'낙화무영', h:'落花無影', c:4,
    eff:{ keystone:'hwasan_muyoung', spd:30, cdr:15, hp:-15 },
    d:'꽃잎이 떨어져도 그림자가 없다 — <span class="eff">이동 +30%</span>, <span class="eff">초식 재사용 -15%</span>, 대신 몸이 트인다(<span class="eff">체력 -15%</span>)' },
];

/* 신규무공 제안: 화산은 기존 ARTS에 무공이 없어 트리에 얹을 마디용으로
   신규 2개를 제안한다. 작명은 조사-무공작명.md 문법(수식부+접미사, 3~4자,
   소림 72절기·김용 고유명 금지) 준수 — "매화검법"을 그대로 쓰지 않고
   화산 모티프(매화·표홀)를 접미사 권/장/지/심법/결에 얹어 신조했다.

   1) 표매권 飄梅拳 (액티브 초식, h14)
      { k:'pyomae', n:'표매권', h:'飄梅拳', type:'active', school:'hwasan',
        need:17, cost:17000, d:'매화 흩날리듯 표홀하게 세 번 스쳐 친다',
        cd:7, mul:4.2, range:70, hits:3 }
      - need/cost는 기존 ARTS 곡선(need16 honwon 12000 ~ need19 hwalin 25000)
        사이 보간. 트리로 얻으므로 need는 표시·정렬용 참고치, 실제 습득
        조건은 h12·h13 마디 습득(설계-스킬트리.md: "경지 조건 대신 트리로").
      - hits:3 은 기존 ARTS 스키마에 없는 신규 필드다(연격을 mul 한 방이
        아니라 3연타로 보이게 하려는 제안) — 채택 시 30-combat의 초식 판정에
        다단 히트를 추가해야 한다. 엔진 확장 없이 우선 넣고 싶다면 hits를
        버리고 mul 하나로(기존 pagong처럼) 단일 판정으로 단순화해도 된다.
      - 연출(그림 병목 회피): 근접형이라 탄(shot) 이미지가 필요 없다.
        시전 스트립은 새로 뽑지 않고 파공권(pagong) cast 스트립을 재사용
        하되 HFX.glow 색만 화산 홍(#e89aad)으로 틴트한다. 절차 이펙트
        (FXD.sparks·rays)는 기존 fxBlast() 그대로 3연타 타이밍에 맞춰
        호출 횟수만 늘리면 된다 — 새 스프라이트 없음.

   2) 매향심결 梅香心訣 (패시브 심법, h8)
      { k:'maehyang', n:'매향심결', h:'梅香心訣', type:'passive', school:'hwasan',
        need:8, cost:1000, d:'매화 향기가 스미듯 몸에 밴다',
        aspd:0.15, crit:0.08 }
      - need/cost는 whirl(need9,1200) 바로 아래로 보간.
      - 엔진 주의: 현재 artMul()은 dmg/hp/regen/spd에만 쓰이고(00-data.js
        heroDmg·heroHpMax·heroRegen 등) heroAtkSpd·critCh는 statBonus만
        본다(artMul 곱 없음). 이 심법을 실제로 넣으려면
        heroAtkSpd = ()=> (1+statBonus('aspd')/100) * artMul('aspd')
        critCh    = ()=> statBonus('crit')/100 + artMul 상당분
        처럼 30-combat/00-data.js에 aspd·crit용 artMul 경로를 추가해야
        효과가 실전투에 반영된다(지금은 dmg류만 연결돼 있음).
      - 연출: 심법이라 절차 이펙트 없음(기존 경지 기운과 동일하게 무표현) —
        새 그림 불필요.

   두 무공 모두 fxtest.js에 새 시전/판정 케이스를 추가해야 한다는 프로젝트
   규칙(CLAUDE.md 0항)을 그대로 따른다 — 이 트리는 데이터 설계 단계라
   실제 채택·구현은 사람 확인 후 진행. */
