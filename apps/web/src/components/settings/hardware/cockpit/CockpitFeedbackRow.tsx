import React from "react";
import { HardDrive, PhoneCall, Printer } from "lucide-react";

interface Props {
	kktStatus: string | null;
	hotFolderStatus?: string;
	telephonyStatus: string | null;
}

export const CockpitFeedbackRow: React.FC<Props> = ({
	kktStatus,
	hotFolderStatus,
	telephonyStatus,
}) => {
	if (!kktStatus && !telephonyStatus && !hotFolderStatus) {
		return null;
	}

	return (
		<div
			style={{
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: "4px",
				paddingTop: "6px",
				borderTop: "1px dashed var(--line)",
				fontSize: "11px",
				color: "var(--muted)",
			}}
		>
			{kktStatus && (
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<Printer size={12} />
					<span>{kktStatus}</span>
				</div>
			)}
			{hotFolderStatus && (
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<HardDrive size={12} />
					<span>{hotFolderStatus}</span>
				</div>
			)}
			{telephonyStatus && (
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<PhoneCall size={12} />
					<span>{telephonyStatus}</span>
				</div>
			)}
		</div>
	);
};
