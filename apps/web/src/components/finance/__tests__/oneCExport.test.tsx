import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { OneCExportButton } from '../OneCExportButton';
import { FiscalReceipt54FzModal } from '../FiscalReceipt54FzModal';
import { Billing1CExportModal } from '../Billing1CExportModal';
import { generateOneCEnterpriseXml } from '@dental/shared';
import type { TreatmentPlanItem } from '../../treatment-plans/types';

const SAMPLE_ITEMS: readonly TreatmentPlanItem[] = [
  {
    id: 'proc_1',
    code804n: 'A16.07.002.001',
    toothNumber: 16,
    name: 'Наложение временной пломбы',
    category: 'Терапия',
    quantity: 1,
    unitPriceRub: 1200,
    discountRub: 0,
    priceRub: 1200,
    phase: 1,
    stageKind: 'stage_1_therapy',
  },
  {
    id: 'proc_2',
    code804n: 'A16.07.030.002',
    toothNumber: 16,
    name: 'Обработка 3 корневых каналов',
    category: 'Эндодонтия',
    quantity: 3,
    unitPriceRub: 3500,
    discountRub: 500,
    priceRub: 10000,
    phase: 1,
    stageKind: 'stage_1_therapy',
  },
];

describe('1C:Enterprise XML Export Button & Engine', () => {
  it('renders OneCExportButton with 1-click XML export button in DOM', () => {
    const items = [
      {
        id: 'srv-1',
        name: 'Лечение кариеса с пломбированием световой композит',
        code804n: 'A16.07.002.001',
        toothNumber: 16,
        quantity: 1,
        priceRub: 5500,
        discountRub: 500,
      },
    ];

    const html = renderToString(
      <OneCExportButton
        actNumber="АКТ-2026-880"
        documentDate="2026-08-27"
        docType="act"
        patientName="Иванов Иван Иванович"
        items={items}
        totalRub={5000}
      />
    );

    assert.ok(html.includes('data-testid="1c-export-xml-button"'));
    assert.ok(html.includes('Экспорт в 1С (XML)'));
  });

  it('generates valid CommerceML 2.09 XML document for 1C:Enterprise', () => {
    const exportParams = {
      exportId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      generatedAt: '2026-08-27T12:00:00.000Z',
      clinic: {
        id: 'clinic-1',
        name: 'ООО «ДЕНТЕ СТОМАТОЛОГИЯ»',
        inn: '7701234567',
        kpp: '770101001',
        isLegalEntity: true,
      },
      documents: [
        {
          id: 'doc-1',
          number: 'АКТ-2026-880',
          documentDate: '2026-08-27',
          docType: 'act' as const,
          operationName: 'Реализация медицинских услуг',
          patient: {
            id: 'pat-1',
            name: 'Иванов Иван Иванович',
            isLegalEntity: false,
          },
          items: [
            {
              id: 'it-1',
              name: 'Лечение кариеса A16.07.002',
              priceKopecks: 500000,
              quantity: 1,
              totalKopecks: 500000,
              discountPercent: 0,
              vatRate: 'Без НДС',
              vatAmountKopecks: 0,
            },
          ],
          totalKopecks: 500000,
        },
      ],
    };

    const xml = generateOneCEnterpriseXml(exportParams);
    assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<КоммерческаяИнформация'));
    assert.ok(xml.includes('ВерсияСхемы="2.09"'));
    assert.ok(xml.includes('ООО «ДЕНТЕ СТОМАТОЛОГИЯ»'));
    assert.ok(xml.includes('АКТ-2026-880'));
    assert.ok(xml.includes('Иванов Иван Иванович'));
    assert.ok(xml.includes('5000.00'));
  });

  it('renders FiscalReceipt54FzModal with 1C:Enterprise XML Export Tab', () => {
    const html = renderToString(
      <FiscalReceipt54FzModal
        isOpen={true}
        onClose={() => {}}
        items={SAMPLE_ITEMS}
        patientId="PAT-2026-0891"
        patientName="Смирнова Екатерина Васильевна"
        initialTab="oneC"
      />
    );

    // Verify 1C Tab active and content rendered
    assert.ok(html.includes('data-testid="1c-enterprise-export-panel"'));
    assert.ok(html.includes('1С:Предприятие 8.3 / Бухгалтерия &amp; УТ') || html.includes('1С:Предприятие 8.3 / Бухгалтерия & УТ'));
    assert.ok(html.includes('CommerceML 2.09'));
    assert.ok(html.includes('149 НК РФ'));
    assert.ok(html.includes('ОКЕИ 796'));
    assert.ok(html.includes('КНД 1151156'));
    assert.ok(html.includes('data-testid="1c-export-xml-button"'));
    assert.ok(html.includes('Предпросмотр XML-пакета CommerceML 2.09'));
  });

  it('renders FiscalReceipt54FzModal header without ellipsis truncation classes', () => {
    const html = renderToString(
      <FiscalReceipt54FzModal
        isOpen={true}
        onClose={() => {}}
        items={SAMPLE_ITEMS}
        patientId="PAT-2026-0891"
        patientName="Смирнова Екатерина Васильевна"
        initialTab="payment"
      />
    );

    // Verify exact non-truncated text and flex containers
    assert.ok(html.includes('Фискализация 54-ФЗ &amp; Прием платежей') || html.includes('Фискализация 54-ФЗ & Прием платежей'));
    assert.ok(html.includes('Смирнова Екатерина Васильевна'));
    assert.ok(html.includes('min-w-0 max-w-full flex-1'));
    assert.ok(html.includes('whitespace-normal break-normal'));
    assert.ok(html.includes('data-testid="tab-1c-export"'));
  });

  it('renders 1C XML export button with statutory CommerceML 2.09 integration', () => {
    const btnHtml = renderToString(
      <OneCExportButton
        actNumber="АКТ-2026-880"
        documentDate="2026-08-27"
        docType="act"
        patientName="Смирнова Екатерина Васильевна"
        items={SAMPLE_ITEMS}
        totalRub={11200}
      />
    );
    assert.ok(btnHtml.includes('Экспорт в 1С (XML)'));
    assert.ok(btnHtml.includes('data-testid="1c-export-xml-button"'));
  });

  it('renders Billing1CExportModal with non-truncated CommerceML 2.09 & 54-FZ header and mobile-safe export button', () => {
    const html = renderToString(
      <Billing1CExportModal
        isOpen={true}
        onClose={() => {}}
        items={SAMPLE_ITEMS}
        patientId="PAT-2026-0891"
        patientName="Смирнова Екатерина Васильевна"
        totalRub={11200}
      />
    );

    assert.ok(html.includes('data-testid="billing-1c-export-modal"'));
    assert.ok(html.includes('1С:Предприятие 8.3 / Экспорт в CommerceML 2.09 &amp; 54-ФЗ') || html.includes('1С:Предприятие 8.3 / Экспорт в CommerceML 2.09 & 54-ФЗ'));
    assert.ok(html.includes('CommerceML 2.09'));
    assert.ok(html.includes('ФФД 1.2'));
    assert.ok(html.includes('Смирнова Екатерина Васильевна'));
    assert.ok(html.includes('Экспорт в 1С (XML)'));
    assert.ok(html.includes('Сводка для бухгалтерии'));
  });
});


