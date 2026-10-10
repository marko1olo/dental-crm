/**
 * useTreatmentPlanLogic.ts — канонический тонкий фасад хука бизнес-логики и состояния
 * комплексного плана лечения DENTE CRM.
 * Декомпозирован на модульные слои в `./planLogicModules/` строго по Мандату 8b (лимит фасада <= 50 строк).
 */

export {
	useTreatmentPlanLogic,
	type LabOrderPrefillContext,
	type UseTreatmentPlanLogicProps,
} from "./planLogicModules";
export * from "./planLogicModules";
