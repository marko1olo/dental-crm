import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function TreatmentPlanForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                textarea,
                treatmentPlanClinicalReason,
                event,
                setTreatmentPlanClinicalReason,
                dashboard,
                treatmentPlanDiagnosisSummary,
                setTreatmentPlanDiagnosisSummary,
                input,
                treatmentPlanTeethOrArea,
                setTreatmentPlanTeethOrArea,
                inferredTreatmentArea,
                treatmentPlanEstimatedTotalRub,
                setTreatmentPlanEstimatedTotalRub,
                treatmentAcceptancePlannedTotalRub,
                money,
                treatmentPlanGoals,
                setTreatmentPlanGoals,
                renderClinicalToothRowsEditor,
                treatmentPlanStages,
                setTreatmentPlanStages,
                small,
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
                activeDoctor,
                treatmentPlanPlannedAt,
                setTreatmentPlanPlannedAt,
                treatmentPlanQuestionsAnswered,
                setTreatmentPlanQuestionsAnswered,
                treatmentPlanSeparateConsentAcknowledged,
                setTreatmentPlanSeparateConsentAcknowledged,
                treatmentPlanNewApprovalAcknowledged,
                setTreatmentPlanNewApprovalAcknowledged
            } = props;
            
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
    													treatmentAcceptancePlannedTotalRub()
    														? money(treatmentAcceptancePlannedTotalRub())
    														: "сумма цифрами, копейки после запятой"
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
    									{renderClinicalToothRowsEditor()}
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
            
}

export function TreatmentPlanAcceptanceForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                select,
                treatmentAcceptanceVariant,
                event,
                setTreatmentAcceptanceVariant,
                normalizedTreatmentPlanAcceptanceVariant,
                option,
                textarea,
                treatmentAcceptanceClinicalGoal,
                setTreatmentAcceptanceClinicalGoal,
                treatmentAcceptanceDiagnosisSummary,
                setTreatmentAcceptanceDiagnosisSummary,
                dashboard,
                input,
                treatmentAcceptanceTeethOrArea,
                setTreatmentAcceptanceTeethOrArea,
                inferredTreatmentArea,
                renderClinicalToothRowsEditor,
                treatmentAcceptanceStages,
                setTreatmentAcceptanceStages,
                small,
                treatmentAcceptanceEstimatedTotalRub,
                setTreatmentAcceptanceEstimatedTotalRub,
                treatmentAcceptancePlannedTotalRub,
                money,
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
                activeDoctor,
                treatmentAcceptanceAcceptedAt,
                setTreatmentAcceptanceAcceptedAt,
                treatmentAcceptanceQuestionsAnswered,
                setTreatmentAcceptanceQuestionsAnswered,
                treatmentAcceptanceAlternativesUnderstood,
                setTreatmentAcceptanceAlternativesUnderstood,
                treatmentAcceptanceCostChangeUnderstood,
                setTreatmentAcceptanceCostChangeUnderstood,
                treatmentAcceptanceRevisionAcknowledged,
                setTreatmentAcceptanceRevisionAcknowledged
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Согласование плана лечения</h3>
    								<p>
    									Фиксирует выбранный вариант, этапы, сумму, срок действия
    									сметы, альтернативы, риски и подтверждения пациента.
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
    										Выбранный вариант
    										<select
    											value={treatmentAcceptanceVariant}
    											onChange={(event) =>
    												setTreatmentAcceptanceVariant(
    													normalizedTreatmentPlanAcceptanceVariant(
    														event.target.value,
    													),
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
    												setTreatmentAcceptanceDiagnosisSummary(
    													event.target.value,
    												)
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
    												inferredTreatmentArea ||
    												"FDI-коды зубов или область лечения"
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
    										<small>
    											Формат строки: этап | услуги и объем | срок | сумма
    										</small>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Стоимость
    											<input
    												inputMode="numeric"
    												value={treatmentAcceptanceEstimatedTotalRub}
    												onChange={(event) =>
    													setTreatmentAcceptanceEstimatedTotalRub(
    														event.target.value,
    													)
    												}
    												placeholder={
    													treatmentAcceptancePlannedTotalRub()
    														? money(treatmentAcceptancePlannedTotalRub())
    														: "сумма цифрами, копейки после запятой"
    												}
    											/>
    										</label>
    										<label>
    											Смета действует до
    											<input
    												value={treatmentAcceptanceEstimateValidUntil}
    												onChange={(event) =>
    													setTreatmentAcceptanceEstimateValidUntil(
    														event.target.value,
    													)
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
    												setTreatmentAcceptanceRejectedAlternatives(
    													event.target.value,
    												)
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
    													setTreatmentAcceptanceDoctorFullName(
    														event.target.value,
    													)
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
    												setTreatmentAcceptanceQuestionsAnswered(
    													event.target.checked,
    												)
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
    												setTreatmentAcceptanceCostChangeUnderstood(
    													event.target.checked,
    												)
    											}
    										/>
    										Пациент понимает, что стоимость может измениться при новых
    										данных
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={treatmentAcceptanceRevisionAcknowledged}
    											type="checkbox"
    											onChange={(event) =>
    												setTreatmentAcceptanceRevisionAcknowledged(
    													event.target.checked,
    												)
    											}
    										/>
    										Существенное изменение плана требует нового согласования
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function PostVisitRecommendationsForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                select,
                postVisitCareTopic,
                event,
                changePostVisitCareTopic,
                normalizedPostVisitCareTopic,
                typedPostVisitCareTopicOptions,
                option,
                input,
                postVisitDoctorFullName,
                markPostVisitManualEdited,
                setPostVisitDoctorFullName,
                activeDoctor,
                button,
                applyPostVisitCarePreset,
                small,
                postVisitPresetFeedback,
                postVisitManualEdited,
                textarea,
                postVisitProcedureName,
                setPostVisitProcedureName,
                dashboard,
                postVisitToothOrArea,
                setPostVisitToothOrArea,
                inferredTreatmentArea,
                postVisitPerformedAt,
                setPostVisitPerformedAt,
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
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Рекомендации после приема</h3>
    								<p>
    									Структурированная памятка для пациента и короткий текст для
    									Telegram-бота клиники.
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

export function PrescriptionMedicationOrderForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                renderClinicalToothRowsEditor,
                label,
                input,
                prescriptionMedication,
                event,
                setPrescriptionMedication,
                prescriptionDosage,
                setPrescriptionDosage,
                textarea,
                prescriptionInstructions,
                setPrescriptionInstructions,
                prescriptionDuration,
                setPrescriptionDuration,
                prescriptionSafetyNotes,
                setPrescriptionSafetyNotes,
                prescriptionUrgentContactReason,
                setPrescriptionUrgentContactReason
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Назначение препаратов</h3>
    								<p>Один понятный блок назначения без догадок в документе.</p>
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
    									{renderClinicalToothRowsEditor()}
    									<label>
    										Препарат
    										<input
    											value={prescriptionMedication}
    											onChange={(event) =>
    												setPrescriptionMedication(event.target.value)
    											}
    											placeholder="например: ибупрофен"
    										/>
    									</label>
    									<label>
    										Дозировка
    										<input
    											value={prescriptionDosage}
    											onChange={(event) =>
    												setPrescriptionDosage(event.target.value)
    											}
    										/>
    									</label>
    									<label>
    										Режим приема
    										<textarea
    											value={prescriptionInstructions}
    											onChange={(event) =>
    												setPrescriptionInstructions(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Длительность
    										<input
    											value={prescriptionDuration}
    											onChange={(event) =>
    												setPrescriptionDuration(event.target.value)
    											}
    										/>
    									</label>
    									<label>
    										Памятка пациенту
    										<textarea
    											value={prescriptionSafetyNotes}
    											onChange={(event) =>
    												setPrescriptionSafetyNotes(event.target.value)
    											}
    											rows={3}
    										/>
    									</label>
    									<label>
    										Срочно связаться если
    										<textarea
    											value={prescriptionUrgentContactReason}
    											onChange={(event) =>
    												setPrescriptionUrgentContactReason(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function LabWorkOrderForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                renderClinicalToothRowsEditor,
                label,
                input,
                labWorkType,
                event,
                setLabWorkType,
                labTeethOrArea,
                setLabTeethOrArea,
                inferredTreatmentArea,
                labMaterial,
                setLabMaterial,
                labShade,
                setLabShade,
                labSource,
                setLabSource,
                labDeadline,
                setLabDeadline,
                textarea,
                labTechnicianNotes,
                setLabTechnicianNotes
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Заявка в лабораторию</h3>
    								<p>Работа, зона, материал, цвет, источник данных и срок.</p>
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
    									{renderClinicalToothRowsEditor()}
    									<label>
    										Вид работы
    										<input
    											value={labWorkType}
    											onChange={(event) => setLabWorkType(event.target.value)}
    											placeholder="коронка / вкладка / каппа"
    										/>
    									</label>
    									<label>
    										Зубы или зона
    										<input
    											value={labTeethOrArea}
    											onChange={(event) =>
    												setLabTeethOrArea(event.target.value)
    											}
    											placeholder={inferredTreatmentArea || "FDI / сегмент"}
    										/>
    									</label>
    									<label>
    										Материал
    										<input
    											value={labMaterial}
    											onChange={(event) => setLabMaterial(event.target.value)}
    										/>
    									</label>
    									<label>
    										Цвет
    										<input
    											value={labShade}
    											onChange={(event) => setLabShade(event.target.value)}
    										/>
    									</label>
    									<label>
    										Источник данных
    										<input
    											value={labSource}
    											onChange={(event) => setLabSource(event.target.value)}
    											placeholder="скан / слепок / фото"
    										/>
    									</label>
    									<label>
    										Срок
    										<input
    											value={labDeadline}
    											onChange={(event) => setLabDeadline(event.target.value)}
    										/>
    									</label>
    									<label>
    										Комментарий технику
    										<textarea
    											value={labTechnicianNotes}
    											onChange={(event) =>
    												setLabTechnicianNotes(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function XrayCbctReferralForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                renderClinicalToothRowsEditor,
                label,
                select,
                xrayStudyType,
                event,
                setXrayStudyType,
                normalizedXrayStudyType,
                typedXrayStudyTypeOptions,
                option,
                input,
                xrayArea,
                setXrayArea,
                inferredTreatmentArea,
                textarea,
                xrayClinicalQuestion,
                setXrayClinicalQuestion,
                xrayIndication,
                setXrayIndication,
                xrayPriority,
                setXrayPriority,
                normalizedXrayPriority,
                xrayPregnancyStatus,
                setXrayPregnancyStatus,
                normalizedXrayPregnancyStatus,
                typedXrayPregnancyStatusOptions,
                xraySafetyNotes,
                setXraySafetyNotes,
                xrayIncludeDicomExport,
                setXrayIncludeDicomExport,
                xrayIncludeRadiologistReport,
                setXrayIncludeRadiologistReport,
                xrayRequestedBy,
                setXrayRequestedBy,
                activeDoctor,
                xrayRecipientClinic,
                setXrayRecipientClinic,
                xrayDueDate,
                setXrayDueDate
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Направление на снимок</h3>
    								<p>
    									Вид исследования, область, клинический вопрос, показание и
    									ограничения до рентгена или КЛКТ.
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
    									{renderClinicalToothRowsEditor()}
    									<label>
    										Вид исследования
    										<select
    											value={xrayStudyType}
    											onChange={(event) =>
    												setXrayStudyType(
    													normalizedXrayStudyType(event.target.value),
    												)
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
    											placeholder={
    												inferredTreatmentArea || "зуб / сегмент / челюсть"
    											}
    										/>
    									</label>
    									<label>
    										Клинический вопрос
    										<textarea
    											value={xrayClinicalQuestion}
    											onChange={(event) =>
    												setXrayClinicalQuestion(event.target.value)
    											}
    											placeholder="что нужно подтвердить или исключить"
    											rows={2}
    										/>
    									</label>
    									<label>
    										Показание
    										<textarea
    											value={xrayIndication}
    											onChange={(event) =>
    												setXrayIndication(event.target.value)
    											}
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
    													setXrayPriority(
    														normalizedXrayPriority(event.target.value),
    													)
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
    											onChange={(event) =>
    												setXraySafetyNotes(event.target.value)
    											}
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
    											onChange={(event) =>
    												setXrayRequestedBy(event.target.value)
    											}
    											placeholder={activeDoctor?.fullName ?? "лечащий врач"}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Куда направить
    											<input
    												value={xrayRecipientClinic}
    												onChange={(event) =>
    													setXrayRecipientClinic(event.target.value)
    												}
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

export function WarrantyServiceMemoForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                textarea,
                warrantyServiceOrWorkName,
                event,
                setWarrantyServiceOrWorkName,
                warrantyServiceOrWorkNameValue,
                input,
                warrantyCompletedAt,
                setWarrantyCompletedAt,
                warrantyTeethOrArea,
                setWarrantyTeethOrArea,
                warrantyTeethOrAreaValue,
                warrantyMaterialsOrSystems,
                setWarrantyMaterialsOrSystems,
                warrantyPeriod,
                setWarrantyPeriod,
                warrantyControlVisitSchedule,
                setWarrantyControlVisitSchedule,
                warrantyPatientObligations,
                setWarrantyPatientObligations,
                warrantyExcludedRiskFactors,
                setWarrantyExcludedRiskFactors,
                warrantyUrgentContactReasons,
                setWarrantyUrgentContactReasons,
                warrantyLinkedActOrContract,
                setWarrantyLinkedActOrContract,
                warrantyLinkedActOrContractValue,
                warrantyDoctorFullName,
                setWarrantyDoctorFullName,
                activeDoctor,
                warrantyIssuedAt,
                setWarrantyIssuedAt,
                warrantyPolicyApplied,
                setWarrantyPolicyApplied,
                warrantyAftercareReceived,
                setWarrantyAftercareReceived,
                warrantyControlVisitsUnderstood,
                setWarrantyControlVisitsUnderstood
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Гарантийная памятка</h3>
    								<p>
    									Условия контроля, гарантийный срок, обязанности пациента и
    									признаки для срочной связи.
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
    										Работа или услуга
    										<textarea
    											value={warrantyServiceOrWorkName}
    											onChange={(event) =>
    												setWarrantyServiceOrWorkName(event.target.value)
    											}
    											placeholder={warrantyServiceOrWorkNameValue()}
    											rows={2}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Дата завершения
    											<input
    												value={warrantyCompletedAt}
    												onChange={(event) =>
    													setWarrantyCompletedAt(event.target.value)
    												}
    												placeholder="дата финального этапа"
    											/>
    										</label>
    										<label>
    											Зубы или область
    											<input
    												value={warrantyTeethOrArea}
    												onChange={(event) =>
    													setWarrantyTeethOrArea(event.target.value)
    												}
    												placeholder={warrantyTeethOrAreaValue()}
    											/>
    										</label>
    									</div>
    									<label>
    										Материалы или системы
    										<textarea
    											value={warrantyMaterialsOrSystems}
    											onChange={(event) =>
    												setWarrantyMaterialsOrSystems(event.target.value)
    											}
    											placeholder="материал реставрации, конструкция, имплант-система"
    											rows={2}
    										/>
    									</label>
    									<label>
    										Гарантийный срок и условия
    										<textarea
    											value={warrantyPeriod}
    											onChange={(event) =>
    												setWarrantyPeriod(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Контрольные визиты
    										<textarea
    											value={warrantyControlVisitSchedule}
    											onChange={(event) =>
    												setWarrantyControlVisitSchedule(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Обязанности пациента
    										<textarea
    											value={warrantyPatientObligations}
    											onChange={(event) =>
    												setWarrantyPatientObligations(event.target.value)
    											}
    											rows={4}
    										/>
    									</label>
    									<label>
    										Требует отдельной оценки
    										<textarea
    											value={warrantyExcludedRiskFactors}
    											onChange={(event) =>
    												setWarrantyExcludedRiskFactors(event.target.value)
    											}
    											rows={4}
    										/>
    									</label>
    									<label>
    										Срочно связаться с клиникой
    										<textarea
    											value={warrantyUrgentContactReasons}
    											onChange={(event) =>
    												setWarrantyUrgentContactReasons(event.target.value)
    											}
    											rows={4}
    										/>
    									</label>
    									<label>
    										Связанный акт или договор
    										<input
    											value={warrantyLinkedActOrContract}
    											onChange={(event) =>
    												setWarrantyLinkedActOrContract(event.target.value)
    											}
    											placeholder={warrantyLinkedActOrContractValue()}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Врач
    											<input
    												value={warrantyDoctorFullName}
    												onChange={(event) =>
    													setWarrantyDoctorFullName(event.target.value)
    												}
    												placeholder={activeDoctor?.fullName ?? "лечащий врач"}
    											/>
    										</label>
    										<label>
    											Выдано
    											<input
    												value={warrantyIssuedAt}
    												onChange={(event) =>
    													setWarrantyIssuedAt(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label className="document-payload-checkbox">
    										<input
    											checked={warrantyPolicyApplied}
    											type="checkbox"
    											onChange={(event) =>
    												setWarrantyPolicyApplied(event.target.checked)
    											}
    										/>
    										Применено локальное гарантийное положение клиники
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={warrantyAftercareReceived}
    											type="checkbox"
    											onChange={(event) =>
    												setWarrantyAftercareReceived(event.target.checked)
    											}
    										/>
    										Пациент получил рекомендации после лечения
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={warrantyControlVisitsUnderstood}
    											type="checkbox"
    											onChange={(event) =>
    												setWarrantyControlVisitsUnderstood(event.target.checked)
    											}
    										/>
    										Пациент понимает обязательность контрольных визитов
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}
