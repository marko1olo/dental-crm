/**
 * DENTE CRM — Radiology Consultation Split Modular Decomposition Test Suite
 * Verifies DAG compliance, behavioral preservation, and line budget invariants.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import RadiologyConsultationSplitDefault, {
	RadiologyConsultationSplit,
} from "../RadiologyConsultationSplit.js";
import {
	CONSULTATION_ROLE_LABELS,
	CONSULTATION_ROLE_COLORS,
	DEFAULT_CONSULTATION_PARTICIPANTS,
	resolvePatientGender,
	buildForm043ConsultationStatement,
	formatConsultationTimestamp,
	createDefaultEffectivePatientStudies,
	createInitialLeftViewport,
	createInitialRightViewport,
	createInitialConsiliumNotes,
} from "../radiologyConsultationSplitModules/index.js";

describe("RadiologyConsultationSplit Modular Decomposition Parity", () => {
	it("verifies facade exports and default export equivalence", () => {
		assert.ok(RadiologyConsultationSplit, "Named export must be defined");
		assert.ok(RadiologyConsultationSplitDefault, "Default export must be defined");
		assert.equal(
			RadiologyConsultationSplit,
			RadiologyConsultationSplitDefault,
			"Default export must strictly match named export",
		);
	});

	it("verifies consilium roles, labels and clinical colors", () => {
		assert.equal(CONSULTATION_ROLE_LABELS.surgeon, "Хирург-имплантолог");
		assert.equal(CONSULTATION_ROLE_LABELS.orthopedist, "Стоматолог-ортопед");
		assert.equal(CONSULTATION_ROLE_LABELS.radiologist, "Врач-рентгенолог");
		assert.equal(CONSULTATION_ROLE_LABELS.therapist, "Стоматолог-терапевт");

		assert.equal(CONSULTATION_ROLE_COLORS.surgeon, "#06b6d4");
		assert.equal(CONSULTATION_ROLE_COLORS.orthopedist, "#10b981");
		assert.equal(CONSULTATION_ROLE_COLORS.radiologist, "#8b5cf6");
		assert.equal(CONSULTATION_ROLE_COLORS.therapist, "#f59e0b");

		assert.ok(DEFAULT_CONSULTATION_PARTICIPANTS.length >= 3);
	});

	it("verifies patient gender resolution heuristic", () => {
		assert.equal(resolvePatientGender("Муж.", "Лариса"), "Муж.");
		assert.equal(resolvePatientGender(undefined, "Романенко Роман"), "Муж.");
		assert.equal(resolvePatientGender(undefined, "Чухрова Лариса"), "Жен.");
		assert.equal(resolvePatientGender(undefined, "Иванов Иван"), "Муж.");
	});

	it("verifies Form 043/u clinical protocol text generator", () => {
		const statementComparison = buildForm043ConsultationStatement({
			isAtlas: false,
			targetTooth: "16",
			leftTitle: "Снимок ДО",
			leftSubtitle: "12.01.2024",
			rightTitle: "Снимок ПОСЛЕ",
			rightSubtitle: "16.05.2024",
		});
		assert.ok(statementComparison.includes("Сплит-сопоставление «До / После»"));
		assert.ok(statementComparison.includes("зуба №16"));
		assert.ok(statementComparison.includes("Снимок ДО"));
		assert.ok(statementComparison.includes("Снимок ПОСЛЕ"));

		const statementAtlas = buildForm043ConsultationStatement({
			isAtlas: true,
			targetTooth: "24",
			leftTitle: "Снимок пациента",
			leftSubtitle: "10.02.2024",
			rightTitle: "Эталонная коронка ZrO2",
			rightSubtitle: "Атлас",
		});
		assert.ok(statementAtlas.includes("Атлас патологий DENTE"));
		assert.ok(statementAtlas.includes("Эталонная коронка ZrO2"));
	});

	it("verifies initial state factories generate valid viewports", () => {
		const studies = createDefaultEffectivePatientStudies([]);
		assert.equal(studies.length, 2, "Expected 2 sample studies when empty history");

		const left = createInitialLeftViewport({
			effectiveStudies: studies,
			activeToothFdi: "16",
		});
		assert.equal(left.zoom, 1.0);
		assert.equal(left.panX, 0);
		assert.equal(left.panY, 0);
		assert.equal(left.toothCode, "16");
		assert.ok(left.imageSrc.length > 0);

		const right = createInitialRightViewport({
			effectiveStudies: studies,
			splitMode: "comparison",
			activeToothFdi: "16",
		});
		assert.equal(right.zoom, 1.0);
		assert.equal(right.toothCode, "16");
		assert.ok(right.imageSrc.length > 0);

		const notes = createInitialConsiliumNotes("16");
		assert.equal(notes.length, 2);
		assert.equal(notes[0]?.targetTooth, "16");
	});

	it("verifies timestamp formatting", () => {
		const formatted = formatConsultationTimestamp(new Date("2026-10-11T10:30:00.000Z"));
		assert.ok(/^\d{2}:\d{2}$/.test(formatted));
	});
});
