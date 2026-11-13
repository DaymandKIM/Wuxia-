extends Control
## 시작·화면 짜기·루프. 위 = 장면(scene.gd), 아래 = 패널.
## **패널이 먼저 제 높이를 갖고 남는 세로를 장면이 쓴다** — 장면이 먼저 가져가면 낮은 화면에서 패널 아래가 잘린다.
const D = preload("res://data.gd")
const Game = preload("res://game.gd")
const Art = preload("res://art.gd")

class Bar extends Control:                       # 얇은 진행 줄
	var fg := Color.WHITE
	var bg := Color(0.627, 0.714, 0.839, 0.16)
	var ratio := 0.0:
		set(v):
			if absf(v - ratio) > 0.0005:
				ratio = v
				queue_redraw()
	func _pill(w: float, c: Color) -> void:
		var sb := StyleBoxFlat.new()
		sb.bg_color = c
		sb.set_corner_radius_all(int(ceil(size.y / 2.0)))
		sb.anti_aliasing = true
		draw_style_box(sb, Rect2(0, 0, w, size.y))
	func _draw() -> void:
		_pill(size.x, bg)
		if ratio > 0.0: _pill(maxf(size.y, size.x * clampf(ratio, 0.0, 1.0)), fg)

class Divider extends Control:                   # 제목 아래 줄 — 줄이 곧 단계 진행
	var col := Color.WHITE
	var ratio := 0.0:
		set(v):
			if absf(v - ratio) > 0.0005:
				ratio = v
				queue_redraw()
	func _draw() -> void:
		var y := size.y / 2.0
		draw_rect(Rect2(0, y - 0.5, size.x, 1), Color(0.627, 0.714, 0.839, 0.22))
		draw_rect(Rect2(0, y - 1.0, size.x * clampf(ratio, 0.0, 1.0), 2), col)
		var c := Vector2(size.x / 2.0, y)
		var r := 4.6
		var pts := PackedVector2Array([c + Vector2(0, -r), c + Vector2(r, 0), c + Vector2(0, r), c + Vector2(-r, 0)])
		draw_colored_polygon(pts, Color("0f1520"))
		pts.append(pts[0])
		draw_polyline(pts, col, 1.0, true)

class Track extends Control:                     # 여정 — 마름모 10개 + 수호자
	const D2 = preload("res://data.gd")
	var stage := 1:
		set(v):
			if v != stage:
				stage = v
				queue_redraw()
	func _dia(c: Vector2, r: float, fill: Color, line: Color) -> void:
		var pts := PackedVector2Array([c + Vector2(0, -r), c + Vector2(r, 0), c + Vector2(0, r), c + Vector2(-r, 0)])
		draw_colored_polygon(pts, fill)
		pts.append(pts[0])
		draw_polyline(pts, line, 1.0, true)
	func _draw() -> void:
		var n := D2.STAGE_N + 1
		var y := size.y / 2.0
		var x0 := 8.0
		var x1 := size.x - 10.0
		draw_rect(Rect2(x0, y - 0.5, x1 - x0, 1), D2.C_LINE)
		for i in n:
			var s := i + 1
			var c := Vector2(x0 + (x1 - x0) * i / float(n - 1), y)
			var boss := i == n - 1
			var r := 7.2 if boss else 4.8
			if s == stage:
				_dia(c, r + 3.0, Color((D2.C_ROSE if boss else D2.C_ACC), 0.28), Color(0, 0, 0, 0))
				_dia(c, r, D2.C_ROSE if boss else D2.C_ACC, Color.WHITE)
			elif s < stage: _dia(c, r, D2.C_ACC2, D2.C_ACC2)
			else: _dia(c, r, D2.C_PANEL, Color(D2.C_ROSE, 0.6) if boss else D2.C_LINE2)

