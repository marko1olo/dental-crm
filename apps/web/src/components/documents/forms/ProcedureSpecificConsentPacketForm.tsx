import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function ProcedureSpecificConsentPacketForm({ activeDoctor, dashboard, inferredTreatmentArea, normalizedProcedureSpecificConsentProcedure, renderClinicalToothRowsEditor, typedProcedureSpecificConsentProcedureOptions }: any) {
  const {
    procedureConsentProcedureType,
    setProcedureConsentProcedureType,
    procedureConsentProcedureName,
    setProcedureConsentProcedureName,
    procedureConsentToothOrArea,
    setProcedureConsentToothOrArea,
    procedureConsentDiagnosisOrIndication,
    setProcedureConsentDiagnosisOrIndication,
    procedureConsentAnesthesia,
    setProcedureConsentAnesthesia,
    procedureConsentMaterials,
    setProcedureConsentMaterials,
    procedureConsentPatientRiskFactors,
    setProcedureConsentPatientRiskFactors,
    procedureConsentSpecificRisks,
    setProcedureConsentSpecificRisks,
    procedureConsentAlternatives,
    setProcedureConsentAlternatives,
    procedureConsentAftercare,
    setProcedureConsentAftercare,
    procedureConsentDoctorFullName,
    setProcedureConsentDoctorFullName,
    procedureConsentConfirmedAt,
    setProcedureConsentConfirmedAt,
    procedureConsentLocalFormAttached,
    setProcedureConsentLocalFormAttached,
    procedureConsentQuestionsAnswered,
    setProcedureConsentQuestionsAnswered,
    procedureConsentExactProcedureConfirmed,
    setProcedureConsentExactProcedureConfirmed,
    procedureConsentRisksUnderstood,
    setProcedureConsentRisksUnderstood
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Процедурное согласие</h3>
								<p>
									Приложение к согласию для конкретной процедуры: тип, зона,
									материалы, риски, альтернативы и послеоперационные
									ограничения.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
									<div className="document-payload-row">
										<label>
											Блок процедуры
											<select
												value={procedureConsentProcedureType}
												onChange={(event) =>
													setProcedureConsentProcedureType(
														normalizedProcedureSpecificConsentProcedure(
															event.target.value,
														),
													)
												}
											>
												{typedProcedureSpecificConsentProcedureOptions.map(
													(option) => (
														<option key={option.value} value={option.value}>
															{option.label}
														</option>
													),
												)}
											</select>
										</label>
										<label>
											Врач
											<input
												value={procedureConsentDoctorFullName}
												onChange={(event) =>
													setProcedureConsentDoctorFullName(event.target.value)
												}
												placeholder={
													activeDoctor?.fullName ??
													"врач, проводивший разъяснение"
												}
											/>
										</label>
									</div>
									<label>
										Процедура или этап
										<textarea
											value={procedureConsentProcedureName}
											onChange={(event) =>
												setProcedureConsentProcedureName(event.target.value)
											}
											rows={2}
										/>
									</label>
									<div className="document-payload-row">
										<label>
											Область или зубы
											<input
												value={procedureConsentToothOrArea}
												onChange={(event) =>
													setProcedureConsentToothOrArea(event.target.value)
												}
												placeholder={
													inferredTreatmentArea || "FDI / зона лечения"
												}
											/>
										</label>
										<label>
											Дата подтверждения
											<input
												value={procedureConsentConfirmedAt}
												onChange={(event) =>
													setProcedureConsentConfirmedAt(event.target.value)
												}
											/>
										</label>
									</div>
									<label>
										Диагноз или клиническое показание
										<textarea
											value={procedureConsentDiagnosisOrIndication}
											onChange={(event) =>
												setProcedureConsentDiagnosisOrIndication(
													event.target.value,
												)
											}
											placeholder={
												dashboard?.activeVisit?.complaint ??
												"показание к процедуре"
											}
											rows={2}
										/>
									</label>
									{renderClinicalToothRowsEditor()}
									<div className="document-payload-row">
										<label>
											Анестезия
											<input
												value={procedureConsentAnesthesia}
												onChange={(event) =>
													setProcedureConsentAnesthesia(event.target.value)
												}
											/>
										</label>
										<label>
											Материалы, системы, конструкции
											<input
												value={procedureConsentMaterials}
												onChange={(event) =>
													setProcedureConsentMaterials(event.target.value)
												}
											/>
										</label>
									</div>
									<label>
										Персональные факторы риска пациента
										<textarea
											value={procedureConsentPatientRiskFactors}
											onChange={(event) =>
												setProcedureConsentPatientRiskFactors(
													event.target.value,
												)
											}
											rows={3}
										/>
									</label>
									<label>
										Процедурные риски
										<textarea
											value={procedureConsentSpecificRisks}
											onChange={(event) =>
												setProcedureConsentSpecificRisks(event.target.value)
											}
											rows={4}
										/>
									</label>
									<label>
										Альтернативы и отказ
										<textarea
											value={procedureConsentAlternatives}
											onChange={(event) =>
												setProcedureConsentAlternatives(event.target.value)
											}
											rows={4}
										/>
									</label>
									<label>
										После процедуры
										<textarea
											value={procedureConsentAftercare}
											onChange={(event) =>
												setProcedureConsentAftercare(event.target.value)
											}
											rows={4}
										/>
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={procedureConsentLocalFormAttached}
											type="checkbox"
											onChange={(event) =>
												setProcedureConsentLocalFormAttached(
													event.target.checked,
												)
											}
										/>
										Локальная форма клиники приложена или включена в пакет
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={procedureConsentQuestionsAnswered}
											type="checkbox"
											onChange={(event) =>
												setProcedureConsentQuestionsAnswered(
													event.target.checked,
												)
											}
										/>
										Пациент получил ответы на вопросы по процедуре
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={procedureConsentExactProcedureConfirmed}
											type="checkbox"
											onChange={(event) =>
												setProcedureConsentExactProcedureConfirmed(
													event.target.checked,
												)
											}
										/>
										Конкретная процедура, зона и объем названы пациенту
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={procedureConsentRisksUnderstood}
											type="checkbox"
											onChange={(event) =>
												setProcedureConsentRisksUnderstood(event.target.checked)
											}
										/>
										Пациент понял процедурные риски и ограничения
									</label>
								</div>
							</details>
						</article>
					
  );
}
