"use strict";
/* ── 설계 상수 ──────────────────────────────────────────
   ※ 난이도 수치는 임시다. 성장 축(무공·장비 등)이 들어오면 다시 잡는다.
     지금 값은 "진행이 막히지 않는다"만 확인한 것이다.
   죽림 10단계. 무기 없음. 맨손 정권 찌르기만.
   숫자는 전부 여기 모아둔다. 흩어지면 다시 못 찾는다.
*/

// 주인공
const HERO = {
  w:35, h:51,                    // 모든 동작 공통 캔버스
  spd:96,                        // 이동 속도 (px/s)
  hp:100,
  atkRange:44,                   // 정권 사거리 (몸이 닿는 거리)
  atkReach:10,                   // 이만큼 더 가까우면 공격 시작
  atkFlat:1.55,                  // 세로 판정을 넓히는 정도 (탑다운 보정)
  atkDmg:10,
  atkCd:0.46,                    // 공격 간격
  regen:0.8,                     // 초당 회복
};

// 동작: [프레임수, 초당프레임]
const ANIM = {
  idle:  [3, 4],
  run:   [4, 10],
  atk:   [4, 8],                 // 4프레임 0.5초 — 정권 찌르기
  hit:   [2, 7],
  medit: [4, 3.2],               // 운기조식 (쓰러진 뒤)
  cast:  [4, 8],                 // 초식 시전 (파공권 — 금빛 기운)
};
// 눈에 보이는 성장 — 경지가 오르면 기운이 돌고 정권에 권기가 붙는다 (v2.3)
const HFX = {
  castFps: 16,                   // 시전 재생 속도 — 무공은 재빨라야 한다 (사용자)
  shotT: 0.28,                   // 권기 탄 비행 시간 (구 streak과 동일)
  fadeT: 0.22,                   // 탄 소멸 연출
  aw: { katk: 66, aidle: 50 },   // 특수 동작 프레임 폭 (기본 HERO.w)
  katkN: 8,                      // 권기 정권 — 오른손 4 + 왼손 4 (양손 교대)
  // 초식별 시전 스트립 [에셋 키, 프레임 폭, 프레임 수] — 시트 칸을 최대한 쓴다
  // ("4장이면 이펙트가 빈약하다"는 피드백으로 6~9프레임 확장)
  cast: { pagong:['cast',50,7], whirl:['castw',94,9], baekbo:['castb',68,6],
          bungsan:['castm',90,6], hwalin:['casth',36,8] },
  // 시전 컷 수는 숙련 성에 비례 — 1성은 뼈대만, 성이 오르면 중간 컷이
  // 늘어 동작이 유려해진다 (사용자 확정: "성급이 오르면 신컷을 더 써서")
  castStar: [0.55, 0.7, 0.85, 1.0],
  shotW: 46, shotH: 30,          // 파공권 권기 탄
  bshotW: 140, bshotH: 49,       // 암향지 지풍 — 두 칸을 관통하던 빔을 이어 붙인 통짜 1프레임
  katkRealm: 12,                 // 절정부터 정권에 권기가 붙는다 (권기의 경지)
  auras: [[36,'p'],[28,'b'],[20,'g'],[12,'w']],  // [경지 문턱, 기운 색] 내림차순
};
function auraKey(){
  const k = realmLv();
  for (const a of HFX.auras) if (k >= a[0]) return 'aidle_' + a[1];
  return null;
}
// 이번 성에서 쓰는 시전 컷 수 — 최소 3, 4성이면 전부
function castN(k){
  const c = HFX.cast[k];
  const s = Math.min(Math.max(artStar(k), 1), HFX.castStar.length);
  return Math.max(3, Math.round(c[2] * HFX.castStar[s - 1]));
}
// 뽑아 쓸 원본 프레임 번호 — 처음과 끝은 지키고 중간을 고르게 덜어낸다
function castFrame(k, i){
  const c = HFX.cast[k], n = castN(k);
  return n >= c[2] ? i : Math.round(i * (c[2] - 1) / (n - 1));
}
const HITFRAME = 2;              // 공격 몇 번째 프레임에서 판정하나
// 공격 프레임별 주먹 끝 위치 (프레임 중앙·바닥 기준 오프셋)
// 원본 그림에 손 끝이 잘려 있어, 이 자리에 작은 원을 얹어 마무리한다.
const FIST = [
  { x:  9, y: -22 },
  { x: 13, y: -28 },
  { x: 14, y: -30 },
  { x: 13, y: -30 },
];

