import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNotes } from '../notes-editor/lib/notes.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const NOTES_FILE = path.join(ROOT, 'content', 'posts', 'blog', 'index.md');
const OUTPUT_FILE = path.join(ROOT, 'static', 'data', 'insights.json');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const CODE_PATTERN = /javascript|typescript|react|vue|python|pygame|electron|html|css|api|git|claude|code|代码|编程|函数|变量|接口|前端|后端|bug|终端|命令行/i;
const VAGUE_WORDS = new Set('自己 我们 你们 他们 一个 一些 事情 东西 问题 生活 人生 成长 情绪 状态 思考 时间 一切 感觉 选择 改变 坚持 努力 自由 现实 内心 世界 日子 未来 过去 生活感 精神内耗'.split(' '));
const ENTITY_PATTERN = /王小波|毛姆|毛泽东|石原里美|山治|毛泽东选集|实践论|论持久战|百年孤独|纸房子|星期三|流俗地|非自然死亡/;
const TOPIC_RULES = [
  { text: '回想过去', pattern: /回想|回忆/ },
  { text: '走出低谷', pattern: /深渊|低谷|拯救自己/ },
  { text: '图书馆自习', pattern: /图书馆|刷题/ },
  { text: '考试与准备', pattern: /考试|面试|简历/ },
  { text: '搬家与新生活', pattern: /搬到|新的房子|换城市/ },
  { text: '工作复盘', pattern: /自己设计的功能|越看越生气/ },
  { text: '阅读计划', pattern: /已下单|读书|读《/ },
  { text: '运动与恢复', pattern: /锻炼|游泳|蛙泳|健身/ },
  { text: '关系与边界', pattern: /离婚|断联|同频|小伙伴/ },
  { text: '学习', pattern: /学习|刷题|读书/ },
  { text: '克拉克森农场', pattern: /克拉克森农场/ },
  { text: 'Agent 协作', pattern: /agent/i },
];
const ORIGINAL_THOUGHTS = [
  '人并不总靠顿悟走出低谷，更多时候，只是把今天该做的一件小事做完了。',
  '自由有时不是远方，而是不再替别人的沉默寻找理由。',
  '成熟并非对一切释然，是知道哪些事值得生气，哪些人不必再等。',
  '书不能替人生活，却能在生活失语时，替人保留一点表达的勇气。',
  '所谓重新开始，多半不是换了世界，而是终于肯照顾那个一直硬撑的自己。',
  '理解人性的复杂之后，仍愿意把善意留给值得的人，这比单纯的天真更难得。',
];

const plainText = (lines) => lines.join('\n')
  .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
  .replace(/<img[^>]*>/gi, '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/[#>*`_~-]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function recentEntries(raw) {
  return parseNotes(raw).entries
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
    .map((entry) => ({ date: entry.date, text: plainText(entry.body).slice(0, 700) }))
    .filter((entry) => entry.text);
}

const recencyWeight = (date, entries) => Math.max(2, 10 - entries.findIndex((entry) => entry.date === date));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

function localInsights(entries) {
  const keywords = TOPIC_RULES.map((rule) => {
    const note = entries.find((entry) => rule.pattern.test(entry.text));
    return note ? { text: rule.text, kind: 'notes', sourceDate: note.date, weight: recencyWeight(note.date, entries) } : null;
  }).filter(Boolean).sort((a, b) => b.sourceDate.localeCompare(a.sourceDate) || b.weight - a.weight).slice(0, 10);
  const thoughts = ORIGINAL_THOUGHTS.map((text, index) => ({
    text,
    kind: 'thought',
    origin: 'original',
    sourceDate: entries[index % entries.length]?.date,
    weight: Math.max(3, 7 - Math.floor(index / 2)),
  }));
  return {
    source: 'local',
    generatedAt: new Date().toISOString(),
    recentThrough: entries[0]?.date || '',
    recentCount: entries.length,
    keywords,
    thoughts,
  };
}

function validKeyword(item, entries) {
  const text = clean(item?.text);
  const sourceDate = clean(item?.sourceDate);
  if (text.length < 2 || text.length > 12 || VAGUE_WORDS.has(text) || CODE_PATTERN.test(text) || ENTITY_PATTERN.test(text)) return null;
  if (!/^(?:[\u4e00-\u9fff·\s]|Agent)+$/i.test(text) || /[，。！？；：、]/.test(text)) return null;
  const source = entries.find((entry) => entry.date === sourceDate);
  if (!source || (source.text.includes(`《${text}》`) && !text.includes('农场'))) return null;
  return { text, kind: 'notes', sourceDate, weight: recencyWeight(sourceDate, entries) };
}

