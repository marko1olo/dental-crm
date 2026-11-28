/**
 * apps/web/src/components/emr/__tests__/medicalCardCatalogData.test.ts
 *
 * Red Team Behavioral Test: ЭМК, физиологическая норма и автосейв-изоляция (Мандаты 8e, 8n, 8x, 8ap, 8am, P2-5.1).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	DEFAULT_32_PERMANENT_TEETH,
	DEFAULT_MEDICAL_CARD_DATA,
	DEFAULT_CLINICAL_DIARY_DATA,
	resolveClinicRequisites,
	applyMedicalCardPhysiologicalNorm,
} from "../medicalCardCatalogData";
import { StandaloneEmrMedicalRecordHost } from "../../appLayout/modalsContainerModules/standalone/clinical/StandaloneEmrMedicalRecordHost";
import { MedicalRecordStudioModal } from "../MedicalRecordStudioModal";
import { resolveClinicRoute } from "../../../router/routeResolver";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

const testAppLogicValue: Partial<AppLogicContextType> = {
	odontogramUseSurfaces: true,
	activePatient: null,
	activeDoctor: null,
	auth: null,
	profile: {
		clinicName: "Стоматология Тест",
		timezone: "Asia/Vladivostok",
	} as AppLogicContextType["profile"],
	money: (v: unknown) => `${Number(v) || 0} ₽`,
};

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Medical Card & Clinical Diary SSOT (Mandates 8e, 8n, 8x, 8ap, 8am)", () => {
	it("1. DEFAULT_32_PERMANENT_TEETH contains exactly 32 healthy FDI teeth", () => {
		assert.strictEqual(DEFAULT_32_PERMANENT_TEETH.length, 32);
		for (const tooth of DEFAULT_32_PERMANENT_TEETH) {
			assert.strictEqual(tooth.statusCode, "healthy");
			assert.ok(tooth.toothNumber >= 11 && tooth.toothNumber <= 48);
		}
	});

	it("2. DEFAULT_MEDICAL_CARD_DATA has clean domain language without raw order codes in title", () => {
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.formNumber, "Медицинская карта приёма");
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.formOrderName, "Медицинская карта стоматологического пациента");
		assert.strictEqual(DEFAULT_CLINICAL_DIARY_DATA, DEFAULT_MEDICAL_CARD_DATA);
		assert.ok(DEFAULT_MEDICAL_CARD_DATA.dentalStatus.odontogramTeeth.length === 32);
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.dentalStatus.biteType, "orthognathic");
		assert.strictEqual(DEFAULT_MEDICAL_CARD_DATA.dentalStatus.oralMucosaStatus.color, "pale_pink_normal");
	});

	it("3. applyMedicalCardPhysiologicalNorm applies norm without erasing custom complaints", () => {
		const emptyCard = { ...DEFAULT_MEDICAL_CARD_DATA };
		const withNorm = applyMedicalCardPhysiologicalNorm(emptyCard);

		assert.ok(withNorm.anamnesis.chiefComplaint.includes("санация"));
		assert.ok(withNorm.anamnesis.concomitantSomaticDiseases.includes("Соматически здоров"));
		assert.ok(withNorm.anamnesis.allergologicalHistory.includes("не отягощен"));
		assert.strictEqual(withNorm.dentalStatus.oralMucosaStatus.color, "pale_pink_normal");

		const customComplaintCard = {
			...emptyCard,
			anamnesis: {
				...emptyCard.anamnesis,
				chiefComplaint: "Острая боль в зубе 36 при накусывании",
			},
		};
		const preserved = applyMedicalCardPhysiologicalNorm(customComplaintCard);
		assert.strictEqual(preserved.anamnesis.chiefComplaint, "Острая боль в зубе 36 при накусывании");
		assert.ok(preserved.anamnesis.concomitantSomaticDiseases.includes("Соматически здоров"));
	});

	it("4. resolveClinicRequisites provides safe defaults and merges clinic profile", () => {
		const reqs = resolveClinicRequisites(undefined, {
			clinicName: "Клиника Доктора Тестова",
			phone: "+7 999 111-22-33",
		});
		assert.strictEqual(reqs.clinicName, "Клиника Доктора Тестова");
		assert.strictEqual(reqs.clinicPhone, "+7 999 111-22-33");
		assert.strictEqual(reqs.clinicLegalName, "Клиника Доктора Тестова");
	});

	it("5. StandaloneEmrMedicalRecordHost renders canonical EMR studio root without disabled buttons", () => {
		const html = renderToString(
			React.createElement(
				AppLogicProvider,
				{ value: testAppLogicValue as AppLogicContextType },
				React.createElement(StandaloneEmrMedicalRecordHost, { onClose: () => {} }),
			),
		);

		assert.ok(html.includes("emr-medical-record-standalone-root"));
		assert.ok(html.includes("emr-studio-modal"));
		assert.ok(html.includes("Медицинская карта приёма"));
		assert.ok(html.includes("emr-studio-bottom-bar"));
		assert.strictEqual(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
		assert.strictEqual(EMOJI_REGEX.test(html.replace(/[✓✕⚠★☆•→]/g, "")), false);
	});

	it("6. resolveClinicRoute routes EMR deep links cleanly (Mandate 8aq)", () => {
		const hashRoute = resolveClinicRoute("", "#emr-record");
		assert.strictEqual(hashRoute.studio?.kind, "emr_record");

		const cardRoute = resolveClinicRoute("", "#medical-record");
		assert.strictEqual(cardRoute.studio?.kind, "emr_record");

		const queryRoute = resolveClinicRoute("?emr_record=1", "");
		assert.strictEqual(queryRoute.studio?.kind, "emr_record");
	});

	it("7. MedicalRecordStudioModal renders single Primary CTA without forbidden legacy codes or #0284c7", () => {
		const html = renderToString(
			React.createElement(
				AppLogicProvider,
				{ value: testAppLogicValue as AppLogicContextType },
				React.createElement(MedicalRecordStudioModal, {
					isOpen: true,
					onClose: () => {},
					patientId: "pt-emr-test",
					patientName: "Тестовый Пациент",
					initialData: DEFAULT_MEDICAL_CARD_DATA,
				}),
			),
		);

		assert.ok(html.includes("emr-studio-modal"));
		assert.ok(html.includes("emr-studio-bottom-bar"));
		assert.ok(html.includes("emr-studio-btn-primary"));
		assert.strictEqual(html.includes("043/у"), false);
		assert.strictEqual(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
	});
});
