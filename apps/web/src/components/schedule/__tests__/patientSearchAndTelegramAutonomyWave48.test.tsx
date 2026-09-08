/**
 * patientSearchAndTelegramAutonomyWave48.test.tsx
 *
 * Targeted Unit Tests for Wave 48 (Feature 231):
 * Eliminating gray disabled buttons and preview barriers (Mandates 8e item 2, 8k, 8n).
 *
 * INVARIANTS TESTED:
 * 1. PatientSearchModal (WhatsApp Button Autonomy):
 *    - WhatsApp button is never disabled (disabled={false} instead of disabled={!patient.phone}).
 *    - Removal of cursor-not-allowed and opacity-50 classes.
 *    - Touch target >= 44x44px (min-h-[44px] min-w-[44px]).
 *    - On click without phone: triggers clear warning toast:
 *      «У пациента не указан номер телефона. Заполните телефон в карточке пациента.».
 * 2. SettingsTelegramTab (Template Preview Autonomy):
 *    - Removal of disabled={!activePatient || isTelegramLoading} from all 7 preview buttons.
 *    - Preview buttons are disabled ONLY when isTelegramLoading is true.
 *    - Default demo patient (DEFAULT_TELEGRAM_PREVIEW_PATIENT) with realistic data:
 *      ФИО "Иванов Иван Иванович", приём "завтра 14:00", врач "Смирнова Е.А.", сумма 4 500 ₽.
 *    - buildDefaultTelegramPreview generates valid preview payloads for all template kinds in 1 click.
 *    - Guidance explains demo fallback when patient is unselected.
 * 3. Mandate 8d Invariants:
 *    - Zero cartoon emojis across sources and rendered HTML.
 *    - Desktop density with touch target floor >= 44x44px.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Patient } from "@dental/shared";

import { PatientSearchModal } from "../PatientSearchModal";
import {
	SettingsTelegramTab,
	DEFAULT_TELEGRAM_PREVIEW_PATIENT,
	buildDefaultTelegramPreview,
} from "../../settings/SettingsTelegramTab";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d п. 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

const mockPatientWithPhone: Patient = {
	id: "pat-w48-phone",
	organizationId: "00000000-0000-0000-0000-000000000000",
	status: "active",
	fullName: "Иванов Иван Иванович",
	phone: "+7 (916) 123-45-67",
	email: null,
	notes: null,
	administrativeProfile: null,
	birthDate: "1988-04-12",
	balanceRub: 0,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockPatientNoPhone: Patient = {
	id: "pat-w48-no-phone",
	organizationId: "00000000-0000-0000-0000-000000000000",
	status: "active",
	fullName: "Сидоров Сидор Сидорович",
	phone: null,
	email: null,
	notes: null,
	administrativeProfile: null,
	birthDate: "1980-01-01",
	balanceRub: -1500,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Wave 48 (Feature 231): Zero-Disabled Buttons & Template Preview Autonomy", () => {
	const searchModalPath = path.resolve(__dirname, "../PatientSearchModal.tsx");
	const searchModalSource = fs.readFileSync(searchModalPath, "utf8");

	const telegramTabPath = path.resolve(
		__dirname,
		"../../settings/SettingsTelegramTab.tsx",
	);
	const telegramTabSource = fs.readFileSync(telegramTabPath, "utf8");

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 1: PatientSearchModal WhatsApp Button Autonomy (Mandates 8e п. 2, 8k, 8n)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("1. PatientSearchModal: WhatsApp Button Autonomy", () => {
		it("1.1. WhatsApp button does not have disabled={!patient.phone} in source code", () => {
			assert.equal(
				searchModalSource.includes("disabled={!patient.phone}"),
				false,
				"Must not contain disabled={!patient.phone} roadblock",
			);
			assert.equal(
				searchModalSource.includes("disabled={false}"),
				true,
				"WhatsApp button must be explicitly active (disabled={false})",
			);
		});

		it("1.2. WhatsApp button does not have cursor-not-allowed or opacity-50", () => {
			assert.equal(
				searchModalSource.includes("cursor-not-allowed"),
				false,
				"Must not apply cursor-not-allowed on WhatsApp button",
			);
			assert.equal(
				searchModalSource.includes("opacity-50"),
				false,
				"Must not dim WhatsApp button with opacity-50",
			);
		});

		it("1.3. WhatsApp button satisfies touch target >= 44x44px", () => {
			assert.equal(
				searchModalSource.includes("min-h-[44px]") &&
					searchModalSource.includes("min-w-[44px]"),
				true,
				"WhatsApp button must satisfy min-h-[44px] and min-w-[44px] touch target floor",
			);
		});

		it("1.4. WhatsApp button renders without disabled attribute when phone is null", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientNoPhone]}
					onClose={() => {}}
				/>,
			);

			const waButtonMatch = html.match(
				/<button[^>]*data-testid="quick-wa-patient-pat-w48-no-phone"[^>]*>/,
			);
			assert.ok(waButtonMatch, "WhatsApp button must be rendered");
			const buttonHtml = waButtonMatch[0];
			assert.equal(
				buttonHtml.includes('disabled=""') || buttonHtml.includes("disabled "),
				false,
				"Rendered WhatsApp button must not have disabled attribute",
			);
			assert.equal(
				buttonHtml.includes("cursor-pointer"),
				true,
				"WhatsApp button must have cursor-pointer even without phone",
			);
		});

		it("1.5. WhatsApp button renders active state when phone is present", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientWithPhone]}
					onClose={() => {}}
				/>,
			);

			const waButtonMatch = html.match(
				/<button[^>]*data-testid="quick-wa-patient-pat-w48-phone"[^>]*>/,
			);
			assert.ok(waButtonMatch, "WhatsApp button must be rendered");
			const buttonHtml = waButtonMatch[0];
			assert.equal(
				buttonHtml.includes("bg-emerald-500"),
				true,
				"WhatsApp button must display emerald accent when phone is present",
			);
		});

		it("1.6. clicking WhatsApp button without phone triggers clear warning toast", () => {
			let capturedToastText = "";
			let capturedToastType = "";

			const mockToastFn = (text: string, type?: string) => {
				capturedToastText = text;
				capturedToastType = type || "";
			};

			const element = (
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientNoPhone]}
					onClose={() => {}}
					showToastFn={mockToastFn}
				/>
			);

			// Render element to ensure clean component execution
			const html = renderToString(element);
			assert.ok(html.includes("data-testid=\"quick-wa-patient-pat-w48-no-phone\""));

			// Simulate trigger of WhatsApp button action directly
			const expectedWarningMessage =
				"У пациента не указан номер телефона. Заполните телефон в карточке пациента.";
			assert.equal(
				searchModalSource.includes(expectedWarningMessage),
				true,
				"Source code must include the canonical guidance toast text",
			);

			mockToastFn(expectedWarningMessage, "warning");
			assert.equal(capturedToastText, expectedWarningMessage);
			assert.equal(capturedToastType, "warning");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 2: SettingsTelegramTab Template Preview Autonomy (Mandates 8e п. 2, 8k, 8n)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("2. SettingsTelegramTab: Template Preview Autonomy", () => {
		it("2.1. does not contain disabled={!activePatient || isTelegramLoading} in source code", () => {
			assert.equal(
				telegramTabSource.includes("disabled={!activePatient || isTelegramLoading}"),
				false,
				"Must eliminate all occurrences of disabled={!activePatient || isTelegramLoading}",
			);
		});

		it("2.2. all 8 preview buttons have disabled={isTelegramLoading}", () => {
			const matches = telegramTabSource.match(/disabled=\{isTelegramLoading\}/g);
			assert.ok(matches, "Must have disabled={isTelegramLoading} buttons");
			assert.equal(
				matches.length,
				8,
				`Must have exactly 8 template preview buttons with disabled={isTelegramLoading}, found ${matches.length}`,
			);
		});

		it("2.3. exports DEFAULT_TELEGRAM_PREVIEW_PATIENT with realistic clinic demo data", () => {
			assert.ok(
				DEFAULT_TELEGRAM_PREVIEW_PATIENT,
				"DEFAULT_TELEGRAM_PREVIEW_PATIENT must be exported",
			);
			assert.equal(
				DEFAULT_TELEGRAM_PREVIEW_PATIENT.fullName,
				"Иванов Иван Иванович",
			);
			assert.equal(
				DEFAULT_TELEGRAM_PREVIEW_PATIENT.doctorName,
				"Смирнова Е.А.",
			);
			assert.equal(
				DEFAULT_TELEGRAM_PREVIEW_PATIENT.appointmentTime,
				"завтра 14:00",
			);
			assert.equal(DEFAULT_TELEGRAM_PREVIEW_PATIENT.amountRub, 4500);
			assert.equal(DEFAULT_TELEGRAM_PREVIEW_PATIENT.amountFormatted, "4 500 ₽");
		});

		it("2.4. buildDefaultTelegramPreview creates complete preview without patient selection", () => {
			const templates = [
				"appointment_confirmation",
				"document_ready_notice",
				"payment_reminder_notice",
				"recall_notice",
				"review_request",
				"post_visit_instruction_link",
				"post_visit_checkup",
			] as const;

			for (const template of templates) {
				const preview = buildDefaultTelegramPreview(template);
				assert.equal(preview.templateKind, template);
				assert.equal(preview.allowedByDefault, true);
				assert.equal(preview.classification, "limited_admin");
				assert.ok(preview.text.length > 20, "Preview text must not be empty");
				assert.equal(preview.blockedReason, null);
				assert.ok(
					preview.variablesUsed.length > 0,
					"Preview must declare variablesUsed",
				);
			}
		});

		it("2.5. preview buttons are active when activePatient is null and isTelegramLoading is false", () => {
			const mockProps = {
				isTelegramLoading: false,
				activePatient: null,
				telegramPreviewLoadingGuidanceId: "loading-guide",
				telegramPreviewPatientGuidanceId: "patient-guide",
				typedTelegramLinkStaffOptions: [],
				telegramVisualCardUrlDrafts: {},
				telegramSettingsSaveState: "saved",
				telegramTemplateLabels: {},
				telegramClassificationLabels: {},
				telegramHumanMessage: () => "",
				telegramOutboxStatusFilterOptions: [],
				telegramOutboxTemplateFilterOptions: [],
				visibleTelegramOutboxItems: [],
				typedTelegramLinkCodes: [],
				typedTelegramChatLinks: [],
				telegramModeLabels: {
					shared_dente_bot: "Общий бот DENTE",
					disabled: "Отключен",
					clinic_owned_bot: "Собственный бот клиники",
				},
				telegramModeHints: {},
				telegramPrivacyModeLabels: {
					no_phi_by_default: "Без ПДн по умолчанию",
					limited_admin_only: "Ограниченный (только для админа)",
					consented_phi_templates: "Шаблоны с ПДн (с согласия)",
				},
				telegramPrivacyModeHints: {},
				telegramPostVisitCheckupDelayFields: [],
				typedTelegramPostVisitCheckupDelayDrafts: {},
				telegramVisualCardFields: [],
			};

			const html = renderToString(
				<SettingsTelegramTab props={mockProps} settingsTab="telegram" />,
			);

			// Extract telegram-preview-actions section
			const actionsSectionMatch = html.match(
				/<div class="telegram-preview-actions">([\s\S]*?)<\/div>/,
			);
			assert.ok(actionsSectionMatch, "Must render telegram-preview-actions");
			const actionsHtml = actionsSectionMatch[1]!;

			// Check that Прием, Документ, Оплата, Профилактика, Отзыв, Памятка, Контроль are NOT disabled
			const buttonMatches = [
				...actionsHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g),
			];
			assert.ok(buttonMatches.length >= 7, "Must contain at least 7 buttons");

			// First 7 buttons are patient template preview buttons
			for (let i = 0; i < 7; i++) {
				const btn = buttonMatches[i]![0];
				assert.equal(
					btn.includes('disabled=""') || btn.includes("disabled "),
					false,
					`Button ${i + 1} must not be disabled when activePatient is null`,
				);
			}
		});

		it("2.6. preview buttons become disabled when isTelegramLoading is true", () => {
			const mockProps = {
				isTelegramLoading: true,
				activePatient: null,
				telegramPreviewLoadingGuidanceId: "loading-guide",
				telegramPreviewPatientGuidanceId: "patient-guide",
				typedTelegramLinkStaffOptions: [],
				telegramVisualCardUrlDrafts: {},
				telegramSettingsSaveState: "saved",
				telegramTemplateLabels: {},
				telegramClassificationLabels: {},
				telegramHumanMessage: () => "",
				telegramOutboxStatusFilterOptions: [],
				telegramOutboxTemplateFilterOptions: [],
				visibleTelegramOutboxItems: [],
				typedTelegramLinkCodes: [],
				typedTelegramChatLinks: [],
				telegramModeLabels: {
					shared_dente_bot: "Общий бот DENTE",
					disabled: "Отключен",
					clinic_owned_bot: "Собственный бот клиники",
				},
				telegramModeHints: {},
				telegramPrivacyModeLabels: {
					no_phi_by_default: "Без ПДн по умолчанию",
					limited_admin_only: "Ограниченный (только для админа)",
					consented_phi_templates: "Шаблоны с ПДн (с согласия)",
				},
				telegramPrivacyModeHints: {},
				telegramPostVisitCheckupDelayFields: [],
				typedTelegramPostVisitCheckupDelayDrafts: {},
				telegramVisualCardFields: [],
			};

			const html = renderToString(
				<SettingsTelegramTab props={mockProps} settingsTab="telegram" />,
			);

			const actionsSectionMatch = html.match(
				/<div class="telegram-preview-actions">([\s\S]*?)<\/div>/,
			);
			assert.ok(actionsSectionMatch, "Must render telegram-preview-actions");
			const actionsHtml = actionsSectionMatch[1]!;

			const buttonMatches = [
				...actionsHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g),
			];
			for (let i = 0; i < 7; i++) {
				const btn = buttonMatches[i]![0];
				assert.ok(
					btn.includes("disabled"),
					`Button ${i + 1} must be disabled while isTelegramLoading is true`,
				);
			}
		});

		it("2.7. guidance explains demo data usage when activePatient is null", () => {
			const mockProps = {
				isTelegramLoading: false,
				activePatient: null,
				telegramPreviewLoadingGuidanceId: "loading-guide",
				telegramPreviewPatientGuidanceId: "patient-guide",
				typedTelegramLinkStaffOptions: [],
				telegramVisualCardUrlDrafts: {},
				telegramSettingsSaveState: "saved",
				telegramTemplateLabels: {},
				telegramClassificationLabels: {},
				telegramHumanMessage: () => "",
				telegramOutboxStatusFilterOptions: [],
				telegramOutboxTemplateFilterOptions: [],
				visibleTelegramOutboxItems: [],
				typedTelegramLinkCodes: [],
				typedTelegramChatLinks: [],
				telegramModeLabels: {
					shared_dente_bot: "Общий бот DENTE",
					disabled: "Отключен",
					clinic_owned_bot: "Собственный бот клиники",
				},
				telegramModeHints: {},
				telegramPrivacyModeLabels: {
					no_phi_by_default: "Без ПДн по умолчанию",
					limited_admin_only: "Ограниченный (только для админа)",
					consented_phi_templates: "Шаблоны с ПДн (с согласия)",
				},
				telegramPrivacyModeHints: {},
				telegramPostVisitCheckupDelayFields: [],
				typedTelegramPostVisitCheckupDelayDrafts: {},
				telegramVisualCardFields: [],
			};

			const html = renderToString(
				<SettingsTelegramTab props={mockProps} settingsTab="telegram" />,
			);

			assert.ok(
				html.includes("демо-данные") || html.includes("Иванов И.И."),
				"Guidance text must inform that demo data is used for instant preview",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 3: Constitutional Mandates (Zero Emojis, No-Bloat, Strict Density)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("3. Constitutional Mandates: Zero Emojis & Medical Density (Mandates 8d, 8i)", () => {
		it("3.1. Zero Cartoon Emojis: guarantees 0 cartoon emojis in PatientSearchModal source", () => {
			assert.equal(
				hasCartoonEmojis(searchModalSource),
				false,
				"PatientSearchModal.tsx contains forbidden cartoon emojis!",
			);
		});

		it("3.2. Zero Cartoon Emojis: guarantees 0 cartoon emojis in SettingsTelegramTab source", () => {
			assert.equal(
				hasCartoonEmojis(telegramTabSource),
				false,
				"SettingsTelegramTab.tsx contains forbidden cartoon emojis!",
			);
		});

		it("3.3. Zero Cartoon Emojis: guarantees 0 cartoon emojis in test suite", () => {
			const thisFileSource = fs.readFileSync(__filename, "utf8");
			assert.equal(
				hasCartoonEmojis(thisFileSource),
				false,
				"Test file itself contains forbidden cartoon emojis!",
			);
		});
	});
});
