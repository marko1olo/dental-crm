import React from 'react';

export interface CopilotMarkdownProps {
  text: string;
}

export const CopilotMarkdown: React.FC<CopilotMarkdownProps> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const renderInline = (str: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = str;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch[0] && boldMatch[1] !== undefined) {
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-semibold text-[var(--ink)]">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch && codeMatch[0] && codeMatch[1] !== undefined) {
        parts.push(
          <code
            key={`c-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-mono text-[var(--teal)]"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch && italicMatch[0] && italicMatch[1] !== undefined) {
        parts.push(
          <em key={`i-${keyIdx++}`} className="italic">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      const nextPos = remaining.search(/(\*\*|`|\*)/);
      if (nextPos === -1) {
        parts.push(remaining);
        break;
      } else if (nextPos === 0) {
        parts.push(remaining[0] || '');
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextPos));
        remaining = remaining.slice(nextPos);
      }
    }

    return <>{parts}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`codeblock-${i}`}
            className="p-3 my-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] overflow-x-auto"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-[var(--ink)] mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-[var(--ink)] mt-3 mb-1">
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-[var(--ink)] mt-3 mb-1">
          {renderInline(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-xs text-[var(--ink)] my-0.5">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match && match[2] !== undefined) {
        elements.push(
          <li key={`oli-${i}`} className="ml-4 list-decimal text-xs text-[var(--ink)] my-0.5">
            {renderInline(match[2])}
          </li>
        );
      }
    } else if (line.trim() === '') {
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-[var(--ink)] leading-relaxed my-1">
          {renderInline(line)}
        </p>
      );
    }
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key="codeblock-tail"
        className="p-3 my-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] overflow-x-auto"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};
