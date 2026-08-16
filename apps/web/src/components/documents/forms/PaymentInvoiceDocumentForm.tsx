import type React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";

export interface PaymentInvoiceDocumentFormProps {
	documentPatientFullName?: string | null;
	documentPatientPhone?: string | null;
	documentPatientEmail?: string | null;
	clinicBankDetails?: string | null;
	totalRubFormatted?: string | null;
	serviceLinesCount?: number;
}

/**
 * Форма счета на оплату:
 * плательщик, назначение, банковские реквизиты, QR.
 */
export function PaymentInvoiceDocumentForm({
	documentPatientFullName,
	documentPatientPhone,
	documentPatientEmail,
	clinicBankDetails,
	totalRubFormatted = "0 ₽",
	serviceLinesCount = 0,
}: PaymentInvoiceDocumentFormProps) {
	const {
		paymentInvoiceNumber,
		paymentInvoiceDate,
		paymentInvoicePayerFullName,
		paymentInvoiceDueDate,
		paymentInvoicePayerPhone,
		paymentInvoicePayerEmail,
		paymentInvoicePurpose,
		paymentInvoicePaymentTerms,
		paymentInvoiceBankDetails,
		paymentInvoiceQrPayload,
		paymentInvoiceCashlessAllowed,
		paymentInvoiceCashDeskAllowed,
		paymentInvoiceRequisitesVerified,
		paymentInvoiceServiceScopeConfirmed,
		paymentInvoiceFiscalNoticeConfirmed,
		setPaymentInvoiceNumber,
		setPaymentInvoiceDate,
		setPaymentInvoicePayerFullName,
		setPaymentInvoiceDueDate,
		setPaymentInvoicePayerPhone,
		setPaymentInvoicePayerEmail,
		setPaymentInvoicePurpose,
		setPaymentInvoicePaymentTerms,
		setPaymentInvoiceBankDetails,
		setPaymentInvoiceQrPayload,
		setPaymentInvoiceCashlessAllowed,
		setPaymentInvoiceCashDeskAllowed,
		setPaymentInvoiceRequisitesVerified,
		setPaymentInvoiceServiceScopeConfirmed,
		setPaymentInvoiceFiscalNoticeConfirmed,
	} = useDocumentStore();

	return (
		<DocumentPayloadCard
			title="Счет на оплату"
			description="Реквизиты, плательщик, срок оплаты и состав услуг. Счет не заменяет кассовый чек."
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
							documentPatientFullName ?? "ФИО плательщика"
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
						placeholder={documentPatientPhone ?? "необязательно"}
					/>
				</label>
				<label>
					Email плательщика
					<input
						value={paymentInvoicePayerEmail}
						onChange={(event) =>
							setPaymentInvoicePayerEmail(event.target.value)
						}
						placeholder={documentPatientEmail ?? "необязательно"}
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
						clinicBankDetails ??
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
				Сумма из плана лечения: {totalRubFormatted}. Строк услуг:{" "}
				{serviceLinesCount}.
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
						setPaymentInvoiceRequisitesVerified(event.target.checked)
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
		</DocumentPayloadCard>
	);
}
