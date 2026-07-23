import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

const REFUSAL_REASON_CHIPS = [
	"Страх перед процедурой",
	"Нехватка времени",
	"Финансовые причины",
	"Желание получить второе мнение",
];
const REFUSAL_RISK_CHIPS = [
	"Обострение воспаления",
	"Потеря зуба",
	"Развитие абсцесса",
	"Распространение инфекции",
];
const REFUSAL_ALT_CHIPS = [
	"Удаление зуба",
	"Отсроченное лечение",
	"Консультация другого специалиста",
	"Наблюдение",
];
const REFUSAL_WARNING_CHIPS = [
	"Острая пульсирующая боль",
	"Отек десны или щеки",
	"Повышение температуры тела",
	"Гнойные выделения",
];

export function MedicalInterventionRefusalForm({
	activeDoctor,
	dashboard,
	inferredTreatmentArea,
}: any) {
	const {
		refusalAlternatives,
		refusalClinicalIndication,
		refusalConfirmedAt,
		refusalConsequencesUnderstood,
		refusalDoctorFullName,
		refusalEmergencyCareExplained,
		refusalExplainedRisks,
		refusalIntervention,
		refusalPatientReason,
		refusalSecondOpinionOffered,
		refusalUrgentWarningSigns,
		setRefusalAlternatives,
		setRefusalClinicalIndication,
		setRefusalConfirmedAt,
		setRefusalConsequencesUnderstood,
		setRefusalDoctorFullName,
		setRefusalEmergencyCareExplained,
		setRefusalExplainedRisks,
		setRefusalIntervention,
		setRefusalPatientReason,
		setRefusalSecondOpinionOffered,
		setRefusalUrgentWarningSigns,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Отказ от вмешательства</h3>
				<p>
					Что предложено, почему нужно, какие риски объяснены и когда срочно
					обращаться.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Предложенное вмешательство
						<input
							value={refusalIntervention}
							onChange={(event) => setRefusalIntervention(event.target.value)}
							placeholder={
								inferredTreatmentArea
									? `например: лечение или удаление ${inferredTreatmentArea}`
									: "процедура или вмешательство"
							}
						/>
					</label>
					<label>
						Клиническое показание
						<textarea
							value={refusalClinicalIndication}
							onChange={(event) =>
								setRefusalClinicalIndication(event.target.value)
							}
							placeholder={
								dashboard?.activeVisit?.complaint ??
								"показания и причина рекомендации врача"
							}
							rows={2}
						/>
					</label>
					<div className="document-column-gap-4">
						<div className="document-flex-between">
							<span className="document-sub-heading">
								Причина отказа со слов пациента
							</span>
							<SmartMicrophoneButton
								context="general"
								onResult={(t) =>
									setRefusalPatientReason(
										refusalPatientReason ? `${refusalPatientReason}, ${t}` : t,
									)
								}
							/>
						</div>
						<textarea
							value={refusalPatientReason}
							onChange={(event) => setRefusalPatientReason(event.target.value)}
							rows={2}
							className="document-mt-0"
						/>
						<div className="quick-chips-row document-flex-wrap">
							{REFUSAL_REASON_CHIPS.map((chip) => (
								<button
									key={chip}
									type="button"
									className="quick-chip quick-chip--sm"
									onClick={() =>
										setRefusalPatientReason(
											refusalPatientReason.trim()
												? `${refusalPatientReason.trim()}, ${chip.toLowerCase()}`
												: chip,
										)
									}
								>
									+ {chip}
								</button>
							))}
						</div>
					</div>
					<div className="document-column-gap-4">
						<div className="document-flex-between">
							<span className="document-sub-heading">Разъясненные риски</span>
							<SmartMicrophoneButton
								context="general"
								onResult={(t) =>
									setRefusalExplainedRisks(
										refusalExplainedRisks
											? `${refusalExplainedRisks}, ${t}`
											: t,
									)
								}
							/>
						</div>
						<textarea
							value={refusalExplainedRisks}
							onChange={(event) => setRefusalExplainedRisks(event.target.value)}
							rows={3}
							className="document-mt-0"
						/>
						<div className="quick-chips-row document-flex-wrap">
							{REFUSAL_RISK_CHIPS.map((chip) => (
								<button
									key={chip}
									type="button"
									className="quick-chip quick-chip--sm"
									onClick={() =>
										setRefusalExplainedRisks(
											refusalExplainedRisks.trim()
												? `${refusalExplainedRisks.trim()}, ${chip.toLowerCase()}`
												: chip,
										)
									}
								>
									+ {chip}
								</button>
							))}
						</div>
					</div>
					<div className="document-column-gap-4">
						<div className="document-flex-between">
							<span className="document-sub-heading">
								Предложенные альтернативы
							</span>
							<SmartMicrophoneButton
								context="general"
								onResult={(t) =>
									setRefusalAlternatives(
										refusalAlternatives ? `${refusalAlternatives}, ${t}` : t,
									)
								}
							/>
						</div>
						<textarea
							value={refusalAlternatives}
							onChange={(event) => setRefusalAlternatives(event.target.value)}
							rows={3}
							className="document-mt-0"
						/>
						<div className="quick-chips-row document-flex-wrap">
							{REFUSAL_ALT_CHIPS.map((chip) => (
								<button
									key={chip}
									type="button"
									className="quick-chip quick-chip--sm"
									onClick={() =>
										setRefusalAlternatives(
											refusalAlternatives.trim()
												? `${refusalAlternatives.trim()}, ${chip.toLowerCase()}`
												: chip,
										)
									}
								>
									+ {chip}
								</button>
							))}
						</div>
					</div>
					<div className="document-column-gap-4">
						<div className="document-flex-between">
							<span className="document-sub-heading">Тревожные признаки</span>
							<SmartMicrophoneButton
								context="general"
								onResult={(t) =>
									setRefusalUrgentWarningSigns(
										refusalUrgentWarningSigns
											? `${refusalUrgentWarningSigns}, ${t}`
											: t,
									)
								}
							/>
						</div>
						<textarea
							value={refusalUrgentWarningSigns}
							onChange={(event) =>
								setRefusalUrgentWarningSigns(event.target.value)
							}
							rows={3}
							className="document-mt-0"
						/>
						<div className="quick-chips-row document-flex-wrap">
							{REFUSAL_WARNING_CHIPS.map((chip) => (
								<button
									key={chip}
									type="button"
									className="quick-chip quick-chip--sm"
									onClick={() =>
										setRefusalUrgentWarningSigns(
											refusalUrgentWarningSigns.trim()
												? `${refusalUrgentWarningSigns.trim()}, ${chip.toLowerCase()}`
												: chip,
										)
									}
								>
									+ {chip}
								</button>
							))}
						</div>
					</div>
					<div className="document-payload-row">
						<label>
							Врач
							<input
								value={refusalDoctorFullName}
								onChange={(event) =>
									setRefusalDoctorFullName(event.target.value)
								}
								placeholder={
									activeDoctor?.fullName ?? "врач, проводивший разъяснение"
								}
							/>
						</label>
						<label>
							Дата подтверждения
							<input
								value={refusalConfirmedAt}
								onChange={(event) => setRefusalConfirmedAt(event.target.value)}
							/>
						</label>
					</div>
					<label className="document-payload-checkbox">
						<input
							checked={refusalConsequencesUnderstood}
							type="checkbox"
							onChange={(event) =>
								setRefusalConsequencesUnderstood(event.target.checked)
							}
						/>
						Пациент понял последствия отказа
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={refusalSecondOpinionOffered}
							type="checkbox"
							onChange={(event) =>
								setRefusalSecondOpinionOffered(event.target.checked)
							}
						/>
						Пациенту предложено второе мнение или альтернатива
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={refusalEmergencyCareExplained}
							type="checkbox"
							onChange={(event) =>
								setRefusalEmergencyCareExplained(event.target.checked)
							}
						/>
						Пациенту объяснено, когда нужна экстренная помощь
					</label>
				</div>
			</details>
		</article>
	);
}