// 구역 — 각 10단계 + 보스 1단계. mul이 클수록 어렵고 보상도 크다.
const ZONES = [
  { k:'bamboo',  n:'죽림',   ground:'#6a7a52', boss:'대나무 마왕' },
  { k:'village', n:'폐촌',   ground:'#6b6350', boss:'폐촌 망령' },
  { k:'cave',    n:'동굴',   ground:'#5c5f5c', boss:'동굴 주인' },
  { k:'snow',    n:'설산',   ground:'#b9c9d2', boss:'설산 노인' },
  { k:'heaven',  n:'천산',   ground:'#7f9a86', boss:'천산 검객' },
];
const zone = ()=> ZONES[S.zi];

// 난이도 — 전역 단계 g(1~50)가 축이다. 구역은 배경·계보·서사의 단위.
// 원 확정 복원: 단계당 1.30배 + 처치 목표 24+단계×7. 선형 몹은 벽이 안
// 생겨 60분에 콘텐츠가 끝났다(소모 속도 우려) — 지수여야 전선이 생기고,
// 전선에서 벌어서(수련·무공·숙련·기연) 뚫는 게 게임이 된다.
const DIFF = {
  hpBase: 22,  hpGrow: 1.30,     // 적 체력 = hpBase × hpGrow^(g-1)
  dmgBase: 3.0, dmgGrow: 1.19,   // 적 피해 — 밀어붙일 때만 위험하게 (sim 쓰러짐 기준)
  needBase: 24, needPer: 7,      // 처치 목표 = base + g×per (31 → 374)
};
const gstage    = ()=> S.zi * 10 + Math.min(S.stage, 10);
const stageNeed = ()=> DIFF.needBase + gstage() * DIFF.needPer;

// 단계별 연출 수치 (구역 안 1~10)
const STAGES = [];
for (let i = 1; i <= 10; i++) {
  STAGES.push({
    n: i,
    spd:  38 + i * 2,            // 적 속도
    max:  Math.min(3 + i, 7),    // 동시 등장 수
  });
}
const BOSS_STAGE = STAGES.length + 1;      // 11단계 = 보스
const isBoss = ()=> S.stage === BOSS_STAGE;

// 보스 — 잡몹보다 훨씬 단단하고 아프다
const BOSS = {
  hp:   30,      // 마지막 단계 적 체력의 배수 (지수 난이도라 62는 너무 길다)
  dmg:  2.0,     // 마지막 단계 적 피해의 배수
  spd:  0.82,    // 느리다
  scale:1.55,    // 전용 스프라이트가 없을 때만 확대
  guard:0,       // 보스 단계엔 잡몹이 없다
};

// 단계 제패 — 기운을 터뜨려 주변을 쓸어낸다
// 단계 제패 — 은은한 구름이 한 꺼풀 훅 퍼진다
// 단계 제패 — 곡면 꺼풀이 이어져 훅 퍼진다
const SWEEP = {
  charge: 0.55,   // 기운을 모으는 시간
  blast:  1.05,   // 꺼풀이 퍼지는 시간
  hold:   0.40,   // 흩어지는 여운
  range:  380,    // 최대 반경
  pts:    46,     // 곡면 둘레 점 수
  bands:  4,      // 겹치는 꺼풀
  wave:   0.085,  // 물결 폭
  spiral: 20,     // 모을 때 감기는 알갱이
  kb:     460,    // 적이 밀려나는 속도
};

// 보스 등장 — 문에 기운이 모였다가 마왕이 걸어 나온다
const SUMMON = {
  dur:   3.6,     // 전체 길이(초)
  swirl: 2.1,     // 기운이 모이는 시간
  burst: 0.5,     // 모인 뒤 터지는 시간
  n:     40,      // 회오리 알갱이 수
  r:     104,     // 처음 반경
  turns: 2.6,     // 감아 도는 바퀴 수
  rise:  0.95,    // 보스가 문에서 걸어 나오는 시간
};

// 보스 상시 오라 — 다리부터 타오른다
// 보스 상시 오라 — 준 이미지를 연하게 겹쳐 감싼다
const AURA = {
  layers: 3,     // 겹치는 층
  wide:  1.9,    // 몸 대비 가로
  tall:  0.95,   // 몸 대비 세로
  drop:  0.06,   // 발밑보다 얼마나 내릴지
  alpha: 0.30,   // 기본 투명도 (연하게)
  sway:  1.2,    // 넘실거리는 속도
};

