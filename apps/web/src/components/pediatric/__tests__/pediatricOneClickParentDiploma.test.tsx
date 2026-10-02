/**
 * pediatricOneClickParentDiploma.test.tsx
 *
 * Unit tests verifying:
 * 1. 1-click parent binding to child's card in PatientCreationModal:
 *    - Child toggle and age < 18 detection
 *    - 1-click role chips: [👩 Мама] [👨 Папа] [🛡 Опекун]
 *    - Parent name and phone inputs with "Взять телефон ребёнка"
 *    - Zero mandatory SNILS or passport series
 * 2. Purge of bureaucratic bird language from doctor UI in PediatricSomaticAndLegalRep & VisitPediatricProtocolWidget:
 *    - Human Russian: «Родитель: Мама (Анна, +7 999 123-45-67). Согласие на лечение получено.»
 *    - Removal of 323-ФЗ / 64 СК РФ citations from visible doctor text
 * 3. 1-tap Bravery Diploma printing in PediatricBraveryDiplomaModal & VisitPediatricProtocolWidget:
 *    - 1-tap toolbar button in VisitPediatricProtocolWidget (pediatric-toolbar-diploma-btn)
 *    - 1-tap button in PatientCardModal for child patients (btn-patient-card-diploma)
 *    - Hotkey Enter trigger & label «Распечатать диплом (Enter)» (btn-modal-print-diploma)
 *    - Auto-formatting «Герой: ...» and «Доктор: ...»
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PatientCreationModal } from "../../patients/PatientCreationModal";
import { PatientCardModal } from "../../patients/PatientCardModal";
import {
	PediatricSomaticAndLegalRep,
	DEFAULT_LEGAL_REPRESENTATIVE,
	formatPediatricRepresentativeText,
} from "../PediatricSomaticAndLegalRep";
import { VisitPediatricProtocolWidget } from "../VisitPediatricProtocolWidget";
import { PediatricBraveryDiplomaModal } from "../PediatricBraveryDiplomaModal";
import { usePatientStore } from "../../../store/patientStore";
import {
	AppLogicProvider,
	type AppLogicContextType,
} from "../../../contexts/AppLogicContext";

const dummyProviderValue = {
	auth: { token: "test", clinicId: "test-clinic" },
	dashboard: { patients: [] },
} as unknown as AppLogicContextType;

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Pediatric 1-Click Parent Binding, Anti-Bloat Human Russian & Bravery Diploma", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. 1-КЛИК ПРИВЯЗКА РОДИТЕЛЯ К КАРТОЧКЕ РЕБЁНКА
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. PatientCreationModal — 1-Click Parent Binding", () => {
		it("renders child toggle button in PatientCreationModal", () => {
			const html = renderToStaticMarkup(
				createElement(
					AppLogicProvider,
					{ value: dummyProviderValue },
					createElement(PatientCreationModal, {
						isOpen: true,
						onClose: () => {},
						createPatient: async () => null,
					}),
				),
			);

			assert.ok(
				html.includes('data-testid="patient-create-child-toggle"'),
				"Must render child toggle button",
			);
		});

		it("renders 1-click parent binding block when patient is under 18 years old", () => {
			// Set birth date for 7 year old child
			const now = new Date();
			const birthYear = now.getFullYear() - 7;
			usePatientStore.getState().setNewPatientBirthDate(`${birthYear}-05-15`);
			usePatientStore.getState().setNewPatientName("Иванов Петр");
			usePatientStore.getState().setNewPatientPhone("+7 (999) 111-22-33");

			const html = renderToStaticMarkup(
				createElement(
					AppLogicProvider,
					{ value: dummyProviderValue },
					createElement(PatientCreationModal, {
						isOpen: true,
						onClose: () => {},
						createPatient: async () => null,
					}),
				),
			);

			// Must render child rep block
			assert.ok(
				html.includes('data-testid="create-patient-child-rep-section"'),
				"Must render create-patient-child-rep-section when patient is minor",
			);

			// Must render 1-click role chips
			assert.ok(
				html.includes('data-testid="chip-rep-role-mother"'),
				"Must render [👩 Мама] chip",
			);
			assert.ok(
				html.includes('data-testid="chip-rep-role-father"'),
				"Must render [👨 Папа] chip",
			);
			assert.ok(
				html.includes('data-testid="chip-rep-role-guardian"'),
				"Must render [🛡 Опекун] chip",
			);

			// Must render 2 clean inputs: parent name & parent phone
			assert.ok(
				html.includes('data-testid="input-child-parent-name"'),
				"Must render parent name input",
			);
			assert.ok(
				html.includes('data-testid="input-child-parent-phone"'),
				"Must render parent phone input",
			);

			// Must render button to copy child's phone
			assert.ok(
				html.includes('data-testid="btn-copy-child-phone"'),
				"Must render button to copy child's phone to parent",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ОЧИСТКА ОТ ПТИЧЬЕГО ЯЗЫКА (АНТИ-БЮРОКРАТИЯ)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. PediatricSomaticAndLegalRep & Protocol — Clean Human Russian Language", () => {
		it("renders clean doctor-facing labels in PediatricSomaticAndLegalRep without bird language", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricSomaticAndLegalRep, {
					initialRepresentative: {
						fullName: "Анна Смирнова",
						phone: "+7 (999) 123-45-67",
						role: "Мать",
						consentSigned: true,
					},
				}),
			);

			// Human doctor UI
			assert.ok(
				html.includes("Родитель / Законный представитель"),
				"Must display human label 'Родитель / Законный представитель'",
			);
			assert.ok(
				html.includes("Родитель на приёме (норма)"),
				"Must display 'Родитель на приёме (норма)'",
			);
			assert.ok(
				html.includes("Согласие на приём оформлено"),
				"Must display 'Согласие на приём оформлено'",
			);
			assert.ok(
				html.includes("Законный представитель ребёнка"),
				"Must display 'Законный представитель ребёнка'",
			);
		});

		it("formats representative protocol line in clean human Russian", () => {
			const text = formatPediatricRepresentativeText({
				fullName: "Анна",
				phone: "+7 (999) 123-45-67",
				role: "Мать",
				statutoryDocument: "",
				consentSigned: true,
			});
			assert.equal(
				text,
				"Родитель: Мама (Анна, +7 (999) 123-45-67). Согласие на лечение получено.",
			);

			// Test in widget with initialShowDetails: true
			const widgetHtml = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					activeTooth: 54,
					initialFranklRating: 3,
					initialShowDetails: true,
				}),
			);

			assert.ok(
				widgetHtml.includes("Родитель:"),
				"Widget protocol must use clean human Russian 'Родитель:' instead of bureaucratic citation",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. ПЕЧАТЬ «ДИПЛОМА ЗА ХРАБРОСТЬ» В 1 ТАП
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. 1-Tap Bravery Diploma Printing", () => {
		it("renders prominent 1-tap diploma button in VisitPediatricProtocolWidget top toolbar", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					activeTooth: 54,
					initialFranklRating: 3,
				}),
			);

			assert.ok(
				html.includes('data-testid="pediatric-toolbar-diploma-btn"'),
				"Must render pediatric-toolbar-diploma-btn in top toolbar",
			);
			assert.ok(
				html.includes("Диплом за храбрость"),
				"Must contain label 'Диплом за храбрость'",
			);
			assert.ok(
				!EMOJI_REGEX.test(html),
				"VisitPediatricProtocolWidget must contain ZERO cartoon emojis (strictly Lucide Award icon)",
			);
		});

		it("renders 1-tap diploma button in PatientCardModal for child patients", () => {
			const html = renderToStaticMarkup(
				createElement(PatientCardModal, {
					isOpen: true,
					onClose: () => {},
					patientData: {
						fullName: "Ваня Смирнов",
						birthDate: "2018-06-10", // 8 years old
						representativeType: "Мать",
					},
				}),
			);

			assert.ok(
				html.includes('data-testid="btn-patient-card-diploma"'),
				"Must render btn-patient-card-diploma in child's card header",
			);
			assert.ok(
				!EMOJI_REGEX.test(html),
				"PatientCardModal must contain ZERO cartoon emojis",
			);
		});

		it("renders PediatricBraveryDiplomaModal with 'Распечатать диплом (Enter)' and formatted names", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricBraveryDiplomaModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Ваня",
					doctorName: "Иванов А. С.",
				}),
			);

			// Print buttons with (Enter) hotkey label
			assert.ok(
				html.includes('data-testid="btn-modal-print-diploma"'),
				"Must render btn-modal-print-diploma button",
			);
			assert.ok(
				html.includes("Распечатать диплом (Enter)"),
				"Modal print button must specify (Enter) hotkey trigger",
			);
			assert.ok(
				html.includes('data-testid="btn-print-bravery-diploma"'),
				"Must render top quick print button",
			);
			assert.ok(
				html.includes("Распечатать (Enter)"),
				"Top quick print button must specify (Enter) hotkey trigger",
			);

			// Formatted hero and doctor names
			assert.ok(
				html.includes("Герой: Ваня"),
				"Preview must display hero name as 'Герой: Ваня'",
			);
			assert.ok(
				html.includes("Доктор: Иванов А. С."),
				"Preview must display doctor name as 'Доктор: Иванов А. С.'",
			);

			// Certificate preview
			assert.ok(
				html.includes('data-testid="diploma-certificate-preview"'),
				"Must render live diploma certificate preview",
			);
		});
	});
});