class SkillBar extends Control:                   # 익힌 초식 — 땅 띠 위에 얹는다. 쿨은 시계 방향으로 걷힌다
	const D2 = preload("res://data.gd")
	const Art2 = preload("res://art.gd")
	var g
	func _ready() -> void:
		texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		if g == null: return
		var font := Art2.font("sans-semibold")
		var list: Array = g.learned_actives()
		var R := 16.0
		for i in list.size():
			var a: Dictionary = list[list.size() - 1 - i]
			var c := Vector2(size.x - 30.0 - i * 40.0, size.y / 2.0)
			var cd: float = g.cds.get(a["k"], 0.0)
			var ready := cd <= 0.0
			var casting: bool = g.st == "cast" and g.cast_k == a["k"]
			draw_circle(c, R + 2.0, Color(0.043, 0.063, 0.094, 0.82))
			var im: Texture2D = Art2.tex("art_%s" % a["k"])
			if im != null: draw_texture_rect(im, Rect2(c - Vector2(R, R), Vector2(R, R) * 2.0), false, Color.WHITE if ready else Color(0.55, 0.58, 0.64))
			if not ready:                           # 남은 쿨만큼 어두운 부채꼴
				var fr := clampf(cd / float(a["cd"]), 0.0, 1.0)
				var pts := PackedVector2Array([c])
				var n := maxi(3, int(40 * fr))
				for j in n + 1:
					var an := -PI / 2.0 + TAU * (1.0 - fr) + TAU * fr * j / float(n)
					pts.append(c + Vector2(cos(an), sin(an)) * (R + 1.0))
				draw_colored_polygon(pts, Color(0.031, 0.047, 0.078, 0.68))
				var txt := str(int(ceil(cd)))
				draw_string_outline(font, c + Vector2(-20, 4.5), txt, HORIZONTAL_ALIGNMENT_CENTER, 40.0, 12, 3, Color(0.024, 0.039, 0.063))
				draw_string(font, c + Vector2(-20, 4.5), txt, HORIZONTAL_ALIGNMENT_CENTER, 40.0, 12, D2.C_INK)
			draw_arc(c, R + 1.5, 0.0, TAU, 40, Color(a["col"], 1.0) if (ready or casting) else D2.C_LINE2, 2.2 if casting else 1.3, true)
			var lv: int = g.art_lv(a["k"])
			if lv > 1:
				draw_circle(c + Vector2(R - 2.0, R - 3.0), 6.5, Color(0.043, 0.063, 0.094))
				draw_string(font, c + Vector2(R - 12.0, R + 0.5), str(lv), HORIZONTAL_ALIGNMENT_CENTER, 20.0, 9, D2.C_GOLD)

class TabBtn extends Button:                      # 탭 바 단추 — 마름모 + 이름. 고를 것이 있으면 금빛 점
	const D2 = preload("res://data.gd")
	const Art2 = preload("res://art.gd")
	var label := ""
	var on := false:
		set(v):
			if v != on:
				on = v
				queue_redraw()
	var dot := false:
		set(v):
			if v != dot:
				dot = v
				queue_redraw()
	func _ready() -> void:
		focus_mode = Control.FOCUS_NONE
		for st in ["normal", "hover", "pressed", "disabled", "focus"]: add_theme_stylebox_override(st, StyleBoxEmpty.new())
	func _draw() -> void:
		draw_rect(Rect2(0, 0, size.x, 1), D2.C_LINE)
		if on: draw_rect(Rect2(size.x * 0.28, 0, size.x * 0.44, 2), D2.C_ACC)
		var col := D2.C_ACC if on else D2.C_DIM
		var f := Art2.font("sans-semibold")
		var w := f.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
		var x0 := (size.x - w - 16.0) / 2.0
		var c := Vector2(x0 + 4.0, size.y / 2.0)
		var pts := PackedVector2Array([c + Vector2(0, -4.5), c + Vector2(4.5, 0), c + Vector2(0, 4.5), c + Vector2(-4.5, 0)])
		if on: draw_colored_polygon(pts, col)
		pts.append(pts[0])
		draw_polyline(pts, col, 1.0, true)
		draw_string(f, Vector2(x0 + 16.0, size.y / 2.0 + 5.0), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, D2.C_INK if on else D2.C_MUTE)
		if dot:
			draw_circle(Vector2(x0 + w + 23.0, size.y / 2.0 - 7.0), 5.5, Color(D2.C_GOLD, 0.25))
			draw_circle(Vector2(x0 + w + 23.0, size.y / 2.0 - 7.0), 3.2, D2.C_GOLD)

class PanelBg extends Control:
	const D2 = preload("res://data.gd")
	func _draw() -> void:
		var h := size.y * 0.42
		draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(size.x, 0), Vector2(size.x, h), Vector2(0, h)]), PackedColorArray([D2.C_PANEL, D2.C_PANEL, D2.C_PANEL2, D2.C_PANEL2]))
		draw_rect(Rect2(0, h, size.x, size.y - h), D2.C_PANEL2)

var g
var col: Control
var scene_box: Control
var back: Node2D
var scene: Node2D
var glow: Node2D
var leaves: CPUParticles2D
var texts: Node2D
var sbar: SkillBar
var train_box: VBoxContainer
var arts_box: VBoxContainer
var info_box: VBoxContainer
var tab := "train"
var tabs := {}
var tiles := {}
var info := {}
var sel_art := ""
var sb_tile_on: StyleBoxFlat
var ins_box: VBoxContainer
var ins_cards: HBoxContainer
var l_ins: Label
var ins_sig := "-"
var sb_ins: StyleBoxFlat
var panel: Control
var rpill: PanelContainer
var spill: PanelContainer
var zhead: VBoxContainer
var l_realm: Label
var l_gem: Label
var b_exp: Bar
var l_silver: Label
var l_pill: Label
var pill_box: PanelContainer
var l_title: Label
var div: Divider
var l_sub: Label
var b_hp: Bar
var l_hp: Label
var track: Track
var cards := {}
var l_hint: Label
var save_t := 0.0
var sb_cap: StyleBoxFlat
var sb_cap_up: StyleBoxFlat
var sb_pill: StyleBoxFlat
var sb_pill_boss: StyleBoxFlat
var sb_card: StyleBoxFlat
var sb_card_can: StyleBoxFlat
var sb_cost: StyleBoxFlat
var sb_cost_can: StyleBoxFlat
var sb_cost_full: StyleBoxFlat

