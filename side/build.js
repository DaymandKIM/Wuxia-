// 가로판 빌드 — src/*.js + 필요한 그림만 → dist/side.html (한 파일)
const fs = require('fs'), path = require('path');
const D = __dirname, A = path.join(D, '..', 'assets');
const files = fs.readdirSync(path.join(D, 'src')).filter(f => f.endsWith('.js')).sort();
const data = fs.readFileSync(path.join(D, 'src', files[0]), 'utf8');
const keys = new Function(data + '; return assetKeys();')();
const miss = keys.filter(k => !fs.existsSync(path.join(A, k + '.png')));
if (miss.length){ console.error('★ 없는 그림: ' + miss.join(', ')); process.exit(1); }
let bytes = 0;
const asset = {}; for (const k of keys){ const b = fs.readFileSync(path.join(A, k + '.png')); bytes += b.length; asset[k] = 'data:image/png;base64,' + b.toString('base64'); }
const ver = (fs.readFileSync(path.join(D, 'VERSION.md'), 'utf8').match(/^#\s*(.+)$/m) || [, '가로판'])[1].split('—')[0].trim();
const code = 'const GAME_VER = ' + JSON.stringify(ver) + ';\nconst ASSET = ' + JSON.stringify(asset) + ';\n' +
  files.map(f => '// ── ' + f + '\n' + fs.readFileSync(path.join(D, 'src', f), 'utf8').replace(/^"use strict";\n/, '')).join('\n');
const out = fs.readFileSync(path.join(D, 'shell.html'), 'utf8').replace('/*__CODE__*/', () => '"use strict";\n' + code);
fs.mkdirSync(path.join(D, 'dist'), { recursive: true });
fs.writeFileSync(path.join(D, 'dist', 'side.html'), out);
console.log(ver + ' · 그림 ' + keys.length + '장 ' + (bytes / 1024 | 0) + 'KB → dist/side.html ' + (out.length / 1024 | 0) + 'KB');
