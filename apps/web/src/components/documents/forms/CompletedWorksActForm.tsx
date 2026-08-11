import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

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