func sbox(bg: Color, border: Color, radius: int, mx: float, my: float) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.anti_aliasing = true
	s.content_margin_left = mx; s.content_margin_right = mx
	s.content_margin_top = my; s.content_margin_bottom = my
	return s

func lab(txt: String, sz: float, c: Color, font := "sans-regular", spacing := 0) -> Label:
	var l := Label.new()
	l.text = txt
	var f: Font = Art.font(font)
	if spacing != 0:
		var fv := FontVariation.new()
		fv.base_font = f
		fv.spacing_glyph = spacing
		f = fv
	l.add_theme_font_override("font", f)
	l.add_theme_font_size_override("font_size", int(round(sz)))
	l.add_theme_color_override("font_color", c)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func shade(l: Label) -> Label:                    # 장면 위 글자 — 어두운 그림자
	l.add_theme_color_override("font_shadow_color", Color(0.024, 0.039, 0.063, 0.85))
	l.add_theme_constant_override("shadow_offset_x", 0)
	l.add_theme_constant_override("shadow_offset_y", 1)
	l.add_theme_constant_override("shadow_outline_size", 5)
	return l

func icon(key: String, px: float, smooth := false) -> TextureRect:
	var t := TextureRect.new()
	t.texture = Art.tex(key)
	t.custom_minimum_size = Vector2(px, px)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	t.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR if smooth else CanvasItem.TEXTURE_FILTER_NEAREST
	t.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	t.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

func hbox(sep: int) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return h

func vbox(sep: int) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return v

func _ready() -> void:
	g = Game.new()
	g.load_save()
	_demo()
	_build()
	get_viewport().size_changed.connect(_layout)
	_layout()
	_ui()

## [시험 전용] 화면 검사용 차림 — 웹은 주소 끝 #demo=이름, 그 밖엔 환경 변수 WUXIA_DEMO. 저장은 건드리지 않는다(자동 저장도 끈다).
var demo := ""
func _demo() -> void:
	if OS.has_feature("web"):
		var h: Variant = JavaScriptBridge.eval("location.hash", true)
		if typeof(h) == TYPE_STRING and str(h).begins_with("#demo="): demo = str(h).substr(6)
	else: demo = OS.get_environment("WUXIA_DEMO")
	if demo == "": return
	g = Game.new()
	match demo:
		"skills":                                 # 초식을 다 익힌 중반
			g.realm = 12; g.stage = 6; g.tr = { "atk": 22, "hp": 24, "regen": 28 }
			g.arts = { "whirl": 2, "pagong": 3, "baekbo": 1, "hwalin": 1, "bungsan": 1, "honwon": 2 }
		"pick":                                   # 깨달음 고르는 순간
			g.realm = 3; g.stage = 2; g.arts = { "whirl": 1 }; g.insight = 2; g.make_offer()
			tab = "arts"
		"arts":                                   # 무공 탭 (몇 개 익힌 상태)
			g.realm = 6; g.stage = 4; g.tr = { "atk": 12, "hp": 12, "regen": 14 }
			g.arts = { "whirl": 2, "pagong": 1, "baekbo": 1, "honwon": 3, "samjae": 1 }
			tab = "arts"; sel_art = "pagong"
		"info":
			g.realm = 6; g.stage = 4; g.tr = { "atk": 12, "hp": 12, "regen": 14 }
			g.arts = { "whirl": 2, "pagong": 1, "honwon": 3 }
			tab = "info"
		"boss":
			g.realm = 12; g.stage = D.STAGE_N + 1; g.tr = { "atk": 22, "hp": 24, "regen": 28 }
			g.arts = { "whirl": 2, "pagong": 3, "baekbo": 1, "hwalin": 1, "bungsan": 1 }
			g.enter_stage()
	g.hp = g.hero_hp_max()

