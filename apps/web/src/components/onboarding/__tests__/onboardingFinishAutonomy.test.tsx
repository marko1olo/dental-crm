/**
 * onboardingFinishAutonomy.test.tsx
 * DENTE Dental CRM — Unit tests for Onboarding Wizard completion freedom and doctor autonomy.
 *
 * CONSTITUTION & RULES:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (No disabled buttons without reason).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero Dead-Ends; doctor treating patients never trapped).
 * - Mandate 8o: Factual, scope-specific reporting.
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

function findFinishButton(tree: any) {
	return findElement(
		tree,
		(node) =>
			node?.type === "button" &&
			(node?.props?.children === "Завершить настройку" ||
				(Array.isArray(node?.props?.children) &&
					node.props.children.includes("Завершить настройку"))),
	);
}

function findNextButton(tree: any) {
	return findElement(
		tree,
		(node) =>
			node?.type === "button" &&
			(node?.props?.children === "Дальше" ||
				(Array.isArray(node?.props?.children) &&
					node.props.children.some(
						(c: any) => typeof c === "string" && c.includes("Дальше"),
					))),
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

describe("Onboarding Wizard Finish Autonomy (Mandates 8e, 8n)", () => {
	it("1. When onboardingReadyToFinish is false, the 'Завершить настройку' button is NOT disabled (disabled === false)", () => {
		const props = createTestOnboardingProps({
			onboardingReadyToFinish: false,
			nextOnboardingStep: null,
		});

		const tree = OnboardingWizardModal(props);
		const finishButton = findFinishButton(tree);

		expect(finishButton).not.toBeNull();
		// Button must not be disabled
		expect(finishButton.props.disabled).toBeFalsy();

		// Verify markup rendered to string has an enabled button without disabled attribute
		const html = renderToString(<OnboardingWizardModal {...props} />);
		expect(html).toContain(">Завершить настройку</button>");

		const finishButtonMatch = html.match(
			/<button[^>]*>Завершить настройку<\/button>/,
		);
		expect(finishButtonMatch).not.toBeNull();
		expect(finishButtonMatch![0]).not.toContain("disabled");

		// aria-describedby points to guidance explaining draft completion
		expect(finishButton.props["aria-describedby"]).toBe(
			props.onboardingFinishGuidanceId,
		);
		expect(html).toContain("Для полного профиля заполните:");
		expect(html).toContain("Завершение сейчас сохранит настройки в черновике.");
	});

	it("2. Clicking 'Завершить настройку' executes dismissal and saves draft state without throwing errors", () => {
		let draftModeInvoked = false;
		let dismissalInvoked = false;
		let toastReceived: any = null;

		const originalWindow = (globalThis as any).window;
		const mockWindow = new EventTarget();
		(globalThis as any).window = mockWindow;

		const handleToast = (e: any) => {
			toastReceived = e.detail;
		};
		mockWindow.addEventListener("dente-toast", handleToast);

		try {
			const props = createTestOnboardingProps({
				onboardingReadyToFinish: false,
				nextOnboardingStep: null,
				continueOnboardingInDraftMode: () => {
					draftModeInvoked = true;
				},
				dismissOnboarding: () => {
					dismissalInvoked = true;
				},
			});

			const tree = OnboardingWizardModal(props);
			const finishButton = findFinishButton(tree);

			expect(finishButton).not.toBeNull();
			expect(typeof finishButton.props.onClick).toBe("function");

			let clickError: any = null;
			try {
				finishButton.props.onClick();
			} catch (err) {
				clickError = err;
			}
			expect(clickError).toBeNull();

			// Saves draft state via continueOnboardingInDraftMode
			expect(draftModeInvoked).toBe(true);

			// Fires polite toast notification per Mandate 8e
			expect(toastReceived).not.toBeNull();
			expect(toastReceived.type).toBe("success");
			expect(toastReceived.text).toContain("Настройки сохранены в черновике");
			expect(toastReceived.text).toContain("Мандат 8e");
		} finally {
			mockWindow.removeEventListener("dente-toast", handleToast);
			if (originalWindow !== undefined) {
				(globalThis as any).window = originalWindow;
			} else {
				delete (globalThis as any).window;
			}
		}
	});

	it("3. The 'Дальше' button advancing to 'done' is not disabled when onboardingReadyToFinish is false", () => {
		let navigationTarget: string | null = null;

		const props = createTestOnboardingProps({
			onboardingStep: "telegram",
			currentOnboardingIndex: 3,
			onboardingReadyToFinish: false,
			nextOnboardingStep: {
				id: "done",
				title: "Готово",
				detail: "проверка и старт",
			},
			previousOnboardingStep: { id: "team", title: "Команда", detail: "" },
			moveOnboardingTo: (step: string) => {
				navigationTarget = step;
			},
		});

		const tree = OnboardingWizardModal(props);
		const nextButton = findNextButton(tree);

		expect(nextButton).not.toBeNull();
		// The button must NOT be disabled
		expect(nextButton.props.disabled).toBeFalsy();

		// Screen reader must not receive confusing finish guidance on the forward button
		expect(nextButton.props["aria-describedby"]).toBeUndefined();

		// Verify markup rendered to string has an enabled button without disabled attribute
		const html = renderToString(<OnboardingWizardModal {...props} />);
		expect(html).toContain("Дальше");

		const nextButtonMatch = html.match(
			/<button[^>]*class="primary-button"[^>]*>Дальше/,
		);
		expect(nextButtonMatch).not.toBeNull();
		expect(nextButtonMatch![0]).not.toContain("disabled");

		// Clicking 'Дальше' successfully navigates forward to 'done'
		expect(typeof nextButton.props.onClick).toBe("function");
		let clickError: any = null;
		try {
			nextButton.props.onClick();
		} catch (err) {
			clickError = err;
		}
		expect(clickError).toBeNull();
		expect(navigationTarget).toBe("done");
	});

	it("4. Gracefully falls back to saveClinicProfileFromDraft and onDismissOnboarding if continueOnboardingInDraftMode is not supplied", () => {
		let profileSaved = false;
		let fallbackDismissalInvoked = false;

		const props = createTestOnboardingProps({
			onboardingReadyToFinish: false,
			nextOnboardingStep: null,
			continueOnboardingInDraftMode: undefined as any,
			saveClinicProfileFromDraft: () => {
				profileSaved = true;
			},
			dismissOnboarding: () => {
				fallbackDismissalInvoked = true;
			},
		});

		const tree = OnboardingWizardModal(props);
		const finishButton = findFinishButton(tree);

		expect(finishButton).not.toBeNull();
		let clickError: any = null;
		try {
			finishButton.props.onClick();
		} catch (err) {
			clickError = err;
		}
		expect(clickError).toBeNull();

		expect(profileSaved).toBe(true);
		expect(fallbackDismissalInvoked).toBe(true);
	});

	it("5. Doctor Sovereignty (Mandates 8e, 8n): Solo doctor with empty profile can complete setup without blocking buttons", () => {
		let dismissedSeamlessly = false;

		// Solo doctor on chair rental without formal legal backoffice setup yet
		const soloDoctorProps = createTestOnboardingProps({
			onboardingReadyToFinish: false,
			nextOnboardingStep: null,
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
		const finishButton = findFinishButton(tree);

		// Button is never greyed out or unclickable
		expect(finishButton.props.disabled).toBeFalsy();
		finishButton.props.onClick();
		expect(dismissedSeamlessly).toBe(true);
	});
});
