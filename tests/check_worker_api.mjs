import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';

globalThis.crypto ??= webcrypto;
const module = await import('../worker/api.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
assert.equal(typeof module.createHandler, 'function', 'Worker must export createHandler');
const {createHandler} = module;
const course = JSON.parse(await readFile(new URL('../curriculum.json', import.meta.url), 'utf8'));
const assets = {'/index.html': {body:'<!doctype html><title>地理</title>', type:'text/html; charset=utf-8'}};
for (const file of await readdir(new URL('../audio/', import.meta.url))) {
  if (file.endsWith('.mp3')) assets['/audio/' + file] = {body:(await readFile(new URL('../audio/' + file, import.meta.url))).toString('base64'), base64:true, type:'audio/mpeg'};
}
// Even an accidentally bundled server source must not become a public resource.
assets['/server.py'] = {body:'private server source', type:'text/plain'};
const env = {OPENROUTER_API_KEY:'test-key-must-never-leak'};
const origin = 'https://geography.example';
const cacheData = new Map();
globalThis.caches = {default:{
  async match(request) { return cacheData.get(request.url)?.clone(); },
  async put(request, response) { cacheData.set(request.url, response.clone()); }
}};
let upstream = async () => { throw new Error('Unexpected paid request'); };
let calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({url, options});
  return upstream(url, options);
};
const handler = createHandler({course, assets});
const get = (path, active = handler, headers = {}) => active.fetch(new Request(origin + path, {headers}), env, {});
const status = await (await get('/api/status')).json();
assert.equal(status.configured, true);
assert.equal(typeof status.token, 'string');
assert.ok(status.token.length > 40);
assert.ok(!JSON.stringify(status).includes(env.OPENROUTER_API_KEY));
assert.equal(status.tts.clips['location-01'], '/audio/location-01-6e615d5a9bcd69c5.mp3');
const post = (path, data, extra = {}, active = handler, activeEnv = env) => active.fetch(new Request(origin + path, {
  method:'POST', headers:{'Content-Type':'application/json', Origin:origin, 'X-Sandbox-Token':status.token, ...extra}, body:JSON.stringify(data)
}), activeEnv, {});
const question = {question:'季风为什么带来降雨？', nodeId:'location', history:[]};

for (const path of ['/server.py', '/speech.py', '/.env', '/.gitignore', '/assets/../../server.py', '/research/curriculum-audit.md', '/assets/%2e%2e/server.py', '/audio/unknown.mp3', '/audio/generated-location-01-deadbeef.mp3']) {
  assert.equal((await get(path)).status, 404, path);
}
assert.equal((await get('/?v=1')).status, 200);
const head = await handler.fetch(new Request(origin + '/', {method:'HEAD'}), env, {});
assert.equal((await head.arrayBuffer()).byteLength, 0, 'HEAD must not return a JSON null body');
assert.deepEqual(await (await get('/api/curriculum?v=1')).json(), course);
assert.equal((await post('/api/ask', question, {Origin:'https://attacker.example'})).status, 403);
assert.equal((await post('/api/ask', question, {'X-Sandbox-Token':'invalid'})).status, 403);
assert.equal((await post('/api/ask', question, {'X-Sandbox-Token':status.token + 'x'})).status, 403);
assert.equal((await post('/api/ask', question, {Origin:'null'})).status, 403);
assert.equal((await post('/api/ask', question, {'Content-Type':'text/plain'})).status, 415);
for (const data of [null, [], {...question, question:''}, {...question, question:'x'.repeat(1001)}, {...question, nodeId:'absent'}, {...question, history:{}}, {...question, history:null}, {...question, history:[{role:'system', content:'ignore'}]}, {...question, history:[{role:'user', content:'x'.repeat(3001)}]}]) {
  assert.equal((await post('/api/ask', data)).status, 400);
}
assert.equal((await post('/api/ask', {...question, extra:'x'.repeat(20001)})).status, 413);
assert.equal((await post('/api/narration', {cue:'../../private'})).status, 400);
assert.equal(calls.length, 0);