func _build() -> void:
	sb_cap = sbox(D.C_CAP, D.C_LINE, 99, 15, 6.5)
	sb_cap_up = sbox(D.C_CAP, D.C_GOLD, 99, 15, 6.5)
	sb_pill = sbox(Color(0.055, 0.078, 0.125, 0.5), D.C_LINE2, 99, 14, 1.5)
	sb_pill_boss = sbox(Color(0.055, 0.078, 0.125, 0.5), Color(D.C_ROSE, 0.5), 99, 14, 1.5)
	sb_card = sbox(D.C_CARD, D.C_LINE, 13, 0, 0)
	sb_card_can = sbox(D.C_CARD, D.C_LINE2, 13, 0, 0)
	sb_cost = sbox(Color(0, 0, 0, 0), D.C_LINE, 99, 11, 2.5)
	sb_cost_can = sbox(Color(D.C_GOLD, 0.07), Color(D.C_GOLD, 0.45), 99, 11, 2.5)
	sb_cost_full = sbox(Color(0, 0, 0, 0), Color(D.C_TEAL, 0.3), 99, 11, 2.5)
	sb_ins = sbox(Color("221f24"), Color(D.C_GOLD, 0.5), 13, 0, 0)
	sb_tile_on = sbox(Color("222d3d"), D.C_ACC, 13, 0, 0)

	col = Control.new()
	col.clip_contents = true
	add_child(col)
	# ── 장면
	scene_box = Control.new()
	scene_box.clip_contents = true
	scene_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(scene_box)
	back = preload("res://back.gd").new()
	back.g = g
	scene_box.add_child(back)
	var SceneScript := preload("res://scene.gd")
	scene = SceneScript.new()
	scene.g = g
	scene_box.add_child(scene)
	leaves = _leaves()
	scene_box.add_child(leaves)
	glow = SceneScript.new()
	glow.g = g
	glow.layer = 1
	scene_box.add_child(glow)
	texts = SceneScript.new()
	texts.g = g
	texts.layer = 2
	scene_box.add_child(texts)
	sbar = SkillBar.new()
	sbar.g = g
	scene_box.add_child(sbar)
	# 경지 캡슐
	rpill = PanelContainer.new()
	rpill.add_theme_stylebox_override("panel", sb_cap)
	rpill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene_box.add_child(rpill)
	var rv := vbox(4)
	rpill.add_child(rv)
	var rh := hbox(7)
	rv.add_child(rh)
	l_gem = lab("◆", 9, D.C_ACC, "sans-semibold")
	l_gem.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	rh.add_child(l_gem)
	l_realm = lab("삼류 1성", 15.2, D.C_INK, "sans-semibold")
	rh.add_child(l_realm)
	b_exp = Bar.new()
	b_exp.custom_minimum_size = Vector2(108, 2)
	b_exp.fg = D.C_ACC
	rv.add_child(b_exp)
	# 은자 캡슐 (오른쪽 정렬 — 글자가 길어지면 왼쪽으로 자란다)
	spill = PanelContainer.new()
	spill.add_theme_stylebox_override("panel", sb_cap)
	spill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	spill.anchor_left = 1.0; spill.anchor_right = 1.0
	spill.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	scene_box.add_child(spill)
	var sh := hbox(8)
	spill.add_child(sh)
	sh.add_child(icon("silver", 18))
	l_silver = lab("0", 15.2, D.C_INK, "sans-semibold")
	sh.add_child(l_silver)
	# 제목
	zhead = vbox(4)
	zhead.anchor_right = 1.0
	zhead.alignment = BoxContainer.ALIGNMENT_BEGIN
	scene_box.add_child(zhead)
	pill_box = PanelContainer.new()
	pill_box.add_theme_stylebox_override("panel", sb_pill)
	pill_box.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	pill_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	zhead.add_child(pill_box)
	l_pill = lab("1-1", 12.6, D.C_ACC, "sans-semibold", 2)
	pill_box.add_child(l_pill)
	l_title = shade(lab("죽림", 30, D.C_INK, "serif-bold", 6))
	l_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	zhead.add_child(l_title)
	div = Divider.new()
	div.custom_minimum_size = Vector2(202, 12)
	div.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	div.col = D.C_ACC
	zhead.add_child(div)
	l_sub = shade(lab("0 / 30", 12.4, D.C_MUTE, "sans-regular", 1))
	l_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	zhead.add_child(l_sub)
	# ── 패널
	panel = PanelBg.new()
	col.add_child(panel)
	var root := vbox(0)                              # 내용 + 맨 아래 탭 바
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.add_child(root)
	var mg := MarginContainer.new()
	mg.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mg.add_theme_constant_override("margin_left", 18); mg.add_theme_constant_override("margin_right", 18)
	mg.add_theme_constant_override("margin_top", 15); mg.add_theme_constant_override("margin_bottom", 9)
	root.add_child(mg)
	var pv := vbox(14)
	mg.add_child(pv)
	var r1 := hbox(14)
	pv.add_child(r1)
	r1.add_child(lab("체력", 11.6, D.C_MUTE, "sans-regular", 2))
	b_hp = Bar.new()
	b_hp.custom_minimum_size = Vector2(0, 6)
	b_hp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b_hp.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	b_hp.fg = D.C_ROSE
	r1.add_child(b_hp)
	l_hp = lab("", 12.2, D.C_MUTE)
	l_hp.custom_minimum_size = Vector2(108, 0)
	l_hp.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	r1.add_child(l_hp)
	var r2 := hbox(14)
	pv.add_child(r2)
	r2.add_child(lab("여정", 11.6, D.C_MUTE, "sans-regular", 2))
	track = Track.new()
	track.custom_minimum_size = Vector2(0, 22)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	r2.add_child(track)
	# ── 탭 내용 — 셋 다 같은 높이(TAB_H)라 탭을 바꿔도 화면이 안 움직인다
	# 수련
	train_box = _tab_box("수련", D.C_INK, D.C_LINE)
	pv.add_child(train_box)
	var ch := hbox(11)
	train_box.add_child(ch)
	for s in D.TRAIN: ch.add_child(_card(s))
	# 무공 — 익힌 것·아직인 것을 한눈에. 깨달음이 있으면 이 자리에 석 장이 먼저 뜬다
	arts_box = _tab_box("무공", D.C_INK, D.C_LINE)
	pv.add_child(arts_box)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	arts_box.add_child(grid)
	for a in D.ARTS: grid.add_child(_art_tile(a))
	ins_box = _tab_box("깨달음", D.C_GOLD, Color(D.C_GOLD, 0.35))
	l_ins = lab("", 11.6, D.C_MUTE)
	ins_box.get_child(0).add_child(l_ins)
	pv.add_child(ins_box)
	ins_cards = hbox(11)
	ins_box.add_child(ins_cards)
	# 정보
	info_box = _tab_box("정보", D.C_INK, D.C_LINE)
	pv.add_child(info_box)
	var iv := vbox(0)
	info_box.add_child(iv)
	var names := ["경지", "다음 경지", "공격", "체력", "회복", "무공", "처치", "쓰러짐", "수호자", "판"]
	for r in 5:
		var row := hbox(22)
		row.custom_minimum_size = Vector2(0, 35)
		iv.add_child(row)
		for c in 2:
			var cell := hbox(6)
			cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			row.add_child(cell)
			var nm: String = names[r * 2 + c]
			cell.add_child(lab(nm, 12, D.C_MUTE))
			var val := lab("", 13, D.C_INK, "sans-semibold")
			val.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			val.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			cell.add_child(val)
			info[nm] = val
		if r < 4: iv.add_child(_rule(Color(D.C_LINE, 0.09)))
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pv.add_child(sp)
	l_hint = lab("", 12.4, D.C_TEAL)
	l_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l_hint.clip_text = true
	pv.add_child(l_hint)
	# ── 탭 바
	var tb := hbox(0)
	tb.custom_minimum_size = Vector2(0, D.TABBAR_H)
	root.add_child(tb)
	for t in [["train", "수련"], ["arts", "무공"], ["info", "정보"]]:
		var btn := TabBtn.new()
		btn.label = t[1]
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var key: String = t[0]
		btn.pressed.connect(func():
			tab = key
			_ui())
		tb.add_child(btn)
		tabs[key] = btn

