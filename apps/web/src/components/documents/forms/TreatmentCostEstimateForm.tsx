import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function TreatmentCostEstimateForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                treatmentEstimateNumber,
                event,
                setTreatmentEstimateNumber,
                treatmentEstimateDate,
                setTreatmentEstimateDate,
                treatmentEstimatePatientOrPayerFullName,
                setTreatmentEstimatePatientOrPayerFullName,
                treatmentEstimatePatientOrPayerFullNameValue,
                treatmentEstimateValidUntil,
                setTreatmentEstimateValidUntil,
                textarea,
                treatmentEstimateTreatmentBasis,
                setTreatmentEstimateTreatmentBasis,
                treatmentEstimateTreatmentBasisValue,
                chip,
                button,
                appendChipToText,
                treatmentEstimateTotalRub,
                setTreatmentEstimateTotalRub,
                treatmentEstimateTotalRubValue,
                money,
                treatmentEstimateDoctorFullName,
                setTreatmentEstimateDoctorFullName,
                activeDoctor,
                treatmentEstimatePriceChangeRules,
                setTreatmentEstimatePriceChangeRules,
                treatmentEstimateExcludedItems,
                setTreatmentEstimateExcludedItems,
                treatmentEstimatePaymentMilestoneNotes,
                setTreatmentEstimatePaymentMilestoneNotes,
                treatmentEstimateAdminFullName,
                setTreatmentEstimateAdminFullName,
                treatmentEstimateSignedAt,
                setTreatmentEstimateSignedAt,
                small,
                plannedServiceLinesForFinancialPayload,
                treatmentEstimatePreliminaryConfirmed,
                setTreatmentEstimatePreliminaryConfirmed,
                treatmentEstimateScopeConfirmed,
                setTreatmentEstimateScopeConfirmed,
                treatmentEstimateFiscalNoticeConfirmed,
                setTreatmentEstimateFiscalNoticeConfirmed,
                treatmentEstimateChangeRulesConfirmed,
                setTreatmentEstimateChangeRulesConfirmed
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Смета лечения</h3>
    								<p>
    									Предварительный расчет с составом услуг, сроком действия,
    									исключениями и правилами изменения цены.
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
    											Номер сметы
    											<input
    												value={treatmentEstimateNumber}
    												onChange={(event) =>
    													setTreatmentEstimateNumber(event.target.value)
    												}
    												placeholder="например: СМ-2026-001"
    											/>
    										</label>
    										<label>
    											Дата сметы
    											<input
    												value={treatmentEstimateDate}
    												onChange={(event) =>
    													setTreatmentEstimateDate(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<div className="document-payload-row">
    										<label>
    											Пациент или плательщик
    											<input
    												value={treatmentEstimatePatientOrPayerFullName}
    												onChange={(event) =>
    													setTreatmentEstimatePatientOrPayerFullName(
    														event.target.value,
    													)
    												}
    												placeholder={
    													treatmentEstimatePatientOrPayerFullNameValue() ||
    													"ФИО пациента или плательщика"
    												}
    											/>
    										</label>
    										<label>
    											Смета действует до
    											<input
    												value={treatmentEstimateValidUntil}
    												onChange={(event) =>
    													setTreatmentEstimateValidUntil(event.target.value)
    												}
    												placeholder="дата или условие действия сметы"
    											/>
    										</label>
    									</div>
    									<label>
    										Основание лечения
    										<textarea
    											value={treatmentEstimateTreatmentBasis}
    											onChange={(event) =>
    												setTreatmentEstimateTreatmentBasis(event.target.value)
    											}
    											placeholder={treatmentEstimateTreatmentBasisValue()}
    											rows={3}
    										/>
    										<div
    											className="quick-chips-row"
    											style={{ marginTop: "6px", flexWrap: "wrap" }}
    										>
    											{[
    												"Кариес дентина",
    												"Острый пульпит",
    												"Частичная адентия",
    												"Хронический периодонтит",
    												"Осмотр и профгигиена",
    											].map((chip) => (
    												<button
    													key={chip}
    													type="button"
    													className="quick-chip quick-chip--sm"
    													onClick={() =>
    														setTreatmentEstimateTreatmentBasis(
    															appendChipToText(
    																treatmentEstimateTreatmentBasis,
    																chip,
    															),
    														)
    													}
    												>
    													+ {chip}
    												</button>
    											))}
    										</div>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Итого по смете
    											<input
    												inputMode="numeric"
    												value={treatmentEstimateTotalRub}
    												onChange={(event) =>
    													setTreatmentEstimateTotalRub(event.target.value)
    												}
    												placeholder={
    													treatmentEstimateTotalRubValue()
    														? money(treatmentEstimateTotalRubValue())
    														: "сумма цифрами, копейки после запятой"
    												}
    											/>
    										</label>
    										<label>
    											Ответственный врач
    											<input
    												value={treatmentEstimateDoctorFullName}
    												onChange={(event) =>
    													setTreatmentEstimateDoctorFullName(event.target.value)
    												}
    												placeholder={activeDoctor?.fullName ?? "лечащий врач"}
    											/>
    										</label>
    									</div>
    									<label>
    										Правила изменения цены
    										<textarea
    											value={treatmentEstimatePriceChangeRules}
    											onChange={(event) =>
    												setTreatmentEstimatePriceChangeRules(event.target.value)
    											}
    											rows={3}
    										/>
    									</label>
    									<label>
    										Не входит в текущую смету
    										<textarea
    											value={treatmentEstimateExcludedItems}
    											onChange={(event) =>
    												setTreatmentEstimateExcludedItems(event.target.value)
    											}
    											rows={4}
    										/>
    										<div
    											className="quick-chips-row"
    											style={{ marginTop: "6px", flexWrap: "wrap" }}
    										>
    											{[
    												"Рентгенологические снимки",
    												"Анестезия",
    												"Дополнительные материалы",
    												"Консультации смежных специалистов",
    												"Удаление зубов",
    											].map((chip) => (
    												<button
    													key={chip}
    													type="button"
    													className="quick-chip quick-chip--sm"
    													onClick={() =>
    														setTreatmentEstimateExcludedItems(
    															appendChipToText(
    																treatmentEstimateExcludedItems,
    																chip,
    															),
    														)
    													}
    												>
    													+ {chip}
    												</button>
    											))}
    										</div>
    									</label>
    									<label>
    										Условия оплаты
    										<textarea
    											value={treatmentEstimatePaymentMilestoneNotes}
    											onChange={(event) =>
    												setTreatmentEstimatePaymentMilestoneNotes(
    													event.target.value,
    												)
    											}
    											rows={3}
    										/>
    										<div
    											className="quick-chips-row"
    											style={{ marginTop: "6px", flexWrap: "wrap" }}
    										>
    											{[
    												"100% предоплата",
    												"Оплата по факту",
    												"Аванс 50%",
    												"Оплата поэтапно",
    												"В рассрочку",
    											].map((chip) => (
    												<button
    													key={chip}
    													type="button"
    													className="quick-chip quick-chip--sm"
    													onClick={() =>
    														setTreatmentEstimatePaymentMilestoneNotes(
    															appendChipToText(
    																treatmentEstimatePaymentMilestoneNotes,
    																chip,
    															),
    														)
    													}
    												>
    													+ {chip}
    												</button>
    											))}
    										</div>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Ответственный администратор
    											<input
    												value={treatmentEstimateAdminFullName}
    												onChange={(event) =>
    													setTreatmentEstimateAdminFullName(event.target.value)
    												}
    												placeholder="если отличается от врача"
    											/>
    										</label>
    										<label>
    											Ознакомление
    											<input
    												value={treatmentEstimateSignedAt}
    												onChange={(event) =>
    													setTreatmentEstimateSignedAt(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<small>
    										Состав услуг берется из плана лечения:{" "}
    										{plannedServiceLinesForFinancialPayload().length} строк,
    										сумма {money(treatmentEstimateTotalRubValue())}.
    									</small>
    									<label className="document-payload-checkbox">
    										<input
    											checked={treatmentEstimatePreliminaryConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setTreatmentEstimatePreliminaryConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Пациент понимает предварительный характер сметы и срок
    										действия
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={treatmentEstimateScopeConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setTreatmentEstimateScopeConfirmed(event.target.checked)
    											}
    										/>
    										Состав услуг сметы сверён с планом лечения
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={treatmentEstimateFiscalNoticeConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setTreatmentEstimateFiscalNoticeConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Смета не заменяет договор, акт и кассовый чек
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={treatmentEstimateChangeRulesConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setTreatmentEstimateChangeRulesConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										При изменениях нужна обновленная смета или отдельное
    										согласование
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

