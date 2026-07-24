import React, { useEffect, useState } from "react";

interface StatusItem {
	id: string;
	organizationId: string;
	messageId: string;
	recipientName: string;
	status: string;
	canRetry: boolean;
	dispatchTimestamp: string;
}

export const ChatMessageDispatchStatusesWidget: React.FC = () => {
	const [statuses, setStatuses] = useState<StatusItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/chat-message-dispatch-statuses", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setStatuses(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[ChatMessageDispatchStatusesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="chat-message-dispatch-statuses-widget"
			className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">✔️</span>
					<h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
						Статусы исходящих сообщений в чатах (Отправка / Ошибка / Доставлено)
					</h3>
				</div>
				<span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded font-medium">
					Статусы доставки
				</span>
			</div>

			{loading ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-4">Загрузка статусов доставки...</div>
			) : statuses.length === 0 ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-3 text-center">
					Нет неотправленных или ошибочных сообщений в чатах
				</div>
			) : (
				<div className="space-y-3">
					{statuses.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-slate-200">
									Получатель: <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{item.recipientName}</span>
								</div>
								<div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
									ID Сообщения: <span className="font-mono text-slate-800 dark:text-slate-300">{item.messageId}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded font-mono">
									✓ {item.status}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

