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
  idle:  [1, 4],                 // 정면 전투 자세 단일 컷 — v2.73.2부터 주먹 시트 기수식(hero_pose2, 폭 HFX.aw.idle)
  run:   [6, 10],                // v2.71.1 — 사용자 시트 hero_run2 1줄 6컷 질주 (v2.44 10컷 시트 대체, hero_run2.py)
  atk:   [4, 8],                 // 4프레임 0.5초 — 정권 찌르기
  hit:   [2, 7],
  medit: [6, 3.2],               // 운기조식 (쓰러진 뒤) — v2.77 사용자 시트 hero_medit2 6컷 루프(가부좌→기운→고리→손안 빛)
  cast:  [4, 8],                 // 초식 시전 (파공권 — 금빛 기운)
};
// 눈에 보이는 성장 — 경지가 오르면 기운이 돌고 정권에 권기가 붙는다 (v2.3)
const HFX = {
  castFps: 10,                   // 시전 재생 속도 — 16은 컷이 씹혀 보였다 (4성 0.6~0.9초)
  shotT: 0.28,                   // 권기 탄 비행 시간 (구 streak과 동일)
  fadeT: 0.22,                   // 탄 소멸 연출
  aw: { aidle: 50, katk: 70, punch: 54, punchdbl: 56, punchup: 54, qipunch: 74, qipunchb: 74, kickside2: 56, kickround2: 58, kickhigh2: 52, swordthrust: 90, swordslash: 74, swordspin: 56, fansweep: 58, fanspin: 56, fanstrike: 60, saberslash: 60, sabersmash: 60, saberspin: 60, spearthrust: 58, spearsweep: 58, spearspin: 58, staffswing: 58, staffsweep: 56, staffspin: 56, kickside: 70, kickround: 72, kickhigh: 70, flykick: 44, firekick: 44, cresckick: 46, burstkick: 46, run: 34, idle: 24, hit: 34, medit: 46 },   // 특수 동작 프레임 폭 (v2.73 — 주인공 시트는 hero_sheet가 그림에 맞춰 재고 review/hero_specs.json에 적는다. idle·hit도 v2.73.2부터 새 시트. 주먹 3종은 v2.76 hero_punch4, 발차기 3종은 v2.76.1 hero_kick3)
  // 캔버스 높이가 51을 넘는 동작 [높이, 위 여분] — 머리 위로 든 무기·큰 원 기운. 렌더는 위 여분만큼 위로 올려 땅을 맞춘다(v2.73)
  fh: { run: [52, 1], qipunch: [53, 0], punchdbl: [53, 2], swordslash: [53, 2], swordspin: [52, 1], fansweep: [54, 3], fanspin: [53, 2], fanstrike: [54, 3], saberslash: [53, 2], sabersmash: [53, 2], saberspin: [54, 3], spearspin: [52, 1], staffswing: [52, 1], staffspin: [52, 1] },
  // 기본공격 = 주먹 5종(punch·punchdbl·punchup + 옛 권기 qipunch·qipunchb) + 발차기 6종(kickside/round/high + 옛 *2) 4프레임
  // (v2.71 — 사용자 시트 sheets/hero_kick2.png 3줄, hero_kick2.py로 추출. 머리 중심 정렬·칸 바닥 기준)
  // kickside 70·kickround 72·kickhigh 70 (v2.76.1 hero_kick3 — 기운·초승달까지 담아 폭이 넓다, 좌우 대칭 캔버스)
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
  castStar: [1.0, 1.0, 1.0, 1.0],   // v2.90.1 (사용자 "붕산장 구체가 안 보이게 빠르던데"): 성별로 컷을 덜어내던 v2.4 규칙 폐지 — 1성이 6컷 중 3컷(0·3·5)만 써 구체 컷이 빠졌다. 전 컷 항상
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
  // 몸 뒤 기운 = **낀 장비 등급색**(v2.88, 사용자 확정 "오라는 장비 등급색으로" — 옛 경지 4색 aidle_w/g/b/p는 v2.3~2.87 이력).
  // 세 자리 중 가장 높은 등급. 희귀(2)부터 보이고 등급이 오를수록 짙어진다(아이콘 프롬프트와 같은 결 — 일반·고급은 빛 없음).
  auraGrade: { min: 2, alpha: [0, 0, 0.45, 0.6, 0.72, 0.84, 0.95], pad: 4, layer: 0.16, pulse: 0.15 },   // pad: 번짐 반지름+1, layer: 겹당 알파, pulse: 맥동 폭
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
  fw:30, fh:51,  // 날기 컷 = 발차기 시트 도약 컷(v2.73.2, hero_pose2 — 새 시트로 통일. 51 캔버스·땅 48행)
  lw:32, lh:51,  // 착지 컷 = 발차기 시트 웅크림 컷
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
  // ── 네온 핵앤슬래시 타격감 (v2.61, "픽셀헌터 키우기" 결) — 순수 연출, 밸런스 무관 ──
  // 참격 호 — 근접 평타 임팩트 지점에 P.dir 쪽으로 볼록한 초승달이 확장+페이드.
  // r 반경 · w 심 굵기 · span 호 각(라디안, 양쪽) · tilt 무작위 기울기 · crit 치명 배율
  slash:    { life:0.18, r:22, w:3, span:1.2, tilt:0.5, crit:1.5 },
  // 피격 브라이튼 — 맞은 적 스프라이트를 lighter로 겹쳐 그려 아주 짧게 하얗게 번쩍
  // (source-atop은 메인 캔버스에 사각 자국을 남긴다 — 절대 쓰지 않는다). n 겹 수
  hitflash: { life:0.08, a:0.8, n:2 },
  // 치명타 — 바닥 네온 링(타원, 짧게) · 흔들림 · 미세 경직(초, loop에서만 step을 멈춘다)
  critring: { life:0.26, r:34, w:2.4 },
  shake:    { hit:2.2, crit:4.6 },
  hitstop:  { crit:0.04, max:0.08 },
  // 탄 잔상 — 진행 반대쪽에 고스트 n개(lighter·감소 알파). gap 간격(px) · a 첫 고스트 알파 · shrink 고스트당 축소
  trail:    { n:3, gap:7, a:0.34, shrink:0.1 },
  // 피해 숫자 — 등장 스케일 팝(pop→1, popT초) · 크기 · 네온 외곽선 굵기
  dmgpop:   { pop:1.4, popT:0.14, size:7.5, critSize:12, stroke:2.4, critStroke:3.2,
              c:'#f0f6ff', cc:'#ffd95e', glow:'255,214,90', glowA:0.35 },
  // 초식명 외침 (v2.63.6, "머리 위 글씨체 별로·더 크게") — 피해 숫자와 같은 네온 결:
  // 굵은 Jua + 어두운 스트로크, 등장 팝, 문파색 잔광. size는 게임 px(화면 3배).
  artname:  { size:13, pop:1.6, popT:0.16, stroke:3, rise:14, c:'#f4faff', glowA:0.45 },
  // 초식 시전 절차 발광 배율 — 반경·알파를 조금 키워 네온 결 (인물 가림 금지: 1.5 미만)
  castGlow: { r:1.3, a:0.62, rim:0.55 },
  // ── 동작별 임팩트 결 (v2.78, 사용자: "공격 모션에 알맞게 이펙트를 — 잘 어울려서 이상하지 않고 멋지게") ──
  // 기본 파열(wave·sparks)은 그대로 두고, 참격 호 자리에 동작 성격에 맞는 한 가지를 얹는다. 없는 키는 옛 참격 호.
  moveFx: {
    punch:'impact', punchdbl:'impact', punchup:'rise', qipunch:'qi', qipunchb:'qi',
    kickside:'kick', kickround:'kick', kickhigh:'kickup', kickside2:'kick', kickround2:'kick', kickhigh2:'kickup',
    swordthrust:'pierce', swordslash:'cut', swordspin:'spin', saberslash:'cut', sabersmash:'cutdown', saberspin:'spin',
    spearthrust:'pierce', spearsweep:'cut', spearspin:'spin', staffswing:'blunt', staffsweep:'blunt', staffspin:'spin',
    fansweep:'petal', fanspin:'spin', fanstrike:'petal',
  },
  impact:  { n:6, len:10, r:9, life:0.2, c:'255,236,200' },        // 주먹 — 짧은 방사선 별 + 작은 고리(둔탁한 충격)
  rise:    { len:28, w:2.2, life:0.24, c:'255,224,150' },           // 승룡권 — 위로 솟는 빛줄기 + 위로 튀는 불티
  qi:      { r:24, c:'120,190,255' },                               // 권기 — 파란 대파열(섬광·속도선까지)
  kick:    { span:1.7, r:27, tilt:0.25, c:'180,236,255' },          // 발차기 — 넓은 초승달 호
  kickup:  { span:1.3, r:27, tilt:-0.9, c:'180,236,255' },          // 뛰어차기 — 위로 기운 호
  cut:     { len:36, w:2.4, ang:-0.75, life:0.16, c:'200,240,255' }, // 검·도·창 쓸기 — 사선 검흔
  cutdown: { len:34, w:2.6, ang:1.2,  life:0.18, c:'200,240,255' }, // 내려찍기 — 세로 검흔 + 땅 먼지
  pierce:  { len:44, w:2.0, ang:0,    life:0.15, c:'220,245,255' }, // 찌르기 — 수평 관통 섬선
  spin:    { r:32, life:0.4, c:'200,240,255' },                     // 회전 — 발밑 큰 원형 충격파
  blunt:   { r:15, life:0.26, c:'255,220,170' },                    // 봉 — 둔탁한 충격 고리 + 흙 튐
  petal:   { n:5, spd:70, life:0.5, c:'190,255,230' },              // 부채 — 흩날리는 청록 잎 조각
  stepdust:{ n:3, life:0.32, r:3.2, c:'170,158,128' },              // 공격 들어갈 때 발밑 흙먼지(가산 아님)
  // 운기조식 연출 (v2.78) — 몸 뒤 온기 후광 · 발밑 광륜(숨 쉬듯 맥동) · 6컷 루프에 맞춰 퍼지는 호흡 고리 · 반짝이는 빛알
  meditFx: {
    halo:   { r:17, a:0.14, c:'255,236,190' },
    ring:   { r:19, w:1.5, a:0.5, c:'190,240,255', pulse:0.12 },
    breath: { r0:6, r1:30, w:1.3, a:0.55, c:'190,240,255' },
    motes:  { n:6, r:1.3, spread:20, rise:28, period:2.6, c:'255,246,210' },
  },
};
// 기운 정보 — { col: 등급색, a: 진하기 } 또는 null. 흰 안개(aidle_w)를 이 색으로 물들여 그린다(50-render auraImg)
function auraKey(){
  const g = typeof eqAuraGrade === 'function' ? eqAuraGrade() : -1;
  if (g < HFX.auraGrade.min) return null;
  return { col: EQUIP.grades[g].c, a: HFX.auraGrade.alpha[g] || 0.9 };
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
  // v2.76.2 (사용자: "기존 것들도 잘 살려서 넣어") — 새 시트 6동작 + 옛 시트 5동작을 전부 돌려 쓴다. 주먹·발차기를 번갈아 배열.
  { key:'punch',     need:0 },   // 정권 — 기수식→잽→내지름→초승달 기운 (v2.76 사용자 주먹 시트 hero_punch4 1줄)
  { key:'kickside',  need:0 },   // 옆차기 — 챔버→차기→푸른 기운 임팩트→뻗음 (v2.76.1 hero_kick3)
  { key:'punchdbl',  need:0 },   // 연환권 — 잽→내지름 흙먼지→큰 원 기운 (hero_punch4 2줄)
  { key:'kickside2', need:0 },   // 옆차기(옛, hero_kick2 v2.71) — 무릎 접었다 수평으로 내지르며 초승달 기운
  { key:'punchup',   need:0 },   // 승룡권 — 뒤로 당겼다 치켜올려 올려치기 (hero_punch4 3줄+1·2줄 조합)
  { key:'kickround', need:5 },   // 돌려차기 — 이류(성급 5)부터. 챔버→차기→작은 초승달→큰 초승달 (hero_kick3)
  { key:'kickround2',need:5 },   // 돌려차기(옛, hero_kick2) — 구름 자세에서 휘둘러 별 임팩트
  { key:'kickhigh',  need:10 },  // 뛰어차기 — 절정(성급 10)부터. 챔버→도약→별 임팩트·흙먼지→착지 뻗음 (hero_kick3)
  { key:'kickhigh2', need:10 },  // 뛰어차기(옛, hero_kick2) — 웅크렸다 도약해 공중에서 찬다
  // 권기 정권은 순환의 **맨 끝** — 주먹·발차기를 다 낸 뒤 기 모아 치는 마무리 일격 (v2.76.3 사용자: "모든 권기 후 나중에
  // 기 모아서 치는 느낌"). 머리 큰 hero_fx 비율은 hero_punch3 scale_mul 0.86으로 머리 폭을 새 시트에 맞췄다.
  { key:'qipunch',   need:0 },   // 권기 정권 오른손(옛, hero_fx 2줄 — hero_punch3) — 파란 권기가 뻗는다
  { key:'qipunchb',  need:0 },   // 권기 정권 왼손(옛, hero_fx 3줄)
  // 성급별 발차기 각도가 는다(사용자 시트 c0f865d3 — "발차기도 각도별로 있어").
  // 화염 발차기류(flykick·firekick)는 뺐다(v2.48). 초승달·도약(cresckick·burstkick)은
  // 추후 초식(스킬)으로 쓸 후보 — 에셋·loadImg는 남겨 둔다.
];
// 무기별 무브셋 (v2.72, 사용자: "검 공격 모션 — 검 장착하면 사용") — 무기 자리에 낀 종류로 기본공격 동작이 바뀐다.
// 검(sword) = 사용자 시트 hero_sword2 3종. 무브셋 없는 무기(권갑)는 맨손 ATKMOVES — 시트가 오면 여기 얹는다.
const WEAPONMOVES = {
  sword: [
    { key:'swordthrust', need:0 },   // 찌르기 — 기수식→검 내림→찌르기 별→사선 호
    { key:'swordslash',  need:0 },   // 베기 — 치켜듦→내려베기 별→사선 호
    { key:'swordspin',   need:0 },  // 회전베기 — 큰 세로 호→큰 원 베기→낮은 베기
  ],
  fan: [                             // 부채 = 사용자 시트 hero_fan2 (v2.72.1)
    { key:'fansweep',  need:0 },     // 휘두르기 — 가림→내림→별 폭발→큰 호
    { key:'fanspin',   need:0 },     // 회전 — 호 둘→큰 원→낮게 쓸기
    { key:'fanstrike', need:0 },    // 찌르기 — 머리 위→나선 호→앞으로 뻗음
  ],
  saber: [                           // 도 = 사용자 시트 hero_saber2 (v2.72.2)
    { key:'saberslash', need:0 },    // 베기 — 쥠→가로 베기 호→큰 호
    { key:'sabersmash', need:0 },    // 내려찍기 — 뒤로 감음→머리 위→내려찍기 흙→낮게 찍기
    { key:'saberspin',  need:0 },   // 회전베기 — 뻗음→큰 원→겹호
  ],
  spear: [                           // 창 = 사용자 시트 hero_spear2 (v2.72.3)
    { key:'spearthrust', need:0 },   // 찌르기 — 낮게 겨눔→찌르기 기운→가로 찌르기
    { key:'spearsweep',  need:0 },   // 쓸기 — 비껴 치켜듦→낮게 쓸기 호→쓸기 호
    { key:'spearspin',   need:0 },  // 회전 — 뒤로 돌리기 호→큰 원→땅 찍기
  ],
  staff: [                           // 봉 = 사용자 시트 hero_staff2 (v2.72.4)
    { key:'staffswing', need:0 },    // 휘두르기 — 낮게 겨눔→머리 위 휘두르기 호→연타
    { key:'staffsweep', need:0 },    // 쓸기 — 비껴 치켜듦→낮게 쓸기 호→쓸기 호
    { key:'staffspin',  need:0 },   // 회전 — 뒤로 돌리기 호→큰 원→땅 찍기
  ],
};
function heroWeaponKind(){ return (typeof S !== 'undefined' && S.equip && S.equip.weapon) ? S.equip.weapon.k : null; }
function atkPool(){ const set=WEAPONMOVES[heroWeaponKind()]||ATKMOVES; const p=set.filter(m=>realmLv()>=m.need); return p.length?p:[set[0]]; }
// 공격 프레임별 주먹 끝 위치 (프레임 중앙·바닥 기준 오프셋)
// 원본 그림에 손 끝이 잘려 있어, 이 자리에 작은 원을 얹어 마무리한다.
const FIST = [
  { x:  9, y: -22 },
  { x: 13, y: -28 },
  { x: 14, y: -30 },
  { x: 13, y: -30 },
];

