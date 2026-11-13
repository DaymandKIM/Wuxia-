extends RefCounted
## 게임 — 상태·수식·한 걸음. 그리기와 무관하다 (머리 없는 검사가 이것만 돌린다).
## 세계는 x 한 줄이다. 주인공은 오른쪽으로 달리고 적은 오른쪽에서 온다.
const D = preload("res://data.gd")

var zi := 0
var stage := 1
var kills := 0
var rexp := 0.0
var realm := 0
var silver := 0.0
var tr := { "atk": 0, "hp": 0, "regen": 0 }
var downs := 0
var total := 0
var boss_done := {}
var cleared := false
var t := 0.0
var wave_x := 0.0
var shake := 0.0
var realm_up := 0.0
var foes: Array = []
var fx: Array = []
var cam_x := 0.0
# 주인공
var px := 0.0
var hp := D.HERO_HP
var st := "run"
var af := 0.0
var cd := 0.0
var mv := 0
var key := "punch"
var hit_done := false
var flash := 0.0
var down_t := 0.0
var dust_t := 0.0
# 무공
var arts := {}                 # 키 → 단계
var insight := 0               # 아직 안 고른 깨달음
var offer: Array = []          # 지금 내민 석 장 (키)
var cds := {}                  # 키 → 남은 쿨
var cast_k := ""
var cast_t := 0.0
var cast_dur := 0.0
var cast_hit := false
var cast_gap := 0.0
var casts := 0
var shots: Array = []
var hitstop := 0.0             # 멈칫 — main 이 이만큼 step 을 쉰다 (검사·박자와 무관)
var call_k := ""               # 외치는 초식 이름
var call_t := 9.0
var _fid := 0

func _init() -> void:
	hp = hero_hp_max()
	cam_x = px - D.VW * D.HERO_X
	wave_x = px + D.WAVE_FIRST

# ── 수식 (옛 판과 같다) ──
func zone() -> Dictionary: return D.ZONES[zi]
func is_boss() -> bool: return stage > D.STAGE_N
func gstage() -> int: return zi * 10 + mini(stage, D.STAGE_N)
func stage_need() -> int: return int(maxf(D.NEED_ROUND, roundf((D.NEED_BASE + gstage() * D.NEED_PER) / D.NEED_ROUND) * D.NEED_ROUND))
func foe_hp() -> float: return D.DIFF_HP * pow(D.DIFF_HP_GROW, gstage() - 1)
func foe_dmg() -> float: return D.DIFF_DMG * pow(D.DIFF_DMG_GROW, gstage() - 1)
func boss_hp() -> float: return D.DIFF_HP * pow(D.DIFF_HP_GROW, zi * 10 + 9) * D.BOSS_HP
func boss_dmg() -> float: return D.DIFF_DMG * pow(D.DIFF_DMG_GROW, zi * 10 + 9) * D.BOSS_DMG
func train_def(k: String) -> Dictionary:
	for s in D.TRAIN:
		if s["k"] == k: return s
	return {}
func train_mul(k: String) -> float: return 1.0 + int(tr[k]) * float(train_def(k)["inc"]) / 100.0
func hero_dmg() -> float: return D.HERO_DMG * pow(D.GROW, realm) * train_mul("atk") * passive_mul("atk")
func hero_hp_max() -> float: return roundf(D.HERO_HP * pow(D.GROW, realm) * train_mul("hp") * passive_mul("hp"))
func hero_regen() -> float: return D.HERO_REGEN * pow(D.GROW, realm) * train_mul("regen") * passive_mul("regen")

# ── 무공 ──
func art_def(k: String) -> Dictionary:
	for a in D.ARTS:
		if a["k"] == k: return a
	return {}
func art_lv(k: String) -> int: return int(arts.get(k, 0))
func art_max(a: Dictionary) -> int: return D.ART_MAX if a["type"] == "active" else D.PASSIVE_MAX
func art_power(k: String, lv: int) -> float:       # 초식 위력 배수 (단계 반영)
	return float(art_def(k).get("mul", 0.0)) * (1.0 + D.ART_LV * (lv - 1))
