
import assert from "node:assert";
import { describe, it } from "node:test";
import { PatientDocumentParserService } from "./PatientDocumentParserService.js";

describe("PatientDocumentParserService", () => {
  it("validates passport", () => {
    assert.strictEqual(PatientDocumentParserService.validatePassport("1234", "123456", "123-456"), true);
    assert.strictEqual(PatientDocumentParserService.validatePassport("12 34", "123456", "123-456"), true);
    assert.strictEqual(PatientDocumentParserService.validatePassport("123", "123456", "123-456"), false);
    assert.strictEqual(PatientDocumentParserService.validatePassport("1234", "123", "123-456"), false);
    assert.strictEqual(PatientDocumentParserService.validatePassport("1234", "123456", "123456"), false);
  });

  it("validates snils", () => {
    // 000-000-000-00 is technically valid by algorithm, but usually forbidden in practice.
    // Let's use 00000000001 as invalid.
    assert.strictEqual(PatientDocumentParserService.validateSnils("00000000000"), true);
    assert.strictEqual(PatientDocumentParserService.validateSnils("00000000001"), false);
  });

  it("validates oms", () => {
    // 16 цифр — 1234567890123456
    // Проверим реальный алгоритм Луна для 16-значного числа
    assert.strictEqual(PatientDocumentParserService.validateOms("1234567890123456"), false); 
  });
});
