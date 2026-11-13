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
var l_stat: Label
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
	_build()
	get_viewport().size_changed.connect(_layout)
	_layout()
	_ui()

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
	scene = preload("res://scene.gd").new()
	scene.g = g
	scene_box.add_child(scene)
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
	var mg := MarginContainer.new()
	mg.set_anchors_preset(Control.PRESET_FULL_RECT)
	mg.add_theme_constant_override("margin_left", 18); mg.add_theme_constant_override("margin_right", 18)
	mg.add_theme_constant_override("margin_top", 15); mg.add_theme_constant_override("margin_bottom", 12)
	panel.add_child(mg)
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
	var r3 := hbox(12)
	pv.add_child(r3)
	r3.add_child(lab("수련", 16.2, D.C_INK, "serif-bold", 5))
	var ln := ColorRect.new()
	ln.color = D.C_LINE
	ln.custom_minimum_size = Vector2(0, 1)
	ln.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ln.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	r3.add_child(ln)
	var ch := hbox(11)
	pv.add_child(ch)
	for s in D.TRAIN: ch.add_child(_card(s))
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pv.add_child(sp)
	var foot := vbox(4)
	pv.add_child(foot)
	l_stat = lab("", 12, D.C_MUTE)
	l_hint = lab("", 12.6, D.C_TEAL)
	var l_ver := lab("가로판 v%s" % ProjectSettings.get_setting("application/config/version", "0"), 10.4, D.C_DIM, "sans-regular", 1)
	for l in [l_stat, l_hint, l_ver]:
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		foot.add_child(l)

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
	panel.position = Vector2(0, sh)
	panel.size = Vector2(D.VW, vp.y - sh)
	var sat := _sat()
	rpill.position = Vector2(17, sat + 12)
	spill.offset_left = -17; spill.offset_right = -17; spill.offset_top = sat + 12
	zhead.offset_top = sat + 70
	zhead.offset_left = 0; zhead.offset_right = 0

func _process(dt: float) -> void:
	dt = minf(dt, 0.05)
	g.step(dt)
	scene.position.x = randf_range(-0.5, 0.5) * D.SHAKE_PX if g.shake > 0.0 else 0.0
	back.queue_redraw()
	scene.queue_redraw()
	_ui()
	save_t += dt
	if save_t > D.SAVE_EVERY:
		save_t = 0.0
		g.save_now()

func _notification(what: int) -> void:
	if g != null and (what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_WINDOW_FOCUS_OUT): g.save_now()

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
	l_hint.text = D.HINT_DONE if g.cleared else (D.HINT_BOSS if boss else D.HINT)
	l_stat.text = "공격 %s · 회복 %.1f/초 · 처치 %s" % [g.fmt(roundf(g.hero_dmg())), g.hero_regen(), g.fmt(g.total)]
