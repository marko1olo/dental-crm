/**
 * useWorkspaceProfile — Feature Toggle Engine
 * Reads flags from the server once, stores in Zustand + localStorage,
 * provides typed selectors for all UI consumers.
 */
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { applyClinicModeToFlags, resolveClinicMode } from "../lib/clinicCapabilities";
/*
 * Заголовки авторизации. Все три запроса ниже уходили БЕЗ них, и это отменяло
 * модульность целиком: GET /api/workspace/profile отвечает 401, если не может
 * определить организацию (routes/workspaceProfile.ts:564), поэтому набор модулей
 * никогда не доезжал с сервера и оставался значениями по умолчанию, где включено
 * всё. Проверено живым запросом: без заголовков 401, с токенами клиники и
 * сотрудника — настоящий набор. Именно поэтому выключенный склад оставался в
 * меню в чистом браузере, хотя признак в базе был false.
 * denteAdminSecretRequestHeaders отправляет оба токена и уже используется в
 * проекте для таких запросов — четвёртый вариант заголовков не заводим.
 */
// Repointed 2026-07-28 at the import-free module. This single line was the runtime edge that
// closed AppHelpers -> workspaceShell -> useWorkspaceProfile -> AppHelpers, a real static cycle
// madge never printed. Nothing else here reaches AppHelpers.
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";

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
	hasClinicalRules: false,
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
	// `?.` после вызова хука убран: useAppLogicContext() либо отдаёт контекст, либо
	// бросает исключение (contexts/AppLogicContext.tsx). Пустого объекта он больше
	// не выдумывает, `null` не возвращает, значит эта ветка была недостижима — а
	// `?.` обещал возможность, которой нет. Внутренние `?.` по dashboard остаются:
	// сводки клиники может не быть, и тогда режим не известен.
	const clinicMode = resolveClinicMode(
		useAppLogicContext().dashboard?.clinicSettings?.profile?.mode,
	);
	return useMemo(() => applyClinicModeToFlags(store, clinicMode), [store, clinicMode]);
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
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(extraData || {}),
		});
		if (!res.ok) throw new Error(`Failed to apply preset: ${presetName}`);
		const body = await res.json();
		flags = body.flags as WorkspaceFeatureFlags;
	} catch (error) {
		console.warn("Failed to fetch preset from server, using local fallback:", error);
		// Local fallback for offline/MVP mode
		const baseFlags = { ...useWorkspaceProfileStore.getState() };
		
		if (presetName === "solo") {
			baseFlags.hasAssistants = false;
			baseFlags.hasMultipleChairs = false;
			baseFlags.hasPayrollModule = false;
			baseFlags.hasMarketingModule = false;
			baseFlags.hasOrthodontics = false;
			baseFlags.hasGnathology = false;
			baseFlags.hasTasks = false;
			baseFlags.numberOfDoctors = 1;
		} else if (presetName === "clinic") {
			baseFlags.hasAssistants = true;
			baseFlags.hasMultipleChairs = true;
			baseFlags.hasPayrollModule = true;
			baseFlags.hasMarketingModule = true;
			baseFlags.hasAnalyticsModule = true;
			baseFlags.hasTasks = true;
			baseFlags.numberOfDoctors = 4;
		} else if (presetName === "enterprise") {
			baseFlags.hasAssistants = true;
			baseFlags.hasMultipleChairs = true;
			baseFlags.hasDentalLab = true;
			baseFlags.hasPayrollModule = true;
			baseFlags.hasMarketingModule = true;
			baseFlags.hasAnalyticsModule = true;
			baseFlags.hasTasks = true;
			baseFlags.hasOrthodontics = true;
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
 * console.warn «updating locally only» и всё равно правила локальный набор. На
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

export async function saveWorkspaceFlags(
	partial: Partial<WorkspaceFeatureFlags>,
): Promise<SaveWorkspaceFlagsResult> {
	let savedOnServer = false;
	let failureText: string | null = null;

	try {
		const response = await fetch("/api/workspace/profile", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(partial),
		});
		if (response.ok) {
			savedOnServer = true;
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
	} catch (error) {
		failureText =
			"Набор модулей не сохранён: сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть, и повторите.";
	}

	/*
	 * Локальный набор правится и при отказе — намеренно: переключатель не должен
	 * прыгать обратно под пальцем, пока человек читает сообщение об ошибке. Но
	 * теперь вызывающая сторона знает, что на сервер не ушло, и говорит об этом.
	 */
	const store = useWorkspaceProfileStore.getState();
	for (const [k, v] of Object.entries(partial)) {
		store.setFlag(k as keyof WorkspaceFeatureFlags, v as boolean | string | number);
	}

	return { savedOnServer, failureText };
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: load from server (used in App startup)
// ──────────────────────────────────────────────────────────────────────────────
export async function loadWorkspaceProfile(): Promise<void> {
	try {
		const res = await fetch("/api/workspace/profile", {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) {
			/*
			 * Отказ здесь оставляет набор по умолчанию, где включено ВСЁ. Это
			 * безопасное направление (лишний раздел не мешает работать так, как
			 * мешает пропавший), но молчать нельзя: именно молчание скрывало, что
			 * запрос уходил без заголовков и всегда получал 401.
			 */
			console.warn(
				`Набор модулей не прочитан с сервера (код ${res.status}); показаны все модули. Настройка модулей на этом устройстве не действует.`,
			);
			return;
		}
		const flags = (await res.json()) as WorkspaceFeatureFlags;
		useWorkspaceProfileStore.getState().hydrate(flags);
	} catch {
		// До сервера не дошли: остаются сохранённые ранее значения.
	}
}
