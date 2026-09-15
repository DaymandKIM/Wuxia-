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
  hold:7,                        // 붙은 뒤 이 거리 안에선 제자리 (idle↔run 깜빡임 방지, v2.48)
  regen:0.8,                     // 초당 회복
};

// 동작: [프레임수, 초당프레임]
const ANIM = {
  idle:  [1, 4],                 // v2.43 — 정면 전투 자세 단일 컷 (사용자 시트 14번)
  run:   [10, 15],               // v2.44 — 10프레임 역동 질주 사이클 (사용자 재작업 시트)
  atk:   [4, 8],                 // 4프레임 0.5초 — 정권 찌르기
  hit:   [2, 7],
  medit: [4, 3.2],               // 운기조식 (쓰러진 뒤)
  cast:  [4, 8],                 // 초식 시전 (파공권 — 금빛 기운)
};
// 눈에 보이는 성장 — 경지가 오르면 기운이 돌고 정권에 권기가 붙는다 (v2.3)
const HFX = {
  castFps: 10,                   // 시전 재생 속도 — 16은 컷이 씹혀 보였다 (4성 0.6~0.9초)
  shotT: 0.28,                   // 권기 탄 비행 시간 (구 streak과 동일)
  fadeT: 0.22,                   // 탄 소멸 연출
  aw: { aidle: 50, katk: 70, punch: 43, kickside: 54, kickhigh: 60, flykick: 44, firekick: 44, cresckick: 46, burstkick: 46, run: 46 },   // 특수 동작 프레임 폭
  // 기본공격 = 양주먹(punch, 권기 정권) + 각도별 발차기(kickside·kickhigh) 4프레임 (v2.49, 사용자 시트)
  // kickside 54·kickhigh 62 — 발이 옆·위로 뻗어 폭이 넓다(좌우 대칭 캔버스)
  // run 44 — 질주가 넓어(보폭·옷자락) 35 칸에선 좌우가 잘려 폭을 준다 (v2.45)
  // 권기 정권 = 두 스트립 교대 (v2.23, 사용자 확정 — hero_fx의 두 정권 줄이
  // 오른손·왼손이다): 공격마다 오른손 katka / 왼손 katkb 스트립을 번갈아 튼다.
  // v2.18의 주먹 빛무리는 폐기 — 스트립에 권기가 구워져 있다.
  // 초식별 시전 스트립 [에셋 키, 프레임 폭, 프레임 수] — 시트 칸을 최대한 쓴다
  // ("4장이면 이펙트가 빈약하다"는 피드백으로 6~9프레임 확장)
  cast: { pagong:['cast',50,7], whirl:['castw',94,9], baekbo:['castb',68,6],
          bungsan:['castm',90,6], hwalin:['casth',36,8], geongon:['castg',60,5] },
  // 시전 컷 수는 숙련 성에 비례 — 1성은 뼈대만, 성이 오르면 중간 컷이
  // 늘어 동작이 유려해진다 (사용자 확정: "성급이 오르면 신컷을 더 써서")
  castStar: [0.55, 0.7, 0.85, 1.0],
  // 무공별 절차 발광 — 스프라이트의 작은 점(암향지 손끝 등)이 안 보인다는
  // 피드백. 무공 색에 맞춘 빛무리를 시전 손끝과 탄에 얹는다.
  // c 'r,g,b' · r 반경 · dx 손끝 가로(dir 곱) · dy 바닥에서 높이
  glow: {
    pagong:  { c:'255,200,90',  r:7,  dx:15, dy:27 },
    whirl:   { c:'214,190,140', r:12, dx:0,  dy:10 },
    baekbo:  { c:'196,110,255', r:7,  dx:16, dy:28 },
    bungsan: { c:'255,80,60',   r:10, dx:11, dy:25 },
    hwalin:  { c:'130,230,160', r:11, dx:0,  dy:24 },
    geongon: { c:'255,215,120', r:10, dx:0,  dy:26 },
  },
  taijiW: 76, taijiH: 80, taijiN: 7, taijiT: 0.6,    // 건곤이형 태극 원반 연출
  shotW: 46, shotH: 30,          // 파공권 권기 탄
  bshotW: 140, bshotH: 49,       // 암향지 지풍 — 두 칸을 관통하던 빔을 이어 붙인 통짜 1프레임
  katkRealm: 12,                 // 절정부터 정권에 권기가 붙는다 (권기의 경지)
  auras: [[36,'p'],[28,'b'],[20,'g'],[12,'w']],  // [경지 문턱, 기운 색] 내림차순
};

// 경공(輕功) — 일정 경지부터 먼 적(원거리 몹·후방)에게 훌쩍 날아가 근접한다
// (v2.41, 사용자 아이디어). 걷는 대신 순식간에 좁혀 원거리 견제를 무력화한다.
const DASH = {
  realm: 12,     // 절정부터 경공을 쓴다 ("일정 레벨")
  cd:    5.0,    // 경공 쿨다운(초)
  min:   170,    // 가장 가까운 적이 이보다 멀면 경공으로 날아간다
  spd:   680,    // 비행 속도(px/s) — 순식간에 좁힌다
  hold:  0.16,   // 착지 경직(초) — 착지 컷을 보여준 뒤 바로 공격
  // 날기·착지 컷은 시트가 확대(줌인)로 그려져 머리가 커 보였다("경공 쓸 때
  // 머리 커짐" 제보) — 대기/질주 컷과 머리·몸 크기가 맞도록 줄여 그린다(v2.53).
  fw:31, fh:32,  // 날기 컷 규격 (원본 43×45에서 축소)
  lw:30, lh:44,  // 착지 컷 규격 (원본 37×54에서 축소)
  lift:  15,     // 비행 중 공중에 뜨는 높이 (작아진 컷에 맞춰 낮춤)
};

