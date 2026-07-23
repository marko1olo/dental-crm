import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">💬</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Мультимессенджер UIS ОМНИ: Очередь отправки сообщений с задержкой (WABA / TG / VK)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					UIS Omni Gateway
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка очереди сообщений UIS...
				</div>
			) : queues.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Очередь сообщений пуста.
				</div>
			) : (
				<div className="space-y-3">
					{queues.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-xs uppercase font-mono px-2 py-0.5 rounded border font-bold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
										{item.channelProvider}
									</span>
									<span className="text-sm font-bold">{item.patientName}</span>
								</div>
								<div className="text-xs mt-1 italic" style={{ color: "var(--muted, #64748b)" }}>
									"{item.messageBody}"
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-1 rounded border font-mono bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									⏳ Отправка через {item.scheduledDelaySeconds}с
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
