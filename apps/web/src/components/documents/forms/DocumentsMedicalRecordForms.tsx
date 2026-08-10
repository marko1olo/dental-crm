import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function OutpatientMedicalCard025uForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                outpatient025uMedicalCardNumber,
                event,
                setOutpatient025uMedicalCardNumber,
                outpatient025uMedicalCardNumberValue,
                outpatient025uOpenedAt,
                setOutpatient025uOpenedAt,
                recordExtractPeriodStart,
                setRecordExtractPeriodStart,
                recordExtractPeriodEnd,
                setRecordExtractPeriodEnd,
                textarea,
                recordExtractSourceVisitIds,
                setRecordExtractSourceVisitIds,
                dashboard,
                select,
                outpatient025uPatientSexCode,
                setOutpatient025uPatientSexCode,
                normalizedOutpatient025uDemographicCode,
                option,
                outpatient025uCitizenship,
                setOutpatient025uCitizenship,
                documentPatient,
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
                outpatient025uEmploymentCode,
                setOutpatient025uEmploymentCode,
                outpatient025uWorkOrStudyPlace,
                setOutpatient025uWorkOrStudyPlace,
                outpatient025uDisabilityGroup,
                setOutpatient025uDisabilityGroup,
                outpatient025uPalliativeCareNeedCode,
                setOutpatient025uPalliativeCareNeedCode,
                outpatient025uBloodGroup,
                setOutpatient025uBloodGroup,
                outpatient025uRhFactor,
                setOutpatient025uRhFactor,
                outpatient025uKellK1,
                setOutpatient025uKellK1,
                outpatient025uOtherBloodData,
                setOutpatient025uOtherBloodData,
                outpatient025uAllergyHistory,
                setOutpatient025uAllergyHistory,
                recordExtractComplaintAndAnamnesis,
                setRecordExtractComplaintAndAnamnesis,
                compactDocumentText,
                recordExtractObjectiveStatus,
                setRecordExtractObjectiveStatus,
                recordExtractDiagnosis,
                setRecordExtractDiagnosis,
                renderClinicalToothRowsEditor,
                recordExtractTreatmentProvided,
                setRecordExtractTreatmentProvided,
                recordExtractRecommendations,
                setRecordExtractRecommendations,
                recordExtractDoctorFullName,
                setRecordExtractDoctorFullName,
                activeDoctor,
                outpatient025uFinalEpicrisis,
                setOutpatient025uFinalEpicrisis,
                recordExtractPreparedFromSignedRecords,
                setRecordExtractPreparedFromSignedRecords,
                outpatient025uOfficialForm274nChecked,
                setOutpatient025uOfficialForm274nChecked,
                outpatient025uThirdPartyDataChecked,
                setOutpatient025uThirdPartyDataChecked
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Медицинская карта 025/у</h3>
    								<p>
    									Официальная учетная форма по приказу Минздрава N 274н: только
    									карточка пациента, профиль клиники и подписанные записи.
    								</p>
    								<p className="document-payload-note">
    									Черновик этой карты сохраняется локально для выбранного
    									пациента и визита до изменения или выпуска документа.
    								</p>
    							</div>
    							<details
    								className="document-manual-override"
    								style={{
    									background: "var(--surface-100)",
    									padding: "12px 16px",
    									borderRadius: "8px",
    									border: "1px solid var(--line)",
    									marginTop: "16px",
    								}}
    							>
    								<summary
    									style={{
    										cursor: "pointer",
    										fontWeight: 600,
    										color: "var(--brand-700)",
    										userSelect: "none",
    									}}
    								>
    									✏️ Ручная корректировка полей (развернуть)
    								</summary>
    								<div
    									className="document-payload-collapsed-content"
    									style={{
    										marginTop: "16px",
    										display: "flex",
    										flexDirection: "column",
    										gap: "16px",
    									}}
    								>
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
    														normalizedOutpatient025uDemographicCode(
    															event.target.value,
    														),
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
    													documentPatient?.administrativeProfile
    														?.registrationAddress ?? ""
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
    														normalizedOutpatient025uDemographicCode(
    															event.target.value,
    														),
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
    													documentPatient?.administrativeProfile
    														?.residentialAddress ?? ""
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
    														normalizedOutpatient025uDemographicCode(
    															event.target.value,
    														),
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
    												value={
    													documentPatient?.administrativeProfile?.snils ?? ""
    												}
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
    														?.legalRepresentativeFullName ??
    													"ФИО и контакт при наличии"
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
    													setOutpatient025uPalliativeCareNeedCode(
    														event.target.value,
    													)
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
    												setRecordExtractComplaintAndAnamnesis(
    													event.target.value,
    												)
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
    												setRecordExtractPreparedFromSignedRecords(
    													event.target.checked,
    												)
    											}
    										/>
    										Карта 025/у собрана из подписанных медицинских записей
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={outpatient025uOfficialForm274nChecked}
    											type="checkbox"
    											onChange={(event) =>
    												setOutpatient025uOfficialForm274nChecked(
    													event.target.checked,
    												)
    											}
    										/>
    										Структура сверена с приказом Минздрава России от 13.05.2025
    										N 274н
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={outpatient025uThirdPartyDataChecked}
    											type="checkbox"
    											onChange={(event) =>
    												setOutpatient025uThirdPartyDataChecked(
    													event.target.checked,
    												)
    											}
    										/>
    										Лишние данные третьих лиц исключены
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function MedicalRecordExtractForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                recordExtractPeriodStart,
                event,
                setRecordExtractPeriodStart,
                recordExtractPeriodEnd,
                setRecordExtractPeriodEnd,
                textarea,
                recordExtractSourceVisitIds,
                setRecordExtractSourceVisitIds,
                dashboard,
                recordExtractComplaintAndAnamnesis,
                setRecordExtractComplaintAndAnamnesis,
                compactDocumentText,
                recordExtractObjectiveStatus,
                setRecordExtractObjectiveStatus,
                recordExtractDiagnosis,
                setRecordExtractDiagnosis,
                chip,
                button,
                prev,
                renderClinicalToothRowsEditor,
                recordExtractTreatmentProvided,
                setRecordExtractTreatmentProvided,
                recordExtractRecommendations,
                setRecordExtractRecommendations,
                recordExtractDoctorFullName,
                setRecordExtractDoctorFullName,
                activeDoctor,
                recordExtractRecipientFullName,
                setRecordExtractRecipientFullName,
                documentPatient,
                recordExtractRecipientAuthority,
                setRecordExtractRecipientAuthority,
                recordExtractIssuedAt,
                setRecordExtractIssuedAt,
                recordExtractPreparedFromSignedRecords,
                setRecordExtractPreparedFromSignedRecords,
                recordExtractThirdPartyDataChecked,
                setRecordExtractThirdPartyDataChecked
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Выписка из карты</h3>
    								<p>
    									Только сведения из подписанной медзаписи: период, диагноз,
    									лечение, рекомендации и получатель.
    								</p>
    							</div>
    							<details
    								className="document-manual-override"
    								style={{
    									background: "var(--surface-100)",
    									padding: "12px 16px",
    									borderRadius: "8px",
    									border: "1px solid var(--line)",
    									marginTop: "16px",
    								}}
    							>
    								<summary
    									style={{
    										cursor: "pointer",
    										fontWeight: 600,
    										color: "var(--brand-700)",
    										userSelect: "none",
    									}}
    								>
    									✏️ Ручная корректировка полей (развернуть)
    								</summary>
    								<div
    									className="document-payload-collapsed-content"
    									style={{
    										marginTop: "16px",
    										display: "flex",
    										flexDirection: "column",
    										gap: "16px",
    									}}
    								>
    									<div className="document-payload-row">
    										<label>
    											Период с
    											<input
    												value={recordExtractPeriodStart}
    												onChange={(event) =>
    													setRecordExtractPeriodStart(event.target.value)
    												}
    											/>
    										</label>
    										<label>
    											Период по
    											<input
    												value={recordExtractPeriodEnd}
    												onChange={(event) =>
    													setRecordExtractPeriodEnd(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Источники записей
    										<textarea
    											value={recordExtractSourceVisitIds}
    											onChange={(event) =>
    												setRecordExtractSourceVisitIds(event.target.value)
    											}
    											placeholder={
    												dashboard?.activeVisit?.id ??
    												"метки визитов или номера записей, по одной в строке"
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Жалобы и анамнез
    										<textarea
    											value={recordExtractComplaintAndAnamnesis}
    											onChange={(event) =>
    												setRecordExtractComplaintAndAnamnesis(
    													event.target.value,
    												)
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
    										Диагноз
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
    										<div
    											className="quick-chips-row"
    											style={{ flexWrap: "wrap", marginTop: "4px" }}
    										>
    											{EXTRACT_DIAGNOSIS_CHIPS.map((chip) => (
    												<button
    													key={chip}
    													type="button"
    													className="quick-chip quick-chip--sm"
    													onClick={() =>
    														setRecordExtractDiagnosis((prev) =>
    															prev ? `${prev}, ${chip}` : chip,
    														)
    													}
    												>
    													{chip}
    												</button>
    											))}
    										</div>
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
    										Рекомендации
    										<textarea
    											value={recordExtractRecommendations}
    											onChange={(event) =>
    												setRecordExtractRecommendations(event.target.value)
    											}
    											placeholder="назначения, режим, контрольный прием, признаки для срочного обращения"
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
    											Получатель
    											<input
    												value={recordExtractRecipientFullName}
    												onChange={(event) =>
    													setRecordExtractRecipientFullName(event.target.value)
    												}
    												placeholder={
    													documentPatient?.fullName ?? "ФИО пациента"
    												}
    											/>
    										</label>
    									</div>
    									<div className="document-payload-row">
    										<label>
    											Основание выдачи
    											<input
    												value={recordExtractRecipientAuthority}
    												onChange={(event) =>
    													setRecordExtractRecipientAuthority(event.target.value)
    												}
    											/>
    										</label>
    										<label>
    											Дата выписки
    											<input
    												value={recordExtractIssuedAt}
    												onChange={(event) =>
    													setRecordExtractIssuedAt(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label className="document-payload-checkbox">
    										<input
    											checked={recordExtractPreparedFromSignedRecords}
    											type="checkbox"
    											onChange={(event) =>
    												setRecordExtractPreparedFromSignedRecords(
    													event.target.checked,
    												)
    											}
    										/>
    										Выписка собрана из подписанных медицинских записей
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={recordExtractThirdPartyDataChecked}
    											type="checkbox"
    											onChange={(event) =>
    												setRecordExtractThirdPartyDataChecked(
    													event.target.checked,
    												)
    											}
    										/>
    										Лишние данные третьих лиц исключены
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function MedicalRecordCopyRequestForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                textarea,
                copyRequestDocumentTypes,
                event,
                setCopyRequestDocumentTypes,
                input,
                copyRequestPeriodStart,
                setCopyRequestPeriodStart,
                copyRequestPeriodEnd,
                setCopyRequestPeriodEnd,
                select,
                copyRequestFormat,
                setCopyRequestFormat,
                normalizedMedicalDocumentReleaseChannel,
                medicalDocumentReleaseChannelLabels,
                value,
                option,
                copyRequestRecipientFullName,
                setCopyRequestRecipientFullName,
                documentPatient,
                copyRequestRecipientIdentityDocument,
                setCopyRequestRecipientIdentityDocument,
                copyRequestRecipientAuthority,
                setCopyRequestRecipientAuthority,
                copyRequestRepresentativeAuthorityDocument,
                setCopyRequestRepresentativeAuthorityDocument,
                copyRequestRequestedAt,
                setCopyRequestRequestedAt,
                copyRequestContactForDelivery,
                setCopyRequestContactForDelivery,
                copyRequestSpecialInstructions,
                setCopyRequestSpecialInstructions,
                copyRequestIncludeDicomSourceData,
                setCopyRequestIncludeDicomSourceData,
                copyRequestIdentityVerified,
                setCopyRequestIdentityVerified,
                copyRequestThirdPartyDataChecked,
                setCopyRequestThirdPartyDataChecked
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Запрос копий меддокументов</h3>
    								<p>
    									Состав, период, формат, получатель, полномочия и контакт
    									выдачи без пустых полей.
    								</p>
    							</div>
    							<details
    								className="document-manual-override"
    								style={{
    									background: "var(--surface-100)",
    									padding: "12px 16px",
    									borderRadius: "8px",
    									border: "1px solid var(--line)",
    									marginTop: "16px",
    								}}
    							>
    								<summary
    									style={{
    										cursor: "pointer",
    										fontWeight: 600,
    										color: "var(--brand-700)",
    										userSelect: "none",
    									}}
    								>
    									✏️ Ручная корректировка полей (развернуть)
    								</summary>
    								<div
    									className="document-payload-collapsed-content"
    									style={{
    										marginTop: "16px",
    										display: "flex",
    										flexDirection: "column",
    										gap: "16px",
    									}}
    								>
    									<label>
    										Что выдать
    										<textarea
    											value={copyRequestDocumentTypes}
    											onChange={(event) =>
    												setCopyRequestDocumentTypes(event.target.value)
    											}
    											rows={3}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Период с
    											<input
    												value={copyRequestPeriodStart}
    												onChange={(event) =>
    													setCopyRequestPeriodStart(event.target.value)
    												}
    											/>
    										</label>
    										<label>
    											Период по
    											<input
    												value={copyRequestPeriodEnd}
    												onChange={(event) =>
    													setCopyRequestPeriodEnd(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Формат выдачи
    										<select
    											value={copyRequestFormat}
    											onChange={(event) =>
    												setCopyRequestFormat(
    													normalizedMedicalDocumentReleaseChannel(
    														event.target.value,
    													),
    												)
    											}
    										>
    											{(
    												Object.entries(
    													medicalDocumentReleaseChannelLabels,
    												) as Array<[MedicalDocumentReleaseChannel, string]>
    											)?.map(([value, label]) => (
    												<option key={value} value={value}>
    													{label}
    												</option>
    											))}
    										</select>
    									</label>
    									<label>
    										Получатель
    										<input
    											value={copyRequestRecipientFullName}
    											onChange={(event) =>
    												setCopyRequestRecipientFullName(event.target.value)
    											}
    											placeholder={documentPatient?.fullName ?? "ФИО пациента"}
    										/>
    									</label>
    									<label>
    										Документ получателя
    										<input
    											value={copyRequestRecipientIdentityDocument}
    											onChange={(event) =>
    												setCopyRequestRecipientIdentityDocument(
    													event.target.value,
    												)
    											}
    											placeholder={
    												documentPatient?.administrativeProfile
    													?.identityDocument ?? "паспорт / доверенность"
    											}
    										/>
    									</label>
    									<label>
    										Основание полномочий
    										<input
    											value={copyRequestRecipientAuthority}
    											onChange={(event) =>
    												setCopyRequestRecipientAuthority(event.target.value)
    											}
    										/>
    									</label>
    									<label>
    										Документ представителя
    										<input
    											value={copyRequestRepresentativeAuthorityDocument}
    											onChange={(event) =>
    												setCopyRequestRepresentativeAuthorityDocument(
    													event.target.value,
    												)
    											}
    											placeholder="доверенность, свидетельство, законный представитель"
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Дата запроса
    											<input
    												value={copyRequestRequestedAt}
    												onChange={(event) =>
    													setCopyRequestRequestedAt(event.target.value)
    												}
    											/>
    										</label>
    										<label>
    											Контакт и канал
    											<input
    												value={copyRequestContactForDelivery}
    												onChange={(event) =>
    													setCopyRequestContactForDelivery(event.target.value)
    												}
    												placeholder={
    													documentPatient?.phone ??
    													documentPatient?.email ??
    													"телефон, email или портал"
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Особые указания
    										<textarea
    											value={copyRequestSpecialInstructions}
    											onChange={(event) =>
    												setCopyRequestSpecialInstructions(event.target.value)
    											}
    											placeholder="например: выдать исходные файлы снимков, подготовить архив, передать только лично"
    											rows={2}
    										/>
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={copyRequestIncludeDicomSourceData}
    											type="checkbox"
    											onChange={(event) =>
    												setCopyRequestIncludeDicomSourceData(
    													event.target.checked,
    												)
    											}
    										/>
    										Если есть КТ/снимки, запросить исходные файлы снимков
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={copyRequestIdentityVerified}
    											type="checkbox"
    											onChange={(event) =>
    												setCopyRequestIdentityVerified(event.target.checked)
    											}
    										/>
    										Личность получателя проверена
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={copyRequestThirdPartyDataChecked}
    											type="checkbox"
    											onChange={(event) =>
    												setCopyRequestThirdPartyDataChecked(
    													event.target.checked,
    												)
    											}
    										/>
    										Лишние данные третьих лиц будут исключены
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}
