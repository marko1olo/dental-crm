/**
 * sliceExtractors.ts — Канонический фасад экстракторов срезов доменного состояния (Layer 5 Facade).
 * Декомпозирован в `./sliceModules/` (sliceExtractorsTypes, clinicalSliceExtractors, financeSliceExtractors).
 * Строго соответствует инварианту <= 250 строк.
 */

export {
	iso,
	reportUnreadableTime,
	isoOrSkipRow,
	parseJsonArray,
	parseJsonObject,
	collect,
	selectByOrganization,
} from "./sliceModules/sliceExtractorsTypes.js";

export {
	extractStaff,
	extractChairs,
	extractAppointments,
	extractVisits,
	extractTreatmentItems,
	extractImagingStudies,
	extractClinicalRules,
	extractProtocolTemplates,
} from "./sliceModules/clinicalSliceExtractors.js";

export {
	extractPatients,
	extractPayments,
	extractDocuments,
	extractCommunicationTasks,
	extractCommunicationEvents,
} from "./sliceModules/financeSliceExtractors.js";
