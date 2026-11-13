/* ── 게임 — 상태·수식·한 걸음 ──────────────────────────
   세계는 x 한 줄이다. 주인공은 오른쪽으로 달리고 적은 오른쪽에서 온다. */
const S = { zi: 0, stage: 1, kills: 0, exp: 0, realm: 0, silver: 0, tr: { atk: 0, hp: 0, regen: 0 },
            downs: 0, total: 0, bossDone: {}, cleared: false, t: 0, waveX: 0, shake: 0, foes: [], fx: [] };
const P = { x: 0, hp: HERO.hp, st: 'run', af: 0, cd: 0, mv: 0, key: 'punch', hitDone: false, flash: 0, downT: 0, dustT: 0 };
let camX = 0;

// 수식 (옛 판과 같다)
const zone      = () => ZONES[S.zi];
const isBoss    = () => S.stage > STAGE.n;
const gstage    = () => S.zi * 10 + Math.min(S.stage, STAGE.n);
const stageNeed = () => Math.max(DIFF.needRound, Math.round((DIFF.needBase + gstage() * DIFF.needPer) / DIFF.needRound) * DIFF.needRound);
const foeHp     = () => DIFF.hpBase * Math.pow(DIFF.hpGrow, gstage() - 1);
const foeDmg    = () => DIFF.dmgBase * Math.pow(DIFF.dmgGrow, gstage() - 1);
const bossHp    = () => DIFF.hpBase * Math.pow(DIFF.hpGrow, S.zi * 10 + 9) * BOSS.hp;
const bossDmg   = () => DIFF.dmgBase * Math.pow(DIFF.dmgGrow, S.zi * 10 + 9) * BOSS.dmg;
const trainMul  = k => 1 + (S.tr[k] | 0) * TRAIN.list.find(s => s.k === k).inc / 100;
const heroDmg   = () => HERO.dmg * Math.pow(GROW.dmg, S.realm) * trainMul('atk');
const heroHpMax = () => Math.round(HERO.hp * Math.pow(GROW.hp, S.realm) * trainMul('hp'));
const heroRegen = () => HERO.regen * Math.pow(GROW.regen, S.realm) * trainMul('regen');
const realmNeed = k => Math.round(REALM.expBase * Math.pow(REALM.expGrow, k));
const killExp   = () => Math.pow(REALM.killGrow, gstage() - 1);
const killSilver= () => Math.round(SILVER.base * Math.pow(SILVER.grow, gstage() - 1));
function realmName(k){
  const t = Math.floor(k / REALM.per);
  return t < REALM.names.length ? REALM.names[t] + ' ' + (k % REALM.per + 1) + '성' : REALM.last + ' ' + (k - REALM.names.length * REALM.per + 1) + '성';
}
const trainCap  = () => (S.realm + 1) * TRAIN.capPer;
const trainCost = k => { const s = TRAIN.list.find(x => x.k === k); return Math.round(s.cb * Math.pow(s.cg, S.tr[k] | 0)); };
function trainBuy(k){
  if ((S.tr[k] | 0) >= trainCap()) return false;
  const c = trainCost(k); if (S.silver < c) return false;
  S.silver -= c; S.tr[k] = (S.tr[k] | 0) + 1;
  if (k === 'hp') P.hp = Math.min(heroHpMax(), P.hp + heroHpMax() * TRAIN.list[1].inc / 100);
  return true;
}

// 몸 반폭 — 그림이 닿는 거리 계산에 쓴다
const foeM   = f => FOES[f.k];
const foeRad = f => { const M = foeM(f); return (M.sw || M.w) * (M.sc || 1) * (f.boss ? BOSS.edge : FOE.edge); };
const moves  = () => MOVES.filter(m => m.need <= S.realm);

