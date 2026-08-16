import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Decimal } from 'decimal.js';
import { ChairRevenuePerHourOptimizer } from './ChairRevenuePerHourOptimizer.js';

test('ChairRevenuePerHourOptimizer should calculate metrics correctly', () => {
  const stats = {
    roomId: 'room-1',
    specialty: 'surgery' as const,
    totalRevenue: new Decimal(100000),
    workedHours: new Decimal(5),
    totalAvailableHours: new Decimal(8),
  };

  const result = ChairRevenuePerHourOptimizer.analyze(stats);

  assert.equal(result.roomId, 'room-1');
  assert.ok(result.currentRevenuePerHour.equals(new Decimal(20000)));
  assert.ok(result.benchmarkRevenuePerHour.equals(new Decimal(15000)));
  assert.equal(result.isPerforming, true);
  
  // (8 - 5) * 15000 = 45000
  assert.ok(result.vacantChairLoss.equals(new Decimal(45000)));
});

test('ChairRevenuePerHourOptimizer should identify underperforming chair', () => {
  const stats = {
    roomId: 'room-2',
    specialty: 'therapy' as const,
    totalRevenue: new Decimal(5000),
    workedHours: new Decimal(2),
    totalAvailableHours: new Decimal(8),
  };

  const result = ChairRevenuePerHourOptimizer.analyze(stats);

  assert.ok(result.currentRevenuePerHour.equals(new Decimal(2500)));
  assert.equal(result.isPerforming, false);
  
  // (8 - 2) * 6000 = 36000
  assert.ok(result.vacantChairLoss.equals(new Decimal(36000)));
});