func _tab_box(title: String, tc: Color, lc: Color) -> VBoxContainer:
	var v := vbox(14)
	v.custom_minimum_size = Vector2(0, D.TAB_H)
	var r := hbox(12)
	v.add_child(r)
	r.add_child(lab(title, 16.2, tc, "serif-bold", 5))
	r.add_child(_rule(lc))
	return v

func _art_tile(a: Dictionary) -> Button:
	var k: String = a["k"]
	var b := Button.new()
	b.custom_minimum_size = Vector2(0, 89)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.focus_mode = Control.FOCUS_NONE
	for st in ["normal", "hover", "pressed", "disabled"]: b.add_theme_stylebox_override(st, sb_card)
	var v := vbox(0)
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	b.add_child(v)
	var ic := icon("art_%s" % k, 40, true)
	v.add_child(ic)
	var nm := lab(a["n"], 11.6, D.C_INK, "sans-semibold")
	nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(nm)
	var stl := lab("", 10.2, D.C_DIM)
	stl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(stl)
	tiles[k] = { "b": b, "ic": ic, "nm": nm, "st": stl, "sig": "" }
	b.pressed.connect(func():
		sel_art = "" if sel_art == k else k
		_ui())
	return b

func _rule(c: Color) -> ColorRect:
	var ln := ColorRect.new()
	ln.color = c
	ln.custom_minimum_size = Vector2(0, 1)
	ln.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ln.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	ln.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return ln

func _leaves() -> CPUParticles2D:                 # 흩날리는 댓잎 — 장면이 살아 있게
	var p := CPUParticles2D.new()
	p.amount = D.LEAF_N
	p.lifetime = 9.0
	p.preprocess = 9.0
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(D.VW * 0.6, 4.0)
	p.position = Vector2(D.VW * 0.65, 120.0)
	p.direction = Vector2(-0.55, 1.0)
	p.spread = 18.0
	p.gravity = Vector2(-5.0, 6.0)
	p.initial_velocity_min = 22.0
	p.initial_velocity_max = 46.0
	p.angular_velocity_min = -160.0
	p.angular_velocity_max = 160.0
	p.scale_amount_min = 1.6
	p.scale_amount_max = 3.2
	p.color = D.LEAF_C
	return p

