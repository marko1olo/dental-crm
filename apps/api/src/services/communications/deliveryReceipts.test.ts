import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  parseSmsRuReceipts,
  parseSmscReceipt,
  parseWhatsappStatuses,
  readReceiptSecret,
  receiptSecretMatches
} from "./deliveryReceipts.js";

describe("parseSmsRuReceipts", () => {
  it("returns empty array for non-string or empty input", () => {
    assert.deepEqual(parseSmsRuReceipts(null), []);
    assert.deepEqual(parseSmsRuReceipts("   "), []);
  });

  it("parses valid receipt lines", () => {
    const input = "msg1=103\nmsg2=104";
    const result = parseSmsRuReceipts(input);
    assert.equal(result.length, 2);
    assert.equal(result[0].providerMessageId, "msg1");
    assert.equal(result[0].state, "delivered");
    assert.match(result[0].detail, /Доставлено/);
    assert.equal(result[1].providerMessageId, "msg2");
    assert.equal(result[1].state, "failed");
  });

  it("handles unknown codes", () => {
    const result = parseSmsRuReceipts("msg1=999");
    assert.equal(result.length, 1);
    assert.equal(result[0].state, "unknown");
    assert.match(result[0].detail, /состояние не распознано/);
  });
});

describe("parseSmscReceipt", () => {
  it("returns null for missing or invalid id", () => {
    assert.equal(parseSmscReceipt({}), null);
    assert.equal(parseSmscReceipt({ id: "  " }), null);
  });

  it("parses valid receipt", () => {
    const result = parseSmscReceipt({ id: "msg1", status: 1 });
    assert.equal(result?.providerMessageId, "msg1");
    assert.equal(result?.state, "delivered");
  });

  it("handles error codes", () => {
    const result = parseSmscReceipt({ id: "msg1", status: 22, err: "8" });
    assert.equal(result?.state, "failed");
    assert.match(result?.detail!, /код ошибки 8/);
  });
});

describe("parseWhatsappStatuses", () => {
  it("returns empty array for non-array", () => {
    assert.deepEqual(parseWhatsappStatuses(null), []);
  });

  it("parses delivered status", () => {
    const result = parseWhatsappStatuses([{ id: "msg1", status: "delivered" }]);
    assert.equal(result[0].providerMessageId, "msg1");
    assert.equal(result[0].state, "delivered");
  });

  it("parses failed status with error code", () => {
    const result = parseWhatsappStatuses([{
      id: "msg1",
      status: "failed",
      errors: [{ code: 131026 }]
    }]);
    assert.equal(result[0].state, "failed");
    assert.match(result[0].detail, /у получателя нет WhatsApp/);
  });
});

describe("readReceiptSecret", () => {
  it("returns null if not set", () => {
    assert.equal(readReceiptSecret({}), null);
  });

  it("returns null if too short", () => {
    assert.equal(readReceiptSecret({ DENTE_COMMUNICATION_RECEIPT_SECRET: "short" }), null);
  });

  it("returns secret if valid", () => {
    assert.equal(readReceiptSecret({ DENTE_COMMUNICATION_RECEIPT_SECRET: "0123456789abcdef" }), "0123456789abcdef");
  });
});

describe("receiptSecretMatches", () => {
  it("matches identical secrets", () => {
    assert.equal(receiptSecretMatches("0123456789abcdef", "0123456789abcdef"), true);
  });

  it("rejects different lengths", () => {
    assert.equal(receiptSecretMatches("0123456789abcde", "0123456789abcdef"), false);
  });

  it("rejects non-strings", () => {
    assert.equal(receiptSecretMatches(null, "0123456789abcdef"), false);
  });
});
