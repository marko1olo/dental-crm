import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function InformedConsentForm({
	activeDoctor,
	dashboard,
	inferredTreatmentArea,
}: any) {
	const {
		informedConsentIntervention,
		setInformedConsentIntervention,
		informedConsentToothOrArea,
		setInformedConsentToothOrArea,
		informedConsentDiagnosisOrIndication,
		setInformedConsentDiagnosisOrIndication,
		informedConsentExpectedBenefit,
		setInformedConsentExpectedBenefit,
		informedConsentAnesthesia,
		setInformedConsentAnesthesia,
		informedConsentMaterialNotes,
		setInformedConsentMaterialNotes,
		informedConsentTrustedContact,
		setInformedConsentTrustedContact,
		informedConsentRisks,
		setInformedConsentRisks,
		informedConsentAlternatives,
		setInformedConsentAlternatives,
		informedConsentAftercare,
		setInformedConsentAftercare,
		informedConsentDoctorFullName,
		setInformedConsentDoctorFullName,
		informedConsentConfirmedAt,
		setInformedConsentConfirmedAt,
		informedConsentQuestionsAnswered,
		setInformedConsentQuestionsAnswered,
		informedConsentRisksUnderstood,
		setInformedConsentRisksUnderstood,
		informedConsentWithdrawUnderstood,
		setInformedConsentWithdrawUnderstood,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Информированное согласие</h3>
				<p>
					Конкретное вмешательство, область, показание, риски, альтернативы и
					рекомендации без пустого шаблона.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Планируемое вмешательство
						<textarea
							value={informedConsentIntervention}
							onChange={(event) =>
								setInformedConsentIntervention(event.target.value)
							}
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
									activeDoctor?.fullName ?? "врач, проводивший разъяснение"
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
							placeholder={
								dashboard?.activeVisit?.complaint ?? "показание к вмешательству"
							}
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
							onChange={(event) =>
								setInformedConsentAftercare(event.target.value)
							}
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
				</div>
			</details>
		</article>
	);
}
