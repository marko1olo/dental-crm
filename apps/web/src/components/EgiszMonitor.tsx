import {
	AlertTriangle,
	CheckCircle2,
	RefreshCcw,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";

interface EgiszMonitorProps {
	patientId: string;
	visitId: string;
}

export const EgiszMonitor: React.FC<EgiszMonitorProps> = ({
	patientId,
	visitId,
}) => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;

	const [status, setStatus] = useState<
		"Pending" | "Sent" | "Error" | "Accepted"
	>("Pending");
	const [errorDetails, setErrorDetails] = useState<string | null>(null);
	const [transactionId, setTransactionId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const [xmlPreview, setXmlPreview] = useState<string | null>(null);

	const fetchStatus = async () => {
		try {
			const headers = authContext
				? authContext.denteClinicalReadHeaders()
				: { "x-organization-id": "00000000-0000-0000-0000-000000000001" };
			const res = await fetch(`/api/egisz/logs/${patientId}`, { headers });
			if (res.ok) {
				const data = await res.json();
				const latest =
					data && data.logs
						? data.logs.find((l: any) => l.visitId === visitId)
						: null;
				if (latest) {
					setStatus(latest.status);
					const err = latest.errorDetails;
					if (err && typeof err === "object" && err.xmlPreview) {
						setXmlPreview(err.xmlPreview);
					}
					setErrorDetails(
						err ? (typeof err === "string" ? err : err.message || null) : null,
					);
					setTransactionId(latest.transactionId);
				}
			}
		} catch (err) {
			console.error(err);
		}
	};

	useEffect(() => {
		fetchStatus();
	}, [patientId, visitId, authContext]);

	const handleSend = async () => {
		setIsLoading(true);
		setErrorDetails(null);
		setXmlPreview(null);
		try {
			const headers = authContext
				? authContext.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
				: { "x-organization-id": "00000000-0000-0000-0000-000000000001", "Content-Type": "application/json" };
			const res = await fetch(`/api/egisz/send`, {
				method: "POST",
				headers,
				body: JSON.stringify({ patientId, visitId }),
			});
			const data = await res.json();

			// We should refetch status right after to get the xmlPreview stored in the DB logs
			await fetchStatus();

			if (!res.ok) {
				setStatus("Error");
				setErrorDetails(data.error || "Неизвестная ошибка");
			} else {
				setStatus("Accepted");
				setTransactionId(data.transactionId);
			}
		} catch (err) {
			setStatus("Error");
			setErrorDetails("Ошибка сети при отправке в ЕГИСЗ");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			data-testid="egisz-monitor-panel"
			className="panel mt-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col gap-3 shadow-sm"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					{status === "Accepted" ? (
						<ShieldCheck size={24} className="text-emerald-500" />
					) : status === "Error" ? (
						<AlertTriangle size={24} className="text-rose-500" />
					) : (
						<RefreshCcw
							size={24}
							className={`text-sky-500 ${isLoading ? "animate-spin" : ""}`}
						/>
					)}
					<div>
						<h3 className="m-0 text-sm font-semibold text-slate-900 dark:text-white">
							Интеграция с ЕГИСЗ (РЭМД)
						</h3>
						<p className="mt-1 mb-0 text-xs text-slate-500 dark:text-slate-400">
							{status === "Accepted" && transactionId ? (
								<span className="text-emerald-600 dark:text-emerald-400 font-medium">
									Успешно выгружено СЭМД. Транзакция: {transactionId}
								</span>
							) : status === "Error" ? (
								<span className="text-rose-600 dark:text-rose-400 font-medium">
									Ошибка: {errorDetails}
								</span>
							) : (
								"Данные приема готовы к отправке"
							)}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={handleSend}
					disabled={isLoading || status === "Accepted"}
					className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50 ${
						status === "Error"
							? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
							: "bg-sky-600 hover:bg-sky-700 text-white"
					}`}
				>
					{status === "Error" ? "Повторить выгрузку" : "Отправить в ЕГИСЗ"}
					{status === "Accepted" && <CheckCircle2 size={16} />}
				</button>
			</div>
			{xmlPreview && (
				<div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
					<p className="m-0 mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
						Сгенерированный CDA XML (Предпросмотр)
					</p>
					<pre className="m-0 text-[11px] text-slate-900 dark:text-slate-100 overflow-x-auto whitespace-pre-wrap font-mono">
						{xmlPreview}
					</pre>
				</div>
			)}
		</div>
	);
};

