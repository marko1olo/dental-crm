/**
 * DENTE Dental CRM — Lead Form Details Fields (Revenue, Notes, Clinical Tags)
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadFormDetailsFieldsProps {
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	fieldStyle: React.CSSProperties;
	rowStyle: React.CSSProperties;
	borderColor: string;
}

const QUICK_SERVICES = [
	"Острая боль",
	"Терапия / Кариес",
	"Профгигиена",
	"Имплантация",
	"Ортопедия / Коронки",
	"Консультация",
] as const;

export const LeadFormDetailsFields: React.FC<LeadFormDetailsFieldsProps> = ({
	editForm,
	setEditForm,
	fieldStyle,
	rowStyle,
	borderColor,
}) => {
	const handleAddService = (service: string) => {
		setEditForm((prev) => {
			const existingTags = Array.isArray(prev.clinicalTags) ? prev.clinicalTags : [];
			const nextTags = existingTags.includes(service)
				? existingTags
				: [...existingTags, service];
			const currentNotes = prev.notes || "";
			const nextNotes = currentNotes ? `${currentNotes}, ${service}` : service;
			return { ...prev, clinicalTags: nextTags, notes: nextNotes };
		});
	};

	return (
		<>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-revenue" style={{ fontSize: 13, color: "var(--muted)" }}>
					Ожидаемая выручка (₽)
				</label>
				<input
					id="edit-lead-revenue"
					type="text"
					value={editForm.expectedRevenue || ""}
					onChange={(e) => setEditForm({ ...editForm, expectedRevenue: e.target.value })}
					placeholder="15000"
					style={fieldStyle}
				/>
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-notes" style={{ fontSize: 13, color: "var(--muted)" }}>
					Желаемая услуга / Жалобы / Примечания
				</label>
				<textarea
					id="edit-lead-notes"
					rows={2}
					value={editForm.notes || ""}
					onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
					placeholder="Например: острая боль, интересует имплантация, запись после 18:00..."
					style={{ ...fieldStyle, resize: "vertical", fontSize: 13 }}
				/>
				<div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
					{QUICK_SERVICES.map((service) => (
						<button
							key={service}
							type="button"
							onClick={() => handleAddService(service)}
							className="secondary-button"
							style={{
								fontSize: 11,
								padding: "2px 8px",
								height: 24,
								minHeight: 24,
								borderRadius: 6,
								background: "var(--paper-soft)",
								color: "var(--teal)",
								border: `1px solid ${borderColor}`,
								cursor: "pointer",
							}}
						>
							+ {service}
						</button>
					))}
				</div>
			</div>
		</>
	);
};
