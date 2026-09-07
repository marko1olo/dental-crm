import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SettingsClinicTab } from "../../settings/SettingsClinicTab";
import {
	OnboardingWizardModal,
	type OnboardingWizardModalProps,
} from "../OnboardingWizardModal";

vi.mock("../../../store/appStore", () => ({
	useAppStore: Object.assign(
		vi.fn((selector?: any) => {
			const state = {
				odontogramViewMode: "standard",
				setOdontogramViewMode: vi.fn(),
			};
			return typeof selector === "function" ? selector(state) : state;
		}),
		{
			getState: vi.fn(() => ({
				odontogramViewMode: "standard",
				setOdontogramViewMode: vi.fn(),
			})),
			setState: vi.fn(),
			subscribe: vi.fn(),
		},
	),
}));

function findElement(tree: any, predicate: (node: any) => boolean): any {
	if (!tree) return null;
	if (predicate(tree)) return tree;
	if (Array.isArray(tree)) {
		for (const child of tree) {
			const found = findElement(child, predicate);
			if (found) return found;
		}
	}
	if (tree.props && tree.props.children) {
		return findElement(tree.props.children, predicate);
	}
	return null;
}

const staffRoleLabels: Record<string, string> = {
	doctor: "Врач",
	administrator: "Администратор",
	assistant: "Ассистент",
	manager: "Управляющий",
};

const specialtyLabels: Record<string, string> = {
	therapist: "Терапевт",
	surgeon: "Хирург",
	orthopedist: "Ортопед",
	orthodontist: "Ортодонт",
	pediatric: "Детский",
	periodontist: "Пародонтолог",
	hygienist: "Гигиенист",
	universal: "Универсал",
};

const clinicModeLabels = {
	solo_doctor: { title: "Соло-врач", detail: "Один кабинет" },
	small_clinic: { title: "Малая клиника", detail: "2-3 кресла" },
	standard: { title: "Стандарт", detail: "Сеть" },
} as any;

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
		currentOnboardingIndex: 2,
		onboardingSteps: defaultSteps,
		legalReadinessPercent: 30,
		continueOnboardingInDraftMode: () => {},
		moveOnboardingTo: () => {},
		onboardingStep: "team",
		onboardingReadyToFinish: false,
		onboardingFinishGuidanceId: "onboarding-finish-guidance",
		onboardingRoleChoices: ["doctor", "administrator", "assistant", "manager"],
		selectedWorkspaceRole: "doctor",
		setSelectedWorkspaceRole: () => {},
		staffRoleLabels: staffRoleLabels as any,
		specialtyLabels: specialtyLabels as any,
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
		pricelistSourceKindLabels: {} as any,
		pricelistSourceKind: "manual" as any,
		setPricelistSourceKind: () => {},
		clearPricelistImage: () => {},
		setPricelistAnalysis: () => {},
		importSourceLabels: {} as any,
		importSourceKind: "csv" as any,
		setImportSourceKind: () => {},
		setImportPreview: () => {},
		setImportCommit: () => {},
		smartImportModeLabels: {} as any,
		smartImportMode: "replace" as any,
		setSmartImportMode: () => {},
		setSmartImportPreview: () => {},
		setSmartImportCommit: () => {},
		ingestionTargetLabels: {} as any,
		documentIngestionTarget: "patients" as any,
		setDocumentIngestionTarget: () => {},
		imagingSourceChoices: [] as any,
		imagingImportSourceKind: "rvg" as any,
		imagingSourceLabels: {} as any,
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
		onboardingBlockingIssues: [],
		onboardingDocumentReadinessIssues: [],
		onboardingTelegramRecommendations: [],
		dismissOnboarding: () => {},
		saveClinicProfileFromDraft: () => {},
		clinicProfileSaveState: "idle",
		previousOnboardingStep: null,
		nextOnboardingStep: null,
		...overrides,
	};
}

function createTestSettingsProps(overrides: Record<string, any> = {}) {
	return {
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
		},
		staffRoleLabels,
		specialtyLabels,
		clinicProfileDraft: {
			clinicName: "Клиника Д-ра Иванова",
			phone: "+7 900 123-45-67",
			timezone: "Europe/Moscow",
			workingDays: [1, 2, 3, 4, 5],
			workdayStart: "09:00",
			workdayEnd: "18:00",
		},
		updateClinicProfileDraft: vi.fn(),
		saveClinicProfileFromDraft: vi.fn(),
		toggleClinicWorkingDay: vi.fn(),
		newChairName: "",
		setNewChairName: vi.fn(),
		addChair: vi.fn(),
		newChairReadyToCreate: false,
		newStaffName: "",
		setNewStaffName: vi.fn(),
		newStaffRole: "doctor",
		setNewStaffRole: vi.fn(),
		newStaffSpecialty: "therapist",
		setNewStaffSpecialty: vi.fn(),
		addStaffMember: vi.fn(),
		newStaffReadyToCreate: false,
		staffScheduleDrafts: {},
		staffScheduleDraftFromWorkingHours: () => ({
			start: "09:00",
			end: "21:00",
			workingDays: [1, 2, 3, 4, 5],
		}),
		staffScheduleSaveStates: {},
		staffScheduleDirtyIds: new Set(),
		staffScheduleSavingId: null,
		updateStaffScheduleDraft: vi.fn(),
		toggleStaffWorkingDay: vi.fn(),
		saveStaffSchedule: vi.fn(),
		chairScheduleDrafts: {},
		chairScheduleSaveStates: {},
		chairScheduleDirtyIds: new Set(),
		chairScheduleSavingId: null,
		updateChairScheduleDraft: vi.fn(),
		toggleChairWorkingDay: vi.fn(),
		saveChairSchedule: vi.fn(),
		...overrides,
	};
}

