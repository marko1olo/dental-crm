/**
 * @file clinicalRules.ts
 * @description Layer 2: Clinical rules definitions, evaluation engine, rule mutations.
 */
import { randomUUID } from "node:crypto";
import { inMemoryDomainState } from "./domainState.js";
import { recordAuditEvent } from "./audit.js";


import type {
	ClinicalRule,
	ClinicalRuleEvaluation,
	ClinicalRuleEvaluationInput,
	ClinicalRuleEvaluationResponse,
	ClinicalRuleSummary,
	CreateClinicalRuleInput,
	UpdateClinicalRuleInput,
} from "@dental/shared";
import { createClinicalRuleSchema } from "@dental/shared";
import { serviceCatalog, serviceCatalogMap } from "./priceList.js";
import { organizationId } from "./fixtureIds.js";
import { persistMutableState } from "./stateNotifier.js";
import { type DomainState, nullableTrimmed } from "./types.js";

export const clinicalRules: ClinicalRule[] = [
	{
		id: "rule-caries-requires-image",
		organizationId,
		title: "Снимок перед лечением глубокого кариеса",
		category: "imaging",
		specialty: "therapist",
		action: "add_required_service",
		severity: "info",
		ownerRole: "doctor",
		triggerServiceIds: ["svc-therapy-caries"],
		requiredServiceIds: [],
		requiresCompletedServiceIds: [],
		blockedServiceIds: [],
		condition:
			"При глубоком кариесе рекомендуется прицельный снимок или визиография.",
		warningText:
			"Рекомендуется рентген-контроль глубины поражения твердых тканей.",
		patientText:
			"Снимок помогает врачу оценить состояние корня и исключить скрытые очаги.",
		active: true,
	},
	{
		id: "rule-caries-requires-cofferdam",
		organizationId,
		title: "Изоляция при терапевтическом лечении",
		category: "therapy",
		specialty: "therapist",
		action: "add_required_service",
		severity: "warning",
		ownerRole: "assistant",
		triggerServiceIds: ["svc-therapy-caries"],
		requiredServiceIds: ["svc-therapy-cofferdam"],
		requiresCompletedServiceIds: [],
		blockedServiceIds: [],
		condition:
			"Кариес, эндодонтия и адгезивные реставрации требуют сухого поля.",
		warningText:
			"Добавьте коффердам или зафиксируйте клиническую причину отказа.",
		patientText:
			"Изоляция повышает качество пломбы и снижает риск повторного лечения.",
		active: true,
	},
	{
		id: "rule-crown-after-therapy",
		organizationId,
		title: "Ортопедия только после закрытия активной терапии",
		category: "prosthetics",
		specialty: "orthopedist",
		action: "schedule_followup",
		severity: "warning",
		ownerRole: "doctor",
		triggerServiceIds: ["svc-prosthetics-crown"],
		requiredServiceIds: [],
		requiresCompletedServiceIds: ["svc-therapy-caries"],
		blockedServiceIds: [],
		condition:
			"Коронка в плане допустима только после закрытия активного очага и снимка.",
		warningText:
			"Рекомендуется завершить терапию опорного зуба перед постоянным протезированием.",
		patientText:
			"Сначала нужно убрать воспаление и восстановить основание, потом защищать зуб коронкой.",
		active: true,
	},
	{
		id: "rule-maintenance-after-hygiene",
		organizationId,
		title: "Recall после гигиены",
		category: "hygiene",
		specialty: "hygienist",
		action: "schedule_followup",
		severity: "info",
		ownerRole: "administrator",
		triggerServiceIds: ["svc-hygiene-pro"],
		requiredServiceIds: [],
		requiresCompletedServiceIds: [],
		blockedServiceIds: [],
		condition:
			"После гигиены пациент должен получить повторный контакт через 6 месяцев.",
		warningText:
			"Поставьте recall-задачу, чтобы удержать профилактику и гарантийный контроль.",
		patientText:
			"Профилактический контроль дешевле повторного лечения и помогает сохранить результат.",
		active: true,
	},
];


