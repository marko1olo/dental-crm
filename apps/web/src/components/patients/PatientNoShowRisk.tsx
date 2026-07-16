import {
	AlertTriangle,
	BrainCircuit,
	CheckCircle,
	ShieldAlert,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

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
				return <ShieldAlert size={16} color="#EF4444" />;
			case "medium":
				return <AlertTriangle size={16} color="#F59E0B" />;
			case "low":
				return <CheckCircle size={16} color="#10B981" />;
			default:
				return <BrainCircuit size={16} color="#6B7280" />;
		}
	};

	return (
		<div
			className="panel"
			style={{
				background: "rgba(24, 24, 27, 0.6)",
				backdropFilter: "blur(12px)",
				borderRadius: "12px",
				border: "1px solid rgba(63, 63, 70, 0.4)",
				padding: "16px",
				marginBottom: "20px",
			}}
		>
			<h3
				className="patients-glass-header"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "16px",
				}}
			>
				<BrainCircuit size={16} color="#8b5cf6" />
				AI-Прогноз неявки
			</h3>

			{loading ? (
				<div className="patients-glass-muted" style={{ fontSize: "13px" }}>
					Анализ данных пациента...
				</div>
			) : riskData ? (
				<div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "12px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							{getRiskIcon(riskData.riskLevel)}
							<span
								style={{
									fontSize: "14px",
									fontWeight: 500,
									color: getRiskColor(riskData.riskLevel),
								}}
							>
								{getRiskLabel(riskData.riskLevel)}
							</span>
						</div>
						<div
							style={{
								background: "rgba(139, 92, 246, 0.15)",
								color: "#c4b5fd",
								padding: "4px 8px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 600,
							}}
						>
							Score: {riskData.riskScore}/100
						</div>
					</div>

					<div className="patients-flex-col-gap-8">
						<span
							className="patients-glass-label"
							style={{ fontSize: "12px", opacity: 0.8 }}
						>
							Факторы риска:
						</span>

						{riskData.factors.pastCancellations > 0 && (
							<div
								className="patients-glass-row"
								style={{
									padding: "6px 8px",
									background: "rgba(239, 68, 68, 0.1)",
									borderRadius: "6px",
									border: "1px solid rgba(239, 68, 68, 0.2)",
								}}
							>
								<span style={{ fontSize: "12px", color: "#fca5a5" }}>
									Частые отмены записей (
									{riskData.factors.pastCancellations})
								</span>
							</div>
						)}
						{riskData.factors.hasDebt && (
							<div
								className="patients-glass-row"
								style={{
									padding: "6px 8px",
									background: "rgba(245, 158, 11, 0.1)",
									borderRadius: "6px",
									border: "1px solid rgba(245, 158, 11, 0.2)",
								}}
							>
								<span style={{ fontSize: "12px", color: "#fcd34d" }}>
									Наличие неоплаченных счетов
								</span>
							</div>
						)}

						{!riskData.factors.hasDebt &&
							riskData.factors.pastCancellations === 0 && (
								<div
									className="patients-glass-row"
									style={{
										padding: "6px 8px",
										background: "rgba(16, 185, 129, 0.1)",
										borderRadius: "6px",
										border: "1px solid rgba(16, 185, 129, 0.2)",
									}}
								>
									<span style={{ fontSize: "12px", color: "#6ee7b7" }}>
										Отрицательные факторы отсутствуют
									</span>
								</div>
							)}
					</div>
				</div>
			) : (
				<div className="patients-glass-muted" style={{ fontSize: "13px" }}>
					Нет данных для прогноза
				</div>
			)}
		</div>
	);
};
