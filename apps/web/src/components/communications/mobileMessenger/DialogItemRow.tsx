import React from "react";
import { formatPatientInitials, getAvatarColor } from "../../../store/telephonyStore";
import type { MobilePatientDialogSummary } from "./types";
import { formatLastMessageTime, renderChannelIcon } from "./utils";

export interface DialogItemRowProps {
	dialog: MobilePatientDialogSummary;
	onSelectDialog: (dialog: MobilePatientDialogSummary) => void;
}

export const DialogItemRow: React.FC<DialogItemRowProps> = ({ dialog, onSelectDialog }) => {
	const initials = formatPatientInitials(dialog.patientName);
	const avatarColor = getAvatarColor(dialog.patientName);

	return (
		<div
			className="mobile-dialog-row"
			onClick={() => onSelectDialog(dialog)}
			role="button"
			tabIndex={0}
			data-testid={`dialog-row-${dialog.patientId}`}
		>
			<div className="mobile-avatar-wrap" style={{ background: avatarColor.bg }}>
				<span>{initials}</span>
				{renderChannelIcon(dialog.channel)}
			</div>

			<div className="mobile-dialog-content">
				<div className="mobile-dialog-top-line">
					<span className="mobile-dialog-patient-name">{dialog.patientName}</span>
					<span className="mobile-dialog-time">{formatLastMessageTime(dialog.lastMessageAt)}</span>
				</div>

				<div className="mobile-dialog-bottom-line">
					<span className="mobile-dialog-preview">
						{dialog.direction === "outbound" && <span className="text-teal-600 font-semibold mr-1">Вы:</span>}
						{dialog.lastMessage}
					</span>
					{dialog.unreadCount > 0 && (
						<span className="mobile-dialog-unread-badge">{dialog.unreadCount}</span>
					)}
				</div>
			</div>
		</div>
	);
};
