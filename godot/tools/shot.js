// 크로뮴 실기 — 내보낸 웹 빌드(dist/)를 기기 크기별로 찍는다. 먼저 `cd dist && python3 -m http.server 8770`
// node tools/shot.js [기다릴 초]  → ../review/godot/<폭>x<높이>.png
const { chromium } = require('playwright-core'), path = require('path'), fs = require('fs');
const out = path.join(__dirname, '..', '..', 'review', 'godot'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const wait = (+process.argv[2] || 14) * 1000;
  for (const [w, h, dpr] of [[390, 844, 2], [390, 700, 1], [360, 600, 1], [820, 1180, 1], [1280, 720, 1]]){
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); const e = [];
    p.on('pageerror', x => e.push(x.message)); p.on('console', m => { if (m.type() === 'error') e.push(m.text().slice(0, 200)); });
    await p.goto('http://localhost:8770/index.html'); await p.waitForTimeout(wait);
    await p.screenshot({ path: path.join(out, w + 'x' + h + '.png') }); console.log(w + 'x' + h, e.length ? e.slice(0, 3) : 'ok'); await p.close();
  }
  await b.close();
})();
