// Free, backend-free distribution. Only this allowlist is ever published.
import {readFile, writeFile, mkdir, readdir, copyFile, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(root, 'dist/pages');
const course = JSON.parse(await readFile(path.join(root, 'curriculum.json'), 'utf8'));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root, encoding:'utf8'}).trim();
const clips = {};
const names = ['styles.css', 'app.js', 'renderer.js', 'geo.js', 'labs.js', 'curriculum.json'];
const availableAudio = new Set(await readdir(path.join(root, 'audio')));
for (const step of course.nodes.flatMap(n => n.steps)) {
  // Match the current narration text/model/voice so an old recording is never mislabeled.
  const hash = createHash('sha256').update(['qwen/qwen-audio-3.0-tts-plus', 'longanlingxin', step.text].join('\n')).digest('hex').slice(0,16);
  const name = `${step.cue}-${hash}.mp3`;
  if (availableAudio.has(name)) {
    names.push('audio/' + name);
    clips[step.cue] = './audio/' + name;
  }
}
const clipCount = Object.keys(clips).length;
if (!clipCount) throw new Error('No current narration clips found');
const apiBase = process.env.PAGES_FAMILY_API || '';
if (apiBase && apiBase !== 'https://china-geography-8a-chrisopal.chrisxie.chatgpt.site') throw new Error('Unexpected family API origin');
const config = {configured:false, apiBase, tts:{configured:false, clips}};
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace('<div class="lesson-heading">', `<div class="lesson-heading"><p class="static-notice">免费公开学习版 · 地图、课程与练习可直接使用。已备好 ${clipCount} 段配音；AI 问答与新配音生成暂不提供。</p>`);
html = html.replace('老师会结合你正在看的知识点讲解，也可以陪你继续追问。', '公开版不提供 AI 问答。你可以阅读三段讲解、查看易错点，或到“想一想”检验理解。');
html = html.replace('正在连接问答服务…', '免费公开学习版 · 不提供 AI 问答与新配音生成');
html = html.replace('id="suggested-questions"', 'id="suggested-questions" hidden');
html = html.replace('id="ask-input" rows=', 'id="ask-input" disabled rows=');
html = html.replace('id="ask-send" type=', 'id="ask-send" disabled type=');
html = html.replace('AI 辅助讲解 · 结合沙盘验证', 'AI 问答暂不提供');
html = html.replace('id="clear-chat"', 'id="clear-chat" hidden');
html = html.replace('课程支持按需生成中文 AI 配音并缓存生成结果。也可导出讲稿交给你喜欢的 TTS，再把音频命名为讲稿中的 cue ID（例如 <code>知识点ID-01.mp3</code>），批量导入。课程会自动匹配到每一段画面。', '免费公开版提供已准备好的固定配音，不提供新配音生成。你可以导出讲稿，再把自己准备好的音频按 cue ID（例如 <code>location-01.mp3</code>）命名并批量导入。');
html = html.replace('导入的音频优先于 AI 配音，保存在当前浏览器。AI 配音只发送这段讲稿给语音服务；本机版缓存于项目目录；在线版新生成的音频保存在当前浏览器，也可使用临时边缘缓存。清理浏览器数据后可能需要重新生成。', '导入的音频优先于已有配音，仅保存在当前浏览器，不会上传。清理浏览器数据后需重新导入；已有配音仍可在线播放。');
if (apiBase) {
  html = html.replace('AI 问答与新配音生成暂不提供。', '家庭问答需访问码；配音只播放固定录音。')
    .replace('公开版不提供 AI 问答。你可以阅读三段讲解、查看易错点，或到“想一想”检验理解。', '输入家庭访问码后，老师会结合当前知识点回答。每天额度用完后仍可阅读课程和做练习。')
    .replace('id="ask-input" disabled', 'id="ask-input"').replace('id="ask-send" disabled', 'id="ask-send"')
    .replace('AI 问答暂不提供', '家庭问答 · 每日限额');
}
html = html.replace('<script src="geo.js">', `<script>window.GEOGRAPHY_STATIC=${JSON.stringify(config)};</script><script src="geo.js">`);
await rm(out, {recursive:true, force:true});
await mkdir(path.join(out, 'audio'), {recursive:true});
for (const name of names) await copyFile(path.join(root, name), path.join(out, name));
await writeFile(path.join(out, 'index.html'), html);
await writeFile(path.join(out, '.nojekyll'), '');
await writeFile(path.join(out, 'styles.css'), (await readFile(path.join(out, 'styles.css'), 'utf8')) + '\n.static-notice{font-size:11px;line-height:1.7;color:var(--mint);padding:9px 12px;margin-bottom:14px;border:1px solid var(--line);border-radius:8px;background:var(--panel)}\n');
await writeFile(path.join(out, 'deployment.json'), JSON.stringify({sourceCommit,mode:'free-static',nodes:course.nodes.length,bundledAudio:Object.keys(clips),ai:!!apiBase,ttsGeneration:false}, null, 2)+'\n');
console.log(JSON.stringify({output:out,sourceCommit,nodes:course.nodes.length,bundledAudio:Object.keys(clips),backend:false}));
