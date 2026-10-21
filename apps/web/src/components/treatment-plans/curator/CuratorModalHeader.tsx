/**
 * apps/web/src/components/treatment-plans/curator/CuratorModalHeader.tsx
 *
 * Шапка модального окна курации с заголовком и тач-кнопкой закрытия (>= 44px).
 */

import React from "react";
import { UserCheck, X } from "lucide-react";

export interface CuratorModalHeaderProps {
	readonly patientName: string;
	readonly treatmentPlanTitle: string;
	readonly onClose: () => void;
}

export const CuratorModalHeader: React.FC<CuratorModalHeaderProps> = ({
	patientName,
	treatmentPlanTitle,
	onClose,
}) => {
	return (
		<div className="curator-modal-header">
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div
					style={{
						width: "44px",
						height: "44px",
						borderRadius: "10px",
						backgroundColor: "rgba(99, 102, 241, 0.12)",
						color: "var(--accent, #6366f1)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<UserCheck className="w-5 h-5" />
				</div>
				<div>
					<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
						Закрепление куратора лечения
					</h3>
					<p style={{ margin: 0, fontSize: "12px", color: "var(--ink-muted, #64748b)" }}>
						{patientName} • {treatmentPlanTitle}
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="curator-pill-btn"
				style={{
					minHeight: "44px",
					minWidth: "44px",
					padding: "10px",
					borderRadius: "50%",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
				}}
				aria-label="Закрыть"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};
