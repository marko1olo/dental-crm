import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { appendChipToText } from "../documentChipText";
import { QuickChipsRow } from "../QuickChipsRow";
import type { DocumentVisitHints } from "./documentFormTypes";

/** Готовые формулировки для отказа: причина, риски, альтернативы, тревожные признаки. */
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

/**
 * Отказ от медицинского вмешательства.
 *
 * Перенесено из DocumentsView.tsx без изменений разметки. Оболочка карточки у
 * этой формы своя (классы Tailwind вместо inline-стилей, наведение на сводке и
 * фокус-обводка на кнопках-подсказках), поэтому она НЕ переведена на
 * DocumentPayloadCard: перевод убрал бы наведение и обводку, то есть изменил бы
 * экран. Расхождение оболочки и hex-подстановки внутри
 * `bg-[var(--surface-100,#f8fafc)]` — долг, записанный в отчёте пакета.
 */
export function MedicalInterventionRefusalForm({
	activeDoctorFullName,
	activeVisitComplaint,
	inferredTreatmentArea,
}: DocumentVisitHints) {
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
			<details className="document-manual-override bg-[var(--surface-100,#f8fafc)] p-3 rounded-lg border border-[var(--line,#e2e8f0)] mt-4">
				<summary className="cursor-pointer font-semibold text-[var(--brand-700,#0f766e)] select-none hover:opacity-80 transition-opacity">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content mt-4 flex flex-col gap-4">
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
								activeVisitComplaint ?? "показания и причина рекомендации врача"
							}
							rows={2}
						/>
					</label>
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center">
							<span className="text-xs font-semibold text-[var(--ink,#334155)]">
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
							className="mt-0"
						/>
						<QuickChipsRow
							chips={REFUSAL_REASON_CHIPS}
							onPick={(chip) =>
								setRefusalPatientReason(
									appendChipToText(refusalPatientReason, chip),
								)
							}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center">
							<span className="text-xs font-semibold text-[var(--ink,#334155)]">
								Разъясненные риски
							</span>
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
							className="mt-0"
						/>
						<QuickChipsRow
							chips={REFUSAL_RISK_CHIPS}
							onPick={(chip) =>
								setRefusalExplainedRisks(
									appendChipToText(refusalExplainedRisks, chip),
								)
							}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center">
							<span className="text-xs font-semibold text-[var(--ink,#334155)]">
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
							className="mt-0"
						/>
						<QuickChipsRow
							chips={REFUSAL_ALT_CHIPS}
							onPick={(chip) =>
								setRefusalAlternatives(
									appendChipToText(refusalAlternatives, chip),
								)
							}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center">
							<span className="text-xs font-semibold text-[var(--ink,#334155)]">
								Тревожные признаки
							</span>
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
							className="mt-0"
						/>
						<QuickChipsRow
							chips={REFUSAL_WARNING_CHIPS}
							onPick={(chip) =>
								setRefusalUrgentWarningSigns(
									appendChipToText(refusalUrgentWarningSigns, chip),
								)
							}
						/>
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
									activeDoctorFullName ?? "врач, проводивший разъяснение"
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
