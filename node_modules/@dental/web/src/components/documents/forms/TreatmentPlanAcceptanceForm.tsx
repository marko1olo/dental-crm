import React from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useDocumentStore } from "../../../store/documentStore";

export interface TreatmentPlanAcceptanceFormProps {
	dashboard: any;
	documentPatient: any;
	activeDoctor: any;
}

export function TreatmentPlanAcceptanceForm({
	dashboard,
	documentPatient,
	activeDoctor,
}: TreatmentPlanAcceptanceFormProps) {
	const {
		normalizedTreatmentPlanAcceptanceVariant,
		inferredTreatmentArea,
		renderClinicalToothRowsEditor,
		treatmentAcceptancePlannedTotalRub,
	} = useAppLogicContext();
	const {
		treatmentAcceptanceVariant,
		setTreatmentAcceptanceVariant,
		treatmentAcceptanceClinicalGoal,
		setTreatmentAcceptanceClinicalGoal,
		treatmentAcceptanceDiagnosisSummary,
		setTreatmentAcceptanceDiagnosisSummary,
		treatmentAcceptanceTeethOrArea,
		setTreatmentAcceptanceTeethOrArea,
		treatmentAcceptanceStages,
		setTreatmentAcceptanceStages,
		treatmentAcceptanceEstimatedTotalRub,
		setTreatmentAcceptanceEstimatedTotalRub,
		treatmentAcceptanceEstimateValidUntil,
		setTreatmentAcceptanceEstimateValidUntil,
		treatmentAcceptancePaymentTerms,
		setTreatmentAcceptancePaymentTerms,
		treatmentAcceptanceRejectedAlternatives,
		setTreatmentAcceptanceRejectedAlternatives,
		treatmentAcceptanceRisks,
		setTreatmentAcceptanceRisks,
		treatmentAcceptanceWarrantyTerms,
		setTreatmentAcceptanceWarrantyTerms,
		treatmentAcceptanceDoctorFullName,
		setTreatmentAcceptanceDoctorFullName,
		treatmentAcceptanceAcceptedAt,
		setTreatmentAcceptanceAcceptedAt,
		treatmentAcceptanceQuestionsAnswered,
		setTreatmentAcceptanceQuestionsAnswered,
		treatmentAcceptanceAlternativesUnderstood,
		setTreatmentAcceptanceAlternativesUnderstood,
		treatmentAcceptanceCostChangeUnderstood,
		setTreatmentAcceptanceCostChangeUnderstood,
		treatmentAcceptanceRevisionAcknowledged,
		setTreatmentAcceptanceRevisionAcknowledged,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Согласование плана лечения</h3>
				<p>
					Фиксирует выбранный вариант, этапы, сумму, срок действия сметы,
					альтернативы, риски и подтверждения пациента.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Выбранный вариант
						<select
							value={treatmentAcceptanceVariant}
							onChange={(event) =>
								setTreatmentAcceptanceVariant(
									normalizedTreatmentPlanAcceptanceVariant(event.target.value),
								)
							}
						>
							<option value="urgent">Срочный</option>
							<option value="standard">Стандартный</option>
							<option value="optimal">Оптимальный</option>
							<option value="staged">Этапный</option>
							<option value="maintenance">Поддерживающий</option>
							<option value="other">Индивидуальный</option>
						</select>
					</label>
					<label>
						Клиническая цель
						<textarea
							value={treatmentAcceptanceClinicalGoal}
							onChange={(event) =>
								setTreatmentAcceptanceClinicalGoal(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Диагноз или клиническое основание
						<textarea
							value={treatmentAcceptanceDiagnosisSummary}
							onChange={(event) =>
								setTreatmentAcceptanceDiagnosisSummary(event.target.value)
							}
							placeholder={
								dashboard?.activeVisit?.diagnosis ||
								dashboard?.activeVisit?.complaint ||
								"диагноз, показание, жалобы и клиническая причина"
							}
							rows={2}
						/>
					</label>
					<label>
						Зубы или область
						<input
							value={treatmentAcceptanceTeethOrArea}
							onChange={(event) =>
								setTreatmentAcceptanceTeethOrArea(event.target.value)
							}
							placeholder={
								inferredTreatmentArea || "FDI-коды зубов или область лечения"
							}
						/>
					</label>
					{renderClinicalToothRowsEditor()}
					<label>
						Этапы
						<textarea
							value={treatmentAcceptanceStages}
							onChange={(event) =>
								setTreatmentAcceptanceStages(event.target.value)
							}
							rows={5}
						/>
						<small>Формат строки: этап | услуги и объем | срок | сумма</small>
					</label>
					<div className="document-payload-row">
						<label>
							Стоимость
							<input
								inputMode="numeric"
								value={treatmentAcceptanceEstimatedTotalRub}
								onChange={(event) =>
									setTreatmentAcceptanceEstimatedTotalRub(event.target.value)
								}
								placeholder={String(treatmentAcceptancePlannedTotalRub() || "")}
							/>
						</label>
						<label>
							Смета действует до
							<input
								value={treatmentAcceptanceEstimateValidUntil}
								onChange={(event) =>
									setTreatmentAcceptanceEstimateValidUntil(event.target.value)
								}
							/>
						</label>
					</div>
					<label>
						Условия оплаты
						<textarea
							value={treatmentAcceptancePaymentTerms}
							onChange={(event) =>
								setTreatmentAcceptancePaymentTerms(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Отклоненные или отложенные альтернативы
						<textarea
							value={treatmentAcceptanceRejectedAlternatives}
							onChange={(event) =>
								setTreatmentAcceptanceRejectedAlternatives(event.target.value)
							}
							rows={4}
						/>
					</label>
					<label>
						Риски и ограничения
						<textarea
							value={treatmentAcceptanceRisks}
							onChange={(event) =>
								setTreatmentAcceptanceRisks(event.target.value)
							}
							rows={4}
						/>
					</label>
					<label>
						Гарантия и контроль
						<textarea
							value={treatmentAcceptanceWarrantyTerms}
							onChange={(event) =>
								setTreatmentAcceptanceWarrantyTerms(event.target.value)
							}
							rows={3}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Врач
							<input
								value={treatmentAcceptanceDoctorFullName}
								onChange={(event) =>
									setTreatmentAcceptanceDoctorFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "лечащий врач"}
							/>
						</label>
						<label>
							Дата согласования
							<input
								value={treatmentAcceptanceAcceptedAt}
								onChange={(event) =>
									setTreatmentAcceptanceAcceptedAt(event.target.value)
								}
							/>
						</label>
					</div>
					<label className="document-payload-checkbox">
						<input
							checked={treatmentAcceptanceQuestionsAnswered}
							type="checkbox"
							onChange={(event) =>
								setTreatmentAcceptanceQuestionsAnswered(event.target.checked)
							}
						/>
						Пациент получил ответы на вопросы
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={treatmentAcceptanceAlternativesUnderstood}
							type="checkbox"
							onChange={(event) =>
								setTreatmentAcceptanceAlternativesUnderstood(
									event.target.checked,
								)
							}
						/>
						Альтернативы и отказ от лечения объяснены
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={treatmentAcceptanceCostChangeUnderstood}
							type="checkbox"
							onChange={(event) =>
								setTreatmentAcceptanceCostChangeUnderstood(event.target.checked)
							}
						/>
						Пациент понимает, что стоимость может измениться при новых данных
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={treatmentAcceptanceRevisionAcknowledged}
							type="checkbox"
							onChange={(event) =>
								setTreatmentAcceptanceRevisionAcknowledged(event.target.checked)
							}
						/>
						Существенное изменение плана требует нового согласования
					</label>
				</div>
			</details>
		</article>
	);
}
