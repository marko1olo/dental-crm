/**
 * DENTE Dental CRM — Lead Form Input Fields
 * Fast 10-Second Intake from Call: Name, Phone, Source, Revenue, Notes, Status
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadFormFieldsProps {
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	borderColor: string;
	colBg: string;
}

export const LeadFormFields: React.FC<LeadFormFieldsProps> = ({ editForm, setEditForm, borderColor, colBg }) => {
	const fieldStyle: React.CSSProperties = {
		padding: 10, borderRadius: 8, border: `1px solid ${borderColor}`, background: colBg, color: "var(--ink)",
	};
	const rowStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

	return (
		<>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-name" style={{ fontSize: 13, color: "var(--muted)" }}>Имя пациента / лида</label>
				<input id="edit-lead-name" type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Иван Иванов" style={fieldStyle} required />
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-phone" style={{ fontSize: 13, color: "var(--muted)" }}>Телефон</label>
				<input id="edit-lead-phone" type="tel" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+7 (999) 123-45-67" style={fieldStyle} />
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-source" style={{ fontSize: 13, color: "var(--muted)" }}>Источник (Откуда пришел)</label>
				<input id="edit-lead-source" type="text" value={editForm.source || ""} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} placeholder="Яндекс.Директ, 2ГИС, Сайт, Рекомендация..." style={fieldStyle} />
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-revenue" style={{ fontSize: 13, color: "var(--muted)" }}>Ожидаемая выручка (₽)</label>
				<input id="edit-lead-revenue" type="text" value={editForm.expectedRevenue || ""} onChange={(e) => setEditForm({ ...editForm, expectedRevenue: e.target.value })} placeholder="15000" style={fieldStyle} />
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-notes" style={{ fontSize: 13, color: "var(--muted)" }}>Пожелания / Жалобы / Примечания</label>
				<textarea id="edit-lead-notes" rows={3} value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Например: острая боль, интересует имплантация, запись после 18:00..." style={{ ...fieldStyle, resize: "vertical", fontSize: 13 }} />
			</div>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-status" style={{ fontSize: 13, color: "var(--muted)" }}>Статус в воронке</label>
				<select id="edit-lead-status" value={editForm.status || "new"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Lead["status"] })} style={{ ...fieldStyle, cursor: "pointer" }}>
					<option value="new">Новые обращения</option>
					<option value="contacted">Думают / Перезвонить</option>
					<option value="consult_booked">Записаны на приём</option>
					<option value="showed_up">Дошли до клиники</option>
					<option value="no_answer">Недозвон</option>
					<option value="trash">Не дошли / Архив</option>
				</select>
			</div>
			{editForm.status === "trash" && (
				<div style={rowStyle}>
					<label htmlFor="edit-lead-drop-reason" style={{ fontSize: 13, color: "var(--muted)" }}>Причина срыва / отказа</label>
					<select id="edit-lead-drop-reason" value={editForm.dropReason || "Дорого"} onChange={(e) => setEditForm({ ...editForm, dropReason: e.target.value })} style={{ ...fieldStyle, cursor: "pointer" }}>
						<option value="Дорого">Дорого</option>
						<option value="Далеко / Неудобная локация">Далеко / Неудобная локация</option>
						<option value="Передумал / Неактуально">Передумал / Неактуально</option>
						<option value="Дубль обращения">Дубль обращения</option>
						<option value="Другое">Другое</option>
					</select>
				</div>
			)}
		</>
	);
};
