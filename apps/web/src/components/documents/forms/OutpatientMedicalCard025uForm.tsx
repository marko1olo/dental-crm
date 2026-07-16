import React from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useDocumentStore } from "../../../store/documentStore";

export interface OutpatientMedicalCard025uFormProps {
	dashboard: any;
	documentPatient: any;
	activeDoctor: any;
}

export function OutpatientMedicalCard025uForm({
	dashboard,
	documentPatient,
	activeDoctor,
}: OutpatientMedicalCard025uFormProps) {
	const {
		outpatient025uMedicalCardNumberValue,
		normalizedOutpatient025uDemographicCode,
		compactDocumentText,
		renderClinicalToothRowsEditor,
	} = useAppLogicContext();

	const {
		setOutpatient025uEmploymentCode,
		setOutpatient025uDisabilityGroup,
		setOutpatient025uWorkOrStudyPlace,
		setOutpatient025uPalliativeCareNeedCode,
		setOutpatient025uBloodGroup,
		setOutpatient025uRhFactor,
		setOutpatient025uKellK1,
		setOutpatient025uOtherBloodData,
		setOutpatient025uAllergyHistory,
		setOutpatient025uFinalEpicrisis,
		setOutpatient025uOfficialForm274nChecked,
		setOutpatient025uThirdPartyDataChecked,
		outpatient025uEmploymentCode,
		outpatient025uDisabilityGroup,
		outpatient025uWorkOrStudyPlace,
		outpatient025uPalliativeCareNeedCode,
		outpatient025uBloodGroup,
		outpatient025uRhFactor,
		outpatient025uKellK1,
		outpatient025uOtherBloodData,
		outpatient025uAllergyHistory,
		outpatient025uFinalEpicrisis,
		outpatient025uOfficialForm274nChecked,
		outpatient025uThirdPartyDataChecked,
		recordExtractPeriodStart,
		setRecordExtractPeriodStart,
		recordExtractPeriodEnd,
		setRecordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		setRecordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		setRecordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		setRecordExtractObjectiveStatus,
		recordExtractDiagnosis,
		setRecordExtractDiagnosis,
		recordExtractTreatmentProvided,
		setRecordExtractTreatmentProvided,
		recordExtractRecommendations,
		setRecordExtractRecommendations,
		recordExtractDoctorFullName,
		setRecordExtractDoctorFullName,
		recordExtractPreparedFromSignedRecords,
		setRecordExtractPreparedFromSignedRecords,
		outpatient025uMedicalCardNumber,
		setOutpatient025uMedicalCardNumber,
		outpatient025uOpenedAt,
		setOutpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		setOutpatient025uPatientSexCode,
		outpatient025uCitizenship,
		setOutpatient025uCitizenship,
		outpatient025uRegistrationUrbanRuralCode,
		setOutpatient025uRegistrationUrbanRuralCode,
		outpatient025uStayUrbanRuralCode,
		setOutpatient025uStayUrbanRuralCode,
		outpatient025uOmsIssuedAt,
		setOutpatient025uOmsIssuedAt,
		outpatient025uInsurerName,
		setOutpatient025uInsurerName,
		outpatient025uSocialSupportCode,
		setOutpatient025uSocialSupportCode,
		outpatient025uHealthStatusDisclosureContact,
		setOutpatient025uHealthStatusDisclosureContact,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Медицинская карта 025/у</h3>
				<p>
					Официальная учетная форма по приказу Минздрава N 274н: только карточка
					пациента, профиль клиники и подписанные записи.
				</p>
				<p className="document-payload-note">
					Черновик этой карты сохраняется локально для выбранного пациента и
					визита до изменения или выпуска документа.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<div className="document-payload-row">
						<label>
							Номер карты
							<input
								value={outpatient025uMedicalCardNumber}
								onChange={(event) =>
									setOutpatient025uMedicalCardNumber(event.target.value)
								}
								placeholder={outpatient025uMedicalCardNumberValue()}
							/>
						</label>
						<label>
							Дата открытия
							<input
								type="date"
								value={outpatient025uOpenedAt}
								onChange={(event) =>
									setOutpatient025uOpenedAt(event.target.value)
								}
							/>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Период с
							<input
								type="date"
								value={recordExtractPeriodStart}
								onChange={(event) =>
									setRecordExtractPeriodStart(event.target.value)
								}
							/>
						</label>
						<label>
							Период по
							<input
								type="date"
								value={recordExtractPeriodEnd}
								onChange={(event) =>
									setRecordExtractPeriodEnd(event.target.value)
								}
							/>
						</label>
					</div>
					<label>
						Источники подписанных записей
						<textarea
							value={recordExtractSourceVisitIds}
							onChange={(event) =>
								setRecordExtractSourceVisitIds(event.target.value)
							}
							placeholder={
								dashboard?.activeVisit?.id ??
								"метки подписанных визитов, по одной в строке"
							}
							rows={2}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Пол пациента
							<select
								value={outpatient025uPatientSexCode}
								onChange={(event) =>
									setOutpatient025uPatientSexCode(
										normalizedOutpatient025uDemographicCode(event.target.value),
									)
								}
							>
								<option value="unknown">не указано</option>
								<option value="1">мужской</option>
								<option value="2">женский</option>
							</select>
						</label>
						<label>
							Гражданство
							<input
								value={outpatient025uCitizenship}
								onChange={(event) =>
									setOutpatient025uCitizenship(event.target.value)
								}
								placeholder="например: Российская Федерация"
							/>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Адрес регистрации
							<input
								value={
									documentPatient?.administrativeProfile?.registrationAddress ??
									""
								}
								readOnly
								placeholder="из карточки пациента"
							/>
						</label>
						<label>
							Тип местности регистрации
							<select
								value={outpatient025uRegistrationUrbanRuralCode}
								onChange={(event) =>
									setOutpatient025uRegistrationUrbanRuralCode(
										normalizedOutpatient025uDemographicCode(event.target.value),
									)
								}
							>
								<option value="unknown">не указано</option>
								<option value="1">город</option>
								<option value="2">село</option>
							</select>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Адрес пребывания
							<input
								value={
									documentPatient?.administrativeProfile?.residentialAddress ??
									""
								}
								readOnly
								placeholder="из карточки пациента"
							/>
						</label>
						<label>
							Тип местности пребывания
							<select
								value={outpatient025uStayUrbanRuralCode}
								onChange={(event) =>
									setOutpatient025uStayUrbanRuralCode(
										normalizedOutpatient025uDemographicCode(event.target.value),
									)
								}
							>
								<option value="unknown">не указано</option>
								<option value="1">город</option>
								<option value="2">село</option>
							</select>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Полис ОМС
							<input
								value={
									documentPatient?.administrativeProfile
										?.insurancePolicyNumber ?? ""
								}
								readOnly
								placeholder="из карточки пациента"
							/>
						</label>
						<label>
							Дата выдачи ОМС
							<input
								type="date"
								value={outpatient025uOmsIssuedAt}
								onChange={(event) =>
									setOutpatient025uOmsIssuedAt(event.target.value)
								}
							/>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Страховая организация
							<input
								value={outpatient025uInsurerName}
								onChange={(event) =>
									setOutpatient025uInsurerName(event.target.value)
								}
							/>
						</label>
						<label>
							СНИЛС
							<input
								value={documentPatient?.administrativeProfile?.snils ?? ""}
								readOnly
								placeholder="из карточки пациента"
							/>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Код льгот
							<input
								value={outpatient025uSocialSupportCode}
								onChange={(event) =>
									setOutpatient025uSocialSupportCode(event.target.value)
								}
							/>
						</label>
						<label>
							Кому сообщать сведения
							<input
								value={outpatient025uHealthStatusDisclosureContact}
								onChange={(event) =>
									setOutpatient025uHealthStatusDisclosureContact(
										event.target.value,
									)
								}
								placeholder={
									documentPatient?.administrativeProfile
										?.legalRepresentativeFullName ?? "ФИО и контакт при наличии"
								}
							/>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Занятость
							<input
								value={outpatient025uEmploymentCode}
								onChange={(event) =>
									setOutpatient025uEmploymentCode(event.target.value)
								}
								placeholder="код или текст"
							/>
						</label>
						<label>
							Место работы/учебы
							<input
								value={outpatient025uWorkOrStudyPlace}
								onChange={(event) =>
									setOutpatient025uWorkOrStudyPlace(event.target.value)
								}
							/>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Инвалидность
							<input
								value={outpatient025uDisabilityGroup}
								onChange={(event) =>
									setOutpatient025uDisabilityGroup(event.target.value)
								}
							/>
						</label>
						<label>
							Паллиативная помощь
							<input
								value={outpatient025uPalliativeCareNeedCode}
								onChange={(event) =>
									setOutpatient025uPalliativeCareNeedCode(event.target.value)
								}
							/>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Группа крови
							<input
								value={outpatient025uBloodGroup}
								onChange={(event) =>
									setOutpatient025uBloodGroup(event.target.value)
								}
							/>
						</label>
						<label>
							Rh
							<input
								value={outpatient025uRhFactor}
								onChange={(event) =>
									setOutpatient025uRhFactor(event.target.value)
								}
							/>
						</label>
						<label>
							Kell K1
							<input
								value={outpatient025uKellK1}
								onChange={(event) =>
									setOutpatient025uKellK1(event.target.value)
								}
							/>
						</label>
					</div>
					<label>
						Другие данные крови
						<textarea
							value={outpatient025uOtherBloodData}
							onChange={(event) =>
								setOutpatient025uOtherBloodData(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Аллергологический анамнез
						<textarea
							value={outpatient025uAllergyHistory}
							onChange={(event) =>
								setOutpatient025uAllergyHistory(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Жалобы и анамнез
						<textarea
							value={recordExtractComplaintAndAnamnesis}
							onChange={(event) =>
								setRecordExtractComplaintAndAnamnesis(event.target.value)
							}
							placeholder={
								compactDocumentText(
									dashboard?.activeVisit?.complaint,
									dashboard?.activeVisit?.anamnesis,
								) || "из подписанной записи визита"
							}
							rows={3}
						/>
					</label>
					<label>
						Объективный статус
						<textarea
							value={recordExtractObjectiveStatus}
							onChange={(event) =>
								setRecordExtractObjectiveStatus(event.target.value)
							}
							placeholder={
								dashboard?.activeVisit?.objectiveStatus ??
								"из подписанной записи визита"
							}
							rows={3}
						/>
					</label>
					<label>
						Заключительный диагноз
						<textarea
							value={recordExtractDiagnosis}
							onChange={(event) =>
								setRecordExtractDiagnosis(event.target.value)
							}
							placeholder={
								dashboard?.activeVisit?.diagnosis ??
								"только после врачебной проверки"
							}
							rows={2}
						/>
					</label>
					{renderClinicalToothRowsEditor()}
					<label>
						Проведенное лечение
						<textarea
							value={recordExtractTreatmentProvided}
							onChange={(event) =>
								setRecordExtractTreatmentProvided(event.target.value)
							}
							placeholder={
								compactDocumentText(
									dashboard?.activeVisit?.doctorSummary,
									dashboard?.activeVisit?.treatmentPlan,
								) || "из подписанной записи визита"
							}
							rows={3}
						/>
					</label>
					<label>
						Назначения и рекомендации
						<textarea
							value={recordExtractRecommendations}
							onChange={(event) =>
								setRecordExtractRecommendations(event.target.value)
							}
							placeholder="назначения, режим, контроль, срочные признаки"
							rows={3}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Врач
							<input
								value={recordExtractDoctorFullName}
								onChange={(event) =>
									setRecordExtractDoctorFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "лечащий врач"}
							/>
						</label>
						<label>
							Итоговый эпикриз
							<input
								value={outpatient025uFinalEpicrisis}
								onChange={(event) =>
									setOutpatient025uFinalEpicrisis(event.target.value)
								}
							/>
						</label>
					</div>
					<label className="document-payload-checkbox">
						<input
							checked={recordExtractPreparedFromSignedRecords}
							type="checkbox"
							onChange={(event) =>
								setRecordExtractPreparedFromSignedRecords(event.target.checked)
							}
						/>
						Карта 025/у собрана из подписанных медицинских записей
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={outpatient025uOfficialForm274nChecked}
							type="checkbox"
							onChange={(event) =>
								setOutpatient025uOfficialForm274nChecked(event.target.checked)
							}
						/>
						Структура сверена с приказом Минздрава России от 13.05.2025 N 274н
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={outpatient025uThirdPartyDataChecked}
							type="checkbox"
							onChange={(event) =>
								setOutpatient025uThirdPartyDataChecked(event.target.checked)
							}
						/>
						Лишние данные третьих лиц исключены
					</label>
				</div>
			</details>
		</article>
	);
}
