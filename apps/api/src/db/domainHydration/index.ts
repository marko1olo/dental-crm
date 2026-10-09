/**
 * Barrel-экспорт модуля гидратации доменного состояния DENTE CRM.
 */
export type {
	DomainState,
	DomainStateHydrationReport,
	HydratedDomainState,
	HydrationOptions,
} from "./types.js";

export {
	CRITICAL_SLICES,
	DomainStateSliceUnavailableError,
	assertCriticalSlicesAvailable,
} from "./sliceValidators.js";

export {
	iso,
	reportUnreadableTime,
	isoOrSkipRow,
	parseJsonArray,
	parseJsonObject,
	collect,
	selectByOrganization,
	extractStaff,
	extractChairs,
	extractPatients,
	extractAppointments,
	extractVisits,
	extractTreatmentItems,
	extractPayments,
	extractDocuments,
	extractCommunicationTasks,
	extractCommunicationEvents,
	extractImagingStudies,
	extractClinicalRules,
	extractProtocolTemplates,
} from "./sliceExtractors.js";

export {
	NIL_UUID,
	NO_VISIT_TIMESTAMP,
	UNREADABLE_TIME_MARKER,
	noVisitSkeleton,
	applyActiveVisit,
	emptyDomainState,
	hydrateFromDatabase,
	hydrateDomainStateFromDb,
	_withHydratedDomainState,
	_findLatestVisitIdForPatient,
} from "./hydrationPipeline.js";
