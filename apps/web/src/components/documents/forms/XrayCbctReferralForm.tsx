import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function XrayCbctReferralForm({
	activeDoctor,
	inferredTreatmentArea,
	normalizedXrayPregnancyStatus,
	normalizedXrayPriority,
	normalizedXrayStudyType,
	renderClinicalToothRowsEditor,
	typedXrayStudyTypeOptions,
	typedXrayPregnancyStatusOptions,
}: any) {
	const {
		xrayStudyType,
		setXrayStudyType,
		xrayArea,
		setXrayArea,
		xrayClinicalQuestion,
		setXrayClinicalQuestion,
		xrayIndication,
		setXrayIndication,
		xrayPregnancyStatus,
		setXrayPregnancyStatus,
		xraySafetyNotes,
		setXraySafetyNotes,
		xrayPriority,
		setXrayPriority,
		xrayIncludeDicomExport,
		setXrayIncludeDicomExport,
		xrayIncludeRadiologistReport,
		setXrayIncludeRadiologistReport,
		xrayRequestedBy,
		setXrayRequestedBy,
		xrayRecipientClinic,
		setXrayRecipientClinic,
		xrayDueDate,
		setXrayDueDate,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Направление на снимок</h3>
				<p>
					Вид исследования, область, клинический вопрос, показание и ограничения
					до рентгена или КЛКТ.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					{renderClinicalToothRowsEditor()}
					<label>
						Вид исследования
						<select
							value={xrayStudyType}
							onChange={(event) =>
								setXrayStudyType(normalizedXrayStudyType(event.target.value))
							}
						>
							{typedXrayStudyTypeOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
					<label>
						Область
						<input
							value={xrayArea}
							onChange={(event) => setXrayArea(event.target.value)}
							placeholder={inferredTreatmentArea || "зуб / сегмент / челюсть"}
						/>
					</label>
					<label>
						Клинический вопрос
						<textarea
							value={xrayClinicalQuestion}
							onChange={(event) => setXrayClinicalQuestion(event.target.value)}
							placeholder="что нужно подтвердить или исключить"
							rows={2}
						/>
					</label>
					<label>
						Показание
						<textarea
							value={xrayIndication}
							onChange={(event) => setXrayIndication(event.target.value)}
							placeholder="эндодонтия / имплантация / хирургия / ортодонтия / контроль"
							rows={2}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Срочность
							<select
								value={xrayPriority}
								onChange={(event) =>
									setXrayPriority(normalizedXrayPriority(event.target.value))
								}
							>
								<option value="routine">Планово</option>
								<option value="urgent">Срочно</option>
							</select>
						</label>
						<label>
							Беременность
							<select
								value={xrayPregnancyStatus}
								onChange={(event) =>
									setXrayPregnancyStatus(
										normalizedXrayPregnancyStatus(event.target.value),
									)
								}
							>
								{typedXrayPregnancyStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<label>
						Ограничения и защита
						<textarea
							value={xraySafetyNotes}
							onChange={(event) => setXraySafetyNotes(event.target.value)}
							rows={2}
						/>
					</label>
					<div className="document-payload-row">
						<label className="document-payload-checkbox">
							<input
								checked={xrayIncludeDicomExport}
								type="checkbox"
								onChange={(event) =>
									setXrayIncludeDicomExport(event.target.checked)
								}
							/>
							Нужны исходные файлы снимков
						</label>
						<label className="document-payload-checkbox">
							<input
								checked={xrayIncludeRadiologistReport}
								type="checkbox"
								onChange={(event) =>
									setXrayIncludeRadiologistReport(event.target.checked)
								}
							/>
							Нужен отчет рентгенолога
						</label>
					</div>
					<label>
						Назначил
						<input
							value={xrayRequestedBy}
							onChange={(event) => setXrayRequestedBy(event.target.value)}
							placeholder={activeDoctor?.fullName ?? "лечащий врач"}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Куда направить
							<input
								value={xrayRecipientClinic}
								onChange={(event) => setXrayRecipientClinic(event.target.value)}
								placeholder="свой кабинет / партнерский центр"
							/>
						</label>
						<label>
							Срок
							<input
								value={xrayDueDate}
								onChange={(event) => setXrayDueDate(event.target.value)}
								placeholder="например: до имплантации"
							/>
						</label>
					</div>
				</div>
			</details>
		</article>
	);
}
