import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { personalizeTreatmentPlan } from './treatmentPlanPersonalize.js';

test('personalizeTreatmentPlan tests', async (t) => {
  const originalEnv = process.env;

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  const basePayload = {
    clinicalReason: 'Caries',
    diagnosisSummary: 'Dental caries',
    teethOrArea: '11',
    plannedStages: [],
    alternatives: [],
    risksAndLimitations: [],
    prognosisAndLimits: '',
  };

  await t.test('returns rule-based fallback when neural configuration is disabled', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = 'false';
    const result = await personalizeTreatmentPlan(basePayload as any);
    assert.match(result.patientFriendlyExplanation, /\*\*Почему важно провести лечение:\*\*/);
    assert.match(result.patientHygieneAdvice, /\*\*Базовые правила домашней гигиены от DENTE:\*\*/);
  });

  await t.test('uses primary explicitApiKey and calls fetch', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = 'true';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'openai';
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'test-api-key';

    const fetchMock = t.mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ patientFriendlyExplanation: 'AI Expl', patientHygieneAdvice: 'AI Adv' }) } }]
        })
      };
    });

    const result = await personalizeTreatmentPlan(basePayload as any);

    assert.strictEqual(fetchMock.mock.callCount(), 1);
    const callArgs = fetchMock.mock.calls[0].arguments;
    assert.strictEqual(callArgs[0], 'https://api.openai.com/v1/chat/completions');

    assert.strictEqual(result.patientFriendlyExplanation, 'AI Expl');
    assert.strictEqual(result.patientHygieneAdvice, 'AI Adv');
  });

  await t.test('handles non-JSON text wrapping from AI', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = 'true';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'openai';
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'test-api-key';

    t.mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Here is your response:\n\n```json\n{"patientFriendlyExplanation": "AI Expl2", "patientHygieneAdvice": "AI Adv2"}\n```' } }]
        })
      };
    });

    const result = await personalizeTreatmentPlan(basePayload as any);
    assert.strictEqual(result.patientFriendlyExplanation, 'AI Expl2');
    assert.strictEqual(result.patientHygieneAdvice, 'AI Adv2');
  });

  await t.test('cascades to fallback providers on primary provider failure', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = 'true';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'openai';
    // Remove explicit API key so it tries to use the pool, but fails! Wait, it cascades regardless of explicit/pool if the attempt fails.
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'fail-key';
    process.env.GOOGLE_API_KEY = 'fallback-gemini-key';
    process.env.GROQ_API_KEY = 'fallback-groq-key';
    process.env.OPENAI_API_KEY = 'fallback-openai-key';

    // Mock console.warn to keep output clean
    t.mock.method(console, 'warn', () => {});

    let fetchCalls = 0;
    const fetchMock = t.mock.method(global, 'fetch', async () => {
      fetchCalls++;
      if (fetchCalls === 1) {
        // First call fails
        return { ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({}) };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ patientFriendlyExplanation: 'Cascade Expl', patientHygieneAdvice: 'Cascade Adv' }) } }]
        })
      };
    });

    const result = await personalizeTreatmentPlan(basePayload as any);

    assert.ok(fetchMock.mock.callCount() >= 2);
    const firstCallUrl = fetchMock.mock.calls[0].arguments[0];
    const secondCallUrl = fetchMock.mock.calls[1].arguments[0];
    assert.strictEqual(firstCallUrl, 'https://api.openai.com/v1/chat/completions');
    assert.strictEqual(secondCallUrl, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');

    assert.strictEqual(result.patientFriendlyExplanation, 'Cascade Expl');
  });

  await t.test('returns rule-based fallback when all AI calls fail', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = 'true';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'openai';
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'fail-key';
    process.env.GOOGLE_API_KEY = 'fail-key2';
    process.env.GROQ_API_KEY = 'fail-key3';

    // Mock console.warn and console.error
    t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'error', () => {});

    const fetchMock = t.mock.method(global, 'fetch', async () => {
      return { ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({}) };
    });

    const result = await personalizeTreatmentPlan(basePayload as any);

    assert.ok(fetchMock.mock.callCount() >= 1);
    assert.match(result.patientFriendlyExplanation, /\*\*Ваш план лечения:\*\*/);
  });
});