// 구역 — 각 10단계 + 보스 1단계. mul이 클수록 어렵고 보상도 크다.
// map: 여정 지도 일러스트(assets/zone_map, 360×360 좌표) 위 노드 자리 — 그림 속 지형에 손으로 맞춤 (v2.69).
// 구역 6 성채 자리는 [292, 52] (그림 우상단 성). 그림이 없으면 옛 지그재그 노드망으로 그린다.
const ZONES = [
  { k:'bamboo',  n:'죽림',   ground:'#6a7a52', boss:'대나무 마왕', map:[78, 296] },
  { k:'village', n:'폐촌',   ground:'#6b6350', boss:'폐촌의 원혼', map:[276, 242] },   // 등장 문구·FOES.ghost와 통일
  { k:'cave',    n:'동굴',   ground:'#474d54', boss:'석암거인',   map:[100, 188] },   // v2.35 어둑·푸른끼 (몹 대비)
  { k:'snow',    n:'설산',   ground:'#a4b3c0', boss:'설산백호',   map:[280, 142] },   // v2.35 톤다운 (흰 백호 대비)
  { k:'heaven',  n:'천산',   ground:'#7f9a86', boss:'뇌운신장',   map:[96, 86] },
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
  heaven:  { kind:'wind',  n:14, c:'236,242,238', spd:150 },  // 바람 줄기 (v2.63.2 — 구름 그림자 타원은 바닥 텍스처 위에서 우물처럼 보여 폐기)
};

