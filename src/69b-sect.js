/* ── 문파 — 내 문파 세우기 (v2.91) ────────────────────
   이름: 기본 무명문(無名門), 플레이어가 패널 머리글 ✎로 짓는다(S.sectName, v2.91.2). 실존 문파(소림 등)는 본진 비무 상대.
   숫자는 전부 00-data.js의 SECT. 설계는 docs/설계-문파.md.
   1층: 전각 5채 — 은자로 레벨을 올리면 영구 % 효과(sectBonus가 heroDmg 등 전투 수식에 합산).
        상한은 명성 단계(fameTier)로 열린다.
   명성: 처치·보스·업적 받기로 쌓인다(fameAdd). 산문이 획득을 키운다.
   제자·본진 비무는 v2.92~ (객당은 자리만 잡아 둠).
*/
// 이름 — 앞뒤 공백 제거·글자 수 상한·빈 값이면 기본. 한자는 기본 이름에만 붙는다
function sectCleanName(v){ v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, SECT.nameMax); return v === SECT.name ? '' : v; }
function sectName(){ return S.sectName || SECT.name; }
function sectHan(){ return S.sectName ? '' : SECT.han; }
function setSectName(v){ S.sectName = sectCleanName(v); sectHeader(); if (typeof refreshOverlay === 'function') refreshOverlay(); if (typeof saveNow === 'function') saveNow(); return sectName(); }
function sectHeader(){ const n = $('sname'), h = $('shan'); if (n) n.textContent = sectName(); if (h) h.textContent = sectHan(); }
function hallDef(k){ return SECT.halls.find(h => h.k === k); }
function hallLv(k){ return (S.halls && S.halls[k]) | 0; }
function hallCost(k, lv){ const h = hallDef(k); return Math.round(h.cb * Math.pow(h.cg, lv == null ? hallLv(k) : lv)); }
// 명성 단계 — need를 넘은 마지막 단계
function fameTier(){ let t = 0; for (let i = 0; i < SECT.fame.tiers.length; i++) if ((S.fame || 0) >= SECT.fame.tiers[i].need) t = i; return t; }
function fameTierDef(i){ return SECT.fame.tiers[Math.max(0, Math.min(SECT.fame.tiers.length - 1, i == null ? fameTier() : i))]; }
function hallCap(){ return fameTierDef().cap; }
// 전각 효과 합(%) — 키별. 수련·장비와 같은 자리에 더해진다
function sectBonus(k){
  let v = 0;
  for (const h of SECT.halls){ const lv = hallLv(h.k); if (lv && h.eff[k]) v += h.eff[k] * lv; }
  return v;
}
function hallEffText(h, lv){                                    // "공격력 +3% · 공격 속도 +1%"
  return Object.keys(h.eff).map(k => SECT.effName[k] + ' ' + (k === 'artcost' || k === 'downcut' ? '−' : '+') + (Math.round(h.eff[k] * lv * 10) / 10) + '%').join(' · ');
}
function canBuildHall(k){ return hallLv(k) < hallCap() && S.silver >= hallCost(k); }
function buildHall(k){
  if (!hallDef(k) || !canBuildHall(k)) return false;
  S.silver -= hallCost(k);
  if (!S.halls) S.halls = {};
  S.halls[k] = hallLv(k) + 1;
  return true;
}
function canBuildAny(){ return SECT.halls.some(h => canBuildHall(h.k)); }
// 명성 — src: 'kill' | 'boss' | 'bossFirst' | 'achv'. 산문(fame) 효과가 곱해진다. 단계가 오르면 토스트
function fameAdd(n){
  const t0 = fameTier();
  S.fame = (S.fame || 0) + n * (1 + sectBonus('fame') / 100);
  const t1 = fameTier();
  if (t1 > t0){
    const joined = [];                                                                                    // 이름이 알려지면 제자가 찾아온다 (v2.92)
    for (let t = t0 + 1; t <= t1; t++) if (discipleSlotsFree() > 0){ const d = rollDisciple(); if (discipleAdd(d, 'fame', true)) joined.push(d.n); }
    if (typeof toast === 'function') toast('명성이 올랐다 · ' + fameTierDef(t1).n + '\n전각 상한 ' + fameTierDef(t1).cap + (joined.length ? '\n' + joined.join('·') + '이(가) 제자로 찾아왔다' : ''));
  }
  return t1 > t0;
}

