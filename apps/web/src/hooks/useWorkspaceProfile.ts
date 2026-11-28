/**
 * useWorkspaceProfile — Feature Toggle Engine
 * Reads flags from the server once, stores in Zustand + localStorage,
 * provides typed selectors for all UI consumers.
 */
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../components/GlobalToast";
import {
	getErrorStatus,
	isPlainRecord,
	parseJsonEnvelope,
	unwrapApiEnvelope,
} from "../lib/apiResponseHandler";
import { applyClinicModeToFlags } from "../lib/clinicCapabilities";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../lib/denteRequestHeaders";
import { actionFailureToast } from "../lib/panelStateText";
import { useSettingsStore } from "../store/settingsStore";
import { logger } from "../utils/logger";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface WorkspaceFeatureFlags {
	hasAssistants: boolean;
	hasMultipleChairs: boolean;
	hasDentalLab: boolean;
	hasInsuranceCoPay: boolean;
	hasInstallments: boolean;
	hasOrthodontics: boolean;
	hasGnathology: boolean;
	hasTasks: boolean;
	hasReclamations: boolean;
	workspacePreset: string;
	onboardingCompleted: boolean;
	hasPediatricMode: boolean;
	isOmniRole: boolean;
	numberOfDoctors: number;
	hasPayrollModule: boolean;
	hasMarketingModule: boolean;
	hasAnalyticsModule: boolean;
	hasCsoScanner: boolean;
	hasLeadsKanban: boolean;
	hasOmnichannel: boolean;
	hasInventoryModule: boolean;
	aiEnableTreatmentPlan: boolean;
	aiEnableRecommendations: boolean;
	aiEnableDocuments: boolean;
	hasEngineeringStatus: boolean;
	hasClinicalRules: boolean;
	hasReferralModule: boolean;
	hasBpmWorkflows: boolean;
}

interface WorkspaceProfileStore extends WorkspaceFeatureFlags {
	loaded: boolean;
	hydrate: (flags: WorkspaceFeatureFlags) => void;
	setFlag: (
		key: keyof WorkspaceFeatureFlags,
		value: boolean | string | number,
	) => void;
	applyPartialFlags: (partial: Partial<WorkspaceFeatureFlags>) => void;
	reset: () => void;
}

const DEFAULT_FLAGS: WorkspaceFeatureFlags = {
	hasAssistants: true,
	hasMultipleChairs: true,
	hasDentalLab: true,
	hasInsuranceCoPay: true,
	hasInstallments: true,
	hasOrthodontics: true,
	hasGnathology: false,
	hasTasks: true,
	hasReclamations: true,
	workspacePreset: "enterprise",
	onboardingCompleted: false,
	hasPediatricMode: false,
	isOmniRole: false,
	numberOfDoctors: 4,
	hasPayrollModule: true,
	hasMarketingModule: true,
	hasAnalyticsModule: true,
	hasCsoScanner: false,
	hasLeadsKanban: false,
	hasOmnichannel: false,
	hasInventoryModule: true,
	aiEnableTreatmentPlan: true,
	aiEnableRecommendations: true,
	aiEnableDocuments: true,
	hasEngineeringStatus: false,
	hasClinicalRules: true,

	hasReferralModule: false,
	hasBpmWorkflows: false,
};

