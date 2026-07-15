import {
	AlertTriangle,
	CheckCircle2,
	RefreshCcw,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

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

	const fetchStatus = async () => {
		try {
			const res = await fetch(`/api/egisz/logs/${patientId}`);
			if (res.ok) {
				const data = await res.json();
				const latest =
					data && data.logs
						? data.logs.find((l: any) => l.visitId === visitId)
						: null;
				if (latest) {
					setStatus(latest.status);
					setErrorDetails(latest.errorDetails?.message || null);
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
		try {
			const res = await fetch(`/api/egisz/send`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ patientId, visitId }),
			});
			const data = await res.json();
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
		<div className="glass-panel p-4 rounded-xl flex items-center justify-between mt-4 border border-white/10 bg-black/40 backdrop-blur-md shadow-lg">
			<div className="flex items-center gap-3">
				{status === "Accepted" ? (
					<ShieldCheck className="text-emerald-400 w-6 h-6" />
				) : status === "Error" ? (
					<AlertTriangle className="text-red-400 w-6 h-6" />
				) : (
					<RefreshCcw
						className={`text-blue-400 w-6 h-6 ${isLoading ? "animate-spin" : ""}`}
					/>
				)}
				<div>
					<h3 className="text-sm font-semibold text-white">
						Интеграция с ЕГИСЗ (РЭМД)
					</h3>
					<p className="text-xs text-gray-300">
						{status === "Accepted" && transactionId ? (
							<span className="text-emerald-300">
								Успешно выгружено. Транзакция: {transactionId}
							</span>
						) : status === "Error" ? (
							<span className="text-red-300">Ошибка: {errorDetails}</span>
						) : (
							"Данные приема готовы к отправке"
						)}
					</p>
				</div>
			</div>
			<button
				onClick={handleSend}
				disabled={isLoading || status === "Accepted"}
				className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-500/80 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
			>
				{status === "Error" ? "Повторить отправку" : "Отправить в ЕГИСЗ"}
				{status === "Accepted" && <CheckCircle2 className="w-4 h-4" />}
			</button>
		</div>
	);
};
