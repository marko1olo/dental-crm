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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-yellow-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📅</span>
					<h3 className="font-semibold text-yellow-400">
						Двусторонняя Синхронизация Расписания Врачей с Яндекс Календарём
					</h3>
				</div>
				<span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/40">
					Yandex Sync Active
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка синхронизаций Яндекс Календаря...</div>
			) : (
				<div className="space-y-3">
					{syncs.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.doctorName}</div>
								<div className="text-xs text-slate-400 mt-1">
									ID Календаря: <span className="font-mono text-yellow-300">{item.yandexCalendarId}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-yellow-950 text-yellow-300 px-2.5 py-1 rounded border border-yellow-800 font-bold">
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