// 구역별 보스 등장 문구
const BOSSCRY = {
  bamboo:  '죽림의 주인이 깨어난다',
  village: '폐촌의 원혼이 일어선다',
  cave:    '동굴의 주인이 모습을 드러낸다',
  snow:    '설산의 노인이 강림한다',
  heaven:  '천산의 검객이 하강한다',
};

// 보스 스킬 — 체력이 줄면 강한 기술을 쓴다
const BOSSKILL = {
  cd:    5.5,    // 스킬 간격(초)
  range: 132,    // 범위
  dmg:   2.6,    // 일반 공격 대비 배수
  dur:   1.35,   // 시전 시간 (포효4 + 폭발5 = 9프레임)
  hitAt: 0.62,   // 폭발 프레임에서 터진다
};

// 실제 수치 — 전부 전역 단계 g에서 나온다
const foeHp  = ()=> Math.round(DIFF.hpBase * Math.pow(DIFF.hpGrow, gstage()-1));
const foeDmg = ()=> DIFF.dmgBase * Math.pow(DIFF.dmgGrow, gstage()-1);
const bossHp = ()=> Math.round(DIFF.hpBase * Math.pow(DIFF.hpGrow, S.zi*10+9) * BOSS.hp);
const bossDmg= ()=> DIFF.dmgBase * Math.pow(DIFF.dmgGrow, S.zi*10+9) * BOSS.dmg;

// 단계 진입 연출 — 배경 3장이 차례로 흐른다
// 단계 진입 연출 — 3장이 위에서 아래로 차례로 슬라이드해 들어온다
const INTRO = {
  dur:   2.2,                    // 전체 길이
  gap:   0.055,                  // 장 사이 간격 (화면 높이 비율)
  stagger: 0.13,                 // 장마다 늦게 출발하는 간격 (초)
  slide: 0.38,                   // 한 장이 미끄러져 들어오는 시간 (초)
  hold:  0.85,                   // 셋 다 들어온 뒤 머무는 시간 (초)
};

// 테스트 모드 — 켜두면 모든 구역이 열린다
const TEST = true;

