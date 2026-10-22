import type { MedicalWasteClass, MedicalWasteOperationType } from "@dental/shared";
import React from "react";

export interface WasteClassFieldsProps {
	formOpType: MedicalWasteOperationType;
	setFormOpType: (v: MedicalWasteOperationType) => void;
	formWasteClass: MedicalWasteClass;
	onWasteClassChange: (c: MedicalWasteClass) => void;
	formDescription: string;
	setFormDescription: (v: string) => void;
}

export function MedicalWasteClassFields(p: WasteClassFieldsProps) {
	return (
		<>
			<div className="sanpin-form-row">
				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Тип операции</label>
					<select
						value={p.formOpType}
						onChange={(e) => p.setFormOpType(e.target.value as MedicalWasteOperationType)}
						className="sanpin-select"
					>
						<option value="accumulation">Накопление / Образование отходов в кабинете</option>
						<option value="disinfection_on_site">Обеззараживание на месте в клинике</option>
						<option value="transfer_to_disposal_company">Вывоз специализированной компанией</option>
					</select>
				</div>

				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Класс отходов</label>
					<select
						value={p.formWasteClass}
						onChange={(e) => p.onWasteClassChange(e.target.value as MedicalWasteClass)}
						className="sanpin-select"
					>
						<option value="class_B">Класс Б — Эпидемически опасные (Желтый цвет)</option>
						<option value="class_A">Класс А — Безопасные (Белый цвет)</option>
						<option value="class_G">Класс Г — Токсичные (Ртутные лампы, дезсредства)</option>
						<option value="class_V">Класс В — Чрезвычайно опасные (Красный цвет)</option>
					</select>
				</div>
			</div>

			<div className="sanpin-form-group">
				<label className="sanpin-form-label">Описание состава отходов</label>
				<input
					type="text"
					required
					value={p.formDescription}
					onChange={(e) => p.setFormDescription(e.target.value)}
					className="sanpin-input"
				/>
			</div>
		</>
	);
}
