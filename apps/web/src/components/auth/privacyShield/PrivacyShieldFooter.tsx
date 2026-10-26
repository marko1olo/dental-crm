import React from "react";
import { LogOut } from "lucide-react";

interface PrivacyShieldFooterProps {
	onFullLock?: (() => void) | undefined;
	onClinicLogout?: (() => void) | undefined;
}

export function PrivacyShieldFooter({ onFullLock, onClinicLogout }: PrivacyShieldFooterProps) {
	if (!onFullLock && !onClinicLogout) return null;

	const handleAction = () => {
		if (onFullLock) {
			onFullLock();
		} else if (onClinicLogout) {
			onClinicLogout();
		}
	};

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "12px",
				paddingTop: "6px",
				width: "100%",
				borderTop: "1px solid rgba(255, 255, 255, 0.08)",
			}}
		>
			<button
				type="button"
				onClick={handleAction}
				style={{
					background: "none",
					border: "none",
					color: "rgba(255, 255, 255, 0.75)",
					fontSize: "11px",
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					cursor: "pointer",
					padding: "6px 8px",
					borderRadius: "6px",
					transition: "color 0.2s ease",
				}}
				title="Завершить смену и выйти на экран выбора сотрудника"
			>
				<LogOut size={12} />
				<span>Сменить врача / Завершить смену</span>
			</button>
		</div>
	);
}
