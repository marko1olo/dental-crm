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

	const formatRub = (n: number) =>
		n.toLocaleString("ru-RU") + " ₽";

	return (
		<div className="panel" style={{ marginBottom: "20px" }}>
			<h3
				className="panel-heading compact-heading"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "16px",
					border: "none",
					padding: 0,
				}}
			>
				<BrainCircuit size={16} color="var(--brand-500)" />
				<span style={{ fontSize: "14px", fontWeight: 600 }}>
					AI-Прогноз неявки
				</span>
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
							background: "var(--surface-100)",
							padding: "12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							{getRiskIcon(riskData.riskLevel)}
							<span
								style={{
									fontSize: "14px",
									fontWeight: 600,
									color: getRiskColor(riskData.riskLevel),
								}}
							>
								{getRiskLabel(riskData.riskLevel)}
							</span>
						</div>
						<div
							style={{
								background: "var(--brand-100)",
								color: "var(--brand-700)",
								padding: "4px 8px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 700,
							}}
						>
							Score: {riskData.riskScore}/100
						</div>
					</div>

					<div className="patients-flex-col-gap-8" style={{ marginTop: "16px" }}>
						<span
							style={{
								fontSize: "12px",
								color: "var(--slate-500)",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							Факторы риска:
						</span>

						{riskData.factors.pastNoShows > 0 && (
							<div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.07)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
								<span style={{ fontSize: "13px", color: "var(--rust)", fontWeight: 500 }}>
									Неявки без предупреждения: {riskData.factors.pastNoShows}
								</span>
							</div>
						)}

						{riskData.factors.pastCancellations > 0 && (
							<div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.05)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.15)" }}>
								<span style={{ fontSize: "13px", color: "var(--rust)", fontWeight: 500 }}>
									Отмены записей: {riskData.factors.pastCancellations}
								</span>
							</div>
						)}

						{riskData.factors.hasDebt && (
							<div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.05)", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)" }}>
								<span style={{ fontSize: "13px", color: "#d97706", fontWeight: 500 }}>
									Задолженность: {formatRub(riskData.factors.totalDebtRub || 0)}
								</span>
							</div>
						)}

						{(riskData.factors.openTreatmentItems || 0) > 3 && (riskData.factors.completedTreatmentItems || 0) === 0 && (
							<div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.05)", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.15)" }}>
								<span style={{ fontSize: "13px", color: "#d97706", fontWeight: 500 }}>
									Много незакрытых позиций плана ({riskData.factors.openTreatmentItems})
								</span>
							</div>
						)}

						{(riskData.factors.totalVisits || 0) > 5 && (
							<div style={{ padding: "10px 12px", background: "rgba(16,185,129,0.05)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.15)" }}>
								<span style={{ fontSize: "13px", color: "var(--teal)", fontWeight: 500 }}>
									Лояльный пациент: {riskData.factors.totalVisits} визитов
								</span>
							</div>
						)}

						{!riskData.factors.hasDebt && riskData.factors.pastCancellations === 0 && (riskData.factors.pastNoShows || 0) === 0 && (
							<div style={{ padding: "10px 12px", background: "rgba(16,185,129,0.05)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
								<span style={{ fontSize: "13px", color: "var(--teal)", fontWeight: 500 }}>
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
