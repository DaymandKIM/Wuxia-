extends RefCounted
## 무협 가로판 — 설계 숫자 전부. 숫자는 여기에만 둔다.
## 밸런스 곡선(DIFF·GROW·REALM·SILVER·TRAIN)은 옛 판 확정값 그대로다.

# ── 화면 (논리 단위: 가로 440 고정) ──
const VW := 440.0
const EM := 15.9                 # 글자 기준 크기
const PANEL_H := 404.0           # 아래 패널이 다 보이려면 필요한 높이 — 패널에 줄을 더하면 올린다
const TAB_H := 222.0             # 탭 내용 높이 (제목 줄 + 카드) — 탭 셋이 같아야 바꿔도 화면이 안 움직인다
const TABBAR_H := 46.0
const SCENE_MIN := 418.0         # 장면 높이 범위. 창 기본 높이 = SCENE_MIN + PANEL_H
const SCENE_MAX := 572.0
const GROUND := 54.0             # 땅 띠 두께
const HERO_X := 0.26             # 주인공이 서는 자리 (장면 폭 비율)
const CAM_K := 7.0
const SAT_IFRAME := 40.0         # 아티팩트(iframe)는 위가 앱 바에 가린다

# ── 톤 — 어두운 남색 안개. 원경만 덮고 인물은 그 위에 밝게 ──
const SKY := Color("0f1520")
const VEIL := Color(0.047, 0.071, 0.118, 0.58)
const MIST := Color(0.588, 0.686, 0.784)
const MIST_A := 0.34
const MIST_UP := 78.0
const MIST_DOWN := 12.0
const GROUND_TOP := Color("7c8898")
const GROUND_BOT := Color("1a222e")
const LINE := Color(0.753, 0.792, 0.847, 0.9)
const VIG := Color(0.031, 0.047, 0.078)
const VIG_H := 0.30
const VIG_A := 0.82
const PROP_TINT := Color(0.16, 0.21, 0.24)      # 중경 실루엣 (곱)
const SHADOW := Color(0.055, 0.078, 0.118, 0.42)
const BACK_HR := 0.62            # 원경: 장면 높이 대비 크기
const BACK_PAR := 0.22
const BACK_SINK := 16.0
const BACK_TOP := 0.115          # 그림 위쪽 빈 줄 비율
const BACK_FADE := 0.40          # 그 아래 이만큼을 하늘색으로 녹인다
const MID_PAR := 0.62
const MID_GRID := 124.0
const MID_DENS := 0.48
const MID_SCALE := 2.0
const MID_SINK := 8.0
const MID_PICK := ["bamboo_big", "bamboo_mid", "bamboo_one", "bamboo_big"]
const PROPH := { "bamboo_big": 100.0, "bamboo_mid": 76.0, "bamboo_one": 66.0 }
const GRIT_GRID := 26.0
const GRIT_DENS := 0.72
const GRIT_DARK := Color(0.063, 0.094, 0.141, 0.30)
const GRIT_LITE := Color(0.886, 0.925, 0.98, 0.20)

# ── 주인공 ──
const HERO_HP := 100.0
const HERO_DMG := 10.0
const HERO_ATKCD := 0.46
const HERO_SPD := 96.0
const HERO_REGEN := 0.8
const HERO_REACH := 10.0
const HERO_KB := 6.0
const HERO_FLASH := 0.12
const HERO_DOWN := 3.0
const HERO_DUST := 0.11
const ANIM := { "run": [6, 10.0], "idle": [1, 4.0], "atk": [4, 8.0], "medit": [6, 3.2] }   # [컷 수, 초당 컷]
const HITFRAME := 2
const STRIP := { "run": 34, "idle": 24, "medit": 46, "punch": 54, "punchdbl": 56, "punchup": 54, "qipunch": 74, "qipunchb": 74,
	"kickside": 70, "kickside2": 56, "kickround": 72, "kickround2": 58, "kickhigh": 70, "kickhigh2": 52 }
