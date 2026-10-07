// README'deki "Recent writing" listesini huseyinbozdemir.com/rss.xml'den yeniler.
// Liste <!-- BLOG:START --> ile <!-- BLOG:END --> arasında; en yeni 4 yazı. Bağımlılık yok (Node 22+).
import { readFile, writeFile } from 'node:fs/promises';

const FEED = 'https://huseyinbozdemir.com/rss.xml';
const LIMIT = 4;
const START = '<!-- BLOG:START -->';
const END = '<!-- BLOG:END -->';

const res = await fetch(FEED);
if (!res.ok) throw new Error(`${FEED}: HTTP ${res.status}`);
const xml = await res.text();

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&');
const tag = (item, name) => decode(item.match(new RegExp(String.raw`<${name}[^>]*>([\s\S]*?)</${name}>`))?.[1] ?? '').trim();

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map(([, item]) => ({ title: tag(item, 'title'), link: tag(item, 'link'), date: new Date(tag(item, 'pubDate')) }))
  .filter((p) => p.title && p.link)
  .sort((a, b) => b.date - a.date)
  .slice(0, LIMIT);
if (items.length === 0) throw new Error('RSS boş geldi; README değiştirilmedi');

// Başlıktaki köşeli parantez link metnini bozmasın.
const md = (s) => s.replace(/([\\[\]])/g, '\\$1');
const list = items.map((p) => `- [${md(p.title)}](${p.link})`).join('\n');

const readme = await readFile('README.md', 'utf8');
const i = readme.indexOf(START);
const j = readme.indexOf(END);
if (i < 0 || j < i) throw new Error(`README.md: ${START} / ${END} işaretleri yok`);
const next = `${readme.slice(0, i + START.length)}\n${list}\n${readme.slice(j)}`;

if (next === readme) {
  console.log('Liste güncel');
} else {
  await writeFile('README.md', next);
  console.log(`Liste güncellendi:\n${list}`);
}