/* ── 2층 제자 (v2.92) — 육성 없음, 자질이 곧 값. 수익은 자동 입금, 계보 보너스는 artEff에 곱 ── */
function discipleSlots(){ const D = SECT.disciple; return (D.slotsByFame[Math.min(fameTier(), D.slotsByFame.length - 1)] | 0) + Math.floor(hallLv('guest') / D.guestPer); }
function discipleSlotsFree(){ return Math.max(0, discipleSlots() - (S.disciples || []).length); }
function discipleClean(arr){
  const D = SECT.disciple, out = [];
  if (!Array.isArray(arr)) return out;
  for (const d of arr){
    if (!d || typeof d !== 'object') continue;
    const l = D.lineages.includes(d.l) ? d.l : D.lineages[0], t = clamp(d.t | 0, 0, D.talents.length - 1);
    const n = String(d.n || '').slice(0, 8) || discipleName();
    out.push({ n, l, t });
  }
  return out;
}
function discipleName(){
  const D = SECT.disciple, used = new Set((S.disciples || []).map(d => d.n));
  for (let i = 0; i < 40; i++){
    const n = D.surnames[Math.floor(Math.random() * D.surnames.length)] + D.givens[Math.floor(Math.random() * D.givens.length)];
    if (!used.has(n)) return n;
  }
  return D.surnames[0] + D.givens[0];
}
function rollTalent(){                                       // 명성 단계별 가중치로 자질을 뽑는다
  const W = SECT.disciple.talentW[Math.min(fameTier(), SECT.disciple.talentW.length - 1)];
  let r = Math.random() * W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < W.length; i++){ r -= W[i]; if (r < 0) return i; }
  return 0;
}
function rollDisciple(lineage){
  const D = SECT.disciple;
  return { n: discipleName(), l: D.lineages.includes(lineage) ? lineage : D.lineages[Math.floor(Math.random() * D.lineages.length)], t: rollTalent() };
}
// 합류 — 자리가 없으면 false. src: 'fame' | 'fate' | 'duel'
function discipleAdd(d, src, quiet){
  if (!d || discipleSlotsFree() <= 0) return false;
  if (!S.disciples) S.disciples = [];
  S.disciples.push({ n: d.n, l: d.l, t: d.t });
  sceneDisc.push(newSceneDisc(S.disciples.length - 1));
  if (!quiet && typeof toast === 'function') toast(d.n + '이(가) 제자로 들어왔다\n' + SCHOOLS[d.l].n + ' 출신 · 자질 ' + SECT.disciple.talents[d.t].n, { icon: ASSET['sch_' + d.l], color: SCHOOLS[d.l].c, sec: 2.6 });
  return true;
}
// 계보 보너스 — 그 계보 제자들의 자질 bonus 합(%)
function lineageBonus(sch){ let v = 0; for (const d of (S.disciples || [])) if (d.l === sch) v += SECT.disciple.talents[d.t].bonus; return v; }
// 초당 수익 — 지금 사냥터 전투 수입(처치 은자 / 한 마리 잡는 시간) × 비율 × 자질 합 × 객당
function sectYieldPerSec(){
  const ds = S.disciples || []; if (!ds.length) return 0;
  let tal = 0; for (const d of ds) tal += SECT.disciple.talents[d.t].yield;
  const per = (typeof offKillTime === 'function') ? killSilver() / Math.max(0.2, offKillTime()) : 0;
  return per * SECT.disciple.yieldRate * tal * (1 + sectBonus('yield') / 100);
}
let sectAcc = 0, sectEarned = 0;                                // 소수 누적 · 이번 접속 벌이(표시용)
function sectStep(dt){
  const r = sectYieldPerSec();
  if (r > 0){ sectAcc += r * dt; const n = Math.floor(sectAcc); if (n > 0){ sectAcc -= n; S.silver += n; sectEarned += n; } }
  if (sectView) sceneStep(dt);
}

