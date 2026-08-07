import { test } from 'node:test';
import assert from 'node:assert';

test('mock fetch', async (t) => {
    t.mock.method(global, 'fetch', async () => new Response('mocked'));
    const res = await fetch('http://example.com');
    const text = await res.text();
    assert.strictEqual(text, 'mocked');
});