func art_heal(k: String, lv: int) -> float:
	var a := art_def(k)
	return float(a.get("heal", 0.0)) + float(a.get("heal_lv", 0.0)) * (lv - 1)
func passive_mul(stat: String) -> float:
	var m := 1.0
	for a in D.ARTS:
		if a["type"] == "passive" and a["stat"] == stat: m += art_lv(a["k"]) * float(a["inc"])
	return m
func learned_actives() -> Array:
	return D.ARTS.filter(func(a): return a["type"] == "active" and art_lv(a["k"]) > 0)
## 석 장을 내민다 — 아직 안 배운 초식이 있으면 한 장은 꼭 그것이다 (새 초식을 놓치지 않게)
func make_offer() -> void:
	if not offer.is_empty() or insight <= 0: return
	var pool: Array = []
	var fresh := ""
	for a in D.ARTS:
		if int(a["need"]) > realm or art_lv(a["k"]) >= art_max(a): continue
		if a["type"] == "active" and art_lv(a["k"]) == 0 and fresh == "": fresh = a["k"]
		else: pool.append(a["k"])
	pool.shuffle()
	if fresh != "": offer.append(fresh)
	while offer.size() < 3 and not pool.is_empty(): offer.append(pool.pop_back())
	if offer.is_empty(): insight = 0                # 더 배울 것이 없다
func pick(i: int) -> bool:
	if i < 0 or i >= offer.size(): return false
	var k: String = offer[i]
	var before := hero_hp_max()
	arts[k] = art_lv(k) + 1
	hp += hero_hp_max() - before
	insight -= 1
	offer = []
	make_offer()
	return true
func realm_need(k: int) -> float: return roundf(D.EXP_BASE * pow(D.EXP_GROW, k))
func kill_exp() -> float: return pow(D.KILL_GROW, gstage() - 1)
func kill_silver() -> float: return roundf(D.SILVER_BASE * pow(D.SILVER_GROW, gstage() - 1))
func realm_name(k: int) -> String:
	var tier := k / D.REALM_PER
	if tier < D.REALM_NAMES.size(): return "%s %d성" % [D.REALM_NAMES[tier], k % D.REALM_PER + 1]
	return "%s %d성" % [D.REALM_LAST, k - D.REALM_NAMES.size() * D.REALM_PER + 1]
func train_cap() -> int: return (realm + 1) * D.TRAIN_CAP_PER
func train_cost(k: String) -> float:
	var s := train_def(k)
	return roundf(float(s["cb"]) * pow(float(s["cg"]), int(tr[k])))
func train_buy(k: String) -> bool:
	if int(tr[k]) >= train_cap(): return false
	var c := train_cost(k)
	if silver < c: return false
	silver -= c
	tr[k] = int(tr[k]) + 1
	if k == "hp": hp = minf(hero_hp_max(), hp + hero_hp_max() * 0.02)
	return true

static func fmt(n: float) -> String:
	if n < 1e4: return str(int(floor(n)))
	if n < 1e8: return _trim(n / 1e4, 2 if n < 1e5 else 1) + "만"
	return _trim(n / 1e8, 2) + "억"
static func _trim(v: float, dec: int) -> String:
	var s := String.num(v, dec)
	if s.contains("."): s = s.rstrip("0").rstrip(".")
	return s

func foe_m(f: Dictionary) -> Dictionary: return D.FOES[f["k"]]
func foe_rad(f: Dictionary) -> float:
	var m := foe_m(f)
	return float(m.get("sw", m["w"])) * float(m.get("sc", 1.0)) * (D.BOSS_EDGE if f["boss"] else D.FOE_EDGE)
func moves() -> Array:
	return D.MOVES.filter(func(m): return int(m["need"]) <= realm)
func move_of(k: String) -> Dictionary:
	for m in D.MOVES:
		if m["key"] == k: return m
	return D.MOVES[0]

