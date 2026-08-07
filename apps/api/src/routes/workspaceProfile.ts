/**
 * Workspace Profile Routes
 * GET  /api/workspace/profile        — load feature flags for current org
 * POST /api/workspace/profile        — save feature flags (individual toggles)
 * POST /api/workspace/preset/:name   — apply a named preset + seed demo data
 *
 * POST /api/workspace/onboarding/complete здесь БОЛЬШЕ НЕТ — разбор удаления
 * стоит на месте, где маршрут был зарегистрирован, в конце этого файла.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";

/**
 * POST /api/workspace/preset/:name: optional body overrides.
 * Was bare `req.body?.hasPediatricMode` / `numberOfChairs` after Fastify Body?.
 * Non-object body must 400 (not coerce array/string into flags).
 */
const workspacePresetBodySchema = z
	.object({
		numberOfChairs: z.number().int().positive().optional(),
		hasPediatricMode: z.boolean().optional(),
	})
	.strict();

/**
 * POST /api/workspace/profile: partial flag toggles.
 * Was bare `typeof req.body === "object"` — arrays are objects in JS, so `[]`
 * spread into the merge as a weird object and answered 200. Non-object body
 * must 400 ValidationError (RU), same AUTH-first pattern as preset.
 * Empty object / null/undefined → {} (no-op partial is valid).
 * Unknown keys and wrong types still filtered by workspaceFlagsFromStorage.
 */
const workspaceProfileBodySchema = z.object({}).passthrough();

/**
 * БЫЛО: организация бралась из заголовка x-organization-id без всякой проверки,
 * иначе подставлялся жёстко зашитый UUID. Любой анонимный запрос мог прочитать и
 * ПЕРЕЗАПИСАТЬ настройки рабочего пространства любой клиники, а POST /preset/:name
 * ещё и засеивал/затирал демо-данные. Теперь организация только из подписанного
 * токена; при его отсутствии обработчик обязан вернуть 401.
 */
function resolveOrganizationId(req: FastifyRequest): string | null {
	return getRequestIdentity(req).organizationId;
}

// ————————————————————————————————————————————————————————————————————————————
// Types
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

/**
 * Умолчания для клиники, которая ещё не настраивалась.
 *
 * Ровно те значения, которые раньше стояли литералом в ответе GET
 * /api/workspace/profile. Оставлены как есть намеренно: у работающих клиник
 * колонка пуста, и смена умолчаний прямо сейчас скрыла бы у них разделы, к
 * которым они привыкли. Настроит клиника модули — в базе появится её набор.
 */
export const DEFAULT_WORKSPACE_FEATURE_FLAGS: WorkspaceFeatureFlags = {
	hasAssistants: true,
	hasMultipleChairs: true,
	hasDentalLab: true,
	hasInsuranceCoPay: true,
	hasInstallments: true,
	hasOrthodontics: true,
	hasTasks: true,
	hasReclamations: true,
	hasPediatricMode: false,
	isOmniRole: false,
	workspacePreset: "enterprise",
	onboardingCompleted: true,
	hasPayrollModule: true,
	hasMarketingModule: true,
	hasAnalyticsModule: true,
	hasInventoryModule: true,
	aiEnableTreatmentPlan: true,
	aiEnableRecommendations: true,
	aiEnableDocuments: true,
	// Девять признаков, которых здесь не было: умолчания взяты из DEFAULT_FLAGS
	// клиента (hooks/useWorkspaceProfile.ts), чтобы у работающих клиник ни один
	// раздел не появился и не исчез от самого расширения контракта.
	hasGnathology: false,
	hasCsoScanner: false,
	hasLeadsKanban: false,
	hasOmnichannel: false,
	hasEngineeringStatus: false,
	hasClinicalRules: true,

	hasReferralModule: false,
	hasBpmWorkflows: false,
	numberOfDoctors: 4,
};

