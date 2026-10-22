import type React from "react";
import type { CrmDeclineReason, CrmLeakLeadItem } from "@dental/shared";
import { CrmLeakContactSection } from "./CrmLeakContactSection";
import { CrmLeakDeclineSection } from "./CrmLeakDeclineSection";
import { CrmLeakInspectionCard } from "./CrmLeakInspectionCard";
import { CrmLeakScriptSection } from "./CrmLeakScriptSection";

interface Props {
	activeScript: CrmLeakLeadItem | null;
	copied: boolean;
	onCopy: (text: string) => void;
	onCloseScript: () => void;
	contactLead: CrmLeakLeadItem | null;
	contactChannel: "call" | "whatsapp" | "telegram" | "sms";
	onChannelChange: (channel: "call" | "whatsapp" | "telegram" | "sms") => void;
	contactNotes: string;
	onNotesChange: (notes: string) => void;
	onSaveContact: () => void;
	onCloseContact: () => void;
	declineLead: CrmLeakLeadItem | null;
	declineReason: CrmDeclineReason;
	onReasonChange: (reason: CrmDeclineReason) => void;
	declineComment: string;
	onCommentChange: (comment: string) => void;
	onSaveDecline: () => void;
	onCloseDecline: () => void;
	selectedLead: CrmLeakLeadItem | null;
	onCloseSelected: () => void;
	onOpenPatientWorkspace: (patientId: string) => void;
}

export const CrmLeakActiveSections: React.FC<Props> = ({
	activeScript,
	copied,
	onCopy,
	onCloseScript,
	contactLead,
	contactChannel,
	onChannelChange,
	contactNotes,
	onNotesChange,
	onSaveContact,
	onCloseContact,
	declineLead,
	declineReason,
	onReasonChange,
	declineComment,
	onCommentChange,
	onSaveDecline,
	onCloseDecline,
	selectedLead,
	onCloseSelected,
	onOpenPatientWorkspace,
}) => {
	return (
		<>
			{activeScript && (
				<CrmLeakScriptSection
					lead={activeScript}
					copied={copied}
					onCopy={onCopy}
					onClose={onCloseScript}
				/>
			)}
			{contactLead && (
				<CrmLeakContactSection
					lead={contactLead}
					channel={contactChannel}
					onChannelChange={onChannelChange}
					notes={contactNotes}
					onNotesChange={onNotesChange}
					onSave={onSaveContact}
					onClose={onCloseContact}
				/>
			)}
			{declineLead && (
				<CrmLeakDeclineSection
					lead={declineLead}
					reason={declineReason}
					onReasonChange={onReasonChange}
					comment={declineComment}
					onCommentChange={onCommentChange}
					onSave={onSaveDecline}
					onClose={onCloseDecline}
				/>
			)}
			{selectedLead && (
				<CrmLeakInspectionCard
					lead={selectedLead}
					onClose={onCloseSelected}
					onOpenPatientWorkspace={onOpenPatientWorkspace}
				/>
			)}
		</>
	);
};