// 구역별 배경 소품 — 사용자 제미나이 시트에서 추출한 스프라이트 (v2.59).
// kind:'sprite', pick:[에셋키, 게임 높이, 가중치] — 가중 랜덤. 랜드마크는 드물게,
// 잔소품 잦게. 월드 좌표 고정(넓은 격자 grid)·무상태(셀 해시)라 저장·sim 무관.
// 절차 드로잉(옛 TERR·픽셀 소품)은 폐기 — 시트가 온 구역만 채운다.
// (날씨 입자 눈·재·낙엽·반딧불·구름은 AMB에서 계속 절차로 그린다.)
const PROPS = {
  bamboo:  { kind:'sprite', dens:0.50, grid:150,
             pick:[ ['bamboo_big',100,3], ['bamboo_mid',76,3], ['bamboo_one',66,3],
                    ['bamboo_shoot',30,2], ['bamboo_rock',26,1], ['bamboo_fern',36,2],
                    ['bamboo_log',24,1],   ['bamboo_grass',22,3] ] },
  village: { kind:'sprite', dens:0.46, grid:155,
             pick:[ ['vil_jar',42,1], ['vil_pot',26,2], ['vil_post',46,2], ['vil_fence',40,1],
                    ['vil_stump',40,2], ['vil_stump2',42,1], ['vil_wheel',46,1], ['vil_tiles',28,2],
                    ['vil_bush',44,3], ['vil_planks',24,3] ] },
  cave:    { kind:'sprite', dens:0.46, grid:150,
             pick:[ ['cav_mite',80,2], ['cav_mite2',56,2], ['cav_crystal',58,1], ['cav_boulder',46,2],
                    ['cav_rubble',34,3], ['cav_mushroom',40,2], ['cav_spire',72,2], ['cav_shard',18,3] ] },
  snow:    { kind:'sprite', dens:0.44, grid:160,
             pick:[ ['sno_pine',102,3], ['sno_pine2',82,3], ['sno_deadtree',96,1], ['sno_rock',34,3],
                    ['sno_drift',26,3], ['sno_ice',48,1], ['sno_bush',40,2], ['sno_stump',40,2] ] },
  heaven:  { kind:'sprite', dens:0.44, grid:158,
             pick:[ ['hev_cairn',48,2], ['hev_windtree',66,2], ['hev_boulder',48,2], ['hev_bonsai',72,1],
                    ['hev_menhir',64,1], ['hev_grass',42,3], ['hev_stones',30,3], ['hev_flag',74,1] ] },
};

