extends Node2D
## 장면 — 밤 안개 → 중경 실루엣 → 땅 → 인물 → 연출 → 위쪽 어둠.
## **원경만 어둡게 덮고 인물은 그 위에 밝게** 그린다 — 어두운 톤에서도 싸움이 읽히는 이유다.
const D = preload("res://data.gd")
const Art = preload("res://art.gd")
var g
var vh := D.SCENE_MIN
var gy := 0.0
## 층 — 0 세계(안개·땅·인물) · 1 빛(가산 합성: 타격·초식 이펙트) · 2 글자(피해 숫자·초식 이름)
## 같은 스크립트를 세 번 얹는다. 빛을 따로 두는 이유: 가산 합성은 노드 단위 재질이라서다.
var layer := 0

func _ready() -> void:
	if layer == 1:
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		material = m

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

func gball(c: Vector2, r: float, col: Color, a: float) -> void:      # 빛무리 — 동심원 다섯 겹
	for i in range(5, 0, -1): draw_circle(c, r * i / 5.0, Color(col, a * 0.22))

func _draw() -> void:
	if g == null: return
	gy = vh - D.GROUND
	if layer == 1:
		_glow(); return
	if layer == 2:
		_text(); return
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
	_shots()
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
	var fw := float(D.STRIP.get(key, 24))
	if g.st == "cast":
		var strip: Array = g.art_def(g.cast_k)["strip"]
		key = strip[0]; fw = float(strip[1]); n = int(strip[2])
	var fi := mini(n - 1, int(g.af)) if (g.st == "atk" or g.st == "cast") else int(g.af) % n
	shadow(sx, y, 13.0)
	var im := Art.tex(key)
	if im == null: return
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
		if f["fy"] < 0.0 or f["rot"] != 0.0:                                         # 날아가는 중 — 몸 가운데를 축으로 돈다
			draw_set_transform(Vector2(roundf(sx), y + f["fy"] - h * 0.4), f["rot"], Vector2(-1.0, 1.0))
			draw_texture_rect(im, Rect2(-w / 2.0, -h * 0.6, w, h), false, Color(v, v, v, a))
		else:
			draw_set_transform(Vector2(roundf(sx), 0.0), 0.0, Vector2(-1.0, 1.0))      # 그림은 오른쪽 보기 — 적은 늘 왼쪽(주인공)을 본다
			draw_texture_rect(im, Rect2(-w / 2.0, y - h, w, h), false, Color(v, v, v, a))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if f["dead"] <= 0.0 and not f["boss"] and f["hp"] < f["hp_max"]:              # 다친 적만 얇은 체력 줄
		var by: float = y - float(m.get("bh", m["h"])) * sc - 7.0
		draw_rect(Rect2(roundf(sx - 13.0), by, 26, 3), Color(0.031, 0.047, 0.078, 0.7))
		draw_rect(Rect2(roundf(sx - 13.0), by, roundf(26.0 * maxf(0.0, f["hp"] / f["hp_max"])), 3), D.C_ROSE)

func _shots() -> void:                           # 파공권 권기 — 그림은 세계 층, 빛은 빛 층
	var im := Art.tex("pashot")
	if im == null: return
	for sh in g.shots:
		var fi := int(sh["t"] * 14.0) % 4
		draw_texture_rect_region(im, Rect2(roundf(sh["x"] - g.cam_x - 30.0), gy - 27.0 - 15.0, 46, 30), Rect2(46 * fi, 0, 46, 30))

