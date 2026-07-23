import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { MessageSquare, Clock } from "lucide-react";

interface OmniQueueItem {
	id: string;
	organizationId: string;
	patientName: string;
	channelProvider: string;
	messageBody: string;
	dispatchStatus: string;
	scheduledDelaySeconds: number;
	createdAt: string;
}

export const UisOmniMessengerQueuesWidget: React.FC = () => {
	const [queues, setQueues] = useState<OmniQueueItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/uis-omni-messenger-queues", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setQueues(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[UisOmniMessengerQueuesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="uis-omni-messenger-queues-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<MessageSquare className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Очереди отправки сообщений UIS / WA / Telegram
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					UIS Omni-Channel Queue
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка очереди сообщений...
				</div>
			) : queues.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Очередь сообщений мессенджеров пуста.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{queues.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
									{item.channelProvider}
								</span>
								<span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
									<Clock className="w-3 h-3 inline" /> {item.scheduledDelaySeconds}s задержка
								</span>
							</div>
							<p className="text-xs font-medium leading-snug">{item.messageBody}</p>
							<p className="text-xs" style={{ color: "var(--muted)" }}>
								Получатель: <strong style={{ color: "var(--ink)" }}>{item.patientName}</strong>
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
