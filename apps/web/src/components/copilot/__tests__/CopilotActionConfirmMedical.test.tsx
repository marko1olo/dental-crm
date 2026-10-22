import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { CopilotActionConfirm } from '../CopilotActionConfirm';

describe('CopilotActionConfirm Specialized 1-Click Medical Buttons', () => {
  it('displays 1-click EMR diary button for save_protocol_043', () => {
    const html = renderToString(
      <CopilotActionConfirm
        name="save_protocol_043"
        args={{
          tooth: '36',
          diagnosis: 'K02.1 Кариес дентина',
          complaints: 'Боль на холодное',
          treatment: 'Пломбирование светоотверждаемым композитом',
        }}
      />
    );
    assert.ok(html.includes('ДЕНТА сформировала дневник приёма'));
    assert.ok(html.includes('Внести в дневник приёма'));
    assert.ok(html.includes('Жалобы пациента'));
    assert.ok(html.includes('Лечение и процедуры'));
  });

  it('displays 1-click plan approval button for calculate_treatment_estimate', () => {
    const html = renderToString(
      <CopilotActionConfirm
        name="calculate_treatment_estimate"
        args={{ teeth: ['36', '37'], tier_key: 'optimum', amount_rub: 84500 }}
      />
    );
    assert.ok(html.includes('ДЕНТА предлагает план лечения'));
    assert.ok(html.includes('Утвердить план лечения'));
  });

  it('displays 1-click drug replacement button for check_drug_interactions', () => {
    const html = renderToString(
      <CopilotActionConfirm
        name="check_drug_interactions"
        args={{ medication: 'Амоксиклав', safe_alternative: 'Кларитромицин 500 мг', allergen: 'Пенициллины' }}
      />
    );
    assert.ok(html.includes('Проверка взаимодействия лекарств (DDI)'));
    assert.ok(html.includes('Заменить на безопасный препарат'));
    assert.ok(html.includes('Безопасный аналог'));
  });
});
