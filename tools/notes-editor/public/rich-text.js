const BLOG_BASE = 'https://www.oweqian.xyz/';
const IFRAME_HOSTS = new Set(['player.bilibili.com', 'www.youtube.com']);

function safeUrl(value, media, allowTemporary = true) {
  if (!value) return '';
  if (allowTemporary && value.startsWith('notes-media:')) return media.source(value);
  try {
    const url = new URL(value, BLOG_BASE);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function imageElement(src, alt, media, width = '') {
  const source = safeUrl(src, media);
  if (!source) return document.createTextNode(`![${alt}](${src})`);
  const image = document.createElement('img');
  image.src = source;
  image.alt = alt || '';
  image.loading = 'lazy';
  image.dataset.markdownSrc = src;
  if (/^\d{1,3}%$/.test(width)) image.style.width = width;
  return image;
}

function rawMediaElement(line, media) {
  const parsed = new DOMParser().parseFromString(line, 'text/html');
  const source = parsed.body.firstElementChild;
  if (!source || parsed.body.children.length !== 1) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'embedded-media';
  wrapper.dataset.rawHtml = line;
  if (source.tagName === 'IFRAME') {
    const url = safeUrl(source.getAttribute('src'), null, false);
    if (!url || !IFRAME_HOSTS.has(new URL(url).hostname)) return null;
    const frame = document.createElement('iframe');
    frame.src = url;
    frame.title = source.getAttribute('title') || '视频';
    frame.loading = 'lazy';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    wrapper.dataset.sanitizedHtml = frame.outerHTML;
    wrapper.contentEditable = 'false';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'external-media-preview';
    button.textContent = '加载外部视频';
    button.addEventListener('click', () => button.replaceWith(frame));
    wrapper.append(button);
    return wrapper;
  }
  if (source.tagName === 'VIDEO') {
    const original = source.getAttribute('src') || '';
    const url = safeUrl(original, media);
    if (!url) return null;
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    wrapper.dataset.sanitizedHtml = video.outerHTML;
    wrapper.append(video);
    return wrapper;
  }
  return null;
}

function inline(text, media) {
  const fragment = document.createDocumentFragment();
  const pattern = /(!?\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) fragment.append(document.createTextNode(text.slice(cursor, match.index)));
    const token = match[0];
    const link = token.match(/^(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/);
    if (link && link[1]) {
      fragment.append(imageElement(link[3], link[2], media));
    } else if (link) {
      const href = safeUrl(link[3], null, false);
      if (href) {
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.dataset.markdownHref = link[3];
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.append(inline(link[2], media));
        fragment.append(anchor);
      } else fragment.append(document.createTextNode(token));
    } else if (token.startsWith('`')) {
      const code = document.createElement('code');
      code.textContent = token.slice(1, -1);
      fragment.append(code);
    } else {
      const element = document.createElement(token.startsWith('**') ? 'strong' : 'em');
      element.append(inline(token.slice(token.startsWith('**') ? 2 : 1, token.startsWith('**') ? -2 : -1), media));
      fragment.append(element);
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
  return fragment;
}

export function renderMarkdown(source, media) {
  const fragment = document.createDocumentFragment();
  if (!source.trim()) return fragment;
  let paragraph = [];
  let quote = [];
  let list = null;
  let code = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const element = document.createElement('p');
    element.append(inline(paragraph.join('\n'), media));
    fragment.append(element);
    paragraph = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    const element = document.createElement('blockquote');
    const text = document.createElement('p');
    text.append(inline(quote.join('\n'), media));
    element.append(text);
    fragment.append(element);
    quote = [];
  };
  const flushList = () => {
    if (list) fragment.append(list);
    list = null;
  };
  const flushText = () => { flushParagraph(); flushQuote(); flushList(); };

  for (const line of source.split('\n')) {
    if (/^```/.test(line)) {
      if (code) {
        fragment.append(code);
        code = null;
      } else {
        flushText();
        code = document.createElement('pre');
        code.append(document.createElement('code'));
      }
      continue;
    }
    if (code) {
      code.firstChild.append(document.createTextNode(`${line}\n`));
      continue;
    }
    if (!line.trim()) { flushText(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushText();
      const element = document.createElement(`h${heading[1].length}`);
      element.append(inline(heading[2], media));
      fragment.append(element);
      continue;
    }
    const trimmed = line.trim();
    const markdownImage = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\s+"[^"]*")?$/);
    const htmlImage = trimmed.match(/^<img\s+[^>]*>$/i)
      ? new DOMParser().parseFromString(trimmed, 'text/html').querySelector('img') : null;
    if (markdownImage || htmlImage) {
      flushText();
      fragment.append(imageElement(
        markdownImage ? markdownImage[2] : htmlImage.getAttribute('src'),
        markdownImage ? markdownImage[1] : htmlImage.getAttribute('alt'),
        media,
        htmlImage?.getAttribute('width') || '',
      ));
      continue;
    }
    if (/^<(?:iframe|video)\b/i.test(trimmed)) {
      const raw = rawMediaElement(trimmed, media);
      if (raw) {
        flushText();
        fragment.append(raw);
        continue;
      }
    }
    if (/^<[^>]+>$/.test(trimmed)) {
      flushText();
      const raw = document.createElement('div');
      raw.className = 'raw-block';
      raw.dataset.rawHtml = line;
      raw.contentEditable = 'false';
      raw.textContent = '原始嵌入内容 · 可在 Markdown 模式编辑';
      fragment.append(raw);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushParagraph(); flushList();
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }
    const item = line.match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
    if (item) {
      flushParagraph(); flushQuote();
      const ordered = /^\d+\./.test(item[1]);
      if (!list || list.tagName !== (ordered ? 'OL' : 'UL')) {
        flushList();
        list = document.createElement(ordered ? 'ol' : 'ul');
      }
      const element = document.createElement('li');
      element.append(inline(item[2], media));
      list.append(element);
      continue;
    }
    flushQuote(); flushList();
    paragraph.push(line);
  }
  if (code) fragment.append(code);
  flushText();
  return fragment;
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').replace(/[\\`*_[\]]/g, '\\$&');
}

function inlineMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) return cleanText(node.textContent);
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  if (node.dataset.rawHtml) return node.dataset.rawHtml;
  const content = () => [...node.childNodes].map(inlineMarkdown).join('');
  switch (node.tagName) {
    case 'BR': return '  \n';
    case 'STRONG': case 'B': return `**${content()}**`;
    case 'EM': case 'I': return `*${content()}*`;
    case 'CODE': return `\`${node.textContent.replace(/`/g, '\\`')}\``;
    case 'A': {
      const href = node.dataset.markdownHref || node.getAttribute('href') || '';
      return safeUrl(href, null, false) ? `[${content()}](${href})` : content();
    }
    case 'IMG': {
      const src = node.dataset.markdownSrc || node.getAttribute('src') || '';
      const alt = (node.alt || '').replace(/[\[\]\r\n]/g, '');
      const width = /^\d{1,3}%$/.test(node.style.width) ? ` width="${node.style.width}"` : '';
      return width ? `<img src="${src}" alt="${alt}"${width} />` : `![${alt}](${src})`;
    }
    default: return content();
  }
}