// 연출 강화 (v2.31) — "이펙트가 조잡하다" 피드백. 전부 가산 합성(lighter)로
// 겹쳐 빛이 쌓이는 방식. 그라디언트 없이 동심원·픽셀 파편이라 jsdom 무해.
const FXD = {
  max: 320,                                  // S.fx 상한 — 넘으면 오래된 것부터 밀어낸다
  wave:  { life:0.45, w:3 },                 // 충격파 고리 — 빠르게 퍼지다 잦아든다
  rays:  { n:12, life:0.30, len:22 },        // 방사 속도선 — 큰 순간의 "번쩍"
  spark: { n:9, spd:150, g:300, life:0.5 },  // 타격 파편 — 포물선으로 튄다
  flash: { life:0.30 },                      // 화면 섬광 — 은은한 가산 원광
  // 평타 임팩트 — 손끝 권기와 같은 옅은 청백 (v2.36, 예전 주먹 끝 흰 점 색)
  hit:   { r:10, life:0.22, c:'206,230,255' },
  crit:  { r:26, life:0.36, c:'255,214,90' },    // 치명타 — 금빛 파열
  boss:  { r:130, c:'255,120,80' },              // 보스 등장·스킬 색
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
// 기본공격 무브셋 — 경지 성급이 오를수록 동작이 는다 (v2.46, 사용자 설계).
//   처음엔 양주먹만, 발차기는 need 성급부터 해금. 앞으로 성급대로 더 얹는다.
//   기본공격은 지금 열린 동작들을 순서대로 돌려 쓴다(cycle).
const ATKMOVES = [
  { key:'punch',    need:0 },   // 양주먹 = 권기 정권(katka/katkb, 양손 파란빛) — 사용자 고정 (v2.48)
  { key:'kickside', need:5 },   // 옆차기 — 이류(성급 5)부터. 수평으로 내지르는 찌르기 발차기 (v2.49)
  { key:'kickhigh', need:15 },  // 높은차기 — 초절정(성급 15)부터. 머리 높이로 차올린다 (v2.49)
  // 성급별 발차기 각도가 는다(사용자 시트 c0f865d3 — "발차기도 각도별로 있어").
  // 화염 발차기류(flykick·firekick)는 뺐다(v2.48). 초승달·도약(cresckick·burstkick)은
  // 추후 초식(스킬)으로 쓸 후보 — 에셋·loadImg는 남겨 둔다.
];
function atkPool(){ const p=ATKMOVES.filter(m=>realmLv()>=m.need); return p.length?p:[ATKMOVES[0]]; }
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
  { k:'village', n:'폐촌',   ground:'#6b6350', boss:'폐촌의 원혼' },   // 등장 문구·FOES.ghost와 통일
  { k:'cave',    n:'동굴',   ground:'#474d54', boss:'석암거인' },   // v2.35 어둑·푸른끼 (몹 대비)
  { k:'snow',    n:'설산',   ground:'#a4b3c0', boss:'설산백호' },   // v2.35 톤다운 (흰 백호 대비)
  { k:'heaven',  n:'천산',   ground:'#7f9a86', boss:'뇌운신장' },
];
const zone = ()=> ZONES[S.zi];

// 구역별 분위기 연출 — 무상태 입자(해시+시간으로 좌표를 만들어 저장이 필요 없다).
// 단계가 올라도 화면이 똑같다는 지적의 해법 중 "구역별 화면 변화" 축.
const AMB = {
  bamboo:  { kind:'leaf',  n:10, c:'150,180,96',  spd:26 },   // 흩날리는 댓잎
  village: { kind:'leaf',  n:18, c:'186,158,108', spd:34 },   // 잿빛 낙엽·재
  cave:    { kind:'fire',  n:14, c:'230,196,112', spd:7,      // 반딧불 + 어둑함
             dark:0.32 },                                     // v2.35 비네트 강화 — 가운데로 시선
  snow:    { kind:'snow',  n:38, c:'248,251,255', spd:56,     // 내리는 눈
             haze:'150,172,196', hazeA:0.10 },                // v2.35 옅은 한기 비네트
  heaven:  { kind:'cloud', n:4,  c:'22,30,26',    spd:11 },   // 흐르는 구름 그림자
};

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
  range:999,     // 보스는 모든 범위 (사용자 확정) — 어디서든 공격이 닿는다
  scale:1.55,    // 전용 스프라이트가 없을 때만 확대
  guard:0,       // 보스 단계엔 잡몹이 없다
  alignY: 26,    // 옆모습 대치 — 주인공과 높이 차가 이보다 크면 슬며시 맞춘다
  alignSpd: 0.6, // 높이 맞출 때 걸음 속도 배수 (돌진처럼 안 보이게 느리게)
  edge: 0.35,    // 주인공이 멈추는 몸 반경 = 몸 폭(sw)×이 값 — 0.5는 주먹이
                 // 몸에 안 닿아 허공질로 보였다 (v2.29.1). 0.35면 주먹 끝이 몸 가장자리에 닿는다
};

