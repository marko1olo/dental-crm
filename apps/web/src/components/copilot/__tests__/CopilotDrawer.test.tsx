import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotDrawer } from '../CopilotDrawer';

describe('CopilotDrawer Canonical SSOT & Responsive Rendering', () => {
  it('renders full CopilotDrawer with split-view dock, context bar, and tabs', () => {
    const html = renderToString(
      <CopilotDrawer
        isOpen={true}
        messages={[{ kind: 'text', role: 'assistant', text: 'Привет, доктор!' }]}
        busy={false}
        phase={null}
        pending={null}
        nameCache={{}}
        nudges={[]}
        activeTab="chat"
        onTabChange={() => {}}
        onClose={() => {}}
        onSend={() => {}}
        onConfirm={() => {}}
        onReset={() => {}}
        onDismissNudge={() => {}}
      />
    );
    assert.ok(html.includes('ДЕНТА — Клинический ассистент'));
    assert.ok(html.includes('Привет, доктор!'));
    assert.ok(html.includes('Чат'));
    assert.ok(html.includes('Задачи'));
    assert.ok(html.includes('Split-View'));
    assert.ok(html.includes('copilot-context-bar'));
    assert.ok(!html.includes('copilot-backdrop'));
  });

  it('renders Tasks tab with operational shift debts (recalls and estimates)', () => {
    const html = renderToString(
      <CopilotDrawer
        isOpen={true}
        messages={[]}
        busy={false}
        phase={null}
        pending={null}
        nameCache={{}}
        nudges={[]}
        activeTab="pending"
        onTabChange={() => {}}
        onClose={() => {}}
        onSend={() => {}}
        onConfirm={() => {}}
        onReset={() => {}}
        onDismissNudge={() => {}}
      />
    );
    assert.ok(html.includes('copilot-tasks-tab-content'));
    assert.ok(html.includes('Задачи смены'));
    assert.ok(html.includes('Просроченные рекаллы'));
    assert.ok(html.includes('Ожидают ответа по смете'));
  });

  it('renders Apple HIG mobile drag handle for native touch drawer', () => {
    const html = renderToString(
      <CopilotDrawer
        isOpen={true}
        messages={[]}
        busy={false}
        phase={null}
        pending={null}
        nameCache={{}}
        nudges={[]}
        activeTab="chat"
        onTabChange={() => {}}
        onClose={() => {}}
        onSend={() => {}}
        onConfirm={() => {}}
        onReset={() => {}}
        onDismissNudge={() => {}}
      />
    );
    assert.ok(html.includes('copilot-drawer-drag-handle'));
  });
});
