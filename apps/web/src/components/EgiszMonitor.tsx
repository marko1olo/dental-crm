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
			className="panel"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				marginTop: "16px",
				padding: "16px",
			}}
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
						<h3
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 600,
								color: "var(--ink)",
							}}
						>
							Интеграция с ЕГИСЗ (РЭМД)
						</h3>
						<p
							style={{
								margin: "4px 0 0 0",
								fontSize: "12px",
								color: "var(--slate-500)",
							}}
						>
							{status === "Accepted" && transactionId ? (
								<span style={{ color: "var(--teal)" }}>
									Успешно выгружено СЭМД. Транзакция: {transactionId}
								</span>
							) : status === "Error" ? (
								<span style={{ color: "var(--rust)" }}>
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
				<div
					style={{
						marginTop: "8px",
						padding: "12px",
						background: "var(--slate-50)",
						borderRadius: "8px",
						border: "1px solid var(--slate-200)",
					}}
				>
					<p
						style={{
							margin: "0 0 8px 0",
							fontSize: "12px",
							fontWeight: 600,
							color: "var(--slate-600)",
						}}
					>
						Сгенерированный CDA XML (Предпросмотр)
					</p>
					<pre
						style={{
							margin: 0,
							fontSize: "11px",
							color: "var(--ink)",
							overflowX: "auto",
							whiteSpace: "pre-wrap",
						}}
					>
						{xmlPreview}
					</pre>
				</div>
			)}
		</div>
	);
};
