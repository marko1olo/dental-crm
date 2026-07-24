import {
	AlertTriangle,
	CheckCircle2,
	RefreshCcw,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../AppHelpers";

interface EgiszMonitorProps {
	patientId: string;
	visitId: string;
}

export const EgiszMonitor: React.FC<EgiszMonitorProps> = ({
	patientId,
	visitId,
}) => {
	const [status, setStatus] = useState<
		"Pending" | "Sent" | "Error" | "Accepted"
	>("Pending");
	const [errorDetails, setErrorDetails] = useState<string | null>(null);
	const [transactionId, setTransactionId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const [xmlPreview, setXmlPreview] = useState<string | null>(null);

	const fetchStatus = async () => {
		try {
			const res = await fetch(`/api/egisz/logs/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
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
	}, [patientId, visitId]);

	const handleSend = async () => {
		setIsLoading(true);
		setErrorDetails(null);
		setXmlPreview(null);
		try {
			const res = await fetch(`/api/egisz/send`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
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
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					{status === "Accepted" ? (
						<ShieldCheck size={24} color="var(--teal)" />
					) : status === "Error" ? (
						<AlertTriangle size={24} color="var(--rust)" />
					) : (
						<RefreshCcw
							size={24}
							color="var(--brand-500)"
							className={isLoading ? "animate-spin" : ""}
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
					className={status === "Error" ? "secondary-button" : "primary-button"}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						fontSize: "12px",
						padding: "8px 16px",
					}}
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
