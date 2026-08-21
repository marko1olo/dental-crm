import assert from "node:assert";
import { describe, test } from "node:test";
import {
	buildForm043ProtocolText,
	exportSnapshotToClinicalRecord,
} from "../VisiographExportService";
import { VISIOGRAPH_WINDOW_PRESETS } from "../VisiographWindowPresets";

describe("Visiograph 1-Click Snapshot & Form 043/u Protocol Export", () => {
	test("buildForm043ProtocolText generates complete clinical protocol for Form 043/u", () => {
		const text = buildForm043ProtocolText({
			patientId: "pat_123",
			imageDataUri: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			fdiToothCode: "46",
			preset: VISIOGRAPH_WINDOW_PRESETS.bone,
			nerveDistanceMm: 1.5, // Danger zone < 2.0 mm
			boneDensity: {
				averageHU: 950,
				classification: "D2",
			},
			implantDetails: {
				diameterMm: 4.0,
				lengthMm: 10.0,
				system: "Osstem TS III",
			},
			aiProtocolLog: "Рекомендована имплантация в позиции 46.",
		});

		assert.ok(text.includes("ФОРМА № 043/У"));
		assert.ok(text.includes("№ 46"));
		assert.ok(text.includes("Костная ткань"));
		assert.ok(text.includes("WW: 2000"));
		assert.ok(text.includes("WL: 500"));
		assert.ok(text.includes("D2"));
		assert.ok(text.includes("950 HU"));
		assert.ok(text.includes("Ø 4.0 мм × L 10.0 мм"));
		assert.ok(text.includes("Osstem TS III"));
		assert.ok(text.includes("1.5 мм"));
		assert.ok(text.includes("ВНИМАНИЕ: ОПАСНАЯ ЗОНА < 2.0 ММ"));
		assert.ok(text.includes("Снимок и протокол прикреплены к электронной медицинской карте 043/у"));
	});

	test("buildForm043ProtocolText confirms safe corridor when nerve distance >= 2.0 mm", () => {
		const text = buildForm043ProtocolText({
			patientId: "pat_456",
			imageDataUri: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			fdiToothCode: "36",
			preset: VISIOGRAPH_WINDOW_PRESETS.endodontic_canal,
			nerveDistanceMm: 4.2,
		});

		assert.ok(text.includes("Эндодонтический канал / Апекс"));
		assert.ok(text.includes("4.2 мм"));
		assert.ok(text.includes("Безопасный коридор ≥ 2.0 мм"));
		assert.ok(!text.includes("ОПАСНАЯ ЗОНА"));
	});

	test("exportSnapshotToClinicalRecord refuses when patientId is missing", async () => {
		const outcome = await exportSnapshotToClinicalRecord({
			patientId: "",
			imageDataUri: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
		});

		assert.strictEqual(outcome.success, false);
		assert.ok(outcome.message.includes("Пациент не выбран"));
	});

	test("exportSnapshotToClinicalRecord refuses when imageDataUri is not data:image/", async () => {
		const outcome = await exportSnapshotToClinicalRecord({
			patientId: "pat_123",
			imageDataUri: "invalid_string",
		});

		assert.strictEqual(outcome.success, false);
		assert.ok(outcome.message.includes("Не удалось получить графический снимок"));
	});
});
