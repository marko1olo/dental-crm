import React, { useEffect, useState } from "react";

interface ReportItem {
	id: string;
	organizationId: string;
	staffName: string;
	totalCallsMade: number;
	confirmedAppointmentsCount: number;
	rescheduledCount: number;
	conversionRatePercent: string;
	reportPeriod: string;
	createdAt: string;
}

export const ConfirmationPerformanceReportsWidget: React.FC = () => {
	const [reports, setReports] = useState<ReportItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/analytics/confirmation-performance-reports", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setReports(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[ConfirmationPerformanceReportsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="confirmation-performance-reports-widget"
			className="p-4 bg-slate-900 border border-blue-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-blue-400">
						Отчет «Эффективность Подтверждения Приемов» по Сотрудникам
					</h3>
				</div>
				<span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
					Call Confirmation Performance
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка отчета эффективности...</div>
			) : (
				<div className="space-y-3">
					{reports.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.staffName}</div>
								<div className="text-xs text-slate-400 mt-1">
									Звонков: <span className="font-mono text-slate-200">{item.totalCallsMade}</span> · Подтверждено: <span className="text-emerald-300 font-semibold">{item.confirmedAppointmentsCount}</span> · Перенесено: {item.rescheduledCount}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-blue-950 text-blue-300 px-2.5 py-1 rounded border border-blue-800 font-bold">
									Конверсия: {item.conversionRatePercent}%
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
