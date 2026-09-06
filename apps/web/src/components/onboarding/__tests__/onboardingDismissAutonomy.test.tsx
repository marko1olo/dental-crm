/**
 * onboardingDismissAutonomy.test.tsx
 * DENTE Dental CRM — Unit tests for Onboarding Wizard dismissal freedom and doctor autonomy.
 *
 * CONSTITUTION & RULES:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (no traps, no unclosable modals).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (emergency patient care never blocked).
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	clinicModeLabels,
	specialtyLabels,
	staffRoleLabels,
} from "../../../workspaceUiLabels";
import {
	OnboardingWizardModal,
	type OnboardingWizardModalProps,
} from "../OnboardingWizardModal";

function findElement(node: any, predicate: (n: any) => boolean): any {
	if (!node) return null;
	if (predicate(node)) return node;
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = findElement(child, predicate);
			if (found) return found;
		}
	}
	if (node.props && node.props.children) {
		return findElement(node.props.children, predicate);
	}
	return null;
}

function findDismissButton(tree: any) {
	return findElement(
		tree,
		(node) =>
			node?.type === "button" &&
			(node?.props?.children === "Скрыть" ||
				(Array.isArray(node?.props?.children) &&
					node.props.children.includes("Скрыть"))),
	);
}

function createTestOnboardingProps(
	overrides: Partial<OnboardingWizardModalProps> = {},
): OnboardingWizardModalProps {
	const defaultSteps = [
		{ id: "intro", title: "Режим запуска", detail: "демо или чистая" },
		{ id: "clinic", title: "Клиника", detail: "название и телефон" },
		{ id: "team", title: "Команда", detail: "первый врач и кресло" },
		{ id: "telegram", title: "ТГ-бот", detail: "бот, QR и отзывы" },
		{ id: "done", title: "Готово", detail: "проверка и старт" },
	];

	return {
		currentOnboardingIndex: 4,
		onboardingSteps: defaultSteps,
		legalReadinessPercent: 30,
		continueOnboardingInDraftMode: () => {},
		moveOnboardingTo: () => {},
		onboardingStep: "done",
		onboardingReadyToFinish: false,
		onboardingFinishGuidanceId: "onboarding-finish-guidance",
		onboardingRoleChoices: ["doctor", "administrator"],
		selectedWorkspaceRole: "doctor",
		setSelectedWorkspaceRole: () => {},
		staffRoleLabels,
		specialtyLabels,
		selectedSpecialty: "therapist",
		setSelectedSpecialty: () => {},
		dashboard: {
			clinicSettings: {
				profile: {
					clinicName: "Клиника Д-ра Иванова",
					phone: "+7 900 123-45-67",
					timezone: "Europe/Moscow",
					mode: "solo_doctor",
					address: "Москва",
					inn: "7701234567",
					updatedAt: new Date().toISOString(),
				},
				chairs: [],
				staff: [],
			},
			appointments: [],
			patients: [],
			inventory: [],
			treatmentPlans: [],
			invoices: [],
		} as any,
		clinicModeLabels,
		changeClinicMode: () => {},
		clinicProfileDraft: {
			clinicName: "Клиника Д-ра Иванова",
			phone: "+7 900 123-45-67",
			timezone: "Europe/Moscow",
		},
		updateClinicProfileDraft: () => {},
		uiLanguage: "ru",
		setUiLanguage: () => {},
		normalizeUiLanguageInput: (v: string) => v,
		uiLanguageOptions: [
			{ value: "ru", label: "Русский", detail: "Основной язык" },
		],
		selectedUiLanguageOption: {
			value: "ru",
			label: "Русский",
			detail: "Основной язык",
		},
		weekdayOptions: [
			{ value: 1, label: "Пн" },
			{ value: 2, label: "Вт" },
			{ value: 3, label: "Ср" },
			{ value: 4, label: "Чт" },
			{ value: 5, label: "Пт" },
			{ value: 6, label: "Сб" },
			{ value: 0, label: "Вс" },
		],
		toggleClinicWorkingDay: () => {},
		legalMissingFields: ["inn", "kpp", "ogrn"],
		newStaffName: "",
		setNewStaffName: () => {},
		newStaffRole: "doctor",
		setNewStaffRole: () => {},
		newStaffSpecialty: "therapist",
		setNewStaffSpecialty: () => {},
		addStaffMember: () => {},
		newStaffReadyToCreate: false,
		onboardingStaffCreateGuidanceId: "staff-guidance",
		newChairName: "",
		setNewChairName: () => {},
		addChair: () => {},
		newChairReadyToCreate: false,
		onboardingChairCreateGuidanceId: "chair-guidance",
		staffScheduleDrafts: {},
		staffScheduleDraftFromWorkingHours: () => ({
			start: "09:00",
			end: "21:00",
			workingDays: [1, 2, 3, 4, 5],
		}),
		staffScheduleSaveStates: {},
		staffScheduleDirtyIds: new Set(),
		staffScheduleSavingId: null,
		updateStaffScheduleDraft: () => {},
		toggleStaffWorkingDay: () => {},
		saveStaffSchedule: () => {},
		chairScheduleDrafts: {},
		chairScheduleSaveStates: {},
		chairScheduleDirtyIds: new Set(),
		chairScheduleSavingId: null,
		updateChairScheduleDraft: () => {},
		toggleChairWorkingDay: () => {},
		saveChairSchedule: () => {},
		pricelistSourceKindLabels: {
			manual: "Вручную",
			import: "Импорт",
		} as any,
		pricelistSourceKind: "manual" as any,
		setPricelistSourceKind: () => {},
		clearPricelistImage: () => {},
		setPricelistAnalysis: () => {},
		importSourceLabels: { csv: { title: "CSV" } } as any,
		importSourceKind: "csv" as any,
		setImportSourceKind: () => {},
		setImportPreview: () => {},
		setImportCommit: () => {},
		smartImportModeLabels: { replace: { title: "Замена" } } as any,
		smartImportMode: "replace" as any,
		setSmartImportMode: () => {},
		setSmartImportPreview: () => {},
		setSmartImportCommit: () => {},
		ingestionTargetLabels: { patients: "Пациенты" } as any,
		documentIngestionTarget: "patients" as any,
		setDocumentIngestionTarget: () => {},
		imagingSourceChoices: ["rvg", "optg"] as any,
		imagingImportSourceKind: "rvg" as any,
		imagingSourceLabels: { rvg: "Визиограф", optg: "ОПТГ" } as any,
		setImagingImportSourceKind: () => {},
		setImagingImportPreview: () => {},
		setImagingImportCommit: () => {},
		setDicomSeriesPreview: () => {},
		dicomWebEndpointUrl: "",
		setDicomWebEndpointUrl: () => {},
		setDicomWebCheck: () => {},
		setDicomViewerLaunchManifest: () => {},
		setDicomViewerToolStateBundle: () => {},
		setDicomViewerWorkbenchManifest: () => {},
		ohifBaseUrl: "",
		setOhifBaseUrl: () => {},
		setSettingsTab: () => {},
		telegramStatus: null,
		telegramBotUsernameDraft: "",
		setTelegramBotUsernameDraft: () => {},
		markTelegramSettingsDirty: () => {},
		telegramPatientPortalBaseUrlDraft: "",
		setTelegramPatientPortalBaseUrlDraft: () => {},
		telegramWelcomeImageUrlDraft: "",
		setTelegramWelcomeImageUrlDraft: () => {},
		telegramReviewUrlDraft: "",
		setTelegramReviewUrlDraft: () => {},
		telegramMapsUrlDraft: "",
		setTelegramMapsUrlDraft: () => {},
		telegramTokenTtlDraft: 24,
		setTelegramTokenTtlDraft: () => {},
		telegramReminderLeadTimesDraft: "24h,2h",
		setTelegramReminderLeadTimesDraft: () => {},
		telegramReviewRequestDelayDraft: 2,
		setTelegramReviewRequestDelayDraft: () => {},
		telegramPostVisitCheckupDelayFields: [],
		telegramPostVisitCheckupDelayDrafts: {},
		updateTelegramPostVisitCheckupDelayDraft: () => {},
		telegramAdminSecretDraft: "",
		setTelegramAdminSecretDraft: () => {},
		unlockTelegramAdminSession: () => {},
		telegramAdminSecretSession: false,
		telegramPrivacyModeDraft: "masked",
		setTelegramPrivacyModeDraft: () => {},
		normalizedTelegramPrivacyMode: (m: string) => m,
		telegramPrivacyModeLabels: { masked: "Маскированный" },
		telegramVisualCardFields: [],
		onboardingTelegramVisualCardKeys: [],
		telegramVisualCardUrlDrafts: {},
		updateTelegramVisualCardUrlDraft: () => {},
		telegramFeatureOptions: [],
		telegramEnabledFeaturesDraft: [],
		toggleTelegramFeature: () => {},
		telegramFeatureLabel: (f: string) => f,
		saveTelegramSettings: () => {},
		isTelegramSettingsSaving: false,
		telegramSettingsSaveState: "idle",
		telegramSettingsSaveError: null,
		telegramSettingsDirty: false,
		documentFactoryGroups: [],
		onboardingDocumentsReady: false,
		onboardingBlockingIssues: ["название клиники", "телефон", "часовой пояс"],
		onboardingDocumentReadinessIssues: ["ИНН", "КПП"],
		onboardingTelegramRecommendations: ["подключить бота"],
		dismissOnboarding: () => {},
		saveClinicProfileFromDraft: () => {},
		clinicProfileSaveState: "idle",
		previousOnboardingStep: { id: "telegram", title: "ТГ-бот", detail: "" },
		nextOnboardingStep: null,
		...overrides,
	};
}

describe("Onboarding Wizard Dismissal Freedom & Autonomy (Mandates 8e, 8n)", () => {
	it("1. When onboarding is NOT ready to finish (onboardingReadyToFinish === false), the 'Скрыть' button is NOT disabled", () => {
		const props = createTestOnboardingProps({
			onboardingReadyToFinish: false,
			onboardingBlockingIssues: [
				"название клиники",
				"телефон клиники",
				"часовой пояс",
			],
		});

		const tree = OnboardingWizardModal(props);
		const dismissButton = findDismissButton(tree);

		expect(dismissButton).not.toBeNull();
		expect(dismissButton.props.disabled).toBeFalsy();

		// Clean up aria-describedby: must not associate blocking guidance with dismissal
		expect(dismissButton.props["aria-describedby"]).toBeUndefined();

		// Verify markup rendered to string has an enabled button without disabled attribute
		const html = renderToString(<OnboardingWizardModal {...props} />);
		expect(html).toContain(">Скрыть</button>");
		// Match exact button markup: <button class="secondary-button" type="button">Скрыть</button>
		expect(html).toMatch(
			/<button[^>]*class="secondary-button"[^>]*>Скрыть<\/button>/,
		);
		// Verify no disabled attribute on the Скрыть button
		const dismissButtonMatch = html.match(/<button[^>]*>Скрыть<\/button>/);
		expect(dismissButtonMatch).not.toBeNull();
		expect(dismissButtonMatch![0]).not.toContain("disabled");
		expect(dismissButtonMatch![0]).not.toContain("aria-describedby");
	});

	it("2. Clicking 'Скрыть' invokes dismissal without error and saves draft state when onboarding is not ready to finish", () => {
		let draftModeInvoked = false;
		let dismissalInvoked = false;

		const props = createTestOnboardingProps({
			onboardingReadyToFinish: false,
			continueOnboardingInDraftMode: () => {
				draftModeInvoked = true;
			},
			dismissOnboarding: () => {
				dismissalInvoked = true;
			},
		});

		const tree = OnboardingWizardModal(props);
		const dismissButton = findDismissButton(tree);

		expect(dismissButton).not.toBeNull();
		expect(typeof dismissButton.props.onClick).toBe("function");

		// Execute click handler — must save draft mode seamlessly and not throw
		let clickError: any = null;
		try {
			dismissButton.props.onClick();
		} catch (err) {
			clickError = err;
		}
		expect(clickError).toBeNull();

		expect(draftModeInvoked).toBe(true);
	});

	it("3. Clicking 'Скрыть' invokes dismissal when onboarding is ready to finish", () => {
		let dismissalInvoked = false;

		const props = createTestOnboardingProps({
			onboardingReadyToFinish: true,
			dismissOnboarding: () => {
				dismissalInvoked = true;
			},
		});

		const tree = OnboardingWizardModal(props);
		const dismissButton = findDismissButton(tree);

		expect(dismissButton).not.toBeNull();
		expect(dismissButton.props.disabled).toBeFalsy();

		let clickError: any = null;
		try {
			dismissButton.props.onClick();
		} catch (err) {
			clickError = err;
		}
		expect(clickError).toBeNull();

		expect(dismissalInvoked).toBe(true);
	});

	it("4. Gracefully falls back to dismissOnboarding if continueOnboardingInDraftMode is not supplied", () => {
		let fallbackDismissalInvoked = false;

		const props = createTestOnboardingProps({
			onboardingReadyToFinish: false,
			continueOnboardingInDraftMode: undefined as any,
			dismissOnboarding: () => {
				fallbackDismissalInvoked = true;
			},
		});

		const tree = OnboardingWizardModal(props);
		const dismissButton = findDismissButton(tree);

		expect(dismissButton).not.toBeNull();
		let clickError: any = null;
		try {
			dismissButton.props.onClick();
		} catch (err) {
			clickError = err;
		}
		expect(clickError).toBeNull();

		expect(fallbackDismissalInvoked).toBe(true);
	});

	it("5. Doctor Sovereignty (Mandates 8e, 8n): Solo doctor with empty profile is never trapped by the wizard", () => {
		let dismissedSeamlessly = false;

		// Solo doctor on rented chair without formal backoffice setup
		const soloDoctorProps = createTestOnboardingProps({
			onboardingReadyToFinish: false,
			selectedWorkspaceRole: "doctor",
			legalMissingFields: ["inn", "kpp", "ogrn", "license"],
			onboardingBlockingIssues: [
				"врач с правом подписи ЭМК",
				"кресло",
				"часовой пояс",
			],
			continueOnboardingInDraftMode: () => {
				dismissedSeamlessly = true;
			},
		});

		const tree = OnboardingWizardModal(soloDoctorProps);
		const dismissButton = findDismissButton(tree);

		// Doctor can immediately dismiss the wizard to accept emergency patient
		expect(dismissButton.props.disabled).toBeFalsy();
		dismissButton.props.onClick();
		expect(dismissedSeamlessly).toBe(true);
	});
});
