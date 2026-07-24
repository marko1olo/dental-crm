import React, { useEffect, useState } from "react";

interface InheritChannelItem {
	id: string;
	organizationId: string;
	chatId: string;
	patientName: string;
	inheritedChannel: string;
	isAutoApplied: boolean;
	createdAt: string;
}

export const AppointmentChannelInheritancesWidget: React.FC = () => {
	const [items, setItems] = useState<InheritChannelItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/appointment-channel-inheritances", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[AppointmentChannelInheritancesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="appointment-channel-inheritances-widget"
			className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">💬</span>
					<h3 className="font-semibold text-indigo-700 dark:text-indigo-400">
						Автоматическое наследование канала при создании записи из чата
					</h3>
				</div>
				<span className="text-xs bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 px-2 py-0.5 rounded font-medium">
					Наследование каналов
				</span>
			</div>

			{loading ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-4">Загрузка унаследованных каналов...</div>
			) : items.length === 0 ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-3 text-center">
					Нет активных унаследованных каналов связей
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-slate-200">{item.patientName}</div>
								<div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
									Канал чата: <span className="text-indigo-700 dark:text-indigo-300 font-semibold">{item.inheritedChannel}</span> · Авто-подстановка: {item.isAutoApplied ? "Да" : "Нет"}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 px-2.5 py-1 rounded font-mono">
									✓ Канал унаследован
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