// 상단 원경 배경 — 화면 위쪽 h(VH 비율)에 구역별 원경 한 장을 가로 타일링, 카메라
// x의 par 배만 흘러(패럴럭스) 깊이감. 아래 fade px는 땅색으로 녹여 지평선을 잇는다.
// 이미지(key)는 docs/프롬프트-배경.md 시트에서 bg_extract.py로 뽑는다 — 없으면
// 아무것도 안 그린다. 바닥 텍스처는 두지 않는다(스프라이트·이펙트와 경쟁).
// 바닥 텍스처 — 큰 무봉 그림 한 장을 카메라와 1:1로 2D 타일링(32px 타일 아님).
// 땅색 위에 알파 a로 얹어 가독성을 지킨다(스프라이트·이펙트가 이 위에 그려진다).
// 텍스처가 있으면 옅은 이동감 격자는 끈다. 시트 → ground_extract.py. 없으면 단색.
const GROUNDTEX = {
  a: 0.9, scale: 1,
  keys: { bamboo:'ground_bamboo', village:'ground_village', cave:'ground_cave', snow:'ground_snow', heaven:'ground_heaven' },
  // 텍스처 평균색(ground_extract 출력) — 원경 페이드가 이 색으로 녹아야 지평선 띠가 안 생긴다
  // (설산은 땅색 #a4b3c0보다 눈 텍스처가 훨씬 밝아 회색 띠가 보였다, v2.61.6)
  avg:  { bamboo:'#616e47', village:'#665f4c', cave:'#42474b', snow:'#dbe6f0', heaven:'#9ba994' },
  aZone: { heaven: 0.7 },                     // 밝은 얼룩이 강한 텍스처는 더 옅게(가독성)
};

const BACKDROP = {
  hz: 0.30,                                     // 지평선 y (VH 비율) — 원경 그림의 바닥이 여기 온다
  hDef: 0.30, h: { cave: 0.21, bamboo: 0.26 },  // 그림 높이(VH 비율) — 크기와 지평선을 분리. 동굴 시트는 크게 그려져 작게. 죽림 0.26(v2.87.5 "윗부분이 넓어 보여" — 빈 안개 24줄도 잘랐다)
  par: 0.22,                                    // 카메라 x 패럴럭스 배율
  // 아래 디졸브 띠 — 그림 높이의 비율(fadeR)로 잡는다. v2.63.6: 64px 고정은 폰(VH≈280,
  // 그림 84px)에서 그림의 3/4를 녹여 집·나무 아랫도리가 다 잘려 보였다("아래쪽이 다 짤려").
  // 이제 아래 14%만 녹인다 — 집 주춧돌만 땅에 스민다.
  fadeR: 0.14, fadeMin: 8, fadeSteps: 48, fadePow: 1.0,   // 계단 48(≈1px) — 설산 넓은 눈밭 띠(120px)에서 16단은 줄무늬가 보였다
  fadePad: 16,                                  // v2.87.4 "원경 아래 선": 시트 아래 균일 띠(bg_extract --pad)가 디졸브보다 높으면 띠 윗변이 불투명한 선으로 남는다(천산 44px > 35px)
                                                //   → 디졸브 길이 = max(fadeR×높이, 띠 높이 + fadePad). 띠 높이는 backdropScaled가 축소 캔버스에서 잰다(bdBand)
  cull: 0.5,                                    // 지평선 위(fade의 이 비율 지점부터) 소품 안 세움
  keys: { bamboo:'bg_bamboo', village:'bg_village', cave:'bg_cave', snow:'bg_snow', heaven:'bg_heaven' },
  sky:  { bamboo:'#becfbc', village:'#a78e76', cave:'#3f444b', snow:'#cddae8', heaven:'#d8dbc6' },  // 그림 위 남는 하늘(시트 윗줄 평균)
};

