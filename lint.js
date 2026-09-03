/* 호출하는데 정의가 없는 함수를 찾는다 */
const fs=require('fs');
const O=['00-data.js','10-engine.js','15-audio.js','20-state.js','30-combat.js',
         '40-step.js','50-render.js','60-ui.js','62-train.js','65-save.js','70-main.js'];
const code=O.map(f=>fs.readFileSync(__dirname+'/src/'+f,'utf8')).join('\n');
// 정의된 이름
const defined=new Set();
for(const m of code.matchAll(/function\s+(\w+)/g)) defined.add(m[1]);
for(const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g)) defined.add(m[1]);
// 내장·브라우저 것
const builtin=new Set(['Math','Object','Array','JSON','String','Number','Boolean','Date',
 'Image','Audio','parseInt','parseFloat','isNaN','setTimeout','setInterval','clearTimeout',
 'requestAnimationFrame','addEventListener','console','document','window','performance','clearInterval',
 'navigator','AudioContext','webkitAudioContext','Set','Map','Promise','Error','ErrorEvent',
 'if','for','while','switch','return','catch','function','typeof','new']);
const missing=new Set();
for(const m of code.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g)){
  if(/^rgba?$|^gradient$/.test(m[1])) continue;
  const n=m[1];
  if(defined.has(n)||builtin.has(n)) continue;
  // 메서드 호출은 앞에 점이 있다
  const i=m.index;
  if(i>0 && code[i-1]==='.') continue;
  missing.add(n);
}
if(missing.size) console.log('정의 없는 호출:', [...missing].join(', '));
else console.log('정의 없는 호출: 없음');
// 렌더 함수가 다 있는지
const need=['drawAura','drawShots','drawSweep','drawSummon','drawIntro','drawIntroText',
            'drawBossBar','drawQi','drawFoe','drawHero','drawFx','drawGround',
            'castFoe','shootFoe','spawnFoe','spawnBoss','beginSummon','advanceStage'];
const gone=need.filter(n=>!code.includes('function '+n+'('));
console.log('빠진 필수 함수:', gone.length?gone.join(', '):'없음');
