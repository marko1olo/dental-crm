import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function PaymentRefundCorrectionRequestForm({ activePatient, money, normalizedPaymentRefundCorrectionAction, normalizedPaymentRefundCorrectionMethod, paymentFiscalReceiptLabelForUi, selectedRefundCorrectionPayment, typedEligibleRefundCorrectionPayments, selectRefundOriginalPayment }: any) {
  const {
    paymentFiscalReceiptNumber,
    paymentPayerFullName,
    paymentPayerIdentityDocument,
    refundAccountantDecision,
    refundAction,
    refundAmountRub,
    refundBankDetails,
    refundCorrectionFiscalReceiptNumber,
    refundMethod,
    refundOriginalFiscalReceiptNumber,
    refundReason,
    refundRecipientFullName,
    refundRecipientIdentityDocument,
    refundSelectedPaymentId,
    setRefundAccountantDecision,
    setRefundAction,
    setRefundAmountRub,
    setRefundBankDetails,
    setRefundCorrectionFiscalReceiptNumber,
    setRefundMethod,
    setRefundOriginalFiscalReceiptNumber,
    setRefundReason,
    setRefundRecipientFullName,
    setRefundRecipientIdentityDocument
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Возврат или коррекция</h3>
								<p>
									Сумма, действие, чек, получатель и решение ответственного.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
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
											{typedEligibleRefundCorrectionPayments.map((payment) => (
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
												paymentPayerFullName || activePatient.fullName
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
												activePatient.administrativeProfile?.identityDocument ||
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
