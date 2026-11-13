extends Node2D
## 장면 — 밤 안개 → 중경 실루엣 → 땅 → 인물 → 연출 → 위쪽 어둠.
## **원경만 어둡게 덮고 인물은 그 위에 밝게** 그린다 — 어두운 톤에서도 싸움이 읽히는 이유다.
const D = preload("res://data.gd")
const Art = preload("res://art.gd")
var g
var vh := D.SCENE_MIN
var gy := 0.0

func th(a: int, b: int) -> float:               # 결정적 해시 — 소품·자갈 자리 (저장 필요 없음)
	var h := (a * 374761393 + b * 668265263) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	return h / 4294967296.0

func grad(r: Rect2, c0: Color, c1: Color) -> void:
	draw_polygon(PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y)]), PackedColorArray([c0, c0, c1, c1]))

func shadow(x: float, y: float, w: float) -> void:
	draw_set_transform(Vector2(x, y), 0.0, Vector2(1.0, 0.2))
	draw_circle(Vector2.ZERO, w, D.SHADOW)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw() -> void:
	if g == null: return
	gy = vh - D.GROUND
	var W := D.VW + 16.0
	draw_rect(Rect2(-8, 0, W, gy + 2), D.VEIL)
	# 원경 윗변을 하늘로 녹인다 (윗변이 선으로 남는다)
	var bh := roundf(vh * D.BACK_HR)
	var btop := gy - bh + D.BACK_SINK + roundf(bh * D.BACK_TOP)
	draw_rect(Rect2(-8, 0, W, btop + 1), D.SKY)
	grad(Rect2(-8, btop, W, roundf(bh * D.BACK_FADE)), D.SKY, Color(D.SKY, 0.0))
	_mid()
	var m0 := gy - D.MIST_UP
	var mk := (D.MIST_UP + D.MIST_DOWN) * 0.78
	grad(Rect2(-8, m0, W, mk), Color(D.MIST, 0.0), Color(D.MIST, D.MIST_A))
	grad(Rect2(-8, m0 + mk, W, D.MIST_UP + D.MIST_DOWN - mk), Color(D.MIST, D.MIST_A), Color(D.MIST, 0.0))
	grad(Rect2(-8, gy, W, vh - gy), D.GROUND_TOP, D.GROUND_BOT)
	draw_rect(Rect2(-8, gy, W, 1), D.LINE)
	_grit()
	var es: Array = [{ "y": 0.5, "hero": true }]
	for f in g.foes: es.append({ "y": f["y"], "f": f })
	es.sort_custom(func(a, b): return a["y"] < b["y"])
	for e in es:
		if e.has("hero"): _hero(g.px - g.cam_x)
		else:
			var sx: float = e["f"]["x"] - g.cam_x
			if sx > -160.0 and sx < D.VW + 160.0: _foe(e["f"], sx)
	_fx()
	grad(Rect2(-8, 0, W, vh * D.VIG_H), Color(D.VIG, D.VIG_A), Color(D.VIG, 0.0))

func _mid() -> void:
	var G := D.MID_GRID
	var mx: float = g.cam_x * D.MID_PAR
	for c in range(int(floor(mx / G)) - 1, int(floor((mx + D.VW) / G)) + 2):
		if th(c, 11) > D.MID_DENS: continue
		var key: String = D.MID_PICK[int(th(c, 12) * D.MID_PICK.size())]
		var im := Art.tex(key)
		if im == null: continue
		var h := roundf(float(D.PROPH.get(key, 80.0)) * D.MID_SCALE * (0.85 + th(c, 13) * 0.4))
		var w := roundf(h * im.get_width() / im.get_height())
		draw_texture_rect(im, Rect2(roundf(c * G + th(c, 14) * G - mx - w / 2.0), gy + D.MID_SINK - h, w, h), false, D.PROP_TINT)

func _grit() -> void:
	var G := D.GRIT_GRID
	var dep := D.GROUND - 14.0
	for c in range(int(floor(g.cam_x / G)) - 1, int(floor((g.cam_x + D.VW) / G)) + 2):
		if th(c, 31) > D.GRIT_DENS: continue
		var d := th(c, 32)
		var col := D.GRIT_DARK if th(c, 34) < 0.5 else D.GRIT_LITE
		col.a *= 1.0 - d * 0.75
		draw_rect(Rect2(roundf(c * G + th(c, 35) * G - g.cam_x), gy + 5.0 + roundf(d * d * dep), roundf(3.0 + th(c, 33) * 6.0), 1), col)

func _hero(sx: float) -> void:
	var y := gy + 4.0
	var key: String = "idle"
	var n := 1
	match g.st:
		"atk": key = g.key; n = int(D.ANIM["atk"][0])
		"down": key = "medit"; n = int(D.ANIM["medit"][0])
		"run": key = "run"; n = int(D.ANIM["run"][0])
	var fi := mini(n - 1, int(g.af)) if g.st == "atk" else int(g.af) % n
	shadow(sx, y, 13.0)
	var im := Art.tex(key)
	if im == null: return
	var fw := float(D.STRIP[key])
	var fh := float(im.get_height())
	var mod := Color(1.7, 1.7, 1.7) if g.flash > 0.0 else Color.WHITE
	draw_texture_rect_region(im, Rect2(roundf(sx - fw / 2.0), y - fh, fw, fh), Rect2(fw * fi, 0, fw, fh), mod)