// 적 종류 — 구역마다 등장 목록이 다르다
const FOES = {
  bandit: {
    n:'대나무 강도', w:56, h:51,
    anim:{ idle:['idle'], walk:['walk','run'],
           atk:['atk0','atk1','atk2'], hit:['hit'], death:['death','death2'] },
    fps:{ idle:3, walk:6, atk:7, hit:6, death:5 },
    hp:1.0, dmg:1.0, spd:1.0,       // 기준
  },
  wisp: {
    n:'대나무 유령불', w:32, h:37,
    anim:{ idle:['idle','float'], walk:['float','idle'],
           atk:['atk'], hit:['hit'], death:['death'] },
    fps:{ idle:2.5, walk:4, atk:5, hit:6, death:4 },
    hp:0.62, dmg:0.78, spd:1.22,    // 약하지만 빠르다
  },
  panther: {
    n:'그림자 표범', w:82, h:46,
    anim:{ idle:['walk0','walk1','walk2','walk3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],   // 웅크림 → 도약 → 할큄 → 착지
           hit:['walk2'], death:['walk0'] },
    fps:{ idle:5, walk:8, atk:8, hit:5, death:4 },
    hp:0.78, dmg:1.15, spd:1.45,
  },
  shaman: {
    // 시전 프레임(m1)에 기운까지 한 장으로 들어 있어 캔버스가 넓다.
    // 몸은 56x54 — 그림자·기울임·체력바는 sw/bh 를 쓴다.
    n:'대나무 주술사', w:198, h:63, sw:56, bh:54,
    anim:{ idle:['idle'], walk:['walk','run'],
           // 기본 공격 — 손에 구체를 모아 쏜다 (m0 자세만 쓴다)
           atk:['idle','m0','m0','m0','idle'],
           // 스킬 — 모으다(m0) 터뜨리고(m1) 갈무리한다(m3).
           // m1 한 장에 기운까지 들어 있다. 시트에서 가운데 두 칸이
           // 원래 한 그림이라 그렇게 잘랐다.
           skill:['m0','m0','m0','m1','m1','m3'],
           hit:['cast'], death:['cast'] },
    fps:{ idle:3, walk:6, atk:6.4, skill:5.5, hit:5, death:4 },
    hp:0.55, dmg:0.85, spd:0.85,
    ranged:true, range:96, shotSpd:170, atkAt:0.55,
    skillCd:7.5, skillDur:1.0, skillAt:0.55, skillDmg:2.2, skillR:26,
  },
  frog: {
    // 혀로 때린다. 스프라이트 폭이 혀 길이까지 포함해 넓다.
    // 렌더러가 가로 중앙 기준으로 그리므로 캔버스는 좌우 대칭이어야 한다.
    // 그래서 w는 172지만 실제 몸은 38px다 — 그림자·기울임·체력바는 sw/bh를 쓴다.
    n:'대나무 개구리', w:164, h:43, sw:38, bh:32,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['idle0','hop','idle2','hop'],           // 앉음 ↔ 도약 = 뜀
           // 몸을 세우고(hop) 혀 30% → 100% → 55% → 원위치
           atk:['hop','atk1','atk2','atk3','idle0'],
           hit:['idle1'], death:['idle0'] },
    fps:{ idle:4.5, walk:7, atk:6.4, hit:6, death:4 },
    hp:0.70, dmg:1.10, spd:0.80,
    ranged:true, lash:true, range:72, atkAt:0.50,   // 혀는 80px까지 닿는다
  },
  demon: {
    n:'대나무 마왕', w:114, h:96,
    anim:{ idle:['idle0','idle1','idle2','idle3','idle4'],
           walk:['idle0','idle1','idle2','idle3','idle4'],
           // 일반 공격 — 낫을 들어올려 땅을 내리찍는다
           atk:['swing0','swing1','swing2','swing3','swing4'],
           // 스킬 — 포효로 기운을 모아 터뜨린다
           skill:['roar0','roar1','roar2','roar3','roar4','burst0','burst1','burst2','burst3','burst4'],

           hit:['idle2'],
           death:['death0','death1','death2','death3'] },
    fps:{ idle:5, walk:5, atk:7, skill:7.4, hit:4, death:5 },   // 포효5+폭발5 = 10프레임 / 1.35초
    hp:1.0, dmg:1.0, spd:1.0,
  },
};
// 구역별 등장 목록
const ZONEFOE = {
  bamboo:  ['bandit','bandit','wisp','wisp','panther','panther','shaman','frog','frog'],
  village: ['bandit','wisp'],
  cave:    ['bandit','wisp'],
  snow:    ['bandit','wisp'],
  heaven:  ['bandit','wisp'],
};
const foeM = f => FOES[f.k];
// 구역별 보스 종류 (없으면 그 구역 대표 잡몹)
const ZONEBOSS = {
  bamboo: 'demon',
};

const DOWN_TIME = 3.0;           // 쓰러진 뒤 운기조식 시간

// 운기조식 기운 방울 — 바닥에서 몸을 타고 올라간다
const QI = {
  n:      11,     // 동시에 떠 있는 수
  rise:   1.6,    // 한 방울이 올라가는 시간(초)
  spread: 15,     // 좌우로 퍼지는 폭
  top:    52,     // 올라가는 높이
  r:      1.9,    // 방울 반지름
};

// 경지 — 처치로 쌓이는 수련치(rexp)로 오른다 (사용자 확정). 무한 성장.
// 9경지 × 1~4성 = 36구간, 그 뒤는 신화경 1성, 2성, … 끝없이.
// 세부 단계는 숫자 성 — 초입·소성 같은 말은 순서가 안 읽힌다는 피드백.
// 승급 필요량은 기하 증가 — 끝판 반복 사냥도 계속 경지에 기여한다.
const REALM = {
  names: ['삼류','이류','일류','절정','초절정','화경','현경','생사경','자연경'],
  per:   4,                      // 경지당 성 수 (신화경만 무한)
  last:  '신화경',
  expBase: 25,                   // k번째 승급 필요 수련치 = expBase × expGrow^k
  expGrow: 1.30,                 // 승급 하나가 대도약(GROW 참고)
  killGrow: 1.07,                // 처치 수련치 = killGrow^(g-1) — 필요량보다 훨씬 완만해야 벽이 선다
  bossExp: 25,                   // 보스 = 잡몹의 몇 배
  // 이 구역쯤이면 대략 이 경지 레벨 (sim 실측 근사) — 테스트 이동·도구용
  seed: [0, 11, 17, 24, 29],
};
const killExpAt = ()=> Math.pow(REALM.killGrow, gstage()-1);
const realmNeed = k => Math.round(REALM.expBase * Math.pow(REALM.expGrow, k));
// 경지 레벨 k의 표기 ("절정 2성")
function realmName(k){
  const top = REALM.names.length * REALM.per;
  return k < top
    ? REALM.names[Math.floor(k / REALM.per)] + ' ' + (k % REALM.per + 1) + '성'
    : REALM.last + ' ' + (k - top + 1) + '성';
}
// 수련치 → { k: 경지 레벨, name: 이름, cur/need: 현 구간 진행 }
function realmInfo(){
  let e = S.rexp, k = 0;
  while (e >= realmNeed(k)){ e -= realmNeed(k); k++; }
  return { k, name: realmName(k), cur: e, need: realmNeed(k) };
}
const realmLv = ()=> realmInfo().k;
// 구역·단계에 걸맞은 누적 수련치 — 테스트 단계 이동과 검증 도구가 쓴다
function seedExp(zi, st){
  const a = REALM.seed[zi], b = (REALM.seed[zi + 1] !== undefined ? REALM.seed[zi + 1] : a + 8);
  const k = Math.round(a + (b - a) * Math.min(st || 1, 11) / 11);
  let t = 0;
  for (let i = 0; i < k; i++) t += realmNeed(i);
  return t;
}

