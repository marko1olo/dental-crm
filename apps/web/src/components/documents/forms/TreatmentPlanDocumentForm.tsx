import type React from "react";
import { useDocumentStore } from "../../../store/documentStore";

interface TreatmentPlanDocumentFormProps {
	activeDoctorFullName?: string | null;
	activeVisitComplaint?: string | null;
	activeVisitDiagnosis?: string | null;
	inferredTreatmentArea?: string | null;
	plannedTotalFormatted?: string | null;
	renderToothRowsEditor: () => React.ReactNode;
}

export const TreatmentPlanDocumentForm: React.FC<
	TreatmentPlanDocumentFormProps
> = ({
	activeDoctorFullName,
	activeVisitComplaint,
	activeVisitDiagnosis,
	inferredTreatmentArea,
	plannedTotalFormatted,
	renderToothRowsEditor,
}) => {
	const treatmentPlanClinicalReason = useDocumentStore(
		(state) => state.treatmentPlanClinicalReason,
	);
	const setTreatmentPlanClinicalReason = useDocumentStore(
		(state) => state.setTreatmentPlanClinicalReason,
	);
	const treatmentPlanDiagnosisSummary = useDocumentStore(
		(state) => state.treatmentPlanDiagnosisSummary,
	);
	const setTreatmentPlanDiagnosisSummary = useDocumentStore(
		(state) => state.setTreatmentPlanDiagnosisSummary,
	);
	const treatmentPlanTeethOrArea = useDocumentStore(
		(state) => state.treatmentPlanTeethOrArea,
	);
	const setTreatmentPlanTeethOrArea = useDocumentStore(
		(state) => state.setTreatmentPlanTeethOrArea,
	);
	const treatmentPlanEstimatedTotalRub = useDocumentStore(
		(state) => state.treatmentPlanEstimatedTotalRub,
	);
	const setTreatmentPlanEstimatedTotalRub = useDocumentStore(
		(state) => state.setTreatmentPlanEstimatedTotalRub,
	);
	const treatmentPlanGoals = useDocumentStore(
		(state) => state.treatmentPlanGoals,
	);
	const setTreatmentPlanGoals = useDocumentStore(
		(state) => state.setTreatmentPlanGoals,
	);
	const treatmentPlanStages = useDocumentStore(
		(state) => state.treatmentPlanStages,
	);
	const setTreatmentPlanStages = useDocumentStore(
		(state) => state.setTreatmentPlanStages,
	);
	const treatmentPlanAlternatives = useDocumentStore(
		(state) => state.treatmentPlanAlternatives,
	);
	const setTreatmentPlanAlternatives = useDocumentStore(
		(state) => state.setTreatmentPlanAlternatives,
	);
	const treatmentPlanRisks = useDocumentStore(
		(state) => state.treatmentPlanRisks,
	);
	const setTreatmentPlanRisks = useDocumentStore(
		(state) => state.setTreatmentPlanRisks,
	);
	const treatmentPlanPrognosis = useDocumentStore(
		(state) => state.treatmentPlanPrognosis,
	);
	const setTreatmentPlanPrognosis = useDocumentStore(
		(state) => state.setTreatmentPlanPrognosis,
	);
	const treatmentPlanControlPlan = useDocumentStore(
		(state) => state.treatmentPlanControlPlan,
	);
	const setTreatmentPlanControlPlan = useDocumentStore(
		(state) => state.setTreatmentPlanControlPlan,
	);
	const treatmentPlanDoctorFullName = useDocumentStore(
		(state) => state.treatmentPlanDoctorFullName,
	);
	const setTreatmentPlanDoctorFullName = useDocumentStore(
		(state) => state.setTreatmentPlanDoctorFullName,
	);
	const treatmentPlanPlannedAt = useDocumentStore(
		(state) => state.treatmentPlanPlannedAt,
	);
	const setTreatmentPlanPlannedAt = useDocumentStore(
		(state) => state.setTreatmentPlanPlannedAt,
	);
	const treatmentPlanQuestionsAnswered = useDocumentStore(
		(state) => state.treatmentPlanQuestionsAnswered,
	);
	const setTreatmentPlanQuestionsAnswered = useDocumentStore(
		(state) => state.setTreatmentPlanQuestionsAnswered,
	);
	const treatmentPlanSeparateConsentAcknowledged = useDocumentStore(
		(state) => state.treatmentPlanSeparateConsentAcknowledged,
	);
	const setTreatmentPlanSeparateConsentAcknowledged = useDocumentStore(
		(state) => state.setTreatmentPlanSeparateConsentAcknowledged,
	);
	const treatmentPlanNewApprovalAcknowledged = useDocumentStore(
		(state) => state.treatmentPlanNewApprovalAcknowledged,
	);
	const setTreatmentPlanNewApprovalAcknowledged = useDocumentStore(
		(state) => state.setTreatmentPlanNewApprovalAcknowledged,
	);

	return (
		<article className="document-payload-card">
			<div>
				<h3>План лечения</h3>
				<p>
					Клиническая логика, этапы, альтернативы, риски и контроль до
					отдельного согласия на вмешательство.
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
						Повод обращения
						<textarea
							value={treatmentPlanClinicalReason}
							onChange={(event) =>
								setTreatmentPlanClinicalReason(event.target.value)
							}
							placeholder={
								activeVisitComplaint ||
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
								activeVisitDiagnosis ||
								activeVisitComplaint ||
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
									inferredTreatmentArea ||
									"FDI-коды зубов или область лечения"
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
								placeholder={
									plannedTotalFormatted ||
									"сумма цифрами, копейки после запятой"
								}
							/>
						</label>
					</div>
					<label>
						Цели лечения
						<textarea
							value={treatmentPlanGoals}
							onChange={(event) =>
								setTreatmentPlanGoals(event.target.value)
							}
							rows={4}
						/>
					</label>
					{renderToothRowsEditor()}
					<label>
						Этапы
						<textarea
							value={treatmentPlanStages}
							onChange={(event) =>
								setTreatmentPlanStages(event.target.value)
							}
							rows={6}
						/>
						<small>
							Формат строки: этап | услуги и объем | срок | клинические
							заметки | сумма
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
							onChange={(event) =>
								setTreatmentPlanRisks(event.target.value)
							}
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
								placeholder={activeDoctorFullName ?? "лечащий врач"}
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
								setTreatmentPlanNewApprovalAcknowledged(
									event.target.checked,
								)
							}
						/>
						Изменение диагноза, объема, сроков или стоимости требует
						нового согласования
					</label>
				</div>
			</details>
		</article>
	);
};
