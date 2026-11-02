import assert from "node:assert/strict";
import type { OnboardingWizardModalProps } from "../../OnboardingWizardModal";

export type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mockReturnValue: (val: any) => MockFn;
};

export function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	return fn;
}

export const vi = {
	fn: (impl?: any) => createMockFn(impl),
	mock: () => {},
};

export function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined),
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.calls || [];
			const match = calls.some((callArgs: any[]) =>
				expectedArgs.every((arg, i) => callArgs[i] === arg),
			);
			assert.ok(
				match,
				`Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`,
			);
		},
		toBeGreaterThanOrEqual: (expected: number) => {
			assert.ok(
				actual >= expected,
				`Expected ${actual} >= ${expected}`,
			);
		},
	};
}

export function findElement(tree: any, predicate: (node: any) => boolean): any {
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

export const staffRoleLabels: Record<string, string> = {
	doctor: "Врач",
	administrator: "Администратор",
	assistant: "Ассистент",
	manager: "Управляющий",
};

export const specialtyLabels: Record<string, string> = {
	therapist: "Терапевт",
	surgeon: "Хирург",
	orthopedist: "Ортопед",
	orthodontist: "Ортодонт",
	pediatric: "Детский",
	periodontist: "Пародонтолог",
	hygienist: "Гигиенист",
	universal: "Универсал",
};

export const clinicModeLabels = {
	solo_doctor: { title: "Соло-врач", detail: "Один кабинет" },
	small_clinic: { title: "Малая клиника", detail: "2-3 кресла" },
	standard: { title: "Стандарт", detail: "Сеть" },
} as any;

export function createTestOnboardingProps(
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

export function createTestSettingsProps(overrides: Record<string, any> = {}) {
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
