import type React from "react";
import { ShieldCheck } from "lucide-react";

export interface LoyaltyDoctorAutonomyToggleProps {
	readonly isDoctorOverride: boolean;
	readonly onDoctorOverrideChange: (override: boolean) => void;
}

export const LoyaltyDoctorAutonomyToggle: React.FC<LoyaltyDoctorAutonomyToggleProps> = ({
	isDoctorOverride,
	onDoctorOverrideChange,
}) => {
	return (
		<div
			style={{
				marginTop: "0.75rem",
				display: "flex",
				alignItems: "center",
				gap: "0.5rem",
				padding: "0.5rem 0.75rem",
				background: "var(--paper-soft)",
				borderRadius: "0.375rem",
				border: "1px dashed var(--line)",
			}}
		>
			<input
				type="checkbox"
				id="doctor-override-checkbox"
				checked={isDoctorOverride}
				onChange={(e) => onDoctorOverrideChange(e.target.checked)}
				style={{
					width: "16px",
					height: "16px",
					cursor: "pointer",
					accentColor: "var(--teal)",
				}}
				data-testid="loyalty-doctor-override-checkbox"
			/>
			<label
				htmlFor="doctor-override-checkbox"
				style={{
					fontSize: "0.8125rem",
					color: "var(--ink)",
					cursor: "pointer",
					fontWeight: 600,
					display: "flex",
					alignItems: "center",
					gap: "0.375rem",
				}}
			>
				<ShieldCheck size={15} color="var(--teal)" />
				Привилегия врача / Гарантийная переделка (покрытие до 100% счета бонусами)
			</label>
		</div>
	);
};
