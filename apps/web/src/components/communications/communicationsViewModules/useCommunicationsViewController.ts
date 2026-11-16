import { useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { documentLabels as DEFAULT_DOCUMENT_LABELS } from "../../../workspaceUiLabels";
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
import type { CommunicationActiveSection, CommunicationEvent, CommunicationsViewProps } from "./types";
import { useCommunicationsNavigation } from "./useCommunicationsNavigation";

export interface UseCommunicationsViewOptions extends Partial<CommunicationsViewProps> {
	activeSection?: CommunicationActiveSection;
	setCommunicationNote?: (value: string) => void;
}

export function useCommunicationsViewController(rawProps?: UseCommunicationsViewOptions) {
	const logicContext = useOptionalAppLogicContext();
	const props: UseCommunicationsViewOptions = { ...logicContext, ...rawProps };

	const {
		communicationChannelLabels = DEFAULT_COMMUNICATION_CHANNEL_LABELS,
		communicationDocumentTaskActionLabels = {},
		communicationIntentLabels = DEFAULT_COMMUNICATION_INTENT_LABELS,
		communicationNote = props.communicationNote ?? "",
		communicationPriorityLabels = DEFAULT_COMMUNICATION_PRIORITY_LABELS,
		communicationSavingTaskId = props.communicationSavingTaskId ?? null,
		communicationStatusLabels = DEFAULT_COMMUNICATION_STATUS_LABELS,
		completeCommunicationTask = () => {},
		dashboard = logicContext?.dashboard,
		documentKindsForCommunicationTask = () => [],
		documentLabels = props.documentLabels ?? DEFAULT_DOCUMENT_LABELS,
		formatDateTime = defaultFormatDateTime,
		onCommunicationNoteChange = props.onCommunicationNoteChange ?? props.setCommunicationNote ?? (() => {}),
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
		completeCommunicationTask, dashboard,
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
