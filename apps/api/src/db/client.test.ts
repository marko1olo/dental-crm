import { test } from "node:test";
import assert from "node:assert";
import { requireDatabaseUrl } from "./client.js";

test("client throws error when DATABASE_URL is missing", () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
        requireDatabaseUrl();
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

test("client throws error when DATABASE_URL is empty string", () => {
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "   ";

    try {
        requireDatabaseUrl();
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
