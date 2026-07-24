import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { Mail, CheckCircle2 } from "lucide-react";

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
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [logs, setLogs] = useState<EmailLogItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/email-dispatch-logs", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
	}, [auth]);

	return (
		<div
			data-testid="crm-email-dispatch-logs-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Mail className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Логи отправки документов пациентам по E-mail
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					E-mail рассылки
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка логов отправки...
				</div>
			) : logs.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Логи отправки e-mail сообщений отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{logs.map((log) => (
						<div
							key={log.id}
							className="p-3 rounded-lg border flex flex-col justify-between gap-1"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm">{log.patientName}</span>
								<span className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1 font-mono">
									<CheckCircle2 className="w-3 h-3" /> {log.dispatchStatus}
								</span>
							</div>
							<div className="text-xs" style={{ color: "var(--muted)" }}>
								Документ: <span style={{ color: "var(--ink)" }}>{log.documentTitle}</span> ({log.recipientEmail})
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
