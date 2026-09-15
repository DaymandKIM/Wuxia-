/* ── 적 ───────────────────────────────────────────── */
function spawnFoe(){
  // 옆모습 스프라이트라 좌우에서 오는 게 자연스럽다 — 세로 성분을 눌러 납작한
  // 타원으로 등장시킨다. 위아래도 오되(빈 화면 방지) 사선으로 온다 (v2.29)
  const a = rnd(0, Math.PI*2), r = rnd(SPAWN.rMin, SPAWN.rMax);
  const list = ZONEFOE[zone().k] || ['bandit'];
  const k = list[Math.floor(Math.random()*list.length)];
  const M = FOES[k];
  S.foes.push({
    k, anim:'idle', af:0,
    x: P.x + Math.cos(a)*r,
    y: P.y + Math.sin(a)*r*SPAWN.flat,
    hp: Math.round(foeHp()*M.hp), hpMax: Math.round(foeHp()*M.hp),
    boss: false,
    dir: -1,
    af: rnd(0,4),
    dead: false, dying: 0,
    hit: 0,
    atkT: 0, cd: rnd(0.4, 1.6), hitDone: false,
  });
}

// 보스 — 주인공 오른쪽에서 등장한다 (v2.31.1, 사용자 확정: 주인공은 중앙보다
// 조금 왼편, 보스는 오른편. 카메라가 2:1로 당겨 그 구도가 나온다)
// 문이 열리고 기운이 모인다. 끝나면 보스가 선다.
function beginSummon(){
  S.summonT = SUMMON.dur;
  S.summonX = P.x + SUMMON.side;
  S.summonY = P.y;            // 같은 땅 높이 — 바닥 기준이라 발이 나란히 선다
  S.gateY   = S.summonY - SUMMON.gate;
  S.foes.length = 0;               // 잡몹은 물러난다
  P.hp = P.hpMax;                  // 등장은 숨 고르기 — 만회복하고 보스를 맞는다
                                   // (v2.42: "보스 나오기 전에 죽더라" — 낮은 HP로
                                   //  진입하면 등장 직후 순삭됐다. 등장은 전투가 없으니
                                   //  여기서 채운다)
  sfx('down');
}

function spawnBoss(){
  const hp = bossHp();
  S.foes.push({
    k: ZONEBOSS[zone().k] || (ZONEFOE[zone().k]||['bandit'])[0],
    boss: true,
    anim:'idle', af:0,
    x: S.summonX || (P.x + SUMMON.side), y: S.summonY || P.y,
    rise: SUMMON.rise,               // >0 이면 문에서 걸어 나오는 중
    hp, hpMax: hp,
    dir: -1,
    dead:false, dying:0, hit:0,
    atkT:0, cd:1.4, hitDone:false,
    skT:0, skCd:BOSSKILL.cd*0.6, skDone:false,
    kb:0, kx:0, ky:0,
  });
  S.bossAlive = true;
  // 등장 파열 (v2.31) — 문이 닫히며 기운이 터진다
  fxBlast(S.summonX || P.x, (S.summonY || P.y) - 46, FXD.boss.r, FXD.boss.c, true);
  shake(7);
  // 문이 어둠 속으로 스러진다 (v2.40) — 보스가 걸어 나온 뒤 페이드아웃
  S.gateT = SUMMON.fade; S.gateX = S.summonX; S.gateYb = S.summonY;
}

// 큰 마법 구체 — 느리지만 아프고 넓다
function castFoe(f){
  const M = foeM(f);
  const d = dist(f.x, f.y, P.x, P.y) || 1;
  S.shots.push({
    big: true,
    x: f.x + (P.x-f.x)/d * 16,
    y: f.y - (M.bh||M.h)*0.45,
    vx: (P.x-f.x)/d, vy: (P.y - HERO.h*0.4 - (f.y - (M.bh||M.h)*0.45))/d,
    spd: (M.shotSpd||180) * 0.62,
    dmg: foeDmg() * M.dmg * (M.skillDmg||2),
    r: M.skillR || 24,
    life: 3.2, t: 0,
  });
}