func foe_frame(f: Dictionary) -> String:
	var m: Dictionary = D.FOES[f["k"]]
	var a: String = f["st"] if m["anim"].has(f["st"]) else "idle"
	var fr: Array = m["anim"][a]
	var hold := a == "death" or a == "atk" or a == "skill"
	var i := mini(fr.size() - 1, int(f["af"])) if hold else int(f["af"]) % fr.size()
	return "%s_%s" % [f["k"], fr[i]]

func _foe(f: Dictionary, sx: float) -> void:
	var m: Dictionary = D.FOES[f["k"]]
	var sc := float(m.get("sc", 1.0))
	var y: float = gy + 4.0 + f["y"]
	var a := 1.0
	if f["dead"] > 0.0:
		var t: float = f["dead"] - m["anim"]["death"].size() / float(m["fps"]["death"])
		if t > 0.0: a = maxf(0.0, 1.0 - t / D.FOE_FADE)
	draw_set_transform(Vector2(sx, y), 0.0, Vector2(1.0, 0.2))
	draw_circle(Vector2.ZERO, float(m.get("sw", m["w"])) * sc * 0.42, Color(D.SHADOW, D.SHADOW.a * a))
	var im := Art.tex(foe_frame(f))
	if im != null:
		var w := roundf(float(m["w"]) * sc)
		var h := roundf(float(m["h"]) * sc)
		var v := 1.9 if f["flash"] > 0.0 else 1.0
		draw_set_transform(Vector2(roundf(sx), 0.0), 0.0, Vector2(-1.0, 1.0))      # 그림은 오른쪽 보기 — 적은 늘 왼쪽(주인공)을 본다
		draw_texture_rect(im, Rect2(-w / 2.0, y - h, w, h), false, Color(v, v, v, a))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if f["dead"] <= 0.0 and not f["boss"] and f["hp"] < f["hp_max"]:              # 다친 적만 얇은 체력 줄
		var by: float = y - float(m.get("bh", m["h"])) * sc - 7.0
		draw_rect(Rect2(roundf(sx - 13.0), by, 26, 3), Color(0.031, 0.047, 0.078, 0.7))
		draw_rect(Rect2(roundf(sx - 13.0), by, roundf(26.0 * maxf(0.0, f["hp"] / f["hp_max"])), 3), D.C_ROSE)

func _fx() -> void:
	var font := Art.font("sans-semibold")
	for e in g.fx:
		var sx: float = e["x"] - g.cam_x
		var y: float = gy + e["y"]
		var t: float = e["t"]
		match e["k"]:
			"spark":
				draw_rect(Rect2(roundf(sx), roundf(y), 2, 2), Color(D.SPARK_C, 1.0 - t / D.SPARK_LIFE))
			"dust":
				var p := t / D.DUST_LIFE
				draw_circle(Vector2(sx - p * 10.0, y - p * 7.0), float(e["r"]) * (1.0 + p), Color(D.DUST_C, 0.42 * (1.0 - p)))
			"slash":
				var p2 := t / D.SLASH_LIFE
				draw_arc(Vector2(sx - 10.0, y), D.SLASH_R + p2 * 8.0, -0.9, 0.9, 14, Color(D.SLASH_C, 0.85 * (1.0 - p2)), 3.0 * (1.0 - p2) + 1.0, true)
			"ring":
				var p3 := t / D.RING_LIFE
				draw_set_transform(Vector2(sx, gy + 4.0), 0.0, Vector2(1.0, 0.22))
				draw_arc(Vector2.ZERO, float(e["r"]) * p3, 0.0, TAU, 48, Color(0.745, 0.47, 1.0, 0.7 * (1.0 - p3)), 5.0, true)
				draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
			"dmg", "coin":
				var p4 := t / D.DMG_LIFE
				var yy := y - p4 * D.DMG_RISE
				var coin: bool = e["k"] == "coin"
				var txt: String = ("+" if coin else "") + str(g.fmt(e["v"]))
				var al := 1.0 if p4 < 0.7 else 1.0 - (p4 - 0.7) / 0.3
				var col := D.C_GOLD if coin else (Color(1.0, 0.5, 0.54) if e.get("hero", false) else Color(0.94, 0.965, 1.0))
				var sz := 11 if coin else D.DMG_SIZE
				draw_string_outline(font, Vector2(sx - 40.0, yy), txt, HORIZONTAL_ALIGNMENT_CENTER, 80.0, sz, 3, Color(0.024, 0.039, 0.063, al))
				draw_string(font, Vector2(sx - 40.0, yy), txt, HORIZONTAL_ALIGNMENT_CENTER, 80.0, sz, Color(col, al))
