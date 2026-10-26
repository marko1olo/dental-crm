/**
 * SbpPaymentQrModal.tsx — Фасад модального окна генерации динамического QR-кода СБП
 * (Система Быстрых Платежей НСПК / ГОСТ Р 56042-2014) для 1-кликовой оплаты пациентом.
 * Декомпозирован в подпапку sbpPaymentModal/ в соответствии с Мандатом 8b.
 */

import React, { useId } from "react";
import type { SbpPaymentQrModalProps } from "./sbpPaymentModal/types.js";
import {
	SbpModalBody,
	SbpModalFooter,
	SbpModalHeader,
	useSbpPaymentModalState,
} from "./sbpPaymentModal/index.js";
import "./omnichannelHub.css";

export type { SbpPaymentQrModalProps };

export const SbpPaymentQrModal: React.FC<SbpPaymentQrModalProps> = ({
	isOpen,
	onClose,
	invoice,
	onPaymentSuccess,
	onSendToChat,
	onCheckStatus,
	defaultTtlMinutes = 15,
	embedded = false,
}) => {
	const modalTitleId = useId();
	const state = useSbpPaymentModalState({
		isOpen,
		invoice,
		defaultTtlMinutes,
		onPaymentSuccess,
		onCheckStatus,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div className="omnichannel-modal-container sbp-modal-container">
			<SbpModalHeader
				titleId={modalTitleId}
				orderId={invoice.orderId}
				patientName={invoice.patientName}
				onClose={onClose}
			/>
			<SbpModalBody
				state={state}
				invoice={invoice}
				defaultTtlMinutes={defaultTtlMinutes}
				onSendToChat={onSendToChat}
			/>
			<SbpModalFooter status={state.status} onClose={onClose} />
		</div>
	);

	if (embedded) {
		return (
			<div className="sbp-embedded-drawer" role="region" aria-labelledby={modalTitleId}>
				{modalContent}
			</div>
		);
	}

	return (
		<div className="omnichannel-modal-overlay" role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
			{modalContent}
		</div>
	);
};