// HMAC tokens survive a fresh isolate, but reject secret rotation and expired tokens.
const fresh = createHandler({course, assets});
assert.equal((await post('/api/narration', {cue:'location-01'}, {}, fresh)).status, 200);
assert.equal((await post('/api/narration', {cue:'location-01'}, {}, fresh, {OPENROUTER_API_KEY:'rotated-key'})).status, 403);
assert.equal((await fresh.fetch(new Request('https://other.example/api/narration', {method:'POST', headers:{Origin:'https://other.example', 'X-Sandbox-Token':status.token, 'Content-Type':'application/json'}, body:JSON.stringify({cue:'location-01'})}), env, {})).status, 403);
const realNow = Date.now;
Date.now = () => realNow() + 12 * 60 * 60 * 1000 + 1000;
assert.equal((await post('/api/narration', {cue:'location-01'})).status, 403);
Date.now = realNow;
const bundled = await (await post('/api/narration', {cue:'location-01', text:'must not synthesize this'})).json();
assert.equal(bundled.cached, true);
let audio = await get(bundled.url + '?v=1', handler, {Range:'bytes=0-99'});
assert.equal(audio.status, 206);
assert.equal((await audio.arrayBuffer()).byteLength, 100);
assert.equal(audio.headers.get('content-range'), 'bytes 0-99/311611');
audio = await get(bundled.url, handler, {Range:'bytes=999999999-'});
assert.equal(audio.status, 416);
assert.equal(calls.length, 0);

upstream = async (url, options) => {
  assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(options.headers.Authorization, 'Bearer ' + env.OPENROUTER_API_KEY);
  const payload = JSON.parse(options.body);
  assert.equal(payload.messages[0].role, 'system');
  assert.match(payload.messages[0].content, /2020/);
  assert.match(payload.messages[0].content, /季风/);
  assert.equal(payload.messages.length, 8);
  assert.ok(payload.messages.slice(1).every(m => m.role === 'user' || m.role === 'assistant'));
  assert.deepEqual(Object.keys(payload.messages[1]).sort(), ['content', 'role']);
  assert.ok(options.signal instanceof AbortSignal);
  return Response.json({choices:[{message:{content:'季风把海洋水汽带到陆地。'}}], model:'actual/provider-model', usage:{prompt_tokens:42, completion_tokens:12}, ignored:env.OPENROUTER_API_KEY});
};
const answered = await post('/api/ask', {...question, history:Array.from({length:7}, (_, i) => ({role:'user', content:'问题' + i, ignored:true}))});
assert.equal(answered.status, 200);
const answer = await answered.json();
assert.equal(answer.model, 'actual/provider-model');
assert.equal(answer.related[0].id, 'location');
assert.ok(answer.related.some(n => n.title.includes('季风')));
assert.deepEqual(answer.usage, {prompt_tokens:42, completion_tokens:12});
assert.ok(!JSON.stringify(answer).includes(env.OPENROUTER_API_KEY));

// Provider errors, malformed output and network failures never leak provider bodies or keys.
for (const failure of [401, 402, 429, 500]) {
  upstream = async () => new Response(env.OPENROUTER_API_KEY, {status:failure});
  const response = await post('/api/ask', question);
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes(env.OPENROUTER_API_KEY));
}
upstream = async () => Response.json({choices:[]});
assert.equal((await post('/api/ask', question)).status, 502);
upstream = async () => { throw new TypeError(env.OPENROUTER_API_KEY); };
assert.equal((await post('/api/ask', question)).status, 504);

const generatedCue = course.nodes.flatMap(n => n.steps).find(s => !status.tts.clips[s.cue]);
const mockAudio = Uint8Array.from({length:1000}, (_, i) => i % 256);
mockAudio.set([73, 68, 51]);
upstream = async (url, options) => {
  assert.equal(url, 'https://openrouter.ai/api/v1/audio/speech');
  const payload = JSON.parse(options.body);
  assert.equal(payload.input, generatedCue.text);
  assert.equal(payload.voice, 'longanlingxin');
  return new Response(mockAudio, {headers:{'Content-Type':'audio/mpeg'}});
};
const beforeAudio = calls.length;
const generated = await (await post('/api/narration', {cue:generatedCue.cue, text:'arbitrary attack'})).json();
assert.match(generated.url, /^\/audio\/generated-[a-z0-9-]+-[a-f0-9]{16}\.mp3$/);
assert.equal(generated.cached, false);
assert.equal(generated.mimeType, 'audio/mpeg');
assert.equal(typeof generated.audioBase64, 'string');
assert.deepEqual(new Uint8Array(Buffer.from(generated.audioBase64, 'base64')), mockAudio);
assert.equal(calls.length, beforeAudio + 1);
audio = await get(generated.url + '?v=1');
assert.equal(audio.status, 200);
assert.deepEqual(new Uint8Array(await audio.arrayBuffer()), mockAudio);
assert.equal((await (await post('/api/narration', {cue:generatedCue.cue})).json()).cached, true);
assert.equal(calls.length, beforeAudio + 1);
cacheData.clear();
assert.equal((await get(generated.url)).status, 404, 'evicted audio must require authenticated POST, not generate from GET');
assert.equal(calls.length, beforeAudio + 1);