func _new_foe(k: String, x: float, boss: bool, hpv: float) -> Dictionary:
	_fid += 1
	return { "id": _fid, "vx": 0.0, "vy": 0.0, "fy": 0.0, "rot": 0.0, "k": k, "boss": boss, "x": x, "y": 0.0, "hp": hpv, "hp_max": hpv, "st": "walk", "af": 0.0, "atk_t": 0.0, "cd": 0.0,
		"skill_cd": D.SKILL_CD, "hit_done": false, "hit_t": 0.0, "flash": 0.0, "dead": 0.0, "stop": 0.0, "swept": false }

func spawn_wave() -> void:
	var s := mini(stage, D.STAGE_N)
	var list: Array = zone()["foes"]
	var x := maxf(cam_x + D.VW + D.WAVE_AHEAD, wave_x)
	for i in D.stage_max(s):
		var k: String = list[randi() % list.size()]
		var f := _new_foe(k, x, false, roundf(foe_hp() * float(D.FOES[k]["hp"])))
		f["y"] = randf_range(-D.WAVE_JITTER_Y, D.WAVE_JITTER_Y)
		f["af"] = randf_range(0.0, 4.0)
		f["cd"] = randf_range(0.2, 0.9)
		f["stop"] = randf_range(D.WAVE_STOP[0], D.WAVE_STOP[1])
		foes.append(f)
		x += randf_range(D.WAVE_GAP[0], D.WAVE_GAP[1])
	wave_x = x

func spawn_boss() -> void:
	var f := _new_foe(zone()["boss"], px + D.BOSS_ENTER, true, roundf(boss_hp()))
	f["cd"] = 1.2
	foes.append(f)
	hp = hero_hp_max()                       # 만회복하고 맞선다
	shake = D.SHAKE_T

func _sweep() -> void:
	for f in foes:
		if f["dead"] <= 0.0:
			f["dead"] = 0.001; f["st"] = "death"; f["af"] = 0.0; f["swept"] = true

func enter_stage() -> void:
	kills = 0
	hp = hero_hp_max()                       # 단계에 들어설 때 회복
	_sweep()
	wave_x = 0.0
	if is_boss(): spawn_boss()

func fx_add(o: Dictionary) -> void:
	o["t"] = 0.0
	fx.append(o)
	if fx.size() > 90: fx.pop_front()

func hurt_foe(f: Dictionary, dmg: float, kb := 1.0, art := "") -> void:
	var skill := art != ""
	f["hp"] -= dmg
	f["flash"] = D.FLASH * (2.0 if skill else 1.0)
	f["x"] += D.HERO_KB * kb * (0.3 if f["boss"] else 1.0)
	if f["st"] != "atk" and f["st"] != "skill":
		f["st"] = "hit"; f["hit_t"] = D.FOE_HITT
	var m := foe_m(f)
	var hy := float(m.get("bh", m["h"])) * float(m.get("sc", 1.0))
	var col: Color = art_def(art)["col"] if skill else D.SPARK_C
	fx_add({ "k": "dmg", "x": f["x"] + randf_range(-6, 6), "y": -hy - 4.0, "v": roundf(dmg), "hero": false, "skill": skill, "col": col })
	fx_add({ "k": "hit", "x": f["x"] - foe_rad(f) * 0.5, "y": -hy * 0.5 + f["y"], "col": col, "seed": randi(), "big": skill })
	for i in D.SPARK_N + (5 if skill else 0):
		var a := randf_range(-1.1, 1.1)
		fx_add({ "k": "spark", "x": f["x"] - foe_rad(f) * 0.6, "y": -hy * 0.5 + f["y"], "col": col, "vx": cos(a) * randf_range(40, D.SPARK_SPD), "vy": sin(a) * randf_range(40, D.SPARK_SPD) - 30.0 })
	if skill: hitstop = maxf(hitstop, D.HITSTOP)
	if f["hp"] <= 0.0 and f["dead"] <= 0.0: kill_foe(f, kb if skill else 0.0)

