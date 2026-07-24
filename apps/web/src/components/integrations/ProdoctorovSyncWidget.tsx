import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			headers: auth.denteClinicalReadHeaders(),
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
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🩺</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Интеграция с ПроДокторов и MedFlex: Синхронизация Отзывов и Слотов
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					ProDoctorov & MedFlex Sync
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка статуса интеграции ПроДокторов...
				</div>
			) : items.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Интеграция с ПроДокторов не подключена.
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-900 dark:text-white">Синхронизация Прайс-Листа и Записи</span>
									{item.medflexClubBadge && (
										<span className="text-xs px-2 py-0.5 rounded border font-bold bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
											★ MedFlex Club
										</span>
									)}
								</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
									Свободных слотов в выгрузке: <strong className="text-slate-900 dark:text-white">{item.availableSlotsCount}</strong>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									✓ {item.priceListSyncStatus}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