// ──────────────────────────────────────────────────────────────────────────────
// Zustand store with localStorage persistence
// ──────────────────────────────────────────────────────────────────────────────
export const useWorkspaceProfileStore = create<WorkspaceProfileStore>()(
	persist(
		(set) => ({
			...DEFAULT_FLAGS,
			loaded: false,

			hydrate: (flags) =>
				set({
					...flags,
					loaded: true,
				}),

			setFlag: (key, value) => set((s) => ({ ...s, [key]: value })),

			applyPartialFlags: (partial) => set((s) => ({ ...s, ...partial })),

			reset: () => set({ ...DEFAULT_FLAGS, loaded: false }),
		}),
		{
			name: "dente-workspace-profile",
			partialize: (s) => ({
				hasAssistants: s.hasAssistants,
				hasMultipleChairs: s.hasMultipleChairs,
				hasDentalLab: s.hasDentalLab,
				hasInsuranceCoPay: s.hasInsuranceCoPay,
				hasInstallments: s.hasInstallments,
				hasOrthodontics: s.hasOrthodontics,
				hasGnathology: s.hasGnathology ?? false,
				hasTasks: s.hasTasks,
				hasReclamations: s.hasReclamations,
				workspacePreset: s.workspacePreset,
				onboardingCompleted: s.onboardingCompleted,
				numberOfDoctors: s.numberOfDoctors,
				hasPayrollModule: s.hasPayrollModule,
				hasMarketingModule: s.hasMarketingModule,
				hasAnalyticsModule: s.hasAnalyticsModule,
				hasCsoScanner: s.hasCsoScanner,
				hasLeadsKanban: s.hasLeadsKanban,
				hasOmnichannel: s.hasOmnichannel,
				hasInventoryModule: s.hasInventoryModule,
				aiEnableTreatmentPlan: s.aiEnableTreatmentPlan,
				aiEnableRecommendations: s.aiEnableRecommendations,
				aiEnableDocuments: s.aiEnableDocuments,
				hasEngineeringStatus: s.hasEngineeringStatus,
				hasClinicalRules: s.hasClinicalRules,
				hasReferralModule: s.hasReferralModule,
				hasBpmWorkflows: s.hasBpmWorkflows,
			}),
		},
	),
);

// ──────────────────────────────────────────────────────────────────────────────
// Hook — call once on app mount to pull flags from server
// ──────────────────────────────────────────────────────────────────────────────
/**
 * ДВЕ СИСТЕМЫ МОДУЛЬНОСТИ ОТВЕЧАЛИ НА ОДИН ВОПРОС ПО-РАЗНОМУ.
 *
 * «Занимается ли клиника продвижением» решают здесь флагом `hasMarketingModule`
 * (по нему прячется вкладка настроек «Маркетинг»: `SettingsView.tsx:1201` и
 * `:1512`) и одновременно режим клиники (по нему из бокового меню уходят разделы
 * «Маркетинг/SEO» и «Обращения»: `workspaceShell.tsx` → `getVisibleRailViews`).
 * У отдельного врача они расходились: раздела в меню нет, а вкладка настроек
 * маркетинга на месте — потому что `GET /api/workspace/profile`
 * (`apps/api/src/routes/workspaceProfile.ts:451`) возвращает `hasMarketingModule:
 * true` любой организации, не глядя ни на базу, ни на режим.
 *
 * СОГЛАСОВАНО В ОДНУ СТОРОНУ: от режима к флагу. Режим — настоящие данные, он
 * лежит в колонке `organizations.clinic_mode` и меняется из настроек; набор флагов
 * приходит константой и записан быть не может (`POST` на тот же адрес
 * деструктурирует семнадцать флагов и не сохраняет ни одного). Спрашивать флаг о
 * режиме значило бы получить захардкоженный `true` и отменить весь режим.
 *
 * Режим только ОПУСКАЕТ флаг и никогда не поднимает: клиника, которая выключила
 * маркетинг вручную, включённым его от режима не получит. Режим неизвестен —
 * не трогаем ничего.
 *
 * Клинические флаги (`hasOrthodontics`, `hasDentalLab`, `hasPediatricMode`,
 * `aiEnable*` и остальные) режимом НЕ управляются и здесь не участвуют: врач,
 * работающий один, лечит ровно так же, как клиника. Скрывается организационная
 * обвязка, не медицина.
 *
 * САМО ПРАВИЛО ЛЕЖИТ НЕ ЗДЕСЬ, а в `lib/clinicCapabilities.ts`
 * (`applyClinicModeToFlags`), рядом с таблицей возможностей, по которой из меню
 * уходит раздел. Выражением внутри хука оно было непроверяемым: убедиться, что
 * режим опускает ровно один признак и не трогает ни одного клинического, можно
 * было только отрисовкой. Здесь остаётся подключение к данным — откуда берётся
 * режим и как результат кэшируется.
 */
