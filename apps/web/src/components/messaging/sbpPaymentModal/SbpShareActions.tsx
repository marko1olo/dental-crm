import React from "react";
import type { SbpDynamicQrResult } from "@dental/shared/fiscal";
import { Check, Copy, MessageCircle, Printer, Send } from "lucide-react";
import { generateSbpPaymentShareText } from "../omnichannelEngine.js";
import type { SbpPaymentInvoice } from "../omnichannelTypes.js";

export interface SbpShareActionsProps {
	readonly copied: boolean;
	readonly qrPayload: SbpDynamicQrResult | null;
	readonly invoice: SbpPaymentInvoice;
	readonly onCopyLink: () => void;
	readonly onSendToChat?: ((channel: "whatsapp" | "telegram", messageText: string) => void) | undefined;
	readonly onPrint: () => void;
}

export const SbpShareActions: React.FC<SbpShareActionsProps> = ({
	copied,
	qrPayload,
	invoice,
	onCopyLink,
	onSendToChat,
	onPrint,
}) => {
	const handleSendToWhatsApp = () => {
		if (!qrPayload) return;
		const text = generateSbpPaymentShareText({
			patientName: invoice.patientName,
			sumRub: invoice.sumRub,
			orderId: invoice.orderId,
			nspkUrl: qrPayload.nspkUrl,
			clinicName: invoice.clinicName,
		});
		if (onSendToChat) {
			onSendToChat("whatsapp", text);
		} else {
			const cleanPhone = invoice.phone.replace(/\D/g, "");
			const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
			window.open(url, "_blank", "noopener,noreferrer");
		}
	};

	const handleSendToTelegram = () => {
		if (!qrPayload) return;
		const text = generateSbpPaymentShareText({
			patientName: invoice.patientName,
			sumRub: invoice.sumRub,
			orderId: invoice.orderId,
			nspkUrl: qrPayload.nspkUrl,
			clinicName: invoice.clinicName,
		});
		if (onSendToChat) {
			onSendToChat("telegram", text);
		} else {
			const url = `https://t.me/share/url?url=${encodeURIComponent(qrPayload.nspkUrl)}&text=${encodeURIComponent(text)}`;
			window.open(url, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<div className="sbp-actions-section">
			<h4 className="sbp-actions-heading">
				<Send size={15} /> Отправка счета пациенту в 1 клик
			</h4>

			<div className="sbp-action-buttons-grid">
				<button
					type="button"
					className={`sbp-btn sbp-btn-copy min-h-[44px] ${copied ? "copied" : ""}`}
					onClick={onCopyLink}
					title="Скопировать прямую ссылку на оплату в буфер обмена"
				>
					{copied ? (
						<>
							<Check size={16} /> Ссылка скопирована!
						</>
					) : (
						<>
							<Copy size={16} /> Скопировать ссылку в буфер
						</>
					)}
				</button>

				<button
					type="button"
					className="sbp-btn sbp-btn-whatsapp min-h-[44px] cursor-pointer"
					onClick={handleSendToWhatsApp}
					title="Отправить счет и ссылку в WhatsApp пациента"
				>
					<MessageCircle size={16} /> Отправить в WhatsApp
				</button>

				<button
					type="button"
					className="sbp-btn sbp-btn-telegram min-h-[44px] cursor-pointer"
					onClick={handleSendToTelegram}
					title="Отправить счет и ссылку в Telegram пациента"
				>
					<Send size={16} /> Отправить в Telegram
				</button>

				<button
					type="button"
					className="sbp-btn sbp-btn-print min-h-[44px] cursor-pointer"
					onClick={onPrint}
					title="Распечатать флаер с QR-кодом для оплаты у стойки"
				>
					<Printer size={16} /> Печать QR для стойки
				</button>
			</div>
		</div>
	);
};
