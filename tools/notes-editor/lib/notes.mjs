const YEAR = /^##\s+(\d{4})\s*$/;
const MONTH = /^###\s+(\d{4}-\d{2})\s*$/;
const DAY = /^####\s+(\d{4}-\d{2}-\d{2})(.*)$/;

export function parseNotes(raw) {
  if (typeof raw !== 'string') throw new TypeError('博客内容必须是文本');
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(newline);
  const head = [];
  const years = new Map();
  const months = new Map();
  const entries = [];
  let stage = 'head';
  let currentYear = null;
  let currentMonth = null;
  let currentEntry = null;

  for (const line of lines) {
    const year = YEAR.exec(line);
    const month = MONTH.exec(line);
    const day = DAY.exec(line);
    if (year) {
      currentYear = year[1];
      currentMonth = null;
      currentEntry = null;
      years.set(currentYear, { heading: line, prelude: [] });
      stage = 'year';
    } else if (month) {
      currentMonth = month[1];
      currentEntry = null;
      months.set(currentMonth, { heading: line, prelude: [] });
      stage = 'month';
    } else if (day) {
      const date = day[1];
      currentEntry = {
        id: entries.length,
        date,
        title: day[2].trim(),
        heading: line,
        body: [],
        seq: entries.length,
      };
      entries.push(currentEntry);
      stage = 'entry';
    } else if (stage === 'head') {
      head.push(line);
    } else if (stage === 'year') {
      years.get(currentYear).prelude.push(line);
    } else if (stage === 'month') {
      months.get(currentMonth).prelude.push(line);
    } else if (currentEntry) {
      currentEntry.body.push(line);
    }
  }

  return { newline, head, years, months, entries };
}

export function renderNotes(document) {
  const lines = [...document.head];
  let year = null;
  let month = null;

  for (const entry of document.entries) {
    const nextYear = entry.date.slice(0, 4);
    const nextMonth = entry.date.slice(0, 7);
    if (nextYear !== year) {
      const section = document.years.get(nextYear);
      lines.push(section?.heading ?? `## ${nextYear}`, ...(section?.prelude ?? []));
      year = nextYear;
      month = null;
    }
    if (nextMonth !== month) {
      const section = document.months.get(nextMonth);
      lines.push(section?.heading ?? `### ${nextMonth}`, ...(section?.prelude ?? []));
      month = nextMonth;
    }
    lines.push(entry.heading, ...entry.body);
  }

  return lines.join(document.newline);
}

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function normalizeEntries(input, current) {
  if (!Array.isArray(input) || input.length === 0) throw new Error('至少需要保留一条碎碎念');
  if (input.length > 5000) throw new Error('条目数量超出编辑器限制');
  const dates = new Set();

  const entries = input.map((item, index) => {
    if (!item || typeof item !== 'object' || typeof item.date !== 'string' || !validDate(item.date)) {
      throw new Error(`第 ${index + 1} 条记录的日期无效`);
    }
    if (dates.has(item.date)) throw new Error(`${item.date} 已存在，不能创建重复日期`);
    dates.add(item.date);
    if (typeof item.title !== 'string' || /[\r\n]/.test(item.title) || item.title.length > 300) {
      throw new Error(`${item.date} 的标题格式无效`);
    }
    if (typeof item.body !== 'string' && !Array.isArray(item.body)) {
      throw new Error(`${item.date} 的正文格式无效`);
    }
    const original = current.entries.find((entry) => String(entry.id) === String(item.id));
    const title = item.title.trim();
    const heading = original && original.date === item.date && original.title === title
      ? original.heading
      : `#### ${item.date}${title ? ` ${title}` : ''}`;
    const text = Array.isArray(item.body) ? item.body.join('\n') : item.body;
    if (text.length > 1_000_000) throw new Error(`${item.date} 的正文超出单条大小限制`);
    const body = original && text === original.body.join('\n')
      ? original.body
      : text.replace(/\r\n?/g, '\n').split('\n');
    return { id: index, date: item.date, title, heading, body, seq: index };
  });

  return entries.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.seq - b.seq)
    .map((entry, index) => ({ ...entry, id: index }));
}