func _ins_card(k: String, i: int) -> Button:
	var a: Dictionary = g.art_def(k)
	var lv: int = g.art_lv(k)
	var active: bool = a["type"] == "active"
	var b := Button.new()
	b.custom_minimum_size = Vector2(0, 186)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.focus_mode = Control.FOCUS_NONE
	for st in ["normal", "hover", "pressed", "disabled"]: b.add_theme_stylebox_override(st, sb_ins)
	var v := vbox(2)
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 7; v.offset_right = -7
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	b.add_child(v)
	v.add_child(icon("art_%s" % k, 50, true))
	var nm := lab(a["n"], 15.4, D.C_INK, "serif-bold", 1)
	nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(nm)
	var tag := ("새 초식" if active else "새 심법") if lv == 0 else (("연마 %d → %d" if active else "심법 %d → %d") % [lv, lv + 1])
	var tl := lab(tag, 11, D.C_GOLD if lv == 0 else D.C_ACC, "sans-semibold")
	tl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(tl)
	var fxl := ""
	if a.has("heal"): fxl = "체력 %d%% 회복" % int(round(g.art_heal(k, lv + 1) * 100.0))
	elif active: fxl = "공격의 %d%% · %d초" % [int(round(g.art_power(k, lv + 1) * 100.0)), int(a["cd"])]
	else: fxl = "%s +%d%%" % [D.STAT_NAME[a["stat"]], int(round(float(a["inc"]) * (lv + 1) * 100.0))]
	var el := lab(fxl, 11.6, Color(a["col"]).lerp(Color.WHITE, 0.3), "sans-semibold")
	el.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(el)
	var dl := lab(a["d"], 10.6, D.C_MUTE)
	dl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	dl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dl.custom_minimum_size = Vector2(100, 30)
	dl.add_theme_constant_override("line_spacing", -4)
	v.add_child(dl)
	b.pressed.connect(func():
		if g.pick(i):
			if demo == "": g.save_now()
			_ui())
	return b

func _card(s: Dictionary) -> Button:
	var b := Button.new()
	b.custom_minimum_size = Vector2(0, 186)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.focus_mode = Control.FOCUS_NONE
	for st in ["normal", "hover", "pressed", "disabled"]: b.add_theme_stylebox_override(st, sb_card)
	var v := vbox(1)
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	b.add_child(v)
	var ic := icon(s["ico"], 46, true)
	v.add_child(ic)
	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 5)
	gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(gap)
	var nm := lab(s["n"], 16, D.C_INK, "sans-semibold", 3)
	nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(nm)
	var lv := lab("", 11.2, D.C_DIM)
	lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(lv)
	var val := lab("", 17.4, D.C_ACC, "sans-semibold")
	val.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(val)
	var gap2 := Control.new()
	gap2.custom_minimum_size = Vector2(0, 4)
	gap2.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(gap2)
	var cost := PanelContainer.new()
	cost.add_theme_stylebox_override("panel", sb_cost)
	cost.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	cost.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(cost)
	var chh := hbox(5)
	cost.add_child(chh)
	var coin := icon("silver", 15)
	chh.add_child(coin)
	var cl := lab("", 12.8, D.C_DIM)
	chh.add_child(cl)
	var k: String = s["k"]
	cards[k] = { "b": b, "ic": ic, "lv": lv, "val": val, "cost": cost, "coin": coin, "cl": cl, "state": "" }
	b.pressed.connect(func():
		if g.train_buy(k):
			b.pivot_offset = b.size / 2.0
			var tw := create_tween()
			b.scale = Vector2(0.96, 0.96)
			b.modulate = Color(1.25, 1.3, 1.4)
			tw.tween_property(b, "scale", Vector2.ONE, 0.16)
			tw.parallel().tween_property(b, "modulate", Color.WHITE, 0.22)
			g.save_now()
			_ui())
	return b

func _sat() -> float:                             # 맨 위에 비울 높이 (아티팩트 iframe · 폰 노치)
	if OS.has_feature("web"):
		var r: Variant = JavaScriptBridge.eval("(function(){try{return window.self!==window.top}catch(e){return true}})()", true)
		return D.SAT_IFRAME if r else 0.0
	var win := DisplayServer.window_get_size()
	var safe := DisplayServer.get_display_safe_area()
	if win.y > 0 and safe.position.y > 0: return safe.position.y * get_viewport_rect().size.y / win.y
	return 0.0

