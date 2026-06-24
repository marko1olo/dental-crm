import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

describe('mock import testing', () => {
  test('mocking an esm module exported property directly', async () => {
    const visits = await import('./apps/api/src/routes/visits.js');
    console.log(Object.getOwnPropertyDescriptor(visits, 'sendVisitDraftMutationError'))
  });
});
