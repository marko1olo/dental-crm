import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface BlacklistItem {
	id: string;
	organizationId: string;
	patientName: string;
	archiveReason: string;
	isBookingBlocked: boolean;
	warningBadge: string;
	createdAt: string;
}

export const PatientArchiveReasonsAndBlacklistsWidget: React.FC = () => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const [items, setItems] = useState<BlacklistItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const headers = authContext
			? authContext.denteClinicalReadHeaders()
			: { "x-organization-id": "00000000-0000-0000-0000-000000000001" };
		fetch("/api/crm/patient-archive-reasons-and-blacklists", { headers })
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientArchiveReasonsAndBlacklistsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="patient-archive-reasons-and-blacklists-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🚫</span>
					<h3 className="font-semibold text-rose-600 dark:text-rose-400">
						Причины Архивации и Режим «Запрет Записи» (Черный Список)
					</h3>
				</div>
				<span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-2 py-0.5 rounded font-medium">
					Blacklist Guard
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка черного списка и архивных причин...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.patientName}</div>
								<div className="text-xs text-slate-300 mt-1">
									Причина: <span className="text-rose-300 font-semibold">{item.archiveReason}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-rose-950 text-rose-300 px-2.5 py-1 rounded border border-rose-800 font-bold uppercase">
									{item.warningBadge}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
