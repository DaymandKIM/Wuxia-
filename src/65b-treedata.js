/* 생성물 — docs/트리안 초안 통합(v2.47)
   7문파(소림·무당·화산·아미·개방·당문·마교) 스킬트리 초안을 검수해
   하나로 묶었다. bamboo(청죽문)는 66-tree.js의 기존 TREE.bamboo를 그대로
   옮겼다. 정리 내용:
   - eff 어휘는 전부 docs/설계-스킬트리.md 표 안의 키만 쓴다(초안에 위반 없었음).
   - 교차(cross) 노드는 엔진(66-tree.js treeNeedOk)이 n.cross/n.crossNode를
     eff가 아닌 **노드 최상위**에서 읽는다 — eff 안에 넣은 초안(무당 제외)은
     교차 조건이 조용히 무시되는 버그라 전부 최상위로 옮기고, placeholder
     (m5·s_gangyu·b0·b_castspd·d1·d7·TBD)를 상대 문파의 **마지막 키스톤
     실제 id**로 교정했다.
   - 심법(passive) 신규무공 노드는 eff를 {art:k}로 단순화하고(인라인 newArt
     스펙은 docs/트리안/신규무공.md로 옮김), 액티브 신규무공 노드는 그림
     병목으로 보류하고 eff를 패시브 %(artPower:12)로 임시 대체했다 — 각각
     노드 옆에 표시. */

