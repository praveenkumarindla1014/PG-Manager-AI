import React from 'react';

/**
 * Tiny, safe markdown renderer for assistant replies (no raw HTML):
 * paragraphs, **bold**, *italic*, `code`, [links](url), bullet/numbered lists, tables, ### headings.
 */
export default function Markdown({ text = '' }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push(
        <table key={blocks.length}>
          <thead><tr>{header.map((h, j) => <th key={j}>{inline(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    }

    if (/^\s*([-*•])\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•])\s+/, ''));
      blocks.push(<ul key={blocks.length}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push(<ol key={blocks.length}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>);
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      blocks.push(<h4 key={blocks.length}>{inline(heading[1])}</h4>);
      i++;
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+[.)]|\|)\s*/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) para.push(lines[i++]);
    blocks.push(<p key={blocks.length}>{para.map((p, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(p)}</React.Fragment>)}</p>);
  }

  return <div className="md">{blocks}</div>;
}

function splitRow(row) {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+)/g;

function inline(text) {
  const parts = String(text).split(TOKEN).filter(p => p !== '');
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) return safeLink(link[2], link[1], i);
    if (/^https?:\/\//.test(p)) return safeLink(p, p.length > 40 ? p.slice(0, 37) + '…' : p, i);
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

function safeLink(href, label, key) {
  if (!/^(https?:|\/)/.test(href)) return <React.Fragment key={key}>{label}</React.Fragment>;
  return <a key={key} href={href} target={href.startsWith('/') ? undefined : '_blank'} rel="noreferrer">{label}</a>;
}
