/* ── 그리기 ───────────────────────────────────────── */
function drawGround(ox, oy){
  ctx.fillStyle = zone().ground;
  ctx.fillRect(0, 0, VW, VH);
  // 옅은 격자로 이동감만 준다
  ctx.strokeStyle = 'rgba(0,0,0,.055)'; ctx.lineWidth = 1;
  const T = 32;
  const sx = -((ox % T) + T) % T, sy = -((oy % T) + T) % T;
  ctx.beginPath();
  for (let x = sx; x < VW; x += T){ ctx.moveTo(x+0.5, 0); ctx.lineTo(x+0.5, VH); }
  for (let y = sy; y < VH; y += T){ ctx.moveTo(0, y+0.5); ctx.lineTo(VW, y+0.5); }
  ctx.stroke();
}

function shadow(x, y, w){
  ctx.save();
  ctx.globalAlpha = 0.26; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y, w*0.34, w*0.13, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// 무공 색 빛무리 — 동심원 3겹, 가산 합성. 그라디언트 없이 픽셀풍으로.
function glowBall(x, y, g, r, alpha){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgb(' + g.c + ')';
  for (let i = 3; i >= 1; i--){
    ctx.globalAlpha = alpha / (i * 1.4);
    ctx.beginPath();
    ctx.arc(x, y, r * (0.35 + 0.3 * i), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
// 시전 중 손끝(또는 발밑) 발광 — 작은 스프라이트 점이 안 보인다는 피드백
function drawCastGlow(ox, oy){
  const g = HFX.glow[P.castK];
  if (!g || P.anim !== 'cast') return;
  const pul = 0.8 + 0.2 * Math.sin(S.t * 16);
  glowBall(Math.round(P.x + P.dir * g.dx - ox), Math.round(P.y - g.dy - oy),
           g, g.r * pul, 0.5);
}

function drawHero(ox, oy){
  const x = Math.round(P.x - ox), y = Math.round(P.y - oy);
  shadow(x, y, HERO.w);
  let [n] = ANIM[P.anim];
  // 절정부터 정권에 권기가 붙는다 — 같은 동작, 다른 그림.
  // 시전(cast)은 초식마다 스트립·프레임 수가 다르다.
  let key = P.anim, fw = HERO.w;
  // 정권은 전 경지에서 오른손·왼손을 공격마다 교대한다 (v2.31 — 절정 미만도
  // "주먹 한 개"로 보인다는 피드백. 맨손 판은 권기 스트립에서 권기만 걷어냈다).
  // 절정부터는 권기가 실린 판(katka·katkb)으로 바뀐다 — 같은 동작, 다른 그림.
  if (P.anim === 'atk'){
    const qi = realmLv() >= HFX.katkRealm;
    key = P.atkAlt ? (qi ? 'katkb' : 'atkb') : (qi ? 'katka' : 'atka');
    fw = HFX.aw.katk;
  }
  else if (P.anim === 'cast'){
    const ck = HFX.cast[P.castK] || HFX.cast.pagong;
    key = ck[0]; fw = ck[1]; n = castN(P.castK);   // 성이 낮으면 컷을 덜어낸 판
  }
  else if (HFX.aw[key]) fw = HFX.aw[key];
  const im = IMG['hero_' + key];
  let fi = Math.floor(P.af);
  fi = (P.anim === 'atk' || P.anim === 'hit' || P.anim === 'cast')
       ? Math.min(fi, n-1) : (fi % n);
  if (P.anim === 'cast') fi = castFrame(P.castK, fi);       // 성긴 판 → 원본 칸 번호
  ctx.save();
  ctx.translate(x, y);
  if (P.dir < 0) ctx.scale(-1, 1);
  // 경지 기운 — 서 있거나 걸을 때 몸 뒤에 은은히 돈다. 색이 경지를 말해준다
  // (사냥 중엔 거의 늘 걷고 있어서 idle 한정이면 보이지 않는다)
  if (P.anim === 'idle' || P.anim === 'run'){
    const ak = auraKey();
    if (ak && IMG[ak]){
      const aw = HFX.aw.aidle, af = Math.floor(S.t * 4) % 4;
      ctx.globalAlpha = 0.85;
      draw(IMG[ak], af*aw, 0, aw, HERO.h, -Math.round(aw/2), -HERO.h, aw, HERO.h);
      ctx.globalAlpha = 1;
    }
  }
  const hurt = P.hitT > 0;
  if (hurt) ctx.globalAlpha = 0.62 + Math.sin(S.t*46)*0.22;
  draw(im, fi*fw, 0, fw, HERO.h, -Math.round(fw/2), -HERO.h, fw, HERO.h);
  // 주먹 끝 흰 점(FIST)은 v2.31에서 은퇴 — 옛 35px 스트립 전용 좌표였고,
  // 지금 쓰는 양손 판(atka·atkb·katka·katkb)은 주먹이 그림에 다 있다.
  if (hurt){                       // 붉게 번쩍여 맞은 것을 알린다
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.5, P.hitT*2.4);
    draw(im, fi*fw, 0, fw, HERO.h, -Math.round(fw/2), -HERO.h, fw, HERO.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // 체력바 — 다치면 머리 위에 뜬다. 적(빨강)과 구분되게 초록.
  if (!P.dead && P.hp < P.hpMax - 0.5){
    const w = 30, h = 3;
    const by = y - HERO.h - 6;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x-w/2, by, w, h);
    ctx.fillStyle = '#63b06a';
    ctx.fillRect(x-w/2, by, w*(P.hp/P.hpMax), h);
  }
  // 운기조식 — 기운 방울은 몸 위에 얹는다
  if (P.anim === 'medit') drawQi(x, y);
}

function drawFoe(f, ox, oy){
  const M = foeM(f);
  // 문에서 걸어 나오는 중이면 아래부터 드러난다
  const rise = f.rise > 0 ? clamp(1 - f.rise/SUMMON.rise, 0, 1) : 1;
  const sc = (f.boss && !ZONEBOSS[zone().k]) ? BOSS.scale : 1;
  const x = Math.round(f.x - ox), y = Math.round(f.y - oy);
  // 개구리처럼 캔버스가 몸보다 넓은 적은 실제 몸 폭 sw 를 쓴다
  const BW = M.sw || M.w;
  if (!f.boss) shadow(x, y, BW * sc);     // 보스는 그림자 대신 오라를 쓴다
  ctx.save();
  ctx.translate(x, y);
  if (f.dir < 0) ctx.scale(-1, 1);
  if (f.dead) ctx.globalAlpha = Math.max(0, f.dying/0.22);
  // 공격 중엔 앞으로 기운다
  let dw = Math.round(M.w*sc), dh = Math.round(M.h*sc), off = 0;
  if (f.atkT > 0){
    const k = 1 - Math.abs(1 - (1 - f.atkT/FOE.dur)/FOE.hitAt);
    dw = Math.round(M.w*sc*(1+0.10*k)); dh = Math.round(M.h*sc*(1+0.06*k));
    off = Math.round(BW*sc*0.14*k);
  }
  const seq = M.anim[f.anim] || M.anim.idle;
  let fi = Math.floor(f.af);
  fi = (f.anim==='atk' || f.anim==='death') ? Math.min(fi, seq.length-1) : (fi % seq.length);
  const im = IMG[f.k + '_' + seq[fi]];
  if (rise < 1){
    // 아래 절반부터 서서히 드러난다
    ctx.save();
    ctx.beginPath();
    ctx.rect(-dw, -dh*rise, dw*2, dh*rise + 4);
    ctx.clip();
    ctx.globalAlpha = 0.35 + rise*0.65;
    draw(im, -Math.round(dw/2)+off, -dh, dw, dh);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }
  // 상시 오라 — 발밑에서 시작해 몸을 타고 오른다
  // 상시 오라 — 점을 이어 하나의 면으로 그린다
  if (f.boss && f.rise <= 0){
    drawAura(0, 0, dw, dh);
  }
  draw(im, -Math.round(dw/2)+off, -dh, dw, dh);
  if (f.boss){                     // 보스는 몸에만 붉은 기운이 돈다
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14 + Math.sin(S.t*3.4)*0.06;
    draw(im, -Math.round(dw/2)+off, -dh, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  if (f.hit > 0){
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.45, f.hit*4);
    draw(im, -Math.round(dw/2)+off, -dh, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // 체력바 — 보스는 화면 상단에 따로 그린다
  if (!f.dead && f.hp < f.hpMax && !f.boss){
    const w = 24, h = 3;
    const by = y - (M.bh || M.h) - 6;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x-w/2, by, w, h);
    ctx.fillStyle = '#d2564a';
    ctx.fillRect(x-w/2, by, w*(f.hp/f.hpMax), h);
  }
}

function drawFx(ox, oy){
  for (const e of S.fx){
    const a = e.life / e.t;
    const x = Math.round(e.x - ox), y = Math.round(e.y - oy);
    if (e.k === 'burst'){
      // 파열 — 가산 합성 심광 + 튀는 파편 (v2.31 강화: 단색 점 → 빛이 쌓인다)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cc = e.c || '255,224,160';
      ctx.fillStyle = 'rgb(' + cc + ')';
      for (let i = 3; i >= 1; i--){                  // 중심 섬광 — 커지며 스러진다
        ctx.globalAlpha = a * 0.6 / (i * 1.3);
        ctx.beginPath();
        ctx.arc(x, y, (5 + (1-a)*10) * (0.4 + 0.28*i), 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = a * 0.9;
      const r = 4 + (1-a)*20;
      for (let i=0;i<6;i++){
        const ang = i/6*Math.PI*2 + (e.sd||0);
        ctx.fillRect(x+Math.cos(ang)*r-1, y+Math.sin(ang)*r*0.7-1, 3, 3);
      }
      ctx.restore();
    } else if (e.k === 'wave'){
      // 충격파 고리 — 밝은 심 + 넓은 여운이 빠르게 퍼지다 잦아든다
      const r = e.r * (1 - a*a);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + (e.c || '220,236,255') + ')';
      ctx.globalAlpha = a * 0.8;
      ctx.lineWidth = FXD.wave.w + a * 3;
      ctx.beginPath(); ctx.ellipse(x, y, r, r/HERO.atkFlat, 0, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = a * 0.28;
      ctx.lineWidth = (FXD.wave.w + a*3) * 2.6;
      ctx.beginPath(); ctx.ellipse(x, y, r*0.86, r*0.86/HERO.atkFlat, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    } else if (e.k === 'rays'){
      // 방사 속도선 — 큰 순간의 "번쩍". 바깥으로 쏘아지며 사라진다
      const p = 1 - a;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + (e.c || '236,244,255') + ')';
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = a * 0.85;
      for (let i = 0; i < FXD.rays.n; i++){
        const ang = i/FXD.rays.n*Math.PI*2 + (e.sd||0);
        const r0 = (e.r||20) + p*95, ln = FXD.rays.len * (0.5 + ambHash(i,7)*0.8) * a;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang)*r0,      y + Math.sin(ang)*r0*0.62);
        ctx.lineTo(x + Math.cos(ang)*(r0+ln), y + Math.sin(ang)*(r0+ln)*0.62);
        ctx.stroke();
      }
      ctx.restore();
    } else if (e.k === 'sparks'){
      // 타격 파편 — 포물선으로 튀는 불티. 상태 없이 시간으로 위치를 만든다
      const el = e.t - e.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgb(' + (e.c || '255,220,150') + ')';
      for (let i = 0; i < FXD.spark.n; i++){
        const h1 = ambHash(i, 11 + (e.sd||0)), h2 = ambHash(i, 23 + (e.sd||0));
        const ang = h1 * Math.PI * 2, spd = FXD.spark.spd * (0.4 + h2);
        const px = e.x + Math.cos(ang)*spd*el - ox;
        const py = e.y + Math.sin(ang)*spd*el*0.6 + FXD.spark.g*el*el*0.5 - oy;
        ctx.globalAlpha = a;
        ctx.fillRect(Math.round(px)-1, Math.round(py)-1, 2, 2);
        ctx.globalAlpha = a * 0.3;
        ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else if (e.k === 'flash'){
      // 섬광 — 넓은 가산 원광이 확 밝았다 스러진다 (화면 전체가 살짝 물든다)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgb(' + (e.c || '255,240,220') + ')';
      for (let i = 3; i >= 1; i--){
        ctx.globalAlpha = a * 0.42 / (i * 1.6);
        const rr = e.r * (0.35 + 0.3*i);
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr*0.7, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else if (e.k === 'dmg'){
      // 타격 숫자 — 평타는 조그맣게 희끗, 회심은 크고 노랗게 튄다
      const p = 1 - a;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.6);
      if (e.c){
        ctx.font = '900 ' + (p < 0.15 ? 11 : 9) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1a1206';
        ctx.fillText(e.v, x, y - p*15 + 1);
        ctx.fillStyle = '#ffd95e';
        ctx.fillText(e.v, x, y - p*15);
      } else {
        ctx.font = '800 6.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(10,14,20,.8)';
        ctx.fillText(e.v, x, y - p*10 + 1);
        ctx.fillStyle = 'rgba(232,238,246,.92)';
        ctx.fillText(e.v, x, y - p*10);
      }
      ctx.restore();
    } else if (e.k === 'pashot' || e.k === 'bshot'){
      // 초식 탄 — 권기 주먹(파공권)·지풍 빔(암향지)이 실제로 날아간다
      const pa = e.k === 'pashot';
      const bw = pa ? HFX.shotW : HFX.bshotW, bh = pa ? HFX.shotH : HFX.bshotH;
      const el = e.t - e.life;
      const p = Math.min(1, el / HFX.shotT);
      const sx = e.x + (e.tx - e.x) * p - ox, sy = e.y + (e.ty - e.y) * p - oy;
      // 파공권은 비행 2 + 소멸 2, 지풍은 통짜 1프레임(알파로만 사라진다)
      const fi = !pa ? 0
               : el < HFX.shotT ? (Math.floor(el * 22) % 2)
               : (el - HFX.shotT >= HFX.fadeT * 0.5 ? 3 : 2);
      ctx.save();
      ctx.translate(Math.round(sx), Math.round(sy));
      // 날아가는 방향으로 기운다 — 왼쪽이면 거울 뒤 반전각 (뒤집힘 방지)
      const dx = e.tx - e.x, dy = e.ty - e.y;
      if (dx < 0){ ctx.scale(-1, 1); ctx.rotate(Math.atan2(dy, -dx)); }
      else ctx.rotate(Math.atan2(dy, dx));
      ctx.globalAlpha = el < HFX.shotT ? 1 : Math.min(1, a * 2);
      draw(IMG[e.k], fi*bw, 0, bw, bh, -Math.round(bw/2), -Math.round(bh/2), bw, bh);
      // 무공 색 빛무리 — 파공권은 몸통, 지풍은 촉끝. 어두운 탄이 배경에 묻히지 않게
      const gk = HFX.glow[pa ? 'pagong' : 'baekbo'];
      if (gk) glowBall(pa ? 0 : Math.round(bw * 0.4), 0, gk,
                       bh * 0.5, (el < HFX.shotT ? 1 : a) * 0.55);
      ctx.restore();
    } else if (e.k === 'imgburst'){
      // 그림 파열 — 명중 지점에서 먼지 등이 퍼지며 사라진다
      const im = IMG[e.im];
      if (im && im.complete && im.naturalWidth){
        const sc2 = 0.6 + (1 - a) * 0.7;
        const w = im.naturalWidth * sc2, h2 = im.naturalHeight * sc2;
        ctx.save();
        ctx.globalAlpha = a * 0.9;
        draw(im, Math.round(x - w/2), Math.round(y - h2/2), w, h2);
        ctx.restore();
      }
    } else if (e.k === 'taiji'){
      // 건곤이형 — 태극 원반이 돌다가 힘을 되쏜다
      const fi = Math.min(HFX.taijiN - 1, Math.floor((1 - a) * HFX.taijiN));
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 3);
      draw(IMG.gshield, fi * HFX.taijiW, 0, HFX.taijiW, HFX.taijiH,
           Math.round(e.x - ox - HFX.taijiW/2), Math.round(e.y - oy - HFX.taijiH/2),
           HFX.taijiW, HFX.taijiH);
      ctx.restore();
    } else if (e.k === 'streak'){
      // 기파 — 손에서 적까지 빛줄기가 쏘아진다
      const tx = Math.round(e.tx - ox), ty = Math.round(e.ty - oy);
      const p = 1 - a;                              // 0→1 진행
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#cfe8ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + (tx-x)*Math.max(0, p-0.35), y + (ty-y)*Math.max(0, p-0.35));
      ctx.lineTo(x + (tx-x)*Math.min(1, p*1.6), y + (ty-y)*Math.min(1, p*1.6));
      ctx.stroke();
      ctx.fillStyle = '#f0f8ff';
      ctx.beginPath(); ctx.arc(x + (tx-x)*Math.min(1, p*1.6), y + (ty-y)*Math.min(1, p*1.6), 3, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    } else if (e.k === 'ring'){
      // 기의 고리 — 발밑에서 퍼져 나간다 (탑다운 보정으로 납작하게)
      // v2.31: 가산 합성 + 무공 색 — 빛이 쌓여 훨씬 두텁게 보인다
      const p = 1 - a;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgb(' + (e.c || '216,236,255') + ')';
      ctx.globalAlpha = a * 0.9;
      ctx.lineWidth = 2 + a*2;
      ctx.beginPath();
      ctx.ellipse(x, y, e.r * p, e.r * p / HERO.atkFlat, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.3;
      ctx.lineWidth = (2 + a*2) * 2.4;
      ctx.beginPath();
      ctx.ellipse(x, y, e.r * p * 0.92, e.r * p * 0.92 / HERO.atkFlat, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    } else if (e.k === 'heal'){
      // 활인 — 초록 기운 고리가 몸을 타고 오른다
      const p = 1 - a;
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = '#8fe0a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y - p * HERO.h, 15 * (1-p*0.5), 5, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    } else if (e.k === 'artname'){
      // 초식명 외치기 — 파공권! 외치는 순간 커졌다 잦아든다 (낫표는 뺐다)
      const p = 1 - a;
      const t = e.v + '!';
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.5);
      ctx.font = '900 ' + (p < 0.14 ? 10.5 : 8.5) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0a1420';
      ctx.fillText(t, x + 1, y - p*9 + 1);
      ctx.fillText(t, x - 1, y - p*9 + 1);
      ctx.fillStyle = '#dcefff';
      ctx.fillText(t, x, y - p*9);
      ctx.restore();
    }
  }
}

// 구역 분위기 — 무상태 입자. i번 입자의 좌표를 해시(i)와 시간으로 만든다.
// 저장할 것이 없어 저장·시뮬에 영향이 없고, 화면 좌표라 카메라와 무관히 채워진다.
function ambHash(i, s){ return ((i * 2654435761 + s * 97) % 1000) / 1000; }
function drawAmbient(front){
  const A = AMB[zone().k];
  if (!A) return;
  ctx.save();
  if (!front && A.kind === 'cloud'){
    // 구름 그림자 — 땅 위에 큰 타원이 천천히 흐른다
    for (let i = 0; i < A.n; i++){
      const w = 150 + ambHash(i, 1) * 170;
      const x = ((ambHash(i, 2) * (VW + 400) + S.t * A.spd) % (VW + 400)) - 200;
      const y = ambHash(i, 3) * VH;
      // 두 겹의 옅은 타원 — 가장자리가 부드럽게 읽힌다
      ctx.fillStyle = 'rgba(' + A.c + ',0.07)';
      ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y, w * 0.72, w * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (!front && (A.dark || A.haze)){
    // 가장자리 비네트 — 겹겹이 (동굴은 어둠, 설산은 옅은 한기). 가운데로 시선.
    ctx.fillStyle = A.dark ? 'rgba(6,8,10,' + A.dark + ')'
                           : 'rgba(' + A.haze + ',' + A.hazeA + ')';
    for (let i = 0; i < 3; i++){
      const inset = i * 34;
      ctx.beginPath();
      ctx.rect(-4, -4, VW + 8, VH + 8);
      ctx.ellipse(VW/2, VH/2, VW*0.86 - inset, VH*0.78 - inset, 0, 0, Math.PI*2);
      ctx.fill('evenodd');
    }
  } else if (front && (A.kind === 'leaf' || A.kind === 'snow' || A.kind === 'fire')){
    for (let i = 0; i < A.n; i++){
      const h1 = ambHash(i, 4), h2 = ambHash(i, 5), h3 = ambHash(i, 6);
      if (A.kind === 'snow'){
        const y = (h1 * VH + S.t * A.spd * (0.7 + h2 * 0.6)) % (VH + 8) - 4;
        const x = (h2 * VW + Math.sin(S.t * 1.3 + i) * 14 + S.t * 9) % (VW + 8) - 4;
        ctx.globalAlpha = 0.5 + h3 * 0.4;
        ctx.fillStyle = 'rgb(' + A.c + ')';
        ctx.fillRect(Math.round(x), Math.round(y), h3 > 0.6 ? 2 : 1, h3 > 0.6 ? 2 : 1);
      } else if (A.kind === 'leaf'){
        const x = (h1 * VW + S.t * A.spd * (0.6 + h2)) % (VW + 12) - 6;
        const y = (h2 * VH + Math.sin(S.t * 1.7 + i * 2.1) * 22 + S.t * A.spd * 0.35) % (VH + 12) - 6;
        ctx.globalAlpha = 0.55 + h3 * 0.3;
        ctx.fillStyle = 'rgb(' + A.c + ')';
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      } else {                                   // 반딧불 — 제자리에서 떠다니며 깜빡인다
        const x = h1 * VW + Math.sin(S.t * 0.6 + i * 1.9) * 26;
        const y = h2 * VH + Math.cos(S.t * 0.5 + i * 1.3) * 18;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(S.t * 1.1 + i * 2.7));
        ctx.globalAlpha = 0.5 * tw;
        ctx.fillStyle = 'rgb(' + A.c + ')';
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
        ctx.globalAlpha = 0.16 * tw;
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

function render(){
  const sh = shakeV>0 ? (Math.random()-0.5)*shakeV : 0;
  ctx.setTransform(SC,0,0,SC, Math.round(sh*SC), Math.round(sh*SC));
  const ox = S.camX - VW/2, oy = S.camY - VH/2;
  drawGround(ox, oy);
  drawAmbient(false);                        // 땅 위 층 — 구름 그림자·동굴 어둑함
  // y 순서로 겹침 정리
  const ents = S.foes.map(f=>({y:f.y, f}));
  ents.push({ y:P.y, hero:true });
  ents.sort((a,b)=>a.y-b.y);
  for (const e of ents){
    if (e.hero){ drawHero(ox, oy); drawCastGlow(ox, oy); } else drawFoe(e.f, ox, oy);
  }
  drawShots(ox, oy);
  drawFx(ox, oy);
  drawAmbient(true);                         // 앞층 — 눈·낙엽·반딧불이 인물 위로 흩날린다
  drawSweep(ox, oy);
  drawSummon(ox, oy);
  drawBossBar(ox, oy);
  drawIntro();
}

/* ── 단계 진입 연출 ────────────────────────────────
   배경 3장이 차례로 화면을 채우며 흐른다.
   각 장은 자기 구간에서 나타나 → 머물다 → 사라진다.
*/
function beginIntro(msg, top){
  S.intro = INTRO.dur;
  S.introMsg = msg;
  S.introTop = top || '';
  S.introSfx = [0,0,0];
}

function drawIntro(){
  if (S.intro <= 0) return;
  const W = cv.width, H = cv.height;
  const el = INTRO.dur - S.intro;                 // 흐른 시간
  ctx.setTransform(1,0,0,1,0,0);
  // 끝날 무렵 덮개를 걷어 게임 화면이 서서히 드러나게 한다
  const veil = clamp(S.intro / 0.45, 0, 1);
  ctx.globalAlpha = veil;
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,H);
  ctx.globalAlpha = 1;

  // 3장을 세로로 쌓았을 때의 배치를 미리 잰다
  const im0 = IMG[zone().k + '1'];
  if (!im0 || !im0.complete || !im0.naturalWidth){ drawIntroText(W,H,el); return; }
  const sc = W / im0.naturalWidth;
  const ih = im0.naturalHeight * sc;              // 장당 높이 (셋이 같다)
  const gap = H * INTRO.gap;
  const total = ih*3 + gap*2;
  const top = (H - total) / 2;                    // 화면 세로 가운데

  for (let i=0; i<3; i++){
    const im = IMG[zone().k + (i+1)];
    if (!im || !im.complete || !im.naturalWidth) continue;
    const t0 = i * INTRO.stagger;                 // 이 장이 출발하는 시각
    const k = clamp((el - t0) / INTRO.slide, 0, 1);
    if (k <= 0) continue;
    if (!S.introSfx[i] && k > 0){ S.introSfx[i] = 1; sfx('swoosh'); }
    // 부드럽게 감속하며 제자리로
    const e = 1 - Math.pow(1-k, 3);
    const yTo = top + i*(ih+gap);
    const y = yTo - (1-e) * (ih + gap) * 1.6;     // 위에서 내려온다
    ctx.globalAlpha = Math.min(1, k*1.8) * veil;
    draw(im, 0, y, W, ih);
    ctx.globalAlpha = 1;
  }
  drawIntroText(W, H, el);
}

function drawIntroText(W, H, el){
  const start = INTRO.stagger*2 + INTRO.slide;    // 셋 다 들어온 뒤
  const a = clamp((el - start) / 0.22, 0, 1) * clamp(S.intro/0.45, 0, 1);
  if (a <= 0.01) return;
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // 배경 3장이 놓인 자리를 재서 위아래 여백 가운데에 쓴다
  const im0 = IMG[zone().k + '1'];
  let topY = H*0.118, botY = H*0.881;
  if (im0 && im0.complete && im0.naturalWidth){
    const ih = im0.naturalHeight * (W / im0.naturalWidth);
    const gap = H * INTRO.gap;
    const total = ih*3 + gap*2;
    const top = (H - total) / 2;
    topY = top / 2;                     // 위 여백 가운데
    botY = (top + total + H) / 2;        // 아래 여백 가운데
  }

  // 위 — 구역 이름 (크게)
  if (S.introTop){
    ctx.fillStyle = '#f0e2b8';
    ctx.font = '900 ' + Math.round(H*0.036) + 'px -apple-system,sans-serif';
    ctx.fillText(S.introTop, W/2, topY);
    ctx.strokeStyle = 'rgba(240,226,184,.45)'; ctx.lineWidth = 2;
    const tw = W*0.14;
    ctx.beginPath();
    ctx.moveTo(W/2-tw, topY + H*0.032);
    ctx.lineTo(W/2+tw, topY + H*0.032);
    ctx.stroke();
  }

  // 아래 — 단계 (작게)
  ctx.fillStyle = '#d8cba4';
  ctx.font = '800 ' + Math.round(H*0.026) + 'px -apple-system,sans-serif';
  ctx.fillText(S.introMsg, W/2, botY);
  ctx.globalAlpha = 1;
}



/* ── 보스 체력바 ────────────────────────────────── */
function drawBossBar(ox, oy){
  if (!isBoss()) return;
  const b = S.foes.find(f => f.boss && !f.dead);
  if (!b || b.rise > 0) return;              // 나오는 중엔 감춘다
  const M = foeM(b);
  const x = Math.round(b.x - ox);
  const y = Math.round(b.y - oy) - M.h - 16; // 머리 위
  const w = Math.max(64, M.w * 1.05), h = 6;
  ctx.fillStyle = 'rgba(8,10,14,.85)';
  ctx.fillRect(x - w/2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#3a1c18';
  ctx.fillRect(x - w/2, y, w, h);
  ctx.fillStyle = '#d2564a';
  ctx.fillRect(x - w/2, y, w * Math.max(0, b.hp/b.hpMax), h);
  // 이름 — 크고 또렷하게 (v2.35 "보스 이름이 너무 작다"). 붉은 표제 + 검은 외곽
  ctx.font = '900 12px -apple-system,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const nm = zone().boss, ny = y - 4;
  ctx.fillStyle = 'rgba(6,8,12,.92)';
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) ctx.fillText(nm, x + dx, ny + dy);
  ctx.fillStyle = '#ffd9a0';
  ctx.fillText(nm, x, ny);
}


/* ── 운기조식 기운 ─────────────────────────────────
   바닥에서 피어올라 몸을 타고 흩어진다. 방울마다 시작 시각이 달라
   끊이지 않고 이어진다.
*/
function drawQi(x, y){
  const fade = Math.min(1, S.downT / 0.5);      // 끝날 때 잦아든다
  for (let i = 0; i < QI.n; i++){
    // 방울마다 고유한 위상 — 같은 자리에서 반복되지 않게
    const seed = i * 2.399;
    const t = ((S.t / QI.rise) + i / QI.n) % 1;   // 0 → 1
    const up = t * QI.top;
    // 올라가며 좌우로 흔들린다
    const sway = Math.sin(seed + t * 5.2) * QI.spread * (0.35 + t * 0.65);
    // 위로 갈수록 옅어지고, 막 나올 때도 옅다
    const a = Math.min(t * 4, 1) * (1 - t) * 0.85 * fade;
    if (a <= 0.02) continue;
    const r = QI.r * (1.15 - t * 0.45);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#bfe8ff';
    ctx.beginPath();
    ctx.arc(x + sway, y - 2 - up, r + 0.9, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = '#f2fbff';
    ctx.beginPath();
    ctx.arc(x + sway, y - 2 - up, r * 0.55, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}


/* ── 보스 등장 ─────────────────────────────────────
   문이 서고, 청록 기운이 회오리치며 문 가운데로 빨려든다.
*/
function drawSummon(ox, oy){
  if (S.summonT <= 0) return;
  const el = SUMMON.dur - S.summonT;
  const x = Math.round(S.summonX - ox);
  const y = Math.round(S.summonY - oy);
  const cy = y - 46;
  const ck = clamp(el / SUMMON.swirl, 0, 1);
  const bt = el - SUMMON.swirl;

  // 문 — 검은 기운 위에 아래에서 솟아오른다
  const gk = clamp(el/0.6, 0, 1);
  const ge = 1 - Math.pow(1-gk, 3);
  if (ge > 0.05){
    ctx.globalAlpha = ge;
    drawAura(x, y, 132, 128);      // 문도 같은 기운 안에 선다
    ctx.globalAlpha = 1;
  }
  const g = IMG.fx_gate;
  if (g && g.complete && g.naturalWidth){
    const gw = 92, gh = 88;
    ctx.globalAlpha = ge * 0.94;
    draw(g, x - gw/2, y - gh*ge, gw, gh*ge);
    ctx.globalAlpha = 1;
  }

  // 바닥 소용돌이 — 알갱이들이 이 위를 따라 돈다
  if (ck > 0.05 && bt < 0){
    for (let i = 0; i < 3; i++){
      const r = SUMMON.r * (1 - ck) * (0.5 + i*0.26);
      const a = ck * (0.30 - i*0.07);
      if (a <= 0.02 || r < 4) continue;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#3fd8c0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, cy, r, r*0.52, S.t*0.9 + i, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  // 회오리 — 궤적을 이어 하나의 리본으로 감아 든다
  if (bt < 0 && ck > 0.02){
    const LANES = 3;
    for (let L = 0; L < LANES; L++){
      const laneR = 0.55 + L*0.22;
      const head = ck;                      // 앞머리 진행도
      // 리본 바깥선 → 안쪽선을 이어 닫는다
      ctx.beginPath();
      const SEG = 26;
      const pts = [];
      for (let j = 0; j <= SEG; j++){
        const t = clamp(head - (j/SEG)*0.55, 0, 1);
        if (t <= 0) break;
        const e = t*t;
        const rad = SUMMON.r * (1 - e) * laneR;
        const ang = e * Math.PI * 2 * SUMMON.turns + L*2.09;
        pts.push([x + Math.cos(ang)*rad, cy + Math.sin(ang)*rad*0.52, 1-j/SEG]);
      }
      if (pts.length < 3) continue;
      // 바깥선
      for (let j = 0; j < pts.length; j++){
        const [px,py,w] = pts[j];
        const th = 1.2 + w*3.4;
        if (j === 0) ctx.moveTo(px, py - th); else ctx.lineTo(px, py - th);
      }
      // 되돌아오며 안쪽선
      for (let j = pts.length-1; j >= 0; j--){
        const [px,py,w] = pts[j];
        const th = 1.2 + w*3.4;
        ctx.lineTo(px, py + th);
      }
      ctx.closePath();
      const a = Math.min(ck*3, 1) * (0.55 - L*0.11);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#3fd8c0';
      ctx.fill();
      ctx.globalAlpha = a * 1.2;
      ctx.strokeStyle = '#d8fff4';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 앞머리 알갱이
      const [hx, hy] = pts[0];
      ctx.globalAlpha = Math.min(ck*3, 1);
      ctx.fillStyle = '#d8fff4';
      ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 중심 — 모일수록 커지고, 다 모이면 터진다
  if (bt < 0 && ck > 0.06){
    const cr = 3 + ck*ck * 17;
    ctx.globalAlpha = 0.28 + ck*0.55;
    ctx.fillStyle = '#7fffe4';
    ctx.beginPath(); ctx.arc(x, cy, cr, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.5 + ck*0.45;
    ctx.fillStyle = '#eafff9';
    ctx.beginPath(); ctx.arc(x, cy, cr*0.42, 0, Math.PI*2); ctx.fill();
  } else if (bt >= 0 && bt < SUMMON.burst){
    const b = bt / SUMMON.burst;
    for (let i = 0; i < 2; i++){
      const t2 = clamp(b - i*0.15, 0, 1);
      if (t2 <= 0) continue;
      const r2 = 14 + t2 * 132;
      ctx.globalAlpha = (1-t2) * (0.9 - i*0.3);
      ctx.strokeStyle = i ? '#eafff9' : '#7fffe4';
      ctx.lineWidth = 4 - t2*2.5 - i;
      ctx.beginPath(); ctx.ellipse(x, cy, r2, r2*0.5, 0, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = Math.pow(1-b, 2) * 0.95;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, cy, 20 * (1-b), 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 문구 — 터진 뒤 떠오른다
  if (bt >= 0){
    const ta = clamp(bt/0.3, 0, 1) * clamp(S.summonT/0.45, 0, 1);
    if (ta > 0.02){
      const W = cv.width, H = cv.height;
      const cry = (BOSSCRY[zone().k] || zone().boss + ' 등장');
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      ctx.globalAlpha = ta;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f0d9a8';
      ctx.font = '900 ' + Math.round(H*0.030) + 'px -apple-system,sans-serif';
      const yy = H*0.30 - (1-clamp(bt/0.3,0,1)) * H*0.02;
      ctx.fillText(cry, W/2, yy);
      ctx.strokeStyle = 'rgba(240,217,168,.45)'; ctx.lineWidth = 2;
      const lw = W*0.20;
      ctx.beginPath();
      ctx.moveTo(W/2-lw, yy + H*0.028); ctx.lineTo(W/2+lw, yy + H*0.028);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}


/* ── 단계 제패 ─────────────────────────────────────
   기운을 몸으로 모았다가 한 번에 터뜨린다.
   주먹 이펙트와 같은 청백색으로 맞춘다.
*/
function drawSweep(ox, oy){
  if (S.sweepT <= 0) return;
  const TOT = SWEEP.charge + SWEEP.blast + SWEEP.hold;
  const el = TOT - S.sweepT;
  const x = Math.round(P.x - ox);
  const y = Math.round(P.y - oy) - Math.round(HERO.h*0.42);

  /* ── 모으는 동안 — 리본이 감겨 든다 ── */
  if (el < SWEEP.charge){
    const k = el / SWEEP.charge;
    for (let L = 0; L < 3; L++){
      const laneR = 0.55 + L*0.22;
      const SEG = 24;
      const pts = [];
      for (let j = 0; j <= SEG; j++){
        const t = clamp(k - (j/SEG)*0.5, 0, 1);
        if (t <= 0) break;
        const e = t*t;
        const rad = 126 * (1 - e) * laneR;
        const ang = e * Math.PI * 2 * 2.4 + L*2.09;
        pts.push([x + Math.cos(ang)*rad, y + Math.sin(ang)*rad*0.5, 1-j/SEG]);
      }
      if (pts.length < 3) continue;
      ctx.beginPath();
      for (let j = 0; j < pts.length; j++){
        const [px,py,w] = pts[j]; const th = 1.1 + w*3.2;
        if (j === 0) ctx.moveTo(px, py - th); else ctx.lineTo(px, py - th);
      }
      for (let j = pts.length-1; j >= 0; j--){
        const [px,py,w] = pts[j]; const th = 1.1 + w*3.2;
        ctx.lineTo(px, py + th);
      }
      ctx.closePath();
      const a = Math.min(k*3, 1) * (0.55 - L*0.11);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#a8d4f0'; ctx.fill();
      ctx.globalAlpha = a * 1.2;
      ctx.strokeStyle = '#f8fcff'; ctx.lineWidth = 1; ctx.stroke();
      const [hx, hy] = pts[0];
      ctx.globalAlpha = Math.min(k*3, 1);
      ctx.fillStyle = '#f8fcff';
      ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, Math.PI*2); ctx.fill();
    }
    // 몸에 맺히는 빛
    const cr = 4 + k*k * 17;
    ctx.globalAlpha = 0.30 + k*0.55;
    ctx.fillStyle = '#a8d4f0';
    ctx.beginPath(); ctx.arc(x, y, cr, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.5 + k*0.45;
    ctx.fillStyle = '#f8fcff';
    ctx.beginPath(); ctx.arc(x, y, cr*0.42, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  /* ── 터진 뒤 — 곡면 꺼풀이 이어져 퍼진다 ── */
  const k = clamp((el - SWEEP.charge) / SWEEP.blast, 0, 1);
  const fade = S.sweepT < SWEEP.hold ? S.sweepT/SWEEP.hold : 1;

  // 꺼풀마다 안팎 두 곡선을 이어 하나의 띠 면으로 만든다
  for (let B = SWEEP.bands-1; B >= 0; B--){
    const t = clamp(k - B*0.085, 0, 1);
    if (t <= 0) continue;
    const eb = 1 - Math.pow(1-t, 2.6);
    const R  = SWEEP.range * eb * (1 - B*0.08);
    const th = 34 + eb*44 - B*5;                 // 띠 두께
    const a  = (1-t) * (0.17 - B*0.03) * fade;
    if (a <= 0.005) continue;
    const ph = B * 1.7 + k * 2.2;

    ctx.beginPath();
    // 바깥 곡선
    const outer = [];
    for (let i = 0; i < SWEEP.pts; i++){
      const ang = (i/SWEEP.pts) * Math.PI * 2;
      const w = 1 + Math.sin(ang*3 + ph)*SWEEP.wave
                  + Math.sin(ang*5 - ph*1.3)*SWEEP.wave*0.6;
      outer.push([x + Math.cos(ang)*R*w, y + Math.sin(ang)*R*0.44*w]);
    }
    curveLoop(outer);
    // 안쪽 곡선 (반대로 돌아 구멍을 낸다)
    const inner = [];
    const R2 = Math.max(2, R - th);
    for (let i = SWEEP.pts-1; i >= 0; i--){
      const ang = (i/SWEEP.pts) * Math.PI * 2;
      const w = 1 + Math.sin(ang*3 + ph + 0.4)*SWEEP.wave*0.8;
      inner.push([x + Math.cos(ang)*R2*w, y + Math.sin(ang)*R2*0.44*w]);
    }
    curveLoop(inner);
    ctx.globalAlpha = a;
    ctx.fillStyle = B === 0 ? '#f4faff' : '#cfe8ff';
    ctx.fill('evenodd');
    // 앞머리 꺼풀만 테두리를 옅게 둘러 파면을 알린다
    if (B === 0){
      ctx.globalAlpha = a * 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); curveLoop(outer); ctx.stroke();
    }
  }

  // 중심에서 피어오르는 빛
  if (k < 0.32){
    const f = 1 - k/0.32;
    ctx.globalAlpha = f * 0.30;
    ctx.fillStyle = '#f4faff';
    ctx.beginPath(); ctx.ellipse(x, y, 12 + f*30, (12 + f*30)*0.55, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* 점 목록을 부드러운 닫힌 곡선으로 잇는다 */
function curveLoop(P2){
  const n = P2.length;
  if (n < 3) return;
  ctx.moveTo((P2[n-1][0]+P2[0][0])/2, (P2[n-1][1]+P2[0][1])/2);
  for (let i = 0; i < n; i++){
    const cur = P2[i], nx = P2[(i+1)%n];
    ctx.quadraticCurveTo(cur[0], cur[1], (cur[0]+nx[0])/2, (cur[1]+nx[1])/2);
  }
  ctx.closePath();
}


/* ── 보스 오라 ─────────────────────────────────────
   준 이미지를 연하게 여러 겹 겹쳐 주변을 감싼다.
*/
function drawAura(cx, cy, dw, dh){
  const au = IMG.fx_aura;
  if (!au || !au.complete || !au.naturalWidth) return;
  for (let i = 0; i < AURA.layers; i++){
    const ph = S.t * AURA.sway + i * 2.1;
    const grow = 0.94 + Math.sin(ph) * 0.07;
    const aw = Math.max(2, Math.round(dw * AURA.wide * (0.80 + i*0.14) * grow));
    const ah = Math.max(2, Math.round(dh * AURA.tall * (0.82 + i*0.12) * grow));
    const sx = Math.sin(ph*0.6) * (1.5 + i);
    ctx.globalAlpha = Math.max(0, (AURA.alpha - i*0.08) + Math.sin(ph*1.4)*0.04);
    draw(au, cx - Math.round(aw/2) + sx, cy + dh*AURA.drop - ah, aw, ah);
  }
  ctx.globalAlpha = 1;
}

/* ── 적의 원거리 탄 ────────────────────────────────
   작은 탄은 주먹 이펙트와 같은 이중 구조. 큰 구체는 덩굴이 감긴다.
*/
function drawShots(ox, oy){
  for (const b of S.shots){
    const x = Math.round(b.x - ox), y = Math.round(b.y - oy);
    const pulse = 1 + Math.sin(b.t*14)*0.12;
    // 그림 탄 — 낭인 술병처럼 스프라이트가 있는 탄은 빙글빙글 돌며 난다
    if (b.img && IMG[b.img]){
      const im = IMG[b.img];
      ctx.save();
      ctx.translate(x, y);
      // 나는 탄(원혼 해골 귀화) — 돌지 않고 진행 방향을 본다. 술병류는 빙글빙글
      if (b.fly){ if (b.vx < 0) ctx.scale(-1, 1); }
      else ctx.rotate(b.t * 9 * (b.vx < 0 ? -1 : 1));
      draw(im, -Math.round(im.naturalWidth/2), -Math.round(im.naturalHeight/2),
           im.naturalWidth, im.naturalHeight);
      ctx.restore();
      continue;
    }
    if (b.big){
      const R = b.r;
      // 주술사 시트의 구체 그림을 쓴다
      const orb = IMG.shaman_m2;
      if (orb && orb.complete && orb.naturalWidth){
        const w = R*2.6, h = R*2.2;
        ctx.save();
        ctx.translate(x, y);
        if (b.vx < 0) ctx.scale(-1, 1);
        ctx.globalAlpha = 0.30;
        ctx.strokeStyle = '#5ee08a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-Math.abs(b.vx)*26, -b.vy*26); ctx.lineTo(0, 0); ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.globalAlpha = 0.92;
        draw(orb, -w/2, -h/2, w, h);
        ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = '#5ee08a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - b.vx*26, y - b.vy*26); ctx.lineTo(x, y); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = '#2f9e55';
      ctx.beginPath(); ctx.arc(x, y, R*pulse, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = '#5ee08a';
      ctx.beginPath(); ctx.arc(x, y, R*0.68*pulse, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#d8ffe4'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++){
        ctx.beginPath();
        for (let j = 0; j <= 14; j++){
          const a2 = (j/14)*Math.PI*2 + b.t*3 + i*2.09;
          const rr = R*(0.55 + Math.sin(a2*2 + b.t*4)*0.30);
          const px = x + Math.cos(a2)*rr, py = y + Math.sin(a2)*rr*0.85;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#f0fff5';
      ctx.beginPath(); ctx.arc(x, y, R*0.30*pulse, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = '#5ee08a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - b.vx*13, y - b.vy*13); ctx.lineTo(x, y); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#3fbf6a';
    ctx.beginPath(); ctx.arc(x, y, 4.6*pulse, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#d8ffe4';
    ctx.beginPath(); ctx.arc(x, y, 2.4*pulse, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
