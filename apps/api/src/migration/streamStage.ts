/**
 * Потоковое чтение источника: строки выдаются партиями, файл целиком в память
 * не поднимается. Канонический тонкий фасад модуля migration/streamStageModules.
 */

export type {
	DbfField,
	DbfMeta,
	DetectSourceShapeInput,
	RowBatch,
	SourceShape,
	StreamDbfBatch,
	StreamDelimitedBatch,
	StreamSourceRowsInput,
} from "./streamStageModules/types.js";
export {
	detectSourceShape,
	streamSourceRows,
} from "./streamStageModules/stagePipeline.js";
export * from "./streamStageModules/index.js";
