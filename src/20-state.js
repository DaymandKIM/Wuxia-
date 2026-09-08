/* ── 상태 ─────────────────────────────────────────── */
const S = {
  t: 0,
  zi: 0,                         // 구역 번호
  stage: 1,
  kills: 0,
  downT: 0,                      // >0 이면 운기조식 중
  camX: 0, camY: 0,
  foes: [],
  shots: [],                     // 적의 원거리 탄
  fx: [],
  best: 1,
  unlocked: 1,                   // 열린 구역 수 (TEST면 전부)
  bossAlive: false,              // 보스가 살아 있나
  sweepT: 0,                     // >0 이면 제패 연출 중
  sweepDone: false,              // 파동이 이미 터졌나
  summonT: 0,                    // >0 이면 보스 등장 연출 중
  gateY: 0,                      // 문 중심 y (보스가 여기서 나온다)
  summonX: 0, summonY: 0,
  totalKills: 0,
  downs: 0,
  silver: 0,                     // 은자
  bossDone: [],                  // 구역별 보스 첫 격파 여부 (0/1)
  stats: {},                     // 수련 레벨 { atk, hp, regen, spd, crit }
  rexp: 0,                       // 수련치 — 경지의 재료
  arts: {},                      // 익힌 무공 { key: 1 }
  intro: 0,                      // >0 이면 진입 연출 중
  introMsg: '',                   // 아래 (단계)
  introTop: '',                   // 위 (구역)
  introSfx: [0,0,0],
};

const P = {
  x: 0, y: 0, vx: 0, vy: 0,
  dir: 1,
  hp: HERO.hp, hpMax: HERO.hp,
  anim: 'idle', af: 0,
  atkT: 0,                       // >0 이면 공격 동작 중
  atkCd: 0,
  artCd: {},                     // 초식별 남은 쿨다운 (저장 안 함)
  hitT: 0,
  dead: false,
  hitDone: false,                // 이번 공격에서 이미 때렸나
};

const stage = ()=> STAGES[Math.min(S.stage, STAGES.length) - 1];

