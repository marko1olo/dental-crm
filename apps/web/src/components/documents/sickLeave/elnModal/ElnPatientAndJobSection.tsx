import React from "react";
import { UserCheck } from "lucide-react";
import type { ElnPatientAndJobSectionProps } from "./types";

export function ElnPatientAndJobSection({
	patientData,
	onPatientDataChange
}: ElnPatientAndJobSectionProps) {
	return (
		<div className="sick-leave-section">
			<h4 className="sick-leave-section-title">
				<UserCheck size={16} />
				Реквизиты пациента и работодателя
			</h4>
			<div className="sick-leave-grid-3">
				<div className="sick-leave-field">
					<label className="sick-leave-label">ФИО Пациента</label>
					<input
						type="text"
						className="sick-leave-input"
						value={patientData.patientFio}
						onChange={(e) =>
							onPatientDataChange((prev) => ({ ...prev, patientFio: e.target.value }))
						}
					/>
				</div>
				<div className="sick-leave-field">
					<label className="sick-leave-label">СНИЛС (11 цифр)</label>
					<input
						type="text"
						className="sick-leave-input"
						value={patientData.patientSnils}
						onChange={(e) =>
							onPatientDataChange((prev) => ({ ...prev, patientSnils: e.target.value }))
						}
					/>
				</div>
				<div className="sick-leave-field">
					<label className="sick-leave-label">Дата рождения</label>
					<input
						type="date"
						className="sick-leave-input"
						value={patientData.patientBirthDate}
						onChange={(e) =>
							onPatientDataChange((prev) => ({ ...prev, patientBirthDate: e.target.value }))
						}
					/>
				</div>
			</div>

			<div className="sick-leave-grid-2">
				<div className="sick-leave-field">
					<label className="sick-leave-label">Место работы (Наименование организации)</label>
					<input
						type="text"
						className="sick-leave-input"
						value={patientData.employerName}
						onChange={(e) =>
							onPatientDataChange((prev) => ({ ...prev, employerName: e.target.value }))
						}
					/>
				</div>
				<div className="sick-leave-field">
					<label className="sick-leave-label">Вид занятости</label>
					<select
						className="sick-leave-select"
						value={patientData.isPrimaryWorkplace ? 'primary' : 'secondary'}
						onChange={(e) =>
							onPatientDataChange((prev) => ({
								...prev,
								isPrimaryWorkplace: e.target.value === 'primary'
							}))
						}
					>
						<option value="primary">Основное место работы</option>
						<option value="secondary">По совместительству</option>
					</select>
				</div>
			</div>
		</div>
	);
}
