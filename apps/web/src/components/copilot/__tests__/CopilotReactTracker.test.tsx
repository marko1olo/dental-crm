import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotReactTracker } from '../CopilotGenerativeCards';

describe('Copilot ReAct Agentic Loop & Tracker', () => {
  it('renders default canonical clinical ReAct steps', () => {
    const html = renderToString(<CopilotReactTracker />);
    assert.ok(html.includes('ReAct Цикл ДЕНТЫ') || html.includes('Автономное выполнение'));
    assert.ok(html.includes('Шаг 1') && html.includes('Шаг 2'));
  });

  it('renders live step progression and active indicator', () => {
    const customSteps = [
      { id: 's1', stepNumber: 1, title: 'Поиск карты пациента', status: 'done' as const, detail: 'Найден пациент Иванов' },
      { id: 's2', stepNumber: 2, title: 'Анализ снимка зуба 36', status: 'running' as const },
    ];
    const html = renderToString(<CopilotReactTracker title="Голосовой протокол врача" steps={customSteps} currentStepIndex={1} isComplete={false} />);
    assert.ok(html.includes('Голосовой протокол врача') && html.includes('Выполняется шаг 2 из 2'));
  });

  it('renders completed state with success banner', () => {
    const html = renderToString(<CopilotReactTracker isComplete={true} />);
    assert.ok(html.includes('Все шаги клинического рассуждения успешно завершены'));
  });
});