// 난이도 — 전역 단계 g(1~50)가 축이다. 구역은 배경·계보·서사의 단위.
// 원 확정 복원: 단계당 1.30배 + 처치 목표 24+단계×7. 선형 몹은 벽이 안
// 생겨 60분에 콘텐츠가 끝났다(소모 속도 우려) — 지수여야 전선이 생기고,
// 전선에서 벌어서(수련·무공·숙련·기연) 뚫는 게 게임이 된다.
const DIFF = {
  // v2.68: 1.30→1.46 (사용자 확정 "하루에 천산 초입"). 1.30은 주인공 승급 배율(1.31)과 같아
  // 벽이 안 섰다 — 수련·무공·특성·장비가 겹치면 4시간에 천산 끝. 24h sim: 1.46 → 1440분 천산 1단계,
  // 1.48 → 설산 9. 적 피해(dmgGrow)·처치 수련치·필요 수련치를 흔드는 건 효과가 미미했거나(X1~X4)
  // 쓰러짐만 수백 번 늘렸다(Y1~Y4). 벽은 "체력이 안 깎여서 기다리는 것"이어야 했다.
  hpBase: 22,  hpGrow: 1.46,     // 적 체력 = hpBase × hpGrow^(g-1)
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
// 보스 초상 컷인 (v2.63) — 등장 문구 옆에 초상이 문구와 같은 알파로 떠오른다. 사용자 시트.
const BOSSFACE = { bamboo:'boss_demon', village:'boss_ghost', cave:'boss_golem', snow:'boss_tiger', heaven:'boss_thunder' };
const FACECUT = { h: 0.16, x: 0.84, slide: 0.03, pad: 6, textX: 0.42 };   // 높이(H비율)·초상 중심 x·슬라이드·여백·문구 중심 x(초상 있을 때)
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
    // v2.64 재작업 — 붉은 두건·가죽 조끼·단도 산적 (사용자 시트 sheets/bandit.png, bandit.py).
    // 옛 판은 옷·머리가 주인공과 같아 헷갈렸다. 시체 컷은 돌바닥이 몸과 같은 색이라
    // 못 떼어내 죽음은 피격→무릎 2컷.
    n:'대나무 강도', w:60, h:49,
    anim:{ idle:['idle0','idle1','idle2','idle3'], walk:['walk0','walk1','walk2','walk3'],
           atk:['atk0','atk1','atk2','atk3'],     // 웅크림 → 찌르기 → 참격 → 갈무리
           hit:['hit'], death:['hit','death0'] },
    // atk 4프레임을 공격 시간(FOE.dur 0.55초)에 맞춘다 — 4/7.3≈0.55초
    fps:{ idle:4, walk:7, atk:7.3, hit:6, death:4 },
    hp:1.0, dmg:1.0, spd:1.0, range:44,   // 기준
  },
  wisp: {
    // v2.65 재작업 — 두건 쓴 해골 귀신(사용자 시트 sheets/wisp.png 2~4행, wisp.py — 1행은
    // 디자인이 달라 버림). 떠다님 4컷이 대기·이동, 공격은 몸을 세워 구체·파동. 옛 판
    // (웃는 물방울) raw/wisp_old/. 몸 36×34 (sw/bh) — 꼬리 기운까지 캔버스 68.
    n:'대나무 유령불', w:68, h:46, sw:36, bh:34,
    anim:{ idle:['float0','float1','float2','float3'], walk:['float0','float1','float2','float3'],
           atk:['atk0','atk1','atk2','atk3'],       // 손 들기 → 구체 → 파동 → 손끝 잔광
           hit:['hit'], death:['death0','death1'] },   // 녹아내림 → 불꽃만 남음
    fps:{ idle:5, walk:6, atk:7, hit:6, death:3 },
    hp:0.62, dmg:0.78, spd:1.22, range:38,   // 약해서 바짝 붙어야 한다
  },
  panther: {
    // v2.65 재작업 — 사용자 시트(sheets/panther.png 5행, panther.py). 일어서서 할퀴는
    // 공격 컷이 몸의 두 배 높이라 캔버스가 크다 — 몸은 70×40 (sw/bh). 3행 기어가기
    // (prowl0~3)는 뽑아만 두고 안 쓴다. 옛 판 raw/panther_old/.
    n:'그림자 표범', w:158, h:86, sw:70, bh:40, sc:0.72,   // sc: 그리기 배율 (v2.87 "너무 큼" — 몸 70×40 → 50×29)
    anim:{ idle:['idle0','idle1','idle2','idle3'],
           walk:['walk0','walk1','walk2','walk3'],   // 질주
           atk:['atk0','atk1','atk2','atk3'],   // 일어섬 → 도약 → 할큄 → 착지
           hit:['hit'], death:['death0','death1','death2'] },   // 비틀 → 엎어짐 → 쓰러짐
    fps:{ idle:4, walk:10, atk:8, hit:5, death:4 },
    hp:0.78, dmg:1.15, spd:1.45, range:60,   // 도약이 길다
  },
  shaman: {
    // v2.64 재작업 — 사용자 시트 2장(sheets/shaman.png 대기·걷기·주문·피격·죽음,
    // shaman_b.png 지팡이 공격, shaman.py). 옛 판은 지팡이를 추정으로 이어 붙였었다.
    // 주문 컷(cast2)에 기탄이 함께 그려져 캔버스가 넓다 — 몸은 40x50 (sw/bh).
    // 큰 구체 탄 그림 shaman_m2는 옛 시트 것을 그대로 쓴다(50-render).
    n:'대나무 주술사', w:82, h:56, sw:40, bh:50,
    anim:{ idle:['idle0','idle1','idle2','idle3'], walk:['walk0','walk1','walk2','walk3'],
           atk:['cast0','cast1','cast2','cast3'],       // 지팡이 들기 → 구체 빛 → 기탄 발사 → 내림
           skill:['staff0','staff1','staff2','staff3'], // 큰 구체 — 지팡이 들어 내리쳐 뻗으며 쏜다
           hit:['hit'], death:['death0','death1','death2'] },   // 비틀 → 무릎 → 엎어짐
    // skill 4프레임을 시전 시간(skillDur 1.0초)에 맞춘다(4/4=1.0초). atk 4컷은 0.67초.
    fps:{ idle:3.5, walk:6, atk:6, skill:4, hit:5, death:4 },
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
    n:'등딱지벌레', w:76, h:56, sw:58, bh:34, sc:0.74,   // v2.87 "풍뎅이 너무 큼" — 몸 58×34 → 43×25
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
    n:'옥갑충', w:64, h:48, sw:50, bh:36, sc:0.78,   // v2.87 — 등딱지벌레와 같은 체급으로
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
  seed: [0, 10, 16, 21, 24],     // v2.68 24h sim(hpGrow 1.46) 구역 진입 경지: 폐촌 일류3 · 동굴 초절정1 · 설산 화경2 · 천산 현경1
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
                                  Math.pow(MASTERY.lvGrow, artLv(k) - 1) / (1 + sBonus('artcost') / 100));   // 장경각이 깎는다 (v2.91)
const lBonus = sch => (typeof lineageBonus === 'function') ? lineageBonus(sch) : 0;   // 제자 계보 보너스 (v2.92)
const artEff    = k => (1 + MASTERY.lvPer * (artLv(k) - 1))
                     * (1 + MASTERY.effPer * (artStar(k) - 1)) * (1 + lBonus(artDef(k).school) / 100);
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

// 장비 보너스 합 — 68-equip.js. 장비 없이 조립되는 도구 대비 가드.
const eBonus = k => (typeof eqBonus === 'function') ? eqBonus(k) : 0;
// 문파 전각 보너스 합 — 69b-sect.js. 문파 없이 조립되는 도구 대비 가드 (v2.91)
const sBonus = k => (typeof sectBonus === 'function') ? sectBonus(k) : 0;
const artXpGain = () => 1 + sBonus('artxp') / 100;   // 숙련 한 번에 쌓이는 양 — 장경각 (v2.91)
const heroDmg   = ()=> HERO.atkDmg * Math.pow(GROW.dmg, realmLv())
                        * (1 + (statBonus('atk')+tBonus('atk')+eBonus('atk')+sBonus('atk'))/100) * artMul('dmg');
const heroHpMax = ()=> Math.round(HERO.hp * Math.pow(GROW.hp, realmLv())
                        * (1 + (statBonus('hp')+tBonus('hp')+eBonus('hp')+sBonus('hp'))/100) * artMul('hp'));
const heroRegen = ()=> HERO.regen * Math.pow(GROW.regen, realmLv())
                        * (1 + (statBonus('regen')+tBonus('regen')+eBonus('regen')+sBonus('regen'))/100) * artMul('regen');
