/**
 * TelegramPostOpCarePipeline.ts
 *
 * Канонический фасад 4-этапного пайплайна послеоперационного теле-мониторинга DENTE.
 * Декомпозированная реализация находится в `./postOpCare/`.
 */

export * from "./postOpCare/index.js";
export { TelegramPostOpCarePipeline } from "./postOpCare/postOpPipelineCore.js";
export type {
	HandlePostOpCallbackParams,
	HandlePostOpCallbackResult,
	PostOpCarePlan,
	PostOpStage,
	PostOpStageItem,
	SchedulePostOpCareParams,
	SchedulePostVisitSurveyParams,
	SchedulePostVisitSurveyResult,
	SymptomTriageEvaluationResult,
} from "./postOpCare/types.js";
