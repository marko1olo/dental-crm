/**
 * ============================================================================
 * AUTOCLAVE LOG 257/U — 5 CHAMBER CONTROL POINTS VISUAL MAP
 * Интерактивная 2D/3D визуализация 5 контрольных точек камеры автоклава,
 * термодинамические зоны риска и индикаторы 4-5 классов (СанПиН 3.3686-21).
 * ============================================================================
 */

import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	Layers,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Wind,
} from "lucide-react";
import React, { useState } from "react";
import {
	createDefault5ChamberPoints,
	type ChamberPointEvaluation,
} from "./autoclaveLogEngine.js";
import {
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_CHEMICAL_INDICATORS,
	type ChamberControlPointDefinition,
	type ChemicalIndicatorDefinition,
} from "./autoclaveLogPresets.js";

export function AutoclaveChamberPointsTab() {
	const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>("intetest_v_134_5");
	const [selectedPointIndex, setSelectedPointIndex] = useState<number>(3); // Default Center Point
	const [points, setPoints] = useState<ChamberPointEvaluation[]>(() =>
		createDefault5ChamberPoints("intetest_v_134_5", true),
	);

	const selectedIndicator: ChemicalIndicatorDefinition =
		STATUTORY_CHEMICAL_INDICATORS.find((ind) => ind.id === selectedIndicatorId) ??
		STATUTORY_CHEMICAL_INDICATORS[0]!;

	const selectedPointDef: ChamberControlPointDefinition =
		STATUTORY_CHAMBER_5_POINTS.find((pt) => pt.pointIndex === selectedPointIndex) ??
		STATUTORY_CHAMBER_5_POINTS[2]!;

	const currentPointEval = points.find((p) => p.pointIndex === selectedPointIndex);

	const handleIndicatorChange = (indId: string) => {
		setSelectedIndicatorId(indId);
		setPoints(createDefault5ChamberPoints(indId, true));
	};

	const togglePoint = (ptIndex: 1 | 2 | 3 | 4 | 5) => {
		setPoints((prev) =>
			prev.map((pt) => {
				if (pt.pointIndex === ptIndex) {
					const nextStatus = pt.status === "passed" ? "failed" : "passed";
					return {
						...pt,
						status: nextStatus,
						actualColorRu:
							nextStatus === "passed" ? selectedIndicator.passedColorRu : selectedIndicator.failedColorRu,
					};
				}
				return pt;
			}),
		);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			{/* Indicator Selection Header */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "space-between",
					alignItems: "center",
					background: "var(--paper-strong, #f8fafc)",
					padding: "0.875rem 1rem",
					borderRadius: "10px",
					border: "1px solid var(--line, #e2e8f0)",
					gap: "1rem",
				}}
			>
				<div>
					<span className="autoclave-form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<ShieldCheck size={16} color="var(--teal, #0d9488)" />
						Эталон химического индикатора для 5 контрольных точек
					</span>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Класс 4 (многопеременные) и Класс 5 (интеграторы пара) по ГОСТ ISO 11140-1
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<select
						className="autoclave-select"
						style={{ minHeight: "40px" }}
						value={selectedIndicatorId}
						onChange={(e) => handleIndicatorChange(e.target.value)}
					>
						{STATUTORY_CHEMICAL_INDICATORS.map((ind) => (
							<option key={ind.id} value={ind.id}>
								{ind.tradeNameRu} (Класс {ind.indicatorClass})
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Main Chamber Visual Layout & Inspector Split */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
				{/* 2D/3D Chamber Diagram */}
				<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
					<div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						Схема размещения тест-полосок в камере автоклава
					</div>

					<div className="chamber-visual-box">
						<div className="chamber-cylinder-outline">
							<span
								style={{
									color: "#475569",
									fontSize: "0.75rem",
									letterSpacing: "2px",
									textTransform: "uppercase",
									fontWeight: 700,
								}}
							>
								Стерилизационная камера (Класс B)
							</span>
						</div>

						{/* 5 Points Markers */}
						{STATUTORY_CHAMBER_5_POINTS.map((ptDef) => {
							const ptEval = points.find((p) => p.pointIndex === ptDef.pointIndex);
							const isPassed = ptEval?.status === "passed";
							const isSelected = ptDef.pointIndex === selectedPointIndex;

							return (
								<div
									key={ptDef.pointIndex}
									className="chamber-point-marker"
									style={{
										left: `${ptDef.coordinateX}%`,
										top: `${ptDef.coordinateY}%`,
									}}
									onClick={() => setSelectedPointIndex(ptDef.pointIndex)}
									title={`${ptDef.nameRu} (Клик для деталей)`}
								>
									<div
										className={`chamber-point-badge ${isPassed ? "passed" : "failed"}`}
										style={{
											transform: isSelected ? "scale(1.2)" : "scale(1)",
											borderColor: isSelected ? "#38bdf8" : "#ffffff",
											boxShadow: isSelected ? "0 0 12px #38bdf8" : undefined,
										}}
									>
										{ptDef.code}
									</div>
									<div className="chamber-point-label">{ptDef.code}</div>
								</div>
							);
						})}
					</div>

					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", textAlign: "center" }}>
						Кликните на маркер точки для детального аудита термодинамической зоны риска
					</div>
				</div>

				{/* Inspector Detail Card */}
				<div
					style={{
						background: "var(--paper-strong, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "10px",
						padding: "1.25rem",
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						gap: "1rem",
					}}
				>
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
								{selectedPointDef.nameRu}
							</span>
							<span className={`status-badge ${currentPointEval?.status === "passed" ? "passed" : "failed"}`}>
								{currentPointEval?.status === "passed" ? "СТЕРИЛЬНО" : "ОТКЛОНЕНИЕ"}
							</span>
						</div>

						<div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
							<div>
								<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Физическое расположение:</div>
								<div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{selectedPointDef.physicalLocationRu}</div>
							</div>

							<div>
								<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Фактор риска СанПиН:</div>
								<div style={{ fontSize: "0.8125rem", color: "#b45309", fontWeight: 500 }}>
									{selectedPointDef.thermodynamicRiskFactorRu}
								</div>
							</div>

							<div
								style={{
									borderTop: "1px solid var(--line, #e2e8f0)",
									paddingTop: "0.6rem",
									display: "flex",
									flexDirection: "column",
									gap: "0.35rem",
								}}
							>
								<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
									Переход цвета индикатора ({selectedIndicator.tradeNameRu}):
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem" }}>
										<span
											style={{
												width: "14px",
												height: "14px",
												borderRadius: "3px",
												background: selectedIndicator.initialColorHex,
												display: "inline-block",
												border: "1px solid rgba(0,0,0,0.1)",
											}}
										/>
										<span>До: {selectedIndicator.initialColorRu}</span>
									</div>
									<span>→</span>
									<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem" }}>
										<span
											style={{
												width: "14px",
												height: "14px",
												borderRadius: "3px",
												background: selectedIndicator.passedColorHex,
												display: "inline-block",
												border: "1px solid rgba(0,0,0,0.1)",
											}}
										/>
										<span style={{ fontWeight: 600, color: "#059669" }}>
											После: {selectedIndicator.passedColorRu}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={() => togglePoint(selectedPointDef.pointIndex as any)}
						className="autoclave-btn autoclave-btn-secondary"
						style={{ width: "100%" }}
					>
						<RefreshCw size={16} />
						Переключить статус ({selectedPointDef.code}:{" "}
						{currentPointEval?.status === "passed" ? "Сделать БРАКОМ" : "Сделать СТЕРИЛЬНЫМ"})
					</button>
				</div>
			</div>

			{/* Statutory Requirements Card */}
			<div
				style={{
					background: "var(--paper-strong, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "8px",
					padding: "0.875rem",
					fontSize: "0.75rem",
					color: "var(--muted, #64748b)",
					lineHeight: 1.4,
				}}
			>
				<strong>Нормативное требование СанПиН 3.3686-21 (п. 3640):</strong> Контроль работы стерилизаторов
				физическим и химическим методами проводят в каждом цикле. Индикаторы закладывают в 5 контрольных точек
				камеры объемом до 50 л (по 1 шт. в каждую точку). При объеме камеры более 50 л количество точек увеличивается
				до 11–15. Все тест-полоски подклеиваются в рабочий журнал (Форма № 257/у) или хранятся в электронной базе.
			</div>
		</div>
	);
}
