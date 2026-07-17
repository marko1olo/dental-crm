import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function CompletedWorksActForm({
	activeDoctor,
	dashboard,
	treatmentAcceptancePlannedTotalRub,
	completedActContractReferenceForUi,
	completedActFiscalReceiptLines,
	completedActPaidRubValue,
	selectedCompletedActContractDocumentId,
	typedActiveIssuedPaidContracts,
}: any) {
	const {
		completedActNumber,
		setCompletedActNumber,
		completedActDate,
		setCompletedActDate,
		completedActContractNumber,
		setCompletedActContractNumber,
		setCompletedActLinkedContractDocumentId,
		completedActServicePeriodStart,
		setCompletedActServicePeriodStart,
		completedActServicePeriodEnd,
		setCompletedActServicePeriodEnd,
		completedActDoctorFullName,
		setCompletedActDoctorFullName,
		completedActServicesSummary,
		setCompletedActServicesSummary,
		completedActTotalRub,
		setCompletedActTotalRub,
		completedActPaidRub,
		setCompletedActPaidRub,
		completedActFiscalReceipts,
		setCompletedActFiscalReceipts,
		completedActPatientClaims,
		setCompletedActPatientClaims,
		completedActLinkedContract,
		setCompletedActLinkedContract,
		completedActFinalScopeConfirmed,
		setCompletedActFinalScopeConfirmed,
		completedActFiscalReceiptsVerified,
		setCompletedActFiscalReceiptsVerified,
		completedActAccepted,
		setCompletedActAccepted,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Акт выполненных работ</h3>
				<p>
					Финальное подтверждение фактически оказанных услуг, оплаты, чеков и
					претензий пациента.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<div className="document-payload-row">
						<label>
							Номер акта
							<input
								value={completedActNumber}
								onChange={(event) => setCompletedActNumber(event.target.value)}
								placeholder="например: АВР-2026-001"
							/>
						</label>
						<label>
							Дата акта
							<input
								value={completedActDate}
								onChange={(event) => setCompletedActDate(event.target.value)}
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
								setCompletedActLinkedContractDocumentId(event.target.value);
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
							Акт можно выдать только после конкретного выданного договора по
							этому пациенту и визиту.
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
								placeholder={String(treatmentAcceptancePlannedTotalRub() || "")}
							/>
						</label>
						<label>
							Оплачено
							<input
								inputMode="numeric"
								value={completedActPaidRub}
								onChange={(event) => setCompletedActPaidRub(event.target.value)}
								placeholder={String(completedActPaidRubValue() || "")}
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
						<div className="quick-chips-row">
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
								setCompletedActFiscalReceiptsVerified(event.target.checked)
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
