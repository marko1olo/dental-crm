import React, { useEffect, useState } from "react";

interface CollaborativeStateItem {
	id: string;
	organizationId: string;
	chatId: string;
	assignedAgentName: string;
	hasAgentReplied: boolean;
	isArchived: boolean;
	updatedAt: string;
}

export const CollaborativeChatProcessingStatesWidget: React.FC = () => {
	const [states, setStates] = useState<CollaborativeStateItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/collaborative-chat-processing-states", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setStates(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[CollaborativeChatProcessingStatesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="collaborative-chat-processing-states-widget"
			className="p-4 bg-slate-900 border border-indigo-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">👥</span>
					<h3 className="font-semibold text-indigo-400">
						Командная Обработка Чатов (Статус «Сотрудник ответил» и авто-сброс синей метки)
					</h3>
				</div>
				<span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">
					Collaborative Chat
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка статусов командных чатов...</div>
			) : (
				<div className="space-y-3">
					{states.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									Чат ID: <span className="font-mono text-indigo-300">{item.chatId}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Ответственный сотрудник: <span className="text-indigo-300 font-semibold">{item.assignedAgentName}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								{item.hasAgentReplied ? (
									<span className="bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded border border-indigo-800 font-mono">
										✓ Ответ отправлен
									</span>
								) : (
									<span className="bg-amber-950 text-amber-300 px-2.5 py-1 rounded border border-amber-800 font-mono">
										⏳ Ожидает ответа
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