// 원거리 탄 — 주술사가 쏜다
function shootFoe(f){
  const M = foeM(f);
  const d = dist(f.x, f.y, P.x, P.y) || 1;
  S.shots.push({
    x: f.x + (P.x-f.x)/d * 14,
    y: f.y - (M.bh||M.h)*0.45,
    vx: (P.x-f.x)/d, vy: (P.y - HERO.h*0.4 - (f.y - (M.bh||M.h)*0.45))/d,
    spd: M.shotSpd || 180,
    // 보스의 탄(원혼 해골 귀화)은 보스 스킬 위력으로 나간다
    dmg: f.boss ? bossDmg() * BOSSKILL.dmg : foeDmg() * M.dmg,
    img: M.shotImg, dust: M.shotDust,   // 그림 탄(낭인 술병 등) — 없으면 절차 구체
    fly: f.boss || M.shotFly || undefined,   // 돌지 않고 나는 방향을 본다 (귀화·얼음 조각)
    life: 2.6,
    t: 0,
  });
}

const FOE = { range:44, dur:0.55, hitAt:0.55, cd:1.3 };
// 보스는 동작이 길다
const BOSSATK = { dur:0.72, hitAt:0.62 };

// 몸이 넓은 보스는 거리를 몸 가장자리에서 잰다 — 같은 높이로 대치하면서
// 주인공이 중심까지 파고들어 스프라이트에 파묻히는 것 방지 (v2.29)
const foeRad = f => f.boss ? (foeM(f).sw || foeM(f).w) * BOSS.edge : 0;

// 이펙트 헬퍼 (v2.31 — "이펙트가 조잡하다" 피드백) ────────
// 상한을 넘으면 가장 오래된 것부터 밀어낸다 (v2.36 — 예전엔 상한에서 그냥
// 안 넣어, 타격 숫자가 쌓이면 새 타격 파열이 영영 안 떴다 "이펙트가 사라짐").
function fxPush(e){
  if (S.fx.length >= FXD.max) S.fx.shift();
  S.fx.push(e);
}
// 파열 묶음 — 충격파 고리 + 튀는 파편. big이면 섬광·방사 속도선까지
function fxBlast(x, y, r, c, big){
  fxPush({ k:'wave',   x, y, r, c, life:FXD.wave.life, t:FXD.wave.life });
  fxPush({ k:'sparks', x, y, c, sd:(Math.random()*89)|0, life:FXD.spark.life, t:FXD.spark.life });
  if (big){
    fxPush({ k:'flash', x, y, r:r*1.6, c, life:FXD.flash.life, t:FXD.flash.life });
    fxPush({ k:'rays',  x, y, r:Math.max(14, r*0.35), c, sd:Math.random()*6.28,
             life:FXD.rays.life, t:FXD.rays.life });
  }
}

/* ── 주인공 공격 (맨손 정권) ───────────────────────── */
function heroAttack(){
  // 가장 가까운 적 — 거리는 조준·판정과 같은 눌린 척도로 잰다 (v2.29.1)
  // 평면 거리로 재면 위아래로 어긋났을 때 "조준은 됐는데 공격은 안 나가는" 틈이 생긴다
  let best=null, bd=1e9;
  for (const f of S.foes){
    if (f.dead) continue;
    const d = Math.hypot(f.x-P.x, (f.y-P.y)/HERO.atkFlat);
    if (d < bd){ bd=d; best=f; }
  }
  if (!best || bd > HERO.atkRange + HERO.atkReach + foeRad(best)) return false;
  P.dir = best.x >= P.x ? 1 : -1;
  // 성장형 무브셋 — 지금 열린 공격 동작을 순서대로 돌려 쓴다 (v2.46)
  const pool = atkPool();
  P.atkKey = pool[(P.atkMove | 0) % pool.length].key;
  P.atkMove = ((P.atkMove | 0) + 1) % pool.length;
  if (P.atkKey === 'punch') P.atkAlt = P.atkAlt ? 0 : 1;   // 양주먹은 오른손·왼손 권기 교대
  P.atkT = ANIM.atk[0] / ANIM.atk[1] / heroAtkSpd();   // 공격 속도만큼 빨리 지나간다
  P.atkCd = HERO.atkCd / heroAtkSpd();
  P.hitDone = false;
  return true;
}