func _fx() -> void:                              # 세계 층 — 먼지·수호자 고리
	for e in g.fx:
		var sx: float = e["x"] - g.cam_x
		var y: float = gy + e["y"]
		var t: float = e["t"]
		match e["k"]:
			"dust":
				var p := t / D.DUST_LIFE
				draw_circle(Vector2(sx - p * 10.0, y - p * 7.0), float(e["r"]) * (1.0 + p), Color(D.DUST_C, 0.42 * (1.0 - p)))
			"ring":
				var p3 := t / D.RING_LIFE
				draw_set_transform(Vector2(sx, gy + 4.0), 0.0, Vector2(1.0, 0.22))
				draw_arc(Vector2.ZERO, float(e["r"]) * p3, 0.0, TAU, 48, Color(0.745, 0.47, 1.0, 0.7 * (1.0 - p3)), 5.0, true)
				draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _glow() -> void:                            # 빛 층 (가산 합성) — 겹칠수록 밝아진다
	var hx: float = g.px - g.cam_x
	# 시전 중 손끝에 맺히는 기운
	if g.st == "cast":
		var a: Dictionary = g.art_def(g.cast_k)
		var p0: float = clampf(g.cast_t / maxf(0.01, g.cast_dur), 0.0, 1.0)
		var c0 := Vector2(hx + float(a["hand"][0]), gy + 4.0 - float(a["hand"][1]))
		gball(c0, 9.0 + 16.0 * sin(p0 * PI), a["col"], 0.9)
		draw_set_transform(Vector2(hx, gy + 4.0), 0.0, Vector2(1.0, 0.24))
		draw_arc(Vector2.ZERO, 12.0 + 26.0 * p0, 0.0, TAU, 36, Color(a["col"], 0.55 * (1.0 - p0)), 3.0, true)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	for sh in g.shots:                            # 권기 탄 빛과 꼬리
		var sx0: float = sh["x"] - g.cam_x
		var col0: Color = g.art_def(sh["art"])["col"]
		for i in 6: gball(Vector2(sx0 - i * 9.0, gy - 27.0), 12.0 - i * 1.6, col0, 0.8 - i * 0.12)
		draw_rect(Rect2(sx0 - 70.0, gy - 28.0, 70, 2), Color(col0, 0.35))
	for e in g.fx:
		var sx: float = e["x"] - g.cam_x
		var y: float = gy + e["y"]
		var t: float = e["t"]
		match e["k"]:
			"spark":
				var al := 1.0 - t / D.SPARK_LIFE
				var v := Vector2(e["vx"], e["vy"]).normalized() * 4.0
				draw_line(Vector2(sx, y), Vector2(sx, y) - v, Color(e.get("col", D.SPARK_C), al), 1.6)
			"slash":
				var p2 := t / D.SLASH_LIFE
				draw_arc(Vector2(sx - 10.0, y), D.SLASH_R + p2 * 8.0, -0.9, 0.9, 14, Color(D.SLASH_C, 0.8 * (1.0 - p2)), 3.0 * (1.0 - p2) + 1.0, true)
				draw_arc(Vector2(sx - 12.0, y), D.SLASH_R + p2 * 8.0 + 3.0, -0.6, 0.6, 10, Color(D.SLASH_C, 0.35 * (1.0 - p2)), 6.0, true)
			"hit":                                # 타격점 — 번쩍 + 방사선
				var p := t / 0.14
				var big: bool = e.get("big", false)
				var col: Color = e.get("col", D.SPARK_C)
				gball(Vector2(sx, y), (11.0 if big else 7.0) * (1.0 + p), col, 1.0 - p)
				var rng := RandomNumberGenerator.new()
				rng.seed = int(e["seed"])
				for i in (8 if big else 5):
					var an := rng.randf_range(-PI, PI)
					var r0 := (6.0 if big else 4.0) + p * 10.0
					var r1 := r0 + rng.randf_range(6.0, 14.0) * (1.6 if big else 1.0) * (1.0 - p * 0.5)
					draw_line(Vector2(sx, y) + Vector2(cos(an), sin(an)) * r0, Vector2(sx, y) + Vector2(cos(an), sin(an)) * r1, Color(col, 0.9 * (1.0 - p)), 1.4)
			"whirl":                              # 선풍퇴 — 발밑에서 퍼지는 회오리 고리
				var pw := t / 0.42
				var colw: Color = g.art_def("whirl")["col"]
				draw_set_transform(Vector2(sx + 14.0, gy + 2.0), 0.0, Vector2(1.0, 0.3))
				for i in 3:
					var rr := float(e["r"]) * (0.35 + 0.65 * pw) * (1.0 - i * 0.22)
					var a0 := t * 22.0 + i * 2.1
					draw_arc(Vector2.ZERO, rr, a0, a0 + 3.6, 24, Color(colw, (0.75 - i * 0.2) * (1.0 - pw)), 5.0 - i, true)
					draw_arc(Vector2.ZERO, rr, a0 + PI, a0 + PI + 1.4, 12, Color(1, 1, 1, 0.5 * (1.0 - pw)), 2.0, true)
				draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
				gball(Vector2(sx + 6.0, gy - 14.0), 26.0 * (1.0 - pw), colw, 0.5 * (1.0 - pw))
			"beam":                               # 암향지 — 한 줄로 뻗는 빛
				var pb := t / 0.32
				var colb: Color = g.art_def("baekbo")["col"]
				var ln: float = float(e["len"]) * minf(1.0, pb * 5.0)
				var th := 1.0 - pb
				draw_rect(Rect2(sx, y - 9.0 * th, ln, 18.0 * th), Color(colb, 0.16 * th))
				draw_rect(Rect2(sx, y - 4.5 * th, ln, 9.0 * th), Color(colb, 0.45 * th))
				draw_rect(Rect2(sx, y - 1.2, ln, 2.4), Color(1, 1, 1, 0.95 * th))
				gball(Vector2(sx, y), 12.0 * th + 4.0, colb, th)
				gball(Vector2(sx + ln, y), 9.0 * th + 3.0, colb, th)
			"heal":                               # 활인기공 — 솟는 빛기둥과 빛알
				var ph := t / 0.9
				var colh: Color = g.art_def("hwalin")["col"]
				grad(Rect2(hx - 13.0, gy - 62.0, 26, 66), Color(colh, 0.0), Color(colh, 0.42 * (1.0 - ph)))
				draw_set_transform(Vector2(hx, gy + 3.0 - ph * 40.0), 0.0, Vector2(1.0, 0.26))
				draw_arc(Vector2.ZERO, 18.0, 0.0, TAU, 28, Color(colh, 0.8 * (1.0 - ph)), 2.5, true)
				draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
				var rh := RandomNumberGenerator.new()
				rh.seed = int(e["seed"])
				for i in 12:
					var ox := rh.randf_range(-16.0, 16.0)
					var sp := rh.randf_range(30.0, 70.0)
					draw_rect(Rect2(hx + ox, gy - 4.0 - t * sp, 2, 2), Color(colh, 1.0 - ph))
			"quake":                              # 붕산장 — 땅을 타고 번지는 충격과 번쩍임
				var pq := t / 0.6
				var colq: Color = g.art_def("bungsan")["col"]
				draw_rect(Rect2(-8, 0, D.VW + 16.0, vh), Color(colq, 0.22 * maxf(0.0, 1.0 - pq * 2.5)))
				draw_set_transform(Vector2(sx, gy + 4.0), 0.0, Vector2(1.0, 0.26))
				for i in 3:
					var rq := float(e["r"]) * minf(1.0, pq * 1.5 + 0.1) * (1.0 - i * 0.2)
					draw_arc(Vector2.ZERO, rq, -1.3, 1.3, 40, Color(colq if i > 0 else Color.WHITE, (0.85 - i * 0.25) * (1.0 - pq)), 7.0 - i * 2.0, true)
				draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
				var rq2 := RandomNumberGenerator.new()
				rq2.seed = 7
				for i in 14:                        # 땅에서 솟는 불기둥
					var fx2 := sx + 20.0 + rq2.randf() * float(e["r"])
					var delay := (fx2 - sx) / float(e["r"]) * 0.3
					var q := clampf((t - delay) / 0.3, 0.0, 1.0)
					if q <= 0.0 or q >= 1.0: continue
					var hh := rq2.randf_range(18.0, 46.0) * sin(q * PI)
					grad(Rect2(fx2 - 3.0, gy + 4.0 - hh, 6, hh), Color(colq, 0.0), Color(1.0, 0.8, 0.5, 0.8 * (1.0 - q)))