const heroSpd   = ()=> HERO.spd * (1 + (statBonus('spd')+tBonus('spd')+eBonus('spd')+sBonus('spd'))/100) * artMul('spd');
const heroAtkSpd= ()=> 1 + (statBonus('aspd')+tBonus('aspd')+eBonus('aspd')+sBonus('aspd')) / 100 + (artMul('aspd')-1);   // 공격 동작·간격 (심법 매향심결 등)
const critCh    = ()=> (statBonus('crit')+tBonus('crit')+eBonus('crit')+sBonus('crit')) / 100 + (artMul('crit')-1);
const critMul   = ()=> TRAIN.critMul + (statBonus('cdmg')+tBonus('cdmg')+eBonus('cdmg')+sBonus('cdmg')) / 100;

// 장비 (v2.70 표준형 — 사용자: "기존 방치형 시스템과 다르게 생겼어" → 흔한 틀로).
// 세 자리(무기·방어구·장신구), 16종 × 5등급 = 80종 아이템. 처치 드랍이 주머니(S.inv[종류][등급]
// 개수)에 쌓이고, 같은 아이템 mergeN개를 **합성**(수동, 일괄 합성 버튼)하면 한 등급 위 1개.
// **아이템마다 레벨**(S.itemLv[종류][등급], 은자 강화 — 등급별 상한)이 있고, 장착 효과·보유 효과
// 둘 다 그 레벨을 탄다. **보유 효과**: 얻어 본 아이템(도감 비트)마다 영구 가산 — 그래서 안 끼는
// 낮은 등급도 강화할 이유가 있다(흔한 방치형의 "보유 효과" 루프). 자동 장착 버튼은 자리마다
// 장착 효과가 가장 큰 것을 낀다. 효과는 전부 %(지수 세계에서 고정치는 무의미).
const EQUIP = {
  slots: [
    // 무기 자리 = 무림 무기 체계(사용자 확정 v2.70.3: "권 검 도 창 봉 등 우리가 나눴던 체계"). **권은 한 종류** —
    // 맨주먹 계열의 장비 이름은 게임 관례대로 권갑(拳套). 종류[3] = 아이콘 키(없으면 eq_<종류>). 아이콘 없는
    // 종류는 화면·드랍에서 빠진다(eqKinds) — 권갑 아이콘이 오면 저절로 등장.
    { k:'weapon',  n:'무기',   stat:'atk',  kinds:[['fist','권갑','spd','eq_fist'],['sword','검','crit'],['saber','도','aspd'],['spear','창','cdmg'],['staff','봉','regen'],['fan','부채','gold']] },   // 철구는 뺐고 철선은 부채로(v2.70.4, 사용자)
    { k:'armor',   n:'방어구', stat:'hp',   kinds:[['robe','무복','regen'],['vest','피갑','aspd'],['lamellar','찰갑','hp'],['cloak','도롱이','spd']] },
    // 장신구는 **종류마다 한 자리**(v2.89, 사용자 확정 "종류별로 하나씩 끼는 게 이상한가? → 하자"): 옥패·반지·염주·부적·호리병·비단끈 여섯 자리.
    // perKind — 장착 자리 키가 종류 키(S.equip.pendant …). 스탯은 종류별 프로필(아래 profile), 은자 획득은 공통 부가.
    { k:'trinket', n:'장신구', stat:'gold', perKind:true, kinds:[['pendant','옥패','crit'],['ring','반지','cdmg'],['beads','염주','regen'],['talisman','부적','atk'],['gourd','호리병','hp'],['ribbon','비단끈','spd']] },
  ],
  statName: { atk:'공격력', hp:'체력', regen:'회복', gold:'은자 획득', crit:'치명타', cdmg:'치명 피해', aspd:'공격 속도', spd:'이동 속도' },
  grades: [ { n:'일반', c:'#9aa7b5', base:8,  lvCap:20 },  { n:'고급', c:'#6fd3a8', base:14, lvCap:40 },
            { n:'희귀', c:'#69a8dd', base:22, lvCap:60 },  { n:'영웅', c:'#c58cff', base:32, lvCap:80 },
            { n:'전설', c:'#ffb347', base:45, lvCap:100 },
            // v2.81 (사용자: "전설 다음 두 단계 더") — 신화·초월. 신화는 천산에서만 드물게, 초월은 드랍 없이 합성(신화 3개)으로만.
            { n:'신화', c:'#ff6b81', base:62, lvCap:120 }, { n:'초월', c:'#9df5ff', base:85, lvCap:140 } ],
  gradeW: [[70,25,5,0,0,0,0],[45,35,17,3,0,0,0],[25,38,27,9,1,0,0],[10,30,35,20,5,0,0],[3,20,37,29,10,1,0]],   // 구역별 등급 가중 (7등급)
  dropCh: 0.05,                  // 처치당 드랍 확률
  bossDrop: 1,                   // 보스는 반드시
  mergeN: 3,                     // 같은 것 N개 → 한 등급 위 1개
  // 아이콘 없는 종류는 화면·드랍에서 뺀다(v2.70.2, 사용자: "이미지가 아직 없으면 넣지 말고") —
  // eq_<종류>(또는 kinds[3]) 에셋이 들어오면 저절로 나타난다.
  // 시작 장비(v2.70.2, 사용자: "첫 장비는 주고") — 자리마다 일반 등급 하나. 앞의 것부터 아이콘이 있는 종류를 준다
  // 무기는 권갑만 — 아이콘이 없는 동안은 **무기 없이(맨손) 시작**한다(v2.72.5, 사용자: "첫 시작은 주먹 공격").
  // 검·도 등은 사냥에서 떨어지면 빈 자리에 바로 끼워져 그때부터 그 무기 동작이 된다.
  starter: { weapon:['fist'], armor:['robe'], trinket:['pendant'] },
  subRate: 0.4,                  // 종류별 부가 효과 = 주 효과의 이 비율 (profile이 없는 종류 — 방어구·장신구)
  // 무기별 스탯 조합 (v2.82, 사용자: "무기마다 올려주는 스탯이 특성에 맞게 조금씩 달라도") — 장착 효과(등급×레벨 %)에 곱하는 비율.
  // 합이 1.4~1.6으로 옛 '주 1.0 + 부가 0.4'와 같은 급. 공격력 몫은 0.75~1.1이라 무기 고르는 맛만 내고 진행 속도는 안 흔든다(sim 확인).
  profile: {
    fist:  { atk:0.85, aspd:0.50, spd:0.30 },   // 권갑 — 빠르고 가볍다
    sword: { atk:1.00, crit:0.45 },             // 검 — 정확한 급소
    saber: { atk:1.10, cdmg:0.45 },             // 도 — 묵직한 한 방
    spear: { atk:1.00, crit:0.25, cdmg:0.30 },  // 창 — 찌르기 (사거리 대신 치명 양쪽)
    staff: { atk:0.80, hp:0.45, regen:0.30 },   // 봉 — 지키며 버틴다
    fan:   { atk:0.75, gold:0.50, spd:0.25 },   // 부채 — 풍류, 은자
    // 장신구 6자리(v2.89) — 옛 한 자리(은자 1.0 + 부가 0.4)를 여섯으로 나눈 만큼 각각은 가볍다(주 0.6 + 은자 0.25 = 0.85, 여섯 합 5.1).
    // 여섯을 다 높은 등급으로 채우려면 드랍·합성·강화가 여섯 배 드니 실효 등급은 낮다 — 진행 속도는 sim으로 맞춘다(VERSION v2.89).
    pendant:  { crit:0.60,  gold:0.25 },        // 옥패 — 급소
    ring:     { cdmg:0.60,  gold:0.25 },        // 반지 — 한 방
    beads:    { regen:0.60, gold:0.25 },        // 염주 — 숨 고르기
    talisman: { atk:0.60,   gold:0.25 },        // 부적 — 힘
    gourd:    { hp:0.60,    gold:0.25 },        // 호리병 — 버팀
    ribbon:   { spd:0.60,   gold:0.25 },        // 비단끈 — 발
  },
  codexRate: 0.15,               // 보유 효과 = 그 아이템 장착 효과 × 이 비율 (얻어 본 것 전부, 영구)
  lvPer: 0.03,                   // 레벨 1당 효과 ×(1+0.03·lv) — 전설 100렙 = 4배
  costK: 4, costGrow: 1.06,      // 강화 비용 = 현 단계 처치 은자 × costK × (등급+1) × costGrow^lv
};

