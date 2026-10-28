/**
 * visionAnalyzer.test.ts — Unit Tests for Decomposed Vision Subsystem (Mandate 8b & 8l)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	enhanceVisioGraphImage,
	bufferToDataUrl,
} from "./vision/imagePreprocessor.js";
import {
	extractJson,
} from "./vision/visionCascadeClient.js";
import {
	PASS1_PROMPT,
	PASS2_PROMPT,
} from "./vision/visionPrompts.js";
import {
	analyzeRadiographBuffer,
	type RadiographAnalysisResult,
} from "./visionAnalyzer.js";

describe("Vision Subsystem Decomposition (Mandate 8b)", () => {
	it("1. ImagePreprocessor: Converts buffer to data URL correctly", () => {
		const sampleBuffer = Buffer.from("fake-png-data");
		const dataUrl = bufferToDataUrl(sampleBuffer, "image/png");
		assert.ok(dataUrl.startsWith("data:image/png;base64,"));
		assert.ok(dataUrl.includes(sampleBuffer.toString("base64")));
	});

	it("2. ImagePreprocessor: Gracefully falls back if sharp receives invalid buffer", async () => {
		const invalidBase64 = "data:image/png;base64,not-a-real-image";
		const result = await enhanceVisioGraphImage(invalidBase64);
		assert.equal(result, invalidBase64);
	});

	it("3. VisionPrompts: Enforces Russian medical terminology and FDI tooth coding", () => {
		assert.ok(PASS1_PROMPT.includes("FDI"));
		assert.ok(PASS1_PROMPT.includes("грамотном русском языке"));
		assert.ok(PASS1_PROMPT.includes("Кариес"));
		assert.ok(PASS1_PROMPT.includes("Пришеечное выгорание"));
		assert.ok(PASS1_PROMPT.includes("ИЕРОГЛИФОВ"));

		assert.ok(PASS2_PROMPT.includes("главный редактор медицинских заключений"));
		assert.ok(PASS2_PROMPT.includes("summary"));
		assert.ok(PASS2_PROMPT.includes("toothUpdates"));
	});

	it("4. VisionCascadeClient: extractJson extracts JSON from markdown fences and cleans <think>", () => {
		const modelRaw = `<think>
Анализирую снимок 36 зуба...
</think>
\`\`\`json
{
  "summary": "Выявлен глубокий кариес дентина 36 зуба.",
  "toothUpdates": [
    {
      "code": "36",
      "state": "caries",
      "diagnosisOrFinding": "Глубокий кариес"
    }
  ]
}
\`\`\``;

		const parsed = extractJson(modelRaw);
		assert.equal(parsed.summary, "Выявлен глубокий кариес дентина 36 зуба.");
		assert.equal(parsed.toothUpdates.length, 1);
		assert.equal(parsed.toothUpdates[0].code, "36");
		assert.equal(parsed.toothUpdates[0].state, "caries");
	});

	it("5. VisionCascadeClient: extractJson throws descriptive error on completely non-JSON output", () => {
		assert.throws(() => {
			extractJson("Просто текст без фигурных скобок");
		}, /Не удалось извлечь JSON/);
	});
});
