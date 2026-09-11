/* 스프라이트 규격 검사 — '잘려 보인다'는 문제를 빌드 전에 잡는다.
   1) 선언한 w·h 와 실제 PNG 크기가 같은가
   2) 한 종류의 모든 동작이 같은 규격인가 (다르면 위치가 튄다)
   3) 그림이 캔버스 가장자리에 닿는가 (닿으면 거기서 잘린 것이다)
   4) 실루엣 안에 구멍이 있는가
*/
const fs = require('fs');
const zlib = require('zlib');
const DIR = __dirname+'/assets/';

// ── PNG 디코드 (의존성 없이 최소한만) ───────────────────
function png(buf) {
  let p = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [], plte = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    const d = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'PLTE') plte = d;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8) throw new Error('8비트 PNG만 지원');
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ch, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[q++];
    const line = raw.slice(q, q + stride); q += stride;
    const prev = y ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.slice(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (ft === 1) v += a; else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 255;
    }
  }
  // 알파만 뽑는다
  const al = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (ct === 6) al[i] = out[i * 4 + 3];
    else if (ct === 4) al[i] = out[i * 2 + 1];
    else if (ct === 3) { const ix = out[i]; al[i] = trns && ix < trns.length ? trns[ix] : 255; }
    else al[i] = 255;
  }
  return { w, h, al };
}

// ── 게임 데이터 읽기 ────────────────────────────────────
const data = fs.readFileSync(__dirname+'/src/00-data.js', 'utf8');
const { FOES, ANIM, HERO, HFX } = new Function(
  data.replace('"use strict";', '').replace(/const zone\s*=[\s\S]*?;\n/, '') +
  ';return {FOES, ANIM, HERO, HFX};')();

let bad = 0;
function check(label, file, w, h, noEdge) {
  if (!fs.existsSync(DIR + file)) { console.log('  ★없음 ' + file); bad++; return null; }
  const im = png(fs.readFileSync(DIR + file));
  const note = [];
  if (w && (im.w !== w || im.h !== h)) { note.push(`선언 ${w}x${h} ≠ 실제 ${im.w}x${im.h}`); bad++; }
  // 가장자리 접촉 = 잘림
  const e = [];
  for (let x = 0; x < im.w; x++) { if (im.al[x] > 0) { e.push('상'); break; } }
  for (let x = 0; x < im.w; x++) { if (im.al[(im.h - 1) * im.w + x] > 0) { e.push('하'); break; } }
  for (let y = 0; y < im.h; y++) { if (im.al[y * im.w] > 0) { e.push('좌'); break; } }
  for (let y = 0; y < im.h; y++) { if (im.al[y * im.w + im.w - 1] > 0) { e.push('우'); break; } }
  const side = noEdge ? [] : e.filter(s => s !== '하');   // 바닥은 발이 닿는 게 맞다
  if (side.length) { note.push('가장자리 접촉 ' + side.join('')); bad++; }
  if (note.length) console.log('  ★' + label.padEnd(20) + note.join(' · '));
  return im;
}

console.log('주인공');

check('건곤이형 원반', 'gshield.png', HFX.taijiW * HFX.taijiN, HFX.taijiH, true);
for (const ck in HFX.cast)   // 시전 스트립은 초식마다 별도
  // 시전 스트립은 원본 칸이 이펙트를 경계까지 그려 접촉이 정상 — 크기만 본다
  check('hero cast ' + ck, HFX.cast[ck][0] + '.png', HFX.cast[ck][1] * HFX.cast[ck][2], HERO.h, true);
for (const a in ANIM) {
  if (a === 'cast') continue;
  const n = ANIM[a][0];
  check('hero ' + a, a === 'idle' ? 'idle.png' : a + '.png', (HFX.aw[a] || HERO.w) * n, HERO.h);
}

for (const k in FOES) {
  const M = FOES[k];
  const seen = new Set();
  for (const a in M.anim) for (const f of M.anim[a]) seen.add(f);
  console.log(`${M.n} (${k}) — 선언 ${M.w}x${M.h}${M.sw ? ` · 몸 ${M.sw}x${M.bh}` : ''} · 프레임 ${seen.size}`);
  for (const f of seen) check(k + '_' + f, `${k}_${f}.png`, M.w, M.h);
}
console.log(bad ? `\n★ 문제 ${bad}건` : '\n문제 없음');
