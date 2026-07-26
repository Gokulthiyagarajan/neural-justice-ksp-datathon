import React from 'react';

/**
 * Lightweight, dependency-free Markdown renderer for AI Copilot answers.
 * Supports the subset an LLM typically emits: headings, bold/italic, inline
 * code, fenced code blocks, ordered/unordered lists, blockquotes, GFM tables,
 * and links. Renders React elements only (no dangerouslySetInnerHTML).
 */

let keySeq = 0;
const k = () => `md-${keySeq++}`;

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Order: code spans, bold, italic, links. Use a tokenizing regex.
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      nodes.push(
        <code key={k()} className="px-1 py-0.5 rounded bg-black/10 text-[0.85em] font-mono">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith('**')) {
      nodes.push(<strong key={k()} className="font-semibold">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      nodes.push(<em key={k()}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('[')) {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (lm) {
        const external = lm[2].startsWith('http');
        nodes.push(
          <a
            key={k()}
            href={lm[2]}
            className="text-[var(--accent-cyan)] hover:underline"
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {lm[1]}
          </a>
        );
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function parseTable(lines: string[]): React.ReactNode {
  const header = lines[0].split('|').map((c) => c.trim()).filter((c) => c !== '');
  const rows = lines.slice(2).map((l) =>
    l.split('|').map((c) => c.trim()).filter((c) => c !== '')
  );
  return (
    <div key={k()} className="my-3 overflow-x-auto rounded-[12px] border border-border-primary">
      <table className="w-full text-sm">
        <thead className="bg-bg-tertiary">
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-text-secondary">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-border-primary">
              {r.map((c, ci) => (
                <td key={ci} className="px-3 py-2 text-text-primary align-top">
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];
  let listOrdered = false;

  const flushList = () => {
    if (!listBuffer.length) return;
    const items = listBuffer.map((it, idx) => (
      <li key={idx} className="ml-1">{renderInline(it)}</li>
    ));
    blocks.push(
      listOrdered ? (
        <ol key={k()} className="list-decimal pl-5 space-y-1 my-2 text-text-primary">{items}</ol>
      ) : (
        <ul key={k()} className="list-disc pl-5 space-y-1 my-2 text-text-primary">{items}</ul>
      )
    );
    listBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre key={k()} className="my-3 p-3 rounded-[12px] bg-black/90 text-text-primary text-xs overflow-x-auto">
          <code className="font-mono">{code.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Table (GFM): header row + separator row
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /\|[\s:-]+\|/.test(lines[i + 1])
    ) {
      flushList();
      const tableLines = [line];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    // Heading
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const cls =
        level === 1 ? 'text-lg font-bold mt-3 mb-1'
        : level === 2 ? 'text-base font-semibold mt-3 mb-1'
        : 'text-sm font-semibold mt-2 mb-1';
      const Tag = (`h${level}` as keyof JSX.IntrinsicElements);
      blocks.push(<Tag key={k()} className={cls}>{renderInline(heading[2])}</Tag>);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      flushList();
      blocks.push(
        <blockquote key={k()} className="border-l-2 border-[var(--accent-cyan)] pl-3 my-2 text-text-secondary italic">
          {renderInline(line.trim().slice(1).trim())}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered list
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (listOrdered) flushList();
      listOrdered = false;
      listBuffer.push(ul[1]);
      i++;
      continue;
    }

    // Ordered list
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (!listOrdered) flushList();
      listOrdered = true;
      listBuffer.push(ol[1]);
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    // Paragraph (merge consecutive non-special lines)
    flushList();
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>')
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={k()} className="my-2 leading-relaxed text-text-primary">
        {renderInline(para.join(' '))}
      </p>
    );
  }
  flushList();

  return <div className="text-sm">{blocks}</div>;
}
