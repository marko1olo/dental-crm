import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { KnowledgeService } from '../../../services/knowledge/knowledgeService';

export function renderInlineMarkdown(str: string): React.ReactNode {
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

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch[0] && linkMatch[1] !== undefined && linkMatch[2] !== undefined) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];

      if (linkUrl.startsWith('action:launch-tour:')) {
        const partsUrl = linkUrl.split(':');
        const trackId = partsUrl[2] || '';
        const componentId = partsUrl[3] || trackId;

        parts.push(
          <button
            key={`tour-btn-${keyIdx++}`}
            type="button"
            data-testid="copilot-tour-launch-btn"
            data-action={linkUrl}
            onClick={() => KnowledgeService.launchInteractiveTour(componentId || trackId || 'solo_doctor')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 my-1 rounded-md text-xs font-semibold bg-[var(--teal,#0d9488)] text-white hover:bg-[var(--teal-strong,#0f766e)] shadow-xs transition-colors cursor-pointer"
            title="Запустить интерактивное обучение по разделу"
          >
            <Gamepad2 size={14} className="shrink-0 text-white" />
            <span>{linkText}</span>
          </button>
        );
      } else {
        parts.push(
          <a
            key={`a-${keyIdx++}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--teal)] underline hover:text-[var(--teal-strong,#0f766e)] inline-flex items-center gap-1"
          >
            {linkText}
          </a>
        );
      }

      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextPos = remaining.search(/(\*\*|`|\*|\[)/);
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
}
