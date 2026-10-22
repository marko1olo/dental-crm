import { useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { summarizeJournal } from "../journalDigest";
import {
	COMMUNICATION_NOTE_DESCRIPTION_ID, COMMUNICATION_NOTE_INPUT_ID,
	DEFAULT_COMMUNICATION_CHANNEL_LABELS, DEFAULT_COMMUNICATION_INTENT_LABELS,
	DEFAULT_COMMUNICATION_PRIORITY_LABELS, DEFAULT_COMMUNICATION_STATUS_LABELS,
	DEFAULT_STAFF_ROLE_LABELS,
} from "./communicationsConstants";
import {
	defaultFormatDateTime, hasCommunicationSummaryNumbers,
	resolveEffectiveCommunicationEvents, resolveEffectiveCommunicationTasks,
} from "./communicationsUtils";
import type { CommunicationEvent, CommunicationsViewProps } from "./types";
import { useCommunicationsNavigation } from "./useCommunicationsNavigation";

export function useCommunicationsViewController(rawProps?: Partial<CommunicationsViewProps>) {
	const logicContext = useOptionalAppLogicContext() ?? ({} as any);
	const props = { ...logicContext, ...rawProps } as any;

	const {
		communicationChannelLabels = DEFAULT_COMMUNICATION_CHANNEL_LABELS,
		communicationDocumentTaskActionLabels = {},
		communicationIntentLabels = DEFAULT_COMMUNICATION_INTENT_LABELS,
		communicationNote = props.communicationNote ?? "",
		communicationPriorityLabels = DEFAULT_COMMUNICATION_PRIORITY_LABELS,
		communicationSavingTaskId = props.communicationSavingTaskId ?? null,
		communicationStatusLabels = DEFAULT_COMMUNICATION_STATUS_LABELS,
		completeCommunicationTask = () => {},
		dashboard,
		documentKindsForCommunicationTask = () => [],
		documentLabels = {},
		formatDateTime = defaultFormatDateTime,
		onCommunicationNoteChange = props.onCommunicationNoteChange ?? (props as any).setCommunicationNote ?? (() => {}),
		onGoToSchedule = props.onGoToSchedule ?? (() => { window.location.hash = "schedule"; }),
		openCommunicationTaskDocumentWorkflow = () => {},
		sortedCommunicationTasks,
		staffRoleLabels = DEFAULT_STAFF_ROLE_LABELS,
	} = props;

	const isDemo = isDemoShowcaseMode();
	const clinicMode = dashboard?.clinicSettings?.profile?.mode ?? null;
	const effectiveEvents = resolveEffectiveCommunicationEvents(dashboard, isDemo);
	const journal = summarizeJournal<CommunicationEvent>(effectiveEvents);
	const closingNoteArmed = typeof communicationNote === "string" && communicationNote.trim().length > 0;

	const nav = useCommunicationsNavigation(props.activeSection);
	const [tasksLimit, setTasksLimit] = useState(30);
	const [journalLimit, setJournalLimit] = useState(40);

	const effectiveTasks = resolveEffectiveCommunicationTasks(sortedCommunicationTasks, dashboard, isDemo);
	const tasksSlice = sliceDomList(effectiveTasks, tasksLimit, 0);
	const journalSlice = sliceDomList(journal.entries ?? [], journalLimit, 0);
	const isMobile = useIsMobile(768);

	return {
		activeSection: nav.activeSection, setActiveSection: nav.setActiveSection,
		clinicMode, closingNoteArmed,
		communicationChannelLabels, communicationDocumentTaskActionLabels,
		communicationIntentLabels, communicationNote,
		communicationNoteDescriptionId: COMMUNICATION_NOTE_DESCRIPTION_ID,
		communicationNoteInputId: COMMUNICATION_NOTE_INPUT_ID,
		communicationPriorityLabels, communicationSavingTaskId, communicationStatusLabels,
		communicationSummaryHasNumbers: hasCommunicationSummaryNumbers(dashboard),
		completeCommunicationTask, dashboard: dashboard!,
		documentKindsForCommunicationTask, documentLabels,
		effectiveEvents, effectiveTasks, formatDateTime,
		isDemo, isMobile,
		isMoreMenuOpen: nav.isMoreMenuOpen, setIsMoreMenuOpen: nav.setIsMoreMenuOpen,
		isOmnichannelHubOpen: nav.isOmnichannelHubOpen, setIsOmnichannelHubOpen: nav.setIsOmnichannelHubOpen,
		isRecallsHubOpen: nav.isRecallsHubOpen, setIsRecallsHubOpen: nav.setIsRecallsHubOpen,
		journal, journalSlice, onCommunicationNoteChange, onGoToSchedule,
		openCommunicationTaskDocumentWorkflow, setJournalLimit, setTasksLimit,
		staffRoleLabels, tasksSlice,
	};
}

export type CommunicationsViewControllerResult = ReturnType<typeof useCommunicationsViewController>;
