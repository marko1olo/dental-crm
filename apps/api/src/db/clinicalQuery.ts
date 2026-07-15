import { randomUUID } from "node:crypto";
import type {
	ClinicalRule,
	ClinicalRuleEvaluation,
	ClinicalRuleEvaluationInput,
	ClinicalRuleEvaluationResponse,
	CreateClinicalRuleInput,
	UpdateClinicalRuleInput,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import { getDefaultOrganizationId } from "./pricelistQuery.js";
import * as schema from "./schema.js";

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
		category: record.category as any,
		specialty: record.specialty as any,
		action: record.action as any,
		severity: record.severity as any,
		ownerRole: record.ownerRole as any,
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
): Promise<ClinicalRule[]> {
	const records = await db
		.select()
		.from(schema.clinicalRules)
		.where(eq(schema.clinicalRules.organizationId, organizationId));
	return records.map(mapClinicalRule);
}

export async function getClinicalRuleById(
	organizationId: string,
	ruleId: string,
): Promise<ClinicalRule | null> {
	const [record] = await db
		.select()
		.from(schema.clinicalRules)
		.where(
			and(
				eq(schema.clinicalRules.organizationId, organizationId),
				eq(schema.clinicalRules.id, ruleId),
			),
		)
		.limit(1);
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
): Promise<ClinicalRuleEvaluationResponse> {
	const rules = await getClinicalRules(organizationId);
	const serviceIds = new Set(input.serviceIds);
	const completedServiceIds = new Set(input.completedServiceIds);
	const activeRulesCount = rules.filter((r) => r.active).length;

	const evaluations = rules.flatMap((rule): ClinicalRuleEvaluation[] => {
		if (!rule.active) return [];

		const triggeredByServiceIds = rule.triggerServiceIds.filter((serviceId) =>
			serviceIds.has(serviceId),
		);
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

		let resolved =
			missingRequiredServiceIds.length === 0 &&
			missingCompletedServiceIds.length === 0;
		let activeBlockedServiceIds = blockedServiceIds;

		if (rule.action === "block_service") {
			const hasBlockingCondition =
				missingCompletedServiceIds.length > 0 ||
				(rule.requiresCompletedServiceIds.length === 0 &&
					blockedServiceIds.length > 0);
			resolved = !hasBlockingCondition;
			activeBlockedServiceIds = hasBlockingCondition ? blockedServiceIds : [];
		}

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
				ownerRole: rule.ownerRole as any,
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
): Promise<ClinicalRule> {
	const [record] = await db
		.insert(schema.clinicalRules)
		.values({
			organizationId,
			title: input.title,
			category: input.category as any,
			specialty: input.specialty as any,
			action: input.action as any,
			severity: input.severity as any,
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
		.returning();

	if (!record) {
		throw new Error("Failed to create clinical rule");
	}

	return mapClinicalRule(record);
}

export async function updateClinicalRuleInDb(
	organizationId: string,
	input: UpdateClinicalRuleInput,
): Promise<ClinicalRule> {
	const existing = await getClinicalRuleById(organizationId, input.id);
	if (!existing) {
		throw new Error("Правило не найдено");
	}

	const [record] = await db
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
		throw new Error("Failed to update clinical rule");
	}

	return mapClinicalRule(record);
}

export async function getTreatmentPlanItemsForPatient(
	organizationId: string,
	patientId: string,
) {
	return await db
		.select()
		.from(schema.treatmentItems)
		.where(
			and(
				eq(schema.treatmentItems.organizationId, organizationId),
				eq(schema.treatmentItems.patientId, patientId),
			),
		);
}
