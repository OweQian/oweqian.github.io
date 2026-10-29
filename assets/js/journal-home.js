(() => {
  const root = document.querySelector('[data-journal-home]');
  if (!root) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 680px)');
  const bubbleLayer = root.querySelector('[data-journal-bubbles]');
  const timelineURL = root.dataset.timelineUrl;
  let corpus = { notes: [], articles: [], history: [] };
  try {
    const data = JSON.parse(root.querySelector('[data-journal-corpus]').textContent);
    corpus = {
      notes: data.notes || [],
      articles: data.articles || [],
      history: data.history || [],
    };
  } catch {}

  if (window.matchMedia('(pointer: fine)').matches && !reducedMotion.matches) {
    const aura = root.querySelector('[data-journal-cursor-aura]');
    const thoughts = root.querySelector('[data-journal-thoughts]');
    const avatar = root.querySelector('.journal-avatar');
    const target = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
    const current = { ...target };
    let auraFrame = null;
    const drawAura = () => {
      auraFrame = null;
      current.x += (target.x - current.x) * 0.075;
      current.y += (target.y - current.y) * 0.075;
      aura.style.transform = `translate3d(${current.x - 180}px, ${current.y - 180}px, 0)`;
      if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.2) {
        auraFrame = window.requestAnimationFrame(drawAura);
      }
    };
    root.addEventListener('pointermove', (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      aura.dataset.active = 'true';
      const rect = thoughts.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / (rect.height / 2)));
      avatar.style.setProperty('--tilt-x', `${-y * 3.5}deg`);
      avatar.style.setProperty('--tilt-y', `${x * 4.5}deg`);
      if (auraFrame === null) auraFrame = window.requestAnimationFrame(drawAura);
    }, { passive: true });
    root.addEventListener('pointerleave', () => {
      aura.dataset.active = 'false';
      avatar.style.setProperty('--tilt-x', '0deg');
      avatar.style.setProperty('--tilt-y', '0deg');
    });
  }

  const pad = (number) => String(number).padStart(2, '0');
  const excerpt = (text, length = 100) => {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    return normalized.length > length ? `${normalized.slice(0, length)}…` : normalized;
  };
  const today = new Date();
  const monthDay = `${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const todayISO = `${today.getFullYear()}-${monthDay}`;
  const todayElement = root.querySelector('[data-journal-today]');
  todayElement.dateTime = todayISO;
  todayElement.textContent = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(today);

  const festivals = {
    '01-01': '元旦',
    '02-14': '情人节',
    '03-08': '妇女节',
    '04-01': '愚人节',
    '05-01': '劳动节',
    '05-04': '青年节',
    '06-01': '儿童节',
    '09-10': '教师节',
    '10-01': '国庆节',
    '12-25': '圣诞节',
  };
  const todayEntry = corpus.notes.find((note) => note.date === todayISO);
  const todayNote = root.querySelector('[data-journal-today-note]');
  const todayWrite = root.querySelector('[data-journal-today-write]');
  root.querySelector('[data-journal-occasion]').textContent = festivals[monthDay]
    ? `今天是${festivals[monthDay]}。`
    : todayEntry ? '今天已经留下了一页。' : '今天还没有内容。';
  if (todayEntry) {
    const link = document.createElement('a');
    link.href = `${timelineURL}#${todayISO}`;
    link.textContent = excerpt(todayEntry.title || todayEntry.text, 110);
    todayNote.append(link);
  } else if (root.dataset.editorUrl) {
    todayWrite.href = `${root.dataset.editorUrl}?new=${todayISO}`;
    todayWrite.hidden = false;
  }

  const notesByDate = new Map();
  corpus.history.forEach((note) => {
    if (!notesByDate.has(note.date)) notesByDate.set(note.date, note);
  });
  corpus.notes.forEach((note) => notesByDate.set(note.date, note));
  const memory = notesByDate.get(`${today.getFullYear() - 1}-${monthDay}`);
  const memoryElement = root.querySelector('[data-journal-memory]');
  memoryElement.replaceChildren();
  if (memory) {
    const details = document.createElement('details');
    details.className = 'journal-memory-details';
    const summary = document.createElement('summary');
    summary.textContent = `${memory.date} · ${excerpt(memory.text, 38) || '这一天没有文字摘要'}`;
    const text = document.createElement('p');
    text.className = 'journal-memory-text';
    text.textContent = memory.text || '这一天没有文字摘要。';
    details.append(summary, text);
    memoryElement.append(details);
  } else {
    const description = document.createElement('span');
    description.textContent = '去年今天没有留下记录。';
    memoryElement.append(description);
  }

  root.querySelector('[data-journal-random]').addEventListener('click', () => {
    if (!corpus.notes.length) return;
    const note = corpus.notes[Math.floor(Math.random() * corpus.notes.length)];
    window.location.href = `${timelineURL}#${note.date}`;
  });

  const recentNotes = corpus.notes.slice(0, 12);
  const recentDates = new Set(recentNotes.map((note) => note.date));
  const topicRules = [
    { word: '回想过去', pattern: /回想|回忆/ },
    { word: '走出低谷', pattern: /深渊|低谷|拯救自己/ },
    { word: '图书馆自习', pattern: /图书馆|刷题/ },
    { word: '考试与准备', pattern: /考试|面试|简历/ },
    { word: '搬家与新生活', pattern: /搬到|新的房子|换城市/ },
    { word: '工作复盘', pattern: /自己设计的功能|越看越生气/ },
    { word: '阅读计划', pattern: /已下单|读书|读《/ },
    { word: '运动与恢复', pattern: /锻炼|游泳|蛙泳|健身/ },
    { word: '关系与边界', pattern: /离婚|断联|同频|小伙伴/ },
    { word: '学习', pattern: /学习|刷题|读书/ },
    { word: '克拉克森农场', pattern: /克拉克森农场/ },
    { word: 'Agent 协作', pattern: /agent/i },
  ];
  const originalSentences = [
    '人并不总靠顿悟走出低谷，更多时候，只是把今天该做的一件小事做完了。',
    '自由有时不是远方，而是不再替别人的沉默寻找理由。',
    '成熟并非对一切释然，是知道哪些事值得生气，哪些人不必再等。',
    '书不能替人生活，却能在生活失语时，替人保留一点表达的勇气。',
    '所谓重新开始，多半不是换了世界，而是终于肯照顾那个一直硬撑的自己。',
    '理解人性的复杂之后，仍愿意把善意留给值得的人，这比单纯的天真更难得。',
  ];
  const recentWeight = (date) => Math.max(2, 12 - recentNotes.findIndex((note) => note.date === date));
  const fallbackKeywords = topicRules.map((rule) => {
    const note = recentNotes.find((item) => rule.pattern.test(item.text));
    return note ? { word: rule.word, kind: 'notes', sourceDate: note.date, weight: recentWeight(note.date) } : null;
  }).filter(Boolean).sort((a, b) => b.weight - a.weight).slice(0, 10);
  const fallbackThoughts = originalSentences.map((word, index) => ({
    word,
    kind: 'thought',
    origin: 'original',
    sourceDate: recentNotes[index % recentNotes.length]?.date,
    weight: Math.max(3, 8 - index),
  }));
  let insights = { source: 'local', keywords: fallbackKeywords, thoughts: fallbackThoughts };
  let maxWeight = 1;
  let keywordPool = [];
  let thoughtPool = [];
  let drawCount = 0;
  let timer = null;
  let active = new Set();
  const sourceLabel = root.querySelector('[data-journal-insight-source]');
  const setSourceLabel = () => {
    if (sourceLabel) sourceLabel.textContent = `最近 ${recentNotes.length} 条记录 · 关键词与短句`;
  };
  setSourceLabel();

  const shuffle = (items) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [items[index], items[target]] = [items[target], items[index]];
    }
    return items;
  };

  const fillThoughtPool = () => {
    const generated = shuffle(insights.thoughts.filter((item) => item.origin === 'generated'));
    const originals = shuffle(insights.thoughts.filter((item) => item.origin !== 'generated'));
    thoughtPool = [];
    for (let index = 0; index < Math.max(generated.length, originals.length); index += 1) {
      if (generated[index]) thoughtPool.push(generated[index]);
      if (originals[index]) thoughtPool.push(originals[index]);
    }
  };

  const takeCandidate = (kind) => {
    if (kind === 'thought') {
      if (!thoughtPool.length) fillThoughtPool();
      return thoughtPool.shift();
    }
    if (!keywordPool.length) keywordPool = shuffle([...insights.keywords]);
    return keywordPool.shift();
  };

  const nextBubble = () => {
    const activeWords = new Set([...active].map((bubble) => bubble.dataset.journalWord));
    for (let attempt = 0; attempt < 14; attempt += 1) {
      drawCount += 1;
      const thoughtCount = [...active].filter((bubble) => bubble.dataset.kind === 'thought').length;
      const canAddThought = insights.thoughts.length && thoughtCount < (compact.matches ? 1 : 2);
      const kind = drawCount % 3 === 0 && canAddThought ? 'thought' : 'notes';
      const candidate = takeCandidate(kind) || takeCandidate(kind === 'thought' ? 'notes' : 'thought');
      if (candidate && !activeWords.has(candidate.word)) return candidate;
    }
    return null;
  };

  const codePattern = /javascript|typescript|react|vue|python|pygame|electron|html|css|api|git|claude|code|代码|编程|函数|变量|接口|前端|后端|bug|终端|命令行/i;
  const vagueWords = new Set('自己 我们 你们 他们 一个 一些 事情 东西 问题 生活 人生 成长 情绪 状态 思考 时间 一切 感觉 选择 改变 坚持 努力 自由 现实 内心 世界 日子 未来 过去'.split(' '));
  const entityPattern = /王小波|毛姆|毛泽东|石原里美|山治|毛泽东选集|实践论|论持久战|百年孤独|纸房子|星期三|流俗地|非自然死亡/;
  const remoteKeyword = (item) => {
    const word = String(item?.text || item?.word || '').replace(/\s+/g, ' ').trim();
    const sourceDate = String(item?.sourceDate || '');
    if (word.length < 2 || word.length > 16 || vagueWords.has(word) || codePattern.test(word) || entityPattern.test(word)) return null;
    if (!/^(?:[\u4e00-\u9fff·\s]|Agent)+$/i.test(word) || /[，。！？；：、]/.test(word) || !recentDates.has(sourceDate)) return null;
    const source = recentNotes.find((note) => note.date === sourceDate);
    if (!source || (source.text.includes(`《${word}》`) && !word.includes('农场'))) return null;
    return { word, kind: 'notes', sourceDate, weight: Number(item.weight) || recentWeight(sourceDate) };
  };
  const remoteThought = (item) => {
    const word = String(item?.text || item?.word || '').replace(/\s+/g, ' ').trim();
    const sourceDate = String(item?.sourceDate || '');
    if (word.length < 18 || word.length > 90 || codePattern.test(word) || !recentDates.has(sourceDate)) return null;
    if (/王小波\s*(说|曾|写)|毛姆\s*(说|曾|写)/.test(word)) return null;
    return {
      word,
      kind: 'thought',
      origin: item.origin === 'original' ? 'original' : 'generated',
      sourceDate,
      weight: Number(item.weight) || Math.max(3, recentWeight(sourceDate) - 2),
    };
  };

  const loadInsights = async () => {
    if (!root.dataset.insightsUrl) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(root.dataset.insightsUrl, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      const data = await response.json();
      const keywords = (data.keywords || []).map(remoteKeyword).filter(Boolean).slice(0, 10);
      const thoughts = (data.thoughts || []).map(remoteThought).filter(Boolean).slice(0, 8);
      if (keywords.length < 3 || thoughts.length < 2) return;
      insights = { source: 'analysis', keywords, thoughts };
      setSourceLabel();
      resetBubbles();
    } catch {
      insights.source = 'local';
      setSourceLabel();
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const removeBubble = (bubble) => {
    active.delete(bubble);
    bubble.remove();
  };

  const makeBubble = (keyword, staticMode = false) => {
    const thought = keyword.kind === 'thought';
    const link = document.createElement('a');
    link.className = 'journal-thought';
    link.classList.toggle('journal-thought--insight', thought);
    link.dataset.journalWord = keyword.word;
    link.dataset.kind = keyword.kind;
    link.dataset.origin = keyword.origin || 'local';
    link.href = keyword.sourceDate
      ? `${timelineURL}#${keyword.sourceDate}`
      : timelineURL;
    link.title = thought
      ? keyword.origin === 'generated' ? '来自最近记录的思考' : '原创短句，灵感来自最近记录'
      : `看看 ${keyword.sourceDate} 的记录`;
    link.dataset.weight = String(keyword.weight);
    const word = document.createElement('span');
    word.className = 'journal-thought-word';
    word.textContent = keyword.word;
    link.append(word);
    if (staticMode) return link;

    const spread = compact.matches ? 112 : 154;
    let startX = Math.round((Math.random() - 0.5) * spread * 1.35);
    let endX = Math.round((Math.random() - 0.5) * spread * 2);
    if (thought) {
      const direction = drawCount % 2 === 0 ? -1 : 1;
      startX = Math.round(direction * (compact.matches ? 32 : 110) + (Math.random() - 0.5) * 35);
      endX = Math.round(direction * (compact.matches ? 45 : 125) + (Math.random() - 0.5) * 45);
    }
    const middleX = Math.round((startX + endX) / 2 + (Math.random() - 0.5) * 40);
    const bottom = compact.matches ? 200 : 245;
    const stageHeight = root.querySelector('[data-journal-thoughts]').clientHeight;
    const stageWidth = root.querySelector('[data-journal-thoughts]').clientWidth;
    const weightRatio = Math.sqrt(Math.min(keyword.weight / maxWeight, 1));
    const baseSize = thought ? (compact.matches ? 0.78 : 0.82) : (compact.matches ? 0.86 : 0.94);
    const sizeRange = thought ? 0.18 : (compact.matches ? 0.4 : 0.56);
    link.style.setProperty('--duration', `${13 + Math.random() * 4}s`);
    link.style.setProperty('--word-size', `${baseSize + weightRatio * sizeRange}rem`);
    link.style.setProperty('--word-weight', thought ? '450' : String(450 + Math.round(weightRatio * 150)));
    bubbleLayer.append(link);
    const minX = 12 - stageWidth / 2;
    const maxX = stageWidth / 2 - link.offsetWidth - 12;
    const clampX = (value) => Math.max(minX, Math.min(maxX, value));
    link.style.setProperty('--start-x', `${clampX(startX)}px`);
    link.style.setProperty('--middle-x', `${clampX(middleX)}px`);
    link.style.setProperty('--end-x', `${clampX(endX)}px`);
    const rise = Math.max(thought ? 24 : 130, stageHeight - bottom - link.offsetHeight - 24);
    link.style.setProperty('--rise-half', `${-rise * 0.52}px`);
    link.style.setProperty('--rise', `${-rise}px`);
    word.style.animationDuration = `${3.1 + Math.random() * 2.2}s`;
    word.style.animationDelay = `${-Math.random() * 3}s`;
    link.addEventListener('animationend', (event) => {
      if (event.target === link) removeBubble(link);
    });
    link.addEventListener('animationcancel', () => removeBubble(link));
    return link;
  };

  const spawn = () => {
    timer = null;
    if (document.hidden || reducedMotion.matches || (!insights.keywords.length && !insights.thoughts.length)) return;
    if (active.size < (compact.matches ? 4 : 8)) {
      const candidate = nextBubble();
      if (candidate) {
        const bubble = makeBubble(candidate);
        active.add(bubble);
        bubbleLayer.append(bubble);
      }
    }
    timer = window.setTimeout(spawn, compact.matches ? 1800 : 1250);
  };

  const resetBubbles = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    active.forEach((bubble) => bubble.remove());
    active = new Set();
    keywordPool = [];
    thoughtPool = [];
    drawCount = 0;
    maxWeight = Math.max(1, ...[...insights.keywords, ...insights.thoughts].map((item) => item.weight || 1));
    bubbleLayer.replaceChildren();
    bubbleLayer.classList.toggle('is-static', reducedMotion.matches);
    if (reducedMotion.matches) {
      const items = [
        ...insights.keywords.slice(0, compact.matches ? 2 : 4),
        ...insights.thoughts.slice(0, compact.matches ? 1 : 2),
      ];
      items.forEach((keyword) => bubbleLayer.append(makeBubble(keyword, true)));
    } else {
      spawn();
    }
  };

  document.addEventListener('visibilitychange', () => {
    root.dataset.pageHidden = String(document.hidden);
    if (document.hidden && timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    } else if (!document.hidden && !reducedMotion.matches && timer === null) {
      spawn();
    }
  });
  reducedMotion.addEventListener('change', resetBubbles);
  compact.addEventListener('change', resetBubbles);
  resetBubbles();
  loadInsights();
})();
