import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotPatientCard } from '../CopilotPatientCard';
import { CopilotAppointmentCard } from '../CopilotAppointmentCard';
import { CopilotSlotCard } from '../CopilotSlotCard';
import { CopilotComposer } from '../CopilotComposer';

describe('Copilot Core Cards & SSR Rendering', () => {
  it('renders CopilotPatientCard with details', () => {
    const patient = { id: 'pat-123', full_name: 'Иванов Иван Иванович', phone: '+7 999 123-45-67', email: 'ivanov@example.com', status: 'active', date_of_birth: '1985-05-12' };
    const html = renderToString(<CopilotPatientCard patient={patient} onSelectPatient={() => {}} />);
    assert.ok(html.includes('Иванов Иван Иванович') && html.includes('+7 999 123-45-67'));
  });

  it('renders CopilotAppointmentCard with status badge', () => {
    const appt = { id: 'appt-1', patient_name: 'Петрова Анна', start_time: '2026-08-27T14:00:00Z', end_time: '2026-08-27T15:00:00Z', status: 'confirmed', cabinet: 'Кабинет №2 (Терапия)' };
    const html = renderToString(<CopilotAppointmentCard appointment={appt} onSelectAppointment={() => {}} />);
    assert.ok(html.includes('Петрова Анна') && html.includes('Подтвержден'));
  });

  it('renders CopilotSlotCard with available windows', () => {
    const slots = [{ start_time: '2026-08-27T10:00:00Z', end_time: '2026-08-27T11:00:00Z', cabinet: 'Кабинет №1' }];
    const html = renderToString(<CopilotSlotCard slots={slots} onBookSlot={() => {}} />);
    assert.ok(html.includes('Кабинет №1'));
  });

  it('renders CopilotComposer with dictation mic and hotkeys', () => {
    const html = renderToString(<CopilotComposer value="Тест" busy={false} onChange={() => {}} onSubmit={() => {}} onReset={() => {}} />);
    assert.ok(html.includes('Медицинская тайна и защита данных') || html.includes('защита данных'));
    assert.ok(html.includes('Ctrl+K') && html.includes('copilot-mic-btn'));
  });
});
