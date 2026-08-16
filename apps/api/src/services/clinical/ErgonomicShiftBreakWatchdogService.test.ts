import { test } from 'node:test';
import assert from 'node:assert';
import { ErgonomicShiftBreakWatchdogService } from './ErgonomicShiftBreakWatchdogService.js';

test('ErgonomicShiftBreakWatchdogService - should warn on long session', () => {
    const startTime = new Date(Date.now() - 95 * 60 * 1000).toISOString();
    const status = {
        sessions: [],
        currentSessionStartTime: startTime,
        totalDailyMicroscopeMinutes: 0
    };
    const alerts = ErgonomicShiftBreakWatchdogService.checkStatus(status, new Date());
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0]!.type, 'break_recommended');
});

test('ErgonomicShiftBreakWatchdogService - should warn on daily limit', () => {
    const status = {
        sessions: [],
        totalDailyMicroscopeMinutes: 400
    };
    const alerts = ErgonomicShiftBreakWatchdogService.checkStatus(status, new Date());
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0]!.type, 'daily_ergonomic_limit_exceeded');
});

test('ErgonomicShiftBreakWatchdogService - should be clean when normal', () => {
    const startTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const status = {
        sessions: [],
        currentSessionStartTime: startTime,
        totalDailyMicroscopeMinutes: 60
    };
    const alerts = ErgonomicShiftBreakWatchdogService.checkStatus(status, new Date());
    assert.strictEqual(alerts.length, 0);
});
