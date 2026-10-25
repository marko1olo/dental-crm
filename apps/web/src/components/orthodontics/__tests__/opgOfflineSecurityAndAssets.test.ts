import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { assertLocalUrl } from "../../../services/offline/opgModelStorage";

describe("OPG Local AI Packaging — 152-ФЗ Security & Cryptographic Integrity", () => {
	it("strictly blocks external URLs and unauthorized network origins", () => {
		const forbiddenUrls = [
			"https://api.openai.com/v1/chat/completions",
			"http://evil-tracker.com/analytics.js",
			"https://huggingface.co/models/yolo11.onnx",
			"https://storage.googleapis.com/patient-scans/opg.png",
			"ftp://192.168.1.100/data",
			"data:text/html,<script>alert(1)</script>",
		];

		for (const url of forbiddenUrls) {
			assert.throws(
				() => assertLocalUrl(url),
				(err: Error) => err.message.includes("152-ФЗ") || err.message.includes("запрещены") || err.message.includes("внешний домен"),
			);
		}
	});

	it("allows authorized local models and shell paths", () => {
		const allowedPaths = [
			"/models/opg/liodon_best.onnx",
			"/models/opg/abychkov_fdi.onnx",
			"/models/opg/models_manifest.json",
			"/models/sample_opg_temur.png",
			"models/opg/liodon_best.onnx",
		];
		for (const p of allowedPaths) {
			assert.doesNotThrow(() => assertLocalUrl(p));
		}
	});

	const publicDir = existsSync(join(process.cwd(), "public")) ? join(process.cwd(), "public") : join(process.cwd(), "apps/web/public");

	it("verifies sample_opg_temur.png exists and is non-empty authentic radiograph", async () => {
		const filePath = join(publicDir, "models/sample_opg_temur.png");
		const st = await stat(filePath);
		assert.ok(st.size > 500_000);
	});

	it("verifies liodon_best.onnx integrity and SHA-256 match", async () => {
		const filePath = join(publicDir, "models/opg/liodon_best.onnx");
		const buffer = await readFile(filePath);
		assert.ok(buffer.length > 5_000_000);
		const hash = createHash("sha256").update(buffer).digest("hex");
		assert.equal(hash, "4cee38b54203634d895ed30a8910f5d7c4cefe22b18f9116b5561d9dd6e83a71");
	});

	it("verifies abychkov_fdi.onnx exists and matches expected SHA-256", { timeout: 30_000 }, async () => {
		const filePath = join(publicDir, "models/opg/abychkov_fdi.onnx");
		const buffer = await readFile(filePath);
		assert.ok(buffer.length > 100_000_000);
		const hash = createHash("sha256").update(buffer).digest("hex");
		assert.equal(hash, "426ddf210f339669f069bf41e0a4f225c72c4667ffb7f71c310112cfd7481f8a");
	});

	it("verifies models_manifest.json structure and cryptographic catalog", async () => {
		const manifestPath = join(publicDir, "models/opg/models_manifest.json");
		const content = JSON.parse(await readFile(manifestPath, "utf-8"));
		assert.equal(content.schemaVersion, "1.0.0");
		assert.ok(content.models.liodon_detector_yolo11n);
		assert.ok(content.models.abychkov_fdi_transformer);
		assert.equal(content.models.liodon_detector_yolo11n.sha256, "4cee38b54203634d895ed30a8910f5d7c4cefe22b18f9116b5561d9dd6e83a71");
		assert.equal(content.models.abychkov_fdi_transformer.sha256, "426ddf210f339669f069bf41e0a4f225c72c4667ffb7f71c310112cfd7481f8a");
	});
});
