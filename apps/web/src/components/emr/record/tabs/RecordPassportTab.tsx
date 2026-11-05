/**
 * apps/web/src/components/emr/record/tabs/RecordPassportTab.tsx
 *
 * Паспортная часть медицинской карты приёма DENTE CRM.
 * Автономия врача, Чистый живой доменный язык.
 */

import React from "react";
import { User } from "lucide-react";
import type { MedicalRecordData } from "../../types/recordDataTypes";

export interface RecordPassportTabProps {
	formData: MedicalRecordData;
	ageText: string;
}

export type Form043PassportTabProps = RecordPassportTabProps;

export const RecordPassportTab: React.FC<RecordPassportTabProps> = React.memo(
	function RecordPassportTab({ formData, ageText }) {
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
							<div className="emr-studio-field-label">ФИО Пациента:</div>
							<div className="emr-studio-field-value">{p.patientFullName}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Пол и Дата рождения:</div>
							<div className="emr-studio-field-value">
								{p.patientSex === "male" ? "Мужской" : "Женский"}, {p.patientBirthDate} ({ageText})
							</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Номер медицинской карты:</div>
							<div className="emr-studio-field-value font-bold text-sky-700">{p.medicalCardNumber}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Дата открытия карты:</div>
							<div className="emr-studio-field-value">{p.cardOpenedDate}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Документ, удостоверяющий личность:</div>
							<div className="emr-studio-field-value">{p.patientIdentityDocument}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">СНИЛС пациента:</div>
							<div className="emr-studio-field-value">{p.patientSnils || "—"}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Полис ОМС / ДМС:</div>
							<div className="emr-studio-field-value">
								{p.patientInsurancePolicy || "—"} {p.patientInsuranceCompany ? `(${p.patientInsuranceCompany})` : ""}
							</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Контактный телефон:</div>
							<div className="emr-studio-field-value">{p.patientPhone || "—"}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr-studio-field-label">Адрес регистрации и фактического проживания:</div>
							<div className="emr-studio-field-value">{p.patientAddressRegistration}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr-studio-field-label">Диагноз при первичном обращении:</div>
							<div className="emr-studio-field-value font-bold text-sky-800">
								{p.primaryDiagnosisText} [МКБ-10: {p.primaryDiagnosisIcd10}]
							</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Лечащий врач:</div>
							<div className="emr-studio-field-value font-semibold">
								{p.attendingDoctorFullName} ({p.attendingDoctorSpecialty})
							</div>
						</div>
						<div>
							<div className="emr-studio-field-label">СНИЛС лечащего врача:</div>
							<div className="emr-studio-field-value">{p.attendingDoctorSnils || "—"}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const Form043PassportTab = RecordPassportTab;
