/* The browser holds learning progress and optional audio, never a provider credential. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const KEY = 'china-geography-8a-v1';
  const sceneMeta = {
    china: ['中国地理沙盘', '地形 / 专题显示强度', '拖动、缩放或点击省区，比较空间位置。高度与色彩均为教学示意。', '平缓 / 弱', '起伏 / 强'],
    monsoon: ['季风观察台', '冬季风 → 夏季风', '对照风向与降雨：这是一组季节情境，不是天气预报或月份刻度。', '冬季风', '夏季风'],
    river: ['流域与泥沙实验', '流域植被覆盖', '控制其他条件相同，观察植被增加时的地表冲刷与泥沙变化。', '植被稀少', '植被茂密'],
    land: ['土地利用实验', '坡地保护程度', '观察保护坡地后，耕作、植被与径流之间的关系。', '缺少保护', '合理保护'],
    resources: ['能源选择实验', '可再生能源占比', '比较两种能源组合：示意占比可调，不能当作全国实际数据。', '传统能源', '可再生能源'],
    transport: ['运输方式比较', '选择运输方式', '依次选择公路、铁路、水运。综合比较路线条件和货物需求。', '公路', '水运'],
    ecology: ['流域修复实验', '流域修复投入', '沿上游到下游观察修复效果。数值是教学指数，非工程预测。', '少', '多']
  };
  let course, current, scene, stepIndex = 0, tab = 'explain', toastTimer, api = {}, db, audioUrl, audioTicket = 0;
  const serverClips = {};
  let history = [], chatBusy = false, challenge = null, interactionChoice = null, quizChoice = null;
  const audioIds = new Set();
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { /* Start fresh if storage is malformed. */ }
  const state = {
    visited: Array.isArray(saved.visited) ? saved.visited : [],
    interactionPassed: Array.isArray(saved.interactionPassed) ? saved.interactionPassed : [],
    quizPassed: Array.isArray(saved.quizPassed) ? saved.quizPassed : [],
    notes: Array.isArray(saved.notes) ? saved.notes.filter(n => n && typeof n.text === 'string' && typeof n.title === 'string').slice(-200) : [],
    provincePassed: Array.isArray(saved.provincePassed) ? saved.provincePassed : []
  };
  const mastered = id => state.interactionPassed.includes(id) && state.quizPassed.includes(id);
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3600); }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify({...state, lastNode: current?.id})); } catch (_) { toast('浏览器存储已满，请先导出学习记录。'); } }
  function addUnique(list, value) { if (!list.includes(value)) list.push(value); }
  function download(filename, contents, type = 'text/plain;charset=utf-8') { const u = URL.createObjectURL(new Blob([contents], {type})); const a = el('a'); a.href = u; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
  function switchTab(next) {
    tab = next;
    for (const name of ['explain', 'quiz', 'ask']) { $(`tab-${name}`).setAttribute('aria-selected', String(name === next)); $(`panel-${name}`).hidden = name !== next; }
  }
  function updateProgress() {
    const count = course.nodes.filter(n => mastered(n.id)).length;
    const percent = Math.round(count / course.nodes.length * 100);
    $('progress-label').textContent = `${count} / ${course.nodes.length} 站练习通过`;
    $('progress-percent').textContent = percent + '%'; $('progress-bar').style.width = percent + '%';
    document.querySelectorAll('.node-button').forEach(b => { b.classList.toggle('mastered', mastered(b.dataset.node)); b.classList.toggle('active', b.dataset.node === current?.id); b.setAttribute('aria-current', b.dataset.node === current?.id ? 'true' : 'false'); });
  }
  function renderNav() {
    const query = $('search').value.trim().toLowerCase();
    const nav = $('curriculum-nav'); nav.replaceChildren();
    let matches = 0;
    for (let i = 0; i < course.chapters.length; i++) {
      const ch = course.chapters[i];
      const nodes = course.nodes.filter(n => n.chapter === ch.id && (!query || [n.title, n.question, n.summary, ...(n.keywords || [])].join(' ').toLowerCase().includes(query)));
      if (!nodes.length) continue;
      matches += nodes.length;
      const details = el('details', 'chapter'); details.open = Boolean(query) || ch.id === current?.chapter;
      const summary = el('summary'); summary.append(el('span', 'chapter-number', String(i + 1).padStart(2, '0')), el('span', '', ch.title.replace(/^第.章\s*/, '')), el('span', 'count', nodes.length)); details.append(summary);
      for (const section of ch.sections) {
        const subset = nodes.filter(n => n.section === section.id); if (!subset.length) continue;
        details.append(el('div', 'section-title', section.title));
        subset.forEach(n => { const b = el('button', 'node-button'); b.dataset.node = n.id; b.append(el('span', 'state-dot'), el('span', '', n.title)); b.onclick = () => selectNode(n.id); details.append(b); });
      }
      nav.append(details);
    }
    if (!matches) nav.append(el('p', 'empty-search', '没有找到这个词。试试“季风”“水资源”，也可以向老师提问。'));
    updateProgress();
  }
  function renderMetrics() {
    const metrics = scene.getState().metrics || [];
    const list = Array.isArray(metrics) ? metrics : Object.entries(metrics).map(([label, value]) => ({label, value}));
    $('metrics').replaceChildren(...list.slice(0, 3).map(m => { const d = el('div', 'metric'); d.append(el('span', '', m.label), el('strong', '', `${m.value}${m.unit || ''}`)); return d; }));
  }
  function updateParameter(value) { value = Math.max(0, Math.min(100, Number(value))); $('parameter').value = value; $('parameter-value').value = current?.scene === 'transport' ? (value < 34 ? '公路' : value < 67 ? '铁路' : '水运') : String(value); scene.setOptions({parameter: value}); renderMetrics(); }
  function setupScene() {
    const isWatershed = current.id === 'river-system';
    const meta = isWatershed ? ['水系与分水岭', '转动观察两侧汇流', '追踪两条支流汇入干流，再沿金色山脊线比较两侧水流方向。', '', ''] : sceneMeta[current.scene] || sceneMeta.china;
    document.querySelector('.slider-control').hidden = isWatershed;
    document.querySelector('.slider-row').classList.toggle('observation-only', isWatershed);
    scene.setScene(current.scene); scene.setOptions({layer: current.layer, parameter: 50, focus: current.id});
    $('layer').value = current.layer; $('layer').disabled = current.scene !== 'china';
    $('scene-name').textContent = meta[0]; $('parameter-label').textContent = meta[1]; $('parameter-hint').textContent = meta[2]; $('parameter-min').textContent = meta[3]; $('parameter-max').textContent = meta[4];
    $('parameter').setAttribute('aria-label', meta[1]); updateParameter(50);
    $('model-note').textContent = current.scene === 'china' ? '教学示意 · 地形非实测高程' : '教学模拟 · 数值不代表实测';
  }
  function selectNode(id) {
    const node = course.nodes.find(n => n.id === id); if (!node) return;
    stopAudio(); current = node; stepIndex = 0; interactionChoice = null; quizChoice = null; challenge = null;
    $('province-info').hidden = true; $('challenge-info').hidden = true;
    addUnique(state.visited, id); persist();
    const chapter = course.chapters.find(c => c.id === node.chapter), section = chapter.sections.find(s => s.id === node.section);
    $('breadcrumb').textContent = `${chapter.title} / ${section.title}`;
    $('lesson-title').textContent = node.title; $('lesson-question').textContent = node.question;
    $('node-index').textContent = String(course.nodes.indexOf(node) + 1).padStart(2, '0'); $('node-total').textContent = '/ ' + course.nodes.length;
    $('summary').textContent = node.summary; $('misconception').textContent = node.misconception;
    $('edition-note').textContent = course.editionNote;
    $('sources').replaceChildren(...node.sources.map(id => course.sources.find(s => s.id === id)).filter(Boolean).map(s => { const a = el('a', '', `${s.title} ↗`); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }));
    $('related-nodes').replaceChildren(...node.related.slice(0, 3).map(id => course.nodes.find(n => n.id === id)).filter(Boolean).map(n => { const b = el('button', '', n.title + ' ↗'); b.onclick = () => selectNode(n.id); return b; }));
    $('suggested-questions').replaceChildren(...[node.question, `能用生活中的例子解释“${node.title}”吗？`, `这个知识点和${course.nodes.find(n => n.id === node.related[0])?.title || '自然环境'}有什么联系？`].map(q => { const b = el('button', '', q); b.onclick = () => { $('ask-input').value = q; $('ask-input').focus(); }; return b; }));
    $('note-topic').textContent = `当前探索：${node.title}`;
    setupScene(); renderStep(); renderInteraction(); renderQuiz(); renderNav(); switchTab('explain');
    window.GeographyLabs.mount(node, $('mini-lab-host'));
    $('sidebar').classList.remove('open');
    const active = document.querySelector('.node-button.active'); if (active && !$('search').value) active.scrollIntoView({block:'nearest'});
  }
  function renderStep() {
    const step = current.steps[stepIndex];
    $('step-number').textContent = `观察 ${String(stepIndex + 1).padStart(2, '0')} / ${String(current.steps.length).padStart(2, '0')}`;
    $('step-title').textContent = step.title; $('step-text').textContent = step.text;
    $('step-prev').disabled = stepIndex === 0; $('step-next').disabled = stepIndex === current.steps.length - 1;
    $('step-dots').replaceChildren(...current.steps.map((_, i) => { const b = el('button', i === stepIndex ? 'active' : ''); b.setAttribute('aria-label', `讲解第 ${i + 1} 段`); b.setAttribute('aria-pressed', String(i === stepIndex)); b.onclick = () => { stopAudio(); stepIndex = i; renderStep(); }; return b; }));
    const imported = audioIds.has(step.cue), cached = Boolean(serverClips[step.cue]);
    $('play-narration').disabled = false;
    $('play-narration').textContent = imported || cached ? '▷ 播放讲解' : api.tts?.configured ? '▷ 生成并播放讲解' : '♫ 导入正式配音';
    $('audio-status').textContent = imported ? `浏览器已保存配音 · ${step.cue}` : cached ? 'AI 配音已缓存 · 可反复播放' : api.tts?.configured ? '中文 AI 配音 · 首次点击生成，之后直接播放' : '可先阅读讲解，或导入自己的配音';
    $('guide-status').textContent = `第 ${stepIndex + 1} 段 / 共 ${current.steps.length} 段 · 随时可以追问`;
  }
  function renderInteraction() {
    const interaction = current.interaction;
    $('interaction-prompt').textContent = interaction.prompt;
    $('interaction-feedback').textContent = state.interactionPassed.includes(current.id) ? '这道动手题已经通过。可以换一种选择，继续观察。' : '先做出你的判断，再看解释。';
    $('interaction-feedback').className = 'feedback';
    $('interaction-options').replaceChildren(...interaction.options.map((o, i) => { const b = el('button', '', o.label); b.onclick = () => {
      interactionChoice = i;
      if (interaction.affectsScene === true) updateParameter(o.value);
      [...$('interaction-options').children].forEach((x, j) => { x.classList.toggle('selected', i === j); x.classList.toggle('correct', i === j && i === interaction.answer); });
      const correct = i === interaction.answer;
      $('interaction-feedback').textContent = (correct ? '理解正确。' : '再想一步。') + o.feedback;
      $('interaction-feedback').className = 'feedback' + (correct ? ' success' : '');
      if (correct) { addUnique(state.interactionPassed, current.id); persist(); updateProgress(); }
    }; return b; }));
  }
  function renderQuiz() {
    $('quiz-question').textContent = current.quiz.question; $('quiz-feedback').textContent = ''; $('quiz-feedback').className = 'quiz-feedback'; $('retry-quiz').hidden = true;
    $('quiz-options').replaceChildren(...current.quiz.options.map((text, i) => { const b = el('button'); b.append(el('span', 'option-letter', String.fromCharCode(65 + i)), el('span', '', text)); b.onclick = () => {
      quizChoice = i; const correct = i === current.quiz.answer;
      [...$('quiz-options').children].forEach((x, j) => { x.classList.toggle('selected', i === j); x.classList.toggle('correct', i === j && correct); });
      $('quiz-feedback').textContent = (correct ? '答对了。' : '这个选项还不够准确。') + current.quiz.explanation;
      $('quiz-feedback').className = 'quiz-feedback' + (correct ? ' success' : ''); $('retry-quiz').hidden = correct;
      if (correct) { addUnique(state.quizPassed, current.id); persist(); updateProgress(); if (mastered(current.id)) toast('这一站的两道练习都通过了！'); else toast('思考题通过，再完成沙盘下方的动手题。'); }
    }; return b; }));
  }
  function nextLesson() { const i = course.nodes.indexOf(current); selectNode(course.nodes[(i + 1) % course.nodes.length].id); }
  function selectProvince(p) {
    const province = (window.CHINA_PROVINCES || []).find(x => String(x.id) === String(p.id) || x.name === p.name) || p;
    if (challenge) {
      const correct = String(province.id) === String(challenge.id);
      $('challenge-feedback').textContent = correct ? `找到了！${province.name}，简称${province.abbr}，行政中心是${province.capital}。` : `你点到了${province.name}。再找找${challenge.name}，可以先比较南北和东西位置。`;
      if (correct) { addUnique(state.provincePassed, String(province.id)); persist(); }
      return;
    }
    const box = $('province-info'); box.replaceChildren(el('strong', '', province.name), el('div', '', `简称：${province.abbr || '—'} · 行政中心：${province.capital || '—'}`)); box.hidden = false;
  }
  function startChallenge() {
    const provinces = window.CHINA_PROVINCES || []; if (!provinces.length) return toast('省区数据未加载，请刷新。');
    scene.setScene('china'); scene.setOptions({layer:'provinces', labels:false, parameter:50}); $('layer').value = 'provinces'; $('layer').disabled = false; $('labels-toggle').setAttribute('aria-pressed', 'false');
    const untested = provinces.filter(p => !state.provincePassed.includes(String(p.id)) && p.id !== challenge?.id); const pool = untested.length ? untested : provinces.filter(p => p.id !== challenge?.id);
    challenge = pool[Math.floor(Math.random() * pool.length)] || provinces[0];
    $('challenge-title').textContent = `请在地图上找到：${challenge.name}`; $('challenge-feedback').textContent = `已找到 ${state.provincePassed.length} / ${provinces.length} 个省区。点击地图作答，可拖动和缩放。`;
    $('province-info').hidden = true; $('challenge-info').hidden = false; $('scene-name').textContent = '省区定位挑战'; $('sidebar').classList.remove('open'); renderMetrics();
    $('scene').focus({preventScroll:true});
  }
  function openCoverage() {
    $('coverage-edition').textContent = course.editionNote;
    const values = [[course.nodes.length, '知识点'], [state.visited.length, '已浏览'], [course.nodes.filter(n => mastered(n.id)).length, '练习通过'], [new Set([...audioIds,...Object.keys(serverClips)]).size, '已备好配音']];
    $('coverage-stats').replaceChildren(...values.map(([value, name]) => { const d = el('div'); d.append(el('b', '', value), el('span', '', name)); return d; }));
    $('coverage-list').replaceChildren(...course.chapters.map(ch => { const d = el('section', 'coverage-chapter'); d.append(el('h3', '', ch.title)); const links = el('div'); course.nodes.filter(n => n.chapter === ch.id).forEach(n => { const b = el('button', mastered(n.id) ? 'mastered' : state.visited.includes(n.id) ? 'visited' : '', `${mastered(n.id) ? '✓ ' : ''}${n.title}`); b.onclick = () => { $('coverage').close(); selectNode(n.id); }; links.append(b); }); d.append(links); return d; }));
    $('coverage').showModal();
  }
  function renderNotes() {
    $('notes-list').replaceChildren(...state.notes.slice().reverse().map(note => { const d = el('article', 'note'); d.append(el('strong', '', note.title), el('p', '', note.text), el('small', '', note.date)); const remove = el('button', '', '删除'); remove.onclick = () => { state.notes = state.notes.filter(n => n.id !== note.id); persist(); renderNotes(); }; d.append(remove); return d; }));
    if (!state.notes.length) $('notes-list').append(el('p', 'small', '第一条发现，从今天开始。'));
  }
  function initAudioDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('china-geography-audio-v1', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('clips', {keyPath:'cue'});
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { db = req.result; const q = db.transaction('clips').objectStore('clips').getAllKeys(); q.onsuccess = () => { q.result.forEach(k => audioIds.add(k)); resolve(); }; q.onerror = () => reject(q.error); };
    });
  }
  function clip(cue) { return new Promise((resolve, reject) => { if (!db) return reject(new Error('音频存储不可用')); const q = db.transaction('clips').objectStore('clips').get(cue); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); }); }
  function saveClip(record) { return new Promise((resolve, reject) => { if (!db) return reject(new Error('音频存储不可用')); const tx = db.transaction('clips', 'readwrite'); tx.objectStore('clips').put(record); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('音频保存中断')); }); }
  function stopAudio() { audioTicket++; const a = $('narration-audio'); a.pause(); a.removeAttribute('src'); a.load(); a.hidden = true; if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = undefined; } }
  async function playAudio() {
    const cue = current.steps[stepIndex].cue;
    if (!audioIds.has(cue) && !serverClips[cue] && !api.tts?.configured) { openWorkshop(); return; }
    if (!$('narration-audio').paused) { $('narration-audio').pause(); $('play-narration').textContent = '▷ 继续讲解'; return; }
    const ticket = ++audioTicket;
    try {
      const a = $('narration-audio');
      if (!a.src) {
        if (audioIds.has(cue)) {
          const record = await clip(cue); if (ticket !== audioTicket) return;
          audioUrl = URL.createObjectURL(record.blob); a.src = audioUrl;
        } else {
          if (!serverClips[cue]) {
            $('play-narration').disabled = true; $('play-narration').textContent = '正在生成讲解…'; $('audio-status').textContent = '正在合成中文 AI 配音，请稍候。';
            const response = await fetch('/api/narration', {method:'POST', headers:{'Content-Type':'application/json','X-Sandbox-Token':api.token}, body:JSON.stringify({cue}), signal:AbortSignal.timeout(60000)});
            const result = await response.json(); if (!response.ok) throw new Error(result.error || '生成失败，请重试。');
            if (result.audioBase64) {
              const blob = new Blob([Uint8Array.from(atob(result.audioBase64), c => c.charCodeAt(0))], {type:'audio/mpeg'});
              try { await saveClip({cue, blob, filename:cue+'.mp3', source:'generated'}); audioIds.add(cue); }
              catch (_) { toast('浏览器未能保存这段音频，本次仍可播放。'); }
              if (ticket !== audioTicket) return;
              audioUrl = URL.createObjectURL(blob); a.src = audioUrl;
            } else {
              serverClips[cue] = result.url;
            }
          }
          if (ticket !== audioTicket) return;
          if (!a.src) a.src = serverClips[cue];
        }
      }
      if (ticket !== audioTicket) return;
      a.hidden = false; await a.play(); $('play-narration').textContent = 'Ⅱ 暂停讲解'; $('audio-status').textContent = `正在播放 · ${cue}`;
    } catch (err) { if(ticket !== audioTicket) return; if (!audioIds.has(cue) && $('narration-audio').error) { delete serverClips[cue]; $('narration-audio').removeAttribute('src'); $('narration-audio').load(); } $('audio-status').textContent = err.name === 'TimeoutError' ? '生成超时，可稍后重试。' : err.message; $('play-narration').textContent = '▷ 重试讲解'; toast('配音暂未播放，可重试或在配音工坊导入音频。'); }
    finally { if(ticket === audioTicket) $('play-narration').disabled = false; }
  }
  function allScripts() { return course.nodes.flatMap(n => n.steps.map((s, i) => ({cue:s.cue, chapter:course.chapters.find(c => c.id === n.chapter).title, topic:n.title, step:i+1, title:s.title, text:s.text, filename:s.cue+'.mp3'}))); }
  function openWorkshop() {
    const scripts = allScripts(); $('audio-import-status').textContent = `已备好 ${scripts.filter(s => audioIds.has(s.cue) || serverClips[s.cue]).length} / ${scripts.length} 段讲解。${api.tts?.configured ? '其他段落可在课程中点击生成。' : ''}`;
    $('audio-inventory').replaceChildren(...scripts.filter(s => audioIds.has(s.cue) || serverClips[s.cue]).map(s => el('div', '', `✓ ${s.cue} · ${s.topic} · 第${s.step}段 · ${audioIds.has(s.cue)?'浏览器配音':'AI配音已缓存'}`)));
    if (!$('workshop').open) $('workshop').showModal();
  }
  async function importAudio(files) {
    const cues = new Set(allScripts().map(s => s.cue)); let ok = 0; const skipped = [];
    $('audio-import-status').textContent = '正在保存配音…';
    for (const file of files) {
      const cue = file.name.replace(/\.[^.]+$/, '');
      if (!cues.has(cue) || !/\.(mp3|wav|ogg|m4a|webm)$/i.test(file.name) || file.size > 50 * 1024 * 1024) { skipped.push(file.name); continue; }
      try { await saveClip({cue, blob:file, filename:file.name}); audioIds.add(cue); ok++; }
      catch (_) { skipped.push(file.name + '（未保存）'); }
    }
    stopAudio(); renderStep(); openWorkshop();
    $('audio-import-status').textContent = `已导入 ${ok} 段。${skipped.length ? '未匹配或未保存：' + skipped.slice(0, 8).join('、') + '。请核对 cue 文件名，单文件需小于50MB。' : '返回课程即可播放，刷新页面后仍保留。'}`;
    $('audio-files').value = '';
  }
  async function askTeacher(event) {
    event.preventDefault(); if (chatBusy) return;
    const question = $('ask-input').value.trim(); if (!question) return;
    if (!api.configured) { toast('问答服务未配置，课程和练习仍可使用。'); return; }
    const askedNodeId = current.id;
    chatBusy = true; $('ask-send').disabled = true; $('clear-chat').disabled = true;
    const user = el('div', 'chat-bubble user', question), pending = el('div', 'chat-bubble', '正在结合课程想一想…'); $('chat-messages').append(user, pending); pending.scrollIntoView({block:'nearest'});
    try {
      const res = await fetch('/api/ask', {method:'POST', headers:{'Content-Type':'application/json', 'X-Sandbox-Token':api.token}, body:JSON.stringify({question, nodeId:askedNodeId, history:history.slice(-6)}), signal:AbortSignal.timeout(55000)});
      const result = await res.json(); if (!res.ok) throw new Error(result.error || '服务暂时没有回应，请重试。');
      pending.replaceChildren();
      // Render only emphasis, using text nodes for every model-supplied string.
      result.answer.split(/(\*\*[^*]+\*\*)/g).forEach(part => {
        pending.append(part.startsWith('**') && part.endsWith('**') ? el('strong', '', part.slice(2, -2)) : document.createTextNode(part));
      });
      const links = el('div', 'chat-links'); result.related.forEach(n => { const b = el('button', '', n.title + ' ↗'); b.onclick = () => { selectNode(n.id); switchTab('ask'); }; links.append(b); });
      pending.append(links, el('small', '', `AI 辅助回答 · ${result.model}\n参考节点：${result.related.map(n => n.title).join('、')}。点击节点可回到课程查证。`));
      history.push({role:'user', content:question}, {role:'assistant', content:result.answer}); history = history.slice(-6);
      $('ask-input').value = ''; $('ai-status').textContent = '已连接 · ' + result.model;
    } catch (err) { pending.classList.add('error'); pending.textContent = err.name === 'TimeoutError' ? '本次问答超时，请稍后再试。问题已保留。' : err.message; }
    finally { chatBusy = false; $('ask-send').disabled = false; $('clear-chat').disabled = false; pending.scrollIntoView({block:'nearest'}); }
  }
  function wire() {
    $('search').addEventListener('input', renderNav);
    $('menu-toggle').onclick = () => $('sidebar').classList.toggle('open'); $('menu-close').onclick = () => $('sidebar').classList.remove('open');
    ['explain','quiz','ask'].forEach(t => $(`tab-${t}`).onclick = () => switchTab(t));
    $('parameter').oninput = e => updateParameter(e.target.value); $('reset-experiment').onclick = () => { interactionChoice = null; challenge = null; $('challenge-info').hidden = true; setupScene(); renderInteraction(); };
    $('layer').onchange = e => { scene.setOptions({layer:e.target.value}); renderMetrics(); };
    $('zoom-in').onclick = () => scene.zoom(.15); $('zoom-out').onclick = () => scene.zoom(-.15); $('reset-view').onclick = () => scene.reset();
    $('labels-toggle').onclick = () => { const labels = $('labels-toggle').getAttribute('aria-pressed') !== 'true'; $('labels-toggle').setAttribute('aria-pressed', String(labels)); scene.setOptions({labels}); };
    $('scene').addEventListener('keydown', () => requestAnimationFrame(() => $('labels-toggle').setAttribute('aria-pressed', String(scene.getState().options.labels))));
    $('step-prev').onclick = () => { stopAudio(); stepIndex = Math.max(0, stepIndex-1); renderStep(); }; $('step-next').onclick = () => { stopAudio(); stepIndex = Math.min(current.steps.length-1, stepIndex+1); renderStep(); };
    $('play-narration').onclick = playAudio;
    $('narration-audio').onended = () => {
      $('play-narration').textContent = '▷ 再听一遍'; $('audio-status').textContent = '这一段已播完，可以进入下一段。';
      if ($('continuous-audio').checked && stepIndex < current.steps.length - 1) { stopAudio(); stepIndex++; renderStep(); playAudio(); }
      else if ($('continuous-audio').checked) $('audio-status').textContent = '本知识点讲解完毕，动手试试，再做一道思考题。';
    };
    $('narration-audio').onpause = () => { if (audioUrl) $('play-narration').textContent = '▷ 继续讲解'; };
    $('narration-audio').onplay = () => { $('play-narration').textContent = 'Ⅱ 暂停讲解'; };
    $('go-quiz').onclick = () => switchTab('quiz'); $('retry-quiz').onclick = () => { quizChoice = null; renderQuiz(); };
    $('next-lesson').onclick = nextLesson; $('quiz-next').onclick = nextLesson;
    $('province-challenge').onclick = startChallenge; $('challenge-next').onclick = startChallenge;
    $('challenge-stop').onclick = () => { challenge = null; $('challenge-info').hidden = true; scene.setOptions({labels:true}); $('labels-toggle').setAttribute('aria-pressed','true'); setupScene(); };
    $('coverage-open').onclick = openCoverage;
    $('export-progress').onclick = () => download('地理探索学习记录.json', JSON.stringify({edition:course.edition, exportedAt:new Date().toISOString(), ...state, mastered:course.nodes.filter(n => mastered(n.id)).map(n => n.id)}, null, 2), 'application/json');
    $('audio-open').onclick = openWorkshop;
    $('audio-files').onchange = e => importAudio(e.target.files);
    const drop = document.querySelector('.upload-zone'); drop.ondragover = e => e.preventDefault(); drop.ondrop = e => { e.preventDefault(); importAudio(e.dataTransfer.files); };
    $('export-scripts').onclick = () => { const rows = [['cue','章节','知识点','段落','标题','配音文字','建议文件名'], ...allScripts().map(s => [s.cue,s.chapter,s.topic,s.step,s.title,s.text,s.filename])]; download('八上地理-TTS讲稿.csv', '\ufeff'+rows.map(r => r.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'), 'text/csv;charset=utf-8'); };
    $('export-manifest').onclick = () => download('八上地理-配音清单.json', JSON.stringify({edition:course.edition, clips:allScripts()}, null, 2), 'application/json');
    $('notes-open').onclick = () => { renderNotes(); $('notes').showModal(); };
    $('save-note').onclick = () => { const text = $('note-input').value.trim(); if (!text) return toast('先写下一点发现。'); state.notes.push({id:crypto.randomUUID(), nodeId:current.id, title:current.title, text, date:new Date().toLocaleString('zh-CN')}); state.notes = state.notes.slice(-200); persist(); $('note-input').value = ''; renderNotes(); toast('发现已保存。'); };
    $('export-notes').onclick = () => download('我的地理探索手记.md', '# 我的地理探索手记\n\n'+state.notes.map(n => `## ${n.title}\n\n${n.text}\n\n${n.date}\n`).join('\n'));
    document.querySelectorAll('.dialog-close').forEach(b => b.onclick = () => b.closest('dialog').close());
    $('ask-form').onsubmit = askTeacher;
    $('ask-input').onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('ask-form').requestSubmit(); } };
    $('clear-chat').onclick = () => { history = []; $('chat-messages').replaceChildren(); };
    document.addEventListener('keydown', e => { if (/input|textarea|select/i.test(e.target.tagName) || document.querySelector('dialog[open]')) return; if (e.key === '/') { e.preventDefault(); $('sidebar').classList.add('open'); $('search').focus(); } if (e.key.toLowerCase() === 'r') scene.reset(); });
  }
  async function init() {
    try {
      const response = await fetch('/curriculum.json'); if (!response.ok) throw new Error('课程文件未找到'); course = await response.json();
      const ids = new Set(course.nodes.map(n => n.id)); for (const key of ['visited', 'interactionPassed', 'quizPassed']) state[key] = [...new Set(state[key].filter(id => ids.has(id)))];
      if (!window.ChinaScene) throw new Error('沙盘渲染文件未完整载入');
      scene = new window.ChinaScene($('scene'), {onSelect:selectProvince});
      try { await initAudioDB(); } catch (_) { toast('当前浏览器无法保存音频，文字课程仍可使用。'); }
      wire(); selectNode(ids.has(saved.lastNode) ? saved.lastNode : course.nodes[0].id); $('loading').hidden = true;
      window.geographyApp = {getState:() => ({nodeId:current.id, step:stepIndex, tab, visited:[...state.visited], mastered:course.nodes.filter(n => mastered(n.id)).map(n => n.id), interactionChoice, quizChoice, audioIds:[...audioIds], notes:state.notes.length, challenge:challenge?.id || null, scene:scene.getState()}), selectNode, getCourse:() => course};
      try { const r = await fetch('/api/status'); api = await r.json(); Object.assign(serverClips, api.tts?.clips || {}); renderStep(); $('ai-status').textContent = api.configured ? '已配置 · 提问时连接课程老师' : '问答尚未配置 · 可先使用课程与练习'; } catch (_) { $('ai-status').textContent = '问答连接不可用 · 请检查网络后重试'; }
    } catch (err) { $('loading').textContent = `${err.message}。请使用“启动地理探索课.command”重新打开。`; }
  }
  init();
})();