function summarizeClinicalEvaluations(
	evaluations: ClinicalRuleEvaluation[],
	state: DomainState = inMemoryDomainState,
): ClinicalRuleSummary {
	const { clinicalRules } = state;
	const unresolved = evaluations.filter((evaluation) => !evaluation.resolved);
	const requiredServiceIds = new Set(
		unresolved.flatMap((evaluation) => evaluation.missingRequiredServiceIds),
	);

	return {
		activeRules: clinicalRules.filter((rule) => rule.active).length,
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

export function evaluateClinicalRules(
	input: ClinicalRuleEvaluationInput,
	state: DomainState = inMemoryDomainState,
): ClinicalRuleEvaluationResponse {
	const { clinicalRules } = state;
	const serviceIds = new Set(input.serviceIds);
	const completedServiceIds = new Set(input.completedServiceIds);
	const evaluations = clinicalRules.flatMap(
		(rule): ClinicalRuleEvaluation[] => {
			if (!rule.active) return [];

			const triggeredByServiceIds = rule.triggerServiceIds.filter((serviceId) =>
				serviceIds.has(serviceId),
			);
			if (!triggeredByServiceIds.length) return [];

			const missingRequiredServiceIds = rule.requiredServiceIds.filter(
				(serviceId) => !serviceIds.has(serviceId),
			);
			const missingCompletedServiceIds =
				rule.requiresCompletedServiceIds.filter(
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

			if (
				rule.action === "show_warning" ||
				rule.action === "schedule_followup"
			) {
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
		},
	);

	return {
		evaluations,
		summary: summarizeClinicalEvaluations(evaluations),
	};
}

/**
 * Клинические правила считаются по ПАЦИЕНТУ, поэтому пациент — аргумент.
 *
 * БЫЛО: `activeVisit.patientId` прямо внутри. Из-за этого правила нельзя было
 * посчитать ни для одного приёма, кроме «последнего черновика клиники»: карточка
 * закрытия конкретного приёма получала предупреждения ЧУЖОГО пациента.
 */
export function buildClinicalRuleEvaluations(
	patientId: string,
	state: DomainState = inMemoryDomainState,
): ClinicalRuleEvaluation[] {
	const { treatmentPlanItems, treatmentPlanScenarios } = state;
	const patientPlanItems = treatmentPlanItems.filter(
		(item) => item.patientId === patientId && item.status !== "cancelled",
	);
	const completedServiceIds = patientPlanItems
		.filter((item) => item.status === "completed")
		.map((item) => item.serviceId);
	const activeScenarioServiceIds = treatmentPlanScenarios
		.filter((scenario) => scenario.patientId === patientId && scenario.active)
		.flatMap((scenario) => scenario.includedServiceIds);
	const serviceIds = Array.from(
		new Set([
			...patientPlanItems.map((item) => item.serviceId),
			...activeScenarioServiceIds,
		]),
	);

	return evaluateClinicalRules(
		{
			patientId,
			serviceIds,
			completedServiceIds,
		},
		state,
	).evaluations;
}

export function buildClinicalRuleSummary(
	patientId: string,
	state: DomainState = inMemoryDomainState,
): ClinicalRuleSummary {
	return summarizeClinicalEvaluations(
		buildClinicalRuleEvaluations(patientId, state),
	);
}

function normalizedClinicalRuleServiceIds(values: string[]): string[] {
	return Array.from(
		new Set(values.map((value) => value.trim()).filter(Boolean)),
	).slice(0, 80);
}

export function createClinicalRule(
	input: CreateClinicalRuleInput,
): ClinicalRule {
	const normalizedInput = createClinicalRuleSchema.parse(input);
	const rule: ClinicalRule = {
		id: `rule-${randomUUID()}`,
		organizationId,
		title: normalizedInput.title,
		category: normalizedInput.category,
		specialty: normalizedInput.specialty,
		action: normalizedInput.action,
		severity: normalizedInput.severity,
		ownerRole: normalizedInput.ownerRole,
		triggerServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.triggerServiceIds,
		),
		requiredServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.requiredServiceIds,
		),
		requiresCompletedServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.requiresCompletedServiceIds,
		),
		blockedServiceIds: normalizedClinicalRuleServiceIds(
			normalizedInput.blockedServiceIds,
		),
		condition: nullableTrimmed(normalizedInput.condition),
		warningText: normalizedInput.warningText,
		patientText: normalizedInput.patientText,
		active: normalizedInput.active,
	};

	clinicalRules.unshift(rule);
	recordAuditEvent({
		entityType: "clinical_rule",
		entityId: rule.id,
		action: "clinical_rule_created",
		reason: `${rule.title} добавлено в библиотеку клинических правил.`,
	});
	return rule;
}

export function updateClinicalRule(
	input: UpdateClinicalRuleInput,
): ClinicalRule {
	const rule = clinicalRules.find((item) => item.id === input.id);
	if (!rule) {
		throw new Error("Клиническое правило не найдено");
	}

	const normalizedInput = createClinicalRuleSchema.parse({
		title: input.title ?? rule.title,
		category: input.category ?? rule.category,
		specialty: input.specialty ?? rule.specialty,
		action: input.action ?? rule.action,
		severity: input.severity ?? rule.severity,
		ownerRole: input.ownerRole ?? rule.ownerRole,
		triggerServiceIds: input.triggerServiceIds ?? rule.triggerServiceIds,
		requiredServiceIds: input.requiredServiceIds ?? rule.requiredServiceIds,
		requiresCompletedServiceIds:
			input.requiresCompletedServiceIds ?? rule.requiresCompletedServiceIds,
		blockedServiceIds: input.blockedServiceIds ?? rule.blockedServiceIds,
		condition: input.condition !== undefined ? input.condition : rule.condition,
		warningText: input.warningText ?? rule.warningText,
		patientText: input.patientText ?? rule.patientText,
		active: input.active ?? rule.active,
	});

	rule.title = normalizedInput.title;
	rule.category = normalizedInput.category;
	rule.specialty = normalizedInput.specialty;
	rule.action = normalizedInput.action;
	rule.severity = normalizedInput.severity;
	rule.ownerRole = normalizedInput.ownerRole;
	rule.triggerServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.triggerServiceIds,
	);
	rule.requiredServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.requiredServiceIds,
	);
	rule.requiresCompletedServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.requiresCompletedServiceIds,
	);
	rule.blockedServiceIds = normalizedClinicalRuleServiceIds(
		normalizedInput.blockedServiceIds,
	);
	rule.condition = nullableTrimmed(normalizedInput.condition);
	rule.warningText = normalizedInput.warningText;
	rule.patientText = normalizedInput.patientText;
	rule.active = normalizedInput.active;

	recordAuditEvent({
		entityType: "clinical_rule",
		entityId: rule.id,
		action: "clinical_rule_updated",
		reason: `${rule.title} изменено в настройках клиники.`,
	});
	return rule;
}
