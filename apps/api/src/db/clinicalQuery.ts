import type {
	ClinicalRule,
	ClinicalRuleEvaluation,
	ClinicalRuleEvaluationInput,
	ClinicalRuleEvaluationResponse,
	CreateClinicalRuleInput,
	UpdateClinicalRuleInput,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import {
	createClinicalRule as createClinicalRuleInMemory,
	clinicalRules as inMemoryClinicalRules,
	treatmentPlanItems as inMemoryTreatmentPlanItems,
	updateClinicalRule as updateClinicalRuleInMemory,
} from "../sampleData.js";
import { db, dbRaw, type TenantDb, transactionStorage } from "./client.js";
import { withTenantCtx } from "./rls.js";
import * as schema from "./schema.js";

function useInMemory() {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

function hasDirectDbMocks(): boolean {
	return (
		Object.hasOwn(dbRaw, "select") ||
		Object.hasOwn(dbRaw, "insert") ||
		Object.hasOwn(dbRaw, "update") ||
		Object.hasOwn(dbRaw, "delete")
	);
}

async function withClinicalTenantExecutor<T>(
	organizationId: string,
	tx: TenantDb | undefined,
	fn: (executor: TenantDb) => Promise<T>,
): Promise<T> {
	if (tx) return fn(tx);
	const activeTx = transactionStorage.getStore();
	if (activeTx) return fn(activeTx);
	if (hasDirectDbMocks()) return fn(db);
	return withTenantCtx(organizationId, fn);
}

function parseJsonArray(jsonString: string | null | undefined): string[] {
	if (!jsonString) return [];
	try {
		const parsed = JSON.parse(jsonString);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function mapClinicalRule(
	record: typeof schema.clinicalRules.$inferSelect,
): ClinicalRule {
	return {
		id: record.id,
		organizationId: record.organizationId,
		title: record.title,
		category: record.category,
		specialty: record.specialty,
		action: record.action,
		severity: record.severity,
		ownerRole: record.ownerRole,
		triggerServiceIds: parseJsonArray(record.triggerServiceIdsJson),
		requiredServiceIds: parseJsonArray(record.requiredServiceIdsJson),
		requiresCompletedServiceIds: parseJsonArray(
			record.requiresCompletedServiceIdsJson,
		),
		blockedServiceIds: parseJsonArray(record.blockedServiceIdsJson),
		condition: record.condition,
		warningText: record.warningText,
		patientText: record.patientText,
		active: record.isActive,
	};
}

export async function getClinicalRules(
	organizationId: string,
	tx?: TenantDb,
): Promise<ClinicalRule[]> {
	if (useInMemory()) {
		return inMemoryClinicalRules.filter(
			(rule) => rule.organizationId === organizationId,
		);
	}
	const records = await withClinicalTenantExecutor(organizationId, tx, (executor) =>
		executor
			.select()
			.from(schema.clinicalRules)
			.where(eq(schema.clinicalRules.organizationId, organizationId)),
	);
	return records.map(mapClinicalRule);
}

async function getClinicalRuleById(
	organizationId: string,
	ruleId: string,
	tx?: TenantDb,
): Promise<ClinicalRule | null> {
	if (useInMemory()) {
		return (
			inMemoryClinicalRules.find(
				(r) => r.id === ruleId && r.organizationId === organizationId,
			) ?? null
		);
	}
	const [record] = await withClinicalTenantExecutor(organizationId, tx, (executor) =>
		executor
			.select()
			.from(schema.clinicalRules)
			.where(
				and(
					eq(schema.clinicalRules.organizationId, organizationId),
					eq(schema.clinicalRules.id, ruleId),
				),
			)
			.limit(1),
	);
	return record ? mapClinicalRule(record) : null;
}

function summarizeClinicalEvaluations(
	evaluations: ClinicalRuleEvaluation[],
	activeRulesCount: number,
) {
	const unresolved = evaluations.filter((evaluation) => !evaluation.resolved);
	const requiredServiceIds = new Set(
		unresolved.flatMap((evaluation) => evaluation.missingRequiredServiceIds),
	);

	return {
		activeRules: activeRulesCount,
		evaluatedRules: evaluations.length,
		unresolved: unresolved.length,
		blockers: unresolved.filter(
			(evaluation) => evaluation.severity === "blocker",
		).length,
		warnings: unresolved.filter(
			(evaluation) => evaluation.severity === "warning",
		).length,
		requiredServices: requiredServiceIds.size,
		coveredRules: evaluations.filter((evaluation) => evaluation.resolved)
			.length,
	};
}

export async function evaluateClinicalRulesInDb(
	organizationId: string,
	input: ClinicalRuleEvaluationInput,
	tx?: TenantDb,
): Promise<ClinicalRuleEvaluationResponse> {
	const rules = await getClinicalRules(organizationId, tx);
	const serviceIds = new Set(input.serviceIds);
	const completedServiceIds = new Set(input.completedServiceIds);
	const activeRulesCount = rules.filter((r) => r.active).length;

	const evaluations = rules.flatMap((rule): ClinicalRuleEvaluation[] => {
		if (!rule.active) return [];

		const triggeredByServiceIds =
			rule.triggerServiceIds.length > 0
				? rule.triggerServiceIds.filter((serviceId) =>
						serviceIds.has(serviceId),
					)
				: Array.from(serviceIds);
		if (!triggeredByServiceIds.length) return [];

		const missingRequiredServiceIds = rule.requiredServiceIds.filter(
			(serviceId) => !serviceIds.has(serviceId),
		);
		const missingCompletedServiceIds = rule.requiresCompletedServiceIds.filter(
			(serviceId) => !completedServiceIds.has(serviceId),
		);
		const blockedServiceIds = rule.blockedServiceIds.filter((serviceId) =>
			serviceIds.has(serviceId),
		);

		const hasBlockingCondition =
			missingRequiredServiceIds.length > 0 ||
			missingCompletedServiceIds.length > 0 ||
			blockedServiceIds.length > 0;

		let resolved = !hasBlockingCondition;
		const activeBlockedServiceIds = hasBlockingCondition
			? blockedServiceIds
			: [];

		if (rule.action === "show_warning" || rule.action === "schedule_followup") {
			resolved = false;
		}

		return [
			{
				id: `${input.scenarioId ?? "plan"}-${rule.id}`,
				ruleId: rule.id,
				organizationId: rule.organizationId,
				patientId: input.patientId,
				scenarioId: input.scenarioId ?? null,
				title: rule.title,
				action: rule.action,
				severity: rule.severity,
				ownerRole: rule.ownerRole,
				triggeredByServiceIds,
				missingRequiredServiceIds,
				missingCompletedServiceIds,
				blockedServiceIds: activeBlockedServiceIds,
				message: rule.warningText,
				patientMessage: rule.patientText,
				resolved,
			},
		];
	});

	return {
		evaluations,
		summary: summarizeClinicalEvaluations(evaluations, activeRulesCount),
	};
}

export async function createClinicalRuleInDb(
	organizationId: string,
	input: CreateClinicalRuleInput,
	tx?: TenantDb,
): Promise<ClinicalRule> {
	if (useInMemory()) {
		return createClinicalRuleInMemory(input);
	}
	const [record] = await withClinicalTenantExecutor(organizationId, tx, (executor) =>
		executor
			.insert(schema.clinicalRules)
			.values({
				organizationId,
				title: input.title,
				category: input.category,
				specialty: input.specialty,
				action: input.action,
				severity: input.severity,
				ownerRole: input.ownerRole,
				triggerServiceIdsJson: JSON.stringify(input.triggerServiceIds || []),
				requiredServiceIdsJson: JSON.stringify(input.requiredServiceIds || []),
				requiresCompletedServiceIdsJson: JSON.stringify(
					input.requiresCompletedServiceIds || [],
				),
				blockedServiceIdsJson: JSON.stringify(input.blockedServiceIds || []),
				condition: input.condition || null,
				warningText: input.warningText || "",
				patientText: input.patientText || "",
				isActive: input.active !== undefined ? input.active : true,
			})
			.returning(),
	);

	if (!record) {
		throw new Error("Не удалось создать клиническое правило");
	}

	return mapClinicalRule(record);
}

export async function updateClinicalRuleInDb(
	organizationId: string,
	input: UpdateClinicalRuleInput,
	tx?: TenantDb,
): Promise<ClinicalRule> {
	if (useInMemory()) {
		return updateClinicalRuleInMemory(input);
	}
	return withClinicalTenantExecutor(organizationId, tx, async (executor) => {
		const existing = await getClinicalRuleById(organizationId, input.id, executor);
		if (!existing) {
			throw new Error("Правило не найдено");
		}

		const [record] = await executor
			.update(schema.clinicalRules)
			.set({
				title: input.title ?? existing.title,
				category: input.category ?? existing.category,
				specialty: input.specialty ?? existing.specialty,
				action: input.action ?? existing.action,
				severity: input.severity ?? existing.severity,
				ownerRole: input.ownerRole ?? existing.ownerRole,
				triggerServiceIdsJson: input.triggerServiceIds
					? JSON.stringify(input.triggerServiceIds)
					: JSON.stringify(existing.triggerServiceIds),
				requiredServiceIdsJson: input.requiredServiceIds
					? JSON.stringify(input.requiredServiceIds)
					: JSON.stringify(existing.requiredServiceIds),
				requiresCompletedServiceIdsJson: input.requiresCompletedServiceIds
					? JSON.stringify(input.requiresCompletedServiceIds)
					: JSON.stringify(existing.requiresCompletedServiceIds),
				blockedServiceIdsJson: input.blockedServiceIds
					? JSON.stringify(input.blockedServiceIds)
					: JSON.stringify(existing.blockedServiceIds),
				condition:
					input.condition !== undefined ? input.condition : existing.condition,
				warningText: input.warningText ?? existing.warningText,
				patientText: input.patientText ?? existing.patientText,
				isActive: input.active ?? existing.active,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(schema.clinicalRules.organizationId, organizationId),
					eq(schema.clinicalRules.id, input.id),
				),
			)
			.returning();

		if (!record) {
			throw new Error("Не удалось обновить клиническое правило");
		}

		return mapClinicalRule(record);
	});
}

/**
 * Удаление клинического правила.
 *
 * БЫЛО: этой функции не существовало — как и маршрута DELETE. Кнопка «удалить»
 * в настройках правил (apps/web/src/components/settings/SettingsRulesTab.tsx:581)
 * звала DELETE /api/clinical/rules/:ruleId, сервер отвечал «Route not found», и
 * правило оставалось в проверке противопоказаний навсегда: второго способа
 * убрать правило в системе нет.
 *
 * Удаление именно жёсткое, а не снятие isActive: выключение — это отдельная
 * кнопка рядом (SettingsRulesTab.tsx:563), она ходит в PATCH и уже работает.
 * Если бы «удалить» тоже лишь снимало флаг, две кнопки делали бы одно и то же,
 * а список правил разрастался бы без предела. Сирот удаление не оставляет: на
 * clinical_rules не ссылается ни одна таблица (db/schema.ts:499).
 *
 * Организация входит в WHERE вместе с идентификатором, одним запросом. Фильтр
 * только по id позволил бы одной клинике удалить правило другой — тот самый
 * дефект, что записан в routes/clinical.ts про редактирование чужого правила.
 * Ответ одинаков и для несуществующего правила, и для чужого: подтверждать
 * существование правила чужой клиники нельзя.
 */
export async function deleteClinicalRuleInDb(
	organizationId: string,
	ruleId: string,
	tx?: TenantDb,
): Promise<boolean> {
	if (useInMemory()) {
		const index = inMemoryClinicalRules.findIndex(
			(rule) => rule.id === ruleId && rule.organizationId === organizationId,
		);
		if (index < 0) return false;
		inMemoryClinicalRules.splice(index, 1);
		return true;
	}

	const deleted = await withClinicalTenantExecutor(organizationId, tx, (executor) =>
		executor
			.delete(schema.clinicalRules)
			.where(
				and(
					eq(schema.clinicalRules.organizationId, organizationId),
					eq(schema.clinicalRules.id, ruleId),
				),
			)
			.returning({ id: schema.clinicalRules.id }),
	);

	return deleted.length > 0;
}

export async function getTreatmentPlanItemsForPatient(
	organizationId: string,
	patientId: string,
	tx?: TenantDb,
) {
	if (useInMemory()) {
		return inMemoryTreatmentPlanItems.filter(
			(item) => item.organizationId === organizationId && item.patientId === patientId,
		);
	}

	return withClinicalTenantExecutor(organizationId, tx, (executor) =>
		executor
			.select()
			.from(schema.treatmentItems)
			.where(
				and(
					eq(schema.treatmentItems.organizationId, organizationId),
					eq(schema.treatmentItems.patientId, patientId),
				),
			),
	);
}
