import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import { createDenteApiApp } from '../server.js';
describe('CORS Configuration', () => {
    let app = null;
    const originalWebOrigin = process.env.WEB_ORIGIN;
    afterEach(async () => {
        if (originalWebOrigin !== undefined) {
            process.env.WEB_ORIGIN = originalWebOrigin;
        }
        else {
            delete process.env.WEB_ORIGIN;
        }
        if (app) {
            await app.close();
            app = null;
        }
    });
    test('Denies CORS when WEB_ORIGIN is not set', async () => {
        delete process.env.WEB_ORIGIN;
        app = await createDenteApiApp({ startTelegramWorker: false });
        const response = await app.inject({
            method: 'OPTIONS',
            url: '/api/health',
            headers: {
                'Origin': 'http://evil.com',
                'Access-Control-Request-Method': 'GET',
            }
        });
        assert.strictEqual(response.headers['access-control-allow-origin'], undefined);
    });
    test('Allows CORS for configured WEB_ORIGIN', async () => {
        process.env.WEB_ORIGIN = 'https://myclinic.com';
        app = await createDenteApiApp({ startTelegramWorker: false });
        const response = await app.inject({
            method: 'OPTIONS',
            url: '/api/health',
            headers: {
                'Origin': 'https://myclinic.com',
                'Access-Control-Request-Method': 'GET',
            }
        });
        assert.strictEqual(response.headers['access-control-allow-origin'], 'https://myclinic.com');
    });
    test('Allows CORS for multiple configured WEB_ORIGIN domains', async () => {
        process.env.WEB_ORIGIN = 'https://myclinic.com,http://localhost:5173';
        app = await createDenteApiApp({ startTelegramWorker: false });
        const response1 = await app.inject({
            method: 'OPTIONS',
            url: '/api/health',
            headers: {
                'Origin': 'https://myclinic.com',
                'Access-Control-Request-Method': 'GET',
            }
        });
        assert.strictEqual(response1.headers['access-control-allow-origin'], 'https://myclinic.com');
        const response2 = await app.inject({
            method: 'OPTIONS',
            url: '/api/health',
            headers: {
                'Origin': 'http://localhost:5173',
                'Access-Control-Request-Method': 'GET',
            }
        });
        assert.strictEqual(response2.headers['access-control-allow-origin'], 'http://localhost:5173');
        const response3 = await app.inject({
            method: 'OPTIONS',
            url: '/api/health',
            headers: {
                'Origin': 'https://evil.com',
                'Access-Control-Request-Method': 'GET',
            }
        });
        assert.strictEqual(response3.headers['access-control-allow-origin'], undefined);
    });
});
