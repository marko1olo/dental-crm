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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
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
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка отчета эффективности...
				</div>
			) : reports.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Данные отчета отсутствуют.
				</div>
			) : (
				<div className="space-y-3">
					{reports.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="text-sm font-bold">{item.staffName}</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Звонков: <span className="font-mono font-bold" style={{ color: "var(--ink, #0f172a)" }}>{item.totalCallsMade}</span> · Подтверждено: <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{item.confirmedAppointmentsCount}</span> · Перенесено: {item.rescheduledCount}
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
