import assert from 'node:assert';
import { describe, it } from 'node:test';
import { HydrofluoricAcidSafetyService } from './HydrofluoricAcidSafetyService.js';

describe('HydrofluoricAcidSafetyService', () => {
  const service = new HydrofluoricAcidSafetyService();

  it('should return correct protocol for E.max (LithiumDisilicate)', () => {
    const protocol = service.getEtchingProtocol('LithiumDisilicate', 5);
    assert.strictEqual(protocol.etchingTimeSeconds, 20);
  });

  it('should throw error for E.max with 9.5% HF', () => {
    assert.throws(() => service.getEtchingProtocol('LithiumDisilicate', 9.5));
  });

  it('should return correct protocol for Feldspathic ceramic', () => {
    const protocol = service.getEtchingProtocol('Feldspathic', 9.5);
    assert.strictEqual(protocol.etchingTimeSeconds, 60);
  });

  it('should throw error for Zirconia', () => {
    assert.throws(() => service.getEtchingProtocol('Zirconia', 5));
  });

  it('should validate neutralization time', () => {
    assert.strictEqual(service.validateNeutralization(120), true);
    assert.strictEqual(service.validateNeutralization(60), false);
  });
});
