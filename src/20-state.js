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
  artXp: {},                     // 무공 숙련도 { key: 사용 횟수 }
  artStar: {},                   // 무공 성 { key: 1~4 }
  artLv: {},                     // 무공 연마 레벨 { key: 1~성×10 }
  skillManual: false,            // 초식 시전 모드 — false 자동 / true 수동(직접 시전)
  tree: {},                      // 문파 무공도 — 익힌 노드 { 문파키: { 노드id:1 } }
  treeArt: {},                   // 트리로 습득한 무공 { k:1 } (되돌릴 때 회수 판단)
  karma: 0,                      // 인연 — 기연의 재료
  fates: 0,                      // 만난 기연 횟수
  fatePending: 0,                // >0 이면 기연이 기다린다
  fatebits: {},                  // 실전 비급 조각 { guyang: 0~3, geongon: 0~3 }
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
  atkAlt: 0,                     // 양손 교대 — 0 오른손(katka) / 1 왼손(katkb)
  castT: 0,                      // >0 이면 초식 시전 동작 중
  castK: 'pagong',               // 시전 중인 초식 키 (스트립 선택)
  castGapT: 0,                   // 시전 사이 숨 고르기 — 동시 시전 금지 (CASTQ.gap)
  atkCd: 0,
  artCd: {},                     // 초식별 남은 쿨다운 (저장 안 함)
  // 경공 (v2.41) — dashT>0 비행 중, dashHold>0 착지 경직, dashCd 쿨다운
  dashT: 0, dashHold: 0, dashCd: 0, dashTX: 0, dashTY: 0,
  hitT: 0,
  dead: false,
  hitDone: false,                // 이번 공격에서 이미 때렸나
};

const stage = ()=> STAGES[Math.min(S.stage, STAGES.length) - 1];

