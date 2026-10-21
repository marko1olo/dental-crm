/**
 * DENTE Dental CRM — Lead Form Status and Drop Reason Fields
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";

interface LeadFormStatusFieldsProps {
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	fieldStyle: React.CSSProperties;
	rowStyle: React.CSSProperties;
}

export const LeadFormStatusFields: React.FC<LeadFormStatusFieldsProps> = ({
	editForm,
	setEditForm,
	fieldStyle,
	rowStyle,
}) => {
	return (
		<>
			<div style={rowStyle}>
				<label htmlFor="edit-lead-status" style={{ fontSize: 13, color: "var(--muted)" }}>
					Статус в воронке
				</label>
				<select
					id="edit-lead-status"
					value={editForm.status || "new"}
					onChange={(e) =>
						setEditForm({
							...editForm,
							status: e.target.value as Lead["status"],
						})
					}
					style={{ ...fieldStyle, cursor: "pointer" }}
				>
					<option value="new">Новые заявки</option>
					<option value="contacted">В обработке / Звонок</option>
					<option value="consult_booked">Записаны на приём</option>
					<option value="showed_up">Дошли до клиники</option>
					<option value="no_answer">Недозвон</option>
					<option value="trash">Архив / Нецелевой</option>
				</select>
			</div>
			{editForm.status === "trash" && (
				<div style={rowStyle}>
					<label htmlFor="edit-lead-drop-reason" style={{ fontSize: 13, color: "var(--muted)" }}>
						Причина срыва / отказа
					</label>
					<select
						id="edit-lead-drop-reason"
						value={editForm.dropReason || "Дорого"}
						onChange={(e) =>
							setEditForm({ ...editForm, dropReason: e.target.value })
						}
						style={{ ...fieldStyle, cursor: "pointer" }}
					>
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
