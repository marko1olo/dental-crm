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
export function InformedConsentForm({
	activeDoctorFullName,
	activeVisitComplaint,
	inferredTreatmentArea,
}: DocumentVisitHints) {
	const {
		informedConsentAftercare,
		informedConsentAlternatives,
		informedConsentAnesthesia,
		informedConsentConfirmedAt,
		informedConsentDiagnosisOrIndication,
		informedConsentDoctorFullName,
		informedConsentExpectedBenefit,
		informedConsentIntervention,
		informedConsentMaterialNotes,
		informedConsentQuestionsAnswered,
		informedConsentRisks,
		informedConsentRisksUnderstood,
		informedConsentToothOrArea,
		informedConsentTrustedContact,
		informedConsentWithdrawUnderstood,
		setInformedConsentAftercare,
		setInformedConsentAlternatives,
		setInformedConsentAnesthesia,
		setInformedConsentConfirmedAt,
		setInformedConsentDiagnosisOrIndication,
		setInformedConsentDoctorFullName,
		setInformedConsentExpectedBenefit,
		setInformedConsentIntervention,
		setInformedConsentMaterialNotes,
		setInformedConsentQuestionsAnswered,
		setInformedConsentRisks,
		setInformedConsentRisksUnderstood,
		setInformedConsentToothOrArea,
		setInformedConsentTrustedContact,
		setInformedConsentWithdrawUnderstood,
	} = useDocumentStore();

	const review = informedConsentBlockersReview({
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
	});

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
							Согласие не создастся: осталось {review.blockers.length} условий из{" "}
							{review.requiredCount}:
						</strong>
						<ul>
							{review.blockers.map((blocker) => (
								<li key={blocker.field}>
									{blocker.label} — {blocker.hint}
								</li>
							))}
						</ul>
						<small>
							Всё это в блоке «Ручная корректировка полей» ниже, отметки — в самом его
							низу. Дату подтверждения программа поставит сама при создании.
						</small>
					</div>
				) : null
			}
		>
			<label>
				Планируемое вмешательство
				<textarea
					value={informedConsentIntervention}
					onChange={(event) => setInformedConsentIntervention(event.target.value)}
					placeholder="что именно делаем: например, лечение кариеса зуба 36 с постановкой пломбы"
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Область или зубы
					<input
						value={informedConsentToothOrArea}
						onChange={(event) => setInformedConsentToothOrArea(event.target.value)}
						placeholder={inferredTreatmentArea || "FDI / зона лечения"}
					/>
				</label>
				<label>
					Врач
					<input
						value={informedConsentDoctorFullName}
						onChange={(event) => setInformedConsentDoctorFullName(event.target.value)}
						placeholder={activeDoctorFullName ?? "врач, проводивший разъяснение"}
					/>
				</label>
			</div>
			<label>
				Диагноз или клиническое показание
				<textarea
					value={informedConsentDiagnosisOrIndication}
					onChange={(event) => setInformedConsentDiagnosisOrIndication(event.target.value)}
					placeholder={activeVisitComplaint ?? "показание к вмешательству"}
					rows={2}
				/>
			</label>
			<label>
				Ожидаемая польза
				<textarea value={informedConsentExpectedBenefit} onChange={(event) => setInformedConsentExpectedBenefit(event.target.value)} rows={2} />
			</label>
			<div className="document-payload-row">
				<label>
					Анестезия
					<input value={informedConsentAnesthesia} onChange={(event) => setInformedConsentAnesthesia(event.target.value)} />
				</label>
				<label>
					Дата подтверждения
					<input value={informedConsentConfirmedAt} onChange={(event) => setInformedConsentConfirmedAt(event.target.value)} />
				</label>
			</div>
			<label>
				Материалы, препараты и ограничения
				<textarea value={informedConsentMaterialNotes} onChange={(event) => setInformedConsentMaterialNotes(event.target.value)} rows={2} />
			</label>
			<label>
				Кому можно сообщать медицинские сведения
				<input
					value={informedConsentTrustedContact}
					onChange={(event) => setInformedConsentTrustedContact(event.target.value)}
					placeholder="кому пациент разрешил сообщать сведения, или «никому»"
				/>
			</label>
			<label>
				Разъясненные риски
				<textarea value={informedConsentRisks} onChange={(event) => setInformedConsentRisks(event.target.value)} rows={4} />
			</label>
			<label>
				Альтернативы
				<textarea value={informedConsentAlternatives} onChange={(event) => setInformedConsentAlternatives(event.target.value)} rows={4} />
			</label>
			<label>
				После вмешательства
				<textarea value={informedConsentAftercare} onChange={(event) => setInformedConsentAftercare(event.target.value)} rows={4} />
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentQuestionsAnswered}
					type="checkbox"
					onChange={(event) => setInformedConsentQuestionsAnswered(event.target.checked)}
				/>
				Пациент получил ответы на вопросы
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentRisksUnderstood}
					type="checkbox"
					onChange={(event) => setInformedConsentRisksUnderstood(event.target.checked)}
				/>
				Пациент понял риски, ограничения и прогноз
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={informedConsentWithdrawUnderstood}
					type="checkbox"
					onChange={(event) => setInformedConsentWithdrawUnderstood(event.target.checked)}
				/>
				Пациенту объяснено право отказаться до вмешательства
			</label>
		</DocumentPayloadCard>
	);
}