// 공격 판정 — 지정 프레임에 한 번만
function heroHitCheck(){
  if (P.hitDone) return;
  const fi = Math.floor(P.af);
  if (fi < HITFRAME) return;
  P.hitDone = true;
  // 판정은 발 위치(바닥)에서 잰다. 위아래가 대칭이 된다.
  const cx = P.x + P.dir * 14, cy = P.y;
  let n = 0, cr = false;
  for (const f of S.foes){
    if (f.dead) continue;
    // 세로는 눌러서 잰다 — 바닥이 기울어 보이는 시점이라 위아래가 가깝게 느껴진다
    const dx = f.x - cx, dy = (f.y - cy) / HERO.atkFlat;   // 나누면 세로가 넓어진다
    // 판정은 공격 시작 여유(atkReach)만큼 넉넉히 — 붙어서 친 뒤 적이 살짝
    // 밀리거나 움직여도 놓치지 않는다 (v2.38, "손만 허우적" 잔여 제거)
    if (Math.hypot(dx, dy) < HERO.atkRange + HERO.atkReach + foeRad(f)){
      // 치명타 — 급소를 때리면 배수 피해, 노란 숫자로 알린다
      const crit = Math.random() < critCh();
      hurtFoe(f, heroDmg() * (crit ? critMul() : 1), crit);
      // 타격 파열 (v2.31) — 평타는 작은 임팩트, 치명타는 금빛 대파열
      const iy = f.y - (foeM(f).bh||foeM(f).h)*0.45;
      if (crit) fxBlast(f.x, iy, FXD.crit.r, FXD.crit.c, true);
      else fxBlast(f.x, iy, FXD.hit.r, FXD.hit.c);
      // 참격 호 (v2.61) — 임팩트 지점에 주인공이 보는 쪽으로 볼록한 네온 초승달
      fxPush({ k:'slash', x:f.x, y:iy, dir:P.dir, c:crit ? FXD.crit.c : FXD.hit.c,
               r:FXD.slash.r * (crit ? FXD.slash.crit : 1), sd:(Math.random()*2-1),
               life:FXD.slash.life, t:FXD.slash.life });
      // 치명타 — 발밑 네온 링 + 미세 경직 (경직은 loop에서만 적용, sim 무관)
      if (crit){
        fxPush({ k:'critring', x:f.x, y:f.y, r:FXD.critring.r, c:FXD.crit.c,
                 life:FXD.critring.life, t:FXD.critring.life });
        hitstop(FXD.hitstop.crit);
        cr = true;
      }
      n++;
    }
  }
  if (n) {
    shake(cr ? FXD.shake.crit : FXD.shake.hit); sfx('punch');
  }
}

function hurtFoe(f, dmg, crit){
  f.hp -= dmg;
  f.hit = 0.26;
  f.hitT = FXD.hitflash.life;      // 피격 브라이튼 — 아주 짧게 하얗게 번쩍 (v2.61)
  // 타격 숫자 — 매 타격 조그맣게, 회심(치명타)은 크고 노랗게
  fxPush({ k:'dmg', x:f.x + rnd(-7, 7), y:f.y - (foeM(f).bh||foeM(f).h),
              v:fmt(dmg), c:crit ? 1 : 0,
              life:crit ? 0.6 : 0.42, t:crit ? 0.6 : 0.42 });
  // 맞은 방향으로 살짝 밀린다
  const d = dist(P.x,P.y,f.x,f.y) || 1;
  f.kx = (f.x-P.x)/d; f.ky = (f.y-P.y)/d; f.kb = 0.09;
  if (f.hp <= 0 && !f.dead){
    f.dead = true; f.dying = 0.22;
    S.kills++; S.totalKills++;
    // 수련치 — 강한 구역일수록 크게. 경지가 오르면 알린다
    const k0 = realmLv();
    S.rexp += killExpAt() * (f.boss ? REALM.bossExp : 1);
    // 인연 — 기연의 재료
    S.karma += f.boss ? FATE.bossKarma : killKarmaAt();
    if (S.karma >= karmaNeed()) S.fatePending = 1;
    if (realmLv() > k0){
      toast(realmInfo().name + '에 올랐다');
      fxPush({ k:'burst', x:P.x, y:P.y - HERO.h*0.5, life:0.5, t:0.5 });
      shake(6); sfx('down');
    }
    // 심법 숙련 — 지닌 채 싸우면 몸에 스민다 (처치 수)
    for (const a of ARTS.list)
      if (a.type === 'passive' && S.arts[a.k]) S.artXp[a.k] = (S.artXp[a.k] | 0) + 1;
    // 은자 드랍 — 보스는 크게, 구역 첫 격파면 보너스까지
    let sv = killSilver() * (f.boss ? SILVER.bossKill : 1);
    if (f.boss && !S.bossDone[S.zi]){
      S.bossDone[S.zi] = 1;
      const bonus = killSilver() * SILVER.firstMul;
      sv += bonus;
      toast(zone().boss + ' 첫 격파 · 은자 +' + fmt(bonus));
    }
    S.silver += sv;
    fxPush({ k:'burst', x:f.x, y:f.y - (foeM(f).bh||foeM(f).h)*0.4, life:0.3, t:0.3 });
    sfx('kill');
  }
}