// 성장 — 승급마다 곱해진다. 적이 단계당 1.30배니 주인공은 승급당 1.40배 —
// 승급 0.78회 ≈ 한 단계를 따라잡는 등가. 승급이 드문 만큼 하나가 대도약이다.
const GROW = {
  dmg:  1.31,                    // 승급당 정권 피해 배율 — 적(단계당 1.30)과 등가
  hp:   1.31,                    // 승급당 최대 체력 배율
  regen:1.31,                    // 승급당 회복 배율
};
const lv        = ()=> S.zi*10 + S.stage;      // 누적 단계 (구역 진행도)

// 수련 — 은자 소비처. 쉬운 말로 쓴다 (무협 맛은 설명 문구로만).
// 상한은 경지가 연다: 스텟당 최대 성장 = 경지 × capPer.
// %짜리(이동·치명타)는 점근식이라 아무리 올려도 max를 못 넘는다.
// ※ 비용·효과 수치는 임시. 심법 들어올 때 sim으로 다시 잡는다.
const TRAIN = {
  capPer:   10,                  // 경지당 열리는 상한 (경지×10)
  critMul:  1.5,                 // 치명타 기본 배수 (치명 피해 스텟이 더한다)
  amounts:  [1, 10, 100, 'MAX'], // 한 번에 구매 단위
  list: [
    // inc: 레벨당 +% · asym:[최대치, 절반점]: 점근 %
    // cb/cg: 스텟별 가격·상승 곡선 — 가치가 클수록 비싸고 가파르다 (사용자 확정)
    { k:'atk',   n:'공격',      d:'주먹이 매워진다',        inc:2,        cb:12, cg:1.16,
      f:v=>'+'+Math.round(v)+'%' },
    { k:'hp',    n:'체력',      d:'몸이 단단해진다',        inc:2,        cb:10, cg:1.15,
      f:v=>'+'+Math.round(v)+'%' },
    { k:'regen', n:'회복',      d:'숨이 깊어진다',          inc:2,        cb:8,  cg:1.14,
      f:v=>'+'+Math.round(v)+'%' },
    { k:'aspd',  n:'공격 속도', d:'손이 빨라진다',          asym:[50,60], cb:40, cg:1.22,
      f:v=>'+'+v.toFixed(1)+'%' },
    { k:'crit',  n:'치명타',    d:'급소가 보인다',          asym:[50,60], cb:25, cg:1.19,
      f:v=>v.toFixed(1)+'%' },
    { k:'cdmg',  n:'치명 피해', d:'급소를 더 깊이 찌른다',  asym:[100,80], cb:30, cg:1.20,
      f:v=>'+'+v.toFixed(0)+'%' },
    { k:'spd',   n:'이동 속도', d:'발이 빨라진다',          asym:[60,40], cb:15, cg:1.15,
      f:v=>'+'+v.toFixed(1)+'%' },
    { k:'gold',  n:'은자 획득', d:'허리춤이 두둑해진다',    asym:[100,70], cb:20, cg:1.18,
      f:v=>'+'+v.toFixed(0)+'%' },
  ],
};
const statLv    = k => S.stats[k] | 0;
const asym      = (n, max, half) => max * n / (n + half);
const statDef   = k => TRAIN.list.find(s => s.k === k);
// 스텟 k의 현재 보너스 (n을 주면 그 레벨 기준 — 다음 레벨 미리보기용)
const statBonus = (k, n) => {
  const s = statDef(k); if (n === undefined) n = statLv(k);
  return s.asym ? asym(n, s.asym[0], s.asym[1]) : n * s.inc;
};
// 스텟 k의 n레벨째 비용 — 곡선이 스텟마다 다르다
const trainCost = (k, n) => Math.round(statDef(k).cb * Math.pow(statDef(k).cg, n));
const trainCap  = ()=> (realmLv() + 1) * TRAIN.capPer;          // 경지가 상한을 연다