// 업적 (v2.90, 사용자: "업적 메뉴 채우기") — 누적형 11종, 단계(tiers)마다 은자 보상. 보상은 현 단계 처치 은자 × rewardMul[단계]
// (늦게 받을수록 커진다 — 받는 재미가 남는 쪽). src 값: 69-achv achvValue()가 읽는 상태 이름. fmt: 값 표기 방식.
// 문파 — 내 문파 세우기 (v2.91, 사용자 "문파 슬슬 만들어봐" · docs/설계-문파.md). 주인공은 어느 문파에도 안 든다(장무기형) —
// **이름 없는 문파(무명문)에서 시작해 이름을 얻는다**. 이름은 플레이어가 짓는다(v2.91.2, 사용자 확정 "추천으로 가자, 기본은 무명문"). 1층 **전각 5채**(은자 sink, 레벨당 영구 %) + **명성**(처치·보스·업적으로 쌓여 전각 상한을 연다).
// 제자(방치 수익·계보 보너스)·문파 본진 비무는 v2.92~. 효과 키: atk/hp/regen/aspd/gold는 수련과 같은 자리에 합산(sBonus),
// artxp=숙련 획득 +%, artcost=연마 비용 나눔(1/(1+lv·x%)), downcut=쓰러짐 회복 시간 나눔, fame=명성 획득 +%.
const SECT = {
  name: '무명문', han: '無名門',        // 기본 이름 — 명성 '무명'과 맞물린다("무명문이 천하제일이 됐다"). 직접 지으면 S.sectName(한자 없음)
  nameMax: 8,                            // 이름 글자 수 상한
  halls: [
    { k:'yard',    n:'연무장', h:'演武場', d:'권각을 겨루는 마당 — 손이 매워지고 빨라진다',   eff:{ atk:1.5, aspd:0.5 },            cb:120, cg:1.32 },
    { k:'library', n:'장경각', h:'藏經閣', d:'비급을 모은 서고 — 무공이 손에 빨리 익는다',     eff:{ artxp:4, artcost:1.5 },         cb:150, cg:1.32 },
    { k:'clinic',  n:'약방',   h:'藥房',   d:'상처를 다스리는 곳 — 몸이 단단해지고 빨리 깬다', eff:{ hp:1.5, regen:2, downcut:2 },   cb:120, cg:1.32 },
    { k:'guest',   n:'객당',   h:'客堂',   d:'손님과 제자를 맞는 큰 방 — 제자 자리가 늘고 벌이가 는다', eff:{ yield:3, gold:0.4 },        cb:200, cg:1.34 },
    { k:'gate',    n:'산문',   h:'山門',   d:'문파의 얼굴 — 이름이 멀리 퍼진다',              eff:{ gold:0.8, fame:3 },             cb:100, cg:1.30 },
  ],
  // 명성 — 단계마다 전각 상한(cap)이 열린다. need는 누적 명성
  fame: {
    tiers: [ { n:'무명', h:'無名', need:0,     cap:5  }, { n:'향리', h:'鄕里', need:500,   cap:15 }, { n:'일방', h:'一方', need:4000,  cap:30 },
             { n:'명문', h:'名門', need:25000, cap:50 }, { n:'천하제일', h:'天下第一', need:150000, cap:80 } ],   // 첫 안 400/2500/12000/60000은 8h sim에 2시간 만에 명문 — 명문은 반나절, 천하제일은 며칠 걸리게
    kill: 1,                      // 처치 1마리
    killGrow: 1.06,               // 전역 단계마다 × (깊이 갈수록 이름이 더 퍼진다 — 은자 1.22보다 완만)
    boss: 60, bossFirst: 240,     // 보스 처치 · 첫 격파 추가
    achv: 30,                     // 업적 한 단계 받기
  },
  effName: { atk:'공격력', aspd:'공격 속도', hp:'체력', regen:'회복', gold:'은자 획득', artxp:'숙련 획득', artcost:'연마 비용', downcut:'회복 시간', fame:'명성 획득', yield:'문파 수익' },
  // 2층 제자 (v2.92) — 합류는 인연(기연 '입문 청'·명성 단계·(v2.93) 본진 비무), 육성 없음. 자질이 곧 값:
  // 수익 = 지금 사냥터 초당 전투 수입(killSilver/offKillTime) × yieldRate × 자질 yield, 계보 보너스 = 그 계보 무공 효과 +bonus%
  disciple: {
    talents: [ { n:'하', h:'下', yield:0.6, bonus:2 }, { n:'중', h:'中', yield:1.0, bonus:4 }, { n:'상', h:'上', yield:1.6, bonus:7 }, { n:'천', h:'天', yield:2.6, bonus:12 } ],
    talentW: [ [70,26,4,0], [50,36,12,2], [30,42,22,6], [15,40,33,12], [5,30,40,25] ],   // 명성 단계별 자질 가중치(하·중·상·천)
    slotsByFame: [1, 2, 3, 4, 6],   // 명성 단계별 기본 자리
    guestPer: 10,                   // 객당 10레벨당 자리 +1
    yieldRate: 0.07,                // 제자 하나(자질 중)의 초당 수익 = 전투 수입의 7% — 셋이면 약 20% (설계 목표)
    offRate: 0.7,                   // 오프라인 효율(다른 정산과 같다)
    lineages: ['sorim','mudang','hwasan','ami','gaebang','dangmun','magyo','bamboo'],
    surnames: ['장','왕','이','진','조','유','곽','백','남궁','모용','사마','당','소','한','임','위'],
    givens:   ['소천','무연','청하','운학','서린','도현','명월','자강','현우','설아','태산','비연','문성','가람','휘','연화','철심','수연','백호','단비','지훈','미르','하늘','도경'],
    say: ['사부님, 오늘도 한 수 가르쳐 주십시오', '마당을 쓸어 두었습니다', '오늘은 목검을 백 번 휘둘렀습니다', '사부님의 등을 보고 배웁니다', '언젠가 강호에 나가 문파 이름을 떨치겠습니다', '수련이 끝나면 차를 올리겠습니다'],
    bubbleSec: 2.6,                 // 말풍선 표시 시간
  },
  // 문파 터 화면 (v2.92) — 문파 탭을 열면 전투 대신 그린다. 위치는 화면 비율(VW·VH)
  scene: {
    halls: { library:[0.18,0.37], gate:[0.50,0.35], clinic:[0.82,0.37], yard:[0.30,0.51], guest:[0.70,0.51] },   // v2.92.1 시트가 얇아져 마당을 아래로 넓힘
    hero: [0.50, 0.58],
    yardX: [0.08, 0.92], yardY: [0.43, 0.60],   // 제자가 거니는 띠
    walkSpd: 22, discScale: 0.86,                // 제자 걸음(px/s)·배율(주인공보다 조금 작게)
    stageLv: [1, 6, 20],                         // 전각 단계 문턱(Lv) — 터·초가·기와 (시트가 오면 hall_<k>_<0|1|2>)
    sheetH: 0.36,                                // 아래 시트 높이(패널 영역 비율) — v2.92.1 전각 카드가 팝업으로 나가 얇게
  },
};
const ACHV = {
  list: [
    { k:'kills',  n:'백인참',   d:'적을 쓰러뜨린다',            src:'totalKills', tiers:[100, 1000, 10000, 100000, 1000000] },
    { k:'boss',   n:'수호자 격파', d:'구역 보스를 처음 꺾는다',   src:'bosses',     tiers:[1, 2, 3, 4, 5] },
    { k:'realm',  n:'경지',     d:'경지에 오른다',              src:'realm',      tiers:[4, 8, 12, 20, 28, 36], fmt:'realm' },
    { k:'zone',   n:'천하 유람', d:'새 사냥터에 발을 들인다',    src:'unlocked',   tiers:[2, 3, 4, 5] },
    { k:'codex',  n:'장비 도감', d:'장비를 얻어 본다',           src:'codex',      tiers:[10, 30, 60, 90, 112] },
    { k:'grade',  n:'명품',     d:'높은 등급 장비를 낀다',       src:'grade',      tiers:[2, 3, 4, 5, 6], fmt:'grade' },
    { k:'merge',  n:'단조',     d:'장비를 합성한다',            src:'merges',     tiers:[1, 30, 100, 500] },
    { k:'level',  n:'연마',     d:'장비를 강화한다',            src:'levels',     tiers:[1, 50, 200, 1000] },
    { k:'arts',   n:'박학',     d:'무공을 익힌다',              src:'arts',       tiers:[1, 3, 6, 10] },
    { k:'fate',   n:'기연',     d:'기연을 만난다',              src:'fates',      tiers:[1, 5, 15, 40] },
    { k:'downs',  n:'칠전팔기', d:'쓰러져도 일어선다',           src:'downs',      tiers:[1, 10, 50, 200] },
  ],
  rewardMul: [8, 25, 70, 200, 600, 1500],      // 단계별 보상 = 처치 은자 × 이 값 (v2.90 첫 안 30~4000은 4h 진행을 한 단계 당겼다 → 1/3~1/4)
  checkSec: 1,                                 // 달성 알림 검사 주기(초)
  toastSec: 2.8,                               // 보상 토스트 표시 시간(초) — 1.8은 "빨리 사라짐"(v2.90.2)
};

