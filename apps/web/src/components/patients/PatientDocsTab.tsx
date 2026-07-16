import React, { useState, useId } from "react";
import { usePatientStore } from "../../store/patientStore";
import { Dashboard } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { ShieldCheck } from "lucide-react";
import { PatientsViewProps } from "../../PatientsView";
import { formatPhoneNumber } from "../../utils/inputSanitation";

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;

export function PatientDocsTab({ props }: { props: PatientsViewProps }) {
    const {
        selectedPatientId,
        patientAdministrativeProfileDraft, patientAdministrativeProfileSaveState, patientAdministrativeProfileDirty
    } = usePatientStore();
    const { savePatientAdministrativeProfile, updatePatientAdministrativeProfileDraft, patientAdministrativeProfileValidationMessage, weekdayOptions, normalizeOptionalWorkingDaysDraft } = props;
    const patientAdministrativeProfileReadyToSave = patientAdministrativeProfileDirty;
    const [insuranceContracts, setInsuranceContracts] = useState<any[]>([]);

    const togglePatientAdministrativeProfileWorkingDay = (day: number) => {
        const days = patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
        if (days.includes(day)) {
            updatePatientAdministrativeProfileDraft("preferredAppointmentWeekdays", days.filter((d) => d !== day));
        } else {
            updatePatientAdministrativeProfileDraft("preferredAppointmentWeekdays", [...days, day]);
        }
    };
	
	const patientAdministrativeSaveGuidanceId = useId();
	const patientAdministrativeSaveGuidance = patientAdministrativeProfileSaveState === "error" 
	    ? patientAdministrativeProfileValidationMessage 
		: patientAdministrativeProfileSaveState === "saved" ? "Сохранено" : null;

    return (
        <>
						<details className="settings-advanced-block patient-docs-collapsible">
							<summary className="settings-advanced-toggle">
								<span className="settings-advanced-label">
									<span className="settings-advanced-icon">📝</span>
									Реквизиты и пожелания для документов
								</span>
								<span className="settings-advanced-hint">
									Паспорт, ИНН, представитель, удобное время
								</span>
								<span className="settings-advanced-chevron">▼</span>
							</summary>
							<div className="settings-advanced-form">
								<div className="panel-heading compact-heading patient-doc-heading patients-no-border-mb-8">
									<div>
										<span
											style={{
												fontSize: "14px",
												fontWeight: 600,
												color: "var(--ink)",
											}}
										>
											Реквизиты для документов
										</span>
									</div>
									<span
										className={`status-pill status-${patientAdministrativeProfileSaveState === "error" || patientAdministrativeProfileValidationMessage ? "cancelled" : "confirmed"}`}
									>
										{patientAdministrativeProfileSaveState === "saving"
											? "сохранение"
											: patientAdministrativeProfileSaveState === "saved"
												? "сохранено"
												: patientAdministrativeProfileSaveState === "error" ||
														patientAdministrativeProfileValidationMessage
													? "ошибка"
													: patientAdministrativeProfileDirty
														? "Ждет сохранения"
														: "локально"}
									</span>
								</div>
								{patientAdministrativeProfileValidationMessage ? (
									<p className="save-error patient-admin-validation">
										{patientAdministrativeProfileValidationMessage}
									</p>
								) : null}
								<details
									className="patient-admin-details"
									style={{
										background: "var(--paper-soft)",
										padding: "12px",
										borderRadius: "8px",
										border: "1px solid var(--line)",
									}}
								>
									<summary
										style={{
											cursor: "pointer",
											fontWeight: 600,
											color: "var(--ink)",
										}}
									>
										Дополнительные документы и адреса (развернуть)
									</summary>
									<div className="patients-mt-12">
										<div className="clinic-profile-form-grid patient-admin-form-grid">
											<label>
												Документ пациента
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.identityDocument
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"identityDocument",
															event.target.value,
														)
													}
													placeholder="паспорт РФ 0000 000000"
												/>
											</label>
											<label>
												ИНН пациента
												<input
													inputMode="numeric"
													autoComplete="off"
													pattern="[0-9]*"
													value={patientAdministrativeProfileDraft.taxpayerInn}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"taxpayerInn",
															event.target.value
																.replace(/[^\d]/g, "")
																.slice(0, 12),
														)
													}
													placeholder="10 или 12 цифр"
												/>
											</label>
											<label>
												Адрес регистрации
												<input
													autoComplete="street-address"
													value={
														patientAdministrativeProfileDraft.registrationAddress
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"registrationAddress",
															event.target.value,
														)
													}
													placeholder="индекс, город, улица, дом"
												/>
											</label>
											<label>
												Адрес проживания
												<input
													autoComplete="street-address"
													value={
														patientAdministrativeProfileDraft.residentialAddress
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"residentialAddress",
															event.target.value,
														)
													}
													placeholder="если отличается"
												/>
											</label>
											<label>
												Полис / ДМС
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.insurancePolicyNumber
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"insurancePolicyNumber",
															event.target.value,
														)
													}
													placeholder="номер при наличии"
												/>
											</label>
											<label>
												Компания ДМС
												<select
													value={
														patientAdministrativeProfileDraft.insuranceContractId || ""
													}
													onChange={(event: SelectChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"insuranceContractId",
															event.target.value,
														)
													}
													className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
												>
													<option value="">-- Без ДМС (Частная оплата) --</option>
													{insuranceContracts.map((c) => (
														<option key={c.id} value={c.id}>
															{c.companyName}
														</option>
													))}
												</select>
											</label>
											<label>
												СНИЛС
												<input
													inputMode="numeric"
													autoComplete="off"
													pattern="[0-9 -]*"
													value={patientAdministrativeProfileDraft.snils}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"snils",
															event.target.value,
														)
													}
													placeholder="000-000-000 00"
												/>
											</label>
											<label>
												Законный представитель
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.legalRepresentativeFullName
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativeFullName",
															event.target.value,
														)
													}
													placeholder="ФИО представителя"
												/>
											</label>
											<label>
												Основание
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.legalRepresentativeRelationship
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativeRelationship",
															event.target.value,
														)
													}
													placeholder="родитель, опекун, доверенность"
												/>
											</label>
											<label>
												Документ представителя
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativeIdentityDocument",
															event.target.value,
														)
													}
													placeholder="паспорт / доверенность"
												/>
											</label>
											<label>
												Телефон представителя
												<input
													type="tel"
													inputMode="tel"
													autoComplete="tel"
													value={
														patientAdministrativeProfileDraft.legalRepresentativePhone
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"legalRepresentativePhone",
															formatPhoneNumber(event.target.value),
														)
													}
													placeholder="+7..."
												/>
											</label>
											<label className="form-span-2">
												Кому выдавать документы
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.preferredDocumentRecipient
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredDocumentRecipient",
															event.target.value,
														)
													}
													placeholder="пациенту / представителю / доверенному лицу"
												/>
											</label>
											<div className="form-span-2 patient-appointment-preferences">
												<span>Удобные дни записи</span>
												<div
													className="weekday-toggle-row"
													role="group"
													aria-label="Удобные дни записи пациента"
												>
													{weekdayOptions.map((day) => {
														const weekdaySelected =
															patientAdministrativeProfileDraft.preferredAppointmentWeekdays.includes(
																day.value,
															);
														return (
															<button
																aria-pressed={weekdaySelected}
																className={weekdaySelected ? "active" : ""}
																key={`patient-weekday-${day.value}`}
																type="button"
																onClick={() => {
																	const currentDays =
																		patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
																	const nextDays = weekdaySelected
																		? currentDays.filter(
																				(item) => item !== day.value,
																			)
																		: [...currentDays, day.value];
																	updatePatientAdministrativeProfileDraft(
																		"preferredAppointmentWeekdays",
																		normalizeOptionalWorkingDaysDraft(nextDays),
																	);
																}}
															>
																{day.label}
															</button>
														);
													})}
												</div>
											</div>
											<label>
												Удобно с
												<input
													type="time"
													value={
														patientAdministrativeProfileDraft.preferredAppointmentStart
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredAppointmentStart",
															event.target.value,
														)
													}
												/>
											</label>
											<label>
												Удобно до
												<input
													type="time"
													value={
														patientAdministrativeProfileDraft.preferredAppointmentEnd
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredAppointmentEnd",
															event.target.value,
														)
													}
												/>
											</label>
											<label className="form-span-2">
												Комментарий к записи
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.preferredAppointmentNote
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"preferredAppointmentNote",
															event.target.value,
														)
													}
													placeholder="например: только утро, не звонить после 19:00, нужен сопровождающий"
												/>
											</label>
											<label className="form-span-2">
												Основание обработки ПДн
												<input
													autoComplete="off"
													value={
														patientAdministrativeProfileDraft.dataProcessingBasisNote
													}
													onChange={(event: TextFieldChangeEvent) =>
														updatePatientAdministrativeProfileDraft(
															"dataProcessingBasisNote",
															event.target.value,
														)
													}
													placeholder="согласие пациента, представитель, договор, иной законный контекст"
												/>
											</label>
										</div>
									</div>
								</details>
								<div className="patient-admin-actions patients-mt-16-flex">
									<button
										className="primary-button"
										type="button"
										onClick={savePatientAdministrativeProfile}
										aria-busy={
											patientAdministrativeProfileSaveState === "saving" ||
											undefined
										}
										aria-describedby={
											patientAdministrativeSaveGuidance
												? patientAdministrativeSaveGuidanceId
												: undefined
										}
										disabled={!patientAdministrativeProfileReadyToSave}
									>
										<ShieldCheck aria-hidden="true" /> Сохранить для документов
									</button>
								</div>
								{patientAdministrativeSaveGuidance ? (
									<p
										className="patient-save-guidance"
										id={patientAdministrativeSaveGuidanceId}
										role="status"
										aria-live="polite"
									>
										{patientAdministrativeSaveGuidance}
									</p>
								) : null}
							</div>
						</details>
        </>
    );
}