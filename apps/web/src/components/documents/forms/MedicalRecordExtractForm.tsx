import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

const EXTRACT_DIAGNOSIS_CHIPS = ["Кариес", "Пульпит", "Периодонтит", "Адентия", "Гингивит", "Норма"];
const EXTRACT_TREATMENT_CHIPS = ["Препарирование", "Пломбирование", "Экстирпация пульпы", "Удаление зуба", "Профессиональная гигиена", "Консультация"];
const EXTRACT_REC_CHIPS = ["Осмотр через 6 месяцев", "Рентген-контроль", "Санация полости рта", "Консультация ортопеда", "Прием НПВС при болях"];

export function MedicalRecordExtractForm({ activeDoctor, dashboard, documentPatient, renderClinicalToothRowsEditor, compactDocumentText }: any) {
  const {
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
    recordExtractRecipientFullName,
    setRecordExtractRecipientFullName,
    recordExtractRecipientAuthority,
    setRecordExtractRecipientAuthority,
    recordExtractIssuedAt,
    setRecordExtractIssuedAt,
    recordExtractPreparedFromSignedRecords,
    setRecordExtractPreparedFromSignedRecords,
    recordExtractThirdPartyDataChecked,
    setRecordExtractThirdPartyDataChecked
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Выписка из карты</h3>
								<p>
									Только сведения из подписанной медзаписи: период, диагноз,
									лечение, рекомендации и получатель.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
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
										<div className="quick-chips-row document-chips-wrap">
											{EXTRACT_DIAGNOSIS_CHIPS.map((chip) => (
												<button
													key={chip}
													type="button"
													className="quick-chip quick-chip--sm"
													onClick={() =>
														setRecordExtractDiagnosis((prev) =>
															prev ? prev + ", " + chip : chip,
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