/* ── 문파 터 화면 (v2.92) — 문파 탭이 열려 있는 동안 전투 대신 그린다. 전투는 뒤에서 계속 돈다 ── */
let sectView = false;
let sceneDisc = [];                                              // 화면용 제자 [{i, x, y, dir, st:'walk'|'train'|'stand', t, af}]
let sceneBubble = null;                                          // { i, text, t }
let sceneFlash = null;                                           // 전각 탭 강조 { k, t }
const tintCache = {};
function newSceneDisc(i){
  const C = SECT.scene, x = lerp(C.yardX[0], C.yardX[1], Math.random()), y = lerp(C.yardY[0], C.yardY[1], Math.random());
  return { i, x, y, dir: Math.random() < 0.5 ? 1 : -1, st: 'stand', t: 1 + Math.random() * 2, af: 0 };
}
function lerp(a, b, t){ return a + (b - a) * t; }
function sceneSync(){ const n = (S.disciples || []).length; while (sceneDisc.length < n) sceneDisc.push(newSceneDisc(sceneDisc.length)); sceneDisc.length = n; }
function sceneStep(dt){
  sceneSync();
  const C = SECT.scene;
  for (const d of sceneDisc){
    d.t -= dt; d.af += dt * (d.st === 'walk' ? ANIM.run[1] : d.st === 'train' ? 8 : ANIM.idle[1]);
    if (d.st === 'walk'){
      d.x += d.dir * C.walkSpd * dt;                                  // 그림 폭 비율/s (v2.92.6)
      if (d.x < C.yardX[0]){ d.x = C.yardX[0]; d.dir = 1; } if (d.x > C.yardX[1]){ d.x = C.yardX[1]; d.dir = -1; }
    }
    if (d.t <= 0){
      const r = Math.random();
      d.st = r < 0.4 ? 'walk' : r < 0.75 ? 'train' : 'stand';
      d.t = d.st === 'walk' ? 1.5 + Math.random() * 3 : 1.2 + Math.random() * 2.5;
      if (d.st === 'walk') d.dir = Math.random() < 0.5 ? 1 : -1;
      if (d.st !== 'walk') d.af = 0;
    }
  }
  if (sceneBubble && (sceneBubble.t -= dt) <= 0) sceneBubble = null;
  if (sceneFlash && (sceneFlash.t -= dt) <= 0) sceneFlash = null;
}
// 도복만 계보색으로 — 주인공 스트립을 임시 제자로 쓴다(제자 시트가 오면 disciple_walk/train로 교체). 살·머리는 그대로
function tintedStrip(key, col){
  const ck = key + ':' + col; if (tintCache[ck]) return tintCache[ck];
  const im = IMG[key]; if (!im || !im.complete || !im.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext('2d'); if (!g) return null;
  try{
    g.drawImage(im, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height), p = id.data;
    const cr = parseInt(col.slice(1, 3), 16), cg = parseInt(col.slice(3, 5), 16), cb = parseInt(col.slice(5, 7), 16);
    for (let i = 0; i < p.length; i += 4){
      if (!p[i + 3]) continue;
      const r = p[i], gg = p[i + 1], b = p[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), lum = (r * 299 + gg * 587 + b * 114) / 1000;
      if (mx - mn < 52 && lum > 110 && lum < 236 && r >= b){          // 도복 베이지·그 그늘(따뜻한 회색) — 살(채도 93)·바지(푸른)·머리(어두움)는 제외
        const k = lum / 255 * 1.25;
        p[i] = Math.min(255, cr * k); p[i + 1] = Math.min(255, cg * k); p[i + 2] = Math.min(255, cb * k);
      }
    }
    g.putImageData(id, 0, 0);
  }catch(e){ return null; }
  tintCache[ck] = c; return c;
}
function hallStage(k){ const lv = hallLv(k), T = SECT.scene.stageLv; let s = -1; for (let i = 0; i < T.length; i++) if (lv >= T[i]) s = i; return s; }   // -1 = 아직 없음
// 배경 그림이 화면에 깔리는 사각형 (v2.92.6) — cover: 화면을 다 덮는 배율, 가로·세로 중앙. 그림이 없으면 화면 전체(자리 비율이 화면 비율로 떨어진다)
function sectBgRect(){
  const C = SECT.scene, im = IMG[C.bg], ok = im && im.complete && im.naturalWidth;
  const iw = ok ? im.naturalWidth : C.bgW, ih = ok ? im.naturalHeight : C.bgH;
  if (!ok) return { x: 0, y: 0, w: VW, h: VH, s: 1, ok: false };
  const s = Math.max(VW / iw, VH / ih), w = Math.round(iw * s), h = Math.round(ih * s);
  return { x: Math.round((VW - w) / 2), y: Math.round((VH - h) / 2), w, h, s, ok: true };
}
function scenePt(fx, fy){ const R = sectBgRect(); return [Math.round(R.x + fx * R.w), Math.round(R.y + fy * R.h)]; }   // 그림 비율 → 화면 좌표
function drawSectBg(){
  const R = sectBgRect();
  if (!R.ok){ drawGround(0, 0); drawBackdrop(0); return false; }   // 그림 전엔 옛 방식(죽림 바닥+원경)
  ctx.fillStyle = rzone().ground; ctx.fillRect(0, 0, VW, VH);
  draw(IMG[SECT.scene.bg], R.x, R.y, R.w, R.h);
  return true;
}
function sceneHallBox(k){
  const [fx, fy, fw] = SECT.scene.halls[k], st = hallStage(k), im = st >= 0 ? IMG['hall_' + k + '_' + st] : null, ok = im && im.complete && im.naturalWidth;
  const [x, y] = scenePt(fx, fy), plotW = Math.max(1, (fw || 0.2) * sectBgRect().w);
  const sc = ok ? Math.min(1, plotW * SECT.scene.hallFit / im.naturalWidth) : 1;   // 옆모습 시트가 터보다 넓으면 터 폭에 맞춰 줄인다 (v2.92.6)
  return { x, y, w: ok ? Math.round(im.naturalWidth * sc) : 64, h: ok ? Math.round(im.naturalHeight * sc) : 60, sc, plotW: Math.round(plotW) };   // 그림이 있으면 그 크기로 탭 판정
}
function drawSectHall(h){
  const b = sceneHallBox(h.k), st = hallStage(h.k), lv = hallLv(h.k);
  const im = st >= 0 ? IMG['hall_' + h.k + '_' + st] : null;
  shadow(b.x, b.y, Math.round(b.w * 0.8));
  if (im && im.complete && im.naturalWidth){ draw(im, 0, 0, im.naturalWidth, im.naturalHeight, b.x - Math.round(b.w / 2), b.y - b.h, b.w, b.h); }
  else {
    // 시트 전엔 팻말 — 나무 기둥 + 낙관 도장 (Lv 0은 말뚝만)
    ctx.save();
    ctx.fillStyle = '#5a3d28'; ctx.fillRect(b.x - 2, b.y - 30, 4, 30);
    ctx.fillStyle = '#7a5538'; ctx.fillRect(b.x - 1, b.y - 30, 1, 30);
    if (lv > 0){
      const sz = st >= 2 ? 24 : st >= 1 ? 21 : 18;
      ctx.translate(b.x, b.y - 30 - sz / 2); ctx.rotate(-0.06);
      ctx.fillStyle = '#8a2a22'; ctx.fillRect(-sz / 2 - 1, -sz / 2 - 1, sz + 2, sz + 2);
      ctx.fillStyle = '#b3392e'; ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.fillStyle = '#fff1dc'; ctx.font = '700 ' + Math.round(sz * 0.72) + 'px "Nanum Myeongjo",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(h.h[0], 0, 1);
    } else {
      ctx.fillStyle = '#8a7a5a'; ctx.fillRect(b.x - 12, b.y - 2, 24, 2); ctx.fillRect(b.x - 12, b.y - 10, 2, 10); ctx.fillRect(b.x + 10, b.y - 10, 2, 10);
    }
    ctx.restore();
  }
  // 이름표
  ctx.save(); ctx.font = '900 9px Jua,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(h.n + (lv ? ' ' + lv : ''), b.x + 1, b.y + 4);
  ctx.fillStyle = sceneFlash && sceneFlash.k === h.k ? '#ffe08a' : '#e8eef6'; ctx.fillText(h.n + (lv ? ' ' + lv : ''), b.x, b.y + 3);
  ctx.restore();
}
function drawSectDisc(d){
  const dd = (S.disciples || [])[d.i]; if (!dd) return;
  const col = SCHOOLS[dd.l].c, sc = SECT.scene.discScale;
  const [x, y] = scenePt(d.x, d.y);
  const walk = d.st === 'walk', key = walk ? 'hero_run' : 'hero_idle';
  const n = walk ? ANIM.run[0] : ANIM.idle[0], fw = HFX.aw[walk ? 'run' : 'idle'] || HERO.w;
  const src = tintedStrip(key, col) || IMG[key];
  const fi = walk ? Math.floor(d.af) % n : 0;
  shadow(x, y, HERO.w * sc);
  ctx.save(); ctx.translate(x, y); ctx.scale(d.dir * sc, sc);
  if (d.st === 'train'){ ctx.rotate(Math.sin(d.af * 1.2) * 0.12); }   // 목검 휘두르기 — 시트 전엔 몸을 흔든다
  if (src) try{ ctx.drawImage(src, fi * fw, 0, fw, HERO.h, -Math.round(fw / 2), -HERO.h, fw, HERO.h); }catch(e){}
  ctx.restore();
  // 이름·계보 점
  ctx.save(); ctx.font = '900 8px Jua,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(dd.n, x + 1, y + 4); ctx.fillStyle = col; ctx.fillText(dd.n, x, y + 3);
  ctx.restore();
  if (sceneBubble && sceneBubble.i === d.i){
    ctx.save(); ctx.font = '11px Jua,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sub = sceneBubble.sub || '', tw = Math.max(ctx.measureText(sceneBubble.text).width, sub ? ctx.measureText(sub).width * 0.85 : 0) + 14, bh = sub ? 32 : 20;
    const bx = clamp(x, tw / 2 + 4, VW - tw / 2 - 4), by = y - HERO.h * sc - 16 - (sub ? 6 : 0);
    ctx.fillStyle = 'rgba(18,22,28,.94)'; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx - tw / 2, by - bh / 2, tw, bh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eaf3ff'; ctx.fillText(sceneBubble.text, bx, by + (sub ? -5 : 1));
    if (sub){ ctx.font = '9px Jua,sans-serif'; ctx.fillStyle = col; ctx.fillText(sub, bx, by + 8); }
    ctx.restore();
  }
}
function drawSectHero(){
  const [x, y] = scenePt(SECT.scene.hero[0], SECT.scene.hero[1]);
  const im = IMG['hero_idle'], fw = HFX.aw.idle || HERO.w;
  shadow(x, y, HERO.w);
  ctx.save(); ctx.translate(x, y);
  if (typeof drawAuraGlow === 'function') drawAuraGlow(im, 0, fw, HERO.h, 'idle:0', -Math.round(fw / 2), -HERO.h);
  draw(im, 0, 0, fw, HERO.h, -Math.round(fw / 2), -HERO.h, fw, HERO.h);
  ctx.restore();
}
function drawSectScene(){
  sceneSync();
  const ents = SECT.halls.map(h => ({ y: sceneHallBox(h.k).y, hall: h }));
  for (const d of sceneDisc) ents.push({ y: scenePt(d.x, d.y)[1], disc: d });
  ents.push({ y: scenePt(SECT.scene.hero[0], SECT.scene.hero[1])[1], hero: true });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents){ if (e.hall) drawSectHall(e.hall); else if (e.disc) drawSectDisc(e.disc); else drawSectHero(); }
  // 문파 이름 현판은 HTML 오버레이(#splaque, v2.92.4)
}
// 터 화면 탭 — 전각이면 카드로 스크롤·강조, 제자면 말풍선. x·y는 캔버스 단위
function sectTap(x, y){
  for (const h of SECT.halls){ const b = sceneHallBox(h.k); if (Math.abs(x - b.x) <= b.w / 2 && y >= b.y - b.h && y <= b.y + 14){
    sceneFlash = { k: h.k, t: 1.2 };
    openHallPop(h.k);
    return h.k; } }
  closeHallPop();
  let best = null, bd = 1e9;
  for (const d of sceneDisc){ const [px, py] = scenePt(d.x, d.y), dx = x - px, dy = y - (py - HERO.h * 0.45); const dist = Math.hypot(dx, dy * 0.7); if (dist < 26 && dist < bd){ bd = dist; best = d; } }
  if (best){ const S2 = SECT.disciple, dd = (S.disciples || [])[best.i];
    sceneBubble = { i: best.i, text: S2.say[Math.floor(Math.random() * S2.say.length)], sub: dd ? SCHOOLS[dd.l].n + ' 출신 · 자질 ' + S2.talents[dd.t].n + ' · ' + SCHOOLS[dd.l].n + ' 무공 +' + S2.talents[dd.t].bonus + '%' : '', t: S2.bubbleSec }; return 'disc'; }
  return null;
}
function killFame(){ return SECT.fame.kill * Math.pow(SECT.fame.killGrow, gstage() - 1); }

