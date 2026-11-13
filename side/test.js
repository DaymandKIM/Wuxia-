// 가로판 검사 — jsdom 으로 실제 실행 (오류 0) + 진행 박자. `node test.js` (SIM_MIN=분, 기본 30)
const fs = require('fs'), path = require('path'), { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, 'dist', 'side.html'), 'utf8').replace(/<link[^>]+googleapis[^>]*>/g, '');
const errs = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(e.message)); vc.on('error', e => errs.push(String(e)));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'http://localhost/',
  beforeParse(w){
    const g = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createLinearGradient' ? () => ({ addColorStop(){} }) : () => {}), set: (t, k, v) => (t[k] = v, true) });
    w.HTMLCanvasElement.prototype.getContext = () => g;
    w.innerWidth = 390; w.innerHeight = 844;
  } });
const w = dom.window, E = s => w.eval(s);
let fail = 0; const ok = (c, m) => { if (!c){ fail++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const run = sec => E('for (let i = 0; i < ' + Math.round(sec * 60) + '; i++) step(1/60);');
// 가장 싼 수련부터 산다 (플레이어 흉내)
const spend = () => E('for (let n = 0; n < 40; n++){ let b = null, c = 1e99; for (const s of TRAIN.list){ const x = trainCost(s.k); if ((S.tr[s.k]|0) < trainCap() && x < c){ c = x; b = s.k; } } if (!b || !trainBuy(b)) break; }');

console.log('── 구동');
ok(E('typeof step') === 'function' && E('document.querySelectorAll(".tcard").length') === 3, '부팅 · 수련 카드 3장');
run(20); E('render(); ui();');
ok(E('S.total') > 0, '20초에 처치 ' + E('S.total'));
ok(E('P.x') > 300, '주인공이 오른쪽으로 나아간다 (x ' + Math.round(E('P.x')) + ')');
ok(E('S.foes.every(f => f.x > P.x - 40)'), '적은 앞(오른쪽)에서만 온다');
ok(E('$("zsub").textContent').includes('/'), '단계 진행 글자 "' + E('$("zsub").textContent') + '"');
const s0 = E('S.silver'); E('S.silver += 1000'); E('document.querySelector(".tcard[data-k=atk]").click()');
ok(E('S.tr.atk') === 1 && E('S.silver') < s0 + 1000, '수련 카드를 누르면 사진다');
E('S.silver = 0'); E('document.querySelector(".tcard[data-k=hp]").click()'); ok(E('S.tr.hp') === 0, '은자가 모자라면 안 사진다');
E('S.tr.atk = trainCap(); S.silver = 1e9; document.querySelector(".tcard[data-k=atk]").click()'); ok(E('S.tr.atk') === E('trainCap()'), '수련 상한 = 경지');
E('S.tr.atk = 1; S.silver = 0');
E('P.hp = 1; hurtHero(99)'); ok(E('P.st') === 'down', '쓰러지면 운기조식'); run(3.3); ok(E('P.st') !== 'down' && E('P.hp') === E('heroHpMax()'), '3초 뒤 만회복으로 일어선다');
E('S.stage = STAGE.n; enterStage(); S.kills = stageNeed() - 1; S.realm = 30;'); run(12);
ok(E('isBoss() || S.cleared'), '10단계를 넘으면 수호자 단계');
run(40); ok(E('S.cleared'), '수호자 격파 → 넘었다 표시 · 마지막 단계에서 계속 사냥 (단계 ' + E('S.stage') + ')');
ok(E('saveNow()') && E('localStorage.getItem(SAVE.key)').includes('"realm":'), '저장');
ok(errs.length === 0 && !w.__err, '실행 오류 0' + (errs[0] ? ' — ' + errs[0] : w.__err ? ' — ' + w.__err.message : ''));

console.log('── 박자 (수련을 가장 싼 것부터 사는 플레이어)');
E('S.stage = 1; S.kills = 0; S.exp = 0; S.realm = 0; S.silver = 0; S.tr = {atk:0,hp:0,regen:0}; S.downs = 0; S.total = 0; S.cleared = false; S.bossDone = {}; S.foes.length = 0; S.waveX = 0; P.st = "run"; P.hp = heroHpMax();');
const mins = +process.env.SIM_MIN || 30, marks = [1, 3, 5, 10, 15, 20, 30, 45, 60, 120, 240].filter(m => m <= mins);
let t = 0, at5 = 0;
for (const m of marks){
  while (t < m * 60){ run(5); t += 5; spend(); }
  if (m === 5) at5 = E('S.stage');
  console.log('  ' + String(m).padStart(3) + '분  ' + (E('S.cleared') ? '죽림 넘음' : E('isBoss()') ? '수호자' : '죽림 ' + E('S.stage')).padEnd(8) + ' ' + E('realmName(S.realm)').padEnd(8) +
    ' 처치 ' + String(E('S.total')).padStart(5) + ' · 쓰러짐 ' + E('S.downs') + ' · 수련 ' + E('S.tr.atk') + '/' + E('S.tr.hp') + '/' + E('S.tr.regen') + ' · 잔고 ' + E('fmt(S.silver)') + ' (' + (E('S.silver / (killSilver() * Math.max(1, S.total) / ' + (t / 60) + ')')).toFixed(1) + '분 치)');
}
if (mins >= 5) ok(at5 >= 4 && at5 <= 8, '5분에 죽림 4~8단계 (옛 판 6~7) — 지금 ' + at5);
console.log(fail ? '★ 실패 ' + fail + '건' : '통과');
process.exit(fail ? 1 : 0);
