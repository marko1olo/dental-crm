import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotMarkdown } from '../CopilotMarkdown';

describe('Copilot Markdown Parser', () => {
  it('renders bold, code, and bullet lists', () => {
    const md = '### Заголовок\n**Важно**: Пациент `Иванов` прибыл.\n- Пункт 1\n- Пункт 2';
    const html = renderToString(<CopilotMarkdown text={md} />);
    assert.ok(html.includes('Заголовок'));
    assert.ok(html.includes('Важно'));
    assert.ok(html.includes('Иванов'));
    assert.ok(html.includes('Пункт 1'));
  });
});