/* ── 패널 ── */
let sectHold = 0;
function hallCard(h){
  const lv = hallLv(h.k), cap = hallCap(), full = lv >= cap, can = canBuildHall(h.k);
  const next = full ? '' : ' → ' + hallEffText(h, lv + 1);
  return '<div class="acard hcard' + (can ? ' can' : '') + '" data-k="' + h.k + '">' +
    '<div class="hico' + (ASSET['hall_' + h.k] ? '' : ' seal') + '">' + (ASSET['hall_' + h.k] ? '<img src="' + ASSET['hall_' + h.k] + '" alt="">' : '<b>' + h.h[0] + '</b>') + '</div>' +
    '<div class="atxt"><div class="zn">' + h.n + ' <small>' + h.h + '</small> <em>Lv ' + lv + ' / ' + cap + '</em></div>' +
    '<div class="zd">' + h.d + '<br><i>' + (lv ? hallEffText(h, lv) : '아직 효과 없음') + '</i>' + next + '</div></div>' +
    (full ? '<div class="adone">' + (fameTier() >= SECT.fame.tiers.length - 1 ? '최고' : fameTierDef(fameTier() + 1).n + '에 열림') + '</div>'
          : '<button class="trbuy abtn" ' + (can ? '' : 'disabled') + '><span>' + (lv ? '올리기' : '세우기') + '</span><i>' + coin() + ' ' + fmt(hallCost(h.k)) + '</i></button>') +
    '</div>';
}
function fameBand(){
  const t = fameTier(), cur = fameTierDef(t), nxt = t < SECT.fame.tiers.length - 1 ? fameTierDef(t + 1) : null;
  const prog = nxt ? Math.max(0, Math.min(1, ((S.fame || 0) - cur.need) / (nxt.need - cur.need))) : 1;
  return '<div class="zrow fame"><div class="zn">명성 <em>' + cur.n + ' ' + cur.h + '</em></div>' +
    '<div class="zd">' + (nxt ? '다음 ' + nxt.n + ' — 명성 ' + fmt(Math.floor(S.fame || 0)) + ' / ' + fmt(nxt.need) + ' · 전각 상한 ' + cur.cap + ' → ' + nxt.cap
                              : '천하에 이름이 닿았다 · 전각 상한 ' + cur.cap) + '</div>' +
    '<div class="abar"><i style="width:' + Math.round(prog * 100) + '%"></i></div></div>';
}
function discipleBand(){
  const ds = S.disciples || [], D = SECT.disciple, per = sectYieldPerSec();
  let h = '<div class="zrow drow"><div class="zn">제자 <em>' + ds.length + ' / ' + discipleSlots() + '</em></div>';
  if (!ds.length) h += '<div class="zd">아직 없다 — 명성이 오르거나 기연이 닿으면 찾아온다. 자리는 명성 단계와 객당이 늘린다.</div>';
  else {
    h += '<div class="dlist">' + ds.map(d => '<div class="dline"><i class="dsch" style="background:' + SCHOOLS[d.l].c + '"></i><b>' + d.n + '</b><span>' + SCHOOLS[d.l].n + ' 출신 · 자질 ' + D.talents[d.t].n + ' ' + D.talents[d.t].h + '</span><em>' + SCHOOLS[d.l].n + ' 무공 +' + D.talents[d.t].bonus + '%</em></div>').join('') + '</div>';
    h += '<div class="zd">문파 수익 초당 <i>' + coin() + ' ' + fmt(Math.round(per * 10) / 10) + '</i> · 자리를 비워도 쌓인다' + (sectEarned ? ' · 이번 접속 +' + fmt(sectEarned) : '') + '</div>';
  }
  return h + '</div>';
}
function buildSectPanel(){
  const b = $('sbody'); if (!b) return;
  sectHeader();
  // 이름 짓기 줄 — 처음(아직 안 지음)엔 펼쳐 두고, 지은 뒤엔 머리글 ✎로 연다
  const naming = '<div class="zrow snamerow" id="snamerow"' + (S.sectName ? ' hidden' : '') + '><div class="zn">문파 이름을 정한다</div>' +
    '<div class="zd">이름 없는 문파에서 시작해 천하에 이름을 알린다. 나중에 ✎로 바꿀 수 있다.</div>' +
    '<div class="snamein"><input id="snamein" maxlength="' + SECT.nameMax + '" placeholder="' + SECT.name + '" value="' + (S.sectName || '') + '" autocomplete="off">' +
    '<button class="trbuy" id="snameok"><span>정한다</span></button></div></div>';
  b.innerHTML = naming + fameBand() + discipleBand() +
    '<div class="znote">마당의 전각을 누르면 그 자리에서 올린다. 명성은 적을 잡고, 보스를 꺾고, 업적을 받을 때 쌓인다.</div>';   // 전각 카드는 v2.92.1부터 팝업(사용자)
  const okb = $('snameok'); if (okb) okb.onclick = () => { setSectName($('snamein').value); $('snamerow').hidden = true; toast(sectName() + ' — 이름을 세웠다'); };
  const inp = $('snamein'); if (inp) inp.onkeydown = e => { if (e.key === 'Enter') okb.onclick(); };
  // 꾹 누르면 연속 (수련과 같은 규칙)
  b.querySelectorAll('.abtn').forEach(el => {
    const k = el.closest('.hcard').dataset.k;
    let iv = 0; const stop = () => { if (iv){ clearInterval(iv); iv = 0; } };
    el.onpointerdown = e => { e.preventDefault(); if (buildHall(k)) refreshSect(); stop();
      iv = setInterval(() => { if (buildHall(k)) refreshSect(); else stop(); }, 180); };
    el.onpointerup = el.onpointerleave = el.onpointercancel = stop;
  });
  refreshSect();
}
// 열린 동안 값만 — 카드마다 레벨·효과·가격·버튼. 상한 도달·명성 단계 변화는 다시 만든다
let sectSig = '';
function refreshSect(){
  const b = $('sbody'); if (!b) return;
  $('ssilver').innerHTML = coin() + ' ' + fmt(S.silver);
  const sig = fameTier() + ':' + (S.disciples || []).length + ':' + SECT.halls.map(h => hallLv(h.k) >= hallCap() ? 1 : 0).join('');
  if (sig !== sectSig){ sectSig = sig; buildSectPanel(); return; }
  for (const h of SECT.halls){
    const card = b.querySelector('.hcard[data-k="' + h.k + '"]'); if (!card) continue;
    const lv = hallLv(h.k), cap = hallCap(), can = canBuildHall(h.k);
    card.classList.toggle('can', can);
    card.querySelector('.zn em').textContent = 'Lv ' + lv + ' / ' + cap;
    const zd = card.querySelector('.zd'); zd.innerHTML = h.d + '<br><i>' + (lv ? hallEffText(h, lv) : '아직 효과 없음') + '</i>' + (lv >= cap ? '' : ' → ' + hallEffText(h, lv + 1));
    const btn = card.querySelector('.abtn'); if (btn){ btn.disabled = !can; btn.querySelector('span').textContent = lv ? '올리기' : '세우기'; btn.querySelector('i').innerHTML = coin() + ' ' + fmt(hallCost(h.k)); }
  }
  const fb = b.querySelector('.fame'); if (fb){ const t = fameTier(), cur = fameTierDef(t), nxt = t < SECT.fame.tiers.length - 1 ? fameTierDef(t + 1) : null;
    if (nxt){ fb.querySelector('.zd').textContent = '다음 ' + nxt.n + ' — 명성 ' + fmt(Math.floor(S.fame || 0)) + ' / ' + fmt(nxt.need) + ' · 전각 상한 ' + cur.cap + ' → ' + nxt.cap;
      fb.querySelector('.abar i').style.width = Math.round(Math.max(0, Math.min(1, ((S.fame || 0) - cur.need) / (nxt.need - cur.need))) * 100) + '%'; } }
}
// 문파 탭 = 마당만 (v2.92.4). 시트는 배지·✎를 누를 때만
function openSect(){ sectSig = ''; sectView = true; sceneSync(); const o = $('sover'); if (o) o.hidden = false; refreshOverlay(); }
function openSectSheet(){ buildSectPanel(); $('spanel').classList.add('show'); }
function closeSectSheet(){ const p = $('spanel'); if (p) p.classList.remove('show'); }
function closeSect(){ closeSectSheet(); const o = $('sover'); if (o) o.hidden = true; sectView = false; sceneBubble = null; closeHallPop(); }
function refreshOverlay(){
  const o = $('sover'); if (!o || o.hidden) return;
  const n = $('sname2'), h = $('shan2'); if (n) n.textContent = sectName(); if (h) h.textContent = sectHan();
  const t = fameTier(), cur = fameTierDef(t), nxt = t < SECT.fame.tiers.length - 1 ? fameTierDef(t + 1) : null;
  $('sfamet').textContent = cur.n + ' ' + cur.h;
  $('sfamen').textContent = nxt ? fmt(Math.floor(S.fame || 0)) + ' / ' + fmt(nxt.need) : '천하에 닿았다';
  $('sfameb').style.width = (nxt ? Math.round(Math.max(0, Math.min(1, ((S.fame || 0) - cur.need) / (nxt.need - cur.need))) * 100) : 100) + '%';
  const ds = S.disciples || [];
  $('sdiscn').textContent = ds.length + ' / ' + discipleSlots();
  $('sdisci').textContent = ds.length ? '초당 +' + fmt(Math.round(sectYieldPerSec() * 10) / 10) : '아직 없다';
}
/* ── 전각 팝업 (v2.92.1) — 마당의 전각을 누르면 그 위에 뜬다: 이름·레벨·효과 지금→다음·[올리기]. 꾹 누르면 연속 ── */
let hallPopK = null, hallPopIv = 0;
function openHallPop(k){
  const el = $('hpop'), h = hallDef(k); if (!el || !h) return;
  hallPopK = k;
  const ico = el.querySelector('.hpico'); ico.className = 'hpico' + (ASSET['hall_' + k] ? '' : ' seal'); ico.innerHTML = ASSET['hall_' + k] ? '<img src="' + ASSET['hall_' + k] + '" alt="">' : '<b>' + h.h[0] + '</b>';
  el.hidden = false;
  refreshHallPop();
  // 자리 — 전각 위. 캔버스 단위 → 오버레이 px(#ui는 캔버스와 같은 상자)
  const b = sceneHallBox(k), sx = VIEW.w / VW, sy = VIEW.h / VH;
  const pw = el.offsetWidth || 230, ph = el.offsetHeight || 120;
  const left = clamp(b.x * sx - pw / 2, 8, VIEW.w - pw - 8), top = Math.max(uiTopUnits() * sy + 8, b.y * sy - b.h * sy - ph - 6);
  el.style.left = Math.round(left) + 'px'; el.style.top = Math.round(top) + 'px';
}
function closeHallPop(){ const el = $('hpop'); if (el) el.hidden = true; hallPopK = null; if (hallPopIv){ clearInterval(hallPopIv); hallPopIv = 0; } }
function refreshHallPop(){
  const el = $('hpop'), k = hallPopK; if (!el || el.hidden || !k) return;
  const h = hallDef(k), lv = hallLv(k), cap = hallCap(), full = lv >= cap, can = canBuildHall(k);
  el.querySelector('.zn').innerHTML = h.n + ' <small>' + h.h + '</small> <em>Lv ' + lv + ' / ' + cap + '</em>';
  el.querySelector('.zd').innerHTML = '<i>' + (lv ? hallEffText(h, lv) : '아직 효과 없음') + '</i>' + (full ? '' : '<br>→ ' + hallEffText(h, lv + 1));
  const btn = $('hpbuy');
  if (full){ btn.disabled = true; btn.querySelector('span').textContent = fameTier() >= SECT.fame.tiers.length - 1 ? '최고' : fameTierDef(fameTier() + 1).n + '에 열림'; btn.querySelector('i').innerHTML = ''; }
  else { btn.disabled = !can; btn.querySelector('span').textContent = lv ? '올리기' : '세우기'; btn.querySelector('i').innerHTML = coin() + ' ' + fmt(hallCost(k)); }
}
// 매 프레임 — 탭 알림점(세울 수 있는 전각), 열려 있으면 은자·명성 변화만 반영
let sectLastSilver = -1, sectLastFame = -1;
function sectHud(){
  const tab = $('tab-sect'); if (!tab) return;
  const dot = tab.querySelector('.dot'); if (dot && dot.classList) dot.classList.toggle('on', canBuildAny());
  if (!sectView) return;
  if (sectLastSilver !== S.silver || sectLastFame !== S.fame){ sectLastSilver = S.silver; sectLastFame = S.fame; refreshOverlay(); refreshHallPop(); if ($('spanel').classList.contains('show')) refreshSect(); }
}