export function useWorkspaceProfile() {
	const store = useWorkspaceProfileStore();
	// clinicMode comes from settingsStore (set by useAppLogic after dashboard load).
	// Reading it here avoids the AppLogicContext → useAppLogic → useScheduleLogic
	// → useWorkspaceProfile → AppLogicContext circular dependency.
	const clinicMode = useSettingsStore((s) => s.clinicMode);
	return useMemo(
		() => applyClinicModeToFlags(store, clinicMode ?? null),
		[store, clinicMode],
	);
}

function parseWorkspaceFlagsPayload(value: unknown): WorkspaceFeatureFlags | null {
	const unwrapped = unwrapApiEnvelope(value);
	const candidate =
		isPlainRecord(unwrapped) && isPlainRecord(unwrapped.flags)
			? unwrapped.flags
			: unwrapped;
	if (!isPlainRecord(candidate)) return null;
	// Require at least one recognized WorkspaceFeatureFlags key to reject arbitrary JSON objects
	const hasFlagKey = Object.keys(DEFAULT_FLAGS).some((key) => key in candidate);
	if (!hasFlagKey) return null;
	return {
		hasAssistants: typeof candidate.hasAssistants === "boolean" ? candidate.hasAssistants : DEFAULT_FLAGS.hasAssistants,
		hasMultipleChairs: typeof candidate.hasMultipleChairs === "boolean" ? candidate.hasMultipleChairs : DEFAULT_FLAGS.hasMultipleChairs,
		hasDentalLab: typeof candidate.hasDentalLab === "boolean" ? candidate.hasDentalLab : DEFAULT_FLAGS.hasDentalLab,
		hasInsuranceCoPay: typeof candidate.hasInsuranceCoPay === "boolean" ? candidate.hasInsuranceCoPay : DEFAULT_FLAGS.hasInsuranceCoPay,
		hasInstallments: typeof candidate.hasInstallments === "boolean" ? candidate.hasInstallments : DEFAULT_FLAGS.hasInstallments,
		hasOrthodontics: typeof candidate.hasOrthodontics === "boolean" ? candidate.hasOrthodontics : DEFAULT_FLAGS.hasOrthodontics,
		hasGnathology: typeof candidate.hasGnathology === "boolean" ? candidate.hasGnathology : DEFAULT_FLAGS.hasGnathology,
		hasTasks: typeof candidate.hasTasks === "boolean" ? candidate.hasTasks : DEFAULT_FLAGS.hasTasks,
		hasReclamations: typeof candidate.hasReclamations === "boolean" ? candidate.hasReclamations : DEFAULT_FLAGS.hasReclamations,
		workspacePreset: typeof candidate.workspacePreset === "string" ? candidate.workspacePreset : DEFAULT_FLAGS.workspacePreset,
		onboardingCompleted: typeof candidate.onboardingCompleted === "boolean" ? candidate.onboardingCompleted : DEFAULT_FLAGS.onboardingCompleted,
		hasPediatricMode: typeof candidate.hasPediatricMode === "boolean" ? candidate.hasPediatricMode : DEFAULT_FLAGS.hasPediatricMode,
		isOmniRole: typeof candidate.isOmniRole === "boolean" ? candidate.isOmniRole : DEFAULT_FLAGS.isOmniRole,
		numberOfDoctors: typeof candidate.numberOfDoctors === "number" ? candidate.numberOfDoctors : DEFAULT_FLAGS.numberOfDoctors,
		hasPayrollModule: typeof candidate.hasPayrollModule === "boolean" ? candidate.hasPayrollModule : DEFAULT_FLAGS.hasPayrollModule,
		hasMarketingModule: typeof candidate.hasMarketingModule === "boolean" ? candidate.hasMarketingModule : DEFAULT_FLAGS.hasMarketingModule,
		hasAnalyticsModule: typeof candidate.hasAnalyticsModule === "boolean" ? candidate.hasAnalyticsModule : DEFAULT_FLAGS.hasAnalyticsModule,
		hasCsoScanner: typeof candidate.hasCsoScanner === "boolean" ? candidate.hasCsoScanner : DEFAULT_FLAGS.hasCsoScanner,
		hasLeadsKanban: typeof candidate.hasLeadsKanban === "boolean" ? candidate.hasLeadsKanban : DEFAULT_FLAGS.hasLeadsKanban,
		hasOmnichannel: typeof candidate.hasOmnichannel === "boolean" ? candidate.hasOmnichannel : DEFAULT_FLAGS.hasOmnichannel,
		hasInventoryModule: typeof candidate.hasInventoryModule === "boolean" ? candidate.hasInventoryModule : DEFAULT_FLAGS.hasInventoryModule,
		aiEnableTreatmentPlan: typeof candidate.aiEnableTreatmentPlan === "boolean" ? candidate.aiEnableTreatmentPlan : DEFAULT_FLAGS.aiEnableTreatmentPlan,
		aiEnableRecommendations: typeof candidate.aiEnableRecommendations === "boolean" ? candidate.aiEnableRecommendations : DEFAULT_FLAGS.aiEnableRecommendations,
		aiEnableDocuments: typeof candidate.aiEnableDocuments === "boolean" ? candidate.aiEnableDocuments : DEFAULT_FLAGS.aiEnableDocuments,
		hasEngineeringStatus: typeof candidate.hasEngineeringStatus === "boolean" ? candidate.hasEngineeringStatus : DEFAULT_FLAGS.hasEngineeringStatus,
		hasClinicalRules: typeof candidate.hasClinicalRules === "boolean" ? candidate.hasClinicalRules : DEFAULT_FLAGS.hasClinicalRules,
		hasReferralModule: typeof candidate.hasReferralModule === "boolean" ? candidate.hasReferralModule : DEFAULT_FLAGS.hasReferralModule,
		hasBpmWorkflows: typeof candidate.hasBpmWorkflows === "boolean" ? candidate.hasBpmWorkflows : DEFAULT_FLAGS.hasBpmWorkflows,
	};
}

