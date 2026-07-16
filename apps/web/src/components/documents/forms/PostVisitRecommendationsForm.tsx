import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function PostVisitRecommendationsForm({ activeDoctor, dashboard, inferredTreatmentArea, normalizedPostVisitCareTopic, typedPostVisitCareTopicOptions, applyPostVisitCarePreset, changePostVisitCareTopic, markPostVisitManualEdited }: any) {
  const {
    postVisitCareTopic,
    postVisitProcedureName,
    setPostVisitProcedureName,
    postVisitToothOrArea,
    setPostVisitToothOrArea,
    postVisitPerformedAt,
    setPostVisitPerformedAt,
    postVisitDoctorFullName,
    setPostVisitDoctorFullName,
    postVisitManualEdited,
    postVisitPresetFeedback,
    postVisitAllowedAfter,
    setPostVisitAllowedAfter,
    postVisitRestrictions,
    setPostVisitRestrictions,
    postVisitMedicationAndRinsePlan,
    setPostVisitMedicationAndRinsePlan,
    postVisitHygieneInstructions,
    setPostVisitHygieneInstructions,
    postVisitNutritionInstructions,
    setPostVisitNutritionInstructions,
    postVisitUrgentWarningSigns,
    setPostVisitUrgentWarningSigns,
    postVisitFollowUpAt,
    setPostVisitFollowUpAt,
    postVisitClinicContactInstruction,
    setPostVisitClinicContactInstruction,
    postVisitTelegramSummary,
    setPostVisitTelegramSummary,
    postVisitPrintedCopyReceived,
    setPostVisitPrintedCopyReceived,
    postVisitUrgentSignsUnderstood,
    setPostVisitUrgentSignsUnderstood,
    postVisitTelegramSafe,
    setPostVisitTelegramSafe
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Рекомендации после приема</h3>
								<p>
									Структурированная памятка для пациента и короткий текст для
									Telegram-бота клиники.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
									<div className="document-payload-row">
										<label>
											Блок
											<select
												value={postVisitCareTopic}
												onChange={(event) =>
													changePostVisitCareTopic(
														normalizedPostVisitCareTopic(event.target.value),
													)
												}
											>
												{typedPostVisitCareTopicOptions.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
										</label>
										<label>
											Врач
											<input
												value={postVisitDoctorFullName}
												onChange={(event) => {
													markPostVisitManualEdited();
													setPostVisitDoctorFullName(event.target.value);
												}}
												placeholder={activeDoctor?.fullName ?? "лечащий врач"}
											/>
										</label>
									</div>
									<div className="document-payload-actions">
										<button
											className="secondary-button"
											type="button"
											onClick={() =>
												applyPostVisitCarePreset(postVisitCareTopic, {
													force: true,
												})
											}
										>
											Подставить памятку для темы
										</button>
										<small
											className={
												postVisitPresetFeedback
													? "document-action-guidance"
													: undefined
											}
											role={postVisitPresetFeedback ? "status" : undefined}
											aria-live={postVisitPresetFeedback ? "polite" : undefined}
										>
											{postVisitPresetFeedback
												? postVisitPresetFeedback
												: postVisitManualEdited
													? "Ручные правки сохранены; смена темы не перезапишет текст без этой кнопки."
													: "Тема автоматически подставляет готовые ограничения, уход, питание, тревожные признаки и короткий Telegram-текст."}
										</small>
									</div>
									<label>
										Процедура
										<textarea
											value={postVisitProcedureName}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitProcedureName(event.target.value);
											}}
											placeholder={
												dashboard?.activeVisit?.treatmentPlan ||
												"что выполнено на приеме"
											}
											rows={2}
										/>
									</label>
									<div className="document-payload-row">
										<label>
											Зубы или область
											<input
												value={postVisitToothOrArea}
												onChange={(event) => {
													markPostVisitManualEdited();
													setPostVisitToothOrArea(event.target.value);
												}}
												placeholder={
													inferredTreatmentArea || "FDI / область лечения"
												}
											/>
										</label>
										<label>
											Дата приема
											<input
												value={postVisitPerformedAt}
												onChange={(event) => {
													markPostVisitManualEdited();
													setPostVisitPerformedAt(event.target.value);
												}}
											/>
										</label>
									</div>
									<label>
										Когда можно
										<textarea
											value={postVisitAllowedAfter}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitAllowedAfter(event.target.value);
											}}
											rows={3}
										/>
									</label>
									<label>
										Временные ограничения
										<textarea
											value={postVisitRestrictions}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitRestrictions(event.target.value);
											}}
											rows={4}
										/>
									</label>
									<label>
										Назначения, препараты, полоскания
										<textarea
											value={postVisitMedicationAndRinsePlan}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitMedicationAndRinsePlan(event.target.value);
											}}
											rows={4}
										/>
									</label>
									<label>
										Гигиена
										<textarea
											value={postVisitHygieneInstructions}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitHygieneInstructions(event.target.value);
											}}
											rows={3}
										/>
									</label>
									<label>
										Питание
										<textarea
											value={postVisitNutritionInstructions}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitNutritionInstructions(event.target.value);
											}}
											rows={3}
										/>
									</label>
									<label>
										Тревожные признаки
										<textarea
											value={postVisitUrgentWarningSigns}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitUrgentWarningSigns(event.target.value);
											}}
											rows={4}
										/>
									</label>
									<div className="document-payload-row">
										<label>
											Контрольный прием
											<input
												value={postVisitFollowUpAt}
												onChange={(event) => {
													markPostVisitManualEdited();
													setPostVisitFollowUpAt(event.target.value);
												}}
												placeholder="дата или условие контроля"
											/>
										</label>
										<label>
											Контакт клиники
											<input
												value={postVisitClinicContactInstruction}
												onChange={(event) => {
													markPostVisitManualEdited();
													setPostVisitClinicContactInstruction(
														event.target.value,
													);
												}}
											/>
										</label>
									</div>
									<label>
										Короткий текст для Telegram
										<textarea
											value={postVisitTelegramSummary}
											onChange={(event) => {
												markPostVisitManualEdited();
												setPostVisitTelegramSummary(event.target.value);
											}}
											rows={3}
										/>
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={postVisitPrintedCopyReceived}
											type="checkbox"
											onChange={(event) =>
												setPostVisitPrintedCopyReceived(event.target.checked)
											}
										/>
										Пациент получил памятку
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={postVisitUrgentSignsUnderstood}
											type="checkbox"
											onChange={(event) =>
												setPostVisitUrgentSignsUnderstood(event.target.checked)
											}
										/>
										Пациент понимает тревожные признаки
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={postVisitTelegramSafe}
											type="checkbox"
											onChange={(event) =>
												setPostVisitTelegramSafe(event.target.checked)
											}
										/>
										Telegram-текст не раскрывает лишние медицинские подробности
									</label>
								</div>
							</details>
						</article>
					
  );
}
