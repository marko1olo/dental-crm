import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { OneCExportButton } from '../OneCExportButton';
import { Billing1CExportModal } from '../Billing1CExportModal';
import { generateOneCEnterpriseXml, type OneCExportParams } from '@dental/shared';

describe('1C CommerceML Zero-Price Autonomy & Theme Tokens', () => {
  const zeroPriceItems = [
    {
      id: 'srv-warranty-1',
      name: 'Гарантийная переделка пломбы (0 ₽)',
      code804n: 'A16.07.002.001',
      toothNumber: 16,
      quantity: 1,
      priceRub: 0,
      discountRub: 0,
    },
    {
      id: 'srv-free-checkup',
      name: 'Профилактический осмотр полости рта (Бесплатно)',
      code804n: 'A01.07.001',
      quantity: 1,
      priceRub: 0,
      discountRub: 0,
    },
  ];

  it('generates CommerceML XML with safe <Процент>0</Процент> on zero-price warranty items (no NaN, no Infinity)', () => {
    const exportParams: OneCExportParams = {
      exportId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      generatedAt: '2026-09-09T12:00:00.000Z',
      clinic: {
        id: 'clinic-1',
        name: 'ООО «ДЕНТЕ СТОМАТОЛОГИЯ»',
        inn: '7701234567',
        kpp: '770101001',
        isLegalEntity: true,
      },
      documents: [
        {
          id: 'doc-warranty-1',
          number: 'АКТ-2026-000',
          documentDate: '2026-09-09',
          docType: 'act',
          operationName: 'Реализация медицинских услуг',
          patient: {
            id: 'pat-1',
            name: 'Гарантийный Пациент',
            isLegalEntity: false,
          },
          items: [
            {
              id: 'it-warranty-1',
              name: 'Гарантийная работа (0 ₽)',
              code804n: 'A16.07.002.001',
              toothNumber: 16,
              quantity: 1,
              priceKopecks: 0,
              discountPercent: 0,
              totalKopecks: 0,
              vatRate: 'Без НДС',
              vatAmountKopecks: 0,
            },
          ],
          totalKopecks: 0,
        },
      ],
    };

    const xml = generateOneCEnterpriseXml(exportParams);

    assert.ok(xml.includes('<Процент>0</Процент>'), 'XML must contain <Процент>0</Процент>');
    assert.ok(!xml.includes('Infinity'), 'XML must strictly not contain Infinity');
    assert.ok(!xml.includes('NaN'), 'XML must strictly not contain NaN');
    assert.ok(xml.includes('<Сумма>0.00</Сумма>'), 'XML must contain sum 0.00');
  });

  it('sanitizes NaN and Infinity discountPercent values to 0 in CommerceML XML generator', () => {
    const exportParams: OneCExportParams = {
      exportId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e',
      generatedAt: '2026-09-09T12:00:00.000Z',
      clinic: {
        id: 'clinic-1',
        name: 'ООО «ДЕНТЕ СТОМАТОЛОГИЯ»',
        inn: '7701234567',
        kpp: '770101001',
        isLegalEntity: true,
      },
      documents: [
        {
          id: 'doc-nan-guard',
          number: 'АКТ-GUARD-1',
          documentDate: '2026-09-09',
          docType: 'act',
          operationName: 'Реализация медицинских услуг',
          patient: {
            id: 'pat-2',
            name: 'Тестовый Пациент',
            isLegalEntity: false,
          },
          items: [
            {
              id: 'it-nan-1',
              name: 'Тест гарда некорректного процента',
              quantity: 1,
              priceKopecks: 0,
              // Cast non-finite values to test generator resilience
              discountPercent: Number.NaN as unknown as number,
              totalKopecks: 0,
              vatRate: 'Без НДС',
              vatAmountKopecks: 0,
            },
            {
              id: 'it-inf-2',
              name: 'Тест гарда бесконечного процента',
              quantity: 1,
              priceKopecks: 0,
              discountPercent: Number.POSITIVE_INFINITY as unknown as number,
              totalKopecks: 0,
              vatRate: 'Без НДС',
              vatAmountKopecks: 0,
            },
          ],
          totalKopecks: 0,
        },
      ],
    };

    const xml = generateOneCEnterpriseXml(exportParams);

    assert.ok(!xml.includes('<Процент>NaN</Процент>'), 'XML output must not contain <Процент>NaN</Процент>');
    assert.ok(!xml.includes('<Процент>Infinity</Процент>'), 'XML output must not contain <Процент>Infinity</Процент>');
    assert.ok(!xml.includes('Infinity'), 'XML output must not contain Infinity');
    assert.ok(!xml.includes('NaN'), 'XML output must not contain NaN');
    // Both items must have safe <Процент>0</Процент>
    const matches = xml.match(/<Процент>0<\/Процент>/g);
    assert.ok(matches && matches.length >= 2, 'Both guarded items must render <Процент>0</Процент>');
  });

  it('renders Billing1CExportModal with zero-price items without throwing', () => {
    const html = renderToString(
      <Billing1CExportModal
        isOpen={true}
        onClose={() => {}}
        items={zeroPriceItems}
        patientName="Сидоров С.С."
        actNumber="АКТ-000-001"
      />
    );

    assert.ok(html.includes('data-testid="billing-1c-export-modal"'));
    assert.ok(html.includes('Сидоров С.С.'));
    assert.ok(html.includes('Гарантийная переделка пломбы'));
    assert.ok(html.includes('0,00 ₽') || html.includes('0 ₽'));
  });

  it('verifies Billing1CExportModal HTML contains NO hardcoded Tailwind slate-800/slate-900 classes', () => {
    const html = renderToString(
      <Billing1CExportModal
        isOpen={true}
        onClose={() => {}}
        items={zeroPriceItems}
        patientName="Сидоров С.С."
      />
    );

    // Mandate UI-07: Strictly no hardcoded background/border Tailwind slate classes
    assert.ok(
      !html.includes('bg-white dark:bg-slate-800'),
      'Modal must not contain hardcoded "bg-white dark:bg-slate-800"'
    );
    assert.ok(
      !html.includes('bg-white dark:bg-slate-900'),
      'Modal must not contain hardcoded "bg-white dark:bg-slate-900"'
    );
    assert.ok(
      !html.includes('border-slate-300 dark:border-slate-700'),
      'Modal must not contain hardcoded "border-slate-300 dark:border-slate-700"'
    );

    // Verify adaptive design tokens are used
    assert.ok(html.includes('var(--paper,'), 'Modal must use --paper token');
    assert.ok(html.includes('var(--paper-soft,'), 'Modal must use --paper-soft token');
    assert.ok(html.includes('var(--line,'), 'Modal must use --line token');
    assert.ok(html.includes('var(--ink,'), 'Modal must use --ink token');
    assert.ok(html.includes('var(--muted,'), 'Modal must use --muted token');
  });

  it('verifies zero cartoon emojis in Billing1CExportModal and OneCExportButton (Mandate 8d p. 7)', () => {
    const modalHtml = renderToString(
      <Billing1CExportModal
        isOpen={true}
        onClose={() => {}}
        items={zeroPriceItems}
        patientName="Сидоров С.С."
      />
    );

    const btnHtml = renderToString(
      <OneCExportButton
        actNumber="АКТ-2026-TEST"
        items={zeroPriceItems}
        totalRub={0}
      />
    );

    // Emoji regex checking for pictorial emojis in rendered HTML
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

    assert.strictEqual(
      emojiRegex.test(modalHtml),
      false,
      'Billing1CExportModal must strictly contain zero emojis (vector Lucide icons only)'
    );

    assert.strictEqual(
      emojiRegex.test(btnHtml),
      false,
      'OneCExportButton must strictly contain zero emojis'
    );
  });
});