function isWorkspaceFlagsPayload(value: unknown): value is WorkspaceFeatureFlags {
	return parseWorkspaceFlagsPayload(value) !== null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: apply a named preset to the server and update local store
// ──────────────────────────────────────────────────────────────────────────────
export async function applyWorkspacePreset(
	presetName: string,
	extraData?: {
		numberOfChairs?: number;
		numberOfDoctors?: number;
		hasPediatricMode?: boolean;
	},
): Promise<WorkspaceFeatureFlags> {
	let flags: WorkspaceFeatureFlags;

	try {
		const res = await fetch(`/api/workspace/preset/${presetName}`, {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(extraData || {}),
		});
		if (!res.ok) {
			// Message-first: Cyrillic payload.message before status EN (same helper as saveWorkspaceFlags).
			const rawBody = await res.text();
			const serverDetail = workspaceProfileServerDetail(rawBody);
			const reason =
				serverDetail ??
				(res.status === 401 || res.status === 403
					? "нет прав — войдите как сотрудник клиники"
					: res.status >= 500
						? "сервер клиники ответил отказом"
						: `сервер не принял запрос (код ${res.status})`);
			throw new Error(
				`Пресет рабочего места не применён (${presetName}): ${reason}. Берём локальный набор.`,
			);
		}
		const body = await parseJsonEnvelope(
			res,
			isWorkspaceFlagsPayload,
			`Некорректный ответ при применении пресета (${presetName})`,
		);
		flags = parseWorkspaceFlagsPayload(body) ?? { ...DEFAULT_FLAGS };
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				getErrorStatus(error),
			),
			"error",
		);
		logger.warn(
			"Пресет с сервера не получен, используем локальный набор:",
			error instanceof Error ? error.message : error,
		);
		// Local fallback for offline/MVP mode
		const baseFlags = { ...useWorkspaceProfileStore.getState() };

		if (presetName === "solo" || presetName === "solo_therapist") {
			baseFlags.hasAssistants = false;
			baseFlags.hasMultipleChairs = false;
			baseFlags.hasDentalLab = false;
			baseFlags.hasInsuranceCoPay = false;
			baseFlags.hasPayrollModule = false;
			baseFlags.hasMarketingModule = false;
			baseFlags.hasAnalyticsModule = false;
			baseFlags.hasInventoryModule = false;
			baseFlags.hasOrthodontics = false;
			baseFlags.hasGnathology = false;
			baseFlags.hasTasks = false;
			baseFlags.hasCsoScanner = false;
			baseFlags.hasLeadsKanban = false;
			baseFlags.hasOmnichannel = false;
			baseFlags.hasClinicalRules = false;
			baseFlags.hasEngineeringStatus = false;
			baseFlags.numberOfDoctors = 1;
		} else if (presetName === "clinic" || presetName === "family_clinic") {
			baseFlags.hasAssistants = true;
			baseFlags.hasMultipleChairs = true;
			baseFlags.hasDentalLab = true;
			baseFlags.hasInsuranceCoPay = true;
			baseFlags.hasPayrollModule = true;
			baseFlags.hasMarketingModule = true;
			baseFlags.hasAnalyticsModule = true;
			baseFlags.hasInventoryModule = true;
			baseFlags.hasTasks = true;
			baseFlags.hasClinicalRules = true;
			baseFlags.numberOfDoctors = 4;
		} else if (presetName === "enterprise") {
			baseFlags.hasAssistants = true;
			baseFlags.hasMultipleChairs = true;
			baseFlags.hasDentalLab = true;
			baseFlags.hasInsuranceCoPay = true;
			baseFlags.hasPayrollModule = true;
			baseFlags.hasMarketingModule = true;
			baseFlags.hasAnalyticsModule = true;
			baseFlags.hasInventoryModule = true;
			baseFlags.hasTasks = true;
			baseFlags.hasOrthodontics = true;
			baseFlags.hasClinicalRules = true;
			baseFlags.numberOfDoctors = 10;
		}

		baseFlags.workspacePreset = presetName;
		flags = baseFlags;
	}

	if (extraData?.hasPediatricMode !== undefined) {
		flags.hasPediatricMode = extraData.hasPediatricMode;
	}
	if (extraData?.numberOfDoctors !== undefined) {
		flags.numberOfDoctors = extraData.numberOfDoctors;
	}
	if (extraData?.numberOfChairs !== undefined) {
		// In case server didn't set it from extraData or we want local override
		flags.hasMultipleChairs = extraData.numberOfChairs > 1;
	}

	useWorkspaceProfileStore.getState().hydrate(flags);
	return flags;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: save individual flag toggles to server