function spawnWave(){
  const st = Math.min(S.stage, STAGE.n), n = STAGE.max(st), list = zone().foes;
  let x = Math.max(camX + VW + WAVE.ahead, S.waveX);
  for (let i = 0; i < n; i++){
    const k = list[Math.floor(Math.random() * list.length)], M = FOES[k], hp = Math.round(foeHp() * M.hp);
    S.foes.push({ k, x, y: rnd(-WAVE.jitterY, WAVE.jitterY), hp, hpMax: hp, st: 'walk', af: rnd(0, 4), atkT: 0, cd: rnd(0.2, 0.9),
                  hitDone: false, hitT: 0, flash: 0, dead: 0, stop: rnd(WAVE.stopJit[0], WAVE.stopJit[1]) });
    x += rnd(WAVE.gap[0], WAVE.gap[1]);
  }
  S.waveX = x;
}
function spawnBoss(){
  const z = zone(), hp = Math.round(bossHp());
  S.foes.push({ k: z.boss, boss: true, x: P.x + BOSS.enter, y: 0, hp, hpMax: hp, st: 'walk', af: 0, atkT: 0, cd: 1.2, skillCd: BOSSKILL.cd,
                hitDone: false, hitT: 0, flash: 0, dead: 0, stop: 0 });
  P.hp = heroHpMax();                                    // 만회복하고 맞선다 (옛 판 beginSummon)
  S.shake = FX.shake.t;
}
function enterStage(){
  S.kills = 0; P.hp = heroHpMax();                       // 단계에 들어설 때 회복 (옛 판 enterStage)
  for (const f of S.foes) if (!f.dead){ f.dead = 0.001; f.st = 'death'; f.af = 0; f.swept = true; }
  S.waveX = 0;
  if (isBoss()) spawnBoss();
}

function fxAdd(o){ S.fx.push(o); if (S.fx.length > 90) S.fx.shift(); }
function hurtFoe(f, dmg){
  f.hp -= dmg; f.flash = FX.flash; f.x += HERO.kb * (f.boss ? 0.3 : 1);
  if (f.st !== 'atk' && f.st !== 'skill'){ f.st = 'hit'; f.hitT = FOE.hitT; }
  const M = foeM(f), hy = (M.bh || M.h) * (M.sc || 1);
  fxAdd({ k: 'dmg', x: f.x + rnd(-6, 6), y: -hy - 4, t: 0, v: Math.round(dmg) });
  for (let i = 0; i < FX.spark.n; i++){ const a = rnd(-1.1, 1.1); fxAdd({ k: 'spark', x: f.x - foeRad(f) * 0.6, y: -hy * 0.5 + f.y, t: 0, vx: Math.cos(a) * rnd(40, FX.spark.spd), vy: Math.sin(a) * rnd(40, FX.spark.spd) - 30 }); }
  if (f.hp <= 0 && !f.dead) killFoe(f);
}
function killFoe(f){
  f.dead = 0.001; f.st = 'death'; f.af = 0; f.hp = 0;
  S.total++;
  const boss = !!f.boss;
  S.exp += killExp() * (boss ? REALM.bossExp : 1);
  let sv = killSilver() * (boss ? SILVER.bossKill : 1);
  if (boss){
    if (!S.bossDone[S.zi]){ S.bossDone[S.zi] = 1; sv += killSilver() * SILVER.firstMul; }
    S.cleared = true; S.shake = FX.shake.t * 1.6;
    S.stage = STAGE.n; enterStage();                      // 다음 구역은 아직 없다 — 마지막 단계에서 계속 사냥한다
  } else S.kills++;
  S.silver += sv;
  fxAdd({ k: 'coin', x: f.x, y: -30, t: 0, v: sv });
  while (S.exp >= realmNeed(S.realm)){ S.exp -= realmNeed(S.realm); S.realm++; P.hp = heroHpMax(); S.realmUp = 2.2; }
  if (!boss && S.kills >= stageNeed()){ S.stage++; enterStage(); }
}
function hurtHero(d){
  if (P.st === 'down') return;
  P.hp -= d; P.flash = HERO.hurtFlash;
  fxAdd({ k: 'dmg', x: P.x + rnd(-5, 5), y: -52, t: 0, v: Math.round(d), hero: true });
  if (P.hp <= 0){
    P.hp = 0; P.st = 'down'; P.af = 0; P.downT = HERO.downT; S.downs++; S.shake = FX.shake.t;
    if (isBoss()){ S.stage = STAGE.n; }                    // 수호자에게 지면 10단계로 물러난다
    for (const f of S.foes) if (!f.dead){ f.dead = 0.001; f.st = 'death'; f.af = 0; f.swept = true; }
    S.kills = 0; S.waveX = 0;
  }
}