function hurtHero(dmg){
  if (P.dead) return;
  // 건곤이형 — 맞는 순간 힘을 흘리고(guard) 몇 배로 되돌린다(ref). 반격형 기연 무공
  const gg = artDef('geongon');
  if (S.arts.geongon && !(P.artCd.geongon > 0)){
    P.artCd.geongon = gg.cd;
    S.artXp.geongon = (S.artXp.geongon | 0) + 1;   // 숙련 — 되돌린 횟수
    const ret = dmg * gg.ref * artEff('geongon');
    dmg *= 1 - gg.guard;
    let best = null, bd = 1e9;
    for (const f of S.foes){
      if (f.dead) continue;
      const d = dist(P.x, P.y, f.x, f.y);
      if (d < bd){ bd = d; best = f; }
    }
    if (best) hurtFoe(best, ret);
    beginCast('geongon');
    fxPush({ k:'taiji', x:P.x, y:P.y - HERO.h*0.55, life:HFX.taijiT, t:HFX.taijiT });
    fxPush({ k:'artname', x:P.x, y:P.y - HERO.h - 10, v:gg.n, life:0.8, t:0.8, col:(SCHOOLS[gg.school]||SCHOOLS.none).c });
    sfx('kill');
  }
  P.hp -= dmg;
  P.hitT = 0.34;
  shake(4);
  if (P.hp <= 0){ P.hp = 0; downHero(); }
}

function downHero(){
  P.dead = true;
  S.downT = DOWN_TIME;
  S.downs++;
  S.karma += FATE.downKarma;      // 고난이 기연의 씨앗이 된다 (장무기 공식)
  if (S.karma >= karmaNeed()) S.fatePending = 1;
  S.kills = Math.max(0, Math.floor(S.kills * 0.5));
  sfx('down');
  toast('쓰러졌다 · 운기조식');
}

function reviveHero(){
  P.dead = false;
  P.hp = P.hpMax;
  P.x = 0; P.y = 0;
  P.anim = 'idle'; P.af = 0;
  S.foes.length = 0;
  S.fx.length = 0;
}

let shakeV = 0;
function shake(v){ shakeV = Math.max(shakeV, v); }
// 미세 경직(hitstop, v2.61) — 치명타 순간 세상을 잠깐 멈춘다. 70-main의 loop만 읽어
// step 호출을 건너뛰고 render는 계속한다. sim.js는 step을 직접 밟으므로 영향 없음.
let hitstopT = 0;
function hitstop(s){ hitstopT = Math.min(FXD.hitstop.max, Math.max(hitstopT, s)); }

/* ── 초식 (자동 시전) ──────────────────────────────
   쿨다운이 차고 조건이 맞으면 알아서 펼친다. 그림 없이 절차 이펙트.
   발동 모드(자동/반자동/수동)는 나중에 이 위에 얹는다. */
function stepArts(dt){
  if (P.castGapT > 0) P.castGapT -= dt;
  for (const a of ARTS.list){
    if (a.type !== 'active' || !S.arts[a.k]) continue;
    if (a.ref){                                    // 반격형(건곤이형) — 쿨만 돌고 피격 때 발동
      if (P.artCd[a.k] === undefined) P.artCd[a.k] = 0;
      if (P.artCd[a.k] > 0) P.artCd[a.k] -= dt;
      continue;
    }
    if (P.artCd[a.k] === undefined) P.artCd[a.k] = a.cd * 0.5;   // 첫 시전은 반 쿨
    if (P.artCd[a.k] > 0){ P.artCd[a.k] -= dt; continue; }
    // 수동 모드 — 쿨은 돌지만 알아서 펼치지 않는다. 스킬창을 눌러 시전한다.
    if (S.skillManual) continue;
    // 동시 시전 금지 — 시전 중이거나 숨 고르는 중이면 쿨이 차 있어도 기다린다
    if (P.castT > 0 || P.castGapT > 0) continue;
    if (castArt(a)){
      P.artCd[a.k] = a.cd * (1 - tBonus('cdr')/100) * (1 - traitCdcut(a.k));   // 트리 재사용 + 심화 쿨감
      P.castGapT = P.castT + CASTQ.gap;        // 동작이 끝난 뒤 gap 만큼 쉬고 다음 초식
      S.artXp[a.k] = (S.artXp[a.k] | 0) + 1;   // 초식 숙련 — 시전 횟수
    }
  }
}

