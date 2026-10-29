import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotLabOrderCard } from '../CopilotLabOrderCard';
import { CopilotDrugInteractionCard } from '../CopilotDrugInteractionCard';
import { CopilotTimelineCard } from '../CopilotTimelineCard';
import { CopilotResultCard } from '../CopilotResultCard';

describe('Copilot Specialized Result Cards', () => {
  it('renders CopilotLabOrderCard with VITA shade and delivery status', () => {
    const orders = [{
      id: 'LAB-2026-104',
      prosthesis_kind: 'Циркониевая коронка на каркасе',
      tooth: '2.6',
      vita_shade: 'A2',
      status: 'in_production',
      eta: '2026-08-29T12:00:00Z',
      lab_name: 'Зуботехническая лаборатория «Артис»',
    }];
    const html = renderToString(<CopilotLabOrderCard orders={orders} />);
    assert.ok(html.includes('LAB-2026-104') && html.includes('Циркониевая коронка'));
    assert.ok(html.includes('VITA') && html.includes('A2'));
  });

  it('renders CopilotDrugInteractionCard with contraindication warnings', () => {
    const interactions = [{
      severity: 'contraindicated',
      medicationA: 'Амоксициллин',
      medicationB: 'Метотрексат',
      description: 'Увеличение токсичности метотрексата за счет снижения почечного клиренса.',
      medical_advice: 'Заменить антибиотик на спирамицин/кларитромицин под контролем формулы крови.',
    }];
    const html = renderToString(
      <CopilotDrugInteractionCard
        interactions={interactions}
        patientAllergies={['Пенициллины']}
        safeAlternatives={['Кларитромицин', 'Азитромицин']}
      />
    );
    assert.ok(html.includes('ПРОТИВОПОКАЗАНО') && html.includes('Амоксициллин'));
    assert.ok(html.includes('Клиническая рекомендация') && html.includes('Пенициллины'));
  });

  it('renders CopilotTimelineCard with chronological visits and ICD-10 codes', () => {
    const events = [
      { id: 'ev-1', date: '2026-08-20T10:00:00Z', type: 'visit', title: 'Первичный осмотр и диагностика кариеса', doctor_name: 'Д-р Смирнов А.В.', specialty: 'Терапевт', icd10: 'K02.1', teeth: ['1.6', '1.7'] },
      { id: 'ev-2', date: '2026-08-25T14:00:00Z', type: 'payment', title: 'Оплата этапа лечения', amount_rub: 14500 },
    ];
    const html = renderToString(<CopilotTimelineCard events={events} patientId="pat-10" />);
    assert.ok(html.includes('Первичный осмотр') && html.includes('Смирнов') && html.includes('K02.1'));
  });

  it('dispatches specialized cards via CopilotResultCard', () => {
    const labResult = { lab_orders: [{ order_id: 'LAB-99', prosthesis_kind: 'E.max винир', vita_shade: 'BL2', status: 'ready' }] };
    const htmlLab = renderToString(<CopilotResultCard name="get_lab_orders" result={labResult} />);
    assert.ok(htmlLab.includes('E.max винир') && htmlLab.includes('BL2'));

    const drugResult = { interactions: [{ severity: 'high', title: 'Лидокаин + Неселективные бета-блокаторы', description: 'Риск гипертензии.' }] };
    const htmlDrug = renderToString(<CopilotResultCard name="check_drug_interactions" result={drugResult} />);
    assert.ok(htmlDrug.includes('Лидокаин') || htmlDrug.includes('гипертензии'));
  });

  it('renders Desktop Native Workstation screen capture and study files cards via CopilotResultCard', () => {
    const captureResult = {
      screen_capture: {
        appName: 'Planmeca Romexis 6.2 (Визиограф)',
        dimensions: '1440x900',
        format: 'PNG',
        filePath: 'C:/Clinic_MVP/dental-crm/storage/radiology/RVG_tooth_36.png',
        status: 'Снимок готов и прикреплён к ЭМК',
      },
    };
    const htmlCapture = renderToString(
      <CopilotResultCard name="workstation.capture_screen" result={captureResult} />
    );
    assert.ok(htmlCapture.includes('Оптический захват визиографа (ПК)'));
    assert.ok(htmlCapture.includes('Planmeca Romexis'));
    assert.ok(htmlCapture.includes('1440x900'));
    assert.ok(htmlCapture.includes('Открыть RVG'));

    const filesResult = {
      workstation_files: {
        folderPath: 'C:/MedicalStudies/Romexis',
        totalFound: 2,
        files: [
          { name: 'CT_36_3D.dcm', sizeBytes: 44040192 },
          { name: 'RVG_36.png', sizeBytes: 2097152 },
        ],
      },
    };
    const htmlFiles = renderToString(
      <CopilotResultCard name="search_workstation_files" result={filesResult} />
    );
    assert.ok(htmlFiles.includes('Снимки и КЛКТ на рабочей станции'));
    assert.ok(htmlFiles.includes('CT_36_3D.dcm'));
    assert.ok(htmlFiles.includes('Открыть папку томографа'));
  });
});
