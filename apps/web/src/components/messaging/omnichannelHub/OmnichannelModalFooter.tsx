/**
 * OmnichannelModalFooter.tsx — Базовый футер модалки с индикатором безопасности и кнопкой закрытия.
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import type { OmnichannelModalFooterProps } from "./types.js";

export const OmnichannelModalFooter: React.FC<OmnichannelModalFooterProps> = ({ onClose }) => {
	return (
		<footer className="omnichannel-modal-footer">
			<div className="hub-footer-status">
				<ShieldCheck size={16} className="text-ok" />
				<span>Все сообщения сохраняются в защищенном клиническом контуре клиники.</span>
			</div>

			<button
				type="button"
				className="omnichannel-btn-secondary min-h-[44px] px-4 cursor-pointer"
				style={{ minHeight: "44px" }}
				onClick={onClose}
			>
				Закрыть
			</button>
		</footer>
	);
};