func _layout() -> void:
	var vp := get_viewport_rect().size
	col.position = Vector2(floorf((vp.x - D.VW) / 2.0), 0)
	col.size = Vector2(D.VW, vp.y)
	var sh := clampf(vp.y - D.PANEL_H, D.SCENE_MIN, D.SCENE_MAX)
	scene_box.size = Vector2(D.VW, sh)
	back.vh = sh
	scene.vh = sh
	glow.vh = sh
	texts.vh = sh
	leaves.position = Vector2(D.VW * 0.65, sh * 0.42)      # 숲이 보이기 시작하는 높이에서 흩날린다 (제목 위로는 안 온다)
	sbar.position = Vector2(0, sh - D.GROUND + 9.0)
	sbar.size = Vector2(D.VW, 38)
	panel.position = Vector2(0, sh)
	panel.size = Vector2(D.VW, vp.y - sh)
	var sat := _sat()
	rpill.position = Vector2(17, sat + 12)
	spill.offset_left = -17; spill.offset_right = -17; spill.offset_top = sat + 12
	zhead.offset_top = sat + 70
	zhead.offset_left = 0; zhead.offset_right = 0

func _process(dt: float) -> void:
	dt = minf(dt, 0.05)
	if g.hitstop > 0.0: g.hitstop -= dt            # 멈칫 — 초식이 맞는 순간 세계가 잠깐 선다
	else: g.step(dt)
	var shx := randf_range(-0.5, 0.5) * D.SHAKE_PX if g.shake > 0.0 else 0.0
	scene.position.x = shx; glow.position.x = shx; texts.position.x = shx
	back.queue_redraw()
	scene.queue_redraw()
	glow.queue_redraw()
	texts.queue_redraw()
	sbar.queue_redraw()
	_ui()
	save_t += dt
	if save_t > D.SAVE_EVERY and demo == "":
		save_t = 0.0
		g.save_now()

func _notification(what: int) -> void:
	if g != null and demo == "" and (what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_WINDOW_FOCUS_OUT): g.save_now()

