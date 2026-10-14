/**
 * dentalLabOrderModules.test.ts — Unit tests for decomposed Dental Lab Order creation & save modules.
 *
 * Mandates:
 * - 8b: Seamless integration with canonical SSOT (@dental/shared)
 * - 8d: Clean medical protocols, zero emojis
 * - 8e: Doctor autonomy & non-blocking workflow
 * - 8n: Zero dead-ends, robust validation & fallback
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeDefined: () => assert.notEqual(actual, undefined),
	toContain: (substr: string) => assert.ok(String(actual).includes(substr), `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(substr)}`),
});
import {
	validateLabOrderInput,
	isValidVitaShade,
	type LabOrderValidationInput,
} from "../orderSaveModules/labOrderValidator";
import {
	buildLabOrderApiPayload,
	buildFittingAppointmentDraft,
	mapConstructionTypeToRestorationType,
	mapMaterialToRestorationMaterial,
	type BuildLabOrderPayloadParams,
} from "../orderSaveModules/labOrderPayloadBuilder";
import {
	formatDisplayDate,
} from "../orderSaveModules/labOrderProtocolExporter";

describe("Dental Lab Order Decomposed Modules", () => {
	describe("labOrderValidator", () => {
		it("validates VITA shades correctly (Classical, Bleach, 3D-Master)", () => {
			expect(isValidVitaShade("A1")).toBe(true);
			expect(isValidVitaShade("A2")).toBe(true);
			expect(isValidVitaShade("A3.5")).toBe(true);
			expect(isValidVitaShade("B3")).toBe(true);
			expect(isValidVitaShade("C2")).toBe(true);
			expect(isValidVitaShade("D4")).toBe(true);
			expect(isValidVitaShade("BL1")).toBe(true);
			expect(isValidVitaShade("OM2")).toBe(true);
			expect(isValidVitaShade("2M2")).toBe(true);
			expect(isValidVitaShade("3L1.5")).toBe(true);
			expect(isValidVitaShade("")).toBe(false);
			expect(isValidVitaShade(null)).toBe(false);
			expect(isValidVitaShade("X")).toBe(false);
			expect(isValidVitaShade("CustomPink")).toBe(false);
		});

		it("passes validation with valid form data and calculates SLA risk", () => {
			const input: LabOrderValidationInput = {
				patientId: "pat-100",
				patientName: "Алексеев Владимир Сергеевич",
				doctorId: "doc-1",
				doctorName: "Д-р Иванов А.И.",
				selectedTeeth: [16, 17],
				constructionType: "single_crown",
				material: "zirconia",
				shadeFinal: "A2",
				dueDate: "2026-10-20",
				scheduledVisitDate: "2026-10-22",
				totalLabPriceRub: 14000,
			};

			const result = validateLabOrderInput(input);
			expect(result.isValid).toBe(true);
			expect(result.errors.length).toBe(0);
			expect(result.slaRisk).toBeDefined();
		});

		it("fails validation when patient name is missing", () => {
			const input: LabOrderValidationInput = {
				patientName: "",
				selectedTeeth: [16],
				constructionType: "single_crown",
				material: "zirconia",
			};

			const result = validateLabOrderInput(input);
			expect(result.isValid).toBe(false);
			expect(result.errors.some((e) => e.includes("пациента"))).toBe(true);
		});

		it("fails validation when both teeth array and jawScope are missing", () => {
			const input: LabOrderValidationInput = {
				patientName: "Иванов И.И.",
				selectedTeeth: [],
				jawScope: null,
				constructionType: "single_crown",
				material: "zirconia",
			};

			const result = validateLabOrderInput(input);
			expect(result.isValid).toBe(false);
			expect(result.errors.some((e) => e.includes("зубы"))).toBe(true);
		});

		it("passes validation when jawScope is provided without teeth array", () => {
			const input: LabOrderValidationInput = {
				patientName: "Иванов И.И.",
				selectedTeeth: [],
				jawScope: "upper",
				constructionType: "all_on_arch",
				material: "zirconia",
			};

			const result = validateLabOrderInput(input);
			expect(result.isValid).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		it("fails validation when invalid FDI tooth number is provided (<11 or >48)", () => {
			const input: LabOrderValidationInput = {
				patientName: "Иванов И.И.",
				selectedTeeth: [99],
				constructionType: "single_crown",
				material: "zirconia",
			};

			const result = validateLabOrderInput(input);
			expect(result.isValid).toBe(false);
			expect(result.errors.some((e) => e.includes("FDI"))).toBe(true);
		});

		it("warns when scheduled visit is before lab due date and calculates overdue SLA risk", () => {
			const input: LabOrderValidationInput = {
				patientName: "Иванов И.И.",
				selectedTeeth: [21],
				constructionType: "single_crown",
				material: "zirconia",
				dueDate: "2026-10-25",
				scheduledVisitDate: "2026-10-20", // Conflict: visit earlier than lab delivery!
			};

			const result = validateLabOrderInput(input);
			expect(result.isValid).toBe(true);
			expect(result.warnings.some((w) => w.includes("раньше"))).toBe(true);
			expect(result.slaRisk).toBe("breached_overdue");
		});

		it("fails validation when totalLabPriceRub is negative", () => {
			const input: LabOrderValidationInput = {
				patientName: "Иванов И.И.",
				selectedTeeth: [21],
				constructionType: "single_crown",
				material: "zirconia",
				totalLabPriceRub: -500,
			};

			const result = validateLabOrderInput(input);
			expect(result.isValid).toBe(false);
			expect(result.errors.some((e) => e.includes("отрицательной"))).toBe(true);
		});
	});

	describe("labOrderPayloadBuilder", () => {
		it("maps construction types to canonical restoration types", () => {
			expect(mapConstructionTypeToRestorationType("crown")).toBe("crown_monolithic");
			expect(mapConstructionTypeToRestorationType("single_crown")).toBe("crown_monolithic");
			expect(mapConstructionTypeToRestorationType("bridge")).toBe("bridge_retainer");
			expect(mapConstructionTypeToRestorationType("veneer")).toBe("veneer_laminate");
			expect(mapConstructionTypeToRestorationType("inlay")).toBe("inlay");
			expect(mapConstructionTypeToRestorationType("all_on_4_6")).toBe("screw_retained_crown");
			expect(mapConstructionTypeToRestorationType("surgical_guide")).toBe("surgical_guide");
			expect(mapConstructionTypeToRestorationType("aligners")).toBe("clear_aligner_stage");
		});

		it("maps material names to canonical restoration materials", () => {
			expect(mapMaterialToRestorationMaterial("zirconia")).toBe("zirconia_multilayer_gradient");
			expect(mapMaterialToRestorationMaterial("emax_press")).toBe("emax_lithium_disilicate_press");
			expect(mapMaterialToRestorationMaterial("metal_ceramic")).toBe("cocr_milled_cast");
			expect(mapMaterialToRestorationMaterial("pmma")).toBe("pmma_cad_provisional");
			expect(mapMaterialToRestorationMaterial("titanium")).toBe("titanium_grade_5");
			expect(mapMaterialToRestorationMaterial("composite_lab_nanohybrid")).toBe("composite_lab_nanohybrid");
		});

		it("builds complete API payload with 152-FZ patient anonymization and QR payload", () => {
			const params: BuildLabOrderPayloadParams = {
				effectivePatientId: "pat-100",
				formPatientName: "Алексеев Владимир Сергеевич",
				formDoctorId: "doc-ivanov",
				formDoctorName: "Д-р Иванов А.И.",
				patientChartNumber: "МК-2026-442",
				selectedTeeth: [16, 17],
				jawScope: null,
				constructionType: "bridge",
				material: "zirconia",
				impressionType: "digital_intraoral_scan",
				finalShade: "A2",
				shadeStump: "ND3",
				translucency: "HT (High Translucency)",
				currentStage: "sent_to_lab",
				dueDate: "2026-10-20",
				clinicalNotes: "Уступ chamfer 0.5 мм",
				totalLabPriceRub: 14000,
				attachedImageUrl: null,
				gostOrderNumber: "ЗТЛ-2026-901",
			};

			const payload = buildLabOrderApiPayload(params);

			expect(payload.patientId).toBe("pat-100");
			expect(payload.doctorId).toBe("doc-ivanov");
			expect(payload.toothFdi).toBe("16, 17");
			expect(payload.colorVita).toBe("A2");
			expect(payload.priceRub).toBe(14000);
			expect(payload.status).toBe("sent_to_lab");

			// Check structured clinical notes
			expect(payload.clinicalNotes).toContain("Культя: ND3");
			expect(payload.clinicalNotes).toContain("HT (High Translucency)");
			expect(payload.clinicalNotes).toContain("МК-2026-442");

			// Check 152-FZ anonymized initials
			expect(payload.tokenizedInitials).toBeDefined();
			expect(typeof payload.tokenizedInitials).toBe("string");

			// Check QR payload integration
			expect(payload.qrPayload).toBeDefined();
			expect(typeof payload.qrPayload).toBe("string");
			expect(payload.qrPayload).toContain("DNT-LAB:ЗТЛ-2026-901");
		});

		it("builds fitting appointment draft accurately", () => {
			const draft = buildFittingAppointmentDraft({
				effectivePatientId: "pat-100",
				formPatientName: "Алексеев Владимир",
				formDoctorId: "doc-1",
				formDoctorName: "Д-р Иванов",
				effectiveFittingDate: "2026-10-22",
				material: "Диоксид циркония",
				selectedTeeth: [16, 17],
				gostOrderNumber: "ЗТЛ-2026-901",
				finalShade: "A2",
				dueDate: "2026-10-20",
			});

			expect(draft.patientId).toBe("pat-100");
			expect(draft.patientName).toBe("Алексеев Владимир");
			expect(draft.doctorId).toBe("doc-1");
			expect(draft.scheduledDate).toBe("2026-10-22");
			expect(draft.serviceTitle).toContain("Примерка и фиксация");
			expect(draft.serviceTitle).toContain("16, 17");
			expect(draft.notes).toContain("ЗТЛ-2026-901");
			expect(draft.notes).toContain("цвет A2");
		});
	});

	describe("labOrderProtocolExporter", () => {
		it("formats dates safely with formatDisplayDate", () => {
			expect(formatDisplayDate("2026-10-12")).toBe("12.10.2026");
			expect(formatDisplayDate("")).toBe("");
			expect(formatDisplayDate(undefined)).toBe("");
			expect(formatDisplayDate(null)).toBe("");
		});
	});
});
