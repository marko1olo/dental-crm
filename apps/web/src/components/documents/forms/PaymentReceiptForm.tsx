import React from "react";
import { Edit3 } from "lucide-react";
import type { Payment } from "@dental/shared";
import { useDocumentStore } from "../../../store/documentStore";
import { EmptyState } from "../../EmptyState";

export interface PaymentReceiptFormProps {
	typedEligiblePaymentReceiptPayments?: Payment[];
	selectedPaymentReceiptPayments?: Payment[];
	selectedPaymentReceiptTotalRub?: number;
	paymentFiscalReceiptLabelForUi?: (payment: Payment) => string;
	money?: (val: number | null | undefined) => string;
	paymentReceiptPayerFullNameValue?: () => string;
	paymentReceiptPayerBirthDateValue?: () => string;
	paymentReceiptPayerInnValue?: () => string;
	paymentReceiptPayerRelationshipValue?: () => string;
	paymentReceiptPayerIdentityDocumentValue?: () => string;
	paymentReceiptIssuedByValue?: () => string;
	paymentReceiptFiscalReceiptLines?: () => string[];
}

export const PaymentReceiptForm: React.FC<PaymentReceiptFormProps> = React.memo(
	function PaymentReceiptForm(props) {
		const {
			typedEligiblePaymentReceiptPayments = [],
			selectedPaymentReceiptPayments = [],
			selectedPaymentReceiptTotalRub = 0,
			paymentFiscalReceiptLabelForUi = (p) => p.fiscalReceiptNumber || p.id,
			money = (v) => String(v ?? 0),
			paymentReceiptPayerFullNameValue = () => "",
			paymentReceiptPayerBirthDateValue = () => "",
			paymentReceiptPayerInnValue = () => "",
			paymentReceiptPayerRelationshipValue = () => "",
			paymentReceiptPayerIdentityDocumentValue = () => "",
			paymentReceiptIssuedByValue = () => "",
			paymentReceiptFiscalReceiptLines = () => [],
		} = props;

		const {
			paymentReceiptNumber,
			setPaymentReceiptNumber,
			paymentReceiptDate,
			setPaymentReceiptDate,
			selectedPaymentReceiptIds,
			setSelectedPaymentReceiptIds,
			paymentReceiptPayerFullName,
			setPaymentReceiptPayerFullName,
			paymentReceiptTaxSupportRequested,
			setPaymentReceiptTaxSupportRequested,
			paymentReceiptPayerBirthDate,
			setPaymentReceiptPayerBirthDate,
			paymentReceiptPayerInn,
			setPaymentReceiptPayerInn,
			paymentReceiptPayerRelationship,
			setPaymentReceiptPayerRelationship,
			paymentReceiptPayerIdentityDocument,
			setPaymentReceiptPayerIdentityDocument,
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

		const selectedPaymentReceiptIdSet = React.useMemo(
			() => new Set(selectedPaymentReceiptIds),
			[selectedPaymentReceiptIds],
		);

		return (
			<article className="document-payload-card">
				<div>
					<h3>Платежная квитанция</h3>
					<p>
						Явный набор оплаченных платежей, данные плательщика и фискальные
						чеки без скрытого захвата лишних оплат.
					</p>
				</div>
				<details className="document-manual-override">
					<summary
						style={{
							cursor: "pointer",
							fontWeight: 600,
							color: "var(--brand-700)",
							userSelect: "none",
						}}
					>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Edit3 size={13} aria-hidden="true" />
							Ручная корректировка полей (развернуть)
						</span>
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
								налоговой справки используйте налоговые документы или включите
								налоговую опору здесь.
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
									setPaymentReceiptFiscalNoticeConfirmed(event.target.checked)
								}
							/>
							Квитанция не заменяет кассовый чек
						</label>
					</div>
				</details>
			</article>
		);
	},
);
