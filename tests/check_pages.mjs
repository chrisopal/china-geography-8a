// Validate the actual static output, including its project-subpath resource graph.
import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../dist/pages/', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const html = await read('index.html');
const config = JSON.parse(html.match(/window\.GEOGRAPHY_STATIC=(.*?);<\/script>/)[1]);
assert.equal(config.configured, false);
assert.equal(config.tts.configured, false);
assert.ok(Object.keys(config.tts.clips).length >= 3);
assert.match(html, /id="ask-input" disabled/);
assert.match(html, /id="ask-send" disabled/);
assert.match(html, /免费公开学习版/);
assert.match(html, /不提供新配音生成/);
const base = new URL('https://example.test/china-geography-8a/');
const resources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('data:') && u !== './');
resources.push('./curriculum.json', ...Object.values(config.tts.clips));
for (const resource of resources) {
  const url = new URL(resource, base);
  assert.equal(url.origin, base.origin);
  assert.ok(url.pathname.startsWith(base.pathname), `Escapes project path: ${resource}`);
  assert.ok((await stat(new URL(resource, root))).size > 0);
}
const allowed = new Set(['.nojekyll','index.html','styles.css','app.js','renderer.js','geo.js','labs.js','curriculum.json','audio','deployment.json']);
for (const name of await readdir(root)) assert.ok(allowed.has(name), `Unexpected deployment file: ${name}`);
const app = await read('app.js');
assert.match(app, /fetch\('\.\/curriculum.json'\)/);
assert.match(app, /fetch\(apiUrl\('\/api\/status'\)/);
const context = {window:{}};
vm.runInNewContext(await read('geo.js'), context);
assert.equal(context.window.CHINA_PROVINCES.length, 34);
const course = JSON.parse(await read('curriculum.json'));
assert.equal(course.nodes.length, 81);
assert.equal(course.nodes.flatMap(n => n.steps).length, 243);
console.log(JSON.stringify({nodes:81,steps:243,provinces:34,bundledAudio:3,subpathResources:resources.length,noBackend:true}));