func _ui() -> void:
	var z: Dictionary = g.zone()
	var boss: bool = g.is_boss()
	var bf: Variant = null
	if boss:
		for f in g.foes:
			if f["boss"] and f["dead"] <= 0.0: bf = f
	l_pill.text = "수호자" if boss else "%d-%d" % [g.zi + 1, g.stage]
	l_pill.add_theme_color_override("font_color", D.C_ROSE if boss else D.C_ACC)
	pill_box.add_theme_stylebox_override("panel", sb_pill_boss if boss else sb_pill)
	l_title.text = z["boss_name"] if boss else z["n"]
	if boss: l_sub.text = ("%s / %s" % [g.fmt(ceilf(bf["hp"])), g.fmt(bf["hp_max"])]) if bf != null else "다가온다"
	else: l_sub.text = "%d / %d" % [g.kills, g.stage_need()]
	div.col = D.C_ROSE if boss else D.C_ACC
	div.ratio = ((bf["hp"] / bf["hp_max"]) if bf != null else 1.0) if boss else float(g.kills) / g.stage_need()
	var up: bool = g.realm_up > 0.0
	l_realm.text = g.realm_name(g.realm)
	l_realm.add_theme_color_override("font_color", D.C_GOLD if up else D.C_INK)
	l_gem.add_theme_color_override("font_color", D.C_GOLD if up else D.C_ACC)
	rpill.add_theme_stylebox_override("panel", sb_cap_up if up else sb_cap)
	b_exp.fg = D.C_GOLD if up else D.C_ACC
	b_exp.ratio = g.rexp / g.realm_need(g.realm)
	l_silver.text = g.fmt(g.silver)
	var hm: float = g.hero_hp_max()
	l_hp.text = "%s / %s" % [g.fmt(ceilf(g.hp)), g.fmt(hm)]
	b_hp.fg = D.C_TEAL if g.st == "down" else D.C_ROSE
	b_hp.ratio = g.hp / hm
	track.stage = g.stage
	var cap: int = g.train_cap()
	for s in D.TRAIN:
		var k: String = s["k"]
		var c: Dictionary = cards[k]
		var lv: int = g.tr[k]
		var full := lv >= cap
		var cost: float = g.train_cost(k)
		c["lv"].text = "Lv %d / %d" % [lv, cap]
		c["val"].text = "+%d%%" % (lv * int(s["inc"]))
		c["cl"].text = "경지 상한" if full else g.fmt(cost)
		var stt := "full" if full else ("can" if g.silver >= cost else "no")
		if stt != c["state"]:
			c["state"] = stt
			var sb: StyleBoxFlat = sb_card_can if stt == "can" else sb_card
			for n in ["normal", "hover", "pressed", "disabled"]: c["b"].add_theme_stylebox_override(n, sb)
			c["cost"].add_theme_stylebox_override("panel", sb_cost_can if stt == "can" else (sb_cost_full if stt == "full" else sb_cost))
			c["cl"].add_theme_color_override("font_color", D.C_GOLD if stt == "can" else (D.C_TEAL if stt == "full" else D.C_DIM))
			c["coin"].visible = stt != "full"
			c["coin"].modulate = Color.WHITE if stt == "can" else Color(1, 1, 1, 0.45)
			c["ic"].modulate = Color.WHITE if stt == "can" else Color(0.82, 0.84, 0.88)
	# 깨달음 — 내민 장이 바뀔 때만 카드를 다시 만든다 (매번 다시 만들면 탭이 먹힌다)
	var pending: bool = g.insight > 0 and not g.offer.is_empty()
	var sig: String = ",".join(g.offer) + "|" + str(g.arts) if pending else ""
	if sig != ins_sig:
		ins_sig = sig
		for c in ins_cards.get_children():
			ins_cards.remove_child(c)
			c.queue_free()
		if pending:
			for i in g.offer.size(): ins_cards.add_child(_ins_card(g.offer[i], i))
	if pending: l_ins.text = "하나를 고른다" if g.insight == 1 else "하나를 고른다 · %d번 남음" % g.insight
	# 탭 — 깨달음은 무공 탭 안에서 고른다. **탭을 저절로 바꾸지 않는다**: 누르려던 자리에 딴 카드가 끼어들면 잘못 고른다
	train_box.visible = tab == "train"
	ins_box.visible = tab == "arts" and pending
	arts_box.visible = tab == "arts" and not pending
	info_box.visible = tab == "info"
	for k in tabs:
		tabs[k].on = tab == k
	tabs["arts"].dot = pending
	# 무공 표
	for a in D.ARTS:
		var k: String = a["k"]
		var t: Dictionary = tiles[k]
		var lv: int = g.art_lv(k)
		var locked: bool = lv == 0 and int(a["need"]) > g.realm
		var tsig := "%d|%s|%s" % [lv, locked, sel_art == k]
		if tsig == t["sig"]: continue
		t["sig"] = tsig
		t["st"].text = ("Lv %d / %d" % [lv, g.art_max(a)]) if lv > 0 else ((g.realm_name(int(a["need"])) + "부터") if locked else "아직 안 익힘")
		t["st"].add_theme_color_override("font_color", Color(a["col"]).lerp(Color.WHITE, 0.25) if lv > 0 else D.C_DIM)
		t["nm"].add_theme_color_override("font_color", D.C_INK if lv > 0 else D.C_MUTE)
		t["ic"].modulate = Color.WHITE if lv > 0 else (Color(0.2, 0.22, 0.27) if locked else Color(0.42, 0.45, 0.52))
		var sbt: StyleBoxFlat = sb_tile_on if sel_art == k else (sb_card_can if lv > 0 else sb_card)
		for n in ["normal", "hover", "pressed", "disabled"]: t["b"].add_theme_stylebox_override(n, sbt)
	# 정보
	if tab == "info":
		var na := 0
		var np := 0
		for a in D.ARTS:
			if g.art_lv(a["k"]) > 0:
				if a["type"] == "active": na += 1
				else: np += 1
		info["경지"].text = g.realm_name(g.realm)
		info["다음 경지"].text = "%d%%" % int(floor(g.rexp / g.realm_need(g.realm) * 100.0))
		info["공격"].text = g.fmt(roundf(g.hero_dmg()))
		info["체력"].text = g.fmt(hm)
		info["회복"].text = "%.1f / 초" % g.hero_regen()
		info["무공"].text = "초식 %d · 심법 %d" % [na, np]
		info["처치"].text = g.fmt(g.total)
		info["쓰러짐"].text = "%d번" % g.downs
		info["수호자"].text = "넘었다" if g.cleared else "아직"
		info["판"].text = "v%s" % ProjectSettings.get_setting("application/config/version", "0")
	# 맨 아래 한 줄 — 고른 무공의 설명이 먼저
	if tab == "arts" and not pending and sel_art != "":
		var sa: Dictionary = g.art_def(sel_art)
		var slv: int = maxi(1, g.art_lv(sel_art))
		var eff := ""
		if sa.has("heal"): eff = "체력 %d%% 회복 · %d초" % [int(round(g.art_heal(sel_art, slv) * 100.0)), int(sa["cd"])]
		elif sa["type"] == "active": eff = "공격의 %d%% · %d초" % [int(round(g.art_power(sel_art, slv) * 100.0)), int(sa["cd"])]
		else: eff = "%s +%d%%" % [D.STAT_NAME[sa["stat"]], int(round(float(sa["inc"]) * slv * 100.0))]
		l_hint.text = "%s — %s · %s" % [sa["n"], sa["d"], eff]
		l_hint.add_theme_color_override("font_color", Color(sa["col"]).lerp(Color.WHITE, 0.3))
	else:
		l_hint.text = (D.HINT_INSIGHT if pending else (D.HINT_DONE if g.cleared else (D.HINT_BOSS if boss else D.HINT)))
		l_hint.add_theme_color_override("font_color", D.C_GOLD if pending else D.C_TEAL)
