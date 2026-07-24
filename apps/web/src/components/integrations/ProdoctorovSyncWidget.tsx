import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { RefreshCw, CheckCircle2 } from "lucide-react";

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
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [items, setItems] = useState<ProdoctorovSyncItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/prodoctorov-sync", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
	}, [auth]);

	return (
		<div
			data-testid="prodoctorov-sync-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<RefreshCw className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Синхронизация с ПроДокторов и MedFlex
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 font-medium">
					MedFlex API
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка статуса синхронизации...
				</div>
			) : items.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Логи синхронизации ПроДокторов отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm text-slate-900 dark:text-white">Свободных слотов: {item.availableSlotsCount}</span>
								<span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3 h-3" /> {item.priceListSyncStatus}
								</span>
							</div>
							<div className="text-xs text-slate-600 dark:text-slate-400">
								MedFlex Club: <span className="font-semibold text-slate-900 dark:text-slate-200">{item.medflexClubBadge ? "Активен" : "Неактивен"}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