func kill_foe(f: Dictionary, launch := 0.0) -> void:
	f["dead"] = 0.001; f["st"] = "death"; f["af"] = 0.0; f["hp"] = 0.0
	total += 1
	var boss: bool = f["boss"]
	if not boss:                                # 쓰러지며 뒤로 튄다 — 초식에 맞으면 멀리 날아간다
		if launch > 0.0:
			f["vx"] = randf_range(D.LAUNCH[0], D.LAUNCH[1]) * minf(1.6, 0.7 + launch * 0.3); f["vy"] = -randf_range(150.0, 230.0)
		else:
			f["vx"] = randf_range(30.0, 60.0); f["vy"] = -randf_range(50.0, 90.0)
	rexp += kill_exp() * (D.BOSS_EXP if boss else 1.0)
	var sv := kill_silver() * (D.SILVER_BOSS if boss else 1.0)
	if boss:
		if not boss_done.has(str(zi)):
			boss_done[str(zi)] = 1
			sv += kill_silver() * D.SILVER_FIRST
		cleared = true
		shake = D.SHAKE_T * 1.6
		hitstop = 0.14
		stage = D.STAGE_N                      # 다음 구역은 아직 없다 — 마지막 단계에서 계속 사냥한다
		enter_stage()
	else:
		kills += 1
	silver += sv
	fx_add({ "k": "coin", "x": f["x"], "y": -30.0, "v": sv })
	while rexp >= realm_need(realm):
		rexp -= realm_need(realm); realm += 1; hp = hero_hp_max(); realm_up = 2.2
		insight += 1
	make_offer()
	if not boss and kills >= stage_need():
		stage += 1
		enter_stage()

# ── 초식 — 쿨이 찬 것을 알아서 쓴다. 한 번에 하나만. ──
func _try_cast(nd: float) -> bool:
	for a in learned_actives():
		var k: String = a["k"]
		if float(cds.get(k, 0.0)) > 0.0: continue
		if a.has("heal"):
			if hp >= hero_hp_max() * float(a["below"]): continue
		elif nd > float(a["range"]) * 0.85: continue
		st = "cast"; af = 0.0; cast_k = k; cast_t = 0.0; cast_hit = false
		cast_dur = int(a["strip"][2]) / D.CAST_FPS
		cds[k] = float(a["cd"])
		call_k = k; call_t = 0.0
		casts += 1
		return true
	return false

func _art_fire(k: String) -> void:
	var a := art_def(k)
	var lv := art_lv(k)
	if a.has("heal"):
		var amt := hero_hp_max() * art_heal(k, lv)
		hp = minf(hero_hp_max(), hp + amt)
		fx_add({ "k": "heal", "x": px, "y": 0.0, "seed": randi() })
		fx_add({ "k": "dmg", "x": px, "y": -56.0, "v": roundf(amt), "hero": false, "skill": true, "col": a["col"], "plus": true })
		return
	var dmg := hero_dmg() * art_power(k, lv)
	var rng := float(a["range"])
	var kb := float(a.get("kb", 1.0))
	if k == "pagong":
		shots.append({ "x": px + 18.0, "x0": px + 18.0, "range": rng, "dmg": dmg, "kb": kb, "art": k, "hit": [], "t": 0.0 })
		return
	for f in foes.duplicate():
		if f["dead"] > 0.0: continue
		if f["x"] - px < rng + foe_rad(f): hurt_foe(f, dmg, kb, k)
	match k:
		"whirl": fx_add({ "k": "whirl", "x": px, "y": 0.0, "r": rng })
		"baekbo": fx_add({ "k": "beam", "x": px + float(a["hand"][0]), "y": -float(a["hand"][1]), "len": rng })
		"bungsan":
			fx_add({ "k": "quake", "x": px, "y": 0.0, "r": rng })
			shake = D.SHAKE_T * 2.0; hitstop = maxf(hitstop, 0.09)