// 등장 위치 — 스프라이트가 옆모습이라 전투의 주 방향은 좌우다 (v2.29)
// flat: 잡몹 등장원의 세로 성분 압축. 1이면 원형, 0이면 완전 수평.
// 완전 수평은 세로 화면 위아래가 비어 보여서 편향만 한다 (사용자 걱정 반영)
const SPAWN = { rMin: 190, rMax: 300, flat: 0.45 };

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
  side:  92,      // 주인공 옆 등장 거리 — 전투 대치 거리에 가깝게 (v2.40:
                  // 150이면 등장 뒤 주인공이 한참 다가가 카메라가 크게 튀었다.
                  // 92면 등장 구도 그대로 바로 싸운다 "거리 두고 바로 시작")
  gate:  46,      // 문이 등장점보다 얼마나 위에 뜨는지
  fade:  0.7,     // 보스가 나온 뒤 문이 어둠 속으로 스러지는 시간 (v2.40)
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
  snow:    '설산백호가 포효한다',
  heaven:  '뇌운이 하늘을 덮는다',
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
    // atk 3프레임을 공격 시간(FOE.dur 0.55초)에 맞춘다 — 7fps(0.43초)면 마지막
    // 프레임이 0.12초 얼어붙었다(v2.55.3). 3/5.4≈0.556초로 꽉 채운다.
    fps:{ idle:3, walk:6, atk:5.4, hit:6, death:5 },
    hp:1.0, dmg:1.0, spd:1.0, range:44,   // 기준
  },
  wisp: {
    n:'대나무 유령불', w:32, h:37,
    anim:{ idle:['idle','float'], walk:['float','idle'],
           atk:['atk'], hit:['hit'], death:['death'] },
    fps:{ idle:2.5, walk:4, atk:5, hit:6, death:4 },
    hp:0.62, dmg:0.78, spd:1.22, range:38,   // 약해서 바짝 붙어야 한다
  },
  panther: {
    n:'그림자 표범', w:82, h:46,
    anim:{ idle:['walk0','walk1','walk2','walk3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],   // 웅크림 → 도약 → 할큄 → 착지
           hit:['walk2'], death:['walk0'] },
    fps:{ idle:5, walk:8, atk:8, hit:5, death:4 },
    hp:0.78, dmg:1.15, spd:1.45, range:60,   // 도약이 길다
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
    // skill 6프레임을 시전 시간(skillDur 1.0초) 안에 맞춘다 — 5.5fps(1.09초)면
    // 마지막 컷(m3 갈무리)이 안 나왔다(v2.55.3). 6/6.2≈0.97초로 끝까지 보인다.
    fps:{ idle:3, walk:6, atk:6.4, skill:6.2, hit:5, death:4 },
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
  soldier: {
    // 대나무 정령병 (엘리트) — 살아 있는 대나무 마디로 빚은 병사. 쌍죽검.
    // 죽으면 마디가 흩어져 대나무 무더기가 된다.
    n:'대나무 정령병', w:122, h:54, sw:38, bh:48,
    anim:{ idle:['idle0','idle1','idle2','idle3','idle4','idle5'],
           walk:['walk0','walk1','walk2','walk3','walk4','walk5','walk6','walk7'],
           atk:['atk0','atk1','atk2','atk3','atk4','atk5'],   // 치켜들기 → 베기 → 십자 섬광 → 쌍검 → 낮은 베기 → 갈무리
           hit:['hit','hit2'], death:['death0','death1','death2'] },  // 파편 → 무더기 → 반짝
    fps:{ idle:4, walk:8, atk:11, hit:6, death:4 },
    hp:1.6, dmg:1.2, spd:0.95, range:50,   // 엘리트 — 죽림의 벽
  },
  beetle: {
    // 등딱지벌레 — 갈색 뿔 딱정벌레. 단단하고 느리게 들이받는다.
    n:'등딱지벌레', w:76, h:56, sw:58, bh:34,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 웅크림 → 돌진 → 뿔 박치기 → 갈무리
           hit:['hit'], death:['death0','death1','death2'] },
    fps:{ idle:3.5, walk:7, atk:8, hit:6, death:4 },
    hp:1.25, dmg:0.95, spd:0.8, range:46,   // 갑각 탱커
  },
  wasp: {
    // 대나무 말벌 — 늘 떠 있다(띄움 10px). 빠르게 붙어 침을 박는다.
    n:'대나무 말벌', w:84, h:54, sw:44, bh:30,
    anim:{ idle:['idle0','idle1','idle2','idle3','idle4','idle5'],
           walk:['walk0','walk1','walk2','walk3','walk4','walk5'],
           atk:['atk0','atk1','atk3','atk4'],     // 곧추서기 → 날개 털기 → 침 박기 → 반동
           hit:['hit'], death:['death0','death1','death2'] },   // 추락 → 떨어짐 → 반짝
    fps:{ idle:8, walk:9, atk:9, hit:6, death:4 },
    hp:0.5, dmg:0.9, spd:1.6, range:42,   // 물몸 — 빠르게 쏘고 빠진다
  },
  jbeetle: {
    // 옥갑충(玉甲蟲) — 천산의 옥·금 갑주 딱정벌레. 등에 武 자가 새겨져 있고
    // 뿔에 기를 모아 소용돌이 박치기를 한다. 죽음 2컷(자주 불꽃 컷은
    // 그림 자체가 마젠타라 못 살려 제외 — death1 에셋만 보관).
    n:'옥갑충', w:64, h:48, sw:50, bh:36,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 기 모으기 → 소용돌이 → 폭발 박치기 → 갈무리
           hit:['hit'], death:['death0','death2'] },   // 어지럼 → 연기 오르는 시체
    fps:{ idle:6, walk:7, atk:8, hit:6, death:3.5 },
    hp:1.5, dmg:1.15, spd:0.85, range:48,   // 천산 갑각 정예급 일반
  },
  thug: {
    // 대나무 무뢰배 — 몽둥이 든 험상궂은 무뢰배. 내리찍는다.
    n:'대나무 무뢰배', w:80, h:56, sw:44, bh:48,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 치켜들기 → 내리찍기 → 쓸기 → 갈무리
           hit:['hit'], death:['death0','death1','death2'] },  // 무릎 → 엎어짐 → 반짝
    fps:{ idle:4, walk:8, atk:8, hit:6, death:4 },
    hp:1.1, dmg:1.1, spd:0.95, range:48,   // 강도보다 조금 단단하고 아프다
  },
  stalker: {
    // 죽림 추적자 (엘리트) — 붉은 눈의 넝마 추적자, 장창. 창이 길어 캔버스가 넓다.
    // 거리가 뜨면 회전 잎날을 던진다 (낭인 투척 틀 — 빙글 도는 탄).
    // 시트의 장막 컷 2장(cloak)·내려찍기(slam)는 미사용 (은신 연출 후보).
    n:'죽림 추적자', w:72, h:58, sw:34, bh:48,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3','walk4','walk5'],
           atk:['atk0','atk1','atk2','atk3'],     // 낮은 찌르기 → 대각 → 찌르기 → 갈무리
           cast:['cast0','cast1'],                // 빈손 모으기 → 잎날 던지기
           hit:['hit'], death:['death0','death1'] },
    fps:{ idle:4, walk:8, atk:8, cast:3.2, hit:6, death:4 },
    hp:1.4, dmg:1.15, spd:1.15, range:60,   // 엘리트 — 빠르고 창이 길다
    throwCd:7.5, throwDur:0.62, throwAt:0.55, throwMin:90, throwMax:230,
    shotImg:'stalker_shot', shotSpd:220,    // 잎날은 빙글 돌며 난다 (fly 아님)
  },
  snake: {
    // 대나무 방울뱀 (레어) — 옥빛 방울뱀. 또아리에서 튀어나와 문다.
    n:'대나무 방울뱀', w:86, h:45, sw:56, bh:40,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 또아리 → 튀어나와 물기 → 뻗침 → 되감기
           hit:['hit'], death:['death0','death1','death2'] },
    fps:{ idle:4, walk:7, atk:8, hit:6, death:4 },
    hp:1.3, dmg:1.35, spd:1.1, range:54,   // 레어 — 독니가 아프다
  },
  dog: {
    // 폐촌 들개 — 갈비뼈 드러난 사나운 개. 빠르게 덮쳐 문다.
    // atk2에 먼지·섬광이 구워져 있어 캔버스가 넓다 — 몸은 sw/bh.
    n:'폐촌 들개', w:78, h:42, sw:58, bh:34,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 웅크림 → 도약 → 물기 → 반동
           hit:['hit'], death:['death','death2'] },
    fps:{ idle:3.5, walk:8, atk:9, hit:6, death:5 },
    hp:0.68, dmg:0.9, spd:1.5, range:52,   // 달려들어 문다
  },
  ronin: {
    // 폐촌 낭인 — 삿갓에 녹슨 칼. 근접 베기가 기본, 이따금 술병을 던진다.
    n:'폐촌 낭인', w:52, h:55, bh:48,   // 치켜든 칼끝까지 캔버스에 담는다 — 몸높이는 48
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3','walk4','walk5','walk6','walk7'],
           atk:['atk0','atk1','atk2'],           // 치켜들기 → 휘두르기 → 내려베기
           cast:['cast0','cast1'],               // 병 던지기 (근접형의 원거리 견제)
           hit:['hit'], death:['death','death2'] },
    fps:{ idle:3, walk:8, atk:7, cast:3.2, hit:6, death:5 },
    hp:1.05, dmg:1.05, spd:0.95, range:64,   // 장검 — 멀찍이서 벤다
    // 던지기 — 근접형이지만 거리가 뜨면 병을 집어 던진다
    throwCd:6.5, throwDur:0.62, throwAt:0.55, throwMin:80, throwMax:200,
    shotImg:'ronin_shot', shotDust:'ronin_dust', shotSpd:200,
  },
  bug: {
    // 동굴 독충 — 검자줏빛 갑각 지네·딱정벌레 잡종. 단단하고 느리게 문다.
    n:'동굴 독충', w:88, h:45, sw:69, bh:36,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 몸 세움 → 내리찍기 → 독액 → 갈무리
           hit:['hit'], death:['death0','death1','death2'] },   // 뒤틀림 → 무너짐 → 부서진 갑각
    fps:{ idle:3.5, walk:7, atk:7, hit:6, death:5 },
    hp:1.25, dmg:1.0, spd:0.75, range:46,   // 갑각이 단단해 질기고 느리다
  },
  ghost: {
    // 폐촌의 원혼 — 백발을 늘어뜨리고 기어 다니는 귀신. 촌주의 한이 뭉쳤다.
    // 발톱 궤적이 앞으로 길게 뻗어 캔버스가 넓다 — 몸은 sw/bh.
    n:'폐촌의 원혼', w:190, h:96, sw:130, bh:88,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           // 일반 공격 — 기를 모으고(cast) 발톱을 크게, 낮게 휘두른다
           atk:['cast','atk0','atk1'],
           // 스킬 — 도깨비불을 모아 해골 귀화(鬼火)를 날린다 (ghost_shot)
           skill:['cast','cast','cast','atk0','atk1'],
           hit:['hit'],
           death:['hit2','death','death2'] },   // 웅크림 → 무너짐 → 스러짐
    fps:{ idle:4, walk:6, atk:4.2, skill:3.7, hit:5, death:4 },   // atk 3컷 = 보스 공격 0.72초
    hp:1.0, dmg:1.0, spd:1.0,
    shotImg:'ghost_shot', shotSpd:230,   // 보스 스킬이 탄이 된다 (40-step)
  },
  bat: {
    // 석굴 박쥐 — 노란 눈의 큰 동굴 박쥐, 늘 떠 있다. 급습 물기가 기본이고
    // 거리가 뜨면 입을 벌려 음파 고리를 쏜다 (낭인 투척 틀 + fly 탄).
    // 캔버스에 비행 띄움 10px — 그림자에서 몸이 뜬다.
    n:'석굴 박쥐', w:132, h:66, sw:90, bh:36,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 접근 → 입 벌려 물기 → 활공 → 복귀
           cast:['cast0','cast1','cast2'],        // 날개 펴기 → 절규 (고리 발사) → 갈무리
           hit:['hit'], death:['death0','death1'] },
    fps:{ idle:7, walk:8, atk:8, cast:4.8, hit:6, death:4 },
    hp:0.55, dmg:0.85, spd:1.5, range:44,   // 물몸 — 빠르게 붙어 문다
    throwCd:7, throwDur:0.62, throwAt:0.55, throwMin:80, throwMax:210,
    shotImg:'bat_shot', shotFly:true, shotSpd:200,
  },
  wolf: {
    // 설산 설랑 — 서리 맺힌 흰 늑대. 빠르게 달려들어 문다. 입김이 얼어 있다.
    // 공격 컷의 빙기 이펙트가 앞뒤로 뻗어 캔버스가 넓다 — 몸은 sw/bh.
    n:'설산 설랑', w:92, h:47, sw:63, bh:38,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 웅크림(빙주) → 도약 설참 → 낮은 돌진 → 갈무리
           hit:['hit'], death:['death0','death1'] },
    fps:{ idle:3.5, walk:8, atk:8, hit:6, death:4 },
    hp:0.9, dmg:1.15, spd:1.45, range:56,   // 도약이 길다 — 들개와 표범 사이
  },
  eagle: {
    // 천산수리 — 금갈색 산독수리. 늘 떠 있고, 날개를 접어 발톱으로 덮친다.
    // 캔버스에 비행 띄움(12px)이 구워져 있다 — 그림자에서 몸이 뜬다.
    n:'천산수리', w:106, h:67, sw:94, bh:46,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 제동 → 날개 접고 급강하 → 발톱 → 복귀
           hit:['hit'], death:['death0','death1'] },   // 추락 → 떨어짐
    fps:{ idle:6, walk:7, atk:8, hit:6, death:4 },
    hp:0.8, dmg:1.2, spd:1.6, range:58,   // 급강하 — 빠르고 아프다
  },
  guard: {
    // 천산 수호무사 — 백금 도포의 정예 검객. 찌르기 검격이 길고,
    // 거리가 뜨면 납도 → 검기를 모아 초승달 검기를 날린다 (낭인 투척 틀 + fly 탄).
    // 찌르기 검이 길어 캔버스가 넓다 — 몸은 sw/bh.
    n:'천산 수호무사', w:194, h:55, sw:30, bh:48,
    anim:{ idle:['idle0','idle1','idle2','idle3','idle4','idle5','idle6','idle7'],
           walk:['walk0','walk1','walk2','walk3','walk4','walk5','walk6','walk7'],
           atk:['atk0','atk1','atk2','atk3'],     // 치켜들기 → 회전 베기 → 장거리 찌르기 → 갈무리
           cast:['cast0','cast1','cast2'],        // 납도 → 검기 모으기 → 발도 (초승달 발사)
           dash:['dash'],                         // 돌격 — 검 뻗은 채 미끄러져 들어온다
           hit:['hit'], death:['death0','death1'] },
    fps:{ idle:4, walk:8, atk:8, cast:4.8, dash:6, hit:6, death:4 },
    hp:1.7, dmg:1.3, spd:0.95, range:66,   // 정예 — 단단하고 아프고 검이 길다
    // 돌격 — 중거리(70~170)에서 찌르기 자세로 미끄러져 들어와 꿰뚫는다 (사용자 제안)
    dashCd:5.5, dashDur:0.55, dashSpd:330, dashMin:70, dashMax:170, dashMul:1.4,
    // 투척(초승달 검기)은 돌격보다 먼 거리 담당
    throwCd:8, throwDur:0.62, throwAt:0.6, throwMin:180, throwMax:270,
    shotImg:'guard_shot', shotFly:true, shotSpd:240,
  },
  spirit: {
    // 설산 빙백령 — 반투명 얼음으로 빚은 여인. 떠다니며 얼음 조각을 쏜다.
    // 시트의 소매 설참 컷(2행 뒷칸·3행 앞칸)은 미사용 — 원거리형이라 안 쓴다.
    n:'설산 빙백령', w:58, h:63, sw:22, bh:46,
    anim:{ idle:['idle0','idle1','idle2','idle3','idle4','idle5','idle6','idle7'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['cast0','cast1','cast2','cast3','cast4'],   // 모으기 → 응축 → 내뻗기 → 갈무리
           hit:['hit'], death:['death0','death1','death2'] },  // 금 감 → 흩어짐 → 얼음 무더기
    fps:{ idle:5, walk:6, atk:6.4, hit:5, death:5 },
    hp:0.58, dmg:0.9, spd:0.9,
    ranged:true, range:104, shotSpd:210, atkAt:0.6,
    shotImg:'spirit_shot', shotFly:true,   // 얼음 조각 — 돌지 않고 나는 방향을 본다
  },
  tiger: {
    // 설산 보스 설산백호 — 서리 갑주가 돋은 백호. 발톱 설참이 기본이고,
    // 뒷발로 일어서 포효한 뒤 눈보라 숨결(냉기 원뿔 탄)을 뿜는다.
    // 설참·숨결이 넓어 캔버스가 크다 — 몸은 sw/bh.
    // 시트의 웅크림 컷(atk2)·일어서기 3컷째(sk2)는 규격이 안 맞아 미사용.
    n:'설산백호', w:226, h:94, sw:159, bh:80,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk3'],                    // 치켜들기 → 설참 → 갈무리
           skill:['sk0','sk0','sk1','breath','breath'],   // 일어서 포효 → 눈보라 숨결(탄)
           hit:['hit'], death:['death0','death1'] },
    fps:{ idle:4, walk:6, atk:4.2, skill:3.7, hit:5, death:3.5 },
    hp:1.0, dmg:1.0, spd:1.0,
    shotImg:'tiger_shot', shotSpd:250,   // 보스 스킬이 탄이 된다 (원혼과 같은 틀)
  },
  thunder: {
    // 천산 최종 보스 뇌운신장 — 먹구름 몸에 금 갑주를 두른 뇌신 장수 (v2.32).
    // 기본 공격은 번개 주먹 스매시 3연쇄(시트가 왼쪽을 봐서 4컷 반전),
    // 스킬은 두 팔을 들어 갈래 번개 탄을 던진다(원혼·백호와 같은 탄 보스 틀).
    // 시전·죽음 컷(시트 하단 행)은 그림 배율이 달라 별도 배율(92/139)로 맞췄다.
    n:'뇌운신장', w:196, h:98, sw:114, bh:92,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],              // 번개 주먹 당김 → 스매시 → 당김 → 갈무리
           skill:['sk0','sk0','sk1','sk1','sk2'],          // 두 팔 들기 → 번개 투척(탄) → 갈무리
           hit:['hit'], death:['hit','death0','death1'] }, // 부서짐 → 무너짐 → 잔해
    fps:{ idle:4, walk:6, atk:4.5, skill:3.7, hit:5, death:3.2 },
    hp:1.0, dmg:1.0, spd:1.0,
    shotImg:'thunder_shot', shotSpd:280,
  },
  golem: {
    // 동굴 보스 석암거인 — 동굴 벽에서 깨어난 바위 거인. 가슴에 호박색 핵.
    // 내리찍기(atk1)의 흙먼지가 넓어 캔버스가 크다 — 몸은 sw/bh.
    n:'석암거인', w:180, h:96, sw:99, bh:92,
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],             // 치켜들기 → 내리찍기 → 먼지 → 갈무리
           skill:['atk0','atk0','atk1','atk1','atk2'],    // 범위 폭발(BOSSKILL) — 내리찍기 재활용
           hit:['hit'], death:['death0','death1','death2'] },  // 금 감 → 엎어짐 → 스러짐
    fps:{ idle:5, walk:5, atk:5.6, skill:3.7, hit:4, death:3.5 },
    hp:1.0, dmg:1.0, spd:1.0,
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
  bamboo:  ['bandit','thug','wisp','wasp','panther','panther','shaman','frog','frog',
            'beetle','soldier','stalker','snake'],   // 죽림 확장 — v2.25~27 (13칸)
  village: ['ronin','ronin','dog','dog','bandit','wisp'],
  cave:    ['bug','bug','bat','bat','bandit','wisp'],
  snow:    ['wolf','wolf','spirit','spirit','bandit','wisp'],
  heaven:  ['eagle','eagle','guard','guard','jbeetle','wisp'],   // 옥갑충이 강도 재탕을 대체 (v2.27)
};
const foeM = f => FOES[f.k];
// 구역별 보스 종류 (없으면 그 구역 대표 잡몹)
const ZONEBOSS = {
  bamboo:  'demon',
  village: 'ghost',
  cave:    'golem',
  snow:    'tiger',
  heaven:  'thunder',
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
// 초식 시전 규칙 — 동시 시전 금지 (사용자 확정).
// 시전 중엔 다음 초식이 기다리고, 동작이 끝나도 gap 만큼 숨을 고른 뒤에 나간다.
// 쿨다운은 기다리는 동안에도 돈다 — 잃는 건 시전 타이밍뿐이다.
const CASTQ = { gap: 0.35 };

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
  // ── 문파 무공도 심법 (v2.47, 트리 마디로 습득) ──────
  { k:'hangma',    n:'항마진경',   h:'降魔眞經',   type:'passive', school:'sorim',   need:21, cost:42000,
    d:'마를 항복시키는 경으로 몸이 금강처럼 굳는다', hp:0.18, dmg:0.12 },
  { k:'maehyang',  n:'매향심결',   h:'梅香心訣',   type:'passive', school:'hwasan',  need:8,  cost:1000,
    d:'매화 향기가 스미듯 몸에 밴다', aspd:0.15, crit:0.08 },
  { k:'baekryeon', n:'백련심공',   h:'白蓮心功',   type:'passive', school:'ami',     need:20, cost:30000,
    d:'진흙 속에서도 물들지 않는 흰 연꽃 — 자비로운 기운이 몸을 감싼다', regen:0.25, hp:0.10 },
  { k:'chwigwon',  n:'취권결',     h:'醉拳訣',     type:'passive', school:'gaebang', need:14, cost:4000,
    d:'취한 듯 흐트러진 몸놀림이 오히려 빈틈을 없앤다', dmg:0.12, spd:0.08 },
  { k:'mandok',    n:'만독불침공', h:'萬毒不侵功', type:'passive', school:'dangmun', need:15, cost:8000,
    d:'온갖 독에 물들어 오히려 독이 힘이 된다', dmg:0.12, hp:0.12 },
  { k:'talhon',    n:'탈혼공',     h:'奪魂功',     type:'passive', school:'magyo',   need:24, cost:90000,
    d:'상대의 기운을 빼앗아 자신의 것으로 돌린다 — 흡성 심법', dmg:0.15, regen:0.15 },
  // ── 기연 전용 (예약) ──────────────────────────────
  // 기연 무공 — 표에는 보이지만 기연으로만 얻는다. cost는 연마·돌파용
  { k:'guyang',  n:'구양신결',   h:'九陽神訣',   type:'passive', school:'lost', fate:true,
    cost:200000, d:'아홉 개의 태양이 몸에 뜬다 — 기연으로만 얻는다',
    dmg:0.2, hp:0.2, regen:0.3 },
  { k:'geongon', n:'건곤이형',   h:'乾坤移形',   type:'active',  school:'lost', fate:true,
    cost:200000, d:'상대의 힘을 그대로 되돌린다 — 기연으로만 얻는다',
    cd:14, ref:3, guard:0.5 },     // 반격형 — 맞는 순간 발동 (자동 시전 없음)
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
// ── 스킬 심화 특성 (v2.55) ─────────────────────────
// 배운 무공에 경지 무공점으로 켠다 (심화창). 초식은 동작을, 심법은 효과를 바꾼다.
// eff 종류: cdcut(쿨 -비율) · power(피해/회복 +비율) · reach(사거리 +비율) · amp(심법 효과 +비율)
const TRAITS = {
  // 초식 — 스스로 펼치는 무공. 쿨·위력·사거리를 손본다.
  pagong:  [ {id:'pa_cd', n:'쾌권',   h:'快拳', c:2, eff:{cdcut:0.18}, d:'권을 빨리 거둔다 — 쿨 −18%'},
             {id:'pa_pw', n:'중권',   h:'重拳', c:3, eff:{power:0.30}, d:'주먹에 무게를 싣는다 — 위력 +30%'},
             {id:'pa_rg', n:'원격권', h:'遠擊', c:3, eff:{reach:0.35}, d:'권기가 더 멀리 뻗는다 — 사거리 +35%'} ],
  whirl:   [ {id:'wh_cd', n:'질풍',   h:'疾風', c:2, eff:{cdcut:0.18}, d:'회전을 서두른다 — 쿨 −18%'},
             {id:'wh_rg', n:'대선풍', h:'大旋風',c:3, eff:{reach:0.40}, d:'휩쓰는 범위가 넓어진다 — 사거리 +40%'},
             {id:'wh_pw', n:'맹공',   h:'猛攻', c:3, eff:{power:0.30}, d:'발끝에 힘을 더한다 — 위력 +30%'} ],
  baekbo:  [ {id:'bb_cd', n:'속지',   h:'速指', c:2, eff:{cdcut:0.18}, d:'지풍을 빨리 모은다 — 쿨 −18%'},
             {id:'bb_pw', n:'투지',   h:'透指', c:4, eff:{power:0.40}, d:'뼛속까지 스민다 — 위력 +40%'} ],
  hwalin:  [ {id:'hw_cd', n:'속기',   h:'速氣', c:2, eff:{cdcut:0.20}, d:'숨을 빨리 고른다 — 쿨 −20%'},
             {id:'hw_pw', n:'대활인', h:'大活人',c:3, eff:{power:0.35}, d:'더 깊이 불어넣는다 — 회복 +35%'} ],
  bungsan: [ {id:'bs_cd', n:'속붕',   h:'速崩', c:2, eff:{cdcut:0.20}, d:'산을 빨리 무너뜨린다 — 쿨 −20%'},
             {id:'bs_rg', n:'광붕',   h:'廣崩', c:3, eff:{reach:0.35}, d:'무너지는 범위가 넓어진다 — 사거리 +35%'},
             {id:'bs_pw', n:'괴력',   h:'怪力', c:4, eff:{power:0.40}, d:'천근의 힘 — 위력 +40%'} ],
  // 심법 — 몸에 스미는 무공. 자기 효과를 증폭한다(심화 深化).
  samjae:    [ {id:'sj_amp', n:'심화', h:'深化', c:2, eff:{amp:0.4}, d:'삼재의 이치를 더 깊이 — 효과 +40%'} ],
  chulwoo:   [ {id:'cw_amp', n:'심화', h:'深化', c:2, eff:{amp:0.4}, d:'대나무의 결을 더 깊이 — 효과 +40%'} ],
  yuwoon:    [ {id:'yw_amp', n:'심화', h:'深化', c:3, eff:{amp:0.4}, d:'밤길에 더 스민다 — 효과 +40%'} ],
  honwon:    [ {id:'hw2_amp',n:'심화', h:'深化', c:3, eff:{amp:0.4}, d:'하나로 더 돈다 — 효과 +40%'} ],
  taeheo:    [ {id:'th_amp', n:'심화', h:'深化', c:4, eff:{amp:0.4}, d:'비어 더 가득 — 효과 +40%'} ],
  hangma:    [ {id:'hm_amp', n:'심화', h:'深化', c:3, eff:{amp:0.4}, d:'금강이 더 굳는다 — 효과 +40%'} ],
  maehyang:  [ {id:'mh_amp', n:'심화', h:'深化', c:2, eff:{amp:0.4}, d:'매향이 더 밴다 — 효과 +40%'} ],
  baekryeon: [ {id:'br_amp', n:'심화', h:'深化', c:3, eff:{amp:0.4}, d:'흰 연꽃이 더 핀다 — 효과 +40%'} ],
  chwigwon:  [ {id:'cg_amp', n:'심화', h:'深化', c:3, eff:{amp:0.4}, d:'취기가 더 흐른다 — 효과 +40%'} ],
  mandok:    [ {id:'md_amp', n:'심화', h:'深化', c:3, eff:{amp:0.4}, d:'독이 더 힘이 된다 — 효과 +40%'} ],
  talhon:    [ {id:'th2_amp',n:'심화', h:'深化', c:4, eff:{amp:0.4}, d:'더 많이 앗는다 — 효과 +40%'} ],
  guyang:    [ {id:'gy_amp', n:'심화', h:'深化', c:4, eff:{amp:0.4}, d:'아홉 태양이 더 뜨겁다 — 효과 +40%'} ],
};
const TRAIT_CAP = { cdcut: 0.6 };              // 쿨 감소 상한 (여럿 쌓아도 이 이상 안 준다)
const traitDefs = k => TRAITS[k] || [];
const hasTrait  = (k,id) => !!(S.traits && S.traits[k] && S.traits[k][id]);
function traitSum(k, kind){
  let s = 0;
  for (const t of traitDefs(k)) if (hasTrait(k,t.id) && t.eff[kind]) s += t.eff[kind];
  return s;
}
const traitMul   = (k,kind) => 1 + traitSum(k,kind);          // power·reach·amp 배수
const traitCdcut = k => Math.min(TRAIT_CAP.cdcut, traitSum(k,'cdcut'));  // 쿨 감소 비율(상한)
const traitCount = () => { let c=0; for (const k in (S.traits||{})) for (const id in S.traits[k]) c++; return c; };

// 익힌 심법들의 증폭 배수 (1 + 합) — 숙련 성이 오르면 효과도 커진다
// 트리 패시브 합 — 66-tree.js. 스킬트리 없이 실행되는 검증 도구(sim 등) 대비 가드.
const tBonus = k => (typeof treeBonus === 'function') ? treeBonus(k) : 0;
function artMul(kind){
  let m = 1;
  for (const a of ARTS.list)
    if (S.arts[a.k] && a.type === 'passive' && a[kind]) m += a[kind] * artEff(a.k) * traitMul(a.k, 'amp');
  // 심법 효과 증폭(passiveAmp) — 트리가 심법 합의 초과분을 키운다
  if (kind === 'dmg' || kind === 'hp' || kind === 'regen' || kind === 'spd')
    m = 1 + (m - 1) * (1 + tBonus('passiveAmp')/100);
  return m;
}

const heroDmg   = ()=> HERO.atkDmg * Math.pow(GROW.dmg, realmLv())
                        * (1 + (statBonus('atk')+tBonus('atk'))/100) * artMul('dmg');
const heroHpMax = ()=> Math.round(HERO.hp * Math.pow(GROW.hp, realmLv())
                        * (1 + (statBonus('hp')+tBonus('hp'))/100) * artMul('hp'));
const heroRegen = ()=> HERO.regen * Math.pow(GROW.regen, realmLv())
                        * (1 + (statBonus('regen')+tBonus('regen'))/100) * artMul('regen');
const heroSpd   = ()=> HERO.spd * (1 + (statBonus('spd')+tBonus('spd'))/100) * artMul('spd');
const heroAtkSpd= ()=> 1 + (statBonus('aspd')+tBonus('aspd')) / 100 + (artMul('aspd')-1);   // 공격 동작·간격 (심법 매향심결 등)
const critCh    = ()=> (statBonus('crit')+tBonus('crit')) / 100 + (artMul('crit')-1);
const critMul   = ()=> TRAIN.critMul + (statBonus('cdmg')+tBonus('cdmg')) / 100;

// 은자 — 첫 재화. 처치 드랍 + 보스 첫 격파 + 오프라인 정산.
// ※ 수치는 임시. 쓸 곳(심법)이 들어오면 sim으로 다시 잡는다.
const SILVER = {
  base:     3,                   // 1단계 한 마리
  grow:     1.22,                // 단계당 배율 — 깊이 갈수록 벌이가 는다
  bossKill: 10,                  // 보스는 잡몹 드랍의 몇 배인가
  firstMul: 50,                  // 보스 첫 격파 보너스 = 처치 드랍 × 이 값
};
const killSilver = ()=> Math.round(SILVER.base * Math.pow(SILVER.grow, gstage()-1)
                                   * (1 + (statBonus('gold')+tBonus('gold'))/100));

// 기연 — 공짜 랜덤이 아니라 누적의 정산 (조사 결론·장무기 공식).
// 인연(緣)이 쌓이면 단계 제패 순간 기연이 나타난다. 고난(쓰러짐)이 크게 쌓인다.
const FATE = {
  autoSec:   5,                  // 기연 카드가 스스로 받아들여지기까지 (팝업 피로 방지)
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
  autoSec: 6,                    // 복귀 카드가 스스로 닫히기까지 (팝업 누르기 귀찮다는 피드백)
  rate: 0.8,                     // 온라인 대비 효율
  cap:  8*3600,                  // 상한 8시간
  min:  60,                      // 이보다 짧게 비웠으면 무시
  aoe:  2.3,                     // 정권 한 방이 평균 몇 마리를 때리나 (sim 보정값)
  walk: 0.5,                     // 처치당 이동·대기 평균(초)
  expLv8h: 3,                    // 오프라인 수련치 = 8시간에 승급 이만큼 분량 (시간 비례)
  karmaCap: 1.5,                 // 오프라인 인연 상한 = 현재 필요량 × 이 값
};
