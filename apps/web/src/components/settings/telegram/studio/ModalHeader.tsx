import React from "react";
import { Bot, ShieldCheck, X } from "lucide-react";

interface ModalHeaderProps {
	onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ onClose }) => {
	return (
		<div className="bot-modal-header">
			<div className="flex items-center gap-3 min-w-0">
				<div className="bot-modal-icon-badge">
					<Bot size={22} className="text-teal-600 dark:text-teal-400" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 id="bot-modal-title" className="bot-modal-title">
							Студия ботов DENTE: Быстрый запуск
						</h2>
						<span className="bot-pill-mini text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50">
							<ShieldCheck size={12} className="inline mr-1" />
							Конфиденциально и защищено
						</span>
					</div>
					<p className="bot-modal-subtitle">
						Пошаговый мастер подключения Telegram, VK, WhatsApp и MAX без программистов
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="bot-modal-close-btn"
				aria-label="Закрыть окно мастера"
			>
				<X size={20} />
			</button>
		</div>
	);
};
