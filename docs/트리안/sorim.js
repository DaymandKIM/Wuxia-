// 소림 少林 스킬트리 — #d8a84a(금), 강맹한 외공·불문(강기/방어/체력/광역).
// 형식·어휘는 docs/설계-스킬트리.md 계약을 따른다. 노드 24개.
const sorimNodes = [
  { id:'s0', x:180, y:44, k:'root', need:[], g:'', n:'입문', h:'入門', c:0,
    eff:{ hp:3 }, d:'소림사에 입문하여 첫 숨을 고른다 · <span class="eff">체력 +3%</span>' },

  { id:'s1', x:100, y:114, k:'minor', need:['s0'], g:'', n:'웅혼결', h:'雄渾訣', c:1,
    eff:{ atk:6 }, d:'주먹에 웅혼한 기운이 실린다 · <span class="eff">공격력 +6%</span>' },
  { id:'s2', x:260, y:114, k:'minor', need:['s0'], g:'', n:'반석보', h:'磐石步', c:1,
    eff:{ hp:6 }, d:'반석처럼 딛고 선다 · <span class="eff">체력 +6%</span>' },

  { id:'s3', x:60, y:184, k:'minor', need:['s1'], g:'', n:'조식결', h:'調息訣', c:1,
    eff:{ regen:6 }, d:'숨을 고르는 첫 갈래 · <span class="eff">회복 +6%</span>' },
  { id:'s4', x:180, y:184, k:'minor', need:['s1','s2'], g:'', n:'철갑결', h:'鐵甲訣', c:1,
    eff:{ hp:7 }, d:'살갗 아래 쇠가 자란다 · <span class="eff">체력 +7%</span>' },
  { id:'s5', x:300, y:184, k:'minor', need:['s2'], g:'', n:'복호결', h:'伏虎訣', c:1,
    eff:{ atk:7 }, d:'범을 엎드리게 하는 힘 · <span class="eff">공격력 +7%</span>' },

  { id:'s6', x:100, y:254, k:'minor', need:['s3','s4'], g:'', n:'선정결', h:'禪定訣', c:1,
    eff:{ regen:7 }, d:'선정에 들어 숨이 깊어진다 · <span class="eff">회복 +7%</span>' },
  { id:'s7', x:260, y:254, k:'minor', need:['s4','s5'], g:'', n:'발경결', h:'發勁訣', c:1,
    eff:{ atk:8 }, d:'기운을 터뜨려 주먹에 싣는다 · <span class="eff">공격력 +8%</span>' },

  { id:'s8', x:40, y:324, k:'minor', need:['s6'], g:'', n:'금강보', h:'金剛步', c:1,
    eff:{ hp:8 }, d:'금강처럼 무거운 걸음 · <span class="eff">체력 +8%</span>' },
  { id:'s18', x:180, y:324, k:'major', need:['s6','s7'], g:'拳', n:'파공권', h:'破空拳', c:3,
    eff:{ art:'pagong' }, d:'주먹 기운이 허공을 갈라 날아간다 · <span class="eff">초식 파공권 습득</span>' },
  { id:'s9', x:320, y:324, k:'minor', need:['s7'], g:'', n:'항마결', h:'降魔訣', c:1,
    eff:{ artPower:8 }, d:'마를 누르는 기세 · <span class="eff">초식 위력 +8%</span>' },

  { id:'s10', x:100, y:394, k:'minor', need:['s8','s18'], g:'', n:'부동심결', h:'不動心訣', c:1,
    eff:{ passiveAmp:8 }, d:'흔들리지 않는 심지 · <span class="eff">심법 효과 +8%</span>' },
  { id:'s11', x:260, y:394, k:'minor', need:['s18','s9'], g:'', n:'금강지결', h:'金剛指訣', c:1,
    eff:{ artPower:9 }, d:'손끝에 금강의 굳기가 실린다 · <span class="eff">초식 위력 +9%</span>' },

  { id:'s12', x:60, y:464, k:'minor', need:['s10'], g:'', n:'철골결', h:'鐵骨訣', c:1,
    eff:{ hp:9 }, d:'뼈마디가 쇠처럼 단단해진다 · <span class="eff">체력 +9%</span>' },
  { id:'s13', x:180, y:464, k:'minor', need:['s10','s11'], g:'', n:'진각결', h:'震脚訣', c:1,
    eff:{ atk:9 }, d:'땅을 울리는 발구름 · <span class="eff">공격력 +9%</span>' },
  { id:'s14', x:300, y:464, k:'minor', need:['s11'], g:'', n:'불심결', h:'佛心訣', c:1,
    eff:{ regen:9 }, d:'자비로운 마음이 기운을 돌린다 · <span class="eff">회복 +9%</span>' },

  // 신규 액티브 — 그림·연출은 파공권 시전 동작(cast)·정권 스트립(katka/katkb)을
  // 그대로 재사용하는 절차 초식으로 제안(그림 병목 회피, docs/설계-스킬트리.md 방침).
  { id:'s19', x:180, y:534, k:'major', need:['s12','s13','s14'], g:'破', n:'금강파산권', h:'金剛破山拳', c:3,
    eff:{ art:'geumgang', newArt:{ k:'geumgang', n:'금강파산권', h:'金剛破山拳', type:'active',
      school:'sorim', need:16, cost:16000, d:'금강처럼 굳은 주먹이 산을 무너뜨린다',
      cd:11, mul:4.5, range:90 } },
    d:'금강처럼 굳은 주먹이 산을 무너뜨린다 · <span class="eff">신규 초식 금강파산권 습득</span>' },

  { id:'s15', x:100, y:604, k:'minor', need:['s19'], g:'', n:'금강력결', h:'金剛力訣', c:1,
    eff:{ atk:10 }, d:'금강의 힘이 팔뚝에 감돈다 · <span class="eff">공격력 +10%</span>' },
  { id:'s16', x:260, y:604, k:'minor', need:['s19'], g:'', n:'나한보', h:'羅漢步', c:1,
    eff:{ hp:10 }, d:'나한의 굳건한 자세 · <span class="eff">체력 +10%</span>' },

  { id:'s20', x:180, y:674, k:'major', need:['s15','s16'], g:'降', n:'항마진경', h:'降魔眞經', c:3,
    eff:{ art:'hangma', newArt:{ k:'hangma', n:'항마진경', h:'降魔眞經', type:'passive',
      school:'sorim', need:21, cost:42000, d:'마를 항복시키는 경으로 몸이 금강처럼 굳는다',
      hp:0.18, dmg:0.12 } },
    d:'마를 항복시키는 경으로 몸이 금강처럼 굳는다 · <span class="eff">신규 심법 항마진경 습득</span>' },

  { id:'s17', x:180, y:744, k:'minor', need:['s20'], g:'', n:'금강불파결', h:'金剛不破訣', c:1,
    eff:{ hp:12 }, d:'무엇으로도 부서지지 않는다 · <span class="eff">체력 +12%</span>' },

  { id:'s21', x:100, y:814, k:'keystone', need:['s13','s17'], g:'剛', n:'금강불괴신공', h:'金剛不壞神功', c:5,
    eff:{ keystone:'geumgangbulgoe', hp:35, spd:-10 },
    d:'몸이 금강처럼 굳어 무너지지 않는다 · <span class="eff">체력 +35%</span>, 대신 <span class="eff">이동 -10%</span>' },
  { id:'s23', x:260, y:814, k:'cross', need:['s14','s20'], g:'濟', n:'강유상제결', h:'剛柔相濟訣', c:4,
    eff:{ cross:'mudang', crossNode:'m5', atk:15, regen:10 },
    d:'강맹함과 유함이 서로를 이룬다 — 무당과 통하는 이치 · <span class="eff">공격력 +15%</span>, <span class="eff">회복 +10%</span>' },

  { id:'s22', x:180, y:884, k:'keystone', need:['s21','s23'], g:'伏', n:'복마대력공', h:'伏魔大力功', c:5,
    eff:{ keystone:'bokmadaeryeok', artPower:30, aspd:-8 },
    d:'마를 굴복시키는 크나큰 힘 — 무겁지만 확실하다 · <span class="eff">초식 위력 +30%</span>, 대신 <span class="eff">공격 속도 -8%</span>' },
];

/* 신규무공 제안:
  1) geumgang '금강파산권'(金剛破山拳, active, school:sorim, need:16, cost:16000,
     cd:11, mul:4.5, range:90) — 파공권보다 사거리는 짧고 배수가 큰 근접 강타.
     연출: 신규 그림 없이 파공권 시전 스트립(HFX.cast.pagong)과 정권 교대 타격
     (katka/katkb)을 그대로 태우는 절차 초식으로 제안 — 그림 병목 회피.
  2) hangma '항마진경'(降魔眞經, passive, school:sorim, need:21, cost:42000,
     hp:0.18, dmg:0.12) — 심법. 연출 없음(패시브라 그림 불필요), artMul('hp')·
     artMul('dmg')에 그대로 합산.
  둘 다 최종 채택은 사람 확인 후(그림·밸런스는 sim.js spend()에 트리 할당까지
  반영해야 확정).
*/
