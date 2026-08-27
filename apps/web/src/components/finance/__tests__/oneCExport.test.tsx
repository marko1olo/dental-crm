import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { OneCExportButton } from '../OneCExportButton';
import { generateOneCEnterpriseXml } from '@dental/shared';

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
});
