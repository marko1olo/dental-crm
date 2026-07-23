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
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">✔️</span>
					<h3 className="font-semibold text-emerald-400">
						Статусы Исходящих Сообщений в Чатах (Отправлено / Доставлено / Ошибка + Повтор)
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					Message Statuses
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка статусов доставки...</div>
			) : (
				<div className="space-y-3">
					{statuses.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									Получатель: <span className="text-emerald-300 font-semibold">{item.recipientName}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									ID Сообщения: <span className="font-mono text-slate-300">{item.messageId}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-800 font-mono">
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
