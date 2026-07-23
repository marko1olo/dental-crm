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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-sky-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📲</span>
					<h3 className="font-semibold text-sky-400">
						Двусторонние СМС от UIS (режим «Чат» и суточный лимит 300/сут)
					</h3>
				</div>
				<span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
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
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									Отправлено сегодня: <span className="text-sky-300 font-mono font-extrabold">{item.sentTodayCount}</span> / <span className="font-mono text-slate-400">{item.dailyQuotaLimit} СМС</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Остаток: <span className="text-emerald-400 font-bold">{item.dailyQuotaLimit - item.sentTodayCount} сообщений</span>
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
