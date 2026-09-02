/**
 * emergencyAnaphylaxisProtocol.test.ts — Unit Tests for Emergency Resuscitation Protocols
 * (Anaphylaxis, LAST Toxicity / Lipid Rescue 20%, Vasovagal Collapse, SBAR 112 & Form 043/u)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EMERGENCY_PROTOCOLS,
	calculateAllEmergencyDosagesForWeight,
	formatEmergencyStopwatchTime,
	generateEmergencyForm043Act,
	generateEmergency112DispatchScript,
} from "../emergencyProtocols";

describe("Emergency Resuscitation & LAST Lipid Rescue Engine (emergencyProtocols.ts)", () => {
	// ── 1. Adult 70 kg Emergency Dosages Calculation ─────────────────────────
	describe("1. Adult 70 kg Weight-Based Dosages", () => {
		it("calculates exact epinephrine, 20% lipid emulsion, and prednisolone dosages for 70 kg adult", () => {
			const dosages = calculateAllEmergencyDosagesForWeight(70, 35);

			// Epinephrine 0.1%: 0.5 mg (0.5 ml) IM in thigh
			assert.equal(dosages.epinephrine.doseText, "0.5 мг");
			assert.equal(dosages.epinephrine.volumeText, "0.5 мл (0.1% р-р)");

			// 20% Lipid Emulsion (Lipid Rescue for LAST):
			// Bolus = 70 * 1.5 = 105 ml
			assert.equal(dosages.lipidEmulsion20.bolusVolumeText, "105 мл");
			// Infusion = 70 * 0.25 = 17.5 ml/min
			assert.equal(dosages.lipidEmulsion20.infusionRateText, "17.5 мл/мин");
			// Max 30-min ceiling = 70 * 12 = 840 ml
			assert.equal(dosages.lipidEmulsion20.maxTotal30MinText, "840 мл");

			// Prednisolone: 90–120 mg
			assert.equal(dosages.prednisolone.doseText, "90 – 120 мг");
			assert.equal(dosages.prednisolone.volumeText, "3 – 4 ампулы (3-4 мл)");

			// 0.9% NaCl Infusion: 1000 ml
			assert.equal(dosages.nacl09Infusion.doseText, "1000 мл");
		});
	});

	// ── 2. Adult 90 kg High-Weight Calculation ──────────────────────────────
	describe("2. Adult 90 kg High-Weight Calculation", () => {
		it("scales lipid bolus to 135 ml and infusion to 22.5 ml/min for 90 kg patient", () => {
			const dosages = calculateAllEmergencyDosagesForWeight(90, 45);

			// Epinephrine capped at 0.5 ml standard adult IM dose
			assert.equal(dosages.epinephrine.doseText, "0.5 мг");
			assert.equal(dosages.epinephrine.volumeText, "0.5 мл (0.1% р-р)");

			// Lipid Bolus = 90 * 1.5 = 135 ml
			assert.equal(dosages.lipidEmulsion20.bolusVolumeText, "135 мл");
			// Lipid Infusion = 90 * 0.25 = 22.5 ml/min
			assert.equal(dosages.lipidEmulsion20.infusionRateText, "22.5 мл/мин");
			// Max 30-min = 90 * 12 = 1080 ml
			assert.equal(dosages.lipidEmulsion20.maxTotal30MinText, "1080 мл");
		});
	});

	// ── 3. Pediatric 20 kg Child Calculation ─────────────────────────────────
	describe("3. Pediatric 20 kg Weight-Based Dosages", () => {
		it("calculates exact pediatric epinephrine (0.01 mg/kg) and lipid rescue for 20 kg child", () => {
			const dosages = calculateAllEmergencyDosagesForWeight(20, 6);

			// Epinephrine: 20 * 0.01 = 0.2 mg (0.2 ml 0.1% IM)
			assert.equal(dosages.epinephrine.doseText, "0.2 мг");
			assert.equal(dosages.epinephrine.volumeText, "0.2 мл (0.1% р-р)");

			// Lipid Bolus = 20 * 1.5 = 30 ml
			assert.equal(dosages.lipidEmulsion20.bolusVolumeText, "30 мл");
			// Lipid Infusion = 20 * 0.25 = 5 ml/min
			assert.equal(dosages.lipidEmulsion20.infusionRateText, "5 мл/мин");
			// Max 30-min = 20 * 12 = 240 ml
			assert.equal(dosages.lipidEmulsion20.maxTotal30MinText, "240 мл");

			// Prednisolone: 20 * 2.5 = 50 mg
			assert.equal(dosages.prednisolone.doseText, "50 мг");

			// 0.9% NaCl Infusion: 20 * 20 = 400 ml
			assert.equal(dosages.nacl09Infusion.doseText, "400 мл");
		});

		it("caps pediatric epinephrine dose at 0.3 mg for 35 kg teenager", () => {
			const dosages = calculateAllEmergencyDosagesForWeight(35, 12);
			// 35 * 0.01 = 0.35 -> capped at 0.3 mg
			assert.equal(dosages.epinephrine.doseText, "0.3 мг");
			assert.equal(dosages.epinephrine.volumeText, "0.3 мл (0.1% р-р)");
		});
	});

	// ── 4. Stopwatch Formatting ─────────────────────────────────────────────
	describe("4. Stopwatch Time Formatting", () => {
		it("formats seconds to MM:SS and HH:MM:SS accurately", () => {
			assert.equal(formatEmergencyStopwatchTime(0), "00:00");
			assert.equal(formatEmergencyStopwatchTime(5), "00:05");
			assert.equal(formatEmergencyStopwatchTime(65), "01:05");
			assert.equal(formatEmergencyStopwatchTime(600), "10:00");
			assert.equal(formatEmergencyStopwatchTime(3661), "01:01:01");
		});
	});

	// ── 5. SBAR 112 Dispatch Script Generation ──────────────────────────────
	describe("5. SBAR 112 Dispatch Script Generation", () => {
		it("generates structured Russian emergency handover for ambulance dispatcher", () => {
			const script = generateEmergency112DispatchScript({
				scenarioId: "last_toxicity",
				patientName: "Иванов Иван Иванович",
				patientAge: 42,
				patientWeightKg: 80,
				clinicName: "Клиника ДЕНТЕ",
				clinicAddress: "ул. Ленина, д. 10, каб. 3",
				doctorName: "Д-р Петров А.В.",
				injectedAnestheticInfo: "Артикаин 4% 1:100000 (1.7 мл)",
				stopwatchSeconds: 145,
				administeredDrugs: ["20% Липидная эмульсия 120 мл болюс", "Эпинефрин 0.5 мл в/м"],
			});

			assert.ok(script.includes("СИТУАЦИЯ (Situation)"));
			assert.ok(script.includes("АНАМНЕЗ (Background)"));
			assert.ok(script.includes("ОЦЕНКА (Assessment)"));
			assert.ok(script.includes("РЕКОМЕНДАЦИЯ (Recommendation)"));
			assert.ok(script.includes("Клиника ДЕНТЕ"));
			assert.ok(script.includes("Иванов Иван Иванович"));
			assert.ok(script.includes("80 кг"));
			assert.ok(script.includes("LAST"));
			assert.ok(script.includes("РЕАНИМАЦИОННАЯ БРИГАДА (БИТ / РХБ)"));
		});
	});

	// ── 6. Form 043/u Emergency Resuscitation Act Generation ─────────────────
	describe("6. Form 043/u Clinical Protocol Act Generation", () => {
		it("generates comprehensive medical protocol with timestamps and Order 786n reference", () => {
			const act = generateEmergencyForm043Act({
				scenarioId: "anaphylaxis",
				patientName: "Смирнова Анна Сергеевна",
				patientAge: 28,
				patientWeightKg: 60,
				doctorName: "Д-р Соколов Д.М.",
				injectedAnestheticInfo: "Убистезин форте (1 карпула)",
				stopwatchTotalSeconds: 320,
				executedSteps: [
					{ stepNumber: 1, titleRu: "Прекращение введения аллергена", timestampSeconds: 15, timeFormatted: "00:15" },
					{ stepNumber: 2, titleRu: "Введение Адреналина 0.5 мл в/м в бедро", timestampSeconds: 70, timeFormatted: "01:10" },
				],
				administeredDrugs: [
					{ name: "Эпинефрин 0.1%", dose: "0.5 мл в/м в бедро", timeIso: "2026-09-01T12:01:10Z" },
					{ name: "Преднизолон", dose: "90 мг в/в струйно", timeIso: "2026-09-01T12:03:00Z" },
				],
			});

			assert.ok(act.includes("АКТ ОКАЗАНИЯ ЭКСТРЕННОЙ МЕДИЦИНСКОЙ ПОМОЩИ"));
			assert.ok(act.includes("Приказ МЗ РФ № 786н"));
			assert.ok(act.includes("Анафилактический шок"));
			assert.ok(act.includes("Смирнова Анна Сергеевна"));
			assert.ok(act.includes("Эпинефрин 0.1%"));
			assert.ok(act.includes("Преднизолон"));
			assert.ok(act.includes("ХРОНОЛОГИЯ РЕАНИМАЦИОННЫХ МЕРОПРИЯТИЙ"));
			assert.ok(act.includes("01:10"));
		});
	});

	// ── 7. Protocol Definitions Verification ────────────────────────────────
	describe("7. Protocol Definitions Catalog", () => {
		it("contains all 4 emergency scenarios with steps and required emergency kit items", () => {
			assert.ok(EMERGENCY_PROTOCOLS.anaphylaxis);
			assert.ok(EMERGENCY_PROTOCOLS.last_toxicity);
			assert.ok(EMERGENCY_PROTOCOLS.syncope_collapse);
			assert.ok(EMERGENCY_PROTOCOLS.hypertensive_crisis);

			assert.ok(EMERGENCY_PROTOCOLS.anaphylaxis.steps.length >= 5);
			assert.ok(EMERGENCY_PROTOCOLS.last_toxicity.steps.length >= 5);
			assert.ok(EMERGENCY_PROTOCOLS.anaphylaxis.kitItemsRequiredRu.length >= 5);
		});
	});
});
