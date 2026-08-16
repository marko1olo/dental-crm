import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApexLocatorWorkingLengthService } from './ApexLocatorWorkingLengthService.js';

describe('ApexLocatorWorkingLengthService', () => {
  it('should validate working length range', () => {
    assert.throws(() => ApexLocatorWorkingLengthService.validateWorkingLength(10));
    assert.doesNotThrow(() => ApexLocatorWorkingLengthService.validateWorkingLength(20));
  });

  it('should detect missing MB2 in upper molars', () => {
    const warnings = ApexLocatorWorkingLengthService.validateCanalCompleteness(16, [
      { canal: 'MB1', referencePoint: 'MB', apexLocatorReading: 0.5, workingLengthMm: 20, masterFileIso: 25, taper: 0.04 }
    ]);
    assert.strictEqual(warnings.length, 1);
    assert.ok(warnings[0]?.includes('МВ2'));
  });

  it('should create valid record', () => {
    const record = ApexLocatorWorkingLengthService.createRecord(16, [
      { canal: 'MB1', referencePoint: 'MB', apexLocatorReading: 0.5, workingLengthMm: 20, masterFileIso: 25, taper: 0.04 },
      { canal: 'MB2', referencePoint: 'MB', apexLocatorReading: 0.5, workingLengthMm: 20, masterFileIso: 20, taper: 0.04 }
    ]);
    assert.strictEqual(record.toothNumber, 16);
    assert.strictEqual(record.channels.length, 2);
  });
});
