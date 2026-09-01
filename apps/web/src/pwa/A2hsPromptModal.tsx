/**
 * DENTE CRM — Add to Home Screen (A2HS) Modal Component
 * (Apple Health & iOS HIG Guidelines, 1-Click PWA Installation)
 */

import React from "react";
import {
	Calendar,
	CheckCircle2,
	Download,
	FileText,
	PlusSquare,
	Share2,
	ShieldCheck,
	Smartphone,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useA2hsPrompt } from "./useA2hsPrompt";
import "./pwaModal.css";

export interface A2hsPromptModalProps {
	isOpen?: boolean;
	onClose?: () => void;
}

export const A2hsPromptModal: React.FC<A2hsPromptModalProps> = ({
	isOpen: controlledIsOpen,
	onClose: controlledOnClose,
}) => {
	const {
		isInstallable,
		isInstalled,
		isIos,
		isPromptOpen,
		closePrompt,
		dismissForCooldown,
		installApp,
	} = useA2hsPrompt();

	const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isPromptOpen;
	const handleClose = controlledOnClose || closePrompt;

	if (!isOpen || isInstalled) {
		return null;
	}

	return (
		<div
			className="a2hs-modal-backdrop"
			onClick={handleClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="a2hs-title"
			data-testid="a2hs-prompt-modal"
		>
			<div className="a2hs-modal-card" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="a2hs-header">
					<div className="flex items-center gap-3">
						<div className="a2hs-app-badge">
							<Smartphone className="w-6 h-6 text-white" />
						</div>
						<div>
							<div id="a2hs-title" className="a2hs-title">
								Установите DENTE
							</div>
							<div className="a2hs-subtitle">
								Личный кабинет стоматологии на главном экране
							</div>
						</div>
					</div>
					<button
						type="button"
						className="a2hs-close-btn"
						onClick={handleClose}
						aria-label="Закрыть"
						data-testid="a2hs-close-btn"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Perks List */}
				<div className="a2hs-perks-list">
					<div className="a2hs-perk-item">
						<div className="a2hs-perk-icon-wrap">
							<Zap className="w-4 h-4" />
						</div>
						<div>
							<div className="a2hs-perk-title">Мгновенный запуск</div>
							<div className="a2hs-perk-desc">
								Открывается в 1 касание без поиска в браузере и лишних вкладок
							</div>
						</div>
					</div>

					<div className="a2hs-perk-item">
						<div className="a2hs-perk-icon-wrap">
							<ShieldCheck className="w-4 h-4 text-emerald-400" />
						</div>
						<div>
							<div className="a2hs-perk-title">Работа в метро без интернета</div>
							<div className="a2hs-perk-desc">
								Дата, время приёма, врач, адрес и схема проезда сохранены оффлайн
							</div>
						</div>
					</div>

					<div className="a2hs-perk-item">
						<div className="a2hs-perk-icon-wrap">
							<FileText className="w-4 h-4 text-cyan-400" />
						</div>
						<div>
							<div className="a2hs-perk-title">План лечения и чеки 54-ФЗ</div>
							<div className="a2hs-perk-desc">
								Дорожная карта с этапами и справка на вычет 13% НДФЛ всегда под рукой
							</div>
						</div>
					</div>
				</div>

				{/* Instructions or Action */}
				{isIos ? (
					<div className="a2hs-ios-steps" data-testid="a2hs-ios-instructions">
						<div className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-amber-400" />
							Инструкция по установке в Safari на iOS:
						</div>
						<div className="a2hs-step-row">
							<div className="a2hs-step-num">1</div>
							<div className="flex items-center gap-1.5">
								Нажмите кнопку <Share2 className="w-4 h-4 text-sky-400 inline" /> «Поделиться» внизу
								Safari
							</div>
						</div>
						<div className="a2hs-step-row">
							<div className="a2hs-step-num">2</div>
							<div className="flex items-center gap-1.5">
								Выберите пункт <PlusSquare className="w-4 h-4 text-sky-400 inline" /> «На экран
								«Домой»»
							</div>
						</div>
						<div className="a2hs-step-row">
							<div className="a2hs-step-num">3</div>
							<div>Нажмите «Добавить» в правом верхнем углу</div>
						</div>
					</div>
				) : (
					<div className="a2hs-actions">
						<button
							type="button"
							className="a2hs-install-btn"
							onClick={installApp}
							data-testid="a2hs-install-btn"
						>
							<Download className="w-4 h-4" />
							Установить DENTE на экран
						</button>
					</div>
				)}

				<div className="mt-2">
					<button
						type="button"
						className="a2hs-dismiss-btn"
						onClick={() => dismissForCooldown(7)}
						data-testid="a2hs-dismiss-btn"
					>
						Не сейчас
					</button>
				</div>
			</div>
		</div>
	);
};
