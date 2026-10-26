import React from "react";
import { User } from "lucide-react";
import type { MedicalCardForm043uData } from "../../emr043Types";

export interface Form043PassportTabProps {
	formData: MedicalCardForm043uData;
	ageText: string;
}

export const Form043PassportTab: React.FC<Form043PassportTabProps> = React.memo(
	function Form043PassportTab({ formData, ageText }) {
		const p = formData.passport;
		return (
			<div>
				<div className="emr043-section-card">
					<h3 className="emr043-section-card-title">
						<User className="w-4 h-4 text-sky-600" />
						1. Паспортная часть и данные пациента
					</h3>
					<div className="emr043-grid-2">
						<div>
							<div className="emr043-field-label">ФИО Пациента:</div>
							<div className="emr043-field-value">{p.patientFullName}</div>
						</div>
						<div>
							<div className="emr043-field-label">Пол и Дата рождения:</div>
							<div className="emr043-field-value">
								{p.patientSex === "male" ? "Мужской" : "Женский"}, {p.patientBirthDate} ({ageText})
							</div>
						</div>
						<div>
							<div className="emr043-field-label">Номер медицинской карты:</div>
							<div className="emr043-field-value font-bold text-sky-700">{p.medicalCardNumber}</div>
						</div>
						<div>
							<div className="emr043-field-label">Дата открытия карты:</div>
							<div className="emr043-field-value">{p.cardOpenedDate}</div>
						</div>
						<div>
							<div className="emr043-field-label">Документ, удостоверяющий личность:</div>
							<div className="emr043-field-value">{p.patientIdentityDocument}</div>
						</div>
						<div>
							<div className="emr043-field-label">СНИЛС пациента:</div>
							<div className="emr043-field-value">{p.patientSnils || "—"}</div>
						</div>
						<div>
							<div className="emr043-field-label">Полис ОМС / ДМС:</div>
							<div className="emr043-field-value">
								{p.patientInsurancePolicy || "—"} {p.patientInsuranceCompany ? `(${p.patientInsuranceCompany})` : ""}
							</div>
						</div>
						<div>
							<div className="emr043-field-label">Контактный телефон:</div>
							<div className="emr043-field-value">{p.patientPhone || "—"}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Адрес регистрации и фактического проживания:</div>
							<div className="emr043-field-value">{p.patientAddressRegistration}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Диагноз при первичном обращении:</div>
							<div className="emr043-field-value font-bold text-sky-800">
								{p.primaryDiagnosisText} [МКБ-10: {p.primaryDiagnosisIcd10}]
							</div>
						</div>
						<div>
							<div className="emr043-field-label">Лечащий врач:</div>
							<div className="emr043-field-value font-semibold">
								{p.attendingDoctorFullName} ({p.attendingDoctorSpecialty})
							</div>
						</div>
						<div>
							<div className="emr043-field-label">СНИЛС лечащего врача:</div>
							<div className="emr043-field-value">{p.attendingDoctorSnils || "—"}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const RecordPassportTab = Form043PassportTab;
