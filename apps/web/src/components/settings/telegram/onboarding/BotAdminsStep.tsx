import React from "react";
import {
	Calendar,
	Clock,
	Eye,
	HelpCircle,
	Star,
	Users,
} from "lucide-react";
import type { BotAdminsStepProps } from "./types";

export function BotAdminsStep({
	pluginBooking,
	onToggleBooking,
	pluginReminders,
	onToggleReminders,
	pluginReviews,
	onToggleReviews,
	pluginPriceFaq,
	onTogglePriceFaq,
	pluginAdminChat,
	onToggleAdminChat,
	onPreviewScreen,
}: BotAdminsStepProps) {
	return (
		<div className="bot-wizard-step-pane">
			<div className="bot-pane-header">
				<span className="bot-step-chip">Шаг 3 из 4</span>
				<h3 className="bot-pane-title">Интерактивная витрина плагинов бота</h3>
				<p className="bot-pane-subtitle">
					Включайте и отключайте умные клинические модули переключателями. Нажмите «Превью», чтобы увидеть модуль в симуляторе телефона справа:
				</p>
			</div>

			<div className="bot-plugins-list">
				{/* Plugin 1: Online Booking 24/7 */}
				<div className={`bot-plugin-card ${pluginBooking ? "enabled" : ""}`}>
					<div className="bot-plugin-icon-wrap bg-teal-500/10 text-teal-600 dark:text-teal-400">
						<Calendar size={20} />
					</div>
					<div className="bot-plugin-info">
						<div className="flex items-center gap-2">
							<h4 className="bot-plugin-title">Онлайн-запись 24/7 (Расписание и свободные слоты)</h4>
							<span className="bot-pill-mini text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/50">
								Mini App
							</span>
						</div>
						<p className="bot-plugin-desc">
							Пациент сам выбирает услугу, врача и удобное время прямо в чате. Запись автоматически попадает в журнал клиники без звонка.
						</p>
					</div>
					<div className="bot-plugin-actions">
						<button
							type="button"
							onClick={() => onPreviewScreen("booking")}
							className="bot-preview-trigger-btn secondary-button compact-button"
							title="Показать экран онлайн-записи на телефоне"
						>
							<Eye size={13} className="mr-1 inline" />
							<span>Превью</span>
						</button>
						<label className="toggle-switch-wrap">
							<input
								type="checkbox"
								checked={pluginBooking}
								onChange={(e) => onToggleBooking(e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>

				{/* Plugin 2: Reminders 24h & 2h */}
				<div className={`bot-plugin-card ${pluginReminders ? "enabled" : ""}`}>
					<div className="bot-plugin-icon-wrap bg-blue-500/10 text-blue-600 dark:text-blue-400">
						<Clock size={20} />
					</div>
					<div className="bot-plugin-info">
						<div className="flex items-center gap-2">
							<h4 className="bot-plugin-title">Автоматические напоминания о приёме (24ч и 2ч)</h4>
							<span className="bot-pill-mini text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50">
								No-Show защита
							</span>
						</div>
						<p className="bot-plugin-desc">
							Бот отправляет напоминание за 24 часа и за 2 часа с кнопками подтверждения визита, переноса и ссылкой на маршрут.
						</p>
					</div>
					<div className="bot-plugin-actions">
						<button
							type="button"
							onClick={() => onPreviewScreen("reminders")}
							className="bot-preview-trigger-btn secondary-button compact-button"
							title="Показать напоминание на телефоне"
						>
							<Eye size={13} className="mr-1 inline" />
							<span>Превью</span>
						</button>
						<label className="toggle-switch-wrap">
							<input
								type="checkbox"
								checked={pluginReminders}
								onChange={(e) => onToggleReminders(e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>

				{/* Plugin 3: Reviews & Reputation */}
				<div className={`bot-plugin-card ${pluginReviews ? "enabled" : ""}`}>
					<div className="bot-plugin-icon-wrap bg-amber-500/10 text-amber-600 dark:text-amber-400">
						<Star size={20} />
					</div>
					<div className="bot-plugin-info">
						<div className="flex items-center gap-2">
							<h4 className="bot-plugin-title">Контроль репутации и сбор отзывов</h4>
							<span className="bot-pill-mini text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50">
								NPS & Рейтинг
							</span>
						</div>
						<p className="bot-plugin-desc">
							После приёма бот мягко просит оценить визит и прикрепляет прямые ссылки на Яндекс.Карты, 2ГИС и ПроДокторов.
						</p>
					</div>
					<div className="bot-plugin-actions">
						<button
							type="button"
							onClick={() => onPreviewScreen("reviews")}
							className="bot-preview-trigger-btn secondary-button compact-button"
							title="Показать сбор отзывов на телефоне"
						>
							<Eye size={13} className="mr-1 inline" />
							<span>Превью</span>
						</button>
						<label className="toggle-switch-wrap">
							<input
								type="checkbox"
								checked={pluginReviews}
								onChange={(e) => onToggleReviews(e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>

				{/* Plugin 4: Price & FAQ */}
				<div className={`bot-plugin-card ${pluginPriceFaq ? "enabled" : ""}`}>
					<div className="bot-plugin-icon-wrap bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
						<HelpCircle size={20} />
					</div>
					<div className="bot-plugin-info">
						<div className="flex items-center gap-2">
							<h4 className="bot-plugin-title">Умный автоответчик по ценам (Прейскурант и FAQ)</h4>
							<span className="bot-pill-mini text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50">
								Прайс-лист
							</span>
						</div>
						<p className="bot-plugin-desc">
							Мгновенные ответы на частые вопросы о стоимости услуг (кариес, имплантация, отбеливание) из утвержденного прейскуранта.
						</p>
					</div>
					<div className="bot-plugin-actions">
						<button
							type="button"
							onClick={() => onPreviewScreen("price_faq")}
							className="bot-preview-trigger-btn secondary-button compact-button"
							title="Показать прейскурант на телефоне"
						>
							<Eye size={13} className="mr-1 inline" />
							<span>Превью</span>
						</button>
						<label className="toggle-switch-wrap">
							<input
								type="checkbox"
								checked={pluginPriceFaq}
								onChange={(e) => onTogglePriceFaq(e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>

				{/* Plugin 5: Live Admin Escalation */}
				<div className={`bot-plugin-card ${pluginAdminChat ? "enabled" : ""}`}>
					<div className="bot-plugin-icon-wrap bg-purple-500/10 text-purple-600 dark:text-purple-400">
						<Users size={20} />
					</div>
					<div className="bot-plugin-info">
						<div className="flex items-center gap-2">
							<h4 className="bot-plugin-title">Перевод на живого администратора клиники</h4>
							<span className="bot-pill-mini text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50">
								Эскалация
							</span>
						</div>
						<p className="bot-plugin-desc">
							Кнопка «Позвать оператора» переключает диалог на живого администратора и отправляет уведомление в CRM.
						</p>
					</div>
					<div className="bot-plugin-actions">
						<button
							type="button"
							onClick={() => onPreviewScreen("admin_chat")}
							className="bot-preview-trigger-btn secondary-button compact-button"
							title="Показать связь с администратором"
						>
							<Eye size={13} className="mr-1 inline" />
							<span>Превью</span>
						</button>
						<label className="toggle-switch-wrap">
							<input
								type="checkbox"
								checked={pluginAdminChat}
								onChange={(e) => onToggleAdminChat(e.target.checked)}
								className="toggle-switch"
							/>
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}
