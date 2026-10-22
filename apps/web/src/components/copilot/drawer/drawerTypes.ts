import type {
	BookSlotHandler,
	ConfirmHandler,
	CopilotNudge,
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	SelectIdHandler,
	WhatsAppApprovalCard,
} from "../copilotTypes";

export interface CopilotDrawerProps {
	isOpen: boolean;
	messages: CopilotUiMessage[];
	busy: boolean;
	phase: CopilotPhase;
	pending: PendingConfirmation | null;
	nameCache: Record<string, string>;
	nudges: CopilotNudge[];
	proactiveAlerts?: ProactiveAlertCardData[] | undefined;
	whatsappHitLCards?: WhatsAppApprovalCard[] | undefined;
	activeTab: "chat" | "pending";
	onTabChange: (tab: "chat" | "pending") => void;
	onClose: () => void;
	onSend: (text: string) => void;
	onConfirm: ConfirmHandler;
	onReset: () => void;
	onDismissNudge: (id: string) => void;
	onDismissProactiveAlert?: ((alertId: string) => void) | undefined;
	onApproveWhatsApp?: ((approvalId: string, modifiedReply?: string) => void) | undefined;
	onRejectWhatsApp?: ((approvalId: string, reason?: string) => void) | undefined;
	onSelectPatient?: SelectIdHandler;
	onSelectAppointment?: SelectIdHandler;
	onBookSlot?: BookSlotHandler;
}

export interface ShiftDebtRecall {
	id: string;
	patientId: string;
	fullName: string;
	phone: string;
	reason: string;
	overdueDays: number;
	overdueDate: string;
}

export interface ShiftDebtEstimate {
	id: string;
	patientId: string;
	patientName: string;
	title: string;
	status: "thinking" | "approval";
	statusLabel: string;
	amountRub: number;
}

export const formatShortPatientName = (fullName?: string | null): string | null => {
	if (!fullName) return null;
	const parts = fullName.trim().split(/\s+/);
	const [p0, p1, p2] = parts;
	if (p0 && p1 && p2) return `${p0} ${p1[0] ?? ""}.${p2[0] ?? ""}.`;
	if (p0 && p1) return `${p0} ${p1[0] ?? ""}.`;
	return fullName;
};