describe("Onboarding & Settings Staff/Chair Creation Autonomy (Mandates 8e, 8n)", () => {
	it("1. Chair add button in onboarding and settings is NOT disabled when chair name is empty (disabled === false)", () => {
		// Onboarding check
		const onboardingProps = createTestOnboardingProps({
			newChairName: "",
			newChairReadyToCreate: false,
		});
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingChairBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);
		expect(onboardingChairBtn).not.toBeNull();
		expect(onboardingChairBtn.props.disabled).toBe(false);

		// Settings check
		const settingsProps = createTestSettingsProps({
			newChairName: "",
			newChairReadyToCreate: false,
		});
		const settingsTree = SettingsClinicTab({
			props: settingsProps,
			settingsTab: "clinic",
		});
		const settingsChairBtn = findElement(
			settingsTree,
			(n) =>
				n?.type === "button" &&
				n?.props?.["aria-label"] === "Добавить кресло или кабинет",
		);
		expect(settingsChairBtn).not.toBeNull();
		expect(settingsChairBtn.props.disabled).toBe(false);
	});

	it("2. Staff add button in onboarding and settings is NOT disabled when staff name is empty (disabled === false)", () => {
		// Onboarding check
		const onboardingProps = createTestOnboardingProps({
			newStaffName: "",
			newStaffReadyToCreate: false,
		});
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingStaffBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) =>
						typeof c === "string" && c.includes("Добавить сотрудника"),
				),
		);
		expect(onboardingStaffBtn).not.toBeNull();
		expect(onboardingStaffBtn.props.disabled).toBe(false);

		// Settings check
		const settingsProps = createTestSettingsProps({
			newStaffName: "",
			newStaffReadyToCreate: false,
			newStaffRole: "doctor",
			addStaffMember: vi.fn(),
			setNewStaffName: vi.fn(),
		});
		const settingsTree = SettingsClinicTab({
			props: settingsProps,
			settingsTab: "clinic",
		});
		const settingsStaffBtn = findElement(
			settingsTree,
			(n) =>
				n?.type === "button" &&
				n?.props?.["aria-label"] === "Добавить сотрудника",
		);
		expect(settingsStaffBtn).not.toBeNull();
		expect(settingsStaffBtn.props.disabled).toBe(false);
	});

	it("3. Executing addChair with empty name auto-generates safe default chair name ('Кресло 1' or 'Кресло N')", () => {
		// Onboarding: empty chairs -> 'Кресло 1'
		const setOnboardingChairName = vi.fn();
		const addOnboardingChair = vi.fn();
		const onboardingProps1 = createTestOnboardingProps({
			newChairName: "",
			setNewChairName: setOnboardingChairName,
			addChair: addOnboardingChair,
			dashboard: {
				clinicSettings: {
					chairs: [],
					staff: [],
				},
			} as any,
		});
		const tree1 = OnboardingWizardModal(onboardingProps1);
		const btn1 = findElement(
			tree1,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);
		btn1.props.onClick();
		expect(setOnboardingChairName).toHaveBeenCalledWith("Кресло 1");
		expect(addOnboardingChair).toHaveBeenCalledWith("Кресло 1");

		// Onboarding: 2 existing chairs -> 'Кресло 3'
		const setOnboardingChairName2 = vi.fn();
		const addOnboardingChair2 = vi.fn();
		const onboardingProps2 = createTestOnboardingProps({
			newChairName: "",
			setNewChairName: setOnboardingChairName2,
			addChair: addOnboardingChair2,
			dashboard: {
				clinicSettings: {
					chairs: [
						{ id: "c1", name: "Кабинет 1", active: true },
						{ id: "c2", name: "Кабинет 2", active: true },
					],
					staff: [],
				},
			} as any,
		});
		const tree2 = OnboardingWizardModal(onboardingProps2);
		const btn2 = findElement(
			tree2,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);
		btn2.props.onClick();
		expect(setOnboardingChairName2).toHaveBeenCalledWith("Кресло 3");
		expect(addOnboardingChair2).toHaveBeenCalledWith("Кресло 3");

		// Settings: empty chairs -> 'Кресло 1'
		const setSettingsChairName1 = vi.fn();
		const addSettingsChair1 = vi.fn();
		const settingsProps1 = createTestSettingsProps({
			dashboard: {
				clinicSettings: {
					chairs: [],
					staff: [],
				},
			},
			newChairName: "",
			setNewChairName: setSettingsChairName1,
			addChair: addSettingsChair1,
		});
		const settingsTree1 = SettingsClinicTab({
			props: settingsProps1,
			settingsTab: "clinic",
		});
		const settingsBtn1 = findElement(
			settingsTree1,
			(n) =>
				n?.type === "button" &&
				n?.props?.["aria-label"] === "Добавить кресло или кабинет",
		);
		settingsBtn1.props.onClick();
		expect(setSettingsChairName1).toHaveBeenCalledWith("Кресло 1");
		expect(addSettingsChair1).toHaveBeenCalledWith("Кресло 1");

		// Settings: 2 existing chairs -> 'Кресло 3'
		const setSettingsChairName2 = vi.fn();
		const addSettingsChair2 = vi.fn();
		const settingsProps2 = createTestSettingsProps({
			dashboard: {
				clinicSettings: {
					chairs: [
						{ id: "c1", name: "Кабинет 1", active: true },
						{ id: "c2", name: "Кабинет 2", active: true },
					],
					staff: [],
				},
			},
			newChairName: "",
			setNewChairName: setSettingsChairName2,
			addChair: addSettingsChair2,
		});
		const settingsTree2 = SettingsClinicTab({
			props: settingsProps2,
			settingsTab: "clinic",
		});
		const settingsBtn2 = findElement(
			settingsTree2,
			(n) =>
				n?.type === "button" &&
				n?.props?.["aria-label"] === "Добавить кресло или кабинет",
		);
		settingsBtn2.props.onClick();
		expect(setSettingsChairName2).toHaveBeenCalledWith("Кресло 3");
		expect(addSettingsChair2).toHaveBeenCalledWith("Кресло 3");
	});

	it("4. Executing addStaffMember with empty name auto-populates safe default and does not block", () => {
		// Onboarding staff creation with empty name
		const setOnboardingStaffName = vi.fn();
		const addOnboardingStaff = vi.fn();
		const onboardingProps = createTestOnboardingProps({
			newStaffName: "",
			newStaffRole: "doctor",
			setNewStaffName: setOnboardingStaffName,
			addStaffMember: addOnboardingStaff,
		});
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingStaffBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) =>
						typeof c === "string" && c.includes("Добавить сотрудника"),
				),
		);
		onboardingStaffBtn.props.onClick();
		expect(setOnboardingStaffName).toHaveBeenCalledWith("Врач-терапевт");
		expect(addOnboardingStaff).toHaveBeenCalledWith("doctor", "Врач-терапевт");

		// Settings staff creation with empty name
		const setSettingsStaffName = vi.fn();
		const addSettingsStaff = vi.fn();
		const settingsProps = createTestSettingsProps({
			dashboard: {
				clinicSettings: {
					chairs: [],
					staff: [],
				},
			},
			newStaffName: "",
			newStaffRole: "doctor",
			setNewStaffName: setSettingsStaffName,
			addStaffMember: addSettingsStaff,
		});
		const settingsTree = SettingsClinicTab({
			props: settingsProps,
			settingsTab: "clinic",
		});
		const settingsStaffBtn = findElement(
			settingsTree,
			(n) =>
				n?.type === "button" &&
				n?.props?.["aria-label"] === "Добавить сотрудника",
		);
		settingsStaffBtn.props.onClick();
		expect(setSettingsStaffName).toHaveBeenCalledWith("Врач-терапевт");
		expect(addSettingsStaff).toHaveBeenCalledWith("doctor", "Врач-терапевт");
	});

	it("5. Touch targets meet >= 44px (minHeight >= 44px)", () => {
		// Onboarding buttons
		const onboardingProps = createTestOnboardingProps();
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingChairBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);
		const onboardingStaffBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) =>
						typeof c === "string" && c.includes("Добавить сотрудника"),
				),
		);

		expect(onboardingChairBtn).not.toBeNull();
		expect(onboardingStaffBtn).not.toBeNull();
		expect(
			parseInt(onboardingChairBtn.props.style?.minHeight, 10),
		).toBeGreaterThanOrEqual(44);
		expect(
			parseInt(onboardingStaffBtn.props.style?.minHeight, 10),
		).toBeGreaterThanOrEqual(44);

		// Settings buttons
		const settingsProps = createTestSettingsProps({
			newChairName: "",
			newStaffName: "",
		});
		const settingsTree = SettingsClinicTab({
			props: settingsProps,
			settingsTab: "clinic",
		});
		const settingsChairBtn = findElement(
			settingsTree,
			(n) =>
				n?.type === "button" &&
				n?.props?.["aria-label"] === "Добавить кресло или кабинет",
		);
		const settingsStaffBtn = findElement(
			settingsTree,
			(n) =>
				n?.type === "button" &&
				n?.props?.["aria-label"] === "Добавить сотрудника",
		);

		expect(settingsChairBtn).not.toBeNull();
		expect(settingsStaffBtn).not.toBeNull();
		expect(
			parseInt(settingsChairBtn.props.style?.minHeight, 10),
		).toBeGreaterThanOrEqual(44);
		expect(
			parseInt(settingsStaffBtn.props.style?.minHeight, 10),
		).toBeGreaterThanOrEqual(44);
	});
});
