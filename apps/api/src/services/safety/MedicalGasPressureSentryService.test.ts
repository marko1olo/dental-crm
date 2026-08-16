import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MedicalGasPressureSentryService } from './MedicalGasPressureSentryService.js';

describe('MedicalGasPressureSentryService', () => {
  const service = new MedicalGasPressureSentryService();

  it('should report normal status for optimal readings', () => {
    const report = service.checkReadings({
      compressedAirBar: 6.0,
      vacuumBar: -0.25,
      n2oBar: 4.5,
      o2Bar: 4.5,
    });
    assert.strictEqual(report.compressedAir.status, 'normal');
    assert.strictEqual(report.vacuum.status, 'normal');
    assert.strictEqual(report.n2o.status, 'normal');
    assert.strictEqual(report.o2.status, 'normal');
  });

  it('should detect emergency_lockout for low compressed air', () => {
    const report = service.checkReadings({
      compressedAirBar: 4.9,
      vacuumBar: -0.25,
      n2oBar: 4.5,
      o2Bar: 4.5,
    });
    assert.strictEqual(report.compressedAir.status, 'emergency_lockout');
  });

  it('should detect emergency_lockout for vacuum loss', () => {
    const report = service.checkReadings({
      compressedAirBar: 6.0,
      vacuumBar: -0.1,
      n2oBar: 4.5,
      o2Bar: 4.5,
    });
    assert.strictEqual(report.vacuum.status, 'emergency_lockout');
  });

  it('should detect emergency_lockout for low N2O/O2', () => {
    const report = service.checkReadings({
      compressedAirBar: 6.0,
      vacuumBar: -0.25,
      n2oBar: 3.4,
      o2Bar: 4.5,
    });
    assert.strictEqual(report.n2o.status, 'emergency_lockout');
  });
});
