/**
 * DENTE Dental CRM — Lead Form Contact Fields (Name, Phone, Source)
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadFormContactFieldsProps {
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	fieldStyle: React.CSSProperties;
	rowStyle: React.CSSProperties;
	borderColor: string;
}

const QUICK_SOURCES = ["Яндекс Карты", "2ГИС", "Сайт", "Рекомендация", "Прямой звонок"] as const;

export const LeadFormContactFields: React.FC<LeadFormContactFieldsProps> = ({
	editForm,
	setEditForm,
	fieldStyle,
	rowStyle,
	borderColor,
}) => {
	return (
		<>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-name" style={{ fontSize: 13, color: "var(--muted)" }}>
					Имя пациента / лида
				</label>
				<input
					id="edit-lead-name"
					type="text"
					value={editForm.name || ""}
					onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
					placeholder="Иван Иванов"
					style={fieldStyle}
					required
				/>
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-phone" style={{ fontSize: 13, color: "var(--muted)" }}>
					Телефон
				</label>
				<input
					id="edit-lead-phone"
					type="tel"
					value={editForm.phone || ""}
					onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
					placeholder="+7 (999) 123-45-67"
					style={fieldStyle}
				/>
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-source" style={{ fontSize: 13, color: "var(--muted)" }}>
					Источник (Откуда пришел)
				</label>
				<input
					id="edit-lead-source"
					type="text"
					value={editForm.source || ""}
					onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
					placeholder="Яндекс Карты, 2ГИС, Сайт, Рекомендация..."
					style={fieldStyle}
				/>
				<div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
					{QUICK_SOURCES.map((src) => (
						<button
							key={src}
							type="button"
							onClick={() => setEditForm((prev) => ({ ...prev, source: src }))}
							className="secondary-button"
							style={{
								fontSize: 11,
								padding: "2px 8px",
								height: 24,
								minHeight: 24,
								borderRadius: 6,
								background: editForm.source === src ? "var(--teal-soft)" : "var(--paper-soft)",
								color: editForm.source === src ? "var(--teal)" : "var(--muted)",
								border: `1px solid ${editForm.source === src ? "var(--teal)" : borderColor}`,
								cursor: "pointer",
							}}
						>
							{src}
						</button>
					))}
				</div>
			</div>
		</>
	);
};
