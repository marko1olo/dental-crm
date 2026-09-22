import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyEmergencySterilizationToDiaryTreatment,
	buildAutoProvisionSterilizationLogValues,
	buildEmergencySterilizationAdmissionNote,
	buildUnsealKraftPackageResponse,
	evaluateSterilizationLogForLinking,
} from "../sterilization.js";

describe("Sterilization Tray Auto-Provision & Doctor Autonomy (Mandates 8e, 8n)", () => {
	const testOrgId = "11111111-1111-4111-a111-111111111111";
	const testDoctorId = "22222222-2222-4222-a222-222222222222";

	it("auto-provisions valid Class B autoclave log for unregistered kraft tray (no 400 barrier)", () => {
		const baseDate = new Date("2026-09-06T12:00:00.000Z");
		const values = buildAutoProvisionSterilizationLogValues({
			organizationId: testOrgId,
			barcode: "  TRAY-THERAPY-STD  ",
			operatorId: testDoctorId,
			now: baseDate,
		});

		assert.equal(values.organizationId, testOrgId);
		assert.equal(values.barcode, "TRAY-THERAPY-STD");
		assert.equal(values.autoclaveId, "primary");
		assert.equal(values.deviceName, "Автоклав 1 (Класс B)");
		assert.equal(values.cycleMode, "B");
		assert.equal(values.temperatureCelsius, "134.0");
		assert.equal(values.pressureBar, "2.10");
		assert.equal(values.packagingType, "kraft_self_adhesive");
		assert.equal(values.indicatorType, "class5_integrating");
		assert.equal(values.status, "passed");
		assert.equal(values.passedIndicator, true);
		assert.equal(values.operatorId, testDoctorId);

		// Shelf life must be +30 days per SanPiN 3.3686-21 for self-adhesive kraft bags
		const diffDays = Math.round(
			(values.expiresAt.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		assert.equal(diffDays, 30);
	});

	it("evaluates fresh valid tray as allowed without emergency notes", () => {
		const now = new Date("2026-09-06T12:00:00.000Z");
		const evaluation = evaluateSterilizationLogForLinking(
			{
				status: "passed",
				passedIndicator: true,
				expiresAt: new Date("2026-10-06T12:00:00.000Z"),
			},
			now,
		);

		assert.equal(evaluation.allowed, true);
		assert.equal(evaluation.isExpired, false);
		assert.equal(evaluation.emergencyLogNote, undefined);
	});

	it("gives soft clinical admission under doctor responsibility for expired tray instead of blocking 400", () => {
		const now = new Date("2026-09-06T12:00:00.000Z");
		const evaluation = evaluateSterilizationLogForLinking(
			{
				status: "passed",
				passedIndicator: true,
				// Expired yesterday
				expiresAt: new Date("2026-09-05T12:00:00.000Z"),
			},
			now,
		);

		assert.equal(evaluation.allowed, true);
		assert.equal(evaluation.isExpired, true);
		assert.ok(evaluation.emergencyLogNote);
		assert.match(
			evaluation.emergencyLogNote,
			/Мягкий допуск по экстренным показаниям под личную ответственность врача/,
		);
	});

	it("strictly blocks unsterilized or failed sterilization (sanitary safety)", () => {
		const evaluation = evaluateSterilizationLogForLinking({
			status: "failed",
			passedIndicator: false,
		});

		assert.equal(evaluation.allowed, false);
		assert.equal(evaluation.errorCode, "FailedSterilizationBarcode");
		assert.match(evaluation.errorMessage ?? "", /Лоток не прошел контроль стерилизации/);
	});

	it("appends emergency sterilization note to diary treatment description cleanly", () => {
		const note = buildEmergencySterilizationAdmissionNote("TRAY-EMERGENCY-01");
		assert.match(note, /TRAY-EMERGENCY-01/);
		assert.match(note, /Мандаты 8e, 8n/);

		// When treatment description is empty
		const treatment1 = applyEmergencySterilizationToDiaryTreatment(
			null,
			"TRAY-EMERGENCY-01",
		);
		assert.equal(treatment1, note);

		// When treatment description has existing text
		const treatment2 = applyEmergencySterilizationToDiaryTreatment(
			"Препарирование полости, медикаментозная обработка",
			"TRAY-EMERGENCY-01",
		);
		assert.equal(
			treatment2,
			`Препарирование полости, медикаментозная обработка\n${note}`,
		);

		// Does not duplicate note if called again
		const treatment3 = applyEmergencySterilizationToDiaryTreatment(
			treatment2,
			"TRAY-EMERGENCY-01",
		);
		assert.equal(treatment3, treatment2);
	});

	it("zero-emoji invariant: notes in emergency and admission records have 100% zero emojis", () => {
		const note = buildEmergencySterilizationAdmissionNote("TRAY-KB-2026");
		const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(EMOJI_REGEX.test(note), false, "No emojis in medical records per Mandate 8d Item 7");
		assert.ok(!note.includes("⚡"));
	});

	it("1-click nurse unseal without 3-person commission (Mandates 8e, 8k, 8n)", () => {
		const now = new Date("2026-09-23T01:00:00.000Z");
		const res = buildUnsealKraftPackageResponse({
			barcode: "  KB-20260923-001  ",
			operatorName: "Иванова М.И. (медсестра)",
			now,
		});

		assert.equal(res.success, true);
		assert.equal(res.barcode, "KB-20260923-001");
		assert.equal(res.commissionRequired, false, "Must never require a 3-person commission");
		assert.equal(res.operatorName, "Иванова М.И. (медсестра)");
		assert.equal(res.status, "unsealed");
		assert.equal(res.sanpinVerified, true);
		assert.equal(res.unsealedAt, "2026-09-23T01:00:00.000Z");
		assert.match(res.message, /без комиссии из 3 человек/);

		// Zero emoji in unseal message
		const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(EMOJI_REGEX.test(res.message), false);
	});
});

