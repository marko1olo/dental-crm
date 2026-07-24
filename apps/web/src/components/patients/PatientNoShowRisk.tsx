import {
	AlertTriangle,
	BrainCircuit,
	CheckCircle,
	ShieldAlert,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";

export type PatientNoShowRiskProps = {
	patientId: string | null;
};

export const PatientNoShowRisk: React.FC<PatientNoShowRiskProps> = ({
	patientId,
}) => {
	const [loading, setLoading] = useState(false);
	const [riskData, setRiskData] = useState<any>(null);

	useEffect(() => {
		if (patientId) {
			setRiskData(null);
			fetchRisk(patientId);
		}
	}, [patientId]);

	const fetchRisk = async (id: string) => {
		setLoading(true);
		try {
			const res = await fetch("/api/ai/predict-no-show", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ patientId: id }),
			});
			if (res.ok) {
				const data = await res.json();
				setRiskData(data);
			}
		} catch (e) {
			console.error("Failed to fetch AI no-show risk", e);
		} finally {
			setLoading(false);
		}
	};

	if (!patientId) return null;

	const getRiskColor = (level: string) => {
		switch (level) {
			case "high":
				return "#EF4444";
			case "medium":
				return "#F59E0B";
			case "low":
				return "#10B981";
			default:
				return "#6B7280";
		}
	};

	const getRiskLabel = (level: string) => {
		switch (level) {
			case "high":
				return "Высокий риск (High)";
			case "medium":
				return "Средний риск (Medium)";
			case "low":
				return "Низкий риск (Low)";
			default:
				return "Неизвестно";
		}
	};

	const getRiskIcon = (level: string) => {
		switch (level) {
			case "high":
				return <ShieldAlert size={16} className="text-red-500" />;
			case "medium":
				return <AlertTriangle size={16} className="text-amber-500" />;
			case "low":
				return <CheckCircle size={16} className="text-emerald-500" />;
			default:
				return <BrainCircuit size={16} className="text-slate-400" />;
		}
	};

	const formatRub = (n: number) => n.toLocaleString("ru-RU") + " ₽";

	return (
		<div
			data-testid="patient-no-show-risk"
			className="panel p-4 rounded-xl border mb-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<h3
				className="panel-heading compact-heading flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800"
				title="Машинный расчет риска отмены записи пациента"
			>
				<BrainCircuit size={18} className="text-emerald-600 dark:text-emerald-400" />
				<span className="text-sm font-semibold">
					AI-Прогноз неявки на приём
				</span>
			</h3>

			{loading ? (
				<div className="text-xs text-slate-500 dark:text-slate-400 py-3">
					Анализ данных пациента...
				</div>
			) : riskData ? (
				<div>
					<div
						className="flex justify-between items-center mb-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
					>
						<div className="flex items-center gap-2">
							{getRiskIcon(riskData.riskLevel)}
							<span
								className="text-sm font-semibold"
								style={{ color: getRiskColor(riskData.riskLevel) }}
							>
								{getRiskLabel(riskData.riskLevel)}
							</span>
						</div>
						<div
							className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
						>
							{Math.round((riskData.noShowProbability || 0) * 100)}% вероятности
						</div>
					</div>

					{riskData.factors && riskData.factors.length > 0 && (
						<div className="mt-3">
							<span className="text-xs font-bold text-slate-700 dark:text-slate-300">Факторы риска:</span>
							<ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
								{riskData.factors.map((factor: string, idx: number) => (
									<li key={idx}>{factor}</li>
								))}
							</ul>
						</div>
					)}

					{riskData.recommendedAction && (
						<div className="mt-3 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-200">
							<strong>Рекомендуемое действие:</strong> {riskData.recommendedAction}
						</div>
					)}
				</div>
			) : (
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2">
					<span className="text-xs text-slate-500 dark:text-slate-400">
						Прогноз риска отмены на основе истории и поведения пациента
					</span>
					<button
						type="button"
						onClick={() => fetchRisk(patientId)}
						className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
					>
						Рассчитать AI-риск
					</button>
				</div>
			)}
		</div>
	);
};
