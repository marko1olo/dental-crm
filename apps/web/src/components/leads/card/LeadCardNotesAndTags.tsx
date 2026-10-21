/**
 * DENTE Dental CRM — Lead Card Notes & Clinical Tags
 * Mandate 8b (<= 120 lines)
 */

import { FileText, Tag } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadCardNotesAndTagsProps {
	lead: Lead;
}

export const LeadCardNotesAndTags: React.FC<LeadCardNotesAndTagsProps> = ({ lead }) => {
	return (
		<>
			{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 && (
				<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
					{lead.clinicalTags.map((tag) => (
						<span
							key={tag}
							style={{
								fontSize: 10.5,
								fontWeight: 600,
								background: "var(--teal-soft)",
								color: "var(--teal-dark, var(--teal))",
								border: "1px solid var(--teal)",
								padding: "1px 6px",
								borderRadius: 4,
								display: "inline-flex",
								alignItems: "center",
								gap: 3.5,
							}}
							title={`Желаемая услуга / направление: ${tag}`}
						>
							<Tag size={9} />
							<span>Услуга: {tag}</span>
						</span>
					))}
				</div>
			)}

			{lead.notes && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 5,
						fontSize: 11.5,
						color: "var(--muted)",
						background: "var(--paper-soft)",
						padding: "3px 7px",
						borderRadius: 6,
						marginBottom: 6,
						minWidth: 0,
					}}
					title={`Примечание: ${lead.notes}`}
				>
					<FileText size={11} className="shrink-0" style={{ color: "var(--teal)" }} />
					<span
						style={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							minWidth: 0,
						}}
					>
						{lead.notes}
					</span>
				</div>
			)}
		</>
	);
};
