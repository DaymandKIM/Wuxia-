extends RefCounted
## 그림·글꼴 창고 — 한 번 읽은 것은 다시 안 읽는다
static var _tex := {}
static var _font := {}
static func tex(key: String) -> Texture2D:
	if not _tex.has(key):
		var p := "res://art/%s.png" % key
		_tex[key] = load(p) if ResourceLoader.exists(p) else null
	return _tex[key]
static func font(name: String) -> Font:      # sans-regular · sans-semibold · serif-bold
	if not _font.has(name): _font[name] = load("res://fonts/%s.ttf" % name)
	return _font[name]
