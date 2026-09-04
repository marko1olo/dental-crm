import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	validatePatientDraftWithRequirements,
} from "../patientFieldRequirementsConfig.js";

describe("Frictionless Patient Registration & Non-Blocking Invariants (Mandate 8e)", () => {
	it("allows registration without patronymic (single or two-word names)", () => {
		// Single name (e.g. foreigner or mononym)
		const singleNameResult = validatePatientDraftWithRequirements({
			fullName: "Барабаш",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(
			singleNameResult.isValid,
			true,
			"Single word name must be valid",
		);
		assert.equal(singleNameResult.errors.fullName, undefined);

		// Two-word name (First + Last, no patronymic)
		const twoWordResult = validatePatientDraftWithRequirements({
			fullName: "Смирнова Анна",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(
			twoWordResult.isValid,
			true,
			"Two-word name without patronymic must be valid",
		);
		assert.equal(twoWordResult.errors.fullName, undefined);

		// Three-word name (traditional FIO)
		const threeWordResult = validatePatientDraftWithRequirements({
			fullName: "Иванов Иван Иванович",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(
			threeWordResult.isValid,
			true,
			"Standard three-word name must be valid",
		);
		assert.equal(threeWordResult.errors.fullName, undefined);
	});

	it("does not block registration when SNILS or passport are absent even if clinic requires them for EGISZ", () => {
		const strictClinicRequirements = {
			...DEFAULT_PATIENT_FIELD_REQUIREMENTS,
			requirePhone: true,
			requireSnils: true,
			requireIdentityDocument: true,
			requireAdvertisingSource: true,
		};

		// Emergency/primary mode: documents never block
		const emergencyResult = validatePatientDraftWithRequirements(
			{
				fullName: "Смирнова Анна",
				phone: "+7 (999) 111-22-33",
				isEmergencyOrPrimary: true,
			},
			strictClinicRequirements,
		);
		assert.equal(
			emergencyResult.isValid,
			true,
			"Emergency patient must not be blocked without SNILS/passport",
		);
		assert.equal(emergencyResult.missingRequiredLabels.length, 0);

		// Standard mode with clinic EGISZ recommendation: guidance message explicitly clarifies non-blocking nature
		const standardResult = validatePatientDraftWithRequirements(
			{
				fullName: "Смирнова Анна",
				phone: "+7 (999) 111-22-33",
				isEmergencyOrPrimary: false,
			},
			strictClinicRequirements,
		);
		assert.ok(standardResult.missingRequiredLabels.includes("СНИЛС"));
		assert.ok(standardResult.missingRequiredLabels.includes("Паспорт"));
		assert.ok(
			standardResult.guidanceMessage?.includes("не блокируют регистрацию"),
			"Guidance must explicitly state that SNILS and passport do not block registration",
		);
	});

	it("prints blank contract package with '_______' placeholders and 0 rubles without 403 or server errors (Mandate 8e)", async () => {
		const { generatePrimaryIntakePackageHtml } = await import(
			"../../documents/primaryIntakePackagePrintEngine.js"
		);

		// Blank patient (waiting area walk-in, zero documents entered yet)
		const html = generatePrimaryIntakePackageHtml({
			patient: null,
			clinic: {
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: "7707083893",
			},
			intakeNormApplied: true,
		});

		assert.ok(html.includes("<!DOCTYPE html>"), "Must be valid HTML document");
		assert.ok(
			html.includes("ДОГОВОР") &&
				html.includes("на оказание платных"),
			"Contains standard medical services contract (PP RF 736)",
		);
		assert.ok(
			html.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"),
			"Contains standard informed consent (Order 1051n)",
		);
		assert.ok(
			html.includes("СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ"),
			"Contains personal data consent (152-FZ)",
		);
		assert.ok(
			html.includes("043/у") || html.includes("АНКЕТА"),
			"Contains outpatient health questionnaire (043/u)",
		);
		// Underscores for manual handwriting
		assert.ok(
			html.includes("________________________________________"),
			"Contains blank underline placeholders for patient name/address handwriting",
		);
		assert.ok(
			html.includes("0 (ноль) рублей") || html.includes("0 ₽") || html.includes("ориентировочная"),
			"Must handle 0 ruble / preliminary contract price gracefully",
		);
	});

	it("allows booking appointment without mandatory assistant (solo doctor or dynamic assignment)", async () => {
		const { appointmentScheduleMissingFields } = await import(
			"../../../AppHelpers.js"
		);

		const staff = [
			{
				id: "doc-1",
				fullName: "Д-р Барабаш С.В.",
				role: "doctor" as const,
				active: true,
			},
			{
				id: "asst-1",
				fullName: "Медсестра Иванова М.П.",
				role: "assistant" as const,
				active: true,
			},
		];
		const chairs = [{ id: "chair-1", name: "Кабинет 1", active: true }];
		const patients = [{ id: "pat-1", fullName: "Смирнова Анна", active: true }];

		// Draft WITHOUT assistantUserId (doctor works solo or assistant is assigned dynamically)
		const draftWithoutAssistant = {
			patientId: "pat-1",
			doctorUserId: "doc-1",
			assistantUserId: "", // empty / not selected
			chairId: "chair-1",
			startsAt: "2026-09-04T14:00:00.000Z",
			endsAt: "2026-09-04T14:30:00.000Z",
			status: "planned" as const,
			reason: "CITO! Острая боль",
			comment: "Экстренный прием",
		};

		// biome-ignore lint/suspicious/noExplicitAny: test draft
		const missing = appointmentScheduleMissingFields(draftWithoutAssistant as any, "small_clinic", staff as any, {
			// biome-ignore lint/suspicious/noExplicitAny: test draft
			chairs: chairs as any,
			// biome-ignore lint/suspicious/noExplicitAny: test draft
			patients: patients as any,
		});

		// Assistant must NEVER be in missing required fields!
		assert.equal(
			missing.length,
			0,
			`Expected zero missing required fields for solo booking, got: ${JSON.stringify(missing)}`,
		);
		assert.ok(
			!missing.some((m) => m.toLowerCase().includes("ассистент")),
			"Assistant selection must NEVER be a required step in appointment booking",
		);
	});
});