// 무공 — 경지에 닿으면 은자로 익힌다. 익히면 되돌리지 않는다.
// 심법(passive)은 % 증폭 — 수련(고정치)과 역할이 겹치지 않는다.
// 초식(active)은 자동 시전 (발동 모드 3종은 나중에). 새 그림 없이 절차 이펙트.
// fate:true 는 기연 전용 — 표에는 보이지만 아직 얻을 수 없다 (기연 판에서 연다).
// ※ 비용·배수는 임시. 무공 레벨업(상한 30~40)은 다음 층에서 얹는다.
// 강호의 문파 — 무공의 계보 (내 문파 경영과는 별개).
// 유명 문파(소림·무당·화산·아미·개방·당문·마교)는 그대로 쓴다 — 실존
// 지명·일반명사라 자유롭고(화산귀환도 그대로 씀) 인지도가 최고다.
// 청죽문은 우리 창작 문파 — 주인공이 죽림에서 시작하는 뿌리 계보.
// 앞으로도 우리 문파를 더 만든다 (기존 기반 + 우리만의 문파, 사용자 확정).
const SCHOOLS = {
  none:    { n:'독학',     c:'#8b97a5' },
  bamboo:  { n:'청죽문',   c:'#7fc78f' },   // 우리 문파
  sorim:   { n:'소림',     c:'#d8a84a' },
  mudang:  { n:'무당',     c:'#9fc4e8' },
  hwasan:  { n:'화산',     c:'#e89aad' },   // 아직 무공 없음 — 매화 계열 예정
  ami:     { n:'아미',     c:'#b9a6d8' },
  gaebang: { n:'개방',     c:'#b08a5c' },
  dangmun: { n:'당문',     c:'#c99ad0' },
  magyo:   { n:'마교',     c:'#d86a5c' },
  lost:    { n:'실전 비급', c:'#e8c96a' },
};
const ARTS = { list: [
  // ── 초식 (자동 시전) ──────────────────────────────
  { k:'pagong',  n:'파공권',   h:'破空拳',   type:'active', school:'sorim', need:4,  cost:200,
    d:'주먹 기운이 허공을 갈라 날아간다', cd:6,  mul:3,   range:170 },
  { k:'whirl',   n:'선풍퇴',   h:'旋風腿',   type:'active', school:'gaebang', need:9,  cost:1200,
    d:'휘돌아 차서 주위를 쓸어낸다',     cd:9,  mul:1.5, range:74, kb:true },
  { k:'baekbo',  n:'암향지',   h:'暗香指',   type:'active', school:'dangmun', need:13, cost:5000,
    d:'어둠 속 향기가 닿으면 이미 늦었다', cd:14, mul:5,   range:280 },
  { k:'hwalin',  n:'활인기공', h:'活人氣功', type:'active', school:'ami', need:19, cost:25000,
    d:'위태로우면 숨을 불어넣는다',       cd:18, heal:0.3, below:0.4 },
  { k:'bungsan', n:'붕산장',   h:'崩山掌',   type:'active', school:'magyo', need:22, cost:60000,
    d:'산을 무너뜨리듯 사방을 친다',      cd:30, mul:4,   range:300 },
  // ── 심법 (패시브 증폭) ────────────────────────────
  { k:'samjae',  n:'삼재심법',   h:'三才心法',   type:'passive', school:'none', need:2,  cost:60,
    d:'숨을 고르는 첫걸음',       regen:0.25 },
  { k:'chulwoo', n:'청죽공',     h:'靑竹功',     type:'passive', school:'bamboo', need:6,  cost:500,
    d:'대나무처럼 휘되 부러지지 않는다', hp:0.20 },
  { k:'yuwoon',  n:'야행심법',   h:'夜行心法',   type:'passive', school:'gaebang', need:11, cost:2500,
    d:'밤길을 걷듯 흐르고 스민다', spd:0.15, regen:0.15 },
  { k:'honwon',  n:'혼원일기공', h:'混元一氣功', type:'passive', school:'mudang', need:16, cost:12000,
    d:'흩어진 기운이 하나로 돈다', dmg:0.15 },
  { k:'taeheo',  n:'태허진경',   h:'太虛眞經',   type:'passive', school:'mudang', need:27, cost:150000,
    d:'비어 있어 오히려 가득하다', dmg:0.10, hp:0.10, regen:0.10 },
  // ── 기연 전용 (예약) ──────────────────────────────
  { k:'guyang',  n:'구양신결',   h:'九陽神訣',   type:'passive', school:'lost', fate:true,
    d:'아홉 개의 태양이 몸에 뜬다 — 기연으로만 얻는다' },
  { k:'geongon', n:'건곤이형',   h:'乾坤移形',   type:'active',  school:'lost', fate:true,
    d:'상대의 힘을 그대로 되돌린다 — 기연으로만 얻는다' },
]};
const artDef = k => ARTS.list.find(a => a.k === k);

