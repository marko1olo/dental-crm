import type {
	CommunicationTaskOutcome,
	Dashboard,
	GeneratedDocument,
	StaffRole,
} from "@dental/shared";
import type { JournalDigest } from "../journalDigest";

export type CommunicationTask = Dashboard["communicationTasks"][number];
export type CommunicationTemplate = Dashboard["communicationTemplates"][number];
export type CommunicationEvent = Dashboard["communicationEvents"][number];

export type CommunicationActiveSection =
	| "tasks"
	| "omnichannel"
	| "chat"
	| "notifications"
	| "staff_chat"
	| "bot_inbox";

export type CommunicationsViewProps = {
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationDocumentTaskActionLabels: Partial<
		Record<GeneratedDocument["kind"], string>
	>;
	communicationIntentLabels: Record<CommunicationTask["intent"], string>;
	communicationNote: string;
	communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
	communicationSavingTaskId: string | null;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	completeCommunicationTask: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>;
	dashboard: Dashboard;
	documentKindsForCommunicationTask: (
		task: CommunicationTask,
	) => readonly GeneratedDocument["kind"][];
	documentLabels: Record<GeneratedDocument["kind"], string>;
	formatDateTime: (value: string) => string;
	onCommunicationNoteChange: (value: string) => void;
	onGoToSchedule: () => void;
	openCommunicationTaskDocumentWorkflow: (
		task: CommunicationTask,
		kind: GeneratedDocument["kind"],
	) => void;
	sortedCommunicationTasks: CommunicationTask[];
	staffRoleLabels: Record<StaffRole, string>;
};

export type CommunicationsChannelFilterBarProps = {
	activeSection: CommunicationActiveSection;
	onSelectSection: (section: CommunicationActiveSection) => void;
	onOpenRecallsHub: () => void;
	onOpenOmnichannelHub: () => void;
	onGoToSchedule: () => void;
	isMoreMenuOpen: boolean;
	onToggleMoreMenu: () => void;
	onCloseMoreMenu: () => void;
};

export type CommunicationsChatFooterInputProps = {
	communicationNote: string;
	onCommunicationNoteChange: (value: string) => void;
	closingNoteArmed: boolean;
	communicationNoteInputId: string;
	communicationNoteDescriptionId: string;
};

export type CommunicationsConversationsListProps = {
	dashboard: Dashboard;
	clinicMode: string | null;
	effectiveTasks: CommunicationTask[];
	tasksSlice: {
		visibleItems: CommunicationTask[];
		hasMore: boolean;
		totalCount: number;
	};
	onShowMoreTasks: () => void;
	journal: JournalDigest<CommunicationEvent>;
	journalSlice: {
		visibleItems: CommunicationEvent[];
		hasMore: boolean;
		totalCount: number;
	};
	onShowMoreJournal: () => void;
	communicationSummaryHasNumbers: boolean;
	communicationChannelLabels: Record<CommunicationTask["channel"], string>;
	communicationDocumentTaskActionLabels: Partial<
		Record<GeneratedDocument["kind"], string>
	>;
	communicationIntentLabels: Record<CommunicationTask["intent"], string>;
	communicationPriorityLabels: Record<CommunicationTask["priority"], string>;
	communicationSavingTaskId: string | null;
	communicationStatusLabels: Record<CommunicationTask["status"], string>;
	completeCommunicationTask: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => void | Promise<void>;
	documentKindsForCommunicationTask: (
		task: CommunicationTask,
	) => readonly GeneratedDocument["kind"][];
	documentLabels: Record<GeneratedDocument["kind"], string>;
	formatDateTime: (value: string) => string;
	onGoToSchedule: () => void;
	openCommunicationTaskDocumentWorkflow: (
		task: CommunicationTask,
		kind: GeneratedDocument["kind"],
	) => void;
	staffRoleLabels: Record<StaffRole, string>;
	communicationNoteDescriptionId: string;
};
