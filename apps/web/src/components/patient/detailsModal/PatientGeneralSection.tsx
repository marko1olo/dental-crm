import React, { useId } from "react";
import type { PatientGeneralInfo } from "../../patients/tabs/PatientGeneralInfoTab";

export interface PatientGeneralSectionProps {
	readonly patientData: PatientGeneralInfo;
	readonly onUpdateField: (field: keyof PatientGeneralInfo, value: unknown) => void;
}

export const PatientGeneralSection: React.FC<PatientGeneralSectionProps> = ({
	patientData,
	onUpdateField,
}) => {
	const fullNameInputId = useId();
	const phoneInputId = useId();
	const birthDateInputId = useId();
	const genderSelectId = useId();
	const addressInputId = useId();
	const notesInputId = useId();

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label htmlFor={fullNameInputId} className="text-xs font-semibold text-[var(--ink)] block mb-1">
						ФИО пациента: <span className="text-rose-500">*</span>
					</label>
					<input
						id={fullNameInputId}
						data-testid="patient-input-fullname"
						type="text"
						placeholder="Фамилия Имя Отчество"
						value={patientData.fullName || ""}
						onChange={(e) => onUpdateField("fullName", e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] transition-colors"
					/>
				</div>
				<div>
					<label htmlFor={phoneInputId} className="text-xs font-semibold text-[var(--ink)] block mb-1">
						Номер телефона:
					</label>
					<input
						id={phoneInputId}
						data-testid="patient-input-phone"
						type="tel"
						placeholder="+7 (___) ___-__-__"
						value={patientData.phone || ""}
						onChange={(e) => onUpdateField("phone", e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-mono outline-none focus:border-[var(--teal)] transition-colors"
					/>
				</div>
				<div>
					<label htmlFor={birthDateInputId} className="text-xs font-semibold text-[var(--ink)] block mb-1">
						Дата рождения:
					</label>
					<input
						id={birthDateInputId}
						data-testid="patient-input-birthdate"
						type="date"
						value={patientData.birthDate || ""}
						onChange={(e) => onUpdateField("birthDate", e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:border-[var(--teal)] transition-colors"
					/>
				</div>
				<div>
					<label htmlFor={genderSelectId} className="text-xs font-semibold text-[var(--ink)] block mb-1">
						Пол:
					</label>
					<select
						id={genderSelectId}
						value={patientData.gender || "other"}
						onChange={(e) => onUpdateField("gender", e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:border-[var(--teal)] transition-colors cursor-pointer"
					>
						<option value="male">Мужской</option>
						<option value="female">Женский</option>
						<option value="other">Не указан</option>
					</select>
				</div>
			</div>
			<div>
				<label htmlFor={addressInputId} className="text-xs font-semibold text-[var(--ink)] block mb-1">
					Адрес регистрации или проживания:
				</label>
				<input
					id={addressInputId}
					data-testid="patient-input-address"
					type="text"
					placeholder="г. Москва, ул. Ленина, д. 10, кв. 5"
					value={patientData.address || ""}
					onChange={(e) => onUpdateField("address", e.target.value)}
					className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:border-[var(--teal)] transition-colors"
				/>
			</div>
			<div>
				<label htmlFor={notesInputId} className="text-xs font-semibold text-[var(--ink)] block mb-1">
					Заметки и особенности:
				</label>
				<textarea
					id={notesInputId}
					rows={3}
					placeholder="Пожелания пациента, особенности общения, график..."
					value={patientData.notes || ""}
					onChange={(e) => onUpdateField("notes", e.target.value)}
					className="w-full p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs outline-none focus:border-[var(--teal)] transition-colors"
				/>
			</div>
		</div>
	);
};
