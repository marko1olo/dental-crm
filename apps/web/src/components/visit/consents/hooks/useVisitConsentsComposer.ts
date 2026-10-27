import { useConsentRecordsState } from "./useConsentRecordsState";
import { useConsentContextBuilder } from "./useConsentContextBuilder";
import { useConsentBackendSync } from "./useConsentBackendSync";
import { useConsentStatusResolver } from "./useConsentStatusResolver";
import { useConsentActions } from "./useConsentActions";
import { useConsentAddendumActions } from "./useConsentAddendumActions";
import type {
	VisitConsentsTabPatient,
	VisitConsentsTabDoctor,
	VisitConsentsTabAppointment,
	VisitConsentsTabNoteForm,
	VisitConsentsTabDashboard,
} from "../visitConsentTypes";

export interface UseVisitConsentsLogicParams {
	readonly activePatient?: VisitConsentsTabPatient | null | undefined;
	readonly activeDoctor?: VisitConsentsTabDoctor | null | undefined;
	readonly activeAppointment?: VisitConsentsTabAppointment | null | undefined;
	readonly visitNoteForm?: VisitConsentsTabNoteForm | null | undefined;
	readonly dashboard?: VisitConsentsTabDashboard | null | undefined;
	readonly selectedToothForMenu?: any;
	readonly onFastPrintInformedConsent?: () => void;
	readonly onOpenInformedConsentModal?: () => void;
}

export function useVisitConsentsLogic({
	activePatient, activeDoctor, activeAppointment, visitNoteForm,
	dashboard, selectedToothForMenu, onFastPrintInformedConsent,
}: UseVisitConsentsLogicParams) {
	const state = useConsentRecordsState(activePatient, activeAppointment, visitNoteForm);
	const ctx = useConsentContextBuilder({
		activePatient, activeDoctor, dashboard, visitNoteForm, selectedToothForMenu,
		consentRecords: state.consentRecords, isVisitClosed: state.isVisitClosed,
	});
	const sync = useConsentBackendSync({
		patientId: state.patientId, storageKey: state.storageKey,
		substitutionContext: ctx.substitutionContext, activeAppointment,
		setConsentRecords: state.setConsentRecords,
	});
	const resolved = useConsentStatusResolver({
		consentRecords: state.consentRecords, requiredFlags: ctx.requiredFlags,
		substitutionContext: ctx.substitutionContext,
	});
	const actions = useConsentActions({
		patientId: state.patientId, consentRecords: state.consentRecords,
		unsignedRequiredItems: resolved.unsignedRequiredItems, signedConsentKeys: ctx.signedConsentKeys,
		requiredFlags: ctx.requiredFlags, substitutionContext: ctx.substitutionContext,
		saveConsentRecords: state.saveConsentRecords, persistConsentToBackend: sync.persistConsentToBackend,
		onFastPrintInformedConsent,
	});
	const addendum = useConsentAddendumActions({
		patientId: state.patientId, consentRecords: state.consentRecords,
		consentScopeMismatch: ctx.consentScopeMismatch, doctorName: ctx.substitutionContext.doctorName ?? undefined,
		saveConsentRecords: state.saveConsentRecords, persistConsentToBackend: sync.persistConsentToBackend,
		handlePrintSingleFilled: actions.handlePrintSingleFilled, handlePrintTodayPackage: actions.handlePrintTodayPackage,
	});

	return {
		activeSubTab: state.activeSubTab, setActiveSubTab: state.setActiveSubTab,
		expandedCards: state.expandedCards, toggleCardExpand: state.toggleCardExpand,
		activeDropdownKey: state.activeDropdownKey, setActiveDropdownKey: state.setActiveDropdownKey,
		substitutionContext: ctx.substitutionContext, consentScopeMismatch: ctx.consentScopeMismatch,
		itemsWithStatus: resolved.itemsWithStatus, unsignedRequiredItems: resolved.unsignedRequiredItems,
		archiveList: resolved.archiveList,
		handleTogglePaperSigned: actions.handleTogglePaperSigned,
		handleMarkAllRequiredTodaySigned: actions.handleMarkAllRequiredTodaySigned,
		handlePrintSingleFilled: actions.handlePrintSingleFilled,
		handlePrintSingleBlank: actions.handlePrintSingleBlank,
		handlePrintTodayPackage: actions.handlePrintTodayPackage,
		handleFormAddendumConsent: addendum.handleFormAddendumConsent,
		handleMarkAddendumSigned: addendum.handleMarkAddendumSigned,
	};
}
