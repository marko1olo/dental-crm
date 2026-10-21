/**
 * DENTE Dental CRM — Lead Card Header Component
 * Mandate 8b (<= 120 lines)
 */

import { Edit2 } from "lucide-react";
import type React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadCardHeaderProps {
	lead: Lead;
	onEdit: (lead: Lead) => void;
}

export const LeadCardHeader: React.FC<LeadCardHeaderProps> = ({
	lead,
	onEdit,
}) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "flex-start",
				marginBottom: "4px",
				gap: 6,
			}}
		>
			<strong
				style={{
					fontSize: 15,
					color: "var(--ink)",
					display: "flex",
					alignItems: "center",
					gap: 6,
					minWidth: 0,
					wordBreak: "break-word",
					overflowWrap: "anywhere",
					flex: 1,
				}}
			>
				{lead.name}
			</strong>
			<div
				style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}
			>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onEdit(lead);
					}}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						padding: 3,
						borderRadius: 4,
						color: "var(--muted)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					title="Редактировать обращение"
					aria-label="Редактировать обращение"
				>
					<Edit2 size={14} style={{ opacity: 0.7 }} />
				</button>
			</div>
		</div>
	);
};