function validThought(item, entries) {
  let text = clean(item?.text);
  const sourceDate = clean(item?.sourceDate);
  if (text.length < 18 || text.length > 72 || CODE_PATTERN.test(text)) return null;
  if (/王小波\s*(说|曾|写)|毛姆\s*(说|曾|写)/.test(text)) return null;
  if (!entries.some((entry) => entry.date === sourceDate)) return null;
  if (!/[。！？]$/.test(text)) text += '。';
  return { text, kind: 'thought', origin: 'deepseek', sourceDate, weight: Math.max(3, recencyWeight(sourceDate, entries) - 2) };
}

async function analyze(entries) {
  const system = `你是中文个人日记的编辑。你要理解作者最近的生活与思考，但不诊断心理，不评判，不编造经历。
只输出 JSON：{"keywords":[{"text":"具体中文名词","sourceDate":"YYYY-MM-DD"}],"thoughts":[{"text":"原创中文短句","sourceDate":"YYYY-MM-DD"}]}。
keywords 选择 8 个，每个 2 到 10 字，是近期活动、处境或思考的主题词，优先最近 6 条。表达参考“回想过去”“工作复盘”“阅读与自救”“学习”，必须忠于 sourceDate 的记录，可以概括但不要编造。
不要把人名、作者名、角色名、书名或影视作品名作为关键词，也不要罗列实体名称。“克拉克森农场”只有在原文确实提及时才能作为生活主题保留。禁止代码、编程术语、英文缩写、代词和意义不明的词。
thoughts 选择 5 句，每句 25 到 56 字，依据最近记录呈现作者当下的处境与新的理解。可以有王小波式的清醒、理性、自嘲，以及毛姆式对人性与选择的观察；不得引用或冒充两位作者，不写作者名，不喊口号，不空泛安慰。`;
  const user = entries.map((entry, index) => `第 ${index + 1} 条，日期 ${entry.date}：\n${entry.text}`).join('\n\n');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.8,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      stream: false,
    }),
    signal: AbortSignal.timeout(50000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`DeepSeek 返回 ${response.status}：${clean(data.error?.message).slice(0, 120)}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek 没有返回可用内容');
  const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  const generatedKeywords = (parsed.keywords || []).map((item) => validKeyword(item, entries)).filter(Boolean).slice(0, 8);
  const generatedThoughts = (parsed.thoughts || []).map((item) => validThought(item, entries)).filter(Boolean).slice(0, 4);
  if (generatedKeywords.length < 3 || generatedThoughts.length < 2) throw new Error('DeepSeek 返回的有效关键词或短句不足');
  const local = localInsights(entries);
  const seen = new Set(generatedKeywords.map((item) => item.text));
  const keywords = [
    ...generatedKeywords,
    ...local.keywords.filter((item) => !seen.has(item.text)).slice(0, Math.max(0, 6 - generatedKeywords.length)),
  ];
  return {
    version: 2,
    source: 'deepseek',
    generatedAt: new Date().toISOString(),
    recentThrough: entries[0]?.date || '',
    recentCount: entries.length,
    keywords,
    thoughts: [...generatedThoughts, ...local.thoughts.slice(0, 3)],
  };
}

const raw = await readFile(NOTES_FILE, 'utf8');
const sourceHash = createHash('sha256').update(raw).digest('hex');
const entries = recentEntries(raw);

if (!process.env.DEEPSEEK_API_KEY) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    throw new Error('请在 GitHub Actions Secrets 中配置 DEEPSEEK_API_KEY');
  }
  console.warn('未设置 DEEPSEEK_API_KEY，保留现有 static/data/insights.json');
  process.exit(0);
}

try {
  const generated = await analyze(entries);
  const insights = {
    ...generated,
    source: 'analysis',
    sourceHash,
    thoughts: generated.thoughts.map((thought) => ({
      ...thought,
      origin: thought.origin === 'original' ? 'original' : 'generated',
    })),
  };
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(insights, null, 2)}\n`, 'utf8');
  console.log(`已生成 ${insights.keywords.length} 个近期主题词和 ${insights.thoughts.length} 句短句，截止 ${insights.recentThrough}`);
} catch (error) {
  console.error(`近期思绪生成失败：${error.message}`);
  process.exitCode = 1;
}
