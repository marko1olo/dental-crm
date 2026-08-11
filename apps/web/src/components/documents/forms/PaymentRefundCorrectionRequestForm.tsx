import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

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
