extends SceneTree
## 가로판 검사 — 머리 없이 게임 로직만 돌린다 (구동 + 진행 박자).
## godot --headless --script res://test.gd   (SIM_MIN=분, 기본 30)
var fail := 0
func ok(c: bool, m: String) -> void:
	if c: print("  ✓ ", m)
	else:
		fail += 1; print("  ✗ ", m)
func run(g, sec: float) -> void:
	for i in int(round(sec * 60.0)): g.step(1.0 / 60.0)
func spend(g, D) -> void:      # 깨달음은 첫 장(새 초식 우선)을 고르고, 가장 싼 수련부터 산다 (플레이어 흉내)
	while g.insight > 0 and not g.offer.is_empty(): g.pick(0)
	for n in 40:
		var best := ""
		var c := 1e99
		for s in D.TRAIN:
			var x: float = g.train_cost(s["k"])
			if int(g.tr[s["k"]]) < g.train_cap() and x < c:
				c = x; best = s["k"]
		if best == "" or not g.train_buy(best): break

func _init() -> void:
	var D = load("res://data.gd")
	var Game = load("res://game.gd")
	var g = Game.new()
	print("── 구동")
	run(g, 20.0)
	ok(g.total > 0, "20초에 처치 %d" % g.total)
	ok(g.px > 300.0, "주인공이 오른쪽으로 나아간다 (x %d)" % int(g.px))
	ok(g.foes.all(func(f): return f["x"] > g.px - 40.0), "적은 앞(오른쪽)에서만 온다")
	g.silver = 1000.0
	ok(g.train_buy("atk") and g.tr["atk"] == 1 and g.silver < 1000.0, "수련이 사진다")
	g.silver = 0.0
	ok(not g.train_buy("hp"), "은자가 모자라면 안 사진다")
	g.tr["atk"] = g.train_cap(); g.silver = 1e9
	ok(not g.train_buy("atk"), "수련 상한 = 경지")
	g.tr["atk"] = 1; g.silver = 0.0
	g.hp = 1.0; g.hurt_hero(99.0)
	ok(g.st == "down", "쓰러지면 운기조식")
	run(g, 3.3)
	ok(g.st != "down" and g.hp == g.hero_hp_max(), "3초 뒤 만회복으로 일어선다")
	g.stage = D.STAGE_N; g.enter_stage(); g.kills = g.stage_need() - 1; g.realm = 30
	run(g, 12.0)
	ok(g.is_boss() or g.cleared, "10단계를 넘으면 수호자 단계")
	run(g, 40.0)
	ok(g.cleared, "수호자 격파 → 넘었다 표시 · 마지막 단계에서 계속 사냥 (단계 %d)" % g.stage)
	var g2 = Game.new()
	ok(g2.apply_save(JSON.parse_string(JSON.stringify(g.save_data()))) and g2.realm == g.realm and g2.cleared, "저장 → 불러오기")
	ok(not g2.apply_save("깨진 저장") and Game.fmt(123456.0) == "12.3만" and Game.fmt(999.0) == "999", "깨진 저장 거름 · 숫자 표기")
	ok(D.asset_keys().all(func(k): return ResourceLoader.exists("res://art/%s.png" % k)), "그림 %d장 전부 있다" % D.asset_keys().size())

	print("── 무공")
	var g3 = Game.new()
	run(g3, 3.0)
	g3.rexp = g3.realm_need(0) + g3.realm_need(1)
	g3.kill_foe(g3.foes[0])
	ok(g3.realm == 2 and g3.insight == 2, "경지가 오른 만큼 깨달음이 쌓인다 (%d)" % g3.insight)
	ok(g3.offer.size() == 3 and g3.offer[0] == "whirl", "석 장을 내민다 — 안 배운 초식이 맨 앞 (%s)" % ", ".join(g3.offer))
	ok(g3.pick(0) and g3.art_lv("whirl") == 1 and g3.insight == 1 and g3.offer.size() == 3 and g3.offer[0] == "pagong", "고르면 배우고 다음 석 장이 나온다")
	ok(not g3.pick(7), "없는 장은 못 고른다")
	var d0: float = g3.hero_dmg()
	g3.offer = ["honwon"]; g3.pick(0)
	ok(is_equal_approx(g3.hero_dmg(), d0 * 1.06), "심법은 스탯에 곱해진다")
	g3.insight = 0; g3.offer = []
	run(g3, 25.0)
	ok(g3.casts > 0, "배운 초식을 알아서 쓴다 (25초에 %d번)" % g3.casts)
	g3.arts["pagong"] = 1; g3.cds = {}
	var c0: int = g3.casts
	run(g3, 20.0)
	ok(g3.casts > c0 + 2, "초식 둘을 번갈아 쓴다 — 동시 시전 없음")
	g3.arts = { "hwalin": 1 }; g3.cds = {}; g3.st = "idle"; g3.cast_gap = 0.0
	g3.hp = g3.hero_hp_max() * 0.2
	var h0: float = g3.hp
	run(g3, 1.2)
	ok(g3.hp > h0 + g3.hero_hp_max() * 0.2, "활인기공 — 위태로우면 회복")
	g3.arts = { "whirl": 5, "honwon": 10 }; g3.realm = 0; g3.insight = 1; g3.offer = []; g3.make_offer()
	ok(not g3.offer.has("whirl") and not g3.offer.has("honwon"), "다 익힌 것은 안 나온다")
	var g4 = Game.new()
	ok(g4.apply_save(JSON.parse_string(JSON.stringify(g3.save_data()))) and g4.art_lv("whirl") == 5 and g4.insight == 1 and g4.offer == g3.offer, "무공·깨달음 저장")

	print("── 박자 (수련을 가장 싼 것부터 사는 플레이어)")
	g = Game.new()
	var mins := int(OS.get_environment("SIM_MIN")) if OS.get_environment("SIM_MIN") != "" else 30
	var tt := 0.0
	var at5 := 0
	for m in [1, 3, 5, 10, 15, 20, 30, 45, 60, 120, 240]:
		if m > mins: break
		while tt < m * 60.0:
			run(g, 5.0); tt += 5.0; spend(g, D)
		if m == 5: at5 = g.stage
		var where := "죽림 넘음" if g.cleared else ("수호자" if g.is_boss() else "죽림 %d" % g.stage)
		var al: Array = []
		for a in D.ARTS:
			if g.art_lv(a["k"]) > 0: al.append("%s%d" % [a["n"].substr(0, 2), g.art_lv(a["k"])])
		print("  %3d분  %s  %s  처치 %5d · 쓰러짐 %d · 수련 %d/%d/%d · 무공 %s · 잔고 %s (%.1f분 치)" % [m, where, g.realm_name(g.realm), g.total, g.downs,
			g.tr["atk"], g.tr["hp"], g.tr["regen"], " ".join(al), Game.fmt(g.silver), g.silver / (g.kill_silver() * maxf(1.0, g.total) / (tt / 60.0))])
	if mins >= 5: ok(at5 >= 4 and at5 <= 8, "5분에 죽림 4~8단계 (옛 판 6~7) — 지금 %d" % at5)
	print("통과" if fail == 0 else "★ 실패 %d건" % fail)
	quit(1 if fail > 0 else 0)