func hurt_hero(d: float) -> void:
	if st == "down": return
	hp -= d
	flash = D.HERO_FLASH
	fx_add({ "k": "dmg", "x": px + randf_range(-5, 5), "y": -52.0, "v": roundf(d), "hero": true })
	if hp <= 0.0:
		hp = 0.0; st = "down"; af = 0.0; down_t = D.HERO_DOWN; downs += 1; shake = D.SHAKE_T
		shots.clear()
		if is_boss(): stage = D.STAGE_N         # 수호자에게 지면 10단계로 물러난다
		_sweep()
		kills = 0; wave_x = 0.0

func step(dt: float) -> void:
	t += dt
	if shake > 0.0: shake -= dt
	if realm_up > 0.0: realm_up -= dt
	# ── 주인공
	if flash > 0.0: flash -= dt
	if st == "down":
		af += dt * float(D.ANIM["medit"][1]); down_t -= dt
		hp = minf(hero_hp_max(), hp + hero_hp_max() * dt / D.HERO_DOWN)
		if down_t <= 0.0:
			st = "idle"; hp = hero_hp_max(); cd = 0.2
	else:
		hp = minf(hero_hp_max(), hp + hero_regen() * dt)
		if cd > 0.0: cd -= dt
		var near: Variant = null
		var nd := 1e9
		for f in foes:
			if f["dead"] > 0.0: continue
			var d: float = f["x"] - px
			if d < nd: nd = d; near = f
		if st == "atk":
			af += dt * float(D.ANIM["atk"][1])
			if not hit_done and af >= D.HITFRAME:
				hit_done = true
				var m := move_of(key)
				var dmg := hero_dmg()
				var any := false
				for f in foes.duplicate():
					if f["dead"] > 0.0: continue
					if f["x"] - px < float(m["reach"]) + foe_rad(f) + D.HERO_REACH + 2.0:
						hurt_foe(f, dmg); any = true
				if any: fx_add({ "k": "slash", "x": px + float(m["reach"]) + 8.0, "y": -26.0 })
			if af >= int(D.ANIM["atk"][0]):
				st = "idle"; af = 0.0
		if cast_gap > 0.0: cast_gap -= dt
		for k in cds: cds[k] = maxf(0.0, float(cds[k]) - dt)
		if st == "cast":
			cast_t += dt; af = cast_t * D.CAST_FPS
			if not cast_hit and cast_t >= cast_dur * D.CAST_HITAT:
				cast_hit = true
				_art_fire(cast_k)
			if cast_t >= cast_dur:
				st = "idle"; af = 0.0; cast_gap = D.CAST_GAP
		elif st != "atk" and cast_gap <= 0.0: _try_cast(nd)
		if st != "atk" and st != "cast":
			var list := moves()
			var m2: Dictionary = list[mv % list.size()]
			var in_reach: bool = near != null and nd < float(m2["reach"]) + foe_rad(near) + D.HERO_REACH
			if in_reach:
				if cd <= 0.0:
					st = "atk"; af = 0.0; hit_done = false; key = m2["key"]; mv += 1; cd = D.HERO_ATKCD
				elif st != "idle":
					st = "idle"; af = 0.0
			else:
				if st != "run":
					st = "run"; af = 0.0
				px += D.HERO_SPD * dt
				af += dt * float(D.ANIM["run"][1])
				dust_t -= dt
				if dust_t <= 0.0:
					dust_t = D.HERO_DUST
					fx_add({ "k": "dust", "x": px - 10.0, "y": -2.0, "r": randf_range(3.0, D.DUST_R) })
	# ── 적
	var spd := D.stage_spd(mini(stage, D.STAGE_N))
	var alive := 0
	var down := st == "down"
	for f in foes:
		var m := foe_m(f)
		var fps: Dictionary = m["fps"]
		var anim: Dictionary = m["anim"]
		if f["flash"] > 0.0: f["flash"] -= dt
		if f["dead"] > 0.0:
			f["dead"] += dt; f["af"] += dt * float(fps["death"])
			if f["vx"] != 0.0 or f["fy"] < 0.0:      # 날아가는 중
				f["x"] += f["vx"] * dt; f["fy"] += f["vy"] * dt; f["vy"] += 620.0 * dt; f["rot"] += dt * f["vx"] * 0.045
				if f["fy"] >= 0.0:
					f["fy"] = 0.0; f["vx"] = 0.0; f["vy"] = 0.0
					fx_add({ "k": "dust", "x": f["x"], "y": -2.0, "r": 5.0 })
			continue
		alive += 1
		var boss: bool = f["boss"]
		var d: float = f["x"] - px
		var rng: float = (D.BOSS_RANGE if boss else float(m["range"])) + f["stop"]
		if f["st"] == "hit":
			f["hit_t"] -= dt
			if f["hit_t"] <= 0.0: f["st"] = "idle"
			continue
		if f["st"] == "skill":
			f["atk_t"] -= dt
			var p: float = 1.0 - f["atk_t"] / D.SKILL_DUR
			f["af"] = p * anim["skill"].size()
			if not f["hit_done"] and p >= D.SKILL_HITAT:
				f["hit_done"] = true; shake = D.SHAKE_T
				fx_add({ "k": "ring", "x": f["x"], "y": -20.0, "r": D.SKILL_RANGE })
				if d < D.SKILL_RANGE: hurt_hero(boss_dmg() * D.SKILL_DMG)
			if f["atk_t"] <= 0.0:
				f["st"] = "idle"; f["cd"] = D.FOE_CD
			continue
		if f["st"] == "atk":
			var dur := D.BOSS_DUR if boss else D.FOE_DUR
			f["atk_t"] -= dt
			var p2: float = 1.0 - f["atk_t"] / dur
			f["af"] = p2 * anim["atk"].size()
			if not f["hit_done"] and p2 >= (D.BOSS_HITAT if boss else D.FOE_HITAT):
				f["hit_done"] = true
				if d < rng + (D.BOSS_HITPAD if boss else D.FOE_HITPAD):
					hurt_hero(boss_dmg() if boss else foe_dmg() * float(m["dmg"]))
			if f["atk_t"] <= 0.0:
				f["st"] = "idle"; f["cd"] = D.FOE_CD * randf_range(0.8, 1.3)
			continue
		if f["cd"] > 0.0: f["cd"] -= dt
		if boss and not down:
			f["skill_cd"] -= dt
			if f["skill_cd"] <= 0.0 and d < D.SKILL_RANGE:
				f["skill_cd"] = D.SKILL_CD; f["st"] = "skill"; f["atk_t"] = D.SKILL_DUR; f["hit_done"] = false
				continue
		if d > rng and not down:
			f["st"] = "walk"
			f["x"] -= spd * (D.BOSS_SPD if boss else float(m["spd"])) * dt
			f["af"] += dt * float(fps["walk"])
		elif f["cd"] <= 0.0 and not down:
			f["st"] = "atk"; f["atk_t"] = D.BOSS_DUR if boss else D.FOE_DUR; f["hit_done"] = false; f["af"] = 0.0
		else:
			f["st"] = "idle"; f["af"] += dt * float(fps["idle"])
	for i in range(foes.size() - 1, -1, -1):
		var f2: Dictionary = foes[i]
		var m3 := foe_m(f2)
		if f2["dead"] > 0.0 and f2["dead"] > m3["anim"]["death"].size() / float(m3["fps"]["death"]) + D.FOE_FADE: foes.remove_at(i)
	# ── 떼
	down = st == "down"
	if not is_boss() and not down and alive <= D.WAVE_LEFT: spawn_wave()
	if is_boss() and alive == 0 and not down and not foes.any(func(f): return f["boss"]): spawn_boss()
	# ── 탄 (파공권) — 지나가며 닿는 적을 한 번씩 친다
	for i in range(shots.size() - 1, -1, -1):
		var s: Dictionary = shots[i]
		s["x"] += D.SHOT_SPD * dt; s["t"] += dt
		for f in foes.duplicate():
			if f["dead"] > 0.0 or s["hit"].has(f["id"]): continue
			if f["x"] - foe_rad(f) < s["x"] + 14.0:
				s["hit"].append(f["id"]); hurt_foe(f, s["dmg"], s["kb"], s["art"])
		if s["x"] - s["x0"] > s["range"]: shots.remove_at(i)
	call_t += dt
	# ── 연출·카메라
	for i in range(fx.size() - 1, -1, -1):
		var e: Dictionary = fx[i]
		e["t"] += dt
		var life := D.SPARK_LIFE
		match e["k"]:
			"dmg", "coin": life = D.DMG_LIFE
			"dust": life = D.DUST_LIFE
			"ring": life = D.RING_LIFE
			"hit": life = 0.14
			"whirl": life = 0.42
			"beam": life = 0.32
			"heal": life = 0.9
			"quake": life = 0.6
			"slash": life = D.SLASH_LIFE
		if e["t"] > life: fx.remove_at(i)
		elif e["k"] == "spark":
			e["x"] += e["vx"] * dt; e["y"] += e["vy"] * dt; e["vy"] += 300.0 * dt
	cam_x += (px - D.VW * D.HERO_X - cam_x) * minf(1.0, dt * D.CAM_K)

