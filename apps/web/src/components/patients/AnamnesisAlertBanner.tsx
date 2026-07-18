import { ShieldAlert } from "lucide-react";
import React from "react";

export interface AnamnesisAlertBannerProps {
	hasCriticalAlerts: boolean;
	criticalAlertNote: string;
	setHasCriticalAlerts: (val: boolean) => void;
	setCriticalAlertNote: (val: string) => void;
}

export const AnamnesisAlertBanner: React.FC<AnamnesisAlertBannerProps> = ({
	hasCriticalAlerts,
	criticalAlertNote,
	setHasCriticalAlerts,
	setCriticalAlertNote,
}) => {
	return (
		<div
			style={{
				background: hasCriticalAlerts ? "var(--red-50)" : "var(--slate-50)",
				border: `1px solid ${hasCriticalAlerts ? "var(--red-200)" : "var(--slate-200)"}`,
				borderRadius: "12px",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				transition: "all 0.3s",
			}}
		>
			<label
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					fontWeight: 600,
					color: hasCriticalAlerts ? "var(--red-600)" : "var(--slate-700)",
					cursor: "pointer",
				}}
			>
				<input
					type="checkbox"
					checked={hasCriticalAlerts}
					onChange={(e) => setHasCriticalAlerts(e.target.checked)}
					style={{ transform: "scale(1.2)" }}
				/>
				<ShieldAlert size={20} />
				<span>Критическое предупреждение (Внимание врача!)</span>
			</label>

			{hasCriticalAlerts && (
				<textarea
					className="text-input w-full"
					value={criticalAlertNote}
					onChange={(e) => setCriticalAlertNote(e.target.value)}
					placeholder="Укажите причину: например, 'АНАФИЛАКТИЧЕСКИЙ ШОК НА ЛИДОКАИН'"
					style={{
						borderColor: "var(--red-300)",
						outlineColor: "var(--red-400)",
						minHeight: "60px",
						resize: "vertical",
					}}
				/>
			)}
		</div>
	);
};
