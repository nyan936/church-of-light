import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('.', import.meta.url));
const read = (p) => fs.readFileSync(base + p, 'utf8');
const guard = (s) => s.replace(/<\/script/gi, '<\\/script');
let three = guard(read('vendor/three.min.js'));
const parts = ['src/00-core.js', 'src/10-world.js', 'src/20-app.js'].map((p) => guard(read(p))).join('\n');
const page = read('src/page.html')
  .replace('/*__THREE__*/', () => three)
  .replace('/*__APP__*/', () => parts);
const out = base + 'Church-of-the-Light.html';
fs.writeFileSync(out, page);
/* same file as index.html, so GitHub Pages serves it at the repo root */
fs.writeFileSync(base + 'index.html', page);
console.log('built', out, 'and index.html', (page.length / 1024).toFixed(0) + ' KB');
