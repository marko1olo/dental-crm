import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startWatchdog } from './watchdog.js';

test('startWatchdog logs the expected deprecation message', (t) => {
  const logMock = t.mock.method(console, 'log', () => {});
  startWatchdog();
  assert.equal(logMock.mock.calls.length, 1);
  /* Вызов достаётся в переменную и проверяется: длину списка выше компилятор не видит. */
  const firstCall = logMock.mock.calls[0];
  assert.ok(firstCall, 'startWatchdog не написал ни одной строки в журнал');
  assert.equal(
    firstCall.arguments[0],
    '[Watchdog] Local folder watcher disabled. X-Rays are now uploaded directly via the web interface (VisiographAnalyzer).'
  );
});
