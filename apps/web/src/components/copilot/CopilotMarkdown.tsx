import React from 'react';
import { renderInlineMarkdown } from './markdown/renderInlineMarkdown';

export interface CopilotMarkdownProps {
  text: string;
}

export const CopilotMarkdown: React.FC<CopilotMarkdownProps> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

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
          {renderInlineMarkdown(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-[var(--ink)] mt-3 mb-1">
          {renderInlineMarkdown(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-[var(--ink)] mt-3 mb-1">
          {renderInlineMarkdown(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-xs text-[var(--ink)] my-0.5">
          {renderInlineMarkdown(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match && match[2] !== undefined) {
        elements.push(
          <li key={`oli-${i}`} className="ml-4 list-decimal text-xs text-[var(--ink)] my-0.5">
            {renderInlineMarkdown(match[2])}
          </li>
        );
      }
    } else if (line.trim() === '') {
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-[var(--ink)] leading-relaxed my-1">
          {renderInlineMarkdown(line)}
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
