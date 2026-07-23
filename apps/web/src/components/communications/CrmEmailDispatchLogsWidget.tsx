import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-purple-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📧</span>
					<h3 className="font-semibold text-purple-400">
						Прямая Отправка Планов Лечения и Счетов по Email из CRM
					</h3>
				</div>
				<span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/40">
					PDF & Invoice Mailer
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка журнала отправки Email...</div>
			) : (
				<div className="space-y-3">
					{logs.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-200">{item.patientName}</span>
									<span className="text-xs font-mono text-purple-300">({item.recipientEmail})</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">Документ: {item.documentTitle}</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-bold uppercase">
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
