import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function TreatmentPlanForm({
	activeDoctor,
	dashboard,
	inferredTreatmentArea,
	renderClinicalToothRowsEditor,
	treatmentAcceptancePlannedTotalRub,
}: any) {
	const {
		treatmentPlanClinicalReason,
		setTreatmentPlanClinicalReason,
		treatmentPlanDiagnosisSummary,
		setTreatmentPlanDiagnosisSummary,
		treatmentPlanTeethOrArea,
		setTreatmentPlanTeethOrArea,
		treatmentPlanGoals,
		setTreatmentPlanGoals,
		treatmentPlanStages,
		setTreatmentPlanStages,
		treatmentPlanEstimatedTotalRub,
		setTreatmentPlanEstimatedTotalRub,
		treatmentPlanAlternatives,
		setTreatmentPlanAlternatives,
		treatmentPlanRisks,
		setTreatmentPlanRisks,
		treatmentPlanPrognosis,
		setTreatmentPlanPrognosis,
		treatmentPlanControlPlan,
		setTreatmentPlanControlPlan,
		treatmentPlanDoctorFullName,
		setTreatmentPlanDoctorFullName,
		treatmentPlanPlannedAt,
		setTreatmentPlanPlannedAt,
		treatmentPlanQuestionsAnswered,
		setTreatmentPlanQuestionsAnswered,
		treatmentPlanSeparateConsentAcknowledged,
		setTreatmentPlanSeparateConsentAcknowledged,
		treatmentPlanNewApprovalAcknowledged,
		setTreatmentPlanNewApprovalAcknowledged,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>План лечения</h3>
				<p>
					Клиническая логика, этапы, альтернативы, риски и контроль до
					отдельного согласия на вмешательство.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Повод обращения
						<textarea
							value={treatmentPlanClinicalReason}
							onChange={(event) =>
								setTreatmentPlanClinicalReason(event.target.value)
							}
							placeholder={
								dashboard?.activeVisit?.complaint ||
								"жалоба, запрос пациента или причина планирования"
							}
							rows={2}
						/>
					</label>
					<label>
						Диагноз или клиническое основание
						<textarea
							value={treatmentPlanDiagnosisSummary}
							onChange={(event) =>
								setTreatmentPlanDiagnosisSummary(event.target.value)
							}
							placeholder={
								dashboard?.activeVisit?.diagnosis ||
								dashboard?.activeVisit?.complaint ||
								"диагноз, предварительное заключение, данные осмотра"
							}
							rows={2}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Зубы или область
							<input
								value={treatmentPlanTeethOrArea}
								onChange={(event) =>
									setTreatmentPlanTeethOrArea(event.target.value)
								}
								placeholder={
									inferredTreatmentArea || "FDI-коды зубов или область лечения"
								}
							/>
						</label>
						<label>
							Ориентировочная стоимость
							<input
								inputMode="numeric"
								value={treatmentPlanEstimatedTotalRub}
								onChange={(event) =>
									setTreatmentPlanEstimatedTotalRub(event.target.value)
								}
								placeholder={String(treatmentAcceptancePlannedTotalRub() || "")}
							/>
						</label>
					</div>
					<label>
						Цели лечения
						<textarea
							value={treatmentPlanGoals}
							onChange={(event) => setTreatmentPlanGoals(event.target.value)}
							rows={4}
						/>
					</label>
					{renderClinicalToothRowsEditor()}
					<label>
						Этапы
						<textarea
							value={treatmentPlanStages}
							onChange={(event) => setTreatmentPlanStages(event.target.value)}
							rows={6}
						/>
						<small>
							Формат строки: этап | услуги и объем | срок | клинические заметки
							| сумма
						</small>
					</label>
					<label>
						Альтернативы
						<textarea
							value={treatmentPlanAlternatives}
							onChange={(event) =>
								setTreatmentPlanAlternatives(event.target.value)
							}
							rows={4}
						/>
					</label>
					<label>
						Риски и ограничения
						<textarea
							value={treatmentPlanRisks}
							onChange={(event) => setTreatmentPlanRisks(event.target.value)}
							rows={4}
						/>
					</label>
					<label>
						Прогноз и ограничения прогноза
						<textarea
							value={treatmentPlanPrognosis}
							onChange={(event) =>
								setTreatmentPlanPrognosis(event.target.value)
							}
							rows={3}
						/>
					</label>
					<label>
						Контроль
						<textarea
							value={treatmentPlanControlPlan}
							onChange={(event) =>
								setTreatmentPlanControlPlan(event.target.value)
							}
							rows={2}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Врач
							<input
								value={treatmentPlanDoctorFullName}
								onChange={(event) =>
									setTreatmentPlanDoctorFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "лечащий врач"}
							/>
						</label>
						<label>
							Дата плана
							<input
								value={treatmentPlanPlannedAt}
								onChange={(event) =>
									setTreatmentPlanPlannedAt(event.target.value)
								}
							/>
						</label>
					</div>
					<label className="document-payload-checkbox">
						<input
							checked={treatmentPlanQuestionsAnswered}
							type="checkbox"
							onChange={(event) =>
								setTreatmentPlanQuestionsAnswered(event.target.checked)
							}
						/>
						Пациент получил ответы на вопросы по плану
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={treatmentPlanSeparateConsentAcknowledged}
							type="checkbox"
							onChange={(event) =>
								setTreatmentPlanSeparateConsentAcknowledged(
									event.target.checked,
								)
							}
						/>
						План лечения не заменяет отдельное информированное согласие
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={treatmentPlanNewApprovalAcknowledged}
							type="checkbox"
							onChange={(event) =>
								setTreatmentPlanNewApprovalAcknowledged(event.target.checked)
							}
						/>
						Изменение диагноза, объема, сроков или стоимости требует нового
						согласования
					</label>
				</div>
			</details>
		</article>
	);
}