// 무공 숙련도 — 쓸수록 오른다 (사용자 확정). 초식은 시전 횟수, 심법은
// 지닌 채 처치한 수. 게이지가 차면 은자를 들여 성을 돌파한다 — 돌파
// 재료·기연 조건은 재료 시스템이 들어오면 얹는다 (지금은 은자만).
const MASTERY = {
  maxStar: 4,                    // 무공 성 상한 (경지 표기와 통일)
  useBase: 40,                   // 1성→2성 필요 숙련도
  useGrow: 3,                    // 성마다 필요 숙련도 배율 (40→120→360)
  costMul: 3,                    // 돌파 은자 = 습득 비용 × costMul^(현재 성)
  effPer:  0.25,                 // 성당 효과 +25% (4성 = 1.75배)
  // 연마 — 은자로 올리는 무공 레벨 (v2.2). 상한은 성×lvCapPer라
  // 성 돌파(숙련 게이지)가 상한을 여는 벽이 된다. 발동 3모드는
  // 내공(마나) 재화가 들어와야 의미가 생겨 보류 (사용자 확정).
  lvPer:    0.015,               // 연마 레벨당 효과 +1.5% — 0.02는 심법 실효가
                                 // 커져 쓰러짐이 21→1로 사라졌다(기연의 고난
                                 // 씨앗이 마름). sim 판정으로 낮춤 (v2.2)
  lvCapPer: 10,                  // 연마 상한 = 성 × 10 (4성 = 40)
  lvMul:    0.25,                // 연마 비용 기초 = 습득 비용 × lvMul
  lvGrow:   1.2,                 // 연마 비용 배율 (레벨마다)
};
const artStar   = k => Math.max(1, S.artStar[k] | 0);
const artLv     = k => Math.max(1, S.artLv[k] | 0);
const artLvCap  = k => artStar(k) * MASTERY.lvCapPer;
const artLvCost = k => Math.round(artDef(k).cost * MASTERY.lvMul *
                                  Math.pow(MASTERY.lvGrow, artLv(k) - 1));
const artEff    = k => (1 + MASTERY.lvPer * (artLv(k) - 1))
                     * (1 + MASTERY.effPer * (artStar(k) - 1));
const artXpNeed = k => Math.round(MASTERY.useBase * Math.pow(MASTERY.useGrow, artStar(k) - 1));
const artBreakCost = k => Math.round(artDef(k).cost * Math.pow(MASTERY.costMul, artStar(k)));
// 익힌 심법들의 증폭 배수 (1 + 합) — 숙련 성이 오르면 효과도 커진다
function artMul(kind){
  let m = 1;
  for (const a of ARTS.list)
    if (S.arts[a.k] && a.type === 'passive' && a[kind]) m += a[kind] * artEff(a.k);
  return m;
}

const heroDmg   = ()=> HERO.atkDmg * Math.pow(GROW.dmg, realmLv())
                        * (1 + statBonus('atk')/100) * artMul('dmg');
const heroHpMax = ()=> Math.round(HERO.hp * Math.pow(GROW.hp, realmLv())
                        * (1 + statBonus('hp')/100) * artMul('hp'));
