/* ── 매 프레임 갱신 ───────────────────────────────── */
function step(dt){
  S.t += dt;

  // 진입 연출 중엔 전투를 멈춘다
  if (S.intro > 0){
    S.intro -= dt;
    if (P.anim !== 'idle'){ P.anim='idle'; P.af=0; }
    P.af += dt * ANIM.idle[1];
    return;
  }

  if (shakeV > 0) shakeV = Math.max(0, shakeV - dt*22);

  // 이펙트
  for (let i=S.fx.length-1; i>=0; i--){
    S.fx[i].life -= dt;
    if (S.fx[i].life <= 0) S.fx.splice(i,1);
  }

  // 운기조식 — 여기서도 애니메이션은 계속 돈다
  if (S.downT > 0){
    S.downT -= dt;
    if (P.anim !== 'medit'){ P.anim = 'medit'; P.af = 0; }
    P.af += dt * ANIM.medit[1];
    for (const f of S.foes){                 // 적은 물러난다
      const d = dist(f.x,f.y,P.x,P.y) || 1;
      f.x += (f.x-P.x)/d * 120 * dt;
      f.y += (f.y-P.y)/d * 120 * dt;
    }
    S.camX += (P.x - S.camX) * Math.min(1, dt*7);
    S.camY += (P.y - 24 - S.camY) * Math.min(1, dt*7);
    if (S.downT <= 0) reviveHero();
    return;
  }

  // 스폰
  const st = stage();
  if (isBoss()){
    // 등장 연출 — 끝나면 보스가 선다
    if (S.summonT > 0){
      S.summonT -= dt;
      // 연출 중 주인공은 그 자리에 선다 (사라지지 않는다)
      if (P.anim !== 'idle'){ P.anim = 'idle'; P.af = 0; }
      P.af += dt * ANIM.idle[1];
      P.hp = Math.min(P.hpMax, P.hp + heroRegen() * dt);
      if (S.summonT <= 0) spawnBoss();
      S.camX += (P.x - S.camX) * Math.min(1, dt*6);
      S.camY += (P.y - 24 - S.camY) * Math.min(1, dt*6);
      return;                       // 등장이 끝날 때까지 전투 없음
    }
    if (!S.bossAlive && !S.foes.some(f=>f.boss)){
      if (S.intro > 0) return;      // 진입 연출이 끝나야 소환한다
      beginSummon();
      return;
    }
    // 보스 곁의 호위는 조금씩 채워진다
    const minions = S.foes.filter(f=>!f.dead && !f.boss).length;
    if (minions < BOSS.guard && Math.random() < dt*0.9) spawnFoe();
  } else if (S.foes.filter(f=>!f.dead).length < st.max && Math.random() < dt*2.4){
    spawnFoe();
  }

  // 주인공 이동 — 가장 가까운 적 쪽으로
  let tgt=null, td=1e9;
  for (const f of S.foes){
    if (f.dead) continue;
    // 세로를 눌러 재야 아래쪽 적도 제대로 노린다
    const d = Math.hypot(f.x-P.x, (f.y-P.y)/HERO.atkFlat);
    if (d < td){ td=d; tgt=f; }
  }
  let moving = false;
  // 원거리 적은 물러나므로 더 깊이 파고든다
  const closeIn = (tgt && foeM(tgt).ranged) ? 0.42 : 0.72;
  // 제패 연출 중엔 쫓지도 치지도 않는다 — 사방으로 밀려나는 적을 번갈아
  // 조준하면 방향이 매 프레임 뒤집혀 파닥거린다 ("이쪽 저쪽 바라봄")
  if (S.sweepT <= 0 && P.atkT <= 0 && tgt && td > HERO.atkRange*closeIn){
    const a = Math.atan2(tgt.y-P.y, tgt.x-P.x);
    P.x += Math.cos(a) * heroSpd() * dt;
    P.y += Math.sin(a) * heroSpd() * dt;
    P.dir = Math.cos(a) >= 0 ? 1 : -1;
    moving = true;
  }

  // 공격 — 제패 연출 중엔 새 공격을 안 시작한다 (방향 파닥임 방지)
  if (P.atkCd > 0) P.atkCd -= dt;
  if (P.atkT > 0){ P.atkT -= dt; heroHitCheck(); }
  else if (S.sweepT <= 0 && P.atkCd <= 0 && tgt && td <= HERO.atkRange + HERO.atkReach) heroAttack();

  // 초식 — 제패 연출 중엔 아낀다
  if (S.sweepT <= 0) stepArts(dt);

  // 팝업 자동 진행 — sim 등 부분 조립 도구엔 64·65가 없어 가드가 필요하다
  if (typeof stepFate === 'function') stepFate(dt);
  if (typeof stepOffline === 'function') stepOffline(dt);

  if (P.hitT > 0) P.hitT -= dt;

  // 동작 결정
  // 공격 동작은 끊지 않는다. 피격은 깜빡임으로만 알린다.
  // 시전(cast)은 초식을 펼치는 짧은 동작 — 공격보다도 우선이다.
  if (P.castT > 0) P.castT -= dt;
  const na = P.castT > 0 ? 'cast'
           : P.atkT > 0 ? 'atk' : (P.hitT > 0 ? 'hit' : (moving ? 'run' : 'idle'));
  if (na !== P.anim){ P.anim = na; P.af = 0; }
  P.af += dt * (P.anim === 'cast' ? HFX.castFps
              : ANIM[P.anim][1] * (P.anim === 'atk' ? heroAtkSpd() : 1));

  // 회복 — 최대 체력은 단계에 따라 오른다
  P.hpMax = heroHpMax();
  P.hp = Math.min(P.hpMax, P.hp + heroRegen() * dt);

  // 적
  for (let i=S.foes.length-1; i>=0; i--){
    const f = S.foes[i];
    if (f.hit > 0) f.hit -= dt;
    // 넉백
    if (f.kb > 0 && !f.boss){
      f.kb -= dt;
      f.x += f.kx * 90 * dt;
      f.y += f.ky * 90 * dt;
    }
    if (f.dead){
      f.dying -= dt;
      if (f.anim !== 'death'){ f.anim='death'; f.af=0; }
      f.af += dt * foeM(f).fps.death;
      if (f.dying <= 0) S.foes.splice(i,1);
      continue;
    }
    // 동작 결정 — 공격 중엔 피격으로 끊지 않는다
    const M = foeM(f);
    const na = f.dhT>0 ? 'dash'
             : (f.skT>0 ? 'skill' : (f.atkT>0 ? 'atk' : (f.hit>0 ? 'hit' : 'walk')));
    if (na !== f.anim){ f.anim = na; f.af = 0; }
    f.af += dt * M.fps[f.anim];
    const d = dist(f.x,f.y,P.x,P.y) || 1;
    f.dir = P.x >= f.x ? 1 : -1;

    // 문에서 걸어 나오는 중 — 아직 싸우지 않는다
    if (f.rise > 0){
      f.rise -= dt;
      f.anim = 'idle';
      f.af += dt * foeM(f).fps.idle;
      S.camX += (P.x - S.camX) * Math.min(1, dt*6);
      S.camY += (P.y - 24 - S.camY) * Math.min(1, dt*6);
      continue;
    }
    // 보스 스킬 — 넓은 범위를 한 번에 친다
    if (f.boss){
      if (f.skT > 0){
        f.skT -= dt;
        const prog = 1 - f.skT/BOSSKILL.dur;
        if (!f.skDone && prog >= BOSSKILL.hitAt){
          f.skDone = true;
          if (M.shotImg){
            // 탄 보스(원혼) — 범위 폭발 대신 해골 귀화를 날린다
            shootFoe(f); sfx('kill');
          } else {
            if (dist(f.x,f.y,P.x,P.y) < BOSSKILL.range){
              hurtHero(bossDmg() * BOSSKILL.dmg);
            }
            S.fx.push({ k:'shock', x:f.x, y:f.y - FOE.h*0.3, life:0.45, t:0.45 });
            shake(9); sfx('down');
          }
        }
        if (f.skT <= 0) f.skCd = BOSSKILL.cd;
        S.camX += (P.x - S.camX) * Math.min(1, dt*6);
        S.camY += (P.y - 24 - S.camY) * Math.min(1, dt*6);
        continue;
      }
      if (f.skCd > 0) f.skCd -= dt;
      else if (f.atkT <= 0 && (M.shotImg || d < BOSSKILL.range)){   // 탄 보스는 거리 불문
        f.skT = BOSSKILL.dur; f.skDone = false;
        f.anim = 'skill'; f.af = 0;
        continue;
      }
    }
    // 돌격 — 수호무사가 중거리에서 찌르기 자세로 미끄러져 들어온다 (사용자 제안)
    if (M.dashCd && !f.boss){
      if (f.dhT > 0){
        f.dhT -= dt;
        const dd = dist(f.x,f.y,P.x,P.y) || 1;
        f.x += (P.x-f.x)/dd * M.dashSpd * dt;
        f.y += (P.y-f.y)/dd * M.dashSpd * dt;
        if (!f.dhDone && dd < (M.range||FOE.range)*0.8){
          f.dhDone = true;
          hurtHero(foeDmg() * M.dmg * (M.dashMul||1.3));
          shake(4); sfx('punch');
          f.dhT = 0;
        }
        if (f.dhT <= 0){ f.dhCd = M.dashCd * rnd(0.8, 1.3); f.cd = FOE.cd; }
        continue;
      }
      if (f.dhCd === undefined) f.dhCd = M.dashCd * rnd(0.4, 0.9);
      if (f.dhCd > 0) f.dhCd -= dt;
      else if (f.atkT <= 0 && !(f.thT > 0) && d > M.dashMin && d < M.dashMax){
        f.dhT = M.dashDur; f.dhDone = false;
        f.anim = 'dash'; f.af = 0;
        continue;
      }
    }
    // 던지기 — 근접형(낭인)이 거리가 뜨면 병을 집어 던진다
    if (M.throwCd && !f.boss){
      if (f.thT > 0){
        f.thT -= dt;
        const prog = 1 - f.thT / M.throwDur;
        if (!f.thDone && prog >= M.throwAt){ f.thDone = true; shootFoe(f); sfx('punch'); }
        f.anim = 'cast';
        f.af += dt * M.fps.cast;
        if (f.thT <= 0) f.thCd = M.throwCd * rnd(0.8, 1.3);
        continue;
      }
      if (f.thCd === undefined) f.thCd = M.throwCd * rnd(0.3, 0.9);
      if (f.thCd > 0) f.thCd -= dt;
      else if (f.atkT <= 0 && d > M.throwMin && d < M.throwMax){
        f.thT = M.throwDur; f.thDone = false;
        f.anim = 'cast'; f.af = 0;
        continue;
      }
    }
    // 원거리 적 — 사거리 안이면 멈춰 서서 쏜다
    if (M.ranged && !f.boss){
      const far = M.range;
      // 마법 — 가끔 큰 구체를 날린다
      if (M.skillCd){
        if (f.skT > 0){
          f.skT -= dt;
          const prog = 1 - f.skT / M.skillDur;
          if (!f.skDone && prog >= M.skillAt){ f.skDone = true; castFoe(f); sfx('kill'); }
          if (f.skT <= 0) f.skCd = M.skillCd;
          f.anim = 'skill';
          f.af += dt * M.fps.skill;
          continue;
        }
        if (f.skCd === undefined) f.skCd = M.skillCd * rnd(0.4, 0.9);
        if (f.skCd > 0) f.skCd -= dt;
        else if (f.atkT <= 0 && d <= far*1.4){
          f.skT = M.skillDur; f.skDone = false;
          f.anim = 'skill'; f.af = 0;
          continue;
        }
      }
      if (f.atkT > 0){
        f.atkT -= dt;
        const prog = 1 - f.atkT / 0.78;
        if (!f.hitDone && prog >= (M.atkAt||0.55)){
          f.hitDone = true;
          // 혀로 때리는 적은 탄을 쏘지 않는다. 그림이 닿는 자리에서 바로 판정한다.
          if (M.lash){
            if (dist(f.x,f.y,P.x,P.y) < M.range + 16) hurtHero(foeDmg()*M.dmg);
          } else shootFoe(f);
          sfx('punch');
        }
        if (f.atkT <= 0) f.cd = FOE.cd * rnd(1.1, 1.7);
      } else if (f.cd > 0){
        f.cd -= dt*1.25;
        // 물러나지 않는다. 멀면 다가갈 뿐이다.
        if (d > far){
          f.x += (P.x-f.x)/d * st.spd * M.spd * dt;
          f.y += (P.y-f.y)/d * st.spd * M.spd * dt;
        }
      } else if (d <= far){
        f.atkT = 0.78; f.hitDone = false;
      } else {
        f.x += (P.x-f.x)/d * st.spd * M.spd * dt;
        f.y += (P.y-f.y)/d * st.spd * M.spd * dt;
      }
      continue;
    }
    // 근접 사거리 — 위험도별로 다르다 (사용자 확정). 보스는 모든 범위
    const rng = f.boss ? BOSS.range : (M.range || FOE.range);
    if (f.atkT > 0){
      f.atkT -= dt;
      const AD = f.boss ? BOSSATK : FOE;
      const prog = 1 - f.atkT / AD.dur;
      if (!f.hitDone && prog >= AD.hitAt){
        f.hitDone = true;
        if (d < rng + (f.boss?26:16)) hurtHero(f.boss ? bossDmg() : foeDmg()*foeM(f).dmg);
      }
      if (f.atkT <= 0) f.cd = FOE.cd * rnd(0.8, 1.3);
    } else if (f.cd > 0){
      f.cd -= dt;
      if (d > rng){                          // 접근
        const sp = st.spd * (f.boss ? BOSS.spd : foeM(f).spd);
        f.x += (P.x-f.x)/d * sp * dt;
        f.y += (P.y-f.y)/d * sp * dt;
      }
    } else if (d <= rng){
      f.atkT = (f.boss ? BOSSATK.dur : FOE.dur); f.hitDone = false;
    } else {
      const sp = st.spd * (f.boss ? BOSS.spd : foeM(f).spd);
      f.x += (P.x-f.x)/d * sp * dt;
      f.y += (P.y-f.y)/d * sp * dt;
    }

    // 적끼리 밀어내기 — 겹쳐 뭉치는 것 방지
    for (const o of S.foes){
      if (o===f || o.dead) continue;
      const dx=f.x-o.x, dy=f.y-o.y, dd=Math.hypot(dx,dy);
      if (dd > 0.1 && dd < 26){
        f.x += dx/dd * (26-dd) * 0.5 * dt * 8;
        f.y += dy/dd * (26-dd) * 0.5 * dt * 8;
      }
    }
  }

  // 원거리 탄 — 보스 단계 분기(아래 return)보다 먼저 밟아야 한다.
  // 안 그러면 보스의 탄(원혼 귀화·백호 숨결)이 허공에 얼어붙는다 (v2.17에서 발견)
  for (let i = S.shots.length-1; i >= 0; i--){
    const b = S.shots[i];
    b.t += dt;
    b.life -= dt;
    b.x += b.vx * b.spd * dt;
    b.y += b.vy * b.spd * dt;
    if (dist(b.x, b.y, P.x, P.y - HERO.h*0.4) < (b.big ? b.r : 16)){
      hurtHero(b.dmg);
      if (b.big){ shake(7); S.fx.push({ k:'burst', x:b.x, y:b.y, life:0.35, t:0.35 }); }
      if (b.dust) S.fx.push({ k:'imgburst', im:b.dust, x:b.x, y:b.y, life:0.4, t:0.4 });
      if (b.fly){ shake(5); S.fx.push({ k:'burst', x:b.x, y:b.y, life:0.35, t:0.35 }); }   // 귀화 폭발
      S.shots.splice(i,1);
      continue;
    }
    if (b.life <= 0) S.shots.splice(i,1);
  }

  // 보스 단계 클리어 — 보스를 잡으면 다음 구역
  if (isBoss()){
    if (S.bossAlive && !S.foes.some(f=>f.boss)){
      S.bossAlive = false;
      S.kills = 0; S.foes.length = 0;
      if (S.zi + 1 < ZONES.length){
        if (S.unlocked < S.zi + 2) S.unlocked = S.zi + 2;
        S.zi++; S.stage = 1;
      } else {
        S.stage = 1;                   // 마지막 구역은 처음부터
      }
      S.best = Math.max(S.best, lv());
      enterStage();
    }
    // 카메라만 갱신하고 아래 일반 클리어 판정은 건너뛴다
    S.camX += (P.x - S.camX) * Math.min(1, dt*6);
    S.camY += (P.y - 24 - S.camY) * Math.min(1, dt*6);
    return;
  }

  // 제패 연출 — 기운을 모았다가 터뜨린다
  if (S.sweepT > 0){
    const TOT = SWEEP.charge + SWEEP.blast + SWEEP.hold;
    S.sweepT -= dt;
    const el = TOT - S.sweepT;
    if (!S.sweepDone && el >= SWEEP.charge){
      S.sweepDone = true;
      shake(13); sfx('down');
    }
    // 파동이 닿는 순간 쓰러진다 — 가까운 적부터 차례로
    if (S.sweepDone){
      const k = clamp((el - SWEEP.charge) / SWEEP.blast, 0, 1);
      const front = SWEEP.range * (1 - Math.pow(1-k, 2.2));   // 파동 앞머리
      for (const f of S.foes){
        if (f.dead) continue;
        if (dist(f.x, f.y, P.x, P.y) > front) continue;
        f.dead = true; f.dying = 0.55;
        const d = dist(f.x, f.y, P.x, P.y) || 1;
        f.kx = (f.x-P.x)/d; f.ky = (f.y-P.y)/d; f.kb = 0.55;
        f.sweep = 1;
        S.fx.push({ k:'burst', x:f.x, y:f.y - (foeM(f).bh||foeM(f).h)*0.4, life:0.3, t:0.3 });
        sfx('kill');
      }
    }
    // 밀려나는 적 갱신
    for (let i = S.foes.length-1; i >= 0; i--){
      const f = S.foes[i];
      if (f.dead) f.dying -= dt;
      if (f.sweep && f.kb > 0){
        f.kb -= dt;
        f.x += f.kx * SWEEP.kb * dt;
        f.y += f.ky * SWEEP.kb * dt;
      }
      if (f.dead && f.dying <= 0) S.foes.splice(i,1);
    }
    for (let i=S.fx.length-1; i>=0; i--){
      S.fx[i].life -= dt;
      if (S.fx[i].life <= 0) S.fx.splice(i,1);
    }
    if (P.anim !== 'atk'){ P.anim = 'atk'; P.af = 0; }
    P.af += dt * ANIM.atk[1];
    S.camX += (P.x - S.camX) * Math.min(1, dt*6);
    S.camY += (P.y - 24 - S.camY) * Math.min(1, dt*6);
    if (S.sweepT <= 0) advanceStage();
    return;
  }

  // 단계 클리어 — 제패 연출을 먼저 띄운다
  if (S.kills >= stageNeed()){
    S.sweepT = SWEEP.charge + SWEEP.blast + SWEEP.hold;
    S.sweepDone = false;
    return;
  }

  // 카메라 — 보스전에서는 보스가 화면에 들어오게 살짝 당긴다
  let tx = P.x, ty = P.y - 24;
  if (isBoss()){
    const b = S.foes.find(f => f.boss && !f.dead);
    if (b){ tx = (P.x*2 + b.x) / 3; ty = (P.y*2 + b.y) / 3 - 24; }
  }
  S.camX += (tx - S.camX) * Math.min(1, dt*6);
  S.camY += (ty - S.camY) * Math.min(1, dt*6);
}


// 다음 단계로
function advanceStage(){
  S.kills = 0;
  S.foes.length = 0;      // 파동을 벗어난 적도 여기서 사라진다
  S.shots.length = 0;
  S.stage++;
  S.best = Math.max(S.best, lv());
  enterStage();
}
