/**
 * @file index.ts
 * @description Master Barrel for Chestny ZNAK / MDLP Engine DAG.
 */

export {
	chestnyZnakVerificationStatusSchema,
	type ChestnyZnakVerificationStatus,
	type ChestnyZnakScannedItem,
	type ChestnyZnakScanSummary,
	type MdlpSchema701Item,
	type MdlpSchema701Params,
	type MdlpSchema701Document,
	type SafeParseMdlpSchema701Result,
	type MdlpSchema531Item,
	type MdlpSchema531Params,
	type MdlpSchema531Document,
	type SafeParseMdlpSchema531Result,
	type ParsedChestnyZnakBarcode,
} from "./types.js";

export {
	parseChestnyZnakBarcode,
	createChestnyZnakScannedItem,
	computeGtinCheckDigit,
	isValidGtinChecksum,
} from "./gs1DataMatrixParser.js";

export {
	validateMdlpSchema701Params,
	generateMdlpSchema701Payload,
	parseMdlpSchema701Xml,
	safeParseMdlpSchema701Xml,
} from "./xmlDocumentBuilder.js";

export {
	validateMdlpSchema531Params,
	generateMdlpSchema531Payload,
	parseMdlpSchema531Xml,
	safeParseMdlpSchema531Xml,
	calculateChestnyZnakSummary,
} from "./disposalEngineCore.js";
