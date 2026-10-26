import React from "react";
import { X, Zap } from "lucide-react";

export interface SbpModalHeaderProps {
	readonly titleId: string;
	readonly orderId: string;
	readonly patientName: string;
	readonly onClose: () => void;
}

export const SbpModalHeader: React.FC<SbpModalHeaderProps> = ({
	titleId,
	orderId,
	patientName,
	onClose,
}) => {
	return (
		<header className="omnichannel-modal-header sbp-header">
			<div className="sbp-header-brand">
				<div className="sbp-emblem-badge" aria-hidden="true">
					<Zap size={14} className="sbp-icon-tri text-sky-400 inline mr-1" />
					<span className="sbp-brand-text">СБП</span>
				</div>
				<div>
					<h2 id={titleId} className="omnichannel-modal-title">
						Оплата по динамическому QR-коду СБП
					</h2>
					<p className="sbp-header-sub">
						НСПК Банка России • Заказ #{orderId} • {patientName}
					</p>
				</div>
			</div>

			<button
				type="button"
				className="omnichannel-modal-close min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
				onClick={onClose}
				aria-label="Закрыть окно оплаты"
			>
				<X size={18} />
			</button>
		</header>
	);
};