# ── 저장 — 막힌 환경에선 조용히 넘어간다 ──
func save_data() -> Dictionary:
	return { "stage": stage, "kills": kills, "exp": rexp, "realm": realm, "silver": silver, "tr": tr, "downs": downs, "total": total, "boss_done": boss_done, "cleared": cleared,
		"arts": arts, "insight": insight, "offer": offer }
func save_now() -> bool:
	var f := FileAccess.open(D.SAVE_PATH, FileAccess.WRITE)
	if f == null: return false
	f.store_string(JSON.stringify(save_data()))
	f.close()
	return true
func apply_save(d: Variant) -> bool:
	if typeof(d) != TYPE_DICTIONARY: return false
	stage = clampi(int(d.get("stage", 1)), 1, D.STAGE_N + 1)
	kills = maxi(0, int(d.get("kills", 0)))
	rexp = maxf(0.0, float(d.get("exp", 0.0)))
	realm = maxi(0, int(d.get("realm", 0)))
	silver = maxf(0.0, float(d.get("silver", 0.0)))
	var trd: Variant = d.get("tr", {})
	for s in D.TRAIN:
		tr[s["k"]] = maxi(0, int(trd.get(s["k"], 0))) if typeof(trd) == TYPE_DICTIONARY else 0
	downs = int(d.get("downs", 0)); total = int(d.get("total", 0))
	var bd: Variant = d.get("boss_done", {})
	boss_done = bd if typeof(bd) == TYPE_DICTIONARY else {}
	cleared = bool(d.get("cleared", false))
	if is_boss(): stage = D.STAGE_N
	arts = {}
	var ad: Variant = d.get("arts", {})
	if typeof(ad) == TYPE_DICTIONARY:
		for a in D.ARTS:
			var lv := clampi(int(ad.get(a["k"], 0)), 0, art_max(a))
			if lv > 0: arts[a["k"]] = lv
	insight = maxi(0, int(d.get("insight", 0)))
	offer = []
	var od: Variant = d.get("offer", [])
	if typeof(od) == TYPE_ARRAY:
		for k in od:
			if not art_def(str(k)).is_empty() and art_lv(str(k)) < art_max(art_def(str(k))) and offer.size() < 3: offer.append(str(k))
	make_offer()
	hp = hero_hp_max()
	return true
func load_save() -> bool:
	if not FileAccess.file_exists(D.SAVE_PATH): return false
	var f := FileAccess.open(D.SAVE_PATH, FileAccess.READ)
	if f == null: return false
	var txt := f.get_as_text()
	f.close()
	return apply_save(JSON.parse_string(txt))
