/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Visit Completion & Automated Estimate Facade
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Фасадный оркестратор клинического воркфлоу визита (Мандат 8e / Анти-монолит <= 250 строк):
 * - Реэкспорт типов шагов приёма, сметы и смарт-протоколов из workflowModules/clinicalWorkflowTypes
 * - Валидация этапов с мягким фокусом из workflowModules/clinicalWorkflowStepValidator
 * - Движок расчёта сметы, 54-ФЗ и переходов из workflowModules/clinicalWorkflowTransitionEngine
 * - Управление сессиями кресел из doctorChairSessions
 */

export type {
	ProcedureCategory,
	ClinicalEstimateItem,
	ClinicalVisitCompletionInput,
	ClinicalVisitStatus,
	ClinicalVisitCompletionResult,
	StandardPriceItem,
	AbortOrRescheduleVisitInput,
	ChairsideSmartProtocolKey,
	ChairsideSmartProtocolResult,
	ClinicalWorkflowStep,
	ClinicalWorkflowStepValidationResult,
} from "./workflowModules/clinicalWorkflowTypes";

export {
	CHAIRSIDE_SMART_PROTOCOL_KEYS,
} from "./workflowModules/clinicalWorkflowTypes";

export {
	CLINICAL_DEFAULT_VALUES,
	validateClinicalWorkflowStep,
	executeSoftFocusGuidance,
} from "./workflowModules/clinicalWorkflowStepValidator";

export {
	CLINICAL_STANDARD_PRICE_CATALOG,
	extractProceduresFromDiary,
	completeClinicalVisitAndAssembleEstimate,
	abortOrRescheduleVisit,
	buildChairsideSmartProtocol,
	executeWorkflowStepTransition,
} from "./workflowModules/clinicalWorkflowTransitionEngine";

export * from "./doctorChairSessions";
