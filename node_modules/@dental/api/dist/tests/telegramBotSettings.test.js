import test from "node:test";
import assert from "node:assert";
import { updateDenteTelegramBotSettings } from "../telegram/legacyMocks.js";
test("updateDenteTelegramBotSettings - normalizeTelegramPublicHttpsUrl", async (t) => {
    await t.test("throws invalid_url for an unparseable URL", () => {
        assert.throws(() => updateDenteTelegramBotSettings({ webhookBaseUrl: "://not a url" }), { message: "webhookBaseUrl: invalid_url" });
    });
});
