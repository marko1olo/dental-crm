import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startWatchdog } from './watchdog';

test('startWatchdog logs the expected deprecation message', (t) => {
  const logMock = t.mock.method(console, 'log', () => {});
  startWatchdog();
  assert.equal(logMock.mock.calls.length, 1);
  assert.equal(
    logMock.mock.calls[0].arguments[0],
    '[Watchdog] Local folder watcher disabled. X-Rays are now uploaded directly via the web interface (VisiographAnalyzer).'
  );
});
