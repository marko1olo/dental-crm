import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

interface EmailLogItem {
	id: string;
	organizationId: string;
	patientName: string;
	recipientEmail: string;
	documentType: string;
	documentTitle: string;
	dispatchStatus: string;
	sentAt: string;
}

export const CrmEmailDispatchLogsWidget: React.FC = () => {
	const [logs, setLogs] = useState<EmailLogItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/email-dispatch-logs", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setLogs(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[CrmEmailDispatchLogsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="crm-email-dispatch-logs-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📧</span>
					<h3 className="font-semibold text-purple-600 dark:text-purple-400">
						Прямая Отправка Планов Лечения и Счетов по Email из CRM
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
					PDF & Invoice Mailer
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка журнала отправки Email...
				</div>
			) : logs.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет логов отправки Email.
				</div>
			) : (
				<div className="space-y-3">
					{logs.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{item.patientName}</span>
									<span className="text-xs font-mono text-purple-600 dark:text-purple-300">({item.recipientEmail})</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>Документ: {item.documentTitle}</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs px-2 py-0.5 rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									✓ {item.dispatchStatus}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