function step(dt){
  S.t += dt;
  if (S.shake > 0) S.shake -= dt;
  if (S.realmUp > 0) S.realmUp -= dt;
  // ── 주인공
  if (P.flash > 0) P.flash -= dt;
  if (P.st === 'down'){
    P.af += dt * ANIM.medit[1]; P.downT -= dt;
    P.hp = Math.min(heroHpMax(), P.hp + heroHpMax() * dt / HERO.downT);
    if (P.downT <= 0){ P.st = 'idle'; P.hp = heroHpMax(); P.cd = 0.2; }
  } else {
    P.hp = Math.min(heroHpMax(), P.hp + heroRegen() * dt);
    if (P.cd > 0) P.cd -= dt;
    let near = null, nd = 1e9;
    for (const f of S.foes){ if (f.dead) continue; const d = f.x - P.x; if (d < nd){ nd = d; near = f; } }
    if (P.st === 'atk'){
      P.af += dt * ANIM.atk[1];
      if (!P.hitDone && P.af >= HITFRAME){
        P.hitDone = true;
        const mv = MOVES.find(m => m.key === P.key), dmg = heroDmg();
        let any = false;
        for (const f of S.foes){ if (f.dead) continue; if (f.x - P.x < mv.reach + foeRad(f) + HERO.reach + 2){ hurtFoe(f, dmg); any = true; } }
        if (any) fxAdd({ k: 'slash', x: P.x + mv.reach + 8, y: -26, t: 0 });
      }
      if (P.af >= ANIM.atk[0]){ P.st = 'idle'; P.af = 0; }
    }
    if (P.st !== 'atk'){
      const list = moves(), mv = list[P.mv % list.length];
      const inReach = near && nd < mv.reach + foeRad(near) + HERO.reach;
      if (inReach){
        if (P.cd <= 0){ P.st = 'atk'; P.af = 0; P.hitDone = false; P.key = mv.key; P.mv++; P.cd = HERO.atkCd; }
        else if (P.st !== 'idle'){ P.st = 'idle'; P.af = 0; }
      } else {
        if (P.st !== 'run'){ P.st = 'run'; P.af = 0; }
        P.x += HERO.spd * dt; P.af += dt * ANIM.run[1];
        P.dustT -= dt; if (P.dustT <= 0){ P.dustT = HERO.dust; fxAdd({ k: 'dust', x: P.x - 10, y: -2, t: 0, r: rnd(3, FX.dust.r) }); }
      }
    }
  }
  // ── 적
  const spd = STAGE.spd(Math.min(S.stage, STAGE.n));
  let alive = 0;
  for (const f of S.foes){
    const M = foeM(f);
    if (f.flash > 0) f.flash -= dt;
    if (f.dead){ f.dead += dt; f.af += dt * M.fps.death; continue; }
    alive++;
    const d = f.x - P.x, rng = (f.boss ? BOSS.range : M.range) + f.stop, down = P.st === 'down';
    if (f.st === 'hit'){ f.hitT -= dt; if (f.hitT <= 0) f.st = 'idle'; continue; }
    if (f.st === 'skill'){
      f.atkT -= dt; f.af = (1 - f.atkT / BOSSKILL.dur) * M.anim.skill.length;
      if (!f.hitDone && 1 - f.atkT / BOSSKILL.dur >= BOSSKILL.hitAt){ f.hitDone = true; S.shake = FX.shake.t; fxAdd({ k: 'ring', x: f.x, y: -20, t: 0, r: BOSSKILL.range }); if (d < BOSSKILL.range) hurtHero(bossDmg() * BOSSKILL.dmg); }
      if (f.atkT <= 0){ f.st = 'idle'; f.cd = FOE.cd; }
      continue;
    }
    if (f.st === 'atk'){
      const dur = f.boss ? BOSS.dur : FOE.dur;
      f.atkT -= dt; f.af = (1 - f.atkT / dur) * M.anim.atk.length;
      if (!f.hitDone && 1 - f.atkT / dur >= (f.boss ? BOSS.hitAt : FOE.hitAt)){
        f.hitDone = true;
        if (d < rng + (f.boss ? BOSS.hitPad : FOE.hitPad)) hurtHero(f.boss ? bossDmg() : foeDmg() * M.dmg);
      }
      if (f.atkT <= 0){ f.st = 'idle'; f.cd = FOE.cd * rnd(0.8, 1.3); }
      continue;
    }
    if (f.cd > 0) f.cd -= dt;
    if (f.boss && !down){ f.skillCd -= dt; if (f.skillCd <= 0 && d < BOSSKILL.range){ f.skillCd = BOSSKILL.cd; f.st = 'skill'; f.atkT = BOSSKILL.dur; f.hitDone = false; continue; } }
    if (d > rng && !down){
      f.st = 'walk'; f.x -= spd * (f.boss ? BOSS.spd : M.spd) * dt; f.af += dt * M.fps.walk;
    } else if (f.cd <= 0 && !down){
      f.st = 'atk'; f.atkT = f.boss ? BOSS.dur : FOE.dur; f.hitDone = false; f.af = 0;
    } else { f.st = 'idle'; f.af += dt * M.fps.idle; }
  }
  for (let i = S.foes.length - 1; i >= 0; i--){ const f = S.foes[i], M = foeM(f); if (f.dead && f.dead > M.anim.death.length / M.fps.death + FOE.fade) S.foes.splice(i, 1); }
  // ── 떼
  if (!isBoss() && P.st !== 'down' && alive <= WAVE.left) spawnWave();
  if (isBoss() && alive === 0 && P.st !== 'down' && !S.foes.some(f => f.boss)) spawnBoss();
  // ── 연출·카메라
  for (let i = S.fx.length - 1; i >= 0; i--){ const e = S.fx[i]; e.t += dt; const life = e.k === 'dmg' || e.k === 'coin' ? FX.dmg.life : e.k === 'dust' ? FX.dust.life : e.k === 'ring' ? 0.5 : e.k === 'slash' ? FX.slash.life : FX.spark.life; if (e.t > life) S.fx.splice(i, 1); else if (e.k === 'spark'){ e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 300 * dt; } }
  camX += (P.x - VW * VIEW.heroX - camX) * Math.min(1, dt * VIEW.camK);
}

// 저장 — 막힌 환경(아티팩트 iframe 등)에선 조용히 넘어간다
function saveNow(){ try { localStorage.setItem(SAVE.key, JSON.stringify({ zi: S.zi, stage: S.stage, kills: S.kills, exp: S.exp, realm: S.realm, silver: S.silver, tr: S.tr, downs: S.downs, total: S.total, bossDone: S.bossDone, cleared: S.cleared })); return true; } catch(e){ return false; } }
function loadSave(){
  try { const d = JSON.parse(localStorage.getItem(SAVE.key) || 'null'); if (!d) return false;
    S.zi = 0; S.stage = clamp(d.stage | 0, 1, STAGE.n + 1); S.kills = Math.max(0, d.kills | 0); S.exp = Math.max(0, +d.exp || 0); S.realm = Math.max(0, d.realm | 0);
    S.silver = Math.max(0, +d.silver || 0); for (const s of TRAIN.list) S.tr[s.k] = Math.max(0, (d.tr && d.tr[s.k]) | 0);
    S.downs = d.downs | 0; S.total = d.total | 0; S.bossDone = d.bossDone || {}; S.cleared = !!d.cleared;
    if (isBoss()) S.stage = STAGE.n;
    return true;
  } catch(e){ return false; }
}
