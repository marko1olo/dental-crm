/**
 * apps/web/src/components/treatment-plans/curator/CuratorNotesField.tsx
 *
 * Блок ввода даты следующего контакта и заметок куратора.
 */

import React from "react";

export interface CuratorNotesFieldProps {
	readonly nextContactDate: string;
	readonly onChangeNextContactDate: (date: string) => void;
	readonly notes: string;
	readonly onChangeNotes: (notes: string) => void;
}

export const CuratorNotesField: React.FC<CuratorNotesFieldProps> = ({
	nextContactDate,
	onChangeNextContactDate,
	notes,
	onChangeNotes,
}) => {
	return (
		<>
			<div className="curator-form-group">
				<label className="curator-form-label" htmlFor="curator-contact-date">
					Дата следующего контакта / звонка
				</label>
				<input
					id="curator-contact-date"
					type="date"
					value={nextContactDate}
					onChange={(e) => onChangeNextContactDate(e.target.value)}
					className="curator-form-input"
					style={{ minHeight: "44px" }}
				/>
			</div>

			<div className="curator-form-group">
				<label className="curator-form-label" htmlFor="curator-notes">
					Комментарии и договоренности с пациентом
				</label>
				<textarea
					id="curator-notes"
					rows={3}
					value={notes}
					onChange={(e) => onChangeNotes(e.target.value)}
					placeholder="Например: Пациент рассматривает рассрочку на 6 месяцев, ждет согласования..."
					className="curator-form-input"
					style={{ minHeight: "80px", resize: "vertical" }}
				/>
			</div>
		</>
	);
};
