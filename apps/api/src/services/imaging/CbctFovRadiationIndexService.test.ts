import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CbctFovRadiationIndexService } from './CbctFovRadiationIndexService.js';

describe('CbctFovRadiationIndexService', () => {
  const service = new CbctFovRadiationIndexService();

  it('should calculate radiation for SMALL_5x5', () => {
    const result = service.calculate('SMALL_5x5');
    assert.equal(result.effectiveDoseMicrosv, 22.5);
    assert.equal(result.dapMgyCm2, 225);
  });

  it('should calculate radiation for MEDIUM_8x8', () => {
    const result = service.calculate('MEDIUM_8x8');
    assert.equal(result.effectiveDoseMicrosv, 60);
    assert.equal(result.dapMgyCm2, 525);
  });

  it('should calculate radiation for LARGE_12x10', () => {
    const result = service.calculate('LARGE_12x10');
    assert.equal(result.effectiveDoseMicrosv, 120);
    assert.equal(result.dapMgyCm2, 1050);
  });
});
