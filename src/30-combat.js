/* ── 적 ───────────────────────────────────────────── */
function spawnFoe(){
  const a = rnd(0, Math.PI*2), r = rnd(190, 300);
  const list = ZONEFOE[zone().k] || ['bandit'];
  const k = list[Math.floor(Math.random()*list.length)];
  const M = FOES[k];
  S.foes.push({
    k, anim:'idle', af:0,
    x: P.x + Math.cos(a)*r,
    y: P.y + Math.sin(a)*r,
    hp: Math.round(foeHp()*M.hp), hpMax: Math.round(foeHp()*M.hp),
    boss: false,
    dir: -1,
    af: rnd(0,4),
    dead: false, dying: 0,
    hit: 0,
    atkT: 0, cd: rnd(0.4, 1.6), hitDone: false,
  });
}

// 보스 — 화면 위쪽에서 등장한다
// 문이 열리고 기운이 모인다. 끝나면 보스가 선다.
function beginSummon(){
  S.summonT = SUMMON.dur;
  S.summonX = P.x;
  S.summonY = P.y - 118;      // 주인공 위쪽, 화면 가운데 근처
  S.gateY   = S.summonY - 46;
  S.foes.length = 0;               // 잡몹은 물러난다
  sfx('down');
}

function spawnBoss(){
  const hp = bossHp();
  S.foes.push({
    k: ZONEBOSS[zone().k] || (ZONEFOE[zone().k]||['bandit'])[0],
    boss: true,
    anim:'idle', af:0,
    x: S.summonX || P.x, y: S.summonY || (P.y - 118),
    rise: SUMMON.rise,               // >0 이면 문에서 걸어 나오는 중
    hp, hpMax: hp,
    dir: -1,
    dead:false, dying:0, hit:0,
    atkT:0, cd:1.4, hitDone:false,
    skT:0, skCd:BOSSKILL.cd*0.6, skDone:false,
    kb:0, kx:0, ky:0,
  });
  S.bossAlive = true;
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
    dmg: foeDmg() * M.dmg,
    life: 2.6,
    t: 0,
  });
}

const FOE = { range:44, dur:0.55, hitAt:0.55, cd:1.3 };
// 보스는 동작이 길다
const BOSSATK = { dur:0.72, hitAt:0.62 };

/* ── 주인공 공격 (맨손 정권) ───────────────────────── */
function heroAttack(){
  // 가장 가까운 적
  let best=null, bd=1e9;
  for (const f of S.foes){
    if (f.dead) continue;
    const d = dist(P.x,P.y,f.x,f.y);
    if (d < bd){ bd=d; best=f; }
  }
  if (!best || bd > HERO.atkRange + HERO.atkReach) return false;
  P.dir = best.x >= P.x ? 1 : -1;
  P.atkT = ANIM.atk[0] / ANIM.atk[1];   // 0.5초
  P.atkCd = HERO.atkCd;
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
  let n = 0;
  for (const f of S.foes){
    if (f.dead) continue;
    // 세로는 눌러서 잰다 — 바닥이 기울어 보이는 시점이라 위아래가 가깝게 느껴진다
    const dx = f.x - cx, dy = (f.y - cy) / HERO.atkFlat;   // 나누면 세로가 넓어진다
    if (Math.hypot(dx, dy) < HERO.atkRange){
      // 치명타 — 급소를 때리면 배수 피해, 노란 숫자로 알린다
      const crit = Math.random() < critCh();
      hurtFoe(f, heroDmg() * (crit ? TRAIN.critMul : 1), crit);
      n++;
    }
  }
  if (n) {
    shake(2.2); sfx('punch');
  }
}

function hurtFoe(f, dmg, crit){
  f.hp -= dmg;
  f.hit = 0.26;
  if (crit) S.fx.push({ k:'crit', x:f.x, y:f.y - (foeM(f).bh||foeM(f).h),
                        v:Math.round(dmg), life:0.55, t:0.55 });
  // 맞은 방향으로 살짝 밀린다
  const d = dist(P.x,P.y,f.x,f.y) || 1;
  f.kx = (f.x-P.x)/d; f.ky = (f.y-P.y)/d; f.kb = 0.09;
  if (f.hp <= 0 && !f.dead){
    f.dead = true; f.dying = 0.22;
    S.kills++; S.totalKills++;
    // 수련치 — 강한 구역일수록 크게. 경지가 오르면 알린다
    const k0 = realmLv();
    S.rexp += zone().mul * (f.boss ? REALM.bossExp : REALM.killExp);
    if (realmLv() > k0){
      toast(realmInfo().name + '에 올랐다');
      S.fx.push({ k:'burst', x:P.x, y:P.y - HERO.h*0.5, life:0.5, t:0.5 });
      shake(6); sfx('down');
    }
    // 은자 드랍 — 보스는 크게, 구역 첫 격파면 보너스까지
    let sv = killSilver() * (f.boss ? SILVER.bossKill : 1);
    if (f.boss && !S.bossDone[S.zi]){
      S.bossDone[S.zi] = 1;
      const bonus = Math.round(SILVER.first * zone().mul);
      sv += bonus;
      toast(zone().boss + ' 첫 격파 · 은자 +' + bonus.toLocaleString());
    }
    S.silver += sv;
    S.fx.push({ k:'burst', x:f.x, y:f.y - (foeM(f).bh||foeM(f).h)*0.4, life:0.3, t:0.3 });
    sfx('kill');
  }
}

function hurtHero(dmg){
  if (P.dead) return;
  P.hp -= dmg;
  P.hitT = 0.34;
  shake(4);
  if (P.hp <= 0){ P.hp = 0; downHero(); }
}

function downHero(){
  P.dead = true;
  S.downT = DOWN_TIME;
  S.downs++;
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