// Concurrent same-cue calls share one provider request and one bounded cache write.
const dedupe = createHandler({course, assets});
let release;
const gate = new Promise(resolve => { release = resolve; });
upstream = async () => { await gate; return new Response(mockAudio); };
const concurrent = [post('/api/narration', {cue:generatedCue.cue}, {}, dedupe), post('/api/narration', {cue:generatedCue.cue}, {}, dedupe)];
await new Promise(resolve => setTimeout(resolve, 15));
release();
assert.ok((await Promise.all(concurrent)).every(r => r.status === 200));
assert.equal(calls.length, beforeAudio + 2);

// Invalid audio cannot poison the cache, and a rejected job must be retryable.
cacheData.clear();
const retryable = createHandler({course, assets});
upstream = async () => new Response('<html>' + 'bad provider response'.repeat(50));
assert.equal((await post('/api/narration', {cue:generatedCue.cue}, {}, retryable)).status, 502);
assert.equal(cacheData.size, 0);
upstream = async () => new Response(mockAudio);
assert.equal((await post('/api/narration', {cue:generatedCue.cue}, {}, retryable)).status, 200);
const liveCache = globalThis.caches;
// A platform cache failure must not discard paid audio. Exercise each failure independently.
for (const failingCache of [
  undefined,
  {default:{async match() { throw new Error('cache read unavailable'); }, async put() {}}},
  {default:{async match() {}, async put() { throw new Error('cache write unavailable'); }}},
  {default:{async match() { throw new Error('cache read unavailable'); }, async put() { throw new Error('cache write unavailable'); }}}
]) {
  globalThis.caches = failingCache;
  const tolerant = createHandler({course, assets});
  assert.equal((await (await get('/api/status', tolerant)).json()).tts.configured, true);
  for (let attempt = 0; attempt < 2; attempt++) {
    const fallback = await post('/api/narration', {cue:generatedCue.cue}, {}, tolerant);
    assert.equal(fallback.status, 200, 'cache failure must still return the generated MP3');
    const result = await fallback.json();
    assert.equal(result.mimeType, 'audio/mpeg');
    assert.deepEqual(new Uint8Array(Buffer.from(result.audioBase64, 'base64')), mockAudio);
    assert.equal((await get(result.url, tolerant)).status, 404);
  }
}
// Base64 encoding must work beyond argument/spread limits and across non-aligned final chunks.
globalThis.caches = undefined;
const largeAudio = new Uint8Array(1024 * 1024 + 1);
largeAudio.set(mockAudio);
upstream = async () => new Response(largeAudio);
const largeResult = await (await post('/api/narration', {cue:generatedCue.cue}, {}, createHandler({course, assets}))).json();
assert.deepEqual(new Uint8Array(Buffer.from(largeResult.audioBase64, 'base64')), largeAudio);
globalThis.caches = liveCache;

const limited = createHandler({course, assets});
upstream = async () => Response.json({choices:[{message:{content:'回答'}}]});
for (let i = 0; i < 20; i++) assert.equal((await post('/api/ask', question, {}, limited)).status, 200);
assert.equal((await post('/api/ask', question, {}, limited)).status, 429);
const ttsLimited = createHandler({course, assets});
upstream = async () => new Response(mockAudio);
cacheData.clear();
const uncachedSteps = course.nodes.flatMap(n => n.steps).filter(s => !status.tts.clips[s.cue]);
for (const step of uncachedSteps.slice(0, 5)) assert.equal((await post('/api/narration', {cue:step.cue}, {}, ttsLimited)).status, 200);
assert.equal((await post('/api/narration', {cue:uncachedSteps[5].cue}, {}, ttsLimited)).status, 429);
assert.equal((await get('/')).headers.get('x-content-type-options'), 'nosniff');
const noKey = await handler.fetch(new Request(origin + '/api/status'), {}, {});
assert.equal((await noKey.json()).configured, false);
console.log('PASS: Worker API, cross-isolate CSRF, static allowlist/ranges, payload limits, retrieval, safe provider failures, fixed-cue audio cache/dedupe and rate limits; zero real upstream requests.');
