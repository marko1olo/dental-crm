import React from "react";
import {
	FileText,
	MessageCircle,
	MessagesSquare,
	Star,
	TrendingUp,
	X,
} from "lucide-react";
import type { OmnichannelHeaderProps } from "./types.js";

/**
 * OmnichannelHeader — Компактная клиническая шапка модального окна,
 * статусы каналов Telegram/WhatsApp/SMS/NPS и переключатель навигационных табов.
 */
export const OmnichannelHeader: React.FC<OmnichannelHeaderProps> = ({
	titleId,
	activeTab,
	setActiveTab,
	unreadCount,
	criticalPendingCount,
	npsScore,
	averageScore,
	onClose,
}) => {
	return (
		<>
			{/* Верхняя шапка */}
			<header className="omnichannel-modal-header">
				<div className="hub-header-left">
					<div className="hub-header-icon-badge" aria-hidden="true">
						<MessagesSquare size={20} />
					</div>
					<div>
						<h2 id={titleId} className="omnichannel-modal-title">
							Омниканальный центр сообщений и лояльности
						</h2>
						<p className="hub-header-sub">
							Единый шлюз WhatsApp (Kapso WABA), Telegram Bot, SMS и динамических платежей СБП
						</p>
					</div>
				</div>

				{/* Индикаторы статусов каналов */}
				<div className="hub-channel-status-bar">
					<div className="hub-status-pill online" title="WhatsApp Business Cloud API / Kapso Gateway">
						<span className="hub-status-dot green" />
						<span className="hub-status-name">WhatsApp:</span>
						<span className="hub-status-val">Подключено</span>
					</div>
					<div className="hub-status-pill online" title="Telegram Bot API: @DenteClinicBot">
						<span className="hub-status-dot blue" />
						<span className="hub-status-name">Telegram:</span>
						<span className="hub-status-val">@DenteClinicBot</span>
					</div>
					<div className="hub-status-pill nps-badge" title="Текущий индекс лояльности NPS">
						<Star size={13} className="text-amber" />
						<span className="hub-status-name">NPS:</span>
						<span className="hub-status-val">+{npsScore}% ({averageScore})</span>
					</div>
				</div>

				<button
					type="button"
					className="omnichannel-modal-close min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
					style={{ minHeight: "44px", minWidth: "44px" }}
					onClick={onClose}
					aria-label="Закрыть окно"
				>
					<X size={18} />
				</button>
			</header>

			{/* Навигационные табы */}
			<nav className="hub-tabs-navigation" aria-label="Разделы центра сообщений">
				<button
					type="button"
					className={`hub-nav-tab min-h-[44px] cursor-pointer ${activeTab === "chat" ? "active" : ""}`}
					style={{ minHeight: "44px" }}
					onClick={() => setActiveTab("chat")}
				>
					<MessageCircle size={16} />
					<span>Диалог с пациентом</span>
					{unreadCount > 0 && (
						<span className="hub-tab-badge">{unreadCount}</span>
					)}
				</button>

				<button
					type="button"
					className={`hub-nav-tab min-h-[44px] cursor-pointer ${activeTab === "templates" ? "active" : ""}`}
					style={{ minHeight: "44px" }}
					onClick={() => setActiveTab("templates")}
				>
					<FileText size={16} />
					<span>Клинические шаблоны</span>
				</button>

				<button
					type="button"
					className={`hub-nav-tab min-h-[44px] cursor-pointer ${activeTab === "nps" ? "active" : ""}`}
					style={{ minHeight: "44px" }}
					onClick={() => setActiveTab("nps")}
				>
					<TrendingUp size={16} />
					<span>Дашборд NPS и отзывов</span>
					{criticalPendingCount > 0 && (
						<span className="hub-tab-badge badge-critical">{criticalPendingCount}</span>
					)}
				</button>
			</nav>
		</>
	);
};
