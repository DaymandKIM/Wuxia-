"use strict";
/* ── 무협 가로판 — 설계 숫자 ─────────────────────────────
   숫자는 전부 여기. 밸런스 곡선(DIFF·GROW·REALM·SILVER·TRAIN)은 옛 판에서 **그대로** 옮겼다 —
   지형과 무관한 1차원 수식이라 가로판에서도 같은 뜻이다. 화면·배치 숫자만 새로 잡았다. */

// 화면 — 가로 540 단위의 장면 띠(캔버스)가 위쪽 절반, 아래 절반은 HTML 패널이다
const VIEW = {
  w: 440,                 // 장면 논리 폭 — 옛 판(400)보다 조금 멀리 본다: 가로 진행은 앞이 보여야 한다 (540 은 인물이 작았다)
  em: 0.0362,             // 글자 크기 = 기둥 폭 × 이 값 (패널·HUD 는 전부 em)
  panelEm: 25,            // 아래 패널이 다 보이려면 필요한 높이 (em) — 패널에 줄을 더하면 `node fittest.js` 로 다시 잰다
  minR: 0.95, maxR: 1.30, // 장면 높이 ÷ 폭 범위. 화면이 낮으면 기둥을 좁혀서라도 패널을 다 보인다 (아래가 잘리면 안 된다)
  ground: 54,             // 땅 띠 두께 (장면 맨 아래)
  heroX: 0.26,            // 주인공이 서는 자리 (장면 폭 비율)
  camK: 7,                // 카메라가 따라붙는 빠르기
  satIframe: 40,          // 아티팩트(iframe)는 위가 앱 바에 가린다 — 그만큼 내린다 (옛 판 v2.95.8 과 같은 사정)
  sc: 2,                  // 백버퍼 배율
};

// 톤 — 어두운 남색 안개. 원경만 덮고 스프라이트는 그 위에 밝게 띄운다 (레퍼런스: Soda Legend)
const TONE = {
  sky: '#0f1520', skyRGB: '15,21,32',
  veil: 'rgba(12,18,30,0.58)',          // 원경 위에 덮는 밤 안개
  mist: '150,175,200', mistA: 0.34, mistUp: 78, mistDown: 12,   // 지평선 안개 띠
  groundTop: [124,136,152], groundBot: [26,34,46],              // 달빛 받은 땅 → 패널색으로 잠긴다
  line: 'rgba(192,202,216,0.9)',
  vig: '8,12,20', vigH: 0.30, vigA: 0.82,                       // 위쪽 어둠 — HUD 글자가 읽히게
  propTint: '#0a1018', propDark: 0.78,                          // 중경 실루엣
  shadow: 'rgba(14,20,30,0.42)',
};
const BACK = { hr: 0.62, par: 0.22, sink: 16,                   // 원경: 장면 높이 대비 크기 · 흐름 · 땅 밑으로 잠김
               top: 0.115, fade: 0.40 };                        // 그림 위쪽 빈 줄 비율 · 그 아래 이만큼을 하늘색으로 녹인다 (윗변이 선으로 남는다)
const GRIT = { grid: 26, dens: 0.72, w: [3, 9], dark: 'rgba(16,24,36,0.30)', lite: 'rgba(226,236,250,0.20)' };   // 땅 자갈 — 달리는 속도가 보이게
const MID  = { par: 0.62, grid: 124, dens: 0.48, scale: 2.0, minH: 60, sink: 8,
               pick: ['bamboo_big','bamboo_mid','bamboo_one','bamboo_big'] };   // 중경 실루엣 (큰 소품만)
const PROPH = { bamboo_big: 100, bamboo_mid: 76, bamboo_one: 66 };              // 소품 기준 높이 (옛 PROPS)

// 주인공
const HERO = {
  hp: 100, dmg: 10, atkCd: 0.46, spd: 96, regen: 0.8,
  reach: 10,              // 동작 사거리에 더하는 여유
  kb: 6,                  // 평타 넉백 (px)
  hurtFlash: 0.12,
  downT: 3.0,             // 쓰러진 뒤 운기조식
  dust: 0.11,             // 달릴 때 흙먼지 간격 (초)
};
const ANIM = { run: [6, 10], idle: [1, 4], atk: [4, 8], hit: [2, 7], medit: [6, 3.2] };   // [컷 수, 초당 컷]
const HITFRAME = 2;       // 공격 몇 번째 컷에서 판정하나
// 스트립 한 컷 폭 (옛 HFX.aw) · 캔버스가 51보다 높은 동작 [높이, 위 여분] (옛 HFX.fh)
const STRIP = { run: 34, idle: 24, hit: 34, medit: 46, punch: 54, punchdbl: 56, punchup: 54, qipunch: 74, qipunchb: 74,
                kickside: 70, kickside2: 56, kickround: 72, kickround2: 58, kickhigh: 70, kickhigh2: 52 };
