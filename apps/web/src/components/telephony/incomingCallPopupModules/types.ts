import type { QuickSlotOption, QuickSlotType } from "../IncomingCallQuickBooking";
import type { CallOutcome, IncomingCallPayload, TelephonyLineSession } from "../../../store/telephonyStore";
import type { useIncomingCallData } from "../useIncomingCallData";

export type TelephonyCall = IncomingCallPayload | null;
export type TelephonyLineSlot = TelephonyLineSession;

export type IncomingCallDataResult = ReturnType<typeof useIncomingCallData>;

export interface IncomingCallPopupController extends IncomingCallDataResult {
	activeCall: TelephonyCall;
	activeLineId: 1 | 2;
	secondaryLine: TelephonyLineSlot;
	isMuted: boolean;
	isDndActive: boolean;
	isConnected: boolean;
	isDoctorMode: boolean;
	suppressCallModal: boolean;
	isFullScreenStudioActive: boolean;
	isCallDrawerOpen: boolean;
	isPopupExpanded: boolean;
	isCallAnswered: boolean;
	isCallEnded: boolean;
	smsCopied: boolean;
	newPatientNameInput: string;
	showTransferPanel: boolean;
	transferType: "blind" | "attended";
	showBadgeMoreMenu: boolean;
	showQuickBooking: boolean;
	showOutcomePanel: boolean;
	isCreatingPatient: boolean;
	isCapturingLead: boolean;
	quickSlots: QuickSlotOption[];
	currentView: string;
	selectedWorkspaceRole: string;
	setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
	setNewPatientNameInput: React.Dispatch<React.SetStateAction<string>>;
	setShowTransferPanel: React.Dispatch<React.SetStateAction<boolean>>;
	setTransferType: React.Dispatch<React.SetStateAction<"blind" | "attended">>;
	setShowBadgeMoreMenu: React.Dispatch<React.SetStateAction<boolean>>;
	setShowQuickBooking: React.Dispatch<React.SetStateAction<boolean>>;
	setShowOutcomePanel: React.Dispatch<React.SetStateAction<boolean>>;
	closeCallDrawer: () => void;
	dismissCall: () => void;
	toggleMute: () => void;
	handleToggleCardDrawer: () => void;
	handleOpenFullPatientView: () => void;
	handleQuickBook: (slotType?: QuickSlotType) => void;
	handleQuickCreatePatient: (customName?: string) => Promise<void>;
	handleCaptureLead: () => Promise<void>;
	handleSendWhatsAppConfirmation: () => void;
	handleCopySmsConfirmation: () => void;
	handleAnswerCall: () => void;
	handleReject: () => void;
	handleEndCall: () => void;
	handleSwitchAndAnswerSecondaryLine: (mode?: "capsule" | "expanded") => void;
	handleResumeSecondaryLine: () => void;
	handleCopyPhone: () => void;
	handleToggleDnd: () => void;
	handleRecordOutcome: (outcome: CallOutcome) => void;
	handleStartQuickCreateFromMenu: () => void;
}

export interface IncomingCallHeaderBarProps {
	ctrl: IncomingCallPopupController;
}

export interface IncomingCallPatientContextCardProps {
	ctrl: IncomingCallPopupController;
}

export interface IncomingCallQuickBookingSectionProps {
	ctrl: IncomingCallPopupController;
}

export interface IncomingCallActionFooterProps {
	ctrl: IncomingCallPopupController;
}
