import { test } from "node:test";
import assert from "node:assert";

test("client throws error when DATABASE_URL is missing", async () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
        await import(`./client.js?t=${Date.now()}`);
        assert.fail("Should have thrown an error");
    } catch (error: any) {
        assert.strictEqual(
            error.message,
            "DATABASE_URL не задан. Укажите строку подключения к PostgreSQL в .env — тот же адрес использует npm run db:migrate."
        );
    } finally {
        if (originalUrl !== undefined) {
            process.env.DATABASE_URL = originalUrl;
        } else {
            delete process.env.DATABASE_URL;
        }
    }
});

test("client throws error when DATABASE_URL is empty string", async () => {
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "   ";

    try {
        await import(`./client.js?t=${Date.now()}`);
        assert.fail("Should have thrown an error");
    } catch (error: any) {
        assert.strictEqual(
            error.message,
            "DATABASE_URL не задан. Укажите строку подключения к PostgreSQL в .env — тот же адрес использует npm run db:migrate."
        );
    } finally {
        if (originalUrl !== undefined) {
            process.env.DATABASE_URL = originalUrl;
        } else {
            delete process.env.DATABASE_URL;
        }
    }
});
