import { describe, it } from "node:test";
import assert from "node:assert/strict";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeDefined: () => assert.notEqual(actual, undefined),
	toContain: (substr: string) => assert.ok(String(actual).includes(substr)),
});

import {
	buildLabOrderApiPayload,
	buildFittingAppointmentDraft,
	mapConstructionTypeToRestorationType,
	mapMaterialToRestorationMaterial,
	type BuildLabOrderPayloadParams,
} from "../orderSaveModules/labOrderPayloadBuilder";
import { formatDisplayDate } from "../orderSaveModules/labOrderProtocolExporter";

describe("dentalLabOrderPayloadBuilder", () => {
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
	});

	it("builds complete API payload with anonymization and QR payload", () => {
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
		expect(payload.clinicalNotes).toContain("Культя: ND3");
		expect(payload.tokenizedInitials).toBeDefined();
		expect(payload.qrPayload).toContain("DNT-LAB:ЗТЛ-2026-901");
	});

	it("builds fitting appointment draft and formats dates safely", () => {
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
		expect(draft.serviceTitle).toContain("Примерка и фиксация");
		expect(draft.notes).toContain("ЗТЛ-2026-901");

		expect(formatDisplayDate("2026-10-12")).toBe("12.10.2026");
		expect(formatDisplayDate("")).toBe("");
	});
});
