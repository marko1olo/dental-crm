/**
 * types.ts — Layer 0: Workspace Profile and Feature Flags Types, Schemas & Contracts.
 *
 * Mandate 8s (Sovereign Scale): Solo Doctor, Small Clinic, Enterprise/Network.
 */

import { z } from "zod";

/**
 * POST /api/workspace/preset/:name: optional body overrides.
 * Was bare `req.body?.hasPediatricMode` / `numberOfChairs` after Fastify Body?.
 * Non-object body must 400 (not coerce array/string into flags).
 */
export const workspacePresetBodySchema = z
	.object({
		numberOfChairs: z.number().int().positive().optional(),
		hasPediatricMode: z.boolean().optional(),
	})
	.strict();

export type WorkspacePresetBody = z.infer<typeof workspacePresetBodySchema>;

/**
 * POST /api/workspace/profile: partial flag toggles.
 * Was bare `typeof req.body === "object"` — arrays are objects in JS, so `[]`
 * spread into the merge as a weird object and answered 200. Non-object body
 * must 400 ValidationError (RU), same AUTH-first pattern as preset.
 * Empty object / null/undefined → {} (no-op partial is valid).
 * Unknown keys and wrong types still filtered by workspaceFlagsFromStorage.
 */
export const workspaceProfileBodySchema = z.object({}).passthrough();

export type WorkspaceProfileBody = z.infer<typeof workspaceProfileBodySchema>;

// ————————————————————————————————————————————————————————————————————————————
// Feature Flags Contract
// ————————————————————————————————————————————————————————————————————————————
export interface WorkspaceFeatureFlags {
	hasAssistants: boolean;
	hasMultipleChairs: boolean;
	hasDentalLab: boolean;
	hasInsuranceCoPay: boolean;
	hasInstallments: boolean;
	hasOrthodontics: boolean;
	hasTasks: boolean;
	hasReclamations: boolean;
	hasPediatricMode: boolean;
	isOmniRole: boolean;
	workspacePreset: string;
	onboardingCompleted: boolean;
	hasPayrollModule: boolean;
	hasMarketingModule: boolean;
	hasAnalyticsModule: boolean;
	hasInventoryModule: boolean;
	aiEnableTreatmentPlan: boolean;
	aiEnableRecommendations: boolean;
	aiEnableDocuments: boolean;
	/*
	 * ДЕВЯТЬ ПРИЗНАКОВ, КОТОРЫЕ КЛИЕНТ ПРИСЫЛАЛ, А СЕРВЕР МОЛЧА ВЫБРАСЫВАЛ.
	 *
	 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Набор клиента
	 * (apps/web/src/hooks/useWorkspaceProfile.ts) держит 28 признаков, здесь их
	 * было 19. workspaceFlagsFromStorage перебирает ключи ТОЛЬКО этого набора,
	 * поэтому девять признаков отбрасывались и на записи, и на чтении, а маршрут
	 * при этом отвечал 200 и возвращал сохранённый набор — клиент показывал
	 * галочку «сохранено». Дороже всего обошёлся hasClinicalRules: он закрывает
	 * вкладку клинических правил (SettingsView.tsx:1224) и её панель
	 * (components/settings/SettingsRulesTab.tsx:119-121), умолчание — выключено, а
	 * переключатель в WorkspaceFeaturesSelector.tsx:232-239 ничего не сохранял. То
	 * есть предупреждения по протоколам лечения — таблица и четыре живых маршрута
	 * (routes/clinical.ts:51,80,92,124) — включались только в одном браузере
	 * одного сотрудника и исчезали на втором устройстве, у второго врача и после
	 * очистки браузера. Тем же путём терялся hasEngineeringStatus — единственный
	 * признак, открывающий врачу состояние отправки документа в ЕГИСЗ
	 * (components/visit/VisitOdontogramTab.tsx:97-104).
	 *
	 * Умолчания совпадают с клиентскими, поэтому у работающих клиник не меняется
	 * ничего: меняется только то, что ВКЛЮЧЁННЫЙ признак теперь доживает до базы.
	 */
	hasGnathology: boolean;
	hasCsoScanner: boolean;
	hasLeadsKanban: boolean;
	hasOmnichannel: boolean;
	hasEngineeringStatus: boolean;
	hasClinicalRules: boolean;
	hasReferralModule: boolean;
	hasBpmWorkflows: boolean;
	/* Число, а не признак: разбор ниже проверяет тип отдельно. */
	numberOfDoctors: number;
}

export type PresetName =
	| "solo_therapist"
	| "prosthodontist"
	| "pediatric"
	| "orthodontic"
	| "surgery_center"
	| "implant_center"
	| "family_clinic"
	| "multi_specialty"
	| "enterprise"
	| "custom";

/**
 * Пресет задаёт выбор МОДУЛЕЙ, а не весь набор признаков.
 *
 * Девять признаков, добавленных в контракт выше (клинические правила, состояние
 * отправки в ЕГИСЗ и остальные), ни один пресет не выбирает, и применение
 * пресета не должно их сбрасывать: обработчик складывает пресет с уже
 * сохранённым набором клиники. Поэтому Omit, а НЕ Partial — пропустить модуль,
 * который пресет обязан задать, по-прежнему нельзя.
 */
export type WorkspacePresetFeatureFlags = Omit<
	WorkspaceFeatureFlags,
	| "hasGnathology"
	| "hasCsoScanner"
	| "hasLeadsKanban"
	| "hasOmnichannel"
	| "hasEngineeringStatus"
	| "hasClinicalRules"
	| "hasReferralModule"
	| "hasBpmWorkflows"
	| "numberOfDoctors"
>;
