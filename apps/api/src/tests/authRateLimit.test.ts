import test from "node:test";
import assert from "node:assert";
import { createDenteApiApp } from "../server.js";

test("auth routes rate limiting - clinic login", async (t) => {
  const app = await createDenteApiApp({ startTelegramWorker: false });

  // Test successful requests under limit (5 requests allowed per minute)
  for (let i = 0; i < 5; i++) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/clinic/login',
      payload: {
        email: 'test@example.com',
        password: 'wrong_password_for_test'
      }
    });
    // Even if credentials are wrong, rate limiter shouldn't block, so it returns 401 or 500 etc. but not 429
    assert.notStrictEqual(res.statusCode, 429, `Request ${i+1} should not be rate limited`);
  }

  // Test rate limited request
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/clinic/login',
    payload: {
      email: 'test@example.com',
      password: 'wrong_password_for_test'
    }
  });

  assert.strictEqual(res.statusCode, 429, "6th request should be rate limited");
  assert.strictEqual(Number(res.headers['x-ratelimit-remaining']), 0);

  await app.close();
});