// ──────────────────────────────────────────────────────────────────────────────
/**
 * Результат сохранения набора модулей.
 *
 * ЗАЧЕМ ВОЗВРАЩАТЬ, А НЕ МОЛЧАТЬ. Прежняя версия ловила любую ошибку, писала
 * logger.warn «updating locally only» и всё равно правила локальный набор. На
 * экране это выглядело как «Сохранено»: владелец выключал модуль, видел галочку
 * и уходил. А на сервер запрос не доходил вовсе, потому что уходил без
 * заголовков авторизации (см. ниже), и выбор жил до первой чистки браузера — на
 * втором устройстве и у второго сотрудника клиника снова получала все модули
 * включёнными. Тихий откат настройки хуже отказа: отказ можно повторить.
 */
export interface SaveWorkspaceFlagsResult {
	readonly savedOnServer: boolean;
	/** Человеческая причина, если на сервер не сохранилось. */
	readonly failureText: string | null;
}

/**
 * RU message-first from API body. Inline (not AppHelpers.operatorReadableErrorDetail):
 * this module must not import AppHelpers — that closes the static cycle
 * AppHelpers → workspaceShell → useWorkspaceProfile → AppHelpers.
 * Same rule as diary: Cyrillic human text wins; technical English is dropped.
 */
function workspaceProfileServerDetail(rawBody: string): string | null {
	let payload: Record<string, unknown> | null = null;
	try {
		const parsed: unknown = JSON.parse(rawBody);
		if (isPlainRecord(parsed)) {
			payload = parsed;
		}
	} catch (err: unknown) {
		logger.debug("Ошибка разбора ответа профиля рабочего места:", err);
		payload = null;
	}
	const candidate =
		typeof payload?.message === "string"
			? payload.message
			: typeof payload?.error === "string"
				? payload.error
				: null;
	const message = candidate?.trim() ?? "";
	if (!message) return null;
	// Operator-facing: Cyrillic human text only. Do NOT block the word "JSON"
	// inside RU ValidationError copy ("JSON-объект") — that is the gameplay text
	// the Zod guard returns and the operator must see.
	if (!/[А-Яа-яЁё]/.test(message)) return null;
	if (
		/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|ENOENT|ECONNREFUSED|EACCES|ETIMEDOUT)\b|\/api\/|https?:\/\//i.test(
			message,
		)
	) {
		return null;
	}
	return message;
}