/**
 * Привести запись из базы к полному набору признаков.
 *
 * Набор растёт вместе с продуктом: за одну ночь в него добавляли
 * hasBpmWorkflows, hasClinicalRules, hasReferralModule. Поэтому старая запись
 * обязана читаться без ошибки — отсутствующие признаки берутся из умолчаний, а
 * неизвестные ключи отбрасываются, чтобы в ответ не просочилось то, чего в
 * контракте нет.
 *
 * Типы проверяются по значению, а не по вере: в jsonb может лежать что угодно,
 * включая результат ручной правки базы.
 */
export function workspaceFlagsFromStorage(
	stored: unknown,
): WorkspaceFeatureFlags {
	const source =
		stored && typeof stored === "object"
			? (stored as Record<string, unknown>)
			: {};
	const result = { ...DEFAULT_WORKSPACE_FEATURE_FLAGS } as Record<
		string,
		unknown
	>;
	for (const [key, fallback] of Object.entries(
		DEFAULT_WORKSPACE_FEATURE_FLAGS,
	)) {
		const value = source[key];
		if (typeof fallback === "boolean" && typeof value === "boolean")
			result[key] = value;
		else if (typeof fallback === "string" && typeof value === "string" && value)
			result[key] = value;
		// Число проверяется отдельно: numberOfDoctors — единственный числовой
		// признак, и без этой ветки он отбрасывался бы наравне с чужими ключами.
		// NaN и Infinity в jsonb попасть могут (ручная правка базы), но признаком
		// числа доктора быть не могут.
		else if (
			typeof fallback === "number" &&
			typeof value === "number" &&
			Number.isFinite(value)
		)
			result[key] = value;
	}
	return result as unknown as WorkspaceFeatureFlags;
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

// ————————————————————————————————————————————————————————————————————————————
// Preset definitions
// ————————————————————————————————————————————————————————————————————————————
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

export const WORKSPACE_PRESETS: Record<
	Exclude<PresetName, "custom">,
	WorkspacePresetFeatureFlags
> = {
	solo_therapist: {
		hasAssistants: false,
		hasMultipleChairs: false,
		hasDentalLab: false,
		hasInsuranceCoPay: false,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: false,
		isOmniRole: true,
		workspacePreset: "solo_therapist",
		onboardingCompleted: true,
		hasPayrollModule: false,
		hasMarketingModule: false,
		hasAnalyticsModule: false,
		hasInventoryModule: false,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	prosthodontist: {
		hasAssistants: true,
		hasMultipleChairs: false,
		hasDentalLab: true,
		hasInsuranceCoPay: false,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: false,
		isOmniRole: false,
		workspacePreset: "prosthodontist",
		onboardingCompleted: true,
		hasPayrollModule: false,
		hasMarketingModule: false,
		hasAnalyticsModule: false,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	pediatric: {
		hasAssistants: true,
		hasMultipleChairs: true,
		hasDentalLab: false,
		hasInsuranceCoPay: true,
		hasInstallments: false,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: true,
		isOmniRole: false,
		workspacePreset: "pediatric",
		onboardingCompleted: true,
		hasPayrollModule: true,
		hasMarketingModule: true,
		hasAnalyticsModule: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	orthodontic: {
		hasAssistants: true,
		hasMultipleChairs: false,
		hasDentalLab: true,
		hasInsuranceCoPay: true,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: false,
		isOmniRole: false,
		workspacePreset: "orthodontic",
		onboardingCompleted: true,
		hasPayrollModule: true,
		hasMarketingModule: false,
		hasAnalyticsModule: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	surgery_center: {
		hasAssistants: true,
		hasMultipleChairs: true,
		hasDentalLab: false,
		hasInsuranceCoPay: true,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: false,
		isOmniRole: false,
		workspacePreset: "surgery_center",
		onboardingCompleted: true,
		hasPayrollModule: true,
		hasMarketingModule: true,
		hasAnalyticsModule: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	implant_center: {
		hasAssistants: true,
		hasMultipleChairs: true,
		hasDentalLab: true,
		hasInsuranceCoPay: true,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: false,
		isOmniRole: false,
		workspacePreset: "implant_center",
		onboardingCompleted: true,
		hasPayrollModule: true,
		hasMarketingModule: true,
		hasAnalyticsModule: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	family_clinic: {
		hasAssistants: true,
		hasMultipleChairs: true,
		hasDentalLab: true,
		hasInsuranceCoPay: true,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: true,
		isOmniRole: false,
		workspacePreset: "family_clinic",
		onboardingCompleted: true,
		hasPayrollModule: true,
		hasMarketingModule: true,
		hasAnalyticsModule: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	multi_specialty: {
		hasAssistants: true,
		hasMultipleChairs: true,
		hasDentalLab: true,
		hasInsuranceCoPay: true,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: true,
		isOmniRole: false,
		workspacePreset: "multi_specialty",
		onboardingCompleted: true,
		hasPayrollModule: true,
		hasMarketingModule: true,
		hasAnalyticsModule: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
	enterprise: {
		hasAssistants: true,
		hasMultipleChairs: true,
		hasDentalLab: true,
		hasInsuranceCoPay: true,
		hasInstallments: true,
		hasOrthodontics: true,
		hasTasks: true,
		hasReclamations: true,
		hasPediatricMode: true,
		isOmniRole: false,
		workspacePreset: "enterprise",
		onboardingCompleted: true,
		hasPayrollModule: true,
		hasMarketingModule: true,
		hasAnalyticsModule: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
	},
};

// ————————————————————————————————————————————————————————————————————————————
// Demo seeding data per preset (uses actual schema field names: birthDate)
// ————————————————————————————————————————————————————————————————————————————
async function seedDemoDataForPreset(
	organizationId: string,
	preset: PresetName,
	numberOfChairs?: number,
) {
	// Safety: only seed if no patients exist yet for this org
	const existing = await db
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(eq(schema.patients.organizationId, organizationId))
		.limit(1);
	if (existing.length > 0) return; // don't double-seed

	const existingChairs = await db
		.select({ id: schema.clinicChairs.id })
		.from(schema.clinicChairs)
		.where(eq(schema.clinicChairs.organizationId, organizationId))
		.limit(1);
	if (existingChairs.length === 0) {
		const flags = WORKSPACE_PRESETS[preset as Exclude<PresetName, "custom">];
		const chairCount = numberOfChairs
			? numberOfChairs
			: flags?.hasMultipleChairs
				? 4
				: 1;
		const [clinic] = await db
			.select({ id: schema.clinics.id })
			.from(schema.clinics)
			.where(eq(schema.clinics.organizationId, organizationId))
			.limit(1);
		if (clinic) {
			const chairsToInsert = Array.from({ length: chairCount }).map((_, i) => ({
				organizationId,
				clinicId: clinic.id,
				name: chairCount === 1 ? "Главный кабинет" : `Кресло ${i + 1}`,
				status: "active",
			}));
			if (chairsToInsert.length > 0) {
				await db.insert(schema.clinicChairs).values(chairsToInsert);
			}
		}
	}

	if (preset === "solo_therapist") {
		const patientDefs = [
			{
				fullName: "Анна Петровна Соколова",
				birthDate: "1985-03-12",
				phone: "+79101234567",
			},
			{
				fullName: "Игорь Васильевич Ким",
				birthDate: "1978-07-22",
				phone: "+79201112233",
			},
			{
				fullName: "Ольга Сергеевна Шаль",
				birthDate: "1992-11-05",
				phone: "+79305556677",
			},
		];
		const patientsToInsert = patientDefs.map((p) => ({
			organizationId,
			fullName: p.fullName,
			birthDate: p.birthDate,
			phone: p.phone,
			isSynced: false,
			version: 1,
		}));

		const patients = await db
			.insert(schema.patients)
			.values(patientsToInsert)
			.returning({ id: schema.patients.id });

		if (patients.length > 0) {
			const visitsToInsert = patients.map((patient) => ({
				organizationId,
				patientId: patient.id,
				status: "signed" as const,
				complaint: "Боль в нижней правой челюсти на холодное",
				diagnosis: "Средний кариес 46 зуба",
				treatmentPlan:
					"Анестезия, препарирование, пломба светового отверждения (композит).",
				doctorSummary:
					"Проведено лечение среднего кариеса 46 зуба по протоколу.",
			}));
			await db.insert(schema.visits).values(visitsToInsert);

			const appointmentsToInsert = patients.map((patient) => ({
				organizationId,
				patientId: patient.id,
				status: "planned" as const,
				startsAt: new Date(Date.now() + 86400000),
				endsAt: new Date(Date.now() + 86400000 + 3600000),
				reason: "Лечение кариеса 47 зуба",
			}));
			await db.insert(schema.appointments).values(appointmentsToInsert);
		}
	}

	if (preset === "prosthodontist") {
		const patientDefs = [
			{
				fullName: "Виктор Михайлович Азаров",
				birthDate: "1960-05-18",
				phone: "+79401234567",
			},
			{
				fullName: "Наталья Ивановна Громова",
				birthDate: "1955-09-30",
				phone: "+79509876543",
			},
		];
		const patientsToInsert = patientDefs.map((p) => ({
			organizationId,
			fullName: p.fullName,
			birthDate: p.birthDate,
			phone: p.phone,
		}));

		const patients = await db
			.insert(schema.patients)
			.values(patientsToInsert)
			.returning({ id: schema.patients.id });

		if (patients.length > 0) {
			const visitsToInsert = patients.map((patient) => ({
				organizationId,
				patientId: patient.id,
				status: "draft" as const,
				complaint: "Отсутствует зуб, эстетический дефект",
				diagnosis: "Частичная вторичная адентия 24 зуба",
				treatmentPlan:
					"Снятие слепков. Изготовление коронки из диоксида циркония на имплантате 24.",
			}));
			await db.insert(schema.visits).values(visitsToInsert);

			const communicationTasksToInsert = patients.map((patient) => ({
				organizationId,
				patientId: patient.id,
				assignedRole: "doctor" as const,
				channel: "in_person" as const,
				intent: "general" as const,
				status: "queued" as const,
				priority: "normal" as const,
				dueAt: new Date(Date.now() + 86400000 * 5),
				title: "Изготовление циркониевой коронки",
				body: "Цвет A2, транслуцентный край. Отправлено в фрезерный центр.",
			}));
			await db
				.insert(schema.communicationTasks)
				.values(communicationTasksToInsert);

			const appointmentsToInsert = patients.map((patient) => ({
				organizationId,
				patientId: patient.id,
				status: "planned" as const,
				startsAt: new Date(Date.now() + 86400000 * 2),
				endsAt: new Date(Date.now() + 86400000 * 2 + 3600000),
				reason: "Примерка каркаса",
			}));
			await db.insert(schema.appointments).values(appointmentsToInsert);
		}
	}
}

// ————————————————————————————————————————————————————————————————————————————
// Route registration
// ————————————————————————————————————————————————————————————————————————————
/*
 * ЗДЕСЬ СТОЯЛ workspaceFeatureFlagsSchema (z.object на 28 признаков) и четыре
 * блока `schema: { body/params/response }`, где Zod-объекты передавались Fastify
 * напрямую. Удалено 2026-08-05: Fastify ждёт в этих полях JSON Schema и отдаёт её
 * в AJV и fast-json-stringify. Zod-объект туда не годится — у него есть метод
 * `.required`, а JSON Schema требует массив, — и сборка сериализатора падала:
 *
 *   FastifyError FST_ERR_SCH_SERIALIZATION_BUILD: Failed building the
 *   serialization schema for GET: /api/workspace/profile, due to error
 *   schema is invalid: data/required must be array
 *
 * Падало это не на запросе, а на `ready()`, то есть ВЕСЬ Fastify-экземпляр не
 * поднимался: любой тест и любой запуск сервера, доходящий до createDenteApiApp,
 * умирал на первом же inject. Zod-провайдера типов (fastify-type-provider-zod,
 * setValidatorCompiler/setSerializerCompiler) в проекте нет ни одного — искал по
 * всему apps/api.
 *
 * Проверка тела при этом не потеряна: оба POST-обработчика ниже разбирают тело
 * сами через workspaceProfileBodySchema.safeParse / workspacePresetBodySchema
 * .safeParse и отвечают 400 ValidationError — именно так, как этого требует
 * tests/routes/egiszVkBody.test.ts. Блоки schema дублировали эту проверку и
 * только ломали загрузку.
 */

export async function workspaceProfileRoutes(fastify: FastifyInstance) {
	/*
	 * GET /api/workspace/profile — какие модули включены у ЭТОЙ клиники.
	 *
	 * ЧТО БЫЛО. Здесь стоял литерал: девятнадцать признаков, почти все true, пресет
	 * "enterprise", onboardingCompleted true — одинаково для любой организации,
	 * независимо от того, что клиника выбрала в мастере первого запуска и в
	 * настройках. Модульность — сердце продукта (соло-врач не должен видеть склад,
	 * зарплаты и воронку обращений), и на сервере её не существовало.
	 *
	 * Клиент этого не показывал, потому что useWorkspaceProfile хранит выбор в
	 * localStorage. Стоило открыть программу на втором устройстве, в другом
	 * браузере или под другим сотрудником — и все модули снова включены.
	 *
	 * ЧТО СТАЛО. Признаки читаются из organizations.workspace_feature_flags.
	 * Незаполненное значение означает «клиника ещё не настраивалась» и отдаётся как
	 * прежние умолчания: так у существующих клиник ничего не меняется. Неизвестные
	 * ключи из базы отбрасываются, отсутствующие берутся из умолчаний — набор
	 * признаков растёт вместе с продуктом, и старая запись не должна ронять ответ.
	 */
	fastify.get(
		"/api/workspace/profile",
		{
			schema: {
				response: {
					200: { type: "object", additionalProperties: true },
					400: { type: "object", additionalProperties: true },
					401: { type: "object", additionalProperties: true },
					404: { type: "object", additionalProperties: true },
					500: { type: "object", additionalProperties: true },
				},
			},
		},
		async (req, reply) => {
			try {
				const organizationId = await resolveOrganizationId(req);
				if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

				const [organization] = await db
					.select({ flags: schema.organizations.workspaceFeatureFlags })
					.from(schema.organizations)
					.where(eq(schema.organizations.id, organizationId))
					.limit(1);

				return reply.send(workspaceFlagsFromStorage(organization?.flags));
			} catch (error) {
				console.error("[GET /api/workspace/profile] Error:", error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		}
	);

	// GET /api/workspace/chairs
	fastify.get(
		"/api/workspace/chairs",
		{
			schema: {
				response: {
					200: { type: "object", additionalProperties: true },
					400: { type: "object", additionalProperties: true },
					401: { type: "object", additionalProperties: true },
					404: { type: "object", additionalProperties: true },
					500: { type: "object", additionalProperties: true },
				},
			},
		},
		async (req, reply) => {
			try {
				const organizationId = await resolveOrganizationId(req);
				if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

				const chairs = await db
					.select({ id: schema.chairs.id, name: schema.chairs.name })
					.from(schema.chairs)
					.where(eq(schema.chairs.organizationId, organizationId))
					.orderBy(schema.chairs.name);

				return reply.send({ success: true, data: chairs });
			} catch (error) {
				console.error("[GET /api/workspace/chairs] Error:", error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		}
	);

	// POST /api/workspace/profile — save arbitrary flags
	fastify.post<{ Body: Partial<WorkspaceFeatureFlags> }>(
		"/api/workspace/profile",
		{
			schema: {
				response: {
					200: { type: "object", additionalProperties: true },
					400: { type: "object", additionalProperties: true },
					401: { type: "object", additionalProperties: true },
					404: { type: "object", additionalProperties: true },
					500: { type: "object", additionalProperties: true },
				},
			},
		},
		async (req, reply) => {
			try {
				const organizationId = await resolveOrganizationId(req);
				if (!organizationId)
					return reply.code(401).send({ error: "Unauthorized" });

			/*
			 * Order (AUTH-first DoD, same as diary/preset):
			 *   1) auth → 401
			 *   2) body safeParse → 400 ValidationError RU (before any DB)
			 *   3) org lookup → 404
			 *   4) merge + write
			 * Body BEFORE org: inject tests use a signed token whose org is not in DB;
			 * if lookup ran first, array/string bodies returned 404 and hid the Zod
			 * guard. Arrays are typeof object in JS — bare guard used to accept [].
			 *
			 * ЧТО БЫЛО. Здесь из тела разбирались семнадцать признаков — и не писался
			 * НИ ОДИН: `.set({ updatedAt: new Date() })`, после чего ответ { ok: true }.
			 * То есть «Сохранить» на вкладке «Модули» и выбор в мастере первого запуска
			 * уходили в пустоту, а программа отвечала, что всё сохранено.
			 *
			 * ЧТО СТАЛО. Признаки сливаются с уже сохранённым набором и пишутся в
			 * organizations.workspace_feature_flags. Слияние, а не замена: клиент
			 * присылает Partial (WorkspaceFeaturesSelector отправляет один
			 * переключённый признак), и замена целиком сбросила бы остальные к
			 * умолчаниям — то есть включила бы обратно всё, что клиника выключила.
			 *
			 * Тело проходит через workspaceFlagsFromStorage: неизвестные ключи в базу не
			 * попадают, а значения не того типа отбрасываются. Иначе одна строка вместо
			 * true легла бы в базу и вернулась на клиент, где признак читается как
			 * булев.
			 */
			// AUTH already passed. Non-object body (array/string/number) → 400 RU.
			// null/undefined → empty partial (no-op merge is valid gameplay).
			const rawBody = req.body;
			const bodyCandidate =
				rawBody === undefined || rawBody === null ? {} : rawBody;
			const parsedBody = workspaceProfileBodySchema.safeParse(bodyCandidate);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Проверьте тело запроса: нужен JSON-объект с признаками модулей клиники (не массив и не строка).",
				});
			}
			const incoming = parsedBody.data;

			const [existing] = await db
				.select({ flags: schema.organizations.workspaceFeatureFlags })
				.from(schema.organizations)
				.where(eq(schema.organizations.id, organizationId))
				.limit(1);
			if (!existing) {
				return reply.code(404).send({
					error: "OrganizationNotFound",
					message: "Клиника не найдена. Войдите в рабочий кабинет заново.",
				});
			}

			const merged = workspaceFlagsFromStorage({
				...workspaceFlagsFromStorage(existing.flags),
				...incoming,
			});

			await db
				.update(schema.organizations)
				.set({
					workspaceFeatureFlags: merged,
					updatedAt: new Date(),
				})
				.where(eq(schema.organizations.id, organizationId));

			// Возвращаем сохранённый набор: клиент видит, что именно легло в базу.
			return reply.send({ ok: true, ...merged });
			} catch (error) {
				console.error("[POST /api/workspace/profile] Error:", error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		}
	);

	// POST /api/workspace/preset/:name — apply preset + seed
	fastify.post<{
		Params: { name: string };
		Body?: { numberOfChairs?: number; hasPediatricMode?: boolean };
	}>(
		"/api/workspace/preset/:name",
		{
			schema: {
				response: {
					200: { type: "object", additionalProperties: true },
					400: { type: "object", additionalProperties: true },
					401: { type: "object", additionalProperties: true },
					404: { type: "object", additionalProperties: true },
					500: { type: "object", additionalProperties: true },
				},
			},
		},
		async (req, reply) => {
			try {
				const organizationId = await resolveOrganizationId(req);
				if (!organizationId) return reply.code(401).send({ error: "Unauthorized" });

		const presetName = req.params.name as PresetName;
		const flags =
			WORKSPACE_PRESETS[presetName as Exclude<PresetName, "custom">];
		if (!flags)
			return reply.code(400).send({ error: `Unknown preset: ${presetName}` });

		// Body optional: missing/undefined → empty overrides. Non-object / bad types → 400.
		const rawBody = req.body;
		const bodyCandidate =
			rawBody === undefined || rawBody === null ? {} : rawBody;
		const parsedBody = workspacePresetBodySchema.safeParse(bodyCandidate);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Тело запроса должно быть JSON-объектом с опциональными numberOfChairs (целое > 0) и hasPediatricMode (boolean).",
			});
		}

		const finalFlags = { ...flags };
		if (parsedBody.data.hasPediatricMode !== undefined) {
			finalFlags.hasPediatricMode = parsedBody.data.hasPediatricMode;
		}

		/*
		 * ЧТО БЫЛО. `.set({ ...finalFlags, updatedAt })` — признаки пресета
		 * раскладывались так, будто это КОЛОНКИ таблицы organizations. Колонок с
		 * такими именами нет; drizzle собирает SET только из известных колонок, а
		 * остальные ключи молча отбрасывает. То есть применение пресета не меняло
		 * ничего, кроме updatedAt, и отвечало { ok: true, preset, flags } — клиент
		 * видел выбранный пресет, база о нём не знала.
		 *
		 * Ошибку не поймали типы: значения WORKSPACE_PRESETS описаны свободно, и
		 * проверка типов на этом выражении проходит.
		 *
		 * Признаки складываются с уже сохранёнными: пресет задаёт не все, а
		 * незаданные не должны сбрасываться к умолчаниям. Имя пресета пишется тем же
		 * значением, что вернётся клиенту.
		 */
		const [existing] = await db
			.select({ flags: schema.organizations.workspaceFeatureFlags })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
		if (!existing) {
			return reply.code(404).send({
				error: "OrganizationNotFound",
				message: "Клиника не найдена. Войдите в рабочий кабинет заново.",
			});
		}
		const savedFlags = workspaceFlagsFromStorage({
			...workspaceFlagsFromStorage(existing.flags),
			...finalFlags,
			workspacePreset: presetName,
		});

		await db
			.update(schema.organizations)
			.set({ workspaceFeatureFlags: savedFlags, updatedAt: new Date() })
			.where(eq(schema.organizations.id, organizationId));

		// Async seeding — don't block response
		seedDemoDataForPreset(
			organizationId,
			presetName,
			parsedBody.data.numberOfChairs,
		).catch((e) => console.error("[workspace preset] seeding error:", e));

		// Отдаём то, что легло в базу, а не то, что было в справочнике пресетов.
		return reply.send({ ok: true, preset: presetName, flags: savedFlags });
			} catch (error) {
				console.error("[POST /api/workspace/preset/:name] Error:", error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		}
	);

	/*
	 * ЗДЕСЬ СТОЯЛ POST /api/workspace/onboarding/complete — 370 строк без единого
	 * писателя. УДАЛЁН, и вот чем он был опасен, пока лежал.
	 *
	 * КТО ЕГО ЗВАЛ. Никто. Его единственным клиентом был семишаговый мастер
	 * первого запуска — недостижимая копия живого мастера, удалённая вместе со
	 * своим поддеревом (разбор: apps/web/src/tests/panelsAreMounted.test.ts).
	 * После этого поиск по всему репозиторию не находил ни одного вызова: ни в
	 * apps/web, ни в скриптах, ни в смоук-прогонах. Живой мастер первого запуска
	 * (App.tsx) этого адреса не знает вовсе и никогда не знал.
	 *
	 * ПОЧЕМУ НЕЛЬЗЯ БЫЛО ОСТАВИТЬ КАК ЕСТЬ. Маршрут был зарегистрирован и доступен
	 * по токену кабинета, а его тело делало три вещи, каждая из которых портит
	 * настроенную клинику:
	 *
	 *   1. `name: payload.name || payload.legal?.name || "Клиника DENTE"`.
	 *      Поля `name` в нагрузке не было ни у одного клиента, а `legal` — это
	 *      { inn, ogrn, address } без имени. То есть УСПЕШНЫЙ вызов переименовывал
	 *      клинику в «Клиника DENTE».
	 *
	 *   2. `clinicSchedule: { workHours, specs }` — ЗАМЕНА всей колонки
	 *      organizations.clinic_schedule устаревшей раскладкой. Достижимый экран
	 *      настроек пишет туда другой формат
	 *      ({ workdayStart, workdayEnd, workingDays, appointmentBufferMinutes },
	 *      db/settingsQuery.ts), и именно его читает публичный виджет записи
	 *      (routes/publicBooking.ts). Вызов маршрута стирал график клиники, а
	 *      чтение настроек не разбирает старую раскладку вовсе
	 *      (clinicScheduleDefaultsSchema) — то есть клиника с графиком 8–20 молча
	 *      возвращалась к запасу 09:00–18:00 и теряла утренние и вечерние слоты в
	 *      публичной записи. Ровно тот дефект, который только что починен и закрыт
	 *      прогоном tests/routes/publicBookingWorkHoursProof.ts: маршрут был
	 *      кнопкой «отменить эту починку».
	 *
	 *   3. `catch` транзакции писал в журнал, обновлял один updatedAt и отвечал
	 *      `{ success: true }`. Плюс `setTimeout` на 1,5 секунды «для красивого
	 *      экрана загрузки» — задержка сервера ради анимации клиента.
	 *
	 * ЗАМЕНА ПОКАЗАНА ПО КАЖДОЙ ЕГО ЧАСТИ — без этого удалять было нельзя:
	 *   название, ИНН, ОГРН, юридический адрес → Настройки → «Клиника»
	 *     (updateClinicProfileInDb, routes/settings.ts);
	 *   график клиники → Настройки → «Клиника», начало и окончание рабочего дня и
	 *     отметки рабочих дней (db/settingsQuery.ts, единственный писатель колонки
	 *     после этого удаления);
	 *   режим клиники → Настройки → «Клиника», выбор режима прямо
	 *     (routes/settings.ts). Маршрут ВЫВОДИЛ режим из числа кресел, и это была
	 *     догадка: про филиалы он не спрашивал вовсе. Ручной выбор точнее;
	 *   сотрудники → Настройки → «Сотрудники» (POST /api/settings/staff), включая
	 *     телефон; ставка врача — на экране выплат
	 *     (PUT /api/settings/staff/:staffId/commission);
	 *   кресла → Настройки → «Клиника», «Кресла и кабинеты»
	 *     (POST /api/settings/chairs), с названием и графиком на каждое кресло
	 *     против безымянного «Кресло N» здесь;
	 *   прайс и шаблоны приёма → у обоих появился достижимый писатель
	 *     (вкладка «Прайс» и раздел протоколов). Засев жёстко зашитым списком
	 *     услуг здесь игнорировал выбор клиники: в асинхронной части стояло
	 *     `const specs = ["therapy", "surgery"]` вместо присланного набора.
	 *
	 * Вместе с маршрутом удалены clinicModeFromOnboarding и OnboardingScale: после
	 * снятия единственного вызова это была бы протестированная мёртвая функция.
	 * Инвариант «у колонки clinic_schedule один писатель и один формат» закреплён
	 * прогоном tests/clinicScheduleSingleWriter.test.ts — иначе следующий писатель
	 * повторит пункт 2.
	 */
}