const MOVES := [
	{ "key": "punch", "need": 0, "reach": 23.0 }, { "key": "kickside", "need": 0, "reach": 19.0 },
	{ "key": "punchdbl", "need": 0, "reach": 20.0 }, { "key": "kickside2", "need": 0, "reach": 18.0 },
	{ "key": "punchup", "need": 0, "reach": 20.0 }, { "key": "kickround", "need": 5, "reach": 24.0 },
	{ "key": "kickround2", "need": 5, "reach": 18.0 }, { "key": "kickhigh", "need": 10, "reach": 26.0 },
	{ "key": "kickhigh2", "need": 10, "reach": 19.0 }, { "key": "qipunch", "need": 0, "reach": 30.0 },
	{ "key": "qipunchb", "need": 0, "reach": 30.0 },
]

# ── 난이도·성장 (옛 판 v2.68 확정값) ──
const DIFF_HP := 22.0
const DIFF_HP_GROW := 1.46
const DIFF_DMG := 3.0
const DIFF_DMG_GROW := 1.19
const NEED_BASE := 24.0
const NEED_PER := 7.0
const NEED_ROUND := 10.0
const GROW := 1.31               # 승급당 피해·체력·회복 곱
const REALM_NAMES := ["삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "자연경"]
const REALM_PER := 4
const REALM_LAST := "신화경"
const EXP_BASE := 25.0
const EXP_GROW := 1.30
const KILL_GROW := 1.07
const BOSS_EXP := 25.0
const SILVER_BASE := 3.0
const SILVER_GROW := 1.22
const SILVER_BOSS := 10.0
const SILVER_FIRST := 50.0
const TRAIN_CAP_PER := 10
const TRAIN := [
	{ "k": "atk", "n": "공격", "inc": 2, "cb": 12.0, "cg": 1.16, "ico": "train_atk" },
	{ "k": "hp", "n": "체력", "inc": 2, "cb": 10.0, "cg": 1.15, "ico": "train_hp" },
	{ "k": "regen", "n": "회복", "inc": 2, "cb": 8.0, "cg": 1.14, "ico": "train_regen" },
]

# ── 적 공통 ──
const FOE_DUR := 0.55
const FOE_HITAT := 0.55
const FOE_CD := 1.3
const FOE_HITPAD := 16.0
const FOE_EDGE := 0.34
const FOE_HITT := 0.12
const FOE_FADE := 0.35
const STAGE_N := 10
const BOSS_HP := 30.0
const BOSS_DMG := 2.0
const BOSS_SPD := 0.82
const BOSS_DUR := 0.72
const BOSS_HITAT := 0.62
const BOSS_HITPAD := 26.0
const BOSS_EDGE := 0.35
const BOSS_RANGE := 62.0
const BOSS_ENTER := 300.0
const SKILL_CD := 5.5
const SKILL_RANGE := 132.0
const SKILL_DMG := 2.6
const SKILL_DUR := 1.35
const SKILL_HITAT := 0.62
## 떼 — 한 떼를 잡고 → 달려서 → 다음 떼를 만난다. 남은 수가 WAVE_LEFT 이하면 다음 떼를 미리 세운다.
const WAVE_LEFT := 1
const WAVE_AHEAD := 36.0
const WAVE_GAP := [26.0, 62.0]
const WAVE_JITTER_Y := 7.0
const WAVE_STOP := [-6.0, 16.0]
const WAVE_FIRST := 200.0

static func stage_spd(i: int) -> float: return 38.0 + i * 2.0
static func stage_max(i: int) -> int: return mini(3 + i, 7)

const ZONES := [
	{ "k": "bamboo", "n": "죽림", "bg": "bg_bamboo", "boss": "demon", "boss_name": "대나무 마왕",
		"foes": ["bandit", "thug", "wisp", "panther", "panther", "beetle", "soldier", "stalker", "snake"] },
]

## 적 종류 — 그림은 오른쪽 보기라 가로판에선 전부 뒤집어 그린다
const FOES := {
	"bandit": { "n": "대나무 강도", "w": 60, "h": 49,
		"anim": { "idle": ["idle0","idle1","idle2","idle3"], "walk": ["walk0","walk1","walk2","walk3"], "atk": ["atk0","atk1","atk2","atk3"], "hit": ["hit"], "death": ["hit","death0"] },
		"fps": { "idle": 4.0, "walk": 7.0, "atk": 7.3, "hit": 6.0, "death": 4.0 }, "hp": 1.0, "dmg": 1.0, "spd": 1.0, "range": 44.0 },
	"wisp": { "n": "대나무 유령불", "w": 68, "h": 46, "sw": 36, "bh": 34,
		"anim": { "idle": ["float0","float1","float2","float3"], "walk": ["float0","float1","float2","float3"], "atk": ["atk0","atk1","atk2","atk3"], "hit": ["hit"], "death": ["death0","death1"] },
		"fps": { "idle": 5.0, "walk": 6.0, "atk": 7.0, "hit": 6.0, "death": 3.0 }, "hp": 0.62, "dmg": 0.78, "spd": 1.22, "range": 38.0 },
	"panther": { "n": "그림자 표범", "w": 158, "h": 86, "sw": 70, "bh": 40, "sc": 0.72,
		"anim": { "idle": ["idle0","idle1","idle2","idle3"], "walk": ["walk0","walk1","walk2","walk3"], "atk": ["atk0","atk1","atk2","atk3"], "hit": ["hit"], "death": ["death0","death1","death2"] },
		"fps": { "idle": 4.0, "walk": 10.0, "atk": 8.0, "hit": 5.0, "death": 4.0 }, "hp": 0.78, "dmg": 1.15, "spd": 1.45, "range": 60.0 },
	"thug": { "n": "대나무 무뢰배", "w": 80, "h": 56, "sw": 44, "bh": 48,
		"anim": { "idle": ["idle0","idle1","idle2","idle3"], "walk": ["walk0","walk1","walk2","walk3"], "atk": ["atk0","atk1","atk2","atk3"], "hit": ["hit"], "death": ["death0","death1","death2"] },
		"fps": { "idle": 4.0, "walk": 8.0, "atk": 8.0, "hit": 6.0, "death": 4.0 }, "hp": 1.1, "dmg": 1.1, "spd": 0.95, "range": 48.0 },
	"beetle": { "n": "등딱지벌레", "w": 76, "h": 56, "sw": 58, "bh": 34, "sc": 0.74,
		"anim": { "idle": ["idle0","idle1","idle2","idle3"], "walk": ["walk0","walk1","walk2","walk3"], "atk": ["atk0","atk1","atk2","atk3"], "hit": ["hit"], "death": ["death0","death1","death2"] },
		"fps": { "idle": 3.5, "walk": 7.0, "atk": 8.0, "hit": 6.0, "death": 4.0 }, "hp": 1.25, "dmg": 0.95, "spd": 0.8, "range": 46.0 },
	"soldier": { "n": "대나무 정령병", "w": 122, "h": 54, "sw": 38, "bh": 48,
		"anim": { "idle": ["idle0","idle1","idle2","idle3","idle4","idle5"], "walk": ["walk0","walk1","walk2","walk3","walk4","walk5","walk6","walk7"], "atk": ["atk0","atk1","atk2","atk3","atk4","atk5"], "hit": ["hit","hit2"], "death": ["death0","death1","death2"] },
		"fps": { "idle": 4.0, "walk": 8.0, "atk": 11.0, "hit": 6.0, "death": 4.0 }, "hp": 1.6, "dmg": 1.2, "spd": 0.95, "range": 50.0 },
	"stalker": { "n": "죽림 추적자", "w": 72, "h": 58, "sw": 34, "bh": 48,
		"anim": { "idle": ["idle0","idle1","idle2","idle3"], "walk": ["walk0","walk1","walk2","walk3","walk4","walk5"], "atk": ["atk0","atk1","atk2","atk3"], "hit": ["hit"], "death": ["death0","death1"] },
		"fps": { "idle": 4.0, "walk": 8.0, "atk": 8.0, "hit": 6.0, "death": 4.0 }, "hp": 1.4, "dmg": 1.15, "spd": 1.15, "range": 60.0 },
	"snake": { "n": "대나무 방울뱀", "w": 86, "h": 45, "sw": 56, "bh": 40,
		"anim": { "idle": ["idle0","idle1","idle2","idle3"], "walk": ["walk0","walk1","walk2","walk3"], "atk": ["atk0","atk1","atk2","atk3"], "hit": ["hit"], "death": ["death0","death1","death2"] },
		"fps": { "idle": 4.0, "walk": 7.0, "atk": 8.0, "hit": 6.0, "death": 4.0 }, "hp": 1.3, "dmg": 1.35, "spd": 1.1, "range": 54.0 },
	"demon": { "n": "대나무 마왕", "w": 114, "h": 96, "boss": true,
		"anim": { "idle": ["idle0","idle1","idle2","idle3","idle4"], "walk": ["idle0","idle1","idle2","idle3","idle4"], "atk": ["swing0","swing1","swing2","swing3","swing4"],
			"skill": ["roar0","roar1","roar2","roar3","roar4","burst0","burst1","burst2","burst3","burst4"], "hit": ["idle2"], "death": ["death0","death1","death2","death3"] },
		"fps": { "idle": 5.0, "walk": 5.0, "atk": 7.0, "skill": 7.4, "hit": 4.0, "death": 5.0 }, "hp": 1.0, "dmg": 1.0, "spd": 1.0, "range": 62.0 },
}

# ── 연출 ──
const SPARK_N := 7
const SPARK_SPD := 130.0
const SPARK_LIFE := 0.32
const SPARK_C := Color(0.882, 0.941, 1.0)
const FLASH := 0.08
const DMG_RISE := 34.0
const DMG_LIFE := 0.7
const DMG_SIZE := 13
const DUST_R := 5.0
const DUST_LIFE := 0.45
const DUST_C := Color(0.667, 0.714, 0.776)
const SHAKE_PX := 5.0
const SHAKE_T := 0.22
const SLASH_LIFE := 0.16
const SLASH_R := 20.0
const SLASH_C := Color(0.784, 0.894, 1.0)
const RING_LIFE := 0.5
const LEAF_N := 16               # 흩날리는 댓잎
const LEAF_C := Color(0.42, 0.6, 0.5, 0.5)

# ── 무공 — 경지가 오를 때마다 깨달음 한 번: 석 장 중 하나를 고른다 (배우기·연마·심법) ──
const ART_MAX := 5               # 초식 연마 상한
const ART_LV := 0.30             # 연마 한 단계당 위력 +30%
const PASSIVE_MAX := 10          # 심법 상한
const CAST_FPS := 14.0
const CAST_HITAT := 0.5          # 시전 동작의 이 지점에서 터진다
const CAST_GAP := 0.35           # 초식과 초식 사이 숨 고르기 (동시 시전 금지 — 옛 판 v2.15)
const SHOT_SPD := 430.0
const HITSTOP := 0.05            # 초식이 맞는 순간 멈칫
const LAUNCH := [150.0, 260.0]   # 초식에 쓰러진 적이 날아가는 빠르기 (가로) — 평타는 살짝만 튄다
## strip = [시전 스트립 키, 한 컷 폭, 컷 수] · hand = 빛이 맺히는 손끝 [앞으로, 위로]
const ARTS := [
	{ "k": "whirl", "n": "선풍퇴", "type": "active", "need": 0, "d": "휘돌아 차서 앞을 쓸어낸다", "cd": 9.0, "mul": 1.5, "range": 74.0, "kb": 3.0,
		"strip": ["castw", 94, 9], "hand": [0.0, 10.0], "col": Color(0.84, 0.75, 0.55) },
	{ "k": "pagong", "n": "파공권", "type": "active", "need": 2, "d": "주먹 기운이 줄지은 적을 꿰뚫는다", "cd": 6.0, "mul": 2.4, "range": 190.0, "kb": 1.0,
		"strip": ["cast", 50, 7], "hand": [15.0, 27.0], "col": Color(1.0, 0.78, 0.35) },
	{ "k": "baekbo", "n": "암향지", "type": "active", "need": 5, "d": "손끝의 빛이 멀리 한 줄로 닿는다", "cd": 14.0, "mul": 4.0, "range": 300.0, "kb": 1.0,
		"strip": ["castb", 68, 6], "hand": [16.0, 28.0], "col": Color(0.77, 0.43, 1.0) },
	{ "k": "hwalin", "n": "활인기공", "type": "active", "need": 8, "d": "위태로우면 숨을 불어넣는다", "cd": 18.0, "heal": 0.30, "heal_lv": 0.04, "below": 0.45,
		"strip": ["casth", 36, 8], "hand": [0.0, 24.0], "col": Color(0.51, 0.9, 0.63) },
	{ "k": "bungsan", "n": "붕산장", "type": "active", "need": 11, "d": "산을 무너뜨리듯 눈앞을 다 친다", "cd": 30.0, "mul": 4.0, "range": 330.0, "kb": 2.2,
		"strip": ["castm", 90, 6], "hand": [11.0, 25.0], "col": Color(1.0, 0.36, 0.26) },
	{ "k": "honwon", "n": "혼원일기공", "type": "passive", "need": 0, "d": "흩어진 기운이 하나로 돈다", "stat": "atk", "inc": 0.06, "col": Color(0.62, 0.73, 0.88) },
	{ "k": "chulwoo", "n": "청죽공", "type": "passive", "need": 0, "d": "휘되 부러지지 않는다", "stat": "hp", "inc": 0.06, "col": Color(0.45, 0.82, 0.76) },
	{ "k": "samjae", "n": "삼재심법", "type": "passive", "need": 0, "d": "숨을 고르는 첫걸음", "stat": "regen", "inc": 0.10, "col": Color(0.87, 0.38, 0.46) },
]
const STAT_NAME := { "atk": "공격", "hp": "체력", "regen": "회복" }

const SAVE_PATH := "user://side1.json"
const SAVE_EVERY := 8.0
const HINT := "10단계를 넘으면 죽림의 수호자가 나타난다"
const HINT_BOSS := "수호자를 넘으면 다음 땅이 열린다 — 준비 중"
const HINT_DONE := "죽림을 넘었다 — 다음 땅은 준비 중"
const HINT_INSIGHT := "경지가 올랐다 — 무공 탭에서 깨달음을 고른다"

## 게임에 싣는 그림 키 전부 (tools/sync_art.py 가 이걸 읽어 ../assets 에서 복사한다)
static func asset_keys() -> Array:
	var ks: Array = ["silver", "train_atk", "train_hp", "train_regen"]
	for k in STRIP: ks.append(k)
	for z in ZONES: ks.append(z["bg"])
	for k in MID_PICK:
		if not ks.has(k): ks.append(k)
	for a in ARTS:
		ks.append("art_%s" % a["k"])
		if a.has("strip"): ks.append(a["strip"][0])
	ks.append("pashot")
	for k in FOES:
		var anim: Dictionary = FOES[k]["anim"]
		for a in anim:
			for f in anim[a]:
				var key: String = "%s_%s" % [k, f]
				if not ks.has(key): ks.append(key)
	return ks

# ── UI 색 ──
const C_BG := Color("0b1018")
const C_PANEL := Color("1a222e")
const C_PANEL2 := Color("0f151e")
const C_CARD := Color("1c2532")
const C_LINE := Color(0.627, 0.714, 0.839, 0.16)
const C_LINE2 := Color(0.627, 0.714, 0.839, 0.34)
const C_INK := Color("e6edf7")
const C_MUTE := Color("8a98ad")
const C_DIM := Color("5b6779")
const C_ACC := Color("9dbbe0")
const C_ACC2 := Color("5f7fa8")
const C_TEAL := Color("74d2c2")
const C_ROSE := Color("de6176")
const C_GOLD := Color("ecd08a")
const C_CAP := Color(0.055, 0.078, 0.125, 0.58)
