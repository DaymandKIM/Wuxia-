// 크로뮴 실기 — 내보낸 웹 빌드(dist/)를 찍는다. 먼저 `cd dist && python3 -m http.server 8770`
// node tools/shot.js            기기 5종 → ../review/godot/<폭>x<높이>.png
// TAP=72,676 node tools/shot.js pick 1   찍기 전에 그 자리를 한 번 누른다 (카드가 눌리는지)
// node tools/shot.js skills 3   시험 차림(#demo=skills)으로 폰 화면을 3장 이어 찍는다 → demo_skills_<n>.png
const { chromium } = require('playwright-core'), path = require('path'), fs = require('fs');
const out = path.join(__dirname, '..', '..', 'review', 'godot'); fs.mkdirSync(out, { recursive: true });
const ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ARGS });
  const demo = process.argv[2] && isNaN(+process.argv[2]) ? process.argv[2] : '';
  const list = demo ? [[390, 844, 2]] : [[390, 844, 2], [390, 700, 1], [360, 600, 1], [820, 1180, 1], [1280, 720, 1]];
  for (const [w, h, dpr] of list){
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); const e = [];
    p.on('pageerror', x => e.push(x.message)); p.on('console', m => { if (m.type() === 'error' || /ERROR|SCRIPT/.test(m.text())) e.push(m.text().slice(0, 300)); });
    await p.goto('http://localhost:8770/index.html' + (demo ? '#demo=' + demo : '')); await p.waitForTimeout(demo ? 9000 : 14000);
    if (demo && process.env.TAP){ const [tx, ty] = process.env.TAP.split(',').map(Number); await p.mouse.click(tx, ty); await p.waitForTimeout(600); }
    if (demo){ const n = +process.argv[3] || 3, gap = +process.argv[4] || 700;
      for (let i = 0; i < n; i++){ await p.screenshot({ path: path.join(out, 'demo_' + demo + '_' + i + '.png') }); await p.waitForTimeout(gap); } }
    else await p.screenshot({ path: path.join(out, w + 'x' + h + '.png') });
    console.log(demo || w + 'x' + h, e.length ? e.slice(0, 4) : 'ok'); await p.close();
  }
  await b.close();
})();