func _text() -> void:                            # 글자 층 — 피해 숫자·초식 이름
	var font := Art.font("sans-semibold")
	for e in g.fx:
		if e["k"] != "dmg" and e["k"] != "coin": continue
		var sx: float = e["x"] - g.cam_x
		var p4: float = e["t"] / D.DMG_LIFE
		var skill: bool = e.get("skill", false)
		var yy: float = gy + e["y"] - p4 * D.DMG_RISE * (1.3 if skill else 1.0)
		var coin: bool = e["k"] == "coin"
		var txt: String = ("+" if (coin or e.get("plus", false)) else "") + str(g.fmt(e["v"]))
		var al := 1.0 if p4 < 0.7 else 1.0 - (p4 - 0.7) / 0.3
		var col: Color = D.C_GOLD if coin else (Color(1.0, 0.5, 0.54) if e.get("hero", false) else Color(0.94, 0.965, 1.0))
		var sz := 11 if coin else D.DMG_SIZE
		if skill:
			col = Color(e["col"]).lerp(Color.WHITE, 0.35)
			sz = int(D.DMG_SIZE * (1.55 - 0.3 * minf(1.0, p4 * 5.0)))      # 크게 떴다가 자리 잡는다
		draw_string_outline(font, Vector2(sx - 50.0, yy), txt, HORIZONTAL_ALIGNMENT_CENTER, 100.0, sz, 4 if skill else 3, Color(0.024, 0.039, 0.063, al))
		draw_string(font, Vector2(sx - 50.0, yy), txt, HORIZONTAL_ALIGNMENT_CENTER, 100.0, sz, Color(col, al))
	if g.call_k != "" and g.call_t < 1.0:           # 초식 이름을 외친다
		var a: Dictionary = g.art_def(g.call_k)
		var pc: float = g.call_t / 1.0
		var alc := minf(1.0, pc * 8.0) * (1.0 if pc < 0.6 else 1.0 - (pc - 0.6) / 0.4)
		var f2 := Art.font("serif-bold")
		var pos := Vector2(g.px - g.cam_x - 80.0, gy - 66.0 - pc * 12.0)
		draw_string_outline(f2, pos, a["n"], HORIZONTAL_ALIGNMENT_CENTER, 160.0, 19, 5, Color(0.024, 0.039, 0.063, alc))
		draw_string(f2, pos, a["n"], HORIZONTAL_ALIGNMENT_CENTER, 160.0, 19, Color(Color(a["col"]).lerp(Color.WHITE, 0.25), alc))
