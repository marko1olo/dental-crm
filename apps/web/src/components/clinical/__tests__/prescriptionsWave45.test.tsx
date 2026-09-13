/**
 * prescriptionsWave45.test.tsx
 *
 * Targeted Unit Tests for Feature 223: 1-Click Dental Prescription Express Bundles
 * (Order 1094n Form 107-1/u) & Post-Op Care Sheets (Wave 45).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e & 8n: Doctor Autonomy & Solo Doctor / Small Clinic Sovereignty (Zero Dead-Ends).
 * - Mandate 8k: Friction-Killer Law (1-click Rx bundles, 1-click WhatsApp memo copy).
 * - Mandate 8d п. 6: Anti-Matryoshka Law (modal depth strictly 1).
 * - Mandate 8d п. 4: Desktop density (toolbar/buttons 32–36px, touch targets >= 44px).
 * - Mandate 8d п. 7: Zero cartoon emojis in medical CRM (Lucide vector icons only).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	DENTAL_PRESCRIPTION_EXPRESS_BUNDLES,
	getDentalPrescriptionExpressBundle,
	createPrescriptionDrugItemsFromBundle,
	generatePrescriptionPayloadFromBundle,
} from "@dental/shared";

import { PrescriptionsWidget } from "../PrescriptionsWidget";
import { PatientMemoPrintModal } from "../../visit/PatientMemoPrintModal";
import { POST_OP_PATIENT_MEMOS } from "../../../lib/clinicalProtocols043";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d п. 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

function renderCleanHtml(element: React.ReactElement): string {
	return renderToString(element).replace(/<!-- -->/g, "");
}

const mockPatient = {
	id: "patient-101",
	fullName: "Иванов Иван Иванович",
	birthDate: "1988-04-12",
	cardNumber: "043/у-101",
	address: "г. Москва, ул. Ленина, д. 5",
	phone: "+7 (916) 123-45-67",
};

describe("Wave 45: Dental Prescription Express Bundles & Post-Op Care (Feature 223)", () => {
	describe("1. 1-Click Express Prescription Bundles by Order 1094n (Mandates 8e, 8k)", () => {
		it("1.1. exports exactly 4 canonical outpatient dental bundles", () => {
			assert.equal(DENTAL_PRESCRIPTION_EXPRESS_BUNDLES.length, 4);
			const bundleIds = DENTAL_PRESCRIPTION_EXPRESS_BUNDLES.map((b) => b.id);
			assert.deepEqual(bundleIds, ["surgical", "endo-pain", "perio", "antihistamine"]);
		});

		it("1.2. surgical bundle contains Nimesulide, Amoxiclav, Chlorhexidine with Ciprolet alternative", () => {
			const surgical = getDentalPrescriptionExpressBundle("surgical");
			assert.ok(surgical, "Surgical bundle must exist");
			assert.equal(surgical.badgeRu, "Хирургия");
			assert.equal(surgical.testId, "rx-bundle-surgical");
			assert.equal(surgical.defaultDrugIds.length, 3);
			assert.deepEqual(surgical.defaultDrugIds, [
				"nimesulide_100",
				"amoxiclav_625",
				"chlorhexidine_005",
			]);
			assert.deepEqual(surgical.alternativeDrugIds, ["ciprolet_500"]);

			// Default drugs
			const defaultItems = createPrescriptionDrugItemsFromBundle("surgical");
			assert.equal(defaultItems.length, 3);
			assert.ok(defaultItems.some((i) => i.tradeName.includes("Нимесулид")));
			assert.ok(defaultItems.some((i) => i.tradeName.includes("Амоксиклав")));
			assert.ok(defaultItems.some((i) => i.tradeName.includes("Хлоргексидин")));

			// Penicillin allergy alternative
			const altItems = createPrescriptionDrugItemsFromBundle("surgical", {
				penicillinAllergy: true,
			});
			assert.equal(altItems.length, 3);
			assert.ok(altItems.some((i) => i.tradeName.includes("Ципролет")));
			assert.ok(!altItems.some((i) => i.tradeName.includes("Амоксиклав")));
		});

		it("1.3. endo-pain bundle contains Ketorolac and Drotaverine with Ibuprofen alternative", () => {
			const endo = getDentalPrescriptionExpressBundle("endo-pain");
			assert.ok(endo, "Endo bundle must exist");
			assert.equal(endo.badgeRu, "Эндодонтия");
			assert.equal(endo.testId, "rx-bundle-endo-pain");

			const defaultItems = createPrescriptionDrugItemsFromBundle("endo-pain");
			assert.equal(defaultItems.length, 2);
			assert.ok(defaultItems.some((i) => i.tradeName.includes("Кеторолак")));
			assert.ok(defaultItems.some((i) => i.tradeName.includes("Дротаверин")));

			const altItems = createPrescriptionDrugItemsFromBundle("endo-pain", {
				useAlternative: true,
			});
			assert.equal(altItems.length, 2);
			assert.ok(altItems.some((i) => i.tradeName.includes("Ибупрофен")));
			assert.ok(!altItems.some((i) => i.tradeName.includes("Кеторолак")));
		});

		it("1.4. perio bundle contains Metrogyl Denta and Chlorhexidine", () => {
			const perio = getDentalPrescriptionExpressBundle("perio");
			assert.ok(perio, "Perio bundle must exist");
			assert.equal(perio.badgeRu, "Пародонтология");
			assert.equal(perio.testId, "rx-bundle-perio");

			const items = createPrescriptionDrugItemsFromBundle("perio");
			assert.equal(items.length, 2);
			assert.ok(items.some((i) => i.tradeName.includes("Метрогил Дента")));
			assert.ok(items.some((i) => i.tradeName.includes("Хлоргексидин")));
		});

		it("1.5. antihistamine bundle contains Loratadine with Suprastin alternative", () => {
			const anti = getDentalPrescriptionExpressBundle("antihistamine");
			assert.ok(anti, "Antihistamine bundle must exist");
			assert.equal(anti.badgeRu, "Противоотечный");
			assert.equal(anti.testId, "rx-bundle-antihistamine");

			const defaultItems = createPrescriptionDrugItemsFromBundle("antihistamine");
			assert.equal(defaultItems.length, 1);
			assert.ok(defaultItems.some((i) => i.tradeName.includes("Лоратадин")));

			const altItems = createPrescriptionDrugItemsFromBundle("antihistamine", {
				useAlternative: true,
			});
			assert.equal(altItems.length, 1);
			assert.ok(altItems.some((i) => i.tradeName.includes("Супрастин")));
		});

		it("1.6. generatePrescriptionPayloadFromBundle creates valid Form 107-1/u payload", () => {
			const payload = generatePrescriptionPayloadFromBundle("surgical", {
				clinic: {
					fullName: "ООО «ДЕНТЕ»",
					address: "г. Москва",
					phone: "+7 (495) 777-88-99",
					ogrn: "1157746123456",
					inn: "7701123456",
				},
				patient: {
					fullName: "Петров Петр Петрович",
					birthDate: "1992-06-20",
					medicalCardNumber: "043/у-505",
				},
				doctor: {
					fullName: "Д-р Смирнова Анна Сергеевна",
					specialty: "Стоматолог-хирург",
				},
			});

			assert.equal(payload.formNumber, "107-1/у");
			assert.equal(payload.clinicLegalName, "ООО «ДЕНТЕ»");
			assert.equal(payload.patientFullName, "Петров Петр Петрович");
			assert.equal(payload.doctorFullName, "Д-р Смирнова Анна Сергеевна");
			assert.equal(payload.validityDays, "60");
			assert.equal(payload.items.length, 3);
			assert.ok(payload.prescriptionSeriesNumber.startsWith("РЕЦ-"));
		});
	});

	describe("2. PrescriptionsWidget UI & Express Bundles Integration (Mandate 8c, 8e)", () => {
		it("2.1. renders all 4 express bundle buttons with data-testids", () => {
			const html = renderCleanHtml(
				React.createElement(PrescriptionsWidget, {
					patient: mockPatient,
					doctorName: "Д-р Смирнова Анна Сергеевна",
				}),
			);

			assert.ok(html.includes('data-testid="rx-bundle-surgical"'), "Must render rx-bundle-surgical");
			assert.ok(html.includes('data-testid="rx-bundle-endo-pain"'), "Must render rx-bundle-endo-pain");
			assert.ok(html.includes('data-testid="rx-bundle-perio"'), "Must render rx-bundle-perio");
			assert.ok(html.includes('data-testid="rx-bundle-antihistamine"'), "Must render rx-bundle-antihistamine");
		});

		it("2.2. renders 1-click print button and penicillin alternative toggle", () => {
			const html = renderCleanHtml(
				React.createElement(PrescriptionsWidget, {
					patient: mockPatient,
					doctorName: "Д-р Смирнова Анна Сергеевна",
				}),
			);

			assert.ok(
				html.includes('data-testid="print-bundle-rx-btn"'),
				"Must render print-bundle-rx-btn for 1-click printing",
			);
			assert.ok(
				html.includes('data-testid="toggle-penicillin-alternative-btn"'),
				"Must render toggle-penicillin-alternative-btn for penicillin allergy switch",
			);
		});

		it("2.3. renders 1-click Post-Op Care memo launcher button", () => {
			const html = renderCleanHtml(
				React.createElement(PrescriptionsWidget, {
					patient: mockPatient,
					doctorName: "Д-р Смирнова Анна Сергеевна",
				}),
			);

			assert.ok(
				html.includes('data-testid="open-post-op-care-btn"'),
				"Must render open-post-op-care-btn",
			);
			assert.ok(
				html.includes("Памятка пациенту (Post-Op)"),
				"Must display Post-Op button label",
			);
		});
	});

	describe("3. PatientMemoPrintModal: Post-Operative Memos & Patient Care (Mandates 8e, 8k)", () => {
		it("3.1. POST_OP_PATIENT_MEMOS defines key outpatient sheets", () => {
			assert.ok(POST_OP_PATIENT_MEMOS.length >= 3);
			const sheetIds = POST_OP_PATIENT_MEMOS.map((s) => s.id);
			assert.ok(sheetIds.includes("surgery_extraction"));
			assert.ok(sheetIds.includes("anesthesia_caries"));
			assert.ok(sheetIds.includes("endodontics"));
		});

		it("3.2. renders PatientMemoPrintModal when isOpen is true with category tabs", () => {
			const html = renderCleanHtml(
				React.createElement(PatientMemoPrintModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
					initialMemoId: "surgery_extraction",
				}),
			);

			assert.ok(html.includes("surgery_extraction"), "Must render surgery_extraction memo");
			assert.ok(html.includes("btn-memo-tab-surgery_extraction"), "Must render surgery memo tab");
			assert.ok(html.includes("btn-memo-tab-anesthesia_caries"), "Must render anesthesia memo tab");
			assert.ok(html.includes("btn-memo-tab-endodontics"), "Must render endodontics memo tab");
		});

		it("3.3. renders 1-click Copy, Print, and SOAP buttons with 0 disabled states", () => {
			const html = renderCleanHtml(
				React.createElement(PatientMemoPrintModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
					onApplyToSoap: () => {},
				}),
			);

			assert.ok(
				html.includes('data-testid="btn-copy-memo-text"'),
				"Must render btn-copy-memo-text for 1-click copy",
			);
			assert.ok(
				html.includes('data-testid="btn-print-active-memo"'),
				"Must render btn-print-active-memo for printing",
			);
			assert.ok(
				html.includes('data-testid="btn-apply-memo-soap"'),
				"Must render btn-apply-memo-soap for inserting into SOAP diary",
			);

			// Verify no disabled buttons
			assert.ok(!html.includes('disabled=""'), "Must contain ZERO disabled buttons (Mandate 8e)");
		});

		it("3.4. does not render modal when isOpen is false", () => {
			const html = renderCleanHtml(
				React.createElement(PatientMemoPrintModal, {
					isOpen: false,
					onClose: () => {},
				}),
			);

			assert.equal(html, "", "Modal must render nothing when isOpen is false");
		});

		it("3.5. PostOpCareSheetModal is eradicated per Mandate 8s & Wave 199", () => {
			const oldPath = path.resolve(__dirname, "../PostOpCareSheetModal.tsx");
			assert.equal(fs.existsSync(oldPath), false, "PostOpCareSheetModal.tsx must be eradicated");
		});
	});

	describe("4. 7 Deadly Sins Checklist & Ergonomics (Mandates 8c, 8d)", () => {
		it("4.1. Text & Localization: zero text clipping or undefined/NaN artifacts in rendered HTML", () => {
			const html = renderCleanHtml(
				React.createElement(PrescriptionsWidget, {
					patient: mockPatient,
					doctorName: "Д-р Смирнова Анна Сергеевна",
				}),
			);

			assert.ok(!html.includes("undefined"), "Must not leak undefined in HTML");
			assert.ok(!html.includes("NaN"), "Must not leak NaN in HTML");
			assert.ok(!html.includes("[object Object]"), "Must not leak [object Object]");
		});

		it("4.2. Anti-Matryoshka Law (Mandate 8d п. 6): modal depth is strictly 1 (no nested overlays)", () => {
			const modalHtml = renderCleanHtml(
				React.createElement(PatientMemoPrintModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
				}),
			);

			// Count occurrences of role="dialog"
			const dialogMatches = modalHtml.match(/role="dialog"/g) || [];
			assert.equal(
				dialogMatches.length,
				1,
				"Modal depth must be strictly 1 — exactly one dialog surface without nested modals",
			);
		});

		it("4.3. Desktop Density & Touch Targets: quick buttons have min-h-[48px]", () => {
			const sourcePath = path.resolve(__dirname, "../../visit/PatientMemoPrintModal.tsx");
			const source = fs.readFileSync(sourcePath, "utf8");

			assert.ok(
				source.includes("min-h-[48px]"),
				"PatientMemoPrintModal tabs must have min-h-[48px]",
			);
		});

		it("4.4. Zero Cartoon Emojis (Mandate 8d п. 7): source code contains 0 cartoon emojis in PrescriptionsWidget", () => {
			const sourcePath = path.resolve(__dirname, "../PrescriptionsWidget.tsx");
			const source = fs.readFileSync(sourcePath, "utf8");

			assert.equal(
				hasCartoonEmojis(source),
				false,
				"PrescriptionsWidget source must contain ZERO cartoon emojis",
			);
		});

		it("4.5. Zero Cartoon Emojis (Mandate 8d п. 7): source code contains 0 cartoon emojis in PatientMemoPrintModal", () => {
			const sourcePath = path.resolve(__dirname, "../../visit/PatientMemoPrintModal.tsx");
			const source = fs.readFileSync(sourcePath, "utf8");

			assert.equal(
				hasCartoonEmojis(source),
				false,
				"PatientMemoPrintModal source must contain ZERO cartoon emojis",
			);
		});

		it("4.6. Lucide Vector Icons only: imports vector icons from lucide-react", () => {
			const sourcePath = path.resolve(__dirname, "../../visit/PatientMemoPrintModal.tsx");
			const source = fs.readFileSync(sourcePath, "utf8");

			assert.ok(
				source.includes('from "lucide-react"'),
				"Must import vector icons from lucide-react",
			);
			assert.ok(source.includes("HeartPulse"), "Must import HeartPulse icon");
			assert.ok(source.includes("Printer"), "Must import Printer icon");
			assert.ok(source.includes("Copy"), "Must import Copy icon");
		});
	});
});
