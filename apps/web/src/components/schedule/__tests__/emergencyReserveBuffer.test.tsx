import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { ScheduleGrid } from '../ScheduleGrid';
import type { Dashboard } from '@dental/shared';

describe('Schedule Emergency Reserve Buffer', () => {
  it('renders emergency reserve buffer slots with CITO styling in multi-chair view', () => {
    const mockDashboard = {
      clinicSettings: {
        profile: {
          organizationId: 'c-1',
          clinicName: 'DENTE',
          timezone: 'Europe/Moscow',
          phone: '+7 999 123-45-67',
          address: 'Москва, ул. Тверская 1',
          inn: '7701234567',
          mode: 'small_clinic',
          updatedAt: new Date().toISOString(),
        },
        chairs: [
          {
            id: 'chair-1',
            organizationId: 'c-1',
            name: 'Кабинет 1 (Терапия)',
            active: true,
            notes: null,
            room: '1',
            specialization: 'therapist',
            hasXraySensor: false,
            hasMicroscope: false,
            hasSurgeryKit: false,
          },
          {
            id: 'chair-2',
            organizationId: 'c-1',
            name: 'Кабинет 2 (Хирургия)',
            active: true,
            notes: null,
            room: '2',
            specialization: 'surgery',
            hasXraySensor: true,
            hasMicroscope: false,
            hasSurgeryKit: true,
          },
        ],
        staff: [
          {
            id: 'doc-1',
            organizationId: 'c-1',
            fullName: 'Д-р Ковалев С.П.',
            role: 'doctor',
            active: true,
            color: '#0d9488',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      patients: [
        {
          id: 'p-1',
          organizationId: 'c-1',
          fullName: 'Смирнов Андрей',
          status: 'active',
          phone: '+7 999 000-00-00',
          email: null,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      appointments: [],
    } as unknown as Dashboard;

    const html = renderToString(
      <ScheduleGrid
        dashboard={mockDashboard}
        dateKey="2026-08-27"
        appointments={[]}
        onSlotClick={() => {}}
        onAppointmentClick={() => {}}
        patientName={(_, id) => id ? 'Пациент' : '—'}
        formatTime={(iso) => iso.slice(11, 16)}
        toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
        appointmentLabels={{
          planned: 'Запланирован',
          confirmed: 'Подтвержден',
          arrived: 'Пришел',
          in_treatment: 'В кресле',
          completed: 'Завершен',
          cancelled: 'Отменен',
          no_show: 'Не явился',
        }}
      />
    );

    assert.ok(html.includes('Кабинет 1 (Терапия)'));
    assert.ok(html.includes('data-testid="schedule-emergency-buffer-slot"'));
    assert.ok(html.includes('Острая боль'));
    assert.ok(html.includes('Резерв'));
  });
});
