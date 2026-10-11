import { useEffect, useState } from "react";
import { summarizeJournal } from "../journalDigest";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import {
	COMMUNICATION_NOTE_DESCRIPTION_ID,
	COMMUNICATION_NOTE_INPUT_ID,
	DEFAULT_COMMUNICATION_CHANNEL_LABELS,
	DEFAULT_COMMUNICATION_INTENT_LABELS,
	DEFAULT_COMMUNICATION_PRIORITY_LABELS,
	DEFAULT_COMMUNICATION_STATUS_LABELS,
	DEFAULT_STAFF_ROLE_LABELS,
} from "./communicationsConstants";
import {
	defaultFormatDateTime,
	hasCommunicationSummaryNumbers,
	resolveEffectiveCommunicationEvents,
	resolveEffectiveCommunicationTasks,
} from "./communicationsUtils";
import type {
	CommunicationActiveSection,
	CommunicationEvent,
	CommunicationsViewProps,
} from "./types";

export function useCommunicationsViewController(
	rawProps?: Partial<CommunicationsViewProps>,
) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<
		typeof useAppLogicContext
	> &
		Partial<CommunicationsViewProps>;

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
		onCommunicationNoteChange = props.onCommunicationNoteChange ??
			(props as any).setCommunicationNote ??
			(() => {}),
		onGoToSchedule = props.onGoToSchedule ??
			(() => {
				window.location.hash = "schedule";
			}),
		openCommunicationTaskDocumentWorkflow = () => {},
		sortedCommunicationTasks,
		staffRoleLabels = DEFAULT_STAFF_ROLE_LABELS,
	} = props;

	const communicationNoteInputId = COMMUNICATION_NOTE_INPUT_ID;
	const communicationNoteDescriptionId = COMMUNICATION_NOTE_DESCRIPTION_ID;
	const isDemo = isDemoShowcaseMode();
	const clinicMode = dashboard?.clinicSettings?.profile?.mode ?? null;

	const effectiveEvents = resolveEffectiveCommunicationEvents(dashboard, isDemo);
	const journal = summarizeJournal<CommunicationEvent>(effectiveEvents);

	const closingNoteArmed =
		typeof communicationNote === "string" &&
		communicationNote.trim().length > 0;

	const [activeSection, setActiveSection] = useState<CommunicationActiveSection>(
		() => {
			if (typeof window !== "undefined") {
				const hash = window.location.hash || "";
				const search = window.location.search || "";
				if (
					hash.includes("bot_inbox") ||
					hash.includes("bots") ||
					search.includes("bot_inbox") ||
					search.includes("bots")
				) {
					return "bot_inbox";
				}
				if (hash.includes("chat") || search.includes("chat")) return "chat";
				if (hash.includes("notifications") || search.includes("notifications"))
					return "notifications";
				if (hash.includes("staff_chat") || search.includes("staff_chat"))
					return "staff_chat";
			}
			return "tasks";
		},
	);

	useEffect(() => {
		const handleHash = () => {
			const hash = window.location.hash || "";
			if (hash.includes("bot_inbox") || hash.includes("bots")) {
				setActiveSection("bot_inbox");
			} else if (hash.includes("chat")) {
				setActiveSection("chat");
			} else if (hash.includes("notifications")) {
				setActiveSection("notifications");
			} else if (hash.includes("staff_chat")) {
				setActiveSection("staff_chat");
			}
		};
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);

	const [tasksLimit, setTasksLimit] = useState(30);
	const [journalLimit, setJournalLimit] = useState(40);
	const [isRecallsHubOpen, setIsRecallsHubOpen] = useState(false);
	const [isOmnichannelHubOpen, setIsOmnichannelHubOpen] = useState(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	const effectiveTasks = resolveEffectiveCommunicationTasks(
		sortedCommunicationTasks,
		dashboard,
		isDemo,
	);
	const tasksSlice = sliceDomList(effectiveTasks, tasksLimit, 0);
	const journalSlice = sliceDomList(journal.entries ?? [], journalLimit, 0);

	const communicationSummaryHasNumbers =
		hasCommunicationSummaryNumbers(dashboard);
	const isMobile = useIsMobile(768);

	return {
		activeSection,
		setActiveSection,
		clinicMode,
		closingNoteArmed,
		communicationChannelLabels,
		communicationDocumentTaskActionLabels,
		communicationIntentLabels,
		communicationNote,
		communicationNoteDescriptionId,
		communicationNoteInputId,
		communicationPriorityLabels,
		communicationSavingTaskId,
		communicationStatusLabels,
		communicationSummaryHasNumbers,
		completeCommunicationTask,
		dashboard: dashboard!,
		documentKindsForCommunicationTask,
		documentLabels,
		effectiveEvents,
		effectiveTasks,
		formatDateTime,
		isDemo,
		isMobile,
		isMoreMenuOpen,
		isOmnichannelHubOpen,
		isRecallsHubOpen,
		journal,
		journalSlice,
		onCommunicationNoteChange,
		onGoToSchedule,
		openCommunicationTaskDocumentWorkflow,
		setIsMoreMenuOpen,
		setIsOmnichannelHubOpen,
		setIsRecallsHubOpen,
		setJournalLimit,
		setTasksLimit,
		staffRoleLabels,
		tasksSlice,
	};
}

export type CommunicationsViewControllerResult = ReturnType<
	typeof useCommunicationsViewController
>;
