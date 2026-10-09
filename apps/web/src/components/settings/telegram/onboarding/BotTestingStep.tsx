import React from "react";
import {
	Activity,
	Download,
	Play,
	Radio,
	Sparkles,
} from "lucide-react";
import type { BotTestingStepProps } from "./types";

export function BotTestingStep({
	isBotRunningLive,
	isLaunching,
	activeChannel,
	botUsername,
	liveNotice,
	onLaunchLiveBot,
	onDownloadZip,
	pluginBooking,
	pluginReminders,
	pluginReviews,
	pluginPriceFaq,
	pluginAdminChat,
	liveLeads,
}: BotTestingStepProps) {
	return (
		<div className="bot-wizard-step-pane">
			<div className="bot-pane-header">
				<span className="bot-step-chip">Шаг 4 из 4</span>
				<h3 className="bot-pane-title">Запуск бота и управление лидами</h3>
				<p className="bot-pane-subtitle">
					Бот полностью сконфигурирован. Запустите его на защищенном сервере DENTE либо скачайте архив с открытым исходным кодом:
				</p>
			</div>

			{/* Launch Control Panel Card */}
			<div className="bot-launch-control-card">
				<div className="bot-launch-head">
					<div className="flex items-center gap-3">
						<div className={`bot-live-pulse-badge ${isBotRunningLive ? "online" : "ready"}`}>
							<span className="bot-pulse-dot" />
							<span className="font-semibold text-xs">
								{isBotRunningLive ? "Бот активен и слушает вебхук 24/7" : "Готов к запуску"}
							</span>
						</div>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							Канал: <strong>{activeChannel.toUpperCase()}</strong> ({botUsername})
						</span>
					</div>

					<div className="bot-launch-buttons-row">
						<button
							type="button"
							onClick={onLaunchLiveBot}
							disabled={isLaunching}
							className="bot-primary-launch-cta primary-button"
						>
							{isLaunching ? (
								<Radio size={16} className="animate-pulse" />
							) : (
								<Play size={16} />
							)}
							<span>
								{isLaunching
									? "Подключение..."
									: isBotRunningLive
										? "Бот запущен (Перезапустить)"
										: "Запустить бота в облаке DENTE"}
							</span>
						</button>

						<button
							type="button"
							onClick={onDownloadZip}
							className="bot-zip-download-btn secondary-button"
							title="Скачать полный архив с исходным кодом Node.js / Python и конфигами"
						>
							<Download size={15} />
							<span>Скачать исходники бота (ZIP)</span>
						</button>
					</div>
				</div>

				{liveNotice && (
					<div className="bot-live-notice-alert" role="status">
						<Sparkles size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>{liveNotice}</span>
					</div>
				)}

				{/* Feature Summary Checklist */}
				<div className="bot-launch-features-summary">
					<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
						Активные модули в боте:
					</span>
					<div className="bot-summary-tags-row">
						{pluginBooking && <span className="bot-summary-tag">Онлайн-запись 24/7</span>}
						{pluginReminders && <span className="bot-summary-tag">Напоминания 24ч/2ч</span>}
						{pluginReviews && <span className="bot-summary-tag">Отзывы Яндекс/2ГИС</span>}
						{pluginPriceFaq && <span className="bot-summary-tag">Прейскурант и FAQ</span>}
						{pluginAdminChat && <span className="bot-summary-tag">Связь с регистратурой</span>}
					</div>
				</div>
			</div>

			{/* Leads & Messages Live Log Section */}
			<div className="bot-leads-log-card">
				<div className="bot-leads-head">
					<div className="flex items-center gap-2">
						<Activity size={18} className="text-teal-600 dark:text-teal-400" />
						<h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
							Журнал диалогов и лидов от бота
						</h4>
					</div>
					<span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
						Синхронизация: <strong className="text-emerald-500">Live</strong> (задержка 0.2с)
					</span>
				</div>

				<div className="bot-leads-table-wrap">
					<table className="bot-leads-table">
						<thead>
							<tr>
								<th>Пациент</th>
								<th>Событие</th>
								<th>Детализация</th>
								<th>Статус</th>
								<th>Время</th>
							</tr>
						</thead>
						<tbody>
							{liveLeads.map((lead) => (
								<tr key={lead.id}>
									<td>
										<div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
											{lead.patientName}
										</div>
										<div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
											{lead.phone}
										</div>
									</td>
									<td className="text-xs text-slate-700 dark:text-slate-300">{lead.action}</td>
									<td className="text-xs text-slate-600 dark:text-slate-400">{lead.detail}</td>
									<td>
										<span className={`bot-lead-status-pill status-${lead.status}`}>
											{lead.statusLabel}
										</span>
									</td>
									<td className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
										{lead.time}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