const heroRegen = ()=> HERO.regen * Math.pow(GROW.regen, realmLv())
                        * (1 + statBonus('regen')/100) * artMul('regen');
const heroSpd   = ()=> HERO.spd * (1 + statBonus('spd')/100) * artMul('spd');
const heroAtkSpd= ()=> 1 + statBonus('aspd') / 100;   // 공격 동작·간격을 함께 배속
const critCh    = ()=> statBonus('crit') / 100;
const critMul   = ()=> TRAIN.critMul + statBonus('cdmg') / 100;

// 은자 — 첫 재화. 처치 드랍 + 보스 첫 격파 + 오프라인 정산.
// ※ 수치는 임시. 쓸 곳(심법)이 들어오면 sim으로 다시 잡는다.
const SILVER = {
  base:     3,                   // 1단계 한 마리
  grow:     1.22,                // 단계당 배율 — 깊이 갈수록 벌이가 는다
  bossKill: 10,                  // 보스는 잡몹 드랍의 몇 배인가
  firstMul: 50,                  // 보스 첫 격파 보너스 = 처치 드랍 × 이 값
};
const killSilver = ()=> Math.round(SILVER.base * Math.pow(SILVER.grow, gstage()-1)
                                   * (1 + statBonus('gold')/100));

// 기연 — 공짜 랜덤이 아니라 누적의 정산 (조사 결론·장무기 공식).
// 인연(緣)이 쌓이면 단계 제패 순간 기연이 나타난다. 고난(쓰러짐)이 크게 쌓인다.
const FATE = {
  killGrow:  1.18,               // 처치당 인연 = killGrow^(g-1)
  bossKarma: 120,                // 보스 격파
  downKarma: 60,                 // 쓰러짐 — 고난이 기연의 씨앗
  needBase:  400,                // 첫 기연까지 필요한 인연
  needGrow:  1.4,                // 회차마다 필요량 배율
  fragNeed:  3,                  // 실전 비급 조각 수 (모으면 해금)
  fragFrom:  4,                  // 몇 번째 기연부터 조각이 섞이나
  fragW:     0.35,               // 조각이 뽑힐 가중치 (그 외엔 균등)
  scrollMul: 250,                // 낡은 비급 은자 = 현재 처치 드랍 × 이 값
  elixirExp: 0.6,                // 영약 수련치 = 다음 승급 필요량 × 이 값
  pool: [
    { k:'scroll', n:'낡은 비급',   d:'바위 틈에서 손때 묻은 책이 나왔다' },
    { k:'elixir', n:'천년 영약',   d:'달빛 아래 향긋한 열매가 익어 있었다' },
    { k:'master', n:'은거기인',    d:'지나가던 노인이 걸음을 멈추고 웃었다' },
    { k:'frag',   n:'실전 비급 조각', d:'찢어진 책장이 바람에 날아와 붙었다' },
  ],
};
const karmaNeed  = ()=> Math.round(FATE.needBase * Math.pow(FATE.needGrow, S.fates));
const killKarmaAt = ()=> Math.pow(FATE.killGrow, gstage()-1);

// 저장 — 껐다 켜도 이어진다. 방치형의 최소 조건.
const SAVE = {
  key: 'wuxia1',                 // localStorage 키
  ver: 1,                        // 구조가 바뀌면 올린다 (다르면 버리고 새로 시작)
  every: 10,                     // 자동 저장 간격(초)
};

// 오프라인 진행 — 자리 비운 동안도 수련한다 (설계: 온라인의 70~80%, 상한 8시간)
// 근사 모델: 처치당 시간 = 정권 횟수×간격÷동시타격 + 접근·대기.
// sim.js(실제 step 60분) 실측과 대조해 보정했다 — 모델이 실측의 약 87%라
// rate 0.8을 곱하면 온라인의 약 70%가 된다. 보정 근거는 VERSION.md 참고.
const OFFLINE = {
  rate: 0.8,                     // 온라인 대비 효율
  cap:  8*3600,                  // 상한 8시간
  min:  60,                      // 이보다 짧게 비웠으면 무시
  aoe:  2.3,                     // 정권 한 방이 평균 몇 마리를 때리나 (sim 보정값)
  walk: 0.5,                     // 처치당 이동·대기 평균(초)
  expLv8h: 3,                    // 오프라인 수련치 = 8시간에 승급 이만큼 분량 (시간 비례)
  karmaCap: 1.5,                 // 오프라인 인연 상한 = 현재 필요량 × 이 값
};
