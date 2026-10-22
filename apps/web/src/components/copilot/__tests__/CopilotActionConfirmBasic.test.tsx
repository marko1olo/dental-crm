import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import {
  CopilotActionConfirm,
  CopilotActionConfirm as CopilotActionConfirmation,
  CopilotActionConfirm as CopilotConfirmCard,
} from '../CopilotActionConfirm';

describe('CopilotActionConfirm Basic & Diff Verification', () => {
  it('renders CopilotActionConfirm with 3-way choices and humanized arguments', () => {
    const args = { patient_id: 'pat-1', start_time: '2026-08-27T15:00:00Z', duration_minutes: 45, cabinet: 'Кабинет №1' };
    const html = renderToString(<CopilotActionConfirm callId="c1" name="agenda.book_appointment" args={args} onConfirm={() => {}} />);
    assert.ok(html.includes('Запись на прием'));
    assert.ok(html.includes('Требуется подтверждение'));
    assert.ok(html.includes('Подтвердить') && html.includes('Изменить') && html.includes('Отклонить'));
  });

  it('renders CopilotActionConfirm with destructive styling and resolved states', () => {
    const args = { medication: 'Амоксициллин 500мг', quantity: 2 };
    const htmlDestructive = renderToString(<CopilotActionConfirm callId="c2" name="inventory.dispense_drugs" args={args} onConfirm={() => {}} />);
    assert.ok(htmlDestructive.includes('Списание лекарственных средств') || htmlDestructive.includes('Списание медикаментов'));

    const htmlConfirmed = renderToString(<CopilotActionConfirm callId="c2" name="inventory.dispense_drugs" args={args} resolved="confirm" />);
    assert.ok(htmlConfirmed.includes('Подтверждено'));
  });

  it('renders CopilotActionConfirm with visual clinical diff', () => {
    const htmlTooth = renderToString(
      <CopilotActionConfirm
        callId="c-diff-1" name="update_odontogram"
        args={{ tooth: '36', status: 'treatment', treatment: 'Пломба световая (Estelite Sigma Quick)' }}
        onConfirm={() => {}}
      />
    );
    assert.ok(htmlTooth.includes('Зуб 36') && htmlTooth.includes('Было') && htmlTooth.includes('Будет изменено'));
  });

  it('renders CopilotActionConfirmation component with backward compatibility', () => {
    const args = { patient_id: 'pat-1', start_time: '2026-08-27T15:00:00Z', duration_minutes: 45 };
    const html = renderToString(<CopilotConfirmCard callId="c1" name="book_appointment" args={args} onConfirm={() => {}} />);
    assert.ok(html.includes('Требуется подтверждение') && html.includes('Подтвердить'));
  });
});
