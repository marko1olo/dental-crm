import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			headers: auth.denteClinicalReadHeaders(),
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
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-blue-600 dark:text-blue-400">
						Отчет «Эффективность Подтверждения Приемов» по Сотрудникам
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
					Call Confirmation Performance
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка отчета эффективности...
				</div>
			) : reports.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Данные отчета отсутствуют.
				</div>
			) : (
				<div className="space-y-3">
					{reports.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">{item.staffName}</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
									Звонков: <span className="font-mono font-bold text-slate-900 dark:text-white">{item.totalCallsMade}</span> · Подтверждено: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.confirmedAppointmentsCount}</span> · Перенесено: {item.rescheduledCount}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2.5 py-1 rounded border font-bold bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
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
