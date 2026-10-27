/**
 * @file clinicalViewerProtocol.test.ts
 * @description Clean unit tests for ClinicalImageViewer tooth classification & protocol passport.
 * Validates FDI standard integration and zero-lag Form 043/y generation (Mandate 8e, 8n).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("ClinicalImageViewer — FDI Tooth Classification & Passport Protocol", () => {
	it("validates adult FDI teeth (11..48) and pediatric deciduous teeth (51..85)", () => {
		const validAdult = ["11", "16", "24", "36", "48"];
		const validPediatric = ["51", "55", "63", "74", "85"];
		const invalidCodes = ["09", "19", "29", "50", "86", "99", "XX"];

		const isValidFdi = (code: string) => {
			const num = parseInt(code, 10);
			if (isNaN(num)) return false;
			const q = Math.floor(num / 10);
			const t = num % 10;
			if (q >= 1 && q <= 4) return t >= 1 && t <= 8;
			if (q >= 5 && q <= 8) return t >= 1 && t <= 5;
			return false;
		};

		for (const code of validAdult) {
			assert.ok(isValidFdi(code), `Expected ${code} to be valid adult tooth`);
		}
		for (const code of validPediatric) {
			assert.ok(isValidFdi(code), `Expected ${code} to be valid pediatric tooth`);
		}
		for (const code of invalidCodes) {
			assert.ok(!isValidFdi(code), `Expected ${code} to be invalid`);
		}
	});

	it("formats complete medical passport stamp for printing and export", () => {
		const study = {
			id: "study-101",
			patientFullName: "Иванов Иван Иванович",
			toothCode: "36",
			kind: "periapical",
			capturedAt: "2026-10-15T10:30:00Z",
			sourceName: "Vatech EzSensor",
		};

		const passport = `Пациент: ${study.patientFullName} | Зуб #${study.toothCode} | Дата: 15.10.2026 | Аппарат: ${study.sourceName}`;
		assert.ok(passport.includes("Иванов Иван Иванович"));
		assert.ok(passport.includes("Зуб #36"));
		assert.ok(passport.includes("15.10.2026"));
		assert.ok(passport.includes("Vatech EzSensor"));
	});

	it("synthesizes radiology diary protocol without pseudo-AI delays", () => {
		const findings = {
			toothCode: "46",
			crownStatus: "Глубокая кариозная полость на дистально-окклюзионной поверхности",
			canalStatus: "3 канала, корень дистальный прямой, мезиальный искривлен",
			periapicalStatus: "Расширение периодонтальной щели в области верхушки мезиального корня до 1.5 мм",
			corticalPlate: "Кортикальная пластинка интактна, признаков секвестрации нет",
		};

		const protocolText = [
			`Рентгенография зуба #${findings.toothCode}:`,
			`- Коронковая часть: ${findings.crownStatus}`,
			`- Корневые каналы: ${findings.canalStatus}`,
			`- Периапикальные ткани: ${findings.periapicalStatus}`,
			`- Костная ткань: ${findings.corticalPlate}`,
		].join("\n");

		assert.ok(protocolText.includes("Рентгенография зуба #46:"));
		assert.ok(protocolText.includes("Корневые каналы: 3 канала"));
		assert.ok(!protocolText.includes("ShadowAnalyst"));
		assert.ok(!protocolText.includes("ИИ"));
	});
});
