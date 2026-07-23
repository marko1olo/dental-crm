import React, { useEffect, useState } from "react";

interface ExternalLogItem {
	id: string;
	organizationId: string;
	externalProvider: string;
	actionType: string;
	patientName: string;
	appointmentSlot: string;
	status: string;
	createdAt: string;
}

export const ExternalScheduleActionLogsWidget: React.FC = () => {
	const [logs, setLogs] = useState<ExternalLogItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/external-schedule-action-logs", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setLogs(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[ExternalScheduleActionLogsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="external-schedule-action-logs-widget"
			className="p-4 bg-slate-900 border border-teal-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🤖</span>
					<h3 className="font-semibold text-teal-400">
						Лог Внешних Сервисов Записи (Забота 2.0 / LoyalMed AI Боты)
					</h3>
				</div>
				<span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40">
					External Bot Actions Log
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка логов внешних ботов...</div>
			) : (
				<div className="space-y-3">
					{logs.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-200">{item.externalProvider}</span>
									<span className="text-xs bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800 font-semibold">
										{item.actionType}
									</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Пациент: <span className="text-slate-200 font-semibold">{item.patientName}</span> · Слот: {item.appointmentSlot}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-teal-950 text-teal-300 px-2.5 py-1 rounded border border-teal-800 font-bold uppercase">
									✓ Успешно выполнено
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