const HAS_BLOCKS = /^(P|DIV|H[1-6]|UL|OL|BLOCKQUOTE|PRE|HR)$/;
function blockMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) return cleanText(node.textContent).trim();
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  if (node.dataset.rawHtml) return node.dataset.rawHtml;
  if (/^H[1-6]$/.test(node.tagName)) return `${'#'.repeat(Number(node.tagName[1]))} ${inlineMarkdown(node).trim()}`;
  if (node.tagName === 'UL' || node.tagName === 'OL') {
    return [...node.children].filter((item) => item.tagName === 'LI').map((item, index) =>
      `${node.tagName === 'OL' ? `${index + 1}.` : '-'} ${inlineMarkdown(item).trim()}`).join('\n');
  }
  if (node.tagName === 'BLOCKQUOTE') {
    return [...node.childNodes].map(blockMarkdown).filter(Boolean).join('\n\n').split('\n').map((line) => `> ${line}`).join('\n');
  }
  if (node.tagName === 'PRE') return `\`\`\`\n${node.textContent.replace(/\n$/, '')}\n\`\`\``;
  if (node.tagName === 'HR') return '---';
  if (node.tagName === 'IMG') return inlineMarkdown(node);
  if (['DIV', 'P'].includes(node.tagName) && [...node.children].some((child) => HAS_BLOCKS.test(child.tagName))) {
    return [...node.childNodes].map(blockMarkdown).filter(Boolean).join('\n\n');
  }
  return inlineMarkdown(node).trim();
}

export function markdownFromRich(root) {
  return [...root.childNodes].map(blockMarkdown).filter((text) => text.trim()).join('\n\n').trim();
}

function sanitizedNode(source, media) {
  if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.textContent);
  if (source.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
  if (/^(SCRIPT|STYLE|META|LINK|OBJECT|EMBED|FORM|INPUT|BUTTON|SVG)$/.test(source.tagName)) return document.createDocumentFragment();
  if (source.tagName === 'IFRAME' || source.tagName === 'VIDEO') {
    const raw = rawMediaElement(source.outerHTML, media);
    if (raw) raw.dataset.rawHtml = raw.dataset.sanitizedHtml;
    return raw || document.createDocumentFragment();
  }
  if (source.tagName === 'IMG') {
    return imageElement(source.getAttribute('src') || '', source.getAttribute('alt') || '', media);
  }
  const allowed = /^(P|DIV|SPAN|BR|HR|H[1-6]|STRONG|B|EM|I|CODE|PRE|A|UL|OL|LI|BLOCKQUOTE)$/;
  const fragment = document.createDocumentFragment();
  if (!allowed.test(source.tagName)) {
    source.childNodes.forEach((child) => fragment.append(sanitizedNode(child, media)));
    return fragment;
  }
  const element = document.createElement(source.tagName.toLowerCase());
  if (source.tagName === 'A') {
    const href = source.getAttribute('href') || '';
    if (safeUrl(href, null, false)) {
      element.href = href;
      element.dataset.markdownHref = href;
    }
  }
  source.childNodes.forEach((child) => element.append(sanitizedNode(child, media)));
  return element;
}

export function sanitizePaste(html, media) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();
  parsed.body.childNodes.forEach((node) => fragment.append(sanitizedNode(node, media)));
  return fragment;
}
