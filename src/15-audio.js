/* ── 소리 ─────────────────────────────────────────
   합성음. 파일 없이 만든다.
   첫 조작 전에는 브라우저가 소리를 막으므로 그때 깨운다.
*/
let AC = null;
function audioOn(){
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { AC = null; }
}
addEventListener('pointerdown', audioOn, { once:true });
addEventListener('touchstart',  audioOn, { once:true });

function sfx(kind){
  if (!AC || AC.state === 'suspended') return;
  if (typeof S !== 'undefined' && S.mute) return;   // ≡ 메뉴 '효과음 끔' (v2.85)
  const t = AC.currentTime;
  try {
    if (kind === 'swoosh'){
      // 배경이 미끄러져 들어올 때 — 슉
      const n = AC.createBufferSource();
      const len = Math.floor(AC.sampleRate * 0.18);
      const buf = AC.createBuffer(1, len, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.2);
      n.buffer = buf;
      const f = AC.createBiquadFilter();
      f.type='bandpass'; f.frequency.setValueAtTime(1800, t);
      f.frequency.exponentialRampToValueAtTime(420, t+0.18);
      f.Q.value = 1.1;
      const g = AC.createGain();
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.18);
      n.connect(f); f.connect(g); g.connect(AC.destination);
      n.start(t); n.stop(t+0.19);
    } else if (kind === 'punch'){
      const o = AC.createOscillator(), g = AC.createGain();
      o.type='triangle';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(70, t+0.09);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.11);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t+0.12);
    } else if (kind === 'kill'){
      const o = AC.createOscillator(), g = AC.createGain();
      o.type='square';
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(120, t+0.13);
      g.gain.setValueAtTime(0.10, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.15);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t+0.16);
    } else if (kind === 'down'){
      const o = AC.createOscillator(), g = AC.createGain();
      o.type='sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(55, t+0.5);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.55);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t+0.56);
    }
  } catch(e) {}
}
