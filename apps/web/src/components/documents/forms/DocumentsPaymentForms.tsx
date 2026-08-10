import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function PaidMedicalServicesContractForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                paidContractRequired,
                details,
                summary,
                label,
                input,
                paidContractNumber,
                event,
                setPaidContractNumber,
                paidContractDate,
                setPaidContractDate,
                paidContractServiceStart,
                setPaidContractServiceStart,
                paidContractServiceEnd,
                setPaidContractServiceEnd,
                paidContractCustomerFullName,
                setPaidContractCustomerFullName,
                documentPatient,
                paidContractRepresentativeFullName,
                setPaidContractRepresentativeFullName,
                textarea,
                paidContractCareReason,
                setPaidContractCareReason,
                dashboard,
                chip,
                button,
                appendChipToText,
                paidContractServiceScope,
                setPaidContractServiceScope,
                paidContractTotalRub,
                setPaidContractTotalRub,
                paidContractTotalRubValue,
                money,
                paidContractDoctorFullName,
                setPaidContractDoctorFullName,
                activeDoctor,
                paidContractPaymentTerms,
                setPaidContractPaymentTerms,
                paidContractPriceChangeRules,
                setPaidContractPriceChangeRules,
                paidContractFreeCareNotice,
                setPaidContractFreeCareNotice,
                paidContractRecommendationWarning,
                setPaidContractRecommendationWarning,
                paidContractRefundTerms,
                setPaidContractRefundTerms,
                paidContractWarrantyTerms,
                setPaidContractWarrantyTerms,
                paidContractSignedAt,
                setPaidContractSignedAt,
                paidContractClinicInfoConfirmed,
                setPaidContractClinicInfoConfirmed,
                paidContractServiceListConfirmed,
                setPaidContractServiceListConfirmed,
                paidContractPaidBasisConfirmed,
                setPaidContractPaidBasisConfirmed,
                paidContractWrittenChangesConfirmed,
                setPaidContractWrittenChangesConfirmed
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Договор платных медицинских услуг</h3>
    								<p>
    									Фиксация номера, сроков, состава услуг, стоимости, порядка
    									оплаты и обязательных уведомлений пациента до лечения.
    								</p>
    							</div>
    							{paidContractRequired ? (
    								<PaidContractRequiredFieldsPanel
    									review={paidContractRequired}
    									fieldsBlockTitle={PAID_CONTRACT_FIELDS_BLOCK_TITLE}
    								/>
    							) : null}
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
    									{/*
            В подписи стоит счётчик нехваток: сам блок свёрнут, и без счётчика
            человек не понимал, что разворачивать его обязательно.
          */}
    									✏️ {PAID_CONTRACT_FIELDS_BLOCK_TITLE}
    									{paidContractRequired?.missing.length
    										? ` — не хватает ${paidContractRequired.missing.length}`
    										: " — всё заполнено"}
    									{" (развернуть)"}
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
    											Номер договора
    											<input
    												value={paidContractNumber}
    												onChange={(event) =>
    													setPaidContractNumber(event.target.value)
    												}
    												placeholder="например: ДПМУ-2026-001"
    											/>
    										</label>
    										<label>
    											Дата договора
    											<input
    												value={paidContractDate}
    												onChange={(event) =>
    													setPaidContractDate(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<div className="document-payload-row">
    										<label>
    											Начало оказания
    											<input
    												value={paidContractServiceStart}
    												onChange={(event) =>
    													setPaidContractServiceStart(event.target.value)
    												}
    												placeholder="дата и время первого этапа"
    											/>
    										</label>
    										<label>
    											Завершение
    											<input
    												value={paidContractServiceEnd}
    												onChange={(event) =>
    													setPaidContractServiceEnd(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<div className="document-payload-row">
    										<label>
    											Заказчик
    											<input
    												value={paidContractCustomerFullName}
    												onChange={(event) =>
    													setPaidContractCustomerFullName(event.target.value)
    												}
    												placeholder={
    													documentPatient?.fullName ??
    													"если не отличается от пациента"
    												}
    											/>
    										</label>
    										<label>
    											Представитель
    											<input
    												value={paidContractRepresentativeFullName}
    												onChange={(event) =>
    													setPaidContractRepresentativeFullName(
    														event.target.value,
    													)
    												}
    												placeholder="если действует представитель"
    											/>
    										</label>
    									</div>
    									<label>
    										Основание обращения
    										<textarea
    											value={paidContractCareReason}
    											onChange={(event) =>
    												setPaidContractCareReason(event.target.value)
    											}
    											placeholder={
    												dashboard?.activeVisit?.complaint ??
    												"жалоба, диагноз или плановый повод"
    											}
    											rows={2}
    										/>
    										<div
    											className="quick-chips-row"
    											style={{ marginTop: "6px", flexWrap: "wrap" }}
    										>
    											{[
    												"Кариес",
    												"Пульпит",
    												"Острая боль",
    												"Плановый осмотр",
    												"Профгигиена",
    												"Жалобы отсутствуют",
    											].map((chip) => (
    												<button
    													key={chip}
    													type="button"
    													className="quick-chip quick-chip--sm"
    													onClick={() =>
    														setPaidContractCareReason(
    															appendChipToText(paidContractCareReason, chip),
    														)
    													}
    												>
    													+ {chip}
    												</button>
    											))}
    										</div>
    									</label>
    									<label>
    										Состав услуг
    										<textarea
    											value={paidContractServiceScope}
    											onChange={(event) =>
    												setPaidContractServiceScope(event.target.value)
    											}
    											placeholder={
    												dashboard?.activeVisit?.treatmentPlan ||
    												dashboard?.activeVisit?.doctorSummary ||
    												"перечень согласованных платных услуг"
    											}
    											rows={3}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Сумма договора
    											<input
    												inputMode="numeric"
    												value={paidContractTotalRub}
    												onChange={(event) =>
    													setPaidContractTotalRub(event.target.value)
    												}
    												placeholder={
    													paidContractTotalRubValue()
    														? money(paidContractTotalRubValue())
    														: "сумма цифрами, копейки после запятой"
    												}
    											/>
    										</label>
    										<label>
    											Ответственный врач
    											<input
    												value={paidContractDoctorFullName}
    												onChange={(event) =>
    													setPaidContractDoctorFullName(event.target.value)
    												}
    												placeholder={activeDoctor?.fullName ?? "лечащий врач"}
    											/>
    										</label>
    									</div>
    									<label>
    										Порядок оплаты
    										<textarea
    											value={paidContractPaymentTerms}
    											onChange={(event) =>
    												setPaidContractPaymentTerms(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Изменение цены и объема
    										<textarea
    											value={paidContractPriceChangeRules}
    											onChange={(event) =>
    												setPaidContractPriceChangeRules(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Уведомление о бесплатной помощи
    										<textarea
    											value={paidContractFreeCareNotice}
    											onChange={(event) =>
    												setPaidContractFreeCareNotice(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Предупреждение о рекомендациях врача
    										<textarea
    											value={paidContractRecommendationWarning}
    											onChange={(event) =>
    												setPaidContractRecommendationWarning(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Отказ и возврат
    										<textarea
    											value={paidContractRefundTerms}
    											onChange={(event) =>
    												setPaidContractRefundTerms(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Гарантия и претензии
    										<textarea
    											value={paidContractWarrantyTerms}
    											onChange={(event) =>
    												setPaidContractWarrantyTerms(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Подписано
    										<input
    											value={paidContractSignedAt}
    											onChange={(event) =>
    												setPaidContractSignedAt(event.target.value)
    											}
    										/>
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paidContractClinicInfoConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaidContractClinicInfoConfirmed(event.target.checked)
    											}
    										/>
    										Пациент получил сведения о клинике, лицензии и исполнителе
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paidContractServiceListConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaidContractServiceListConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Перечень услуг и стоимость переданы пациенту до подписания
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paidContractPaidBasisConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaidContractPaidBasisConfirmed(event.target.checked)
    											}
    										/>
    										Пациент понимает платную основу оказания услуг
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paidContractWrittenChangesConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaidContractWrittenChangesConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Изменения состава или стоимости оформляются письменно
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function CompletedWorksActForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                completedActNumber,
                event,
                setCompletedActNumber,
                completedActDate,
                setCompletedActDate,
                completedActContractNumber,
                setCompletedActContractNumber,
                select,
                selectedCompletedActContractDocumentId,
                setCompletedActLinkedContractDocumentId,
                contract,
                typedActiveIssuedPaidContracts,
                completedActContractReferenceForUi,
                option,
                small,
                completedActServicePeriodStart,
                setCompletedActServicePeriodStart,
                completedActServicePeriodEnd,
                setCompletedActServicePeriodEnd,
                completedActDoctorFullName,
                setCompletedActDoctorFullName,
                activeDoctor,
                textarea,
                completedActServicesSummary,
                setCompletedActServicesSummary,
                dashboard,
                completedActTotalRub,
                setCompletedActTotalRub,
                treatmentAcceptancePlannedTotalRub,
                money,
                completedActPaidRub,
                setCompletedActPaidRub,
                completedActPaidRubValue,
                completedActFiscalReceipts,
                setCompletedActFiscalReceipts,
                completedActFiscalReceiptLines,
                completedActPatientClaims,
                setCompletedActPatientClaims,
                chip,
                button,
                completedActLinkedContract,
                setCompletedActLinkedContract,
                completedActFinalScopeConfirmed,
                setCompletedActFinalScopeConfirmed,
                completedActFiscalReceiptsVerified,
                setCompletedActFiscalReceiptsVerified,
                completedActAccepted,
                setCompletedActAccepted
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Акт выполненных работ</h3>
    								<p>
    									Финальное подтверждение фактически оказанных услуг, оплаты,
    									чеков и претензий пациента.
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
    											Номер акта
    											<input
    												value={completedActNumber}
    												onChange={(event) =>
    													setCompletedActNumber(event.target.value)
    												}
    												placeholder="например: АВР-2026-001"
    											/>
    										</label>
    										<label>
    											Дата акта
    											<input
    												value={completedActDate}
    												onChange={(event) =>
    													setCompletedActDate(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Договор
    										<input
    											value={completedActContractNumber}
    											onChange={(event) =>
    												setCompletedActContractNumber(event.target.value)
    											}
    											placeholder="номер и дата договора"
    										/>
    									</label>
    									<label>
    										Выданный договор
    										<select
    											value={selectedCompletedActContractDocumentId}
    											onChange={(event) => {
    												setCompletedActLinkedContractDocumentId(
    													event.target.value,
    												);
    												const contract = typedActiveIssuedPaidContracts.find(
    													(document) => document.id === event.target.value,
    												);
    												if (contract && !completedActContractNumber.trim())
    													setCompletedActContractNumber(
    														completedActContractReferenceForUi(contract),
    													);
    											}}
    										>
    											{typedActiveIssuedPaidContracts.length === 1 ? null : (
    												<option value="">Выберите договор</option>
    											)}
    											{typedActiveIssuedPaidContracts.map((document) => (
    												<option key={document.id} value={document.id}>
    													{completedActContractReferenceForUi(document)}
    												</option>
    											))}
    										</select>
    										<small>
    											Акт можно выдать только после конкретного выданного
    											договора по этому пациенту и визиту.
    										</small>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Период с
    											<input
    												value={completedActServicePeriodStart}
    												onChange={(event) =>
    													setCompletedActServicePeriodStart(event.target.value)
    												}
    											/>
    										</label>
    										<label>
    											Период по
    											<input
    												value={completedActServicePeriodEnd}
    												onChange={(event) =>
    													setCompletedActServicePeriodEnd(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Врач-исполнитель
    										<input
    											value={completedActDoctorFullName}
    											onChange={(event) =>
    												setCompletedActDoctorFullName(event.target.value)
    											}
    											placeholder={activeDoctor?.fullName ?? "лечащий врач"}
    										/>
    									</label>
    									<label>
    										Состав работ
    										<textarea
    											value={completedActServicesSummary}
    											onChange={(event) =>
    												setCompletedActServicesSummary(event.target.value)
    											}
    											placeholder={
    												dashboard?.activeVisit?.doctorSummary ||
    												dashboard?.activeVisit?.treatmentPlan ||
    												"что фактически оказано"
    											}
    											rows={3}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Сумма по акту
    											<input
    												inputMode="numeric"
    												value={completedActTotalRub}
    												onChange={(event) =>
    													setCompletedActTotalRub(event.target.value)
    												}
    												placeholder={
    													treatmentAcceptancePlannedTotalRub()
    														? money(treatmentAcceptancePlannedTotalRub())
    														: "сумма цифрами, копейки после запятой"
    												}
    											/>
    										</label>
    										<label>
    											Оплачено
    											<input
    												inputMode="numeric"
    												value={completedActPaidRub}
    												onChange={(event) =>
    													setCompletedActPaidRub(event.target.value)
    												}
    												placeholder={
    													completedActPaidRubValue()
    														? money(completedActPaidRubValue())
    														: "сумма цифрами, копейки после запятой"
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Фискальные чеки
    										<textarea
    											value={completedActFiscalReceipts}
    											onChange={(event) =>
    												setCompletedActFiscalReceipts(event.target.value)
    											}
    											placeholder={
    												completedActFiscalReceiptLines().join("\n") ||
    												"номер каждого чека с новой строки"
    											}
    											rows={3}
    										/>
    									</label>
    									<label>
    										Замечания пациента
    										<textarea
    											value={completedActPatientClaims}
    											onChange={(event) =>
    												setCompletedActPatientClaims(event.target.value)
    											}
    											placeholder="оставьте пустым, если замечаний нет"
    											rows={3}
    										/>
    										<div
    											className="quick-chips-row"
    											style={{ marginTop: "6px", flexWrap: "wrap" }}
    										>
    											{[
    												"Без замечаний",
    												"Претензий не имею",
    												"Услуги оказаны в полном объеме",
    											].map((chip) => (
    												<button
    													key={chip}
    													type="button"
    													className="quick-chip quick-chip--sm"
    													onClick={() => setCompletedActPatientClaims(chip)}
    												>
    													{chip}
    												</button>
    											))}
    										</div>
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={completedActLinkedContract}
    											type="checkbox"
    											onChange={(event) =>
    												setCompletedActLinkedContract(event.target.checked)
    											}
    										/>
    										Акт связан с подписанным договором
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={completedActFinalScopeConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setCompletedActFinalScopeConfirmed(event.target.checked)
    											}
    										/>
    										Финальный состав работ проверен
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={completedActFiscalReceiptsVerified}
    											type="checkbox"
    											onChange={(event) =>
    												setCompletedActFiscalReceiptsVerified(
    													event.target.checked,
    												)
    											}
    										/>
    										Фискальные чеки и оплаты сверены
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={completedActAccepted}
    											type="checkbox"
    											onChange={(event) =>
    												setCompletedActAccepted(event.target.checked)
    											}
    										/>
    										Пациент принял работы, замечания внесены до подписания
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

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

export function PaymentInvoiceForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                paymentInvoiceNumber,
                event,
                setPaymentInvoiceNumber,
                paymentInvoiceDate,
                setPaymentInvoiceDate,
                paymentInvoicePayerFullName,
                setPaymentInvoicePayerFullName,
                documentPatient,
                paymentInvoiceDueDate,
                setPaymentInvoiceDueDate,
                paymentInvoicePayerPhone,
                setPaymentInvoicePayerPhone,
                paymentInvoicePayerEmail,
                setPaymentInvoicePayerEmail,
                textarea,
                paymentInvoicePurpose,
                setPaymentInvoicePurpose,
                paymentInvoicePaymentTerms,
                setPaymentInvoicePaymentTerms,
                paymentInvoiceBankDetails,
                setPaymentInvoiceBankDetails,
                dashboard,
                paymentInvoiceQrPayload,
                setPaymentInvoiceQrPayload,
                money,
                paymentInvoiceTotalRubValue,
                plannedServiceLinesForFinancialPayload,
                paymentInvoiceCashlessAllowed,
                setPaymentInvoiceCashlessAllowed,
                paymentInvoiceCashDeskAllowed,
                setPaymentInvoiceCashDeskAllowed,
                paymentInvoiceRequisitesVerified,
                setPaymentInvoiceRequisitesVerified,
                paymentInvoiceServiceScopeConfirmed,
                setPaymentInvoiceServiceScopeConfirmed,
                paymentInvoiceFiscalNoticeConfirmed,
                setPaymentInvoiceFiscalNoticeConfirmed
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Счет на оплату</h3>
    								<p>
    									Реквизиты, плательщик, срок оплаты и состав услуг. Счет не
    									заменяет кассовый чек.
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
    											Номер счета
    											<input
    												value={paymentInvoiceNumber}
    												onChange={(event) =>
    													setPaymentInvoiceNumber(event.target.value)
    												}
    												placeholder="например: СЧ-2026-001"
    											/>
    										</label>
    										<label>
    											Дата счета
    											<input
    												value={paymentInvoiceDate}
    												onChange={(event) =>
    													setPaymentInvoiceDate(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<div className="document-payload-row">
    										<label>
    											Плательщик
    											<input
    												value={paymentInvoicePayerFullName}
    												onChange={(event) =>
    													setPaymentInvoicePayerFullName(event.target.value)
    												}
    												placeholder={
    													documentPatient?.fullName ?? "ФИО плательщика"
    												}
    											/>
    										</label>
    										<label>
    											Срок оплаты
    											<input
    												value={paymentInvoiceDueDate}
    												onChange={(event) =>
    													setPaymentInvoiceDueDate(event.target.value)
    												}
    												placeholder="например: до 25.05.2026"
    											/>
    										</label>
    									</div>
    									<div className="document-payload-row">
    										<label>
    											Телефон плательщика
    											<input
    												value={paymentInvoicePayerPhone}
    												onChange={(event) =>
    													setPaymentInvoicePayerPhone(event.target.value)
    												}
    												placeholder={documentPatient?.phone ?? "необязательно"}
    											/>
    										</label>
    										<label>
    											Email плательщика
    											<input
    												value={paymentInvoicePayerEmail}
    												onChange={(event) =>
    													setPaymentInvoicePayerEmail(event.target.value)
    												}
    												placeholder={documentPatient?.email ?? "необязательно"}
    											/>
    										</label>
    									</div>
    									<label>
    										Назначение платежа
    										<textarea
    											value={paymentInvoicePurpose}
    											onChange={(event) =>
    												setPaymentInvoicePurpose(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Условия оплаты
    										<textarea
    											value={paymentInvoicePaymentTerms}
    											onChange={(event) =>
    												setPaymentInvoicePaymentTerms(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Реквизиты клиники
    										<textarea
    											value={paymentInvoiceBankDetails}
    											onChange={(event) =>
    												setPaymentInvoiceBankDetails(event.target.value)
    											}
    											placeholder={
    												dashboard?.clinicSettings.profile.bankDetails ??
    												"расчетный счет, банк, БИК, корр. счет"
    											}
    											rows={3}
    										/>
    									</label>
    									<label>
    										QR/платежная строка
    										<textarea
    											value={paymentInvoiceQrPayload}
    											onChange={(event) =>
    												setPaymentInvoiceQrPayload(event.target.value)
    											}
    											placeholder="необязательно: данные СБП или платежная ссылка"
    											rows={2}
    										/>
    									</label>
    									<p className="small">
    										Сумма из плана лечения:{" "}
    										{money(paymentInvoiceTotalRubValue())}. Строк услуг:{" "}
    										{plannedServiceLinesForFinancialPayload().length}.
    									</p>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentInvoiceCashlessAllowed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentInvoiceCashlessAllowed(event.target.checked)
    											}
    										/>
    										Безналичная оплата разрешена
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentInvoiceCashDeskAllowed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentInvoiceCashDeskAllowed(event.target.checked)
    											}
    										/>
    										Оплата в кассе разрешена
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentInvoiceRequisitesVerified}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentInvoiceRequisitesVerified(
    													event.target.checked,
    												)
    											}
    										/>
    										Реквизиты клиники проверены
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentInvoiceServiceScopeConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentInvoiceServiceScopeConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Состав услуг соответствует плану или договору
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentInvoiceFiscalNoticeConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentInvoiceFiscalNoticeConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Плательщик предупрежден: счет не является кассовым чеком
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function PaymentReceiptForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                paymentReceiptNumber,
                event,
                setPaymentReceiptNumber,
                paymentReceiptDate,
                setPaymentReceiptDate,
                section,
                strong,
                span,
                selectedPaymentReceiptPayments,
                typedEligiblePaymentReceiptPayments,
                money,
                selectedPaymentReceiptTotalRub,
                button,
                setSelectedPaymentReceiptIds,
                payment,
                paymentDate,
                receiptLabel,
                paymentFiscalReceiptLabelForUi,
                payerLabel,
                selectedPaymentReceiptIdSet,
                current,
                paymentId,
                small,
                paymentReceiptPayerFullName,
                setPaymentReceiptPayerFullName,
                paymentReceiptPayerFullNameValue,
                paymentReceiptTaxSupportRequested,
                setPaymentReceiptTaxSupportRequested,
                paymentReceiptPayerBirthDate,
                setPaymentReceiptPayerBirthDate,
                paymentReceiptPayerBirthDateValue,
                paymentReceiptPayerInn,
                setPaymentReceiptPayerInn,
                paymentReceiptPayerInnValue,
                paymentReceiptPayerRelationship,
                setPaymentReceiptPayerRelationship,
                paymentReceiptPayerRelationshipValue,
                paymentReceiptPayerIdentityDocument,
                setPaymentReceiptPayerIdentityDocument,
                paymentReceiptPayerIdentityDocumentValue,
                textarea,
                paymentReceiptPurpose,
                setPaymentReceiptPurpose,
                paymentReceiptIssuedBy,
                setPaymentReceiptIssuedBy,
                paymentReceiptIssuedByValue,
                paymentReceiptFiscalReceiptLines,
                paymentReceiptPaymentsVerified,
                setPaymentReceiptPaymentsVerified,
                paymentReceiptPayerVerified,
                setPaymentReceiptPayerVerified,
                paymentReceiptFiscalNoticeConfirmed,
                setPaymentReceiptFiscalNoticeConfirmed
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Платежная квитанция</h3>
    								<p>
    									Явный набор оплаченных платежей, данные плательщика и
    									фискальные чеки без скрытого захвата лишних оплат.
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
    											Номер квитанции
    											<input
    												value={paymentReceiptNumber}
    												onChange={(event) =>
    													setPaymentReceiptNumber(event.target.value)
    												}
    												placeholder="например: КВ-2026-001"
    											/>
    										</label>
    										<label>
    											Дата квитанции
    											<input
    												value={paymentReceiptDate}
    												onChange={(event) =>
    													setPaymentReceiptDate(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<section
    										className="document-factory-tax-payments"
    										aria-label="Оплаты для платежной квитанции"
    									>
    										<div className="document-factory-tax-payments-heading">
    											<div>
    												<strong>Оплаты и фискальные чеки</strong>
    												<span>
    													Выбрано {selectedPaymentReceiptPayments.length} из{" "}
    													{typedEligiblePaymentReceiptPayments.length} ·{" "}
    													{money(selectedPaymentReceiptTotalRub)}
    												</span>
    											</div>
    											<div>
    												<button
    													type="button"
    													className="text-button"
    													onClick={() =>
    														setSelectedPaymentReceiptIds(
    															typedEligiblePaymentReceiptPayments.map(
    																(payment) => payment.id,
    															),
    														)
    													}
    												>
    													Все
    												</button>
    												<button
    													type="button"
    													className="text-button"
    													onClick={() => setSelectedPaymentReceiptIds([])}
    												>
    													Снять
    												</button>
    											</div>
    										</div>
    										{typedEligiblePaymentReceiptPayments.length ? (
    											<div className="tax-payment-selection-list">
    												{typedEligiblePaymentReceiptPayments.map((payment) => {
    													const paymentDate =
    														payment.fiscalReceiptIssuedAt || payment.paidAt;
    													const receiptLabel =
    														paymentFiscalReceiptLabelForUi(payment);
    													const payerLabel =
    														payment.payerFullName?.trim() ||
    														"плательщик не указан";
    													return (
    														<label
    															key={payment.id}
    															className="tax-payment-selection-item"
    														>
    															<input
    																type="checkbox"
    																checked={selectedPaymentReceiptIdSet.has(
    																	payment.id,
    																)}
    																onChange={(event) => {
    																	setSelectedPaymentReceiptIds(
    																		(current: string[]) =>
    																			event.target.checked
    																				? Array.from(
    																						new Set([...current, payment.id]),
    																					)
    																				: current.filter(
    																						(paymentId: string) =>
    																							paymentId !== payment.id,
    																					),
    																	);
    																}}
    															/>
    															<span>
    																<strong>
    																	{money(payment.amountRub)} · чек{" "}
    																	{receiptLabel}
    																</strong>
    																<small>
    																	{paymentDate ?? "дата не указана"} ·{" "}
    																	{payerLabel}
    																	{payment.payerInn
    																		? ` · ИНН ${payment.payerInn}`
    																		: " · ИНН не указан"}
    																</small>
    															</span>
    														</label>
    													);
    												})}
    											</div>
    										) : (
    											<EmptyState
    												title="Нет оплаченных платежей"
    												description="Нет оплаченных платежей по текущему визиту. Сначала сохраните оплату с фискальным чеком и данными плательщика."
    												className="my-3 py-6"
    											/>
    										)}
    									</section>
    									<div className="document-payload-row">
    										<label>
    											Плательщик
    											<input
    												value={paymentReceiptPayerFullName}
    												onChange={(event) =>
    													setPaymentReceiptPayerFullName(event.target.value)
    												}
    												placeholder={paymentReceiptPayerFullNameValue()}
    											/>
    										</label>
    									</div>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentReceiptTaxSupportRequested}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentReceiptTaxSupportRequested(
    													event.target.checked,
    												)
    											}
    										/>
    										Нужна налоговая опора: включить дату рождения, ИНН или
    										документ плательщика
    									</label>
    									{paymentReceiptTaxSupportRequested ? (
    										<>
    											<div className="document-payload-row">
    												<label>
    													Дата рождения плательщика
    													<input
    														value={paymentReceiptPayerBirthDate}
    														onChange={(event) =>
    															setPaymentReceiptPayerBirthDate(
    																event.target.value,
    															)
    														}
    														placeholder={paymentReceiptPayerBirthDateValue()}
    													/>
    												</label>
    												<label>
    													ИНН плательщика
    													<input
    														value={paymentReceiptPayerInn}
    														onChange={(event) =>
    															setPaymentReceiptPayerInn(event.target.value)
    														}
    														placeholder={paymentReceiptPayerInnValue()}
    													/>
    												</label>
    											</div>
    											<div className="document-payload-row">
    												<label>
    													Связь с пациентом
    													<input
    														value={paymentReceiptPayerRelationship}
    														onChange={(event) =>
    															setPaymentReceiptPayerRelationship(
    																event.target.value,
    															)
    														}
    														placeholder={paymentReceiptPayerRelationshipValue()}
    													/>
    												</label>
    												<label>
    													Документ плательщика
    													<input
    														value={paymentReceiptPayerIdentityDocument}
    														onChange={(event) =>
    															setPaymentReceiptPayerIdentityDocument(
    																event.target.value,
    															)
    														}
    														placeholder={paymentReceiptPayerIdentityDocumentValue()}
    													/>
    												</label>
    											</div>
    										</>
    									) : (
    										<p className="small">
    											Обычная квитанция не требует паспортных данных и ИНН. Для
    											налоговой справки используйте налоговые документы или
    											включите налоговую опору здесь.
    										</p>
    									)}
    									<label>
    										Назначение оплаты
    										<textarea
    											value={paymentReceiptPurpose}
    											onChange={(event) =>
    												setPaymentReceiptPurpose(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Выдал
    										<input
    											value={paymentReceiptIssuedBy}
    											onChange={(event) =>
    												setPaymentReceiptIssuedBy(event.target.value)
    											}
    											placeholder={paymentReceiptIssuedByValue()}
    										/>
    									</label>
    									<p className="small">
    										Номера чеков:{" "}
    										{paymentReceiptFiscalReceiptLines().length
    											? paymentReceiptFiscalReceiptLines().join(", ")
    											: "у выбранных платежей нет номеров чеков"}
    										.
    									</p>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentReceiptPaymentsVerified}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentReceiptPaymentsVerified(event.target.checked)
    											}
    										/>
    										Выбранные платежи и фискальные чеки сверены
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentReceiptPayerVerified}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentReceiptPayerVerified(event.target.checked)
    											}
    										/>
    										Данные плательщика проверены
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={paymentReceiptFiscalNoticeConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setPaymentReceiptFiscalNoticeConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Квитанция не заменяет кассовый чек
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function InstallmentPaymentScheduleForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                installmentScheduleNumber,
                event,
                setInstallmentScheduleNumber,
                installmentScheduleDate,
                setInstallmentScheduleDate,
                installmentScheduleBaseDocumentTitle,
                setInstallmentScheduleBaseDocumentTitle,
                installmentScheduleBaseDocumentTitleValue,
                installmentSchedulePayerFullName,
                setInstallmentSchedulePayerFullName,
                documentPatient,
                installmentScheduleResponsibleFullName,
                setInstallmentScheduleResponsibleFullName,
                activeDoctor,
                installmentScheduleTotalRub,
                setInstallmentScheduleTotalRub,
                installmentScheduleTotalRubValue,
                money,
                installmentSchedulePrepaidRub,
                setInstallmentSchedulePrepaidRub,
                installmentSchedulePrepaidRubValue,
                textarea,
                installmentScheduleRows,
                setInstallmentScheduleRows,
                span,
                installmentScheduleRemainingRubValue,
                installmentScheduleInstallmentRows,
                installmentScheduleLatePolicy,
                setInstallmentScheduleLatePolicy,
                installmentSchedulePaymentMethodNotes,
                setInstallmentSchedulePaymentMethodNotes,
                installmentScheduleAccepted,
                setInstallmentScheduleAccepted,
                installmentScheduleFiscalNoticeConfirmed,
                setInstallmentScheduleFiscalNoticeConfirmed,
                installmentScheduleWrittenChangesConfirmed,
                setInstallmentScheduleWrittenChangesConfirmed
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>График рассрочки и оплат</h3>
    								<p>
    									Внутренний график сроков и сумм к договору или плану лечения
    									без подмены банковского кредита.
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
    											Номер графика
    											<input
    												value={installmentScheduleNumber}
    												onChange={(event) =>
    													setInstallmentScheduleNumber(event.target.value)
    												}
    												placeholder="например: ГР-2026-001"
    											/>
    										</label>
    										<label>
    											Дата графика
    											<input
    												value={installmentScheduleDate}
    												onChange={(event) =>
    													setInstallmentScheduleDate(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Основание
    										<input
    											value={installmentScheduleBaseDocumentTitle}
    											onChange={(event) =>
    												setInstallmentScheduleBaseDocumentTitle(
    													event.target.value,
    												)
    											}
    											placeholder={installmentScheduleBaseDocumentTitleValue()}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Плательщик
    											<input
    												value={installmentSchedulePayerFullName}
    												onChange={(event) =>
    													setInstallmentSchedulePayerFullName(
    														event.target.value,
    													)
    												}
    												placeholder={
    													documentPatient?.fullName ?? "ФИО плательщика"
    												}
    											/>
    										</label>
    										<label>
    											Ответственный
    											<input
    												value={installmentScheduleResponsibleFullName}
    												onChange={(event) =>
    													setInstallmentScheduleResponsibleFullName(
    														event.target.value,
    													)
    												}
    												placeholder={activeDoctor?.fullName ?? "администратор"}
    											/>
    										</label>
    									</div>
    									<div className="document-payload-row">
    										<label>
    											Общая сумма
    											<input
    												inputMode="numeric"
    												value={installmentScheduleTotalRub}
    												onChange={(event) =>
    													setInstallmentScheduleTotalRub(event.target.value)
    												}
    												placeholder={
    													installmentScheduleTotalRubValue()
    														? money(installmentScheduleTotalRubValue())
    														: "сумма цифрами, копейки после запятой"
    												}
    											/>
    										</label>
    										<label>
    											Предоплата
    											<input
    												inputMode="numeric"
    												value={installmentSchedulePrepaidRub}
    												onChange={(event) =>
    													setInstallmentSchedulePrepaidRub(event.target.value)
    												}
    												placeholder={
    													installmentSchedulePrepaidRubValue()
    														? money(installmentSchedulePrepaidRubValue())
    														: "сумма цифрами, копейки после запятой"
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Платежи
    										<textarea
    											value={installmentScheduleRows}
    											onChange={(event) =>
    												setInstallmentScheduleRows(event.target.value)
    											}
    											rows={4}
    										/>
    										<span>
    											Формат строки: этап | срок | сумма | запланировано /
    											оплачено / просрочено / перенесено / отменено
    										</span>
    									</label>
    									<p className="small">
    										Остаток: {money(installmentScheduleRemainingRubValue())}.
    										Платежей: {installmentScheduleInstallmentRows().length}.
    									</p>
    									<label>
    										Правила просрочки
    										<textarea
    											value={installmentScheduleLatePolicy}
    											onChange={(event) =>
    												setInstallmentScheduleLatePolicy(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Способы оплаты
    										<textarea
    											value={installmentSchedulePaymentMethodNotes}
    											onChange={(event) =>
    												setInstallmentSchedulePaymentMethodNotes(
    													event.target.value,
    												)
    											}
    											rows={2}
    										/>
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={installmentScheduleAccepted}
    											type="checkbox"
    											onChange={(event) =>
    												setInstallmentScheduleAccepted(event.target.checked)
    											}
    										/>
    										Пациент или плательщик принял график
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={installmentScheduleFiscalNoticeConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setInstallmentScheduleFiscalNoticeConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										График не заменяет кассовый чек
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={installmentScheduleWrittenChangesConfirmed}
    											type="checkbox"
    											onChange={(event) =>
    												setInstallmentScheduleWrittenChangesConfirmed(
    													event.target.checked,
    												)
    											}
    										/>
    										Изменения суммы или сроков оформляются письменно
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

export function PaymentRefundCorrectionRequestForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                select,
                refundAction,
                event,
                setRefundAction,
                normalizedPaymentRefundCorrectionAction,
                option,
                refundSelectedPaymentId,
                selectRefundOriginalPayment,
                typedEligibleRefundCorrectionPayments,
                payment,
                money,
                paymentFiscalReceiptLabelForUi,
                selectedRefundCorrectionPayment,
                small,
                input,
                refundAmountRub,
                setRefundAmountRub,
                textarea,
                refundReason,
                setRefundReason,
                refundMethod,
                setRefundMethod,
                normalizedPaymentRefundCorrectionMethod,
                refundRecipientFullName,
                setRefundRecipientFullName,
                paymentPayerFullName,
                activePatient,
                refundRecipientIdentityDocument,
                setRefundRecipientIdentityDocument,
                paymentPayerIdentityDocument,
                refundBankDetails,
                setRefundBankDetails,
                refundOriginalFiscalReceiptNumber,
                setRefundOriginalFiscalReceiptNumber,
                paymentFiscalReceiptNumber,
                refundCorrectionFiscalReceiptNumber,
                setRefundCorrectionFiscalReceiptNumber,
                refundAccountantDecision,
                setRefundAccountantDecision
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Возврат или коррекция</h3>
    								<p>
    									Сумма, действие, чек, получатель и решение ответственного.
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
    										Действие
    										<select
    											value={refundAction}
    											onChange={(event) =>
    												setRefundAction(
    													normalizedPaymentRefundCorrectionAction(
    														event.target.value,
    													),
    												)
    											}
    										>
    											<option value="full_refund">Полный возврат</option>
    											<option value="partial_refund">Частичный возврат</option>
    											<option value="payment_transfer">Перенос оплаты</option>
    											<option value="receipt_correction">Коррекция чека</option>
    											<option value="payer_details_correction">
    												Коррекция данных плательщика
    											</option>
    										</select>
    									</label>
    									<label>
    										Исходный платеж
    										<select
    											value={refundSelectedPaymentId}
    											onChange={(event) =>
    												selectRefundOriginalPayment(event.target.value)
    											}
    										>
    											<option value="">
    												Выберите оплату с фискальным чеком
    											</option>
    											{typedEligibleRefundCorrectionPayments?.map((payment) => (
    												<option key={payment.id} value={payment.id}>
    													{`${money(payment.amountRub)} · ${paymentFiscalReceiptLabelForUi(payment)} · ${
    														payment.fiscalReceiptIssuedAt ||
    														payment.paidAt ||
    														"дата не указана"
    													}`}
    												</option>
    											))}
    										</select>
    										{selectedRefundCorrectionPayment ? (
    											<small>
    												К возврату доступно не больше{" "}
    												{money(selectedRefundCorrectionPayment.amountRub)} по
    												выбранному исходному платежу.
    											</small>
    										) : null}
    									</label>
    									<label>
    										Сумма
    										<input
    											inputMode="numeric"
    											value={refundAmountRub}
    											onChange={(event) =>
    												setRefundAmountRub(event.target.value)
    											}
    										/>
    									</label>
    									<label>
    										Основание
    										<textarea
    											value={refundReason}
    											onChange={(event) => setRefundReason(event.target.value)}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Способ
    										<select
    											value={refundMethod}
    											onChange={(event) =>
    												setRefundMethod(
    													normalizedPaymentRefundCorrectionMethod(
    														event.target.value,
    													),
    												)
    											}
    										>
    											<option value="cash">Наличные</option>
    											<option value="card">Карта</option>
    											<option value="bank_transfer">Банковский перевод</option>
    											<option value="internal_offset">
    												Внутренний взаимозачет
    											</option>
    											<option value="no_money_movement">
    												Без движения денег
    											</option>
    										</select>
    									</label>
    									<label>
    										Получатель
    										<input
    											value={refundRecipientFullName}
    											onChange={(event) =>
    												setRefundRecipientFullName(event.target.value)
    											}
    											placeholder={
    												paymentPayerFullName ||
    												activePatient?.fullName ||
    												"фамилия, имя и отчество получателя"
    											}
    										/>
    									</label>
    									<label>
    										Документ получателя
    										<input
    											value={refundRecipientIdentityDocument}
    											onChange={(event) =>
    												setRefundRecipientIdentityDocument(event.target.value)
    											}
    											placeholder={
    												paymentPayerIdentityDocument ||
    												activePatient?.administrativeProfile
    													?.identityDocument ||
    												"паспорт"
    											}
    										/>
    									</label>
    									<label>
    										Банковские реквизиты
    										<textarea
    											value={refundBankDetails}
    											onChange={(event) =>
    												setRefundBankDetails(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Исходный фискальный чек
    										<input
    											value={refundOriginalFiscalReceiptNumber}
    											onChange={(event) =>
    												setRefundOriginalFiscalReceiptNumber(event.target.value)
    											}
    											placeholder={
    												paymentFiscalReceiptNumber ||
    												"номер чека или данные фискального чека"
    											}
    										/>
    									</label>
    									<label>
    										Корректирующий чек
    										<input
    											value={refundCorrectionFiscalReceiptNumber}
    											onChange={(event) =>
    												setRefundCorrectionFiscalReceiptNumber(
    													event.target.value,
    												)
    											}
    										/>
    									</label>
    									<label>
    										Решение ответственного
    										<textarea
    											value={refundAccountantDecision}
    											onChange={(event) =>
    												setRefundAccountantDecision(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}
