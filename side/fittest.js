// 가로판 화면 맞춤 검사 — 크로뮴 실기. 기기 크기마다 패널 아래가 잘리지 않는지 (`node fittest.js`, 뒤에 아무 글자나 붙이면 review/side/ 에 찍는다)
const { chromium } = require('playwright-core'), path = require('path');
let bad = 0;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  for (const [w, h] of [[390, 844], [390, 700], [390, 640], [360, 600], [320, 568], [430, 932], [820, 1180], [1280, 720]]){
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(__dirname, 'dist', 'side.html')); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const g = id => document.getElementById(id).getBoundingClientRect(), a = g('app'), pn = g('panel'), f = g('foot'), t = g('train'), em = parseFloat(getComputedStyle(document.getElementById('app')).fontSize);
      return { appW: Math.round(a.width), scene: Math.round(g('scene').height), panel: Math.round(pn.height), trainBottom: Math.round(t.bottom), footH: Math.round(f.height), footBottom: Math.round(f.bottom), winH: innerHeight, needEm: +((t.bottom - pn.top + f.height) / em + 0.95 + 0.8).toFixed(2), VH }; });
    console.log(w + 'x' + h, JSON.stringify(r), r.footBottom > h ? (bad++, '★ 잘림 ') + (r.footBottom - h) + 'px' : 'ok');
    if (process.argv[2]) await p.screenshot({ path: path.join(__dirname, '..', 'review', 'side', 'fit_') + w + 'x' + h + '.png' });
    await p.close();
  }
  await b.close();
  console.log(bad ? '★ 실패 ' + bad + '건' : '통과'); process.exit(bad ? 1 : 0);
})();
