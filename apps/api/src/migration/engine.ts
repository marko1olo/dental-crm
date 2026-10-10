/**
 * Управляющий движок переноса данных.
 * Канонический тонкий фасад модуля migration/engineModules.
 */

export type { EngineInput, RollbackOutcome } from "./engineModules/types.js";
export {
	analyzeSource,
	listQuarantine,
	listRuns,
	rollbackRun,
	runMigration,
} from "./engineModules/index.js";
export * from "./engineModules/index.js";
