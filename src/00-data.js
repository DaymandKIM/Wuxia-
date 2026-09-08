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
};
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
  { k:'bamboo',  n:'죽림',   mul:1.0, ground:'#6a7a52', boss:'대나무 마왕' },
  { k:'village', n:'폐촌',   mul:1.9, ground:'#6b6350', boss:'폐촌 망령' },
  { k:'cave',    n:'동굴',   mul:3.4, ground:'#5c5f5c', boss:'동굴 주인' },
  { k:'snow',    n:'설산',   mul:5.6, ground:'#b9c9d2', boss:'설산 노인' },
  { k:'heaven',  n:'천산',   mul:9.0, ground:'#7f9a86', boss:'천산 검객' },
];
const zone = ()=> ZONES[S.zi];

// 단계 설계 — 구역당 10단계
const STAGES = [];
for (let i = 1; i <= 10; i++) {
  STAGES.push({
    n: i,
    need: 10 + i * 4,            // 처치 목표 14 → 50
    hp:   16 + i * 9,            // 적 체력 (구역 배율 곱함)
    dmg:  2.8 + i * 0.7,         // 적 피해
    spd:  38 + i * 2,            // 적 속도
    max:  Math.min(3 + i, 7),    // 동시 등장 수
  });
}
const BOSS_STAGE = STAGES.length + 1;      // 11단계 = 보스
const isBoss = ()=> S.stage === BOSS_STAGE;

// 보스 — 잡몹보다 훨씬 단단하고 아프다
const BOSS = {
  hp:   62,      // 마지막 단계 적 체력의 배수
  dmg:  2.4,     // 마지막 단계 적 피해의 배수
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

// 구역 배율을 반영한 실제 수치
const foeHp  = ()=> Math.round(stage().hp  * zone().mul);
const foeDmg = ()=> stage().dmg * (1 + (zone().mul-1)*0.55);
const bossHp = ()=> Math.round(STAGES[STAGES.length-1].hp * zone().mul * BOSS.hp);
const bossDmg= ()=> STAGES[STAGES.length-1].dmg * (1 + (zone().mul-1)*0.55) * BOSS.dmg;

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
  expBase: 20,                   // k번째 승급 필요 수련치 = expBase × expGrow^k
  expGrow: 1.18,
  killExp: 1,                    // 잡몹 처치 수련치 = 구역배율 × killExp
  bossExp: 25,                   // 보스 처치 수련치 = 구역배율 × bossExp
  // 이 구역·단계쯤이면 대략 이 경지 레벨 (sim 실측 근사) — 테스트 이동·도구용
  seed: [0, 10, 15, 18, 22, 30],
};
const realmNeed = k => Math.round(REALM.expBase * Math.pow(REALM.expGrow, k));
// 수련치 → { k: 경지 레벨, name: 이름, cur/need: 현 구간 진행 }
function realmInfo(){
  let e = S.rexp, k = 0;
  while (e >= realmNeed(k)){ e -= realmNeed(k); k++; }
  const top = REALM.names.length * REALM.per;
  const name = k < top
    ? REALM.names[Math.floor(k / REALM.per)] + ' ' + (k % REALM.per + 1) + '성'
    : REALM.last + ' ' + (k - top + 1) + '성';
  return { k, name, cur: e, need: realmNeed(k) };
}
const realmLv = ()=> realmInfo().k;
// 구역·단계에 걸맞은 누적 수련치 — 테스트 단계 이동과 검증 도구가 쓴다
function seedExp(zi, st){
  const a = REALM.seed[zi], b = REALM.seed[zi + 1] || (a + 8);
  const k = Math.round(a + (b - a) * Math.min(st || 1, 11) / 11);
  let t = 0;
  for (let i = 0; i < k; i++) t += realmNeed(i);
  return t;
}

// 성장 — 경지가 오를 때마다 주인공이 강해진다 (단계가 아니라 경지 기준)
const GROW = {
  dmg:  5,                       // 경지 승급당 정권 피해
  hp:   70,                      // 경지 승급당 최대 체력
  regen:1.3,                     // 경지 승급당 회복
};
const lv        = ()=> S.zi*10 + S.stage;      // 누적 단계 (구역 진행도)

// 수련 — 은자 소비처. 쉬운 말로 쓴다 (무협 맛은 설명 문구로만).
// 상한은 경지가 연다: 스텟당 최대 성장 = 경지 × capPer.
// %짜리(이동·치명타)는 점근식이라 아무리 올려도 max를 못 넘는다.
// ※ 비용·효과 수치는 임시. 심법 들어올 때 sim으로 다시 잡는다.
const TRAIN = {
  costBase: 12,                  // 0→1 비용
  costGrow: 1.16,                // 레벨당 비용 배율
  capPer:   10,                  // 경지당 열리는 상한 (경지×10)
  critMul:  1.5,                 // 치명타 배수
  list: [
    // inc: 레벨당 고정 증가 · asym:[최대치, 절반점]: 점근 % 증가
    { k:'atk',   n:'공격',      d:'주먹이 매워진다', inc:2,
      f:v=>'+'+Math.round(v) },
    { k:'hp',    n:'체력',      d:'몸이 단단해진다', inc:25,
      f:v=>'+'+Math.round(v) },
    { k:'regen', n:'회복',      d:'숨이 깊어진다',   inc:0.5,
      f:v=>'+'+v.toFixed(1)+'/초' },
    { k:'spd',   n:'이동 속도', d:'발이 빨라진다',   asym:[60,40],
      f:v=>'+'+v.toFixed(1)+'%' },
    { k:'crit',  n:'치명타',    d:'급소가 보인다',   asym:[50,60],
      f:v=>v.toFixed(1)+'%' },
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
const trainCost = n => Math.round(TRAIN.costBase * Math.pow(TRAIN.costGrow, n));
const trainCap  = ()=> (realmLv() + 1) * TRAIN.capPer;          // 경지가 상한을 연다

const heroDmg   = ()=> HERO.atkDmg + realmLv() * GROW.dmg + statBonus('atk');
const heroHpMax = ()=> HERO.hp     + realmLv() * GROW.hp  + statBonus('hp');
const heroRegen = ()=> HERO.regen  + realmLv() * GROW.regen + statBonus('regen');
const heroSpd   = ()=> HERO.spd * (1 + statBonus('spd')/100);
const critCh    = ()=> statBonus('crit') / 100;

// 은자 — 첫 재화. 처치 드랍 + 보스 첫 격파 + 오프라인 정산.
// ※ 수치는 임시. 쓸 곳(심법)이 들어오면 sim으로 다시 잡는다.
const SILVER = {
  base:     2,                   // 한 마리당 기본
  perStage: 1,                   // 단계당 가산
  bossKill: 10,                  // 보스는 잡몹 드랍의 몇 배인가
  first:    80,                  // 보스 첫 격파 보너스 (구역 배율 곱함)
};
const killSilver = ()=> Math.round((SILVER.base + SILVER.perStage*Math.min(S.stage,10)) * zone().mul);

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
  boss: 60,                      // 보스 한 번 잡는 평균(초, bosstest.js 실측 40~51초)
};
