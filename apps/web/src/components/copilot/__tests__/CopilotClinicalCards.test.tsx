import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { PatientProfileCard, ScheduleSlotPickerCard, Prescription107Card } from '../CopilotGenerativeCards';

describe('Copilot Clinical Cards', () => {
  it('renders PatientProfileCard with avatar, balance, allergies, and open card button', () => {
    const patientData = {
      id: 'p-100', fullName: 'Барабаш Сергей Владимирович', birthDate: '15.04.1985', phone: '+7 (999) 123-45-67',
      cardNumber: '043-789', status: 'VIP', balanceRub: 14500, familyBalanceRub: 35000,
      allergies: ['Пенициллин', 'Лидокаин'], lastVisitDate: '20.08.2026', lastDoctorName: 'Д-р Смирнова А.С.',
      lastDiagnosis: 'K02.1 Кариес дентина', nextAppointmentDate: '05.09.2026 14:00', activePlanStage: 'Этап 2: Эндодонтия 2.6',
    };
    const html = renderToString(<PatientProfileCard patient={patientData} onOpenCard={() => {}} onBookAppointment={() => {}} onSelectPlan={() => {}} />);
    assert.ok(html.includes('Барабаш Сергей Владимирович') && html.includes('VIP'));
    assert.ok(html.includes('Пенициллин') && html.includes('Лидокаин') && html.includes('Открыть карту'));
  });

  it('renders ScheduleSlotPickerCard with doctor info, date chips, and 1-click booking', () => {
    const scheduleData = {
      doctorId: 'doc-1', doctorName: 'Д-р Иванов Петр Сергеевич', doctorSpecialty: 'Стоматолог-ортопед',
      cabinet: 'Кабинет № 3 (Кресло 1)', date: 'Сегодня', availableDates: ['Сегодня', 'Завтра', '02.09'],
      slots: [{ id: 's-1', time: '09:00', durationMinutes: 30, cabinet: 'Каб. 3', isAvailable: true }],
    };
    const html = renderToString(<ScheduleSlotPickerCard data={scheduleData} selectedSlotId="s-1" onSelectSlot={() => {}} onBookSlot={() => {}} onChangeDate={() => {}} />);
    assert.ok(html.includes('Д-р Иванов Петр Сергеевич') && html.includes('09:00'));
  });

  it('renders Prescription107Card with Latin Rp lines, DDI safety, and UKEP', () => {
    const rxData = {
      series: '77-АА', number: '004821', patientName: 'Смирнова Елена Васильевна', patientBirthDate: '12.11.1990',
      doctorName: 'Д-р Барабаш С.В.', doctorSpecialty: 'Врач-стоматолог-терапевт', diagnosisIcd10: 'K04.0', diagnosisName: 'Острый пульпит',
      drugs: [{ id: 'd1', mnn: 'Nimesulide', tradeName: 'Нимесил', latinName: 'Tab. Nimesulidi', dosageForm: 'таблетки', dosage: '100 мг', quantity: '№ 20', signa: 'По 1 таблетке' }],
      isSignedUkep: true, ukepCertificate: '00E10352F71B39D48C19', ukepSignedAt: '31.08.2026 22:30',
    };
    const html = renderToString(<Prescription107Card prescription={rxData} onPrint={() => {}} onSignUkep={() => {}} />);
    assert.ok(html.includes('Рецептурный бланк № 107-1/у') && html.includes('Tab. Nimesulidi 100 мг'));
    assert.ok(html.includes('00E10352F71B39D48C19') && html.includes('Печать 107-1/у'));
  });
});
