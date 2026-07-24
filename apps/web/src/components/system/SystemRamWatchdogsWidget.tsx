import React, { useEffect, useState } from "react";

interface RamWatchdogItem {
	id: string;
	organizationId: string;
	clientHostName: string;
	usedRamMb: number;
	totalRamMb: number;
	warningLevel: string;
	createdAt: string;
}

export const SystemRamWatchdogsWidget: React.FC = () => {
	const [items, setItems] = useState<RamWatchdogItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/system/ram-watchdogs", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[SystemRamWatchdogsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="system-ram-watchdogs-widget"
			className="p-4 bg-slate-900 border border-slate-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🖥️</span>
					<h3 className="font-semibold text-slate-300">
						Системный Watchdog ОЗУ / Памяти Клиентских Рабочих Мест
					</h3>
				</div>
				<span className="text-xs bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded border border-slate-500/40">
					RAM Watchdog Active
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка состояния оперативной памяти...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.clientHostName}</div>
								<div className="text-xs text-slate-400 mt-1">
									Использовано: <span className="font-mono text-slate-200">{item.usedRamMb} MB</span> / <span className="font-mono text-slate-200">{item.totalRamMb} MB</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-800 font-mono">
									Статус: {item.warningLevel}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
