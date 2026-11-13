extends SceneTree
## 그림 맞추기 — data.gd 의 asset_keys() 를 읽어 ../assets 에서 art/ 로 복사한다. 없는 키가 있으면 실패한다.
## godot --headless --script res://tools/sync_art.gd  (그 뒤 --import 를 한 번 돌린다)
func _init() -> void:
	var D = load("res://data.gd")
	var root := ProjectSettings.globalize_path("res://")
	var src := root.path_join("../assets")
	DirAccess.make_dir_recursive_absolute(root.path_join("art"))
	var miss: Array = []
	var n := 0
	for k in D.asset_keys():
		var a := src.path_join("%s.png" % k)
		if not FileAccess.file_exists(a):
			miss.append(k); continue
		DirAccess.copy_absolute(a, root.path_join("art/%s.png" % k)); n += 1
	if miss.size() > 0:
		printerr("★ 없는 그림: ", ", ".join(miss)); quit(1); return
	print("그림 %d장 → art/" % n)
	quit(0)