const STRIPH = { run: [52, 1], qipunch: [53, 0], punchdbl: [53, 2] };
// 기본공격 — 열린 동작을 순서대로 돌려 쓴다. need = 경지 성급, reach = 그림이 닿는 거리 (옛 MOVEREACH)
const MOVES = [
  { key: 'punch',      need: 0,  reach: 23 },
  { key: 'kickside',   need: 0,  reach: 19 },
  { key: 'punchdbl',   need: 0,  reach: 20 },
  { key: 'kickside2',  need: 0,  reach: 18 },
  { key: 'punchup',    need: 0,  reach: 20 },
  { key: 'kickround',  need: 5,  reach: 24 },
  { key: 'kickround2', need: 5,  reach: 18 },
  { key: 'kickhigh',   need: 10, reach: 26 },
  { key: 'kickhigh2',  need: 10, reach: 19 },
  { key: 'qipunch',    need: 0,  reach: 30 },
  { key: 'qipunchb',   need: 0,  reach: 30 },
];

// 난이도 — 전역 단계 g 하나가 만든다 (옛 판 v2.68 확정값)
const DIFF = { hpBase: 22, hpGrow: 1.46, dmgBase: 3.0, dmgGrow: 1.19, needBase: 24, needPer: 7, needRound: 10 };
const GROW = { dmg: 1.31, hp: 1.31, regen: 1.31 };              // 승급당 곱
const REALM = {
  names: ['삼류','이류','일류','절정','초절정','화경','현경','생사경','자연경'], per: 4, last: '신화경',
  expBase: 25, expGrow: 1.30, killGrow: 1.07, bossExp: 25,
};
const SILVER = { base: 3, grow: 1.22, bossKill: 10, firstMul: 50 };
const TRAIN = {
  capPer: 10,             // 경지 성급마다 열리는 상한
  list: [
    { k: 'atk',   n: '공격', d: '주먹이 매워진다', inc: 2, cb: 12, cg: 1.16, ico: 'train_atk' },
    { k: 'hp',    n: '체력', d: '몸이 단단해진다', inc: 2, cb: 10, cg: 1.15, ico: 'train_hp' },
    { k: 'regen', n: '회복', d: '숨이 깊어진다',   inc: 2, cb: 8,  cg: 1.14, ico: 'train_regen' },
  ],
};

// 적 — 공통 (옛 FOE·STAGES·BOSS)
const FOE = { dur: 0.55, hitAt: 0.55, cd: 1.3, hitPad: 16, edge: 0.34, hitT: 0.12, fade: 0.35 };
const STAGE = { n: 10, spd: i => 38 + i * 2, max: i => Math.min(3 + i, 7) };
const BOSS = { hp: 30, dmg: 2.0, spd: 0.82, dur: 0.72, hitAt: 0.62, hitPad: 26, edge: 0.35, range: 62, enter: 300 };
const BOSSKILL = { cd: 5.5, range: 132, dmg: 2.6, dur: 1.35, hitAt: 0.62 };
/* 떼 — 가로 진행의 박자 (새로 잡은 것)
   옛 판은 사방에서 끊임없이 왔다. 가로판은 **한 떼를 잡고 → 달려서 → 다음 떼를 만난다**.
   달리는 구간이 있어야 횡스크롤이 읽히지만 길면 느려진다: 남은 수가 left 이하가 되면 다음 떼를 미리 세운다. */
const WAVE = { left: 1, ahead: 36, gap: [26, 62], jitterY: 7, stopJit: [-6, 16], first: 200 };

const ZONES = [
  { k: 'bamboo', n: '죽림', bg: 'bg_bamboo', boss: 'demon', bossName: '대나무 마왕',
    foes: ['bandit','thug','wisp','panther','panther','beetle','soldier','stalker','snake'] },   // 옛 등장표에서 근접형만 (원거리·비행은 다음에)
];

