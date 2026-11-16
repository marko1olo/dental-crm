/**
 * apps/web/src/components/emr/record/tabs/RecordPassportTab.tsx
 *
 * Паспортная часть медицинской карты приёма DENTE CRM.
 * Автономия врача, Чистый живой доменный язык (Мандаты 8e, 8x, 8am).
 */

import React from "react";
import { User } from "lucide-react";
import type { MedicalRecordData, ClinicalPassportData } from "../../types/recordDataTypes";

export interface RecordPassportTabProps {
	formData: MedicalRecordData;
	ageText: string;
	onUpdatePassport?: ((patch: Partial<ClinicalPassportData>) => void) | undefined;
}

export type Form043PassportTabProps = RecordPassportTabProps;

const inputClass =
	"w-full rounded border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 px-2.5 py-1.5 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder:text-slate-400 focus:border-[var(--teal,#0d9488)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] transition-colors";

export const RecordPassportTab: React.FC<RecordPassportTabProps> = React.memo(
	function RecordPassportTab({ formData, ageText, onUpdatePassport }) {
		const p = formData.passport;
		return (
			<div>
				<div className="emr-studio-card emr-studio-section-card">
					<h3 className="emr-studio-card-title emr-studio-section-card-title flex items-center gap-2">
						<User className="w-4 h-4 text-sky-600" />
						<span>1. Паспортная часть и данные пациента</span>
					</h3>
					<div className="emr-studio-grid-2">
						<div>
							<label className="emr-studio-field-label">ФИО Пациента:</label>
							{onUpdatePassport ? (
								<input
									type="text"
									className={inputClass}
									value={p.patientFullName}
									onChange={(e) => onUpdatePassport({ patientFullName: e.target.value })}
									placeholder="ФИО пациента"
								/>
							) : (
								<div className="emr-studio-field-value">{p.patientFullName}</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Пол и Дата рождения:</label>
							{onUpdatePassport ? (
								<div className="flex items-center gap-2">
									<select
										className={inputClass}
										style={{ width: "110px" }}
										value={p.patientSex}
										onChange={(e) => onUpdatePassport({ patientSex: e.target.value as "male" | "female" })}
									>
										<option value="male">Мужской</option>
										<option value="female">Женский</option>
									</select>
									<input
										type="text"
										className={inputClass}
										value={p.patientBirthDate}
										onChange={(e) => onUpdatePassport({ patientBirthDate: e.target.value })}
										placeholder="ГГГГ-ММ-ДД"
									/>
									<span className="text-[11px] text-[var(--muted,#64748b)] shrink-0">({ageText})</span>
								</div>
							) : (
								<div className="emr-studio-field-value">
									{p.patientSex === "male" ? "Мужской" : "Женский"}, {p.patientBirthDate} ({ageText})
								</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Номер медицинской карты:</label>
							{onUpdatePassport ? (
								<input
									type="text"
									className={`${inputClass} font-bold text-sky-700 dark:text-sky-400`}
									value={p.medicalCardNumber}
									onChange={(e) => onUpdatePassport({ medicalCardNumber: e.target.value })}
									placeholder="Номер карты"
								/>
							) : (
								<div className="emr-studio-field-value font-bold text-sky-700">{p.medicalCardNumber}</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Дата открытия карты:</label>
							{onUpdatePassport ? (
								<input
									type="text"
									className={inputClass}
									value={p.cardOpenedDate}
									onChange={(e) => onUpdatePassport({ cardOpenedDate: e.target.value })}
									placeholder="ДД.ММ.ГГГГ"
								/>
							) : (
								<div className="emr-studio-field-value">{p.cardOpenedDate}</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Документ, удостоверяющий личность:</label>
							{onUpdatePassport ? (
								<input
									type="text"
									className={inputClass}
									value={p.patientIdentityDocument}
									onChange={(e) => onUpdatePassport({ patientIdentityDocument: e.target.value })}
									placeholder="Паспортные данные"
								/>
							) : (
								<div className="emr-studio-field-value">{p.patientIdentityDocument}</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">СНИЛС пациента:</label>
							{onUpdatePassport ? (
								<input
									type="text"
									className={inputClass}
									value={p.patientSnils || ""}
									onChange={(e) => onUpdatePassport({ patientSnils: e.target.value })}
									placeholder="000-000-000 00"
								/>
							) : (
								<div className="emr-studio-field-value">{p.patientSnils || "—"}</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Полис ОМС / ДМС и Страховая компания:</label>
							{onUpdatePassport ? (
								<div className="flex items-center gap-2">
									<input
										type="text"
										className={inputClass}
										value={p.patientInsurancePolicy || ""}
										onChange={(e) => onUpdatePassport({ patientInsurancePolicy: e.target.value })}
										placeholder="Номер полиса"
									/>
									<input
										type="text"
										className={inputClass}
										value={p.patientInsuranceCompany || ""}
										onChange={(e) => onUpdatePassport({ patientInsuranceCompany: e.target.value })}
										placeholder="Страховая компания"
									/>
								</div>
							) : (
								<div className="emr-studio-field-value">
									{p.patientInsurancePolicy || "—"} {p.patientInsuranceCompany ? `(${p.patientInsuranceCompany})` : ""}
								</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Контактный телефон:</label>
							{onUpdatePassport ? (
								<input
									type="tel"
									className={inputClass}
									value={p.patientPhone || ""}
									onChange={(e) => onUpdatePassport({ patientPhone: e.target.value })}
									placeholder="+7 (999) 000-00-00"
								/>
							) : (
								<div className="emr-studio-field-value">{p.patientPhone || "—"}</div>
							)}
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<label className="emr-studio-field-label">Адрес регистрации и фактического проживания:</label>
							{onUpdatePassport ? (
								<input
									type="text"
									className={inputClass}
									value={p.patientAddressRegistration}
									onChange={(e) => onUpdatePassport({ patientAddressRegistration: e.target.value, patientAddressResidence: e.target.value })}
									placeholder="Адрес регистрации / проживания"
								/>
							) : (
								<div className="emr-studio-field-value">{p.patientAddressRegistration}</div>
							)}
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<label className="emr-studio-field-label">Диагноз при первичном обращении:</label>
							{onUpdatePassport ? (
								<div className="flex items-center gap-2">
									<input
										type="text"
										className={`${inputClass} flex-[3] font-semibold`}
										value={p.primaryDiagnosisText}
										onChange={(e) => onUpdatePassport({ primaryDiagnosisText: e.target.value })}
										placeholder="Клинический диагноз"
									/>
									<input
										type="text"
										className={`${inputClass} flex-1 font-bold text-sky-700 dark:text-sky-400`}
										value={p.primaryDiagnosisIcd10}
										onChange={(e) => onUpdatePassport({ primaryDiagnosisIcd10: e.target.value })}
										placeholder="Код МКБ-10 (напр. K02.1)"
									/>
								</div>
							) : (
								<div className="emr-studio-field-value font-bold text-sky-800">
									{p.primaryDiagnosisText} [МКБ-10: {p.primaryDiagnosisIcd10}]
								</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Лечащий врач и Специальность:</label>
							{onUpdatePassport ? (
								<div className="flex items-center gap-2">
									<input
										type="text"
										className={`${inputClass} font-semibold`}
										value={p.attendingDoctorFullName}
										onChange={(e) => onUpdatePassport({ attendingDoctorFullName: e.target.value })}
										placeholder="ФИО врача"
									/>
									<input
										type="text"
										className={inputClass}
										value={p.attendingDoctorSpecialty}
										onChange={(e) => onUpdatePassport({ attendingDoctorSpecialty: e.target.value })}
										placeholder="Специальность"
									/>
								</div>
							) : (
								<div className="emr-studio-field-value font-semibold">
									{p.attendingDoctorFullName} ({p.attendingDoctorSpecialty})
								</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">СНИЛС лечащего врача:</label>
							{onUpdatePassport ? (
								<input
									type="text"
									className={inputClass}
									value={p.attendingDoctorSnils || ""}
									onChange={(e) => onUpdatePassport({ attendingDoctorSnils: e.target.value })}
									placeholder="000-000-000 00"
								/>
							) : (
								<div className="emr-studio-field-value">{p.attendingDoctorSnils || "—"}</div>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const Form043PassportTab = RecordPassportTab;