const TREEDATA = {
  bamboo: [
    { id:'b0', x:180,y:44, k:'root', g:'竹', n:'청죽 입문', h:'靑竹入門', c:0, eff:{},
      d:'<span class="eff">청죽문의 길이 열린다.</span> 여기서 가지가 뻗어 나간다.' },
    { id:'b1', x:96, y:120, k:'minor', n:'죽엽 보법', h:'竹葉步', c:1, need:['b0'], eff:{castSpd:6},
      d:'<span class="eff">시전 속도 +6%</span> · 잎을 밟듯 가벼이 선다.' },
    { id:'b2', x:264,y:120, k:'minor', n:'청죽 호흡', h:'靑竹吐納', c:1, need:['b0'], eff:{passiveAmp:8},
      d:'<span class="eff">심법 효과 +8%</span> · 곧게 숨을 고른다.' },
    { id:'b3', x:52, y:196, k:'minor', n:'경신 소보', h:'輕身小步', c:1, need:['b1'], eff:{spd:6},
      d:'<span class="eff">이동 속도 +6%</span>' },
    { id:'b4', x:180,y:196, k:'major', g:'竹', n:'청죽공', h:'靑竹功', c:2, need:['b1','b2'], eff:{art:'chulwoo'},
      d:'<span class="eff">심법</span> · 지닌 채 싸우면 내공이 는다. 청죽문의 본(本).' },
    { id:'b5', x:308,y:196, k:'minor', n:'죽로 조식', h:'竹露調息', c:1, need:['b2'], eff:{regen:7},
      d:'<span class="eff">회복 +7%</span>' },
    { id:'b6', x:96, y:272, k:'minor', n:'청강결', h:'靑剛訣', c:1, need:['b3','b4'], eff:{artPower:7},
      d:'<span class="eff">초식 위력 +7%</span>' },
    { id:'b7', x:264,y:272, k:'minor', n:'죽운결', h:'竹韻訣', c:1, need:['b4','b5'], eff:{cdr:6},
      d:'<span class="eff">초식 재사용 -6%</span>' },
    { id:'b8', x:44, y:348, k:'minor', n:'예풍결', h:'銳風訣', c:1, need:['b6'], eff:{crit:5},
      d:'<span class="eff">치명 확률 +5%</span>' },
    { id:'b9', x:180, y:348, k:'minor', n:'죽심 단련', h:'竹心鍛', c:1, need:['b6','b7'], eff:{hp:8},
      d:'<span class="eff">체력 +8%</span>' },
    { id:'b10',x:316,y:348, k:'minor', n:'질풍결', h:'疾風訣', c:1, need:['b7'], eff:{aspd:5},
      d:'<span class="eff">공격 속도 +5%</span>' },
    { id:'b11',x:96, y:424, k:'minor', n:'경죽 권세', h:'勁竹拳勢', c:1, need:['b8','b9'], eff:{atk:7},
      d:'<span class="eff">공격력 +7%</span>' },
    { id:'b12',x:264,y:424, k:'minor', n:'유엽 조식', h:'柔葉調息', c:1, need:['b9','b10'], eff:{castSpd:6},
      d:'<span class="eff">시전 속도 +6%</span>' },
    { id:'b13',x:56, y:500, k:'minor', n:'죽뢰결', h:'竹雷訣', c:1, need:['b11'], eff:{artPower:8},
      d:'<span class="eff">초식 위력 +8%</span>' },
    { id:'b14',x:180,y:500, k:'minor', n:'만죽 심법', h:'萬竹心法', c:2, need:['b11','b12'], eff:{passiveAmp:10},
      d:'<span class="eff">심법 효과 +10%</span> · 대숲이 바람을 머금듯.' },
    { id:'b15',x:304,y:500, k:'minor', n:'청죽 조식', h:'靑竹調息', c:1, need:['b12'], eff:{regen:8},
      d:'<span class="eff">회복 +8%</span>' },
    { id:'b16',x:112,y:576, k:'minor', n:'죽영결', h:'竹影訣', c:1, need:['b13','b14'], eff:{cdr:7},
      d:'<span class="eff">초식 재사용 -7%</span>' },
    { id:'b17',x:248,y:576, k:'minor', n:'죽화결', h:'竹華訣', c:1, need:['b14','b15'], eff:{crit:6},
      d:'<span class="eff">치명 확률 +6%</span>' },
    { id:'b18',x:180,y:656, k:'keystone', g:'萬', n:'청죽만리', h:'靑竹萬里', c:3, need:['b16','b17'],
      eff:{artPower:40, spd:-10},
      d:'<span class="eff">비전</span> · 초식 위력 +40%. 그 대신 몸놀림이 무거워진다(이동 −10%).' },
  ],

  // ── 소림 少林 #d8a84a 금 — 강맹한 외공·불문. 강기/방어/체력. ──────
  sorim: [
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

    // 신규 액티브 '금강파산권'은 그림·연출 병목으로 보류 — docs/트리안/신규무공.md 참고.
    // TODO 액티브 금강파산권(원안 school:sorim need:16 cost:16000 cd:11 mul:4.5 range:90) — 보류 동안 패시브 %로 대체
    { id:'s19', x:180, y:534, k:'major', need:['s12','s13','s14'], g:'破', n:'금강파산권', h:'金剛破山拳', c:3,
      eff:{ artPower:12 },
      d:'금강처럼 굳은 주먹이 산을 무너뜨린다 · <span class="eff">초식 위력 +12%</span>(신규 초식 보류 — 임시 패시브)' },

    { id:'s15', x:100, y:604, k:'minor', need:['s19'], g:'', n:'금강력결', h:'金剛力訣', c:1,
      eff:{ atk:10 }, d:'금강의 힘이 팔뚝에 감돈다 · <span class="eff">공격력 +10%</span>' },
    { id:'s16', x:260, y:604, k:'minor', need:['s19'], g:'', n:'나한보', h:'羅漢步', c:1,
      eff:{ hp:10 }, d:'나한의 굳건한 자세 · <span class="eff">체력 +10%</span>' },

    // 신규 심법 '항마진경' — docs/트리안/신규무공.md의 ARTS 표에 등록. 여기선 art 습득만.
    { id:'s20', x:180, y:674, k:'major', need:['s15','s16'], g:'降', n:'항마진경', h:'降魔眞經', c:3,
      eff:{ art:'hangma' },
      d:'마를 항복시키는 경으로 몸이 금강처럼 굳는다 · <span class="eff">신규 심법 항마진경 습득</span>' },

    { id:'s17', x:180, y:744, k:'minor', need:['s20'], g:'', n:'금강불파결', h:'金剛不破訣', c:1,
      eff:{ hp:12 }, d:'무엇으로도 부서지지 않는다 · <span class="eff">체력 +12%</span>' },

    { id:'s21', x:100, y:814, k:'keystone', need:['s13','s17'], g:'剛', n:'금강불괴신공', h:'金剛不壞神功', c:5,
      eff:{ keystone:'geumgangbulgoe', hp:35, spd:-10 },
      d:'몸이 금강처럼 굳어 무너지지 않는다 · <span class="eff">체력 +35%</span>, 대신 <span class="eff">이동 -10%</span>' },
    // 교차: 무당(강유상제) — crossNode는 무당의 마지막 키스톤 'm20'(유능제강)
    { id:'s23', x:260, y:814, k:'cross', need:['s14','s20'], g:'濟', n:'강유상제결', h:'剛柔相濟訣', c:4,
      cross:'mudang', crossNode:'m20',
      eff:{ atk:15, regen:10 },
      d:'강맹함과 유함이 서로를 이룬다 — 무당과 통하는 이치 · <span class="eff">공격력 +15%</span>, <span class="eff">회복 +10%</span>' },

    { id:'s22', x:180, y:884, k:'keystone', need:['s21','s23'], g:'伏', n:'복마대력공', h:'伏魔大力功', c:5,
      eff:{ keystone:'bokmadaeryeok', artPower:30, aspd:-8 },
      d:'마를 굴복시키는 크나큰 힘 — 무겁지만 확실하다 · <span class="eff">초식 위력 +30%</span>, 대신 <span class="eff">공격 속도 -8%</span>' },
  ],

  // ── 무당 武當 #9fc4e8 청 — 유(柔)·원(圓)·내공. 반격/회복/시전속도. ──
  mudang: [
    { id:'m0', x:180, y:44,  k:'root', need:[],
      g:'武', n:'무당입문', h:'武當入門', c:0,
      eff:{ regen:5 },
      d:'무당의 문에 들어 첫 숨을 고른다 · <span class="eff">회복 +5%</span>' },

    { id:'m1', x:110, y:114, k:'minor', need:['m0'],
      g:'', n:'토납결', h:'吐納訣', c:1,
      eff:{ regen:6 },
      d:'숨을 뱉고 들이며 기운을 고른다 · <span class="eff">회복 +6%</span>' },
    { id:'m2', x:250, y:114, k:'minor', need:['m0'],
      g:'', n:'원류보', h:'圓流步', c:1,
      eff:{ castSpd:6 },
      d:'걸음이 둥글게 흘러 다음 수가 빨라진다 · <span class="eff">시전 속도 +6%</span>' },

    { id:'m3', x:180, y:184, k:'minor', need:['m1','m2'],
      g:'', n:'유혼결', h:'柔魂訣', c:2,
      eff:{ cdr:6 },
      d:'부드러움이 틈을 메워 다음 초식이 당겨진다 · <span class="eff">재사용 -6%</span>' },

    { id:'m4', x:100, y:254, k:'minor', need:['m3'],
      g:'', n:'현빈공', h:'玄牝功', c:1,
      eff:{ regen:7 },
      d:'텅 빈 곳에서 기운이 새로 솟는다 · <span class="eff">회복 +7%</span>' },
    { id:'m5', x:260, y:254, k:'minor', need:['m3'],
      g:'', n:'태극결', h:'太極訣', c:2,
      eff:{ passiveAmp:8 },
      d:'음양이 맞물려 심법의 흐름이 깊어진다 · <span class="eff">심법 효과 +8%</span>' },
    { id:'m22', x:30, y:254, k:'minor', need:['m4'],
      g:'', n:'유수보', h:'流水步', c:1,
      eff:{ aspd:7 },
      d:'물 흐르듯 손이 끊이지 않는다 · <span class="eff">공격 속도 +7%</span>' },
    { id:'m23', x:330, y:254, k:'minor', need:['m5'],
      g:'', n:'유체결', h:'柔體訣', c:1,
      eff:{ hp:8 },
      d:'부드러운 몸은 쉬이 상하지 않는다 · <span class="eff">체력 +8%</span>' },

    { id:'m6', x:180, y:324, k:'major', need:['m4','m5'],
      g:'混', n:'혼원일기공', h:'混元一氣功', c:3,
      eff:{ art:'honwon' },
      d:'흩어진 기운이 하나로 돈다 · <span class="eff">심법 습득</span>' },

    { id:'m7', x:100, y:394, k:'minor', need:['m6'],
      g:'', n:'양생결', h:'養生訣', c:1,
      eff:{ regen:8 },
      d:'몸을 기르는 오랜 습관 · <span class="eff">회복 +8%</span>' },
    { id:'m8', x:260, y:394, k:'minor', need:['m6'],
      g:'', n:'원융보', h:'圓融步', c:1,
      eff:{ castSpd:8 },
      d:'막힘 없이 둥글게 돈다 · <span class="eff">시전 속도 +8%</span>' },

    { id:'m9', x:180, y:464, k:'minor', need:['m7','m8'],
      g:'', n:'허실결', h:'虛實訣', c:2,
      eff:{ cdr:8 },
      d:'비어 있으되 가득하다 · <span class="eff">재사용 -8%</span>' },

    { id:'m10', x:100, y:534, k:'minor', need:['m9'],
      g:'', n:'무상심결', h:'無相心訣', c:2,
      eff:{ passiveAmp:10 },
      d:'형상을 넘어선 깨달음 · <span class="eff">심법 효과 +10%</span>' },
    { id:'m11', x:260, y:534, k:'minor', need:['m9'],
      g:'', n:'유운수', h:'流雲手', c:1,
      eff:{ aspd:8 },
      d:'구름처럼 손이 끊이지 않는다 · <span class="eff">공격 속도 +8%</span>' },

    // 신규 액티브 '태극환장'은 그림·연출 병목으로 보류 — docs/트리안/신규무공.md 참고.
    // TODO 액티브 태극환장(원안 school:mudang need:18 cost:20000 cd:11 mul:2.8 range:82 kb:true) — 보류 동안 패시브 %로 대체
    { id:'m12', x:180, y:604, k:'major', need:['m10','m11'],
      g:'還', n:'태극환장', h:'太極還掌', c:3,
      eff:{ artPower:12 },
      d:'원을 그리듯 다가온 힘을 흘려 후려친다 · <span class="eff">초식 위력 +12%</span>(신규 초식 보류 — 임시 패시브)' },

    { id:'m13', x:100, y:674, k:'minor', need:['m12'],
      g:'', n:'조식결', h:'調息訣', c:1,
      eff:{ regen:9 },
      d:'호흡을 고르는 오랜 수련 · <span class="eff">회복 +9%</span>' },
    { id:'m14', x:260, y:674, k:'minor', need:['m12'],
      g:'', n:'선기보', h:'仙氣步', c:1,
      eff:{ castSpd:9 },
      d:'신선의 기운이 걸음에 실린다 · <span class="eff">시전 속도 +9%</span>' },

    { id:'m15', x:180, y:744, k:'major', need:['m13','m14'],
      g:'虛', n:'태허진경', h:'太虛眞經', c:4,
      eff:{ art:'taeheo' },
      d:'비어 있어 오히려 가득하다 · <span class="eff">심법 습득</span>' },

    { id:'m16', x:100, y:814, k:'minor', need:['m15'],
      g:'', n:'대허결', h:'大虛訣', c:2,
      eff:{ passiveAmp:12 },
      d:'크게 비워 심법이 넘실댄다 · <span class="eff">심법 효과 +12%</span>' },
    { id:'m17', x:260, y:814, k:'minor', need:['m15'],
      g:'', n:'무극보', h:'無極步', c:2,
      eff:{ cdr:10 },
      d:'끝이 없는 걸음이라 다음 수가 늘 가깝다 · <span class="eff">재사용 -10%</span>' },

    { id:'m18', x:180, y:884, k:'minor', need:['m16','m17'],
      g:'', n:'환원결', h:'還元訣', c:2,
      eff:{ regen:10 },
      d:'모든 기운이 근원으로 돌아온다 · <span class="eff">회복 +10%</span>' },

    { id:'m19', x:120, y:954, k:'keystone', need:['m18'],
      g:'圓', n:'태극양의', h:'太極兩儀', c:5,
      eff:{ keystone:'taegeuk_yangui', passiveAmp:35, artPower:-15 },
      d:'심법의 두 기운이 맞물려 극에 달한다 · <span class="eff">심법 효과 +35%</span>, 다만 <span class="eff">초식 위력 -15%</span>(유가 강을 대신한다)' },
    { id:'m20', x:240, y:954, k:'keystone', need:['m18'],
      g:'柔', n:'유능제강', h:'柔能制剛', c:5,
      eff:{ keystone:'yuneung_jegang', hp:30, spd:-8 },
      d:'부드러움이 굳셈을 이긴다 · <span class="eff">체력 +30%</span>, 다만 <span class="eff">이동 -8%</span>(무게 중심을 낮춘다)' },

    // 교차: 소림(강유상제) — crossNode는 소림의 마지막 키스톤 's22'(복마대력공)
    { id:'m21', x:180, y:1024, k:'cross', need:['m19','m20'],
      g:'濟', n:'강유상제', h:'剛柔相濟', c:4,
      cross:'sorim', crossNode:'s22',
      eff:{ keystone:'gangyu_sangje', atk:15, regen:15 },
      d:'강함과 부드러움이 서로를 채운다 · <span class="eff">공격 +15%</span>, <span class="eff">회복 +15%</span>(소림 강유상제결 노드와 연결)' },
  ],

  // ── 화산 華山 #e89aad 홍 — 매화 장/지/권. 치명/속도. ──────────────
  hwasan: [
    { id:'h0', x:180, y:44,  k:'root', need:[],
      g:'華', n:'화산입문', h:'華山入門', c:0,
      eff:{ spd:3 },
      d:'화산의 문턱을 넘는다 — <span class="eff">이동 +3%</span>, 몸놀림이 한결 가벼워진다' },

    { id:'h1', x:100, y:114, k:'minor', need:['h0'],
      g:'', n:'매섬결', h:'梅閃訣', c:1,
      eff:{ crit:6 },
      d:'매화잎이 스치듯 빈틈을 노린다 — <span class="eff">치명 확률 +6%</span>' },
    { id:'h2', x:260, y:114, k:'minor', need:['h0'],
      g:'', n:'표신보', h:'飄身步', c:1,
      eff:{ spd:6 },
      d:'꽃잎처럼 가볍게 내딛는다 — <span class="eff">이동 +6%</span>' },

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

    { id:'h6', x:110, y:254, k:'minor', need:['h3','h4'],
      g:'', n:'쇄매결', h:'碎梅訣', c:1,
      eff:{ cdmg:8 },
      d:'스치면 반드시 부순다 — <span class="eff">치명 피해 +8%</span>' },
    { id:'h7', x:250, y:254, k:'minor', need:['h4','h5'],
      g:'', n:'경신결', h:'輕身訣', c:1,
      eff:{ spd:6 },
      d:'걸음이 눈처럼 가볍다 — <span class="eff">이동 +6%</span>' },

    // 신규 심법 '매향심결' — docs/트리안/신규무공.md의 ARTS 표에 등록.
    { id:'h8', x:180, y:324, k:'major', need:['h6','h7'],
      g:'梅', n:'매향심결', h:'梅香心訣', c:3,
      eff:{ art:'maehyang' },
      d:'매화 향이 몸에 배어 손이 빨라지고 눈이 밝아진다 — <span class="eff">신규 심법 매향심결 습득</span>' },

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

    { id:'h12', x:130, y:464, k:'minor', need:['h9','h10'],
      g:'', n:'난격결', h:'亂擊訣', c:1,
      eff:{ aspd:8 },
      d:'어지러이 흩날리듯 친다 — <span class="eff">공격 속도 +8%</span>' },
    { id:'h13', x:230, y:464, k:'minor', need:['h10','h11'],
      g:'', n:'파화장', h:'破花掌', c:1,
      eff:{ cdmg:10 },
      d:'꽃이 부서지듯 상대가 무너진다 — <span class="eff">치명 피해 +10%</span>' },

    // 신규 액티브 '표매권'은 그림·연출 병목으로 보류 — docs/트리안/신규무공.md 참고.
    // TODO 액티브 표매권(원안 school:hwasan need:17 cost:17000 cd:7 mul:4.2 range:70 hits:3) — 보류 동안 패시브 %로 대체
    { id:'h14', x:180, y:534, k:'major', need:['h12','h13'],
      g:'拳', n:'표매권', h:'飄梅拳', c:3,
      eff:{ artPower:12 },
      d:'표홀한 신법으로 파고들어 연달아 세 번 친다 — <span class="eff">초식 위력 +12%</span>(신규 초식 보류 — 임시 패시브)' },

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

    { id:'h18', x:110, y:674, k:'keystone', need:['h15','h16'],
      g:'滿', n:'매화만개', h:'梅花滿開', c:4,
      eff:{ keystone:'hwasan_manggae', crit:30, hp:-12 },
      d:'만개한 매화처럼 찰나에 전부를 건다 — <span class="eff">치명 확률 +30%</span>, 대신 몸이 트인다(<span class="eff">체력 -12%</span>)' },
    // 교차: 청죽문(매죽합일) — crossNode는 청죽문의 유일한 키스톤 'b18'(청죽만리)
    { id:'h19', x:260, y:674, k:'cross', need:['h16','h17'],
      g:'合', n:'매죽합일', h:'梅竹合一', c:2,
      cross:'bamboo', crossNode:'b18',
      eff:{ castSpd:10, artPower:8 },
      d:'화산의 표홀함이 청죽의 흐름과 맞닿는다 — <span class="eff">시전 속도 +10%</span>, <span class="eff">초식 위력 +8%</span>(청죽문 청죽만리 노드와 연결)' },

    { id:'h20', x:100, y:744, k:'minor', need:['h18'],
      g:'', n:'질화수', h:'疾花手', c:1,
      eff:{ aspd:9 },
      d:'손끝에서 꽃잎이 흩날린다 — <span class="eff">공격 속도 +9%</span>' },
    { id:'h21', x:260, y:744, k:'minor', need:['h19'],
      g:'', n:'낙매섬', h:'落梅閃', c:1,
      eff:{ crit:9 },
      d:'떨어지는 꽃잎처럼 스쳐 벤다 — <span class="eff">치명 확률 +9%</span>' },

    { id:'h22', x:180, y:814, k:'keystone', need:['h20','h21'],
      g:'影', n:'낙화무영', h:'落花無影', c:4,
      eff:{ keystone:'hwasan_muyoung', spd:30, cdr:15, hp:-15 },
      d:'꽃잎이 떨어져도 그림자가 없다 — <span class="eff">이동 +30%</span>, <span class="eff">초식 재사용 -15%</span>, 대신 몸이 트인다(<span class="eff">체력 -15%</span>)' },
  ],

  // ── 아미 峨嵋 #b9a6d8 보라 — 자비·기공. 회복/심법/광역. ───────────
  ami: [
    { id:'a0',  x:180, y:44,  k:'root',     need:[],           g:'',  n:'아미입문', h:'峨嵋入門', c:0, eff:{}, d:'아미파의 산문(山門)을 넘는다.' },

    { id:'a1',  x:110, y:114, k:'minor',    need:['a0'],       g:'',  n:'자비결',   h:'慈悲訣',   c:1, eff:{regen:6}, d:'베풀수록 스스로도 차오른다.<span class="eff">회복 +6%</span>' },
    { id:'a2',  x:250, y:114, k:'minor',    need:['a0'],       g:'',  n:'조기결',   h:'調氣訣',   c:1, eff:{passiveAmp:6}, d:'기운을 고르게 다스려 심법이 깊어진다.<span class="eff">심법 효과 +6%</span>' },

    { id:'a3',  x:60,  y:184, k:'minor',    need:['a1'],       g:'',  n:'토납결',   h:'吐納訣',   c:1, eff:{regen:6}, d:'묵은 숨을 내쉬고 맑은 숨을 들인다.<span class="eff">회복 +6%</span>' },
    { id:'a4',  x:180, y:184, k:'minor',    need:['a1','a2'],  g:'',  n:'정심결',   h:'定心訣',   c:2, eff:{hp:6, regen:4}, d:'흔들리지 않는 마음이 몸을 지킨다.<span class="eff">체력 +6% · 회복 +4%</span>' },
    { id:'a5',  x:300, y:184, k:'minor',    need:['a2'],       g:'',  n:'묘공결',   h:'妙功訣',   c:1, eff:{artPower:6}, d:'오묘한 손끝에서 초식이 여문다.<span class="eff">초식 위력 +6%</span>' },

    { id:'a6',  x:70,  y:254, k:'minor',    need:['a3'],       g:'',  n:'백광결',   h:'白光訣',   c:1, eff:{regen:7}, d:'하얀 빛이 상처를 스치고 지난다.<span class="eff">회복 +7%</span>' },
    { id:'a7',  x:190, y:254, k:'minor',    need:['a4'],       g:'',  n:'연심결',   h:'蓮心訣',   c:2, eff:{passiveAmp:7, hp:5}, d:'연꽃처럼 진흙 속에서도 맑다.<span class="eff">심법 효과 +7% · 체력 +5%</span>' },
    { id:'a8',  x:310, y:254, k:'minor',    need:['a5'],       g:'',  n:'관조결',   h:'觀照訣',   c:1, eff:{artPower:7}, d:'고요히 살펴 급소를 짚는다.<span class="eff">초식 위력 +7%</span>' },

    { id:'a9',  x:130, y:324, k:'major',    need:['a6','a7'],  g:'活', n:'활인기공', h:'活人氣功', c:3, eff:{art:'hwalin'}, d:'위태로우면 숨을 불어넣는다 — 아미의 손이 닿으면 죽어가던 이도 산다.<span class="eff">초식 습득 · 활인기공</span>' },
    { id:'a10', x:280, y:324, k:'minor',    need:['a8'],       g:'',  n:'설법결',   h:'說法訣',   c:1, eff:{passiveAmp:6}, d:'말 한마디가 마음의 짐을 던다.<span class="eff">심법 효과 +6%</span>' },

    { id:'a11', x:90,  y:394, k:'minor',    need:['a9'],       g:'',  n:'보시결',   h:'普施訣',   c:1, eff:{regen:8}, d:'널리 베푸는 손에는 마름이 없다.<span class="eff">회복 +8%</span>' },
    { id:'a12', x:210, y:394, k:'minor',    need:['a7','a8'],  g:'',  n:'원융결',   h:'圓融訣',   c:2, eff:{hp:7, artPower:5}, d:'모난 곳 없이 둥글게 이어진다.<span class="eff">체력 +7% · 초식 위력 +5%</span>' },
    { id:'a14', x:330, y:394, k:'minor',    need:['a10'],      g:'',  n:'유화결',   h:'柔和訣',   c:1, eff:{hp:6}, d:'부드러움이 단단함을 이긴다.<span class="eff">체력 +6%</span>' },

    // 신규 심법 '백련심공' — docs/트리안/신규무공.md의 ARTS 표에 등록.
    { id:'a13', x:180, y:464, k:'major',    need:['a11','a12'], g:'白', n:'백련심공', h:'白蓮心功', c:3,
      eff:{ art:'baekryeon' },
      d:'백련이 피어나듯 자비의 기운이 몸 안에 돈다.<span class="eff">신규 심법 백련심공 습득(회복+체력)</span>' },

    { id:'a15', x:90,  y:534, k:'minor',    need:['a13'],       g:'',  n:'묵향결',   h:'墨香訣',   c:1, eff:{artPower:8}, d:'붓끝처럼 정교하게 급소를 찌른다.<span class="eff">초식 위력 +8%</span>' },
    { id:'a16', x:200, y:534, k:'minor',    need:['a13','a14'], g:'',  n:'행운결',   h:'行雲訣',   c:2, eff:{regen:8, passiveAmp:5}, d:'구름처럼 걸림 없이 기운이 흐른다.<span class="eff">회복 +8% · 심법 효과 +5%</span>' },
    { id:'a22', x:320, y:534, k:'minor',    need:['a12'],       g:'',  n:'월영결',   h:'月影訣',   c:1, eff:{hp:8}, d:'달그림자처럼 은은히 몸을 지킨다.<span class="eff">체력 +8%</span>' },

    { id:'a17', x:140, y:604, k:'keystone', need:['a15','a16'], g:'大', n:'대자대비', h:'大慈大悲', c:4,
      eff:{ keystone:'daejadaebi', regen:40, atk:-10 },
      d:'모두를 살리려는 마음은 내 창끝을 무디게 한다.<span class="eff">회복 +40% · 공격력 -10%</span>' },
    { id:'a18', x:280, y:604, k:'minor',    need:['a22'],       g:'',  n:'보련결',   h:'寶蓮訣',   c:1, eff:{passiveAmp:8}, d:'보배로운 연꽃이 심법을 밝힌다.<span class="eff">심법 효과 +8%</span>' },

    { id:'a19', x:150, y:674, k:'minor',    need:['a17'],       g:'',  n:'공심결',   h:'空心訣',   c:2, eff:{artPower:8, regen:5}, d:'비운 마음에 초식이 절로 여문다.<span class="eff">초식 위력 +8% · 회복 +5%</span>' },
    // 교차: 청죽문(인연결) — crossNode는 청죽문의 유일한 키스톤 'b18'(청죽만리)
    { id:'a20', x:280, y:674, k:'cross',    need:['a18'],       g:'',  n:'인연결',   h:'因緣訣',   c:2,
      cross:'bamboo', crossNode:'b18',
      eff:{ regen:6, artPower:6 },
      d:'청죽문과 아미의 인연이 닿아 자비와 곧음이 하나 된다.<span class="eff">회복 +6% · 초식 위력 +6%</span>(청죽문 청죽만리 노드와 연결)' },

    { id:'a21', x:200, y:744, k:'keystone', need:['a19','a20'], g:'妙', n:'묘상신결', h:'妙相神訣', c:4,
      eff:{ keystone:'myosang', artPower:35, cdr:15, hp:-15 },
      d:'천 개의 손이 천 개의 초식을 편다 — 그 대가로 몸을 돌보지 못한다.<span class="eff">초식 위력 +35% · 재사용 -15% · 체력 -15%</span>' },
  ],

  // ── 개방 丐幫 #b08a5c 갈 — 취권·타구·야행. 회피/이동/기습. ────────
  gaebang: [
    { id:'g0',  x:180, y:44,  k:'root',    need:[],           g:'',  n:'개방 입문', h:'丐幫入門', c:0,
      eff:{ gold:3 }, d:'거리에서 배운 것이 무공이 된다 · <span class="eff">은자 획득 +3%</span>' },

    { id:'g1',  x:90,  y:114, k:'minor',   need:['g0'],       g:'',  n:'표풍결', h:'飄風訣', c:1,
      eff:{ spd:5 }, d:'바람처럼 가볍게 딛는 첫걸음 · <span class="eff">이동 +5%</span>' },
    { id:'g2',  x:270, y:114, k:'minor',   need:['g0'],       g:'',  n:'타구식', h:'打狗式', c:1,
      eff:{ aspd:5 }, d:'몽둥이를 짧게 짧게 놀린다 · <span class="eff">공격 속도 +5%</span>' },

    { id:'g3',  x:60,  y:184, k:'minor',   need:['g1'],       g:'',  n:'야보공', h:'夜步功', c:1,
      eff:{ spd:6 }, d:'밤길을 걷듯 발소리가 없다 · <span class="eff">이동 +6%</span>' },
    { id:'g4',  x:180, y:184, k:'minor',   need:['g1','g2'],  g:'',  n:'급소결', h:'急所訣', c:1,
      eff:{ crit:5 }, d:'어디를 노려야 할지 안다 · <span class="eff">치명 확률 +5%</span>' },
    { id:'g5',  x:300, y:184, k:'minor',   need:['g2'],       g:'',  n:'연환장', h:'連環杖', c:1,
      eff:{ aspd:6 }, d:'지팡이가 끊임없이 이어진다 · <span class="eff">공격 속도 +6%</span>' },

    { id:'g6',  x:90,  y:254, k:'minor',   need:['g3','g4'],  g:'',  n:'구걸결', h:'求乞訣', c:1,
      eff:{ gold:6 }, d:'손을 벌리면 어디서든 챙긴다 · <span class="eff">은자 획득 +6%</span>' },
    { id:'g7',  x:270, y:254, k:'minor',   need:['g4','g5'],  g:'',  n:'기습보', h:'奇襲步', c:1,
      eff:{ crit:6 }, d:'그림자처럼 다가가 허를 찌른다 · <span class="eff">치명 확률 +6%</span>' },

    { id:'g8',  x:60,  y:324, k:'minor',   need:['g6'],       g:'',  n:'취리보', h:'醉履步', c:1,
      eff:{ spd:8 }, d:'취한 듯 흐트러진 걸음이 오히려 빠르다 · <span class="eff">이동 +8%</span>' },
    { id:'g9',  x:180, y:324, k:'minor',   need:['g6','g7'],  g:'',  n:'걸신공', h:'乞身功', c:1,
      eff:{ hp:6 }, d:'거리에서 구른 몸이 맷집도 는다 · <span class="eff">체력 +6%</span>' },
    { id:'g10', x:300, y:324, k:'minor',   need:['g7'],       g:'',  n:'난봉결', h:'亂棒訣', c:1,
      eff:{ aspd:8 }, d:'몽둥이질이 어지러이 빨라진다 · <span class="eff">공격 속도 +8%</span>' },

    { id:'g11', x:90,  y:394, k:'major',   need:['g8','g9'],  g:'夜', n:'야행심법', h:'夜行心法', c:2,
      eff:{ art:'yuwoon' }, d:'밤길을 걷듯 흐르고 스민다 — 심법 습득 · <span class="eff">공격 속도 계열과 함께 상시 발동</span>' },
    { id:'g12', x:270, y:394, k:'major',   need:['g9','g10'], g:'旋', n:'선풍퇴', h:'旋風腿', c:2,
      eff:{ art:'whirl' }, d:'휘돌아 차서 주위를 쓸어낸다 — 초식 습득 · <span class="eff">범위 공격 자동 시전</span>' },

    { id:'g13', x:60,  y:464, k:'minor',   need:['g11'],        g:'',  n:'연격결', h:'連擊訣', c:1,
      eff:{ cdr:8 }, d:'숨 돌릴 틈 없이 다음 수를 잇는다 · <span class="eff">초식 재사용 -8%</span>' },
    { id:'g14', x:180, y:464, k:'minor',   need:['g11','g12'],  g:'',  n:'강호술', h:'江湖術', c:1,
      eff:{ gold:8 }, d:'저잣거리 소문이 곧 밥벌이다 · <span class="eff">은자 획득 +8%</span>' },
    { id:'g15', x:300, y:464, k:'minor',   need:['g12'],        g:'',  n:'봉법결', h:'棒法訣', c:1,
      eff:{ artPower:7 }, d:'몽둥이 초식에 실리는 힘을 더한다 · <span class="eff">초식 위력 +7%</span>' },

    { id:'g16', x:90,  y:534, k:'minor',   need:['g13','g14'], g:'',  n:'만금안', h:'萬金眼', c:1,
      eff:{ gold:10 }, d:'어디에 은자가 굴러다니는지 보인다 · <span class="eff">은자 획득 +10%</span>' },
    { id:'g17', x:270, y:534, k:'minor',   need:['g14','g15'], g:'',  n:'야습공', h:'夜襲功', c:1,
      eff:{ crit:8 }, d:'밤의 습격은 한 수가 곱절이다 · <span class="eff">치명 확률 +8%</span>' },

    // 신규 심법 '취권결' — docs/트리안/신규무공.md의 ARTS 표에 등록. 패시브라 연출 없음.
    { id:'g18', x:180, y:604, k:'major',   need:['g16','g17'], g:'醉', n:'취권결', h:'醉拳訣', c:3,
      eff:{ art:'chwigwon' },
      d:'술 취한 척 몸을 놀려 빈틈을 만들지 않는다 — <span class="eff">신규 심법 취권결 습득(공격력·이동 증폭)</span>' },

    { id:'g19', x:90,  y:674, k:'keystone', need:['g18'], g:'仙', n:'취팔선', h:'醉八仙', c:4,
      eff:{ keystone:'chwipalseon', spd:30, crit:15, hp:-10 },
      d:'여덟 잔을 다 비우면 비틀거림도 공격이 된다 — 빠르고 매섭지만 몸은 허술해진다 · <span class="eff">이동 +30% · 치명 확률 +15%</span> / <span class="eff">체력 -10%</span>' },
    { id:'g20', x:270, y:674, k:'keystone', need:['g18'], g:'丐', n:'개방원로결', h:'丐幫元老訣', c:4,
      eff:{ keystone:'gaebangwonro', gold:35, cdr:15, hp:-10 },
      d:'떠돌며 쌓은 관록이 손속에 여유를 준다 — 실속은 챙기되 몸은 사린다 · <span class="eff">은자 획득 +35% · 초식 재사용 -15%</span> / <span class="eff">체력 -10%</span>' },

    // 교차: 당문(암야합) — crossNode는 당문의 마지막 키스톤 'd22'(화골산공)
    { id:'g21', x:180, y:744, k:'cross', need:['g19','g20'], g:'', n:'암야합', h:'暗夜合', c:3,
      cross:'dangmun', crossNode:'d22',
      eff:{ crit:10, cdmg:10 },
      d:'개방의 야행에 당문의 독이 스민다 — 밤손님의 일격이 곱절로 아프다 · <span class="eff">치명 확률 +10% · 치명 피해 +10%</span>(당문 화골산공 노드와 연결)' },
  ],

  // ── 당문 唐門 #c99ad0 자 — 암기·독. 치명/치명피해/지속. ───────────
  dangmun: [
    { id:'d0',  x:180, y:44,  k:'root',     need:[],            g:'',  n:'당문 입문',   h:'唐門',       c:0,
      eff:{ crit:3 },
      d:'당문 문하로 들어선다. 첫 손속에 <span class="eff">치명 확률 +3%</span>가 실린다.' },

    { id:'d1',  x:100, y:114, k:'minor',    need:['d0'],        g:'',  n:'지력결',     h:'指力訣',     c:1,
      eff:{ crit:6 },
      d:'손가락 끝에 힘을 모으는 첫걸음. <span class="eff">치명 확률 +6%</span>' },
    { id:'d2',  x:260, y:114, k:'minor',    need:['d0'],        g:'',  n:'독아결',     h:'毒牙訣',     c:1,
      eff:{ cdmg:7 },
      d:'독니처럼 급소를 문다. <span class="eff">치명 피해 +7%</span>' },

    { id:'d3',  x:60,  y:184, k:'minor',    need:['d1'],        g:'',  n:'파갑결',     h:'破甲訣',     c:1,
      eff:{ cdmg:8 },
      d:'갑주 틈을 파고드는 손속. <span class="eff">치명 피해 +8%</span>' },
    { id:'d4',  x:180, y:184, k:'minor',    need:['d1','d2'],   g:'',  n:'급소결',     h:'急所訣',     c:1,
      eff:{ crit:7 },
      d:'급소를 짚어내는 눈썰미. <span class="eff">치명 확률 +7%</span>' },
    { id:'d5',  x:300, y:184, k:'minor',    need:['d2'],        g:'',  n:'표창공',     h:'鏢槍功',     c:1,
      eff:{ artPower:6 },
      d:'표창을 다루는 기본기. <span class="eff">초식 위력 +6%</span>' },

    { id:'d6',  x:120, y:254, k:'minor',    need:['d3','d4'],   g:'',  n:'은침보',     h:'隱針步',     c:1,
      eff:{ spd:6 },
      d:'숨은 걸음, 소리 없는 접근. <span class="eff">이동 속도 +6%</span>' },
    { id:'d7',  x:240, y:254, k:'minor',    need:['d4','d5'],   g:'',  n:'잠행결',     h:'潛行訣',     c:1,
      eff:{ aspd:6 },
      d:'기척을 죽이고 손을 빨리 놀린다. <span class="eff">공격 속도 +6%</span>' },

    { id:'d8',  x:180, y:324, k:'major',    need:['d6','d7'],   g:'暗', n:'암향지',     h:'暗香指',     c:3,
      eff:{ art:'baekbo' },
      d:'어둠 속 향기가 닿으면 이미 늦었다. <span class="eff">초식 습득 — 암향지</span> (기존 무공, cd14·범위280)' },

    { id:'d9',  x:80,  y:394, k:'minor',    need:['d6','d8'],   g:'',  n:'연환지',     h:'連環指',     c:1,
      eff:{ cdr:6 },
      d:'한 번 짚으면 연달아 짚는다. <span class="eff">초식 재사용 -6%</span>' },
    { id:'d10', x:180, y:394, k:'minor',    need:['d8'],        g:'',  n:'자하결',     h:'紫霞訣',     c:1,
      eff:{ atk:6 },
      d:'자줏빛 기운을 손끝에 두른다. <span class="eff">공격력 +6%</span>' },
    { id:'d11', x:280, y:394, k:'minor',    need:['d7','d8'],   g:'',  n:'산공결',     h:'散功訣',     c:1,
      eff:{ artPower:7 },
      d:'흩어 뿌리는 요결. <span class="eff">초식 위력 +7%</span>' },

    { id:'d12', x:60,  y:464, k:'minor',    need:['d9'],        g:'',  n:'축독결',     h:'蓄毒訣',     c:1,
      eff:{ cdmg:9 },
      d:'독을 갈무리해 두었다 한 번에 터뜨린다. <span class="eff">치명 피해 +9%</span>' },
    { id:'d13', x:160, y:464, k:'minor',    need:['d9','d10'],  g:'',  n:'쾌수결',     h:'快手訣',     c:1,
      eff:{ aspd:8 },
      d:'눈에 보이지 않는 손놀림. <span class="eff">공격 속도 +8%</span>' },
    { id:'d14', x:260, y:464, k:'minor',    need:['d10','d11'], g:'',  n:'명중결',     h:'命中訣',     c:1,
      eff:{ crit:8 },
      d:'빗나가지 않는 감각. <span class="eff">치명 확률 +8%</span>' },

    { id:'d15', x:120, y:534, k:'minor',    need:['d12','d13'], g:'',  n:'파혼지',     h:'破魂指',     c:2,
      eff:{ cdmg:12 },
      d:'혼백까지 흔드는 일격. <span class="eff">치명 피해 +12%</span>' },
    { id:'d16', x:240, y:534, k:'minor',    need:['d13','d14'], g:'',  n:'은형보',     h:'隱形步',     c:1,
      eff:{ spd:7 },
      d:'그림자에 몸을 감추고 파고든다. <span class="eff">이동 속도 +7%</span>' },

    // 신규 심법 '만독불침공' — docs/트리안/신규무공.md의 ARTS 표에 등록.
    { id:'d17', x:180, y:604, k:'major',    need:['d15','d16'], g:'毒', n:'만독불침공', h:'萬毒不侵功', c:3,
      eff:{ art:'mandok' },
      d:'온갖 독에 물들어 오히려 독이 힘이 된다. <span class="eff">신규 심법 만독불침공 습득(공격+체력 증폭)</span>' },

    { id:'d18', x:90,  y:674, k:'minor',    need:['d17'],       g:'',  n:'진기결',     h:'眞氣訣',     c:1,
      eff:{ passiveAmp:6 },
      d:'독기와 진기가 뒤섞여 돈다. <span class="eff">심법 효과 +6%</span>' },
    { id:'d19', x:180, y:674, k:'minor',    need:['d17'],       g:'',  n:'탐낭결',     h:'探囊訣',     c:1,
      eff:{ gold:7 },
      d:'떨어진 재물을 놓치지 않는다. <span class="eff">은자 획득 +7%</span>' },
    { id:'d20', x:270, y:674, k:'minor',    need:['d17'],       g:'',  n:'환약결',     h:'丸藥訣',     c:1,
      eff:{ regen:6 },
      d:'상비한 영단으로 몸을 다스린다. <span class="eff">회복 +6%</span>' },

    { id:'d21', x:110, y:744, k:'keystone', need:['d18','d19'], g:'花', n:'만천화우',   h:'萬天花雨',   c:5,
      eff:{ keystone:'mancheonhwau', cdmg:35, crit:15, hp:-10 },
      d:'하늘 가득 암기를 흩뿌린다. <span class="eff">치명 피해 +35% · 치명 확률 +15%</span>, 대신 몸이 그만큼 상해 <span class="eff">체력 -10%</span>.' },
    { id:'d22', x:260, y:744, k:'keystone', need:['d19','d20'], g:'骨', n:'화골산공',   h:'化骨散功',   c:5,
      eff:{ keystone:'hwagolsan', artPower:30, cdr:20, regen:-15 },
      d:'뼈를 녹이는 극독을 스스로 두른다. <span class="eff">초식 위력 +30% · 재사용 -20%</span>, 대신 몸이 갉혀 <span class="eff">회복 -15%</span>.' },

    // 교차: 개방(독풍합격) — crossNode는 개방의 마지막 키스톤 'g20'(개방원로결)
    { id:'d23', x:180, y:814, k:'cross',    need:['d21','d22'], g:'',  n:'독풍합격',   h:'毒風合擊',   c:4,
      cross:'gaebang', crossNode:'g20',
      eff:{ crit:10, cdr:10 },
      d:'당문의 독과 개방의 그림자가 만나 은밀히 급소를 노린다. 개방 무공도 함께 익혔다면 <span class="eff">치명 확률 +10% · 재사용 -10%</span>가 더해진다(개방 개방원로결 노드와 연결).' },
  ],

  // ── 마교 魔敎 #d86a5c 적 — 흡성·폭발. 공격/치명피해/고위험 고보상. ──
  magyo: [
    { id:'y0',  x:180, y:44,  k:'root',    need:[],           g:'',  n:'마교 입문', h:'魔敎入門', c:0,
      eff:{ atk:5 }, d:'마교의 문턱을 넘는다 — <span class="eff">공격 +5%</span>' },

    { id:'y1',  x:100, y:114, k:'minor',   need:['y0'],       g:'',  n:'마기결',   h:'魔氣結',   c:1,
      eff:{ atk:6 }, d:'마기를 손끝까지 끌어올린다 — <span class="eff">공격 +6%</span>' },
    { id:'y2',  x:260, y:114, k:'minor',   need:['y0'],       g:'',  n:'살초결',   h:'殺招結',   c:1,
      eff:{ crit:6 }, d:'급소만을 노리는 살초 — <span class="eff">치명 +6%</span>' },

    { id:'y3',  x:60,  y:184, k:'minor',   need:['y1'],       g:'',  n:'혈참결',   h:'血斬結',   c:1,
      eff:{ cdmg:6 }, d:'베면 반드시 깊게 — <span class="eff">치명 피해 +6%</span>' },
    { id:'y4',  x:180, y:184, k:'minor',   need:['y1','y2'],  g:'',  n:'폭마결',   h:'爆魔結',   c:1,
      eff:{ artPower:6 }, d:'마기가 초식 끝에서 터진다 — <span class="eff">초식 위력 +6%</span>' },
    { id:'y5',  x:300, y:184, k:'minor',   need:['y2'],       g:'',  n:'질풍마보', h:'疾風魔步', c:1,
      eff:{ aspd:6 }, d:'마기로 손발을 재촉한다 — <span class="eff">공격 속도 +6%</span>' },

    { id:'y6',  x:110, y:254, k:'major',   need:['y3','y4'],  g:'崩', n:'붕산장',   h:'崩山掌',   c:2,
      eff:{ art:'bungsan' }, d:'산을 무너뜨리듯 사방을 친다 — <span class="eff">초식 습득 · 붕산장</span>' },
    { id:'y7',  x:250, y:254, k:'minor',   need:['y4','y5'],  g:'',  n:'탈기결',   h:'奪氣結',   c:1,
      eff:{ regen:6 }, d:'상대의 기운을 빨아 상처를 메운다 — <span class="eff">회복 +6%</span>' },

    { id:'y8',  x:60,  y:324, k:'minor',   need:['y6'],       g:'',  n:'마력결',   h:'魔力結',   c:1,
      eff:{ atk:6 }, d:'마력이 몸에 쌓인다 — <span class="eff">공격 +6%</span>' },
    { id:'y9',  x:180, y:324, k:'minor',   need:['y6','y7'],  g:'',  n:'섬살결',   h:'閃殺結',   c:1,
      eff:{ crit:6 }, d:'번뜩이는 순간에 목을 노린다 — <span class="eff">치명 +6%</span>' },
    { id:'y10', x:300, y:324, k:'minor',   need:['y7'],       g:'',  n:'붕격결',   h:'崩擊結',   c:1,
      eff:{ cdmg:6 }, d:'틀을 부수는 일격 — <span class="eff">치명 피해 +6%</span>' },

    { id:'y11', x:110, y:394, k:'minor',   need:['y8','y9'],  g:'',  n:'광마결',   h:'狂魔結',   c:1,
      eff:{ artPower:7 }, d:'미친 듯 몰아치는 마기 — <span class="eff">초식 위력 +7%</span>' },
    { id:'y12', x:250, y:394, k:'minor',   need:['y9','y10'], g:'',  n:'질주마공', h:'疾走魔功', c:1,
      eff:{ aspd:7 }, d:'마공으로 몸이 가벼워진다 — <span class="eff">공격 속도 +7%</span>' },

    { id:'y13', x:60,  y:464, k:'minor',   need:['y11'],      g:'',  n:'주화결',   h:'走火結',   c:1,
      eff:{ atk:10, hp:-5 }, d:'화후를 앞당기니 몸이 먼저 상한다 — <span class="eff">공격 +10%, 체력 -5%</span>' },
    // 신규 심법 '탈혼공' — docs/트리안/신규무공.md의 ARTS 표에 등록.
    { id:'y14', x:180, y:464, k:'major',   need:['y11','y12'], g:'奪', n:'탈혼공',   h:'奪魂功',   c:2,
      eff:{ art:'talhon' },
      d:'상대의 기운을 빼앗아 자신의 것으로 돌린다 — <span class="eff">신규 심법 탈혼공 습득(공격+회복 증폭)</span>' },
    { id:'y15', x:300, y:464, k:'minor',   need:['y12'],      g:'',  n:'혈갈결',   h:'血竭結',   c:1,
      eff:{ cdmg:10, regen:-5 }, d:'피를 말려 칼끝을 벼린다 — <span class="eff">치명 피해 +10%, 회복 -5%</span>' },

    { id:'y16', x:110, y:534, k:'minor',   need:['y13','y14'], g:'',  n:'귀살결',   h:'鬼殺結',   c:1,
      eff:{ crit:8 }, d:'귀신처럼 스며들어 벤다 — <span class="eff">치명 +8%</span>' },
    { id:'y17', x:250, y:534, k:'minor',   need:['y14','y15'], g:'',  n:'마염결',   h:'魔炎結',   c:1,
      eff:{ artPower:8 }, d:'마기가 불꽃처럼 번진다 — <span class="eff">초식 위력 +8%</span>' },

    { id:'y18', x:180, y:604, k:'keystone', need:['y16','y17'], g:'吸', n:'흡혼대법', h:'吸魂大法', c:3,
      eff:{ atk:30, regen:-15, keystone:'heuphon' },
      d:'별빛마저 빨아들이나 몸은 갈수록 메마른다 — <span class="eff">공격 +30%, 회복 -15%</span>' },

    { id:'y19', x:100, y:674, k:'minor',   need:['y18'],      g:'',  n:'신속결',   h:'迅速結',   c:1,
      eff:{ cdr:8 }, d:'숨 고를 틈도 없이 다음 초식으로 — <span class="eff">재사용 대기 -8%</span>' },
    { id:'y20', x:260, y:674, k:'minor',   need:['y18'],      g:'',  n:'탈재결',   h:'奪財結',   c:1,
      eff:{ gold:8 }, d:'베어 넘긴 자의 재물은 내 것 — <span class="eff">은자 획득 +8%</span>' },

    { id:'y21', x:180, y:744, k:'keystone', need:['y19','y20'], g:'爆', n:'폭혈대법', h:'爆血大法', c:3,
      eff:{ artPower:35, hp:-15, keystone:'poghyeol' },
      d:'주화입마 직전까지 스스로를 몰아붙인다 — <span class="eff">초식 위력 +35%, 체력 -15%</span>' },

    // 교차: 당문(독마합벽) — crossNode는 당문의 마지막 키스톤 'd22'(화골산공). 당문 쪽엔
    // 마교로 되짚는 대응 cross 노드가 없어(당문 d23은 개방 몫) 한쪽만 연결한다.
    { id:'y22', x:180, y:814, k:'cross',   need:['y21'],      g:'',  n:'독마합벽', h:'毒魔合璧', c:2,
      cross:'dangmun', crossNode:'d22',
      eff:{ cdmg:10, crit:5 },
      d:'독과 마기가 한몸이 되어 흐른다 — <span class="eff">치명 피해 +10%, 치명 +5%</span>(당문 화골산공 노드와 연결)' },
  ],
};
