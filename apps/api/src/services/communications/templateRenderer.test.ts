import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  renderTemplate,
  validateTemplateBody,
  extractTemplateVariables,
  describeSmsPayload,
  checkChannelFit
} from "./templateRenderer.js";
import { findTemplateVariable } from "./templateRenderer.js";

describe("findTemplateVariable", () => {
  test("finds template variable", () => {
    assert.ok(findTemplateVariable("patient"));
    assert.equal(findTemplateVariable("non_existent_var"), null);
  });
});

describe("templateRenderer", () => {
  describe("extractTemplateVariables", () => {
    test("extracts unique variables", () => {
      assert.deepEqual(extractTemplateVariables("Hello {patient}, {date} {date}"), ["patient", "date"]);
    });

    test("handles no variables", () => {
      assert.deepEqual(extractTemplateVariables("Hello world"), []);
    });

    test("ignores literal brackets", () => {
      assert.deepEqual(extractTemplateVariables("Hello {{world}} {patient}"), ["patient"]);
    });
  });

  describe("validateTemplateBody", () => {
    test("validates a good template", () => {
      const result = validateTemplateBody("Hello {patient}, appointment at {date}");
      assert.equal(result.ok, true);
      assert.deepEqual(result.variables, ["patient", "date"]);
      assert.deepEqual(result.unknownVariables, []);
      assert.deepEqual(result.phiVariables, []);
      assert.deepEqual(result.problems, []);
    });

    test("fails on empty template", () => {
      const result = validateTemplateBody("   ");
      assert.equal(result.ok, false);
      assert.ok(result.problems.includes("Текст шаблона пуст."));
    });

    test("identifies unknown variables", () => {
      const result = validateTemplateBody("Hello {patient}, your {unknown_thing} is ready.");
      assert.equal(result.ok, false);
      assert.deepEqual(result.unknownVariables, ["unknown_thing"]);
      assert.ok(result.problems.some(p => p.includes("Неизвестные переменные")));
    });

    test("handles PHI variables without consent", () => {
      const result = validateTemplateBody("Diagnosis: {diagnosis}");
      assert.equal(result.ok, false);
      assert.deepEqual(result.phiVariables, ["diagnosis"]);
      assert.ok(result.problems.some(p => p.includes("Медицинские сведения в канале без согласия")));
    });

    test("allows PHI variables with consent", () => {
      const result = validateTemplateBody("Diagnosis: {diagnosis}", { allowPhi: true });
      assert.equal(result.ok, true);
      assert.deepEqual(result.phiVariables, ["diagnosis"]);
      assert.deepEqual(result.problems, []);
    });
  });

  describe("renderTemplate", () => {
    test("renders simple template successfully", () => {
      const result = renderTemplate("Hello, {patient}!", { patient: "Alice" });
      assert.deepEqual(result, { ok: true, text: "Hello, Alice!", usedVariables: ["patient"] });
    });

    test("preserves line breaks correctly", () => {
      const result = renderTemplate("Hello,\n{patient}!", { patient: "Alice" });
      assert.deepEqual(result, { ok: true, text: "Hello,\nAlice!", usedVariables: ["patient"] });
    });

    test("strips control characters and compacts newlines", () => {
      const result = renderTemplate("Hello,\n\n\n\n{patient}!\x00", { patient: "Alice" });
      assert.deepEqual(result, { ok: true, text: "Hello,\n\nAlice!", usedVariables: ["patient"] });
    });

    test("fails if variables are missing", () => {
      const result = renderTemplate("Hello, {patient} on {date}!", { patient: "Alice" });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.deepEqual(result.missingVariables, ["date"]);
        assert.ok(result.problems.some(p => p.includes("Нет значений для переменных: {date}")));
      }
    });

    test("fails if values are empty", () => {
      const result = renderTemplate("Hello, {patient}!", { patient: "   " });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.deepEqual(result.missingVariables, ["patient"]);
      }
    });

    test("fails if value is null", () => {
      const result = renderTemplate("Hello, {patient}!", { patient: null });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.deepEqual(result.missingVariables, ["patient"]);
      }
    });

    test("allows empty values when configured (preview mode)", () => {
      const result = renderTemplate("Hello, {patient}!", { patient: "   " }, { allowEmptyValues: true });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.text, "Hello, Марина Петровна!");
      }
    });

    test("handles unknown variable in preview mode correctly", () => {
      const result = renderTemplate("Hello, {unknown}!", { }, { allowEmptyValues: true });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.deepEqual(result.unknownVariables, ["unknown"]);
      }
    });

    test("handles literal brackets correctly", () => {
      const result = renderTemplate("Hello {{world}}, {patient}!", { patient: "Alice" });
      assert.deepEqual(result, { ok: true, text: "Hello {world}, Alice!", usedVariables: ["patient"] });
    });

    test("fails on empty output after rendering", () => {
      const result = renderTemplate("\x00\n \t", { patient: "Alice" });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.deepEqual(result.problems, ["После подстановки текст оказался пустым."]);
      }
    });

    test("handles non-finite number as empty value", () => {
      const result = renderTemplate("Hello {amount}", { amount: NaN });
      assert.equal(result.ok, false);
    });

    test("stringifies valid numbers", () => {
      const result = renderTemplate("Amount: {amount}", { amount: 100 });
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(result.text, "Amount: 100");
    });
  });

  describe("describeSmsPayload", () => {
    test("calculates GSM7 correctly", () => {
      const result = describeSmsPayload("Hello world");
      assert.deepEqual(result, {
        encoding: "gsm7",
        characters: 11,
        segments: 1,
        charactersLeftInSegment: 149
      });
    });

    test("calculates extended GSM7 correctly", () => {
      const result = describeSmsPayload("Hello [world]"); // [ and ] are extended
      assert.deepEqual(result, {
        encoding: "gsm7",
        characters: 15, // 11 + 2*2 for extended
        segments: 1,
        charactersLeftInSegment: 145
      });
    });

    test("calculates UCS2 correctly (cyrillic)", () => {
      const result = describeSmsPayload("Привет мир");
      assert.deepEqual(result, {
        encoding: "ucs2",
        characters: 10,
        segments: 1,
        charactersLeftInSegment: 60
      });
    });

    test("calculates multi-segment GSM7 correctly", () => {
      const text = "A".repeat(161);
      const result = describeSmsPayload(text);
      assert.deepEqual(result, {
        encoding: "gsm7",
        characters: 161,
        segments: 2,
        charactersLeftInSegment: 145 // 153*2 - 161
      });
    });

    test("calculates multi-segment UCS2 correctly", () => {
      const text = "А".repeat(71);
      const result = describeSmsPayload(text);
      assert.deepEqual(result, {
        encoding: "ucs2",
        characters: 71,
        segments: 2,
        charactersLeftInSegment: 63 // 67*2 - 71
      });
    });

    test("calculates emoji correctly in UCS2", () => {
       const result = describeSmsPayload("Hello 🚀"); // 🚀 takes 2 units in UTF-16
       assert.deepEqual(result, {
         encoding: "ucs2",
         characters: 8, // Hello (5) + space (1) + rocket (2)
         segments: 1,
         charactersLeftInSegment: 62
       });
    });

    test("handles empty string correctly", () => {
       const result = describeSmsPayload("");
       assert.deepEqual(result, {
         encoding: "gsm7",
         characters: 0,
         segments: 1,
         charactersLeftInSegment: 160
       });
    });
  });

  describe("checkChannelFit", () => {
    test("passes valid SMS", () => {
      const result = checkChannelFit("sms", "Hello world");
      assert.equal(result.ok, true);
      assert.equal(result.limit, 1000);
      assert.ok(result.sms);
      assert.equal(result.sms!.segments, 1);
    });

    test("fails SMS over max segments", () => {
      const text = "A".repeat(153 * 5); // 5 segments
      const result = checkChannelFit("sms", text, { maxSmsSegments: 4 });
      assert.equal(result.ok, false);
      assert.ok(result.problems.some(p => p.includes("SMS разобьётся на 5 сегмент(ов) при пределе 4")));
    });

    test("fails text over channel limit", () => {
      const text = "A".repeat(1001);
      const result = checkChannelFit("sms", text);
      assert.equal(result.ok, false);
      assert.ok(result.problems.some(p => p.includes("Текст длиннее предела канала: 1001 из 1000 символов")));
    });

    test("works for non-SMS channel", () => {
      const result = checkChannelFit("whatsapp", "Hello world");
      assert.equal(result.ok, true);
      assert.equal(result.sms, null);
    });

    test("falls back to default limit for unknown channel", () => {
      const text = "A".repeat(4097);
      const result = checkChannelFit("unknown_channel", text);
      assert.equal(result.ok, false);
      assert.equal(result.limit, 4096);
    });
  });
});
