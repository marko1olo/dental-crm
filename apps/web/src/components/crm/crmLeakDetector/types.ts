import type { CrmDeclineReason, CrmLeakLeadItem } from "@dental/shared";

export interface CrmLeakDetectorDrawerProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly onOpenPatientWorkspace?: (patientId: string) => void;

	// Granular / test props compatibility:
	readonly activeScriptLead?: CrmLeakLeadItem | null;
	readonly copiedScript?: boolean;
	readonly onCopyScript?: (text: string) => void;
	readonly onCloseScript?: () => void;

	readonly contactModalLead?: CrmLeakLeadItem | null;
	readonly contactChannel?: "call" | "whatsapp" | "telegram" | "sms";
	readonly onSetContactChannel?: (
		channel: "call" | "whatsapp" | "telegram" | "sms",
	) => void;
	readonly contactNotes?: string;
	readonly onSetContactNotes?: (notes: string) => void;
	readonly onSaveContact?: () => void;
	readonly onCloseContact?: () => void;

	readonly declineModalLead?: CrmLeakLeadItem | null;
	readonly declineReason?: CrmDeclineReason;
	readonly onSetDeclineReason?: (reason: CrmDeclineReason) => void;
	readonly declineComment?: string;
	readonly onSetDeclineComment?: (comment: string) => void;
	readonly onSaveDecline?: () => void;
	readonly onCloseDecline?: () => void;

	readonly selectedLeakLead?: CrmLeakLeadItem | null;
	readonly onCloseLeakLead?: () => void;
}
