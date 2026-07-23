import { test, describe } from 'node:test';
import assert from 'node:assert';
import { analyzePricelist } from '../pricelist/analyzer.js';
describe('Pricelist Analyzer - Deterministic Parsing', () => {
    test('parses zirconia crown correctly', async () => {
        const rawText = "Коронка циркониевая MultiLayer 35 000 руб";
        const request = {
            sourceName: "test-doc",
            sourceKind: "spreadsheet_copy",
            rawText,
            preferredSpecialty: "universal",
            useServerAi: false,
            imageMimeType: "image/jpeg"
        };
        const response = await analyzePricelist(request);
        assert.strictEqual(response.items.length, 1);
        const item = response.items[0];
        assert.strictEqual(item?.category, "prosthetics");
        assert.strictEqual(item?.materialKind, "zirconia");
        assert.strictEqual(item?.restorationType, "crown");
        assert.strictEqual(item?.priceRub, 35000);
    });
    test('parses multiple rows correctly', async () => {
        const rawText = [
            "Коронка циркониевая MultiLayer 35 000 руб",
            "Коронка IPS e.max 32 000 руб",
            "ОПТГ 2 500 руб",
            "Элайнеры Star Smile 160 000 руб"
        ].join("\n");
        const request = {
            sourceName: "test-doc",
            sourceKind: "spreadsheet_copy",
            rawText,
            preferredSpecialty: "universal",
            useServerAi: false,
            imageMimeType: "image/jpeg"
        };
        const response = await analyzePricelist(request);
        assert.strictEqual(response.items.length, 4);
        const zirconia = response.items.find((i) => i.title.toLowerCase().includes("циркониевая"));
        assert.strictEqual(zirconia?.category, "prosthetics");
        assert.strictEqual(zirconia?.materialKind, "zirconia");
        assert.strictEqual(zirconia?.priceRub, 35000);
        const emax = response.items.find((i) => i.title.includes("IPS e.max"));
        assert.strictEqual(emax?.materialKind, "lithium_disilicate");
        assert.strictEqual(emax?.brand, "IPS e.max");
        assert.strictEqual(emax?.priceRub, 32000);
        const imaging = response.items.find((i) => i.title.includes("ОПТГ"));
        assert.strictEqual(imaging?.category, "imaging");
        assert.strictEqual(imaging?.materialKind, "imaging");
        assert.strictEqual(imaging?.priceRub, 2500);
        const aligner = response.items.find((i) => i.title.includes("Star Smile"));
        assert.strictEqual(aligner?.category, "orthodontics");
        assert.strictEqual(aligner?.materialKind, "aligner");
        assert.strictEqual(aligner?.priceRub, 160000);
    });
});
test('handles empty text correctly', async () => {
    const request = {
        sourceName: "empty-doc",
        sourceKind: "spreadsheet_copy",
        rawText: "   \n   \t  \n",
        imageMimeType: "image/jpeg",
        preferredSpecialty: "universal",
        useServerAi: false
    };
    const response = await analyzePricelist(request);
    assert.strictEqual(response.items.length, 0);
    assert.strictEqual(response.warnings.includes("no_pricelist_rows_detected"), true);
});
test('handles invalid image payloads when AI is requested', async () => {
    const request = {
        sourceName: "invalid-image-doc",
        sourceKind: "photo_ocr",
        rawText: "Коронка циркониевая MultiLayer 35 000 руб",
        imageBase64: Buffer.from("not a real image").toString("base64"),
        imageMimeType: "image/jpeg",
        preferredSpecialty: "universal",
        useServerAi: true
    };
    const response = await analyzePricelist(request);
    // Fallbacks to deterministic mode
    assert.strictEqual(response.items.length, 1);
    assert.strictEqual(response.warnings.includes("image_payload_invalid"), true);
    assert.strictEqual(response.warnings.includes("groq_skipped_invalid_image_payload"), true);
    assert.strictEqual(response.aiVision.used, false);
});
test('handles image supplied but AI disabled', async () => {
    // We pass a valid-looking base64 payload to ensure it is not skipped due to invalidity
    const validImageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
    const request = {
        sourceName: "disabled-ai-doc",
        sourceKind: "photo_ocr",
        rawText: "ОПТГ 2 500 руб",
        imageBase64: validImageBuffer.toString("base64"),
        imageMimeType: "image/jpeg",
        preferredSpecialty: "universal",
        useServerAi: false
    };
    const response = await analyzePricelist(request);
    assert.strictEqual(response.items.length, 1);
    assert.strictEqual(response.warnings.includes("image_supplied_but_server_ai_disabled"), true);
});
test('handles successful AI response from Groq', async (t) => {
    // Setup API keys to ensure key pool is not empty
    process.env.GROQ_API_KEYS = "test_key_1,test_key_2";
    // We need to mock node fetch globally to avoid actually hitting the Groq API
    t.mock.method(global, 'fetch', async (url, init) => {
        return {
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                items: [
                                    {
                                        sourceLine: 1,
                                        sourceText: "Коронка циркониевая",
                                        title: "Коронка циркониевая",
                                        category: "prosthetics",
                                        specialty: "orthopedist",
                                        materialKind: "zirconia",
                                        restorationType: "crown",
                                        priceRub: 35000,
                                        confidence: 0.95,
                                        warnings: []
                                    }
                                ]
                            })
                        }
                    }
                ]
            })
        };
    });
    const request = {
        sourceName: "ai-doc",
        sourceKind: "text",
        rawText: "Коронка циркониевая",
        imageMimeType: "image/jpeg",
        preferredSpecialty: "universal",
        useServerAi: true
    };
    const response = await analyzePricelist(request);
    assert.strictEqual(response.aiVision.used, true);
    assert.strictEqual(response.items.length, 1);
    assert.strictEqual(response.items[0]?.category, "prosthetics");
    assert.strictEqual(response.items[0]?.priceRub, 35000);
    assert.strictEqual(response.parserMode, "groq_json");
});
test('handles Groq API failure gracefully and falls back to deterministic', async (t) => {
    process.env.GROQ_API_KEYS = "test_key_fail";
    t.mock.method(global, 'fetch', async () => {
        return {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: async () => ({ error: { message: "Simulated Groq Failure" } })
        };
    });
    const request = {
        sourceName: "ai-fail-doc",
        sourceKind: "text",
        rawText: "Коронка циркониевая MultiLayer 35 000 руб",
        imageMimeType: "image/jpeg",
        preferredSpecialty: "universal",
        useServerAi: true
    };
    const response = await analyzePricelist(request);
    assert.strictEqual(response.aiVision.used, false);
    assert.strictEqual(response.parserMode, "deterministic_groq_fallback");
    assert.strictEqual(response.items.length, 1);
    assert.strictEqual(response.items[0]?.materialKind, "zirconia");
    const hasGroqFailedWarning = response.warnings.some(w => w.startsWith("groq_failed:"));
    assert.strictEqual(hasGroqFailedWarning, true);
});