// 은자 — 첫 재화. 처치 드랍 + 보스 첫 격파 + 오프라인 정산.
// ※ 수치는 임시. 쓸 곳(심법)이 들어오면 sim으로 다시 잡는다.
const SILVER = {
  base:     3,                   // 1단계 한 마리
  grow:     1.22,                // 단계당 배율 — 깊이 갈수록 벌이가 는다
  bossKill: 10,                  // 보스는 잡몹 드랍의 몇 배인가
  firstMul: 50,                  // 보스 첫 격파 보너스 = 처치 드랍 × 이 값
};
const killSilver = ()=> Math.round(SILVER.base * Math.pow(SILVER.grow, gstage()-1)
                                   * (1 + (statBonus('gold')+tBonus('gold')+eBonus('gold')+sBonus('gold'))/100));

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
  art: { scroll:'book', elixir:'herb', master:'hermit', frag:'frag' },   // 카드 일러스트 키(fate_*)
  pool: [
    { k:'scroll', n:'낡은 비급',   d:'바위 틈에서 손때 묻은 책이 나왔다' },
    { k:'elixir', n:'천년 영약',   d:'달빛 아래 향긋한 열매가 익어 있었다' },
    { k:'master', n:'은거기인',    d:'지나가던 노인이 걸음을 멈추고 웃었다' },
    { k:'frag',   n:'실전 비급 조각', d:'찢어진 책장이 바람에 날아와 붙었다' },
    { k:'disciple', n:'입문 청', d:'젊은이가 길에 무릎을 꿇고 제자로 받아 달라 청했다' },   // 문파 제자 (v2.92) — 자리가 있을 때만 섞인다
  ],
};
const karmaNeed  = ()=> Math.round(FATE.needBase * Math.pow(FATE.needGrow, S.fates));
const killKarmaAt = ()=> Math.pow(FATE.killGrow, gstage()-1);

// 저장 — 껐다 켜도 이어진다. 방치형의 최소 조건.
const SAVE = {
  key: 'wuxia1',                 // localStorage 키
  ver: 1,                        // 구조가 바뀌면 올린다 (다르면 버리고 새로 시작)
  every: 10,                     // 자동 저장 간격(초)
  codeTag: 'WX1.',               // 저장 코드 머리표 — 붙여넣은 글이 우리 코드인지 가른다 (v2.90.2)
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
