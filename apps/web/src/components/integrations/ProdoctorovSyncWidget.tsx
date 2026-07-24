import React, { useEffect, useState } from "react";

interface ProdoctorovSyncItem {
	id: string;
	organizationId: string;
	priceListSyncStatus: string;
	availableSlotsCount: number;
	medflexClubBadge: boolean;
	lastSyncedAt: string;
	createdAt: string;
}

export const ProdoctorovSyncWidget: React.FC = () => {
	const [items, setItems] = useState<ProdoctorovSyncItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/prodoctorov-sync", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[ProdoctorovSyncWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="prodoctorov-sync-widget"
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🩺</span>
					<h3 className="font-semibold text-emerald-400">
						Интеграция с ПроДокторов & MedFlex (Выгрузка Прейскуранта и Свободные Слоты)
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					ProDoctorov API v2
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка данных выгрузки ПроДокторов...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2 text-sm font-medium">
									<span className="text-slate-300">Статус синхра прейскуранта:</span>
									<span className="text-emerald-400 font-bold uppercase tracking-wider text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/50">
										{item.priceListSyncStatus}
									</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Свободных слотов для записи: <strong className="text-slate-200">{item.availableSlotsCount}</strong>
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								{item.medflexClubBadge && (
									<span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded border border-amber-500/30 flex items-center gap-1">
										⭐ MedFlex Club Active
									</span>
								)}
								<span className="text-slate-500">Обновлено: {new Date(item.lastSyncedAt).toLocaleTimeString("ru-RU")}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
