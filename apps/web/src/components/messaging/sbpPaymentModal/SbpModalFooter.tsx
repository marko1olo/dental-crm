import React from "react";
import { ShieldCheck } from "lucide-react";
import type { SbpPaymentStatus } from "../omnichannelTypes.js";

export interface SbpModalFooterProps {
	readonly status: SbpPaymentStatus;
	readonly onClose: () => void;
}

export const SbpModalFooter: React.FC<SbpModalFooterProps> = ({ status, onClose }) => {
	const isPaid = status === "paid_success";

	return (
		<footer className="omnichannel-modal-footer">
			<div className="sbp-footer-legal">
				<ShieldCheck size={16} className="text-ok" />
				<span>
					Безопасный эквайринг через АО «НСПК» и ЦБ РФ. Безналичная оплата с формированием фискального кассового чека.
				</span>
			</div>

			<button
				type="button"
				className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
					isPaid
						? "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]"
						: "omnichannel-btn-secondary border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				}`}
				onClick={onClose}
			>
				{isPaid ? "Готово" : "Закрыть"}
			</button>
		</footer>
	);
};
