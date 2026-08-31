import { BASE_INFORMED_CONSENT_PRESET } from "@dental/shared";
import React, { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { informedConsentBlockersReview } from "../informedConsentBlockers";
import type { DocumentVisitHints } from "./documentFormTypes";

/**
 * Информированное согласие: поля формы до создания документа.
 *
 * Вынесено из DocumentsView.tsx как есть. Значения и сеттеры форма берёт из
 * хранилища документов сама — их около двадцати, и протаскивать их пропсами
 * значило бы заменить монолит длинным списком аргументов. Сверху приходят
 * только подсказки активного визита.
 *
 * Сверху карточки — перечень невыполненных условий. Разбор и то, что видел врач
 * до него (четыре отказа подряд на каждом согласии, три из них про галочки в
 * самом низу свёрнутого блока), записаны в informedConsentBlockers.ts.
 */
export const InformedConsentForm = React.memo(function InformedConsentForm({
	activeDoctorFullName,
	activeVisitComplaint,
	inferredTreatmentArea,
}: DocumentVisitHints) {
	const informedConsentAftercare = useDocumentStore(
		(state) => state.informedConsentAftercare,
	);
	const setInformedConsentAftercare = useDocumentStore(
		(state) => state.setInformedConsentAftercare,
	);
	const informedConsentAlternatives = useDocumentStore(
		(state) => state.informedConsentAlternatives,
	);
	const setInformedConsentAlternatives = useDocumentStore(
		(state) => state.setInformedConsentAlternatives,
	);
	const informedConsentAnesthesia = useDocumentStore(
		(state) => state.informedConsentAnesthesia,
	);
	const setInformedConsentAnesthesia = useDocumentStore(
		(state) => state.setInformedConsentAnesthesia,
	);
	const informedConsentConfirmedAt = useDocumentStore(
		(state) => state.informedConsentConfirmedAt,
	);
	const setInformedConsentConfirmedAt = useDocumentStore(
		(state) => state.setInformedConsentConfirmedAt,
	);
	const informedConsentDiagnosisOrIndication = useDocumentStore(
		(state) => state.informedConsentDiagnosisOrIndication,
	);
	const setInformedConsentDiagnosisOrIndication = useDocumentStore(
		(state) => state.setInformedConsentDiagnosisOrIndication,
	);
	const informedConsentDoctorFullName = useDocumentStore(
		(state) => state.informedConsentDoctorFullName,
	);
	const setInformedConsentDoctorFullName = useDocumentStore(
		(state) => state.setInformedConsentDoctorFullName,
	);
	const informedConsentExpectedBenefit = useDocumentStore(
		(state) => state.informedConsentExpectedBenefit,
	);
	const setInformedConsentExpectedBenefit = useDocumentStore(
		(state) => state.setInformedConsentExpectedBenefit,
	);
	const informedConsentIntervention = useDocumentStore(
		(state) => state.informedConsentIntervention,
	);
	const setInformedConsentIntervention = useDocumentStore(
		(state) => state.setInformedConsentIntervention,
	);
	const informedConsentMaterialNotes = useDocumentStore(
		(state) => state.informedConsentMaterialNotes,
	);
	const setInformedConsentMaterialNotes = useDocumentStore(
		(state) => state.setInformedConsentMaterialNotes,
	);
	const informedConsentQuestionsAnswered = useDocumentStore(
		(state) => state.informedConsentQuestionsAnswered,
	);
	const setInformedConsentQuestionsAnswered = useDocumentStore(
		(state) => state.setInformedConsentQuestionsAnswered,
	);
	const informedConsentRisks = useDocumentStore(
		(state) => state.informedConsentRisks,
	);
	const setInformedConsentRisks = useDocumentStore(
		(state) => state.setInformedConsentRisks,
	);
	const informedConsentRisksUnderstood = useDocumentStore(
		(state) => state.informedConsentRisksUnderstood,
	);
	const setInformedConsentRisksUnderstood = useDocumentStore(
		(state) => state.setInformedConsentRisksUnderstood,
	);
	const informedConsentToothOrArea = useDocumentStore(
		(state) => state.informedConsentToothOrArea,
	);
	const setInformedConsentToothOrArea = useDocumentStore(
		(state) => state.setInformedConsentToothOrArea,
	);
	const informedConsentTrustedContact = useDocumentStore(
		(state) => state.informedConsentTrustedContact,
	);
	const setInformedConsentTrustedContact = useDocumentStore(
		(state) => state.setInformedConsentTrustedContact,
	);
	const informedConsentWithdrawUnderstood = useDocumentStore(
		(state) => state.informedConsentWithdrawUnderstood,
	);
	const setInformedConsentWithdrawUnderstood = useDocumentStore(
		(state) => state.setInformedConsentWithdrawUnderstood,
	);

	const review = useMemo(
		() =>
			informedConsentBlockersReview({
				intervention: informedConsentIntervention,
				toothOrArea: informedConsentToothOrArea,
				inferredTreatmentArea: inferredTreatmentArea ?? "",
				diagnosisOrIndication: informedConsentDiagnosisOrIndication,
				activeVisitComplaint: activeVisitComplaint ?? "",
				expectedBenefit: informedConsentExpectedBenefit,
				risks: informedConsentRisks,
				alternatives: informedConsentAlternatives,
				aftercare: informedConsentAftercare,
				doctorFullName: informedConsentDoctorFullName,
				activeDoctorFullName: activeDoctorFullName ?? "",
				questionsAnswered: informedConsentQuestionsAnswered,
				risksUnderstood: informedConsentRisksUnderstood,
				withdrawUnderstood: informedConsentWithdrawUnderstood,
			}),
		[
			informedConsentIntervention,
			informedConsentToothOrArea,
			inferredTreatmentArea,
			informedConsentDiagnosisOrIndication,
			activeVisitComplaint,
			informedConsentExpectedBenefit,
			informedConsentRisks,
			informedConsentAlternatives,
			informedConsentAftercare,
			informedConsentDoctorFullName,
			activeDoctorFullName,
			informedConsentQuestionsAnswered,
			informedConsentRisksUnderstood,
			informedConsentWithdrawUnderstood,
		],
	);

	return (
		<DocumentPayloadCard
			title="Информированное согласие"
			description="Конкретное вмешательство, область, показание, риски, альтернативы и рекомендации без пустого шаблона."
			notice={
				review.blockers.length > 0 ? (
					<div
						className="schedule-create-missing document-informed-consent-blockers"
						role="status"
						aria-live="polite"
						style={{ marginTop: "12px" }}
					>
						<strong>
							Согласие не создастся: осталось {review.blockers.length} условий
							из {review.requiredCount}:
						</strong>
						<ul>
							{review.blockers.map((blocker) => (
								<li key={blocker.field}>
									{blocker.label} — {blocker.hint}
								</li>
							))}
						</ul>
						<small>
							Всё это в блоке «Ручная корректировка полей» ниже, отметки — в
							самом его низу. Дату подтверждения программа поставит сама при
							создании.
						</small>
					</div>
				) : null}
		>
			<div style={{ marginBottom: "14px" }}>
				<button
					type="button"
					className="secondary-button inline-flex items-center gap-1.5"
					style={{ minHeight: "44px", fontSize: "12px", padding: "8px 14px", borderRadius: "12px" }}
					onClick={() => {
						setInformedConsentIntervention(BASE_INFORMED_CONSENT_PRESET.intervention);
						setInformedConsentDiagnosisOrIndication(BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication);
						setInformedConsentExpectedBenefit(BASE_INFORMED_CONSENT_PRESET.expectedBenefit);
						setInformedConsentAnesthesia(BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia ?? "");
						setInformedConsentMaterialNotes(BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes ?? "");
						setInformedConsentRisks(BASE_INFORMED_CONSENT_PRESET.explainedRisks.join("\n"));
						setInformedConsentAlternatives(BASE_INFORMED_CONSENT_PRESET.alternatives.join("\n"));
						setInformedConsentAftercare(BASE_INFORMED_CONSENT_PRESET.aftercareRequirements.join("\n"));
					}}
				>
					<ClipboardList size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span>1 клик: Первичный осмотр, консультация и рентген-диагностика (Приказ № 1051н)</span>
				</button>
			</div>
			<label>
				Планируемое вмешательство
				<textarea
					value={informedConsentIntervention}
					onChange={(event) =>
						setInformedConsentIntervention(event.target.value)
					}
					placeholder="что именно делаем: например, лечение кариеса зуба 36 с постановкой пломбы"
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Область или зубы
					<input
						value={informedConsentToothOrArea}
						onChange={(event) =>
							setInformedConsentToothOrArea(event.target.value)
						}
						placeholder={inferredTreatmentArea || "FDI / зона лечения"}
					/>
				</label>
				<label>
					Врач
					<input
						value={informedConsentDoctorFullName}
						onChange={(event) =>
							setInformedConsentDoctorFullName(event.target.value)
						}
						placeholder={
							activeDoctorFullName ?? "врач, проводивший разъяснение"
						}
					/>
				</label>
			</div>
			<label>
				Диагноз или клиническое показание
				<textarea
					value={informedConsentDiagnosisOrIndication}
					onChange={(event) =>
						setInformedConsentDiagnosisOrIndication(event.target.value)
					}
					placeholder={activeVisitComplaint ?? "показание к вмешательству"}
					rows={2}
				/>
			</label>
			<label>
				Ожидаемая польза
				<textarea
					value={informedConsentExpectedBenefit}
					onChange={(event) =>
						setInformedConsentExpectedBenefit(event.target.value)
					}
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Анестезия
					<input
						value={informedConsentAnesthesia}
						onChange={(event) =>
							setInformedConsentAnesthesia(event.target.value)
						}
					/>
				</label>
				<label>
					Дата подтверждения
					<input
						value={informedConsentConfirmedAt}
						onChange={(event) =>
							setInformedConsentConfirmedAt(event.target.value)
						}
					/>
				</label>
			</div>
			<label>
				Материалы, препараты и ограничения
				<textarea
					value={informedConsentMaterialNotes}
					onChange={(event) =>
						setInformedConsentMaterialNotes(event.target.value)
					}
					rows={2}
				/>
			</label>
			<label>
				Кому можно сообщать медицинские сведения
				<input
					value={informedConsentTrustedContact}
					onChange={(event) =>
						setInformedConsentTrustedContact(event.target.value)
					}
					placeholder="кому пациент разрешил сообщать сведения, или «никому»"
				/>
			</label>
			<label>
				Разъясненные риски
				<textarea
					value={informedConsentRisks}
					onChange={(event) => setInformedConsentRisks(event.target.value)}
					rows={4}
				/>
			</label>
			<label>
				Альтернативы
				<textarea
					value={informedConsentAlternatives}
					onChange={(event) =>
						setInformedConsentAlternatives(event.target.value)
					}
					rows={4}
				/>
			</label>
			<label>
				После вмешательства
				<textarea
					value={informedConsentAftercare}
					onChange={(event) => setInformedConsentAftercare(event.target.value)}
					rows={4}
				/>
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentQuestionsAnswered}
					type="checkbox"
					onChange={(event) =>
						setInformedConsentQuestionsAnswered(event.target.checked)
					}
				/>
				Пациент получил ответы на вопросы
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentRisksUnderstood}
					type="checkbox"
					onChange={(event) =>
						setInformedConsentRisksUnderstood(event.target.checked)
					}
				/>
				Пациент понял риски, ограничения и прогноз
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentWithdrawUnderstood}
					type="checkbox"
					onChange={(event) =>
						setInformedConsentWithdrawUnderstood(event.target.checked)
					}
				/>
				Пациенту объяснено право отказаться до вмешательства
			</label>
		</DocumentPayloadCard>
	);
});

InformedConsentForm.displayName = "InformedConsentForm";
