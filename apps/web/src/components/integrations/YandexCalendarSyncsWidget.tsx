import React, { useEffect, useState } from "react";

interface YandexSyncItem {
	id: string;
	organizationId: string;
	doctorName: string;
	yandexCalendarId: string;
	syncStatus: string;
	lastSyncedAt: string;
}

export const YandexCalendarSyncsWidget: React.FC = () => {
	const [syncs, setSyncs] = useState<YandexSyncItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/yandex-calendar-syncs", {
					})
			.then((res) => res.json())
			.then((data) => {
				setSyncs(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[YandexCalendarSyncsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="yandex-calendar-syncs-widget"
			className="p-4 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 rounded-xl text-slate-900 dark:text-slate-100 shadow-sm my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📅</span>
					<h3 className="font-semibold text-amber-700 dark:text-amber-400">
						Двусторонняя синхронизация врачей с Яндекс Календарём
					</h3>
				</div>
				<span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 px-2 py-0.5 rounded font-medium">
					Синхронизация Яндекс
				</span>
			</div>

			{loading ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-4">Загрузка синхронизаций Яндекс Календаря...</div>
			) : syncs.length === 0 ? (
				<div className="text-slate-500 dark:text-slate-400 text-sm py-3 text-center">
					Подключённые Яндекс Календари отсутствуют
				</div>
			) : (
				<div className="space-y-3">
					{syncs.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-slate-200">{item.doctorName}</div>
								<div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
									ID Календаря: <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">{item.yandexCalendarId}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 px-2.5 py-1 rounded font-bold">
									⚡ Синхронизировано
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