// 적 종류 — 옛 FOES 에서 규격·배수를 그대로. 그림은 오른쪽 보기라 가로판에선 전부 뒤집어 그린다
const FOES = {
  bandit:  { n: '대나무 강도', w: 60, h: 49,
    anim: { idle: ['idle0','idle1','idle2','idle3'], walk: ['walk0','walk1','walk2','walk3'], atk: ['atk0','atk1','atk2','atk3'], hit: ['hit'], death: ['hit','death0'] },
    fps: { idle: 4, walk: 7, atk: 7.3, hit: 6, death: 4 }, hp: 1.0, dmg: 1.0, spd: 1.0, range: 44 },
  wisp:    { n: '대나무 유령불', w: 68, h: 46, sw: 36, bh: 34,
    anim: { idle: ['float0','float1','float2','float3'], walk: ['float0','float1','float2','float3'], atk: ['atk0','atk1','atk2','atk3'], hit: ['hit'], death: ['death0','death1'] },
    fps: { idle: 5, walk: 6, atk: 7, hit: 6, death: 3 }, hp: 0.62, dmg: 0.78, spd: 1.22, range: 38 },
  panther: { n: '그림자 표범', w: 158, h: 86, sw: 70, bh: 40, sc: 0.72,
    anim: { idle: ['idle0','idle1','idle2','idle3'], walk: ['walk0','walk1','walk2','walk3'], atk: ['atk0','atk1','atk2','atk3'], hit: ['hit'], death: ['death0','death1','death2'] },
    fps: { idle: 4, walk: 10, atk: 8, hit: 5, death: 4 }, hp: 0.78, dmg: 1.15, spd: 1.45, range: 60 },
  thug:    { n: '대나무 무뢰배', w: 80, h: 56, sw: 44, bh: 48,
    anim: { idle: ['idle0','idle1','idle2','idle3'], walk: ['walk0','walk1','walk2','walk3'], atk: ['atk0','atk1','atk2','atk3'], hit: ['hit'], death: ['death0','death1','death2'] },
    fps: { idle: 4, walk: 8, atk: 8, hit: 6, death: 4 }, hp: 1.1, dmg: 1.1, spd: 0.95, range: 48 },
  beetle:  { n: '등딱지벌레', w: 76, h: 56, sw: 58, bh: 34, sc: 0.74,
    anim: { idle: ['idle0','idle1','idle2','idle3'], walk: ['walk0','walk1','walk2','walk3'], atk: ['atk0','atk1','atk2','atk3'], hit: ['hit'], death: ['death0','death1','death2'] },
    fps: { idle: 3.5, walk: 7, atk: 8, hit: 6, death: 4 }, hp: 1.25, dmg: 0.95, spd: 0.8, range: 46 },
  soldier: { n: '대나무 정령병', w: 122, h: 54, sw: 38, bh: 48,
    anim: { idle: ['idle0','idle1','idle2','idle3','idle4','idle5'], walk: ['walk0','walk1','walk2','walk3','walk4','walk5','walk6','walk7'], atk: ['atk0','atk1','atk2','atk3','atk4','atk5'], hit: ['hit','hit2'], death: ['death0','death1','death2'] },
    fps: { idle: 4, walk: 8, atk: 11, hit: 6, death: 4 }, hp: 1.6, dmg: 1.2, spd: 0.95, range: 50 },
  stalker: { n: '죽림 추적자', w: 72, h: 58, sw: 34, bh: 48,
    anim: { idle: ['idle0','idle1','idle2','idle3'], walk: ['walk0','walk1','walk2','walk3','walk4','walk5'], atk: ['atk0','atk1','atk2','atk3'], hit: ['hit'], death: ['death0','death1'] },
    fps: { idle: 4, walk: 8, atk: 8, hit: 6, death: 4 }, hp: 1.4, dmg: 1.15, spd: 1.15, range: 60 },
  snake:   { n: '대나무 방울뱀', w: 86, h: 45, sw: 56, bh: 40,
    anim: { idle: ['idle0','idle1','idle2','idle3'], walk: ['walk0','walk1','walk2','walk3'], atk: ['atk0','atk1','atk2','atk3'], hit: ['hit'], death: ['death0','death1','death2'] },
    fps: { idle: 4, walk: 7, atk: 8, hit: 6, death: 4 }, hp: 1.3, dmg: 1.35, spd: 1.1, range: 54 },
  demon:   { n: '대나무 마왕', w: 114, h: 96, boss: true,
    anim: { idle: ['idle0','idle1','idle2','idle3','idle4'], walk: ['idle0','idle1','idle2','idle3','idle4'], atk: ['swing0','swing1','swing2','swing3','swing4'],
            skill: ['roar0','roar1','roar2','roar3','roar4','burst0','burst1','burst2','burst3','burst4'], hit: ['idle2'], death: ['death0','death1','death2','death3'] },
    fps: { idle: 5, walk: 5, atk: 7, skill: 7.4, hit: 4, death: 5 }, hp: 1.0, dmg: 1.0, spd: 1.0, range: 62 },
};

// 연출 숫자
const FX = {
  spark: { n: 7, spd: 130, life: 0.32, c: '225,240,255' }, flash: 0.08,
  dmg: { rise: 34, life: 0.7, size: 13 }, dust: { r: 5, life: 0.45, c: '170,182,198' },
  shake: { boss: 5, down: 4, t: 0.22 },
  slash: { life: 0.16, r: 20, c: '200,228,255' },
};
const SAVE = { key: 'wuxia_side1', every: 8 };
const TEXT = { hint: '10단계를 넘으면 죽림의 수호자가 나타난다', hintBoss: '수호자를 넘으면 다음 땅이 열린다 — 준비 중', hintDone: '죽림을 넘었다 — 다음 땅은 준비 중' };

// 빌드가 이걸 불러 필요한 그림만 싣는다 (없는 키는 빌드가 실패한다)
function assetKeys(){
  const ks = ['silver', 'train_atk', 'train_hp', 'train_regen'];
  for (const k in STRIP) ks.push(k);
  for (const z of ZONES){ ks.push(z.bg); }
  for (const k of MID.pick) if (ks.indexOf(k) < 0) ks.push(k);
  for (const k in FOES){ const M = FOES[k]; for (const a in M.anim) for (const f of M.anim[a]){ const key = k + '_' + f; if (ks.indexOf(key) < 0) ks.push(key); } }
  return ks;
}