// 수동 시전 — 스킬창을 눌렀을 때. 조건(쿨·동시시전·대상)이 맞으면 펼친다.
// 발동 모드는 여기 하나로 모은다: 자동은 stepArts, 수동은 이 함수.
function castByHand(k){
  const a = ARTS.list.find(x => x.k === k);
  if (!a || a.type !== 'active' || a.ref || !S.arts[k]) return false;   // 반격형은 피격 발동
  if ((P.artCd[k] || 0) > 0) return false;                             // 쿨 중
  if (P.castT > 0 || P.castGapT > 0) return false;                     // 동시 시전 금지
  if (!castArt(a)) return false;                                        // 대상이 없으면 아낀다
  P.artCd[k] = a.cd * (1 - tBonus('cdr')/100) * (1 - traitCdcut(k));
  P.castGapT = P.castT + CASTQ.gap;
  S.artXp[k] = (S.artXp[k] | 0) + 1;
  return true;
}

// 시전 동작 진입 — 초식별 스트립 길이만큼 (프레임 수 / castFps)
function beginCast(k){
  const c = HFX.cast[k];
  if (!c) return;
  P.castK = k; P.castT = castN(k) / HFX.castFps / (1 + tBonus('castSpd')/100); P.anim = 'cast'; P.af = 0;
}
// 시전 성공 여부를 돌려준다 — 대상이 없으면 쿨을 아낀다
function castArt(a){
  // 활인기공 — 위태로울 때만
  if (a.heal){
    if (P.hp > P.hpMax * a.below) return false;
    beginCast(a.k);
    P.hp = Math.min(P.hpMax, P.hp + P.hpMax * a.heal * artEff(a.k) * traitMul(a.k, 'power'));
    fxPush({ k:'heal', x:P.x, y:P.y, life:0.7, t:0.7 });
    fxPush({ k:'artname', x:P.x, y:P.y - HERO.h - 10, v:a.n, life:0.8, t:0.8, col:(SCHOOLS[a.school]||SCHOOLS.none).c });
    sfx('kill');
    return true;
  }
  const alive = S.foes.filter(f => !f.dead);
  if (!alive.length) return false;
  const rng = a.range * traitMul(a.k, 'reach');                                 // 심화 사거리
  const dmg = heroDmg() * a.mul * artEff(a.k) * (1 + tBonus('artPower')/100)
            * traitMul(a.k, 'power');                                           // 숙련 성·트리 초식위력·심화 위력
  const hits = [];
  if (a.k === 'pagong' || a.k === 'baekbo'){
    // 단일 강타 — 파공권은 가장 가까운, 백보신권은 가장 먼 적
    let best = null, bd = a.k === 'pagong' ? 1e9 : -1;
    for (const f of alive){
      const d = dist(f.x, f.y, P.x, P.y);
      if (d > rng) continue;
      if (a.k === 'pagong' ? d < bd : d > bd){ bd = d; best = f; }
    }
    if (!best) return false;
    hits.push(best);
    // 시전 동작 + 탄 — 파공권은 권기 주먹, 암향지는 지풍 빔이 날아간다
    beginCast(a.k);
    P.dir = best.x >= P.x ? 1 : -1;
    fxPush({ k: a.k === 'pagong' ? 'pashot' : 'bshot',
                x:P.x, y:P.y - HERO.h*0.55,
                tx:best.x, ty:best.y - (foeM(best).bh||foeM(best).h)*0.5,
                life:HFX.shotT + HFX.fadeT, t:HFX.shotT + HFX.fadeT });
  } else {
    // 광역 — 선풍퇴·붕산장
    for (const f of alive) if (dist(f.x, f.y, P.x, P.y) <= rng) hits.push(f);
    if (!hits.length) return false;
    beginCast(a.k);
    const gc = (HFX.glow[a.k]||{}).c;
    fxPush({ k:'ring', x:P.x, y:P.y, r:rng, c:gc, life:0.4, t:0.4 });
    // 광역 초식 파열 (v2.31) — 무공 색 섬광·속도선이 함께 터진다
    fxBlast(P.x, P.y - HERO.h*0.4, rng*0.55, gc, true);
    shake(a.k === 'bungsan' ? 10 : 4);
  }
  for (const f of hits){
    hurtFoe(f, dmg);
    if (a.kb && !f.boss){
      const d = dist(f.x, f.y, P.x, P.y) || 1;
      f.kx = (f.x-P.x)/d; f.ky = (f.y-P.y)/d; f.kb = 0.4;
    }
  }
  fxPush({ k:'artname', x:P.x, y:P.y - HERO.h - 10, v:a.n, life:0.8, t:0.8, col:(SCHOOLS[a.school]||SCHOOLS.none).c });
  sfx('punch');
  return true;
}
