import { AlertTriangle, Calculator } from "lucide-react";
import React, { useState } from "react";
import { useAppLogic } from "../../useAppLogic";

export function NdflCalculatorModal({ onClose }: { onClose: () => void }) {
	const { patientId } = useAppLogic();
	const [startDate, setStartDate] = useState(
		new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
	);
	const [endDate, setEndDate] = useState(
		new Date().toISOString().split("T")[0],
	);

	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		isBlocked: boolean;
		debtRub: number;
		code1TotalRub: number;
		code2TotalRub: number;
	} | null>(null);

	const handleCalculate = async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			const res = await fetch(
				`/api/documents/ndfl-calculator?patientId=${patientId}&startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z`,
			);
			const data = await res.json();
			setResult(data);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="modal-overlay"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0,0,0,0.5)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
			}}
		>
			<div
				className="modal-content"
				style={{
					background: "white",
					padding: "24px",
					borderRadius: "8px",
					width: "100%",
					maxWidth: "500px",
				}}
			>
				<h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Calculator size={20} />
					Калькулятор НДФЛ
				</h2>

				<div style={{ display: "flex", gap: "16px", margin: "16px 0" }}>
					<label style={{ display: "flex", flexDirection: "column", flex: 1 }}>
						Начало периода
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							style={{ padding: "8px", marginTop: "4px" }}
						/>
					</label>
					<label style={{ display: "flex", flexDirection: "column", flex: 1 }}>
						Конец периода
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							style={{ padding: "8px", marginTop: "4px" }}
						/>
					</label>
				</div>

				<button
					onClick={handleCalculate}
					disabled={loading}
					style={{
						padding: "8px 16px",
						background: "#0066cc",
						color: "white",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
						width: "100%",
					}}
				>
					{loading ? "Вычисление..." : "Рассчитать"}
				</button>

				{result && (
					<div style={{ marginTop: "24px" }}>
						{result.isBlocked ? (
							<div
								style={{
									background: "#fff1f0",
									border: "1px solid #ffa39e",
									padding: "16px",
									borderRadius: "4px",
									color: "#cf1322",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontWeight: "bold",
									}}
								>
									<AlertTriangle size={18} />
									Формирование заблокировано
								</div>
								<div style={{ marginTop: "8px" }}>
									У пациента есть неоплаченный долг:{" "}
									<strong>{result.debtRub} ₽</strong>. Для получения справки
									НДФЛ необходимо полностью погасить задолженность.
								</div>
							</div>
						) : (
							<div
								style={{
									background: "#f6ffed",
									border: "1px solid #b7eb8f",
									padding: "16px",
									borderRadius: "4px",
									color: "#389e0d",
								}}
							>
								<h3 style={{ margin: "0 0 12px 0" }}>Суммы для справки:</h3>
								<div
									style={{ display: "flex", justifyContent: "space-between" }}
								>
									<span>Код 1 (Обычное лечение):</span>
									<strong>{result.code1TotalRub} ₽</strong>
								</div>
								<div
									style={{ display: "flex", justifyContent: "space-between" }}
								>
									<span>Код 2 (Дорогостоящее):</span>
									<strong>{result.code2TotalRub} ₽</strong>
								</div>
							</div>
						)}
					</div>
				)}

				<div style={{ marginTop: "24px", textAlign: "right" }}>
					<button
						onClick={onClose}
						style={{
							padding: "8px 16px",
							background: "#f0f0f0",
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
						}}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
