import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { _sendVisitDraftMutationErrorForTesting } from '../../routes/visits.js';
import type { FastifyReply } from 'fastify';

describe('sendVisitDraftMutationError', () => {
  test('handles "Визит не найден" error', () => {
    const error = new Error('Визит не найден');
    const sendMock = mock.fn();
    const codeMock = mock.fn((code: number) => ({ send: sendMock }));
    const reply = { code: codeMock } as unknown as FastifyReply;

    _sendVisitDraftMutationErrorForTesting(error, reply, 'autosave');

    assert.strictEqual(codeMock.mock.calls[0].arguments[0], 404);
    assert.deepStrictEqual(sendMock.mock.calls[0].arguments[0], {
      error: 'VisitNotFound',
      reason: 'visit_not_found',
      message: 'Прием не найден. Обновите рабочий экран и выберите актуальный прием.'
    });
  });

  test('handles "Прием уже закрыт или аннулирован" error for autosave', () => {
    const error = new Error('Прием уже закрыт или аннулирован');
    const sendMock = mock.fn();
    const codeMock = mock.fn((code: number) => ({ send: sendMock }));
    const reply = { code: codeMock } as unknown as FastifyReply;

    _sendVisitDraftMutationErrorForTesting(error, reply, 'autosave');

    assert.strictEqual(codeMock.mock.calls[0].arguments[0], 409);
    assert.deepStrictEqual(sendMock.mock.calls[0].arguments[0], {
      error: 'VisitDraftMutationRejected',
      reason: 'visit_closed',
      message: 'Черновик приема не сохранен: этот прием уже недоступен для изменений.'
    });
  });

  test('handles "Прием уже закрыт или аннулирован" error for accept', () => {
    const error = new Error('Прием уже закрыт или аннулирован');
    const sendMock = mock.fn();
    const codeMock = mock.fn((code: number) => ({ send: sendMock }));
    const reply = { code: codeMock } as unknown as FastifyReply;

    _sendVisitDraftMutationErrorForTesting(error, reply, 'accept');

    assert.strictEqual(codeMock.mock.calls[0].arguments[0], 409);
    assert.deepStrictEqual(sendMock.mock.calls[0].arguments[0], {
      error: 'VisitDraftMutationRejected',
      reason: 'visit_closed',
      message: 'Черновик приема не принят: этот прием уже недоступен для изменений.'
    });
  });

  test('handles generic errors', () => {
    const error = new Error('Some other error');
    const sendMock = mock.fn();
    const codeMock = mock.fn((code: number) => ({ send: sendMock }));
    const reply = { code: codeMock } as unknown as FastifyReply;

    _sendVisitDraftMutationErrorForTesting(error, reply, 'autosave');

    assert.strictEqual(codeMock.mock.calls[0].arguments[0], 409);
    assert.deepStrictEqual(sendMock.mock.calls[0].arguments[0], {
      error: 'VisitDraftMutationRejected',
      reason: 'visit_draft_rejected',
      message: 'Черновик приема не изменен: обновите прием и повторите действие.'
    });
  });
});
