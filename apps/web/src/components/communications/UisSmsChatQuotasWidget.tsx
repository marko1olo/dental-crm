import React, { useEffect, useState } from "react";

interface SmsQuotaItem {
	id: string;
	organizationId: string;
	dailyQuotaLimit: number;
	sentTodayCount: number;
	isQuotaExceeded: boolean;
	updatedAt: string;
}

export const UisSmsChatQuotasWidget: React.FC = () => {
	const [quotas, setQuotas] = useState<SmsQuotaItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/uis-sms-chat-quotas", {
					})
			.then((res) => res.json())
			.then((data) => {
				setQuotas(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[UisSmsChatQuotasWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="uis-sms-chat-quotas-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📲</span>
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Двусторонние СМС от UIS (режим «Чат» и суточный лимит 300/сут)
					</h3>
				</div>
				<span className="text-xs bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 font-medium">
					UIS SMS Quota Watch
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка суточного лимита СМС...</div>
			) : (
				<div className="space-y-3">
					{quotas.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">
									Отправлено сегодня: <span className="text-sky-600 dark:text-sky-300 font-mono font-extrabold">{item.sentTodayCount}</span> / <span className="font-mono text-slate-500 dark:text-slate-400">{item.dailyQuotaLimit} СМС</span>
								</div>
								<div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
									Остаток: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.dailyQuotaLimit - item.sentTodayCount} сообщений</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								{item.isQuotaExceeded ? (
									<span className="bg-rose-950 text-rose-300 px-2.5 py-1 rounded border border-rose-800 font-bold uppercase">
										⛔ Лимит Превышен
									</span>
								) : (
									<span className="bg-sky-950 text-sky-300 px-2.5 py-1 rounded border border-sky-800 font-mono">
										✓ Лимит Активен
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
