import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-green-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">💬</span>
					<h3 className="font-semibold text-green-400">
						Мультимессенджер UIS ОМНИ: Очередь отправки сообщений с задержкой (WABA / TG / VK)
					</h3>
				</div>
				<span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded border border-green-500/40">
					UIS Omni Gateway
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка очереди сообщений UIS...</div>
			) : (
				<div className="space-y-3">
					{queues.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-xs uppercase font-mono bg-green-950 text-green-300 px-2 py-0.5 rounded border border-green-800 font-bold">
										{item.channelProvider}
									</span>
									<span className="text-sm font-bold text-slate-200">{item.patientName}</span>
								</div>
								<div className="text-xs text-slate-300 mt-1 italic">
									"{item.messageBody}"
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-slate-950 text-green-300 px-2 py-1 rounded border border-green-800 font-mono">
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
