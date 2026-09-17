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
  reach: [],                     // 구역별 가 본 최고 단계(1~11) — 사냥터 패널에서 고를 수 있는 범위 (v2.70.6)
  stats: {},                     // 수련 레벨 { atk, hp, regen, spd, crit }
  rexp: 0,                       // 수련치 — 경지의 재료
  arts: {},                      // 익힌 무공 { key: 1 }
  artXp: {},                     // 무공 숙련도 { key: 사용 횟수 }
  artStar: {},                   // 무공 성 { key: 1~4 }
  artLv: {},                     // 무공 연마 레벨 { key: 1~성×10 }
  skillManual: false,            // 초식 시전 모드 — false 자동 / true 수동(직접 시전)
  // 자동 진행 (v2.95.4, 사용자 "자동으로 다음에 도전할지 보스에 도전할지 하는 버튼") —
  // 끄면 그 단계를 계속 돌며 판다. 둘 다 켠 것이 지금까지의 동작이다.
  qual: null,                    // 화질 — null 이면 자동(QUALITY.start 에서 시작해 느리면 내린다), 숫자면 손으로 고른 것 (v2.95.5)
  autoNext: true,                // 단계를 깨면 다음 단계로 간다
  autoBoss: true,                // 10단계를 깨면 보스에 도전한다
  mute: false,                   // 효과음 끔 (≡ 메뉴 설정, v2.85) — 저장됨
  atkMove: 0,                    // 기본공격 무브셋 회전 인덱스 (성장형, v2.46)
  atkKey: 'punch',               // 이번 타의 공격 동작 키
  tree: {},                      // 문파 무공도 — 익힌 노드 { 문파키: { 노드id:1 } }
  treeArt: {},                   // (구) 트리로 습득한 무공 — v2.54.2에서 폐지, 옛 저장 회수용
  traits: {},                    // 스킬 심화 특성 { 무공키: { 특성id:1 } } (v2.55)
  equip: { weapon:null, armor:null, pendant:null, ring:null, beads:null, talisman:null, gourd:null, ribbon:null },   // 장착 { k:종류, g:등급 } — 자리 키 = eqWearSlots() (v2.89 장신구 종류별 6자리)
  inv:   {},                     // 주머니 { 종류: [등급별 개수 ×5] } — 합성은 수동(일괄 합성)
  itemLv:{},                     // 아이템 레벨 { 종류: [등급별 레벨 ×5] } — 장착·보유 효과가 탄다
  codex: {},                     // 도감 { 종류: 얻어 본 등급 비트 } — 보유 효과의 근거
  eqLog: [],                     // 최근 드랍 기록 (저장 안 함)
  karma: 0,                      // 인연 — 기연의 재료
  fates: 0,                      // 만난 기연 횟수
  merges: 0,                     // 장비 합성 누계 (v2.90 업적)
  levels: 0,                     // 장비 강화 누계 (v2.90 업적)
  achv: {},                      // 업적 { k: 받은 단계 수 } (v2.90)
  halls: {},                     // 문파 전각 { k: 레벨 } (v2.91)
  fame: 0,                       // 문파 명성 누적 (v2.91)
  sectName: '',                  // 문파 이름 — 빈 값이면 SECT.name(무명문) (v2.91.2)
  disciples: [],                 // 문파 제자 [{n:이름, l:계보키, t:자질 index}] (v2.92)
  hq: null,                      // 본진 비무 중이면 문파 키 (v2.94) — zone()이 HQZONE 을 돌려준다
  duel: {},                      // 문파별 단(段) {sorim:3}
  frag: {},                      // 비급 조각 {무공키: 개수}
  hqDone: {},                    // 문파별 첫 격파한 최고 단 (제자 확정 합류 판정)
  ptsBonus: 0,                   // 본진에서 얻은 무공점 (skillPtsTotal 에 더한다)
  achvNote: {},                  // 업적 { k: 알린 단계 수 } — 달성 토스트 중복 방지 (저장 안 함)
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