export async function saveWorkspaceFlags(
	partial: Partial<WorkspaceFeatureFlags>,
): Promise<SaveWorkspaceFlagsResult> {
	let savedOnServer = false;
	let failureText: string | null = null;

	try {
		const response = await fetch("/api/workspace/profile", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(partial),
		});
		if (response.ok) {
			savedOnServer = true;
		} else {
			// Prefer server RU ValidationError message (Zod body guard) over status-only text.
			const rawBody = await response.text();
			const serverDetail = workspaceProfileServerDetail(rawBody);
			if (serverDetail) {
				failureText = serverDetail;
			} else if (response.status === 401 || response.status === 403) {
				failureText =
					"Набор модулей не сохранён: нет прав. Войдите как сотрудник клиники и повторите — иначе выбор пропадёт при следующем входе.";
			} else if (response.status >= 500) {
				failureText =
					"Набор модулей не сохранён: сервер клиники ответил отказом. Повторите, а если повторится — сообщите администратору.";
			} else {
				failureText =
					"Набор модулей не сохранён: сервер не принял запрос. Обновите страницу и повторите.";
			}
		}
	} catch (err: unknown) {
		logger.warn("Сбой сети при сохранении набора модулей:", err);
		failureText =
			"Набор модулей не сохранён: сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть, и повторите.";
	}

	/*
	 * Локальный набор правится и при отказе — намеренно: переключатель не должен
	 * прыгать обратно под пальцем, пока человек читает сообщение об ошибке. Но
	 * теперь вызывающая сторона знает, что на сервер не ушло, и говорит об этом.
	 */
	useWorkspaceProfileStore.getState().applyPartialFlags(partial);

	return { savedOnServer, failureText };
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: load from server (used in App startup)
// ──────────────────────────────────────────────────────────────────────────────
export async function loadWorkspaceProfile(): Promise<void> {
	try {
		const res = await fetch("/api/workspace/profile", {
			headers: denteClinicalReadHeaders(),
		});
		if (!res.ok) {
			/*
			 * Отказ здесь оставляет набор по умолчанию, где включено ВСЁ. Это
			 * безопасное направление (лишний раздел не мешает работать так, как
			 * мешает пропавший), но молчать нельзя: именно молчание скрывало, что
			 * запрос уходил без заголовков и всегда получал 401.
			 */
			logger.warn(
				`Набор модулей не прочитан с сервера (код ${res.status}); показаны все модули. Настройка модулей на этом устройстве не действует.`,
			);
			return;
		}
		const flags = await parseJsonEnvelope(
			res,
			isWorkspaceFlagsPayload,
			"Некорректный ответ профиля рабочего места",
		);
		const normalized = parseWorkspaceFlagsPayload(flags);
		if (normalized) {
			useWorkspaceProfileStore.getState().hydrate(normalized);
		}
	} catch (err: unknown) {
		logger.warn("Не удалось загрузить профиль рабочего места с сервера:", err);
	}
}
