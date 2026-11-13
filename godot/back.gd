extends Node2D
## 원경 — 하늘과 멀리 흐르는 그림. 이 층만 부드럽게(선형) 늘린다: 크게 늘린 도트는 지저분하다.
const D = preload("res://data.gd")
const Art = preload("res://art.gd")
var g
var vh := D.SCENE_MIN

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR

func _draw() -> void:
	if g == null: return
	var gy := vh - D.GROUND
	draw_rect(Rect2(-8, 0, D.VW + 16, vh), D.SKY)
	var im := Art.tex(g.zone()["bg"])
	if im == null: return
	var bh := roundf(vh * D.BACK_HR)
	var bw := roundf(im.get_width() * bh / im.get_height())
	var x := -fposmod(g.cam_x * D.BACK_PAR, bw)
	while x < D.VW:
		draw_texture_rect(im, Rect2(roundf(x), gy - bh + D.BACK_SINK, bw, bh), false)
		x += bw
