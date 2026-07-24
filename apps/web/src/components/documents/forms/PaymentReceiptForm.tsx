import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function PaymentReceiptForm({
	money,
	paymentFiscalReceiptLabelForUi,
	paymentReceiptFiscalReceiptLines,
	paymentReceiptIssuedByValue,
	paymentReceiptPayerBirthDateValue,
	paymentReceiptPayerFullNameValue,
	paymentReceiptPayerIdentityDocumentValue,
	paymentReceiptPayerInnValue,
	paymentReceiptPayerRelationshipValue,
	selectedPaymentReceiptIdSet,
	selectedPaymentReceiptPayments,
	selectedPaymentReceiptTotalRub,
	typedEligiblePaymentReceiptPayments,
}: any) {
	const {
		setSelectedPaymentReceiptIds,
		paymentReceiptNumber,
		setPaymentReceiptNumber,
		paymentReceiptDate,
		setPaymentReceiptDate,
		paymentReceiptPayerFullName,
		setPaymentReceiptPayerFullName,
		paymentReceiptPayerBirthDate,
		setPaymentReceiptPayerBirthDate,
		paymentReceiptPayerInn,
		setPaymentReceiptPayerInn,
		paymentReceiptPayerIdentityDocument,
		setPaymentReceiptPayerIdentityDocument,
		paymentReceiptPayerRelationship,
		setPaymentReceiptPayerRelationship,
		paymentReceiptTaxSupportRequested,
		setPaymentReceiptTaxSupportRequested,
		paymentReceiptPurpose,
		setPaymentReceiptPurpose,
		paymentReceiptIssuedBy,
		setPaymentReceiptIssuedBy,
		paymentReceiptPaymentsVerified,
		setPaymentReceiptPaymentsVerified,
		paymentReceiptPayerVerified,
		setPaymentReceiptPayerVerified,
		paymentReceiptFiscalNoticeConfirmed,
		setPaymentReceiptFiscalNoticeConfirmed,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Платежная квитанция</h3>
				<p>
					Явный набор оплаченных платежей, данные плательщика и фискальные чеки
					без скрытого захвата лишних оплат.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
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
								onChange={(event) => setPaymentReceiptDate(event.target.value)}
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
									const receiptLabel = paymentFiscalReceiptLabelForUi(payment);
									const payerLabel =
										payment.payerFullName?.trim() || "плательщик не указан";
									return (
										<label
											key={payment.id}
											className="tax-payment-selection-item"
										>
											<input
												type="checkbox"
												checked={selectedPaymentReceiptIdSet.has(payment.id)}
												onChange={(event) => {
													setSelectedPaymentReceiptIds((current: string[]) =>
														event.target.checked
															? Array.from(new Set([...current, payment.id]))
															: current.filter(
																	(paymentId: string) =>
																		paymentId !== payment.id,
																),
													);
												}}
											/>
											<span>
												<strong>
													{money(payment.amountRub)} · чек {receiptLabel}
												</strong>
												<small>
													{paymentDate ?? "дата не указана"} · {payerLabel}
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
							<span className="tax-payment-selection-empty">
								Нет оплаченных платежей по текущему визиту. Сначала сохраните
								оплату с фискальным чеком и данными плательщика.
							</span>
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
								setPaymentReceiptTaxSupportRequested(event.target.checked)
							}
						/>
						Нужна налоговая опора: включить дату рождения, ИНН или документ
						плательщика
					</label>
					{paymentReceiptTaxSupportRequested ? (
						<>
							<div className="document-payload-row">
								<label>
									Дата рождения плательщика
									<input
										value={paymentReceiptPayerBirthDate}
										onChange={(event) =>
											setPaymentReceiptPayerBirthDate(event.target.value)
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
											setPaymentReceiptPayerRelationship(event.target.value)
										}
										placeholder={paymentReceiptPayerRelationshipValue()}
									/>
								</label>
								<label>
									Документ плательщика
									<input
										value={paymentReceiptPayerIdentityDocument}
										onChange={(event) =>
											setPaymentReceiptPayerIdentityDocument(event.target.value)
										}
										placeholder={paymentReceiptPayerIdentityDocumentValue()}
									/>
								</label>
							</div>
						</>
					) : (
						<p className="small">
							Обычная квитанция не требует паспортных данных и ИНН. Для
							налоговой справки используйте налоговые документы или включите
							налоговую опору здесь.
						</p>
					)}
					<label>
						Назначение оплаты
						<textarea
							value={paymentReceiptPurpose}
							onChange={(event) => setPaymentReceiptPurpose(event.target.value)}
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
								setPaymentReceiptFiscalNoticeConfirmed(event.target.checked)
							}
						/>
						Квитанция не заменяет кассовый чек
					</label>
				</div>
			</details>
		</article>
	);
}
