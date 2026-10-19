import React from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { ChamberPointState, SteamPenetrationTestType } from "./sterilizationCycleTypes";
import { STEAM_PENETRATION_TEST_OPTIONS } from "./sterilizationCycleTypes";

export interface CycleChemicalIndicatorSelectProps {
	readonly recommendedIndicatorName: string;
	readonly indicatorExternalPassed: boolean;
	readonly onIndicatorExternalPassedChange: (val: boolean) => void;
	readonly chamberPoints: readonly ChamberPointState[];
	readonly onToggleChamberPoint: (pointIndex: 1 | 2 | 3 | 4 | 5) => void;
	readonly psoAzopyramNegative: boolean;
	readonly onPsoAzopyramChange: (val: boolean) => void;
	readonly psoPhenolphthaleinNegative: boolean;
	readonly onPsoPhenolphthaleinChange: (val: boolean) => void;
	readonly psoSampleSize: number;
	readonly onPsoSampleSizeChange: (val: number) => void;
	readonly steamPenetrationTest?: SteamPenetrationTestType;
	readonly onSteamPenetrationTestChange?: (val: SteamPenetrationTestType) => void;
	readonly isCycleSterileCompliant: boolean;
}

export function CycleChemicalIndicatorSelect({
	recommendedIndicatorName,
	indicatorExternalPassed,
	onIndicatorExternalPassedChange,
	chamberPoints,
	onToggleChamberPoint,
	psoAzopyramNegative,
	onPsoAzopyramChange,
	psoPhenolphthaleinNegative,
	onPsoPhenolphthaleinChange,
	psoSampleSize,
	onPsoSampleSizeChange,
	steamPenetrationTest = "none",
	onSteamPenetrationTestChange,
	isCycleSterileCompliant,
}: CycleChemicalIndicatorSelectProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
			{/* Pre-Sterilization Cleaning Control (ПСО, Форма № 366/у) */}
			<div
				style={{
					padding: "0.75rem",
					borderRadius: "8px",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "0.4rem",
					}}
				>
					<div style={{ fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
						<ShieldCheck size={14} color="var(--teal, #0d9488)" />
						<span>Предстерилизационная очистка (контроль качества)</span>
					</div>
					<span style={{ fontSize: "0.72rem", color: "var(--muted, #64748b)" }}>
						Серия азопирама: АЗО-2026/08-114
					</span>
				</div>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
					<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", cursor: "pointer" }}>
						<input
							type="checkbox"
							checked={psoAzopyramNegative}
							onChange={(e) => onPsoAzopyramChange(e.target.checked)}
						/>
						<span>Азопирам: {psoAzopyramNegative ? "Отрицательно (норма)" : "Положительно (брак!)"}</span>
					</label>
					<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", cursor: "pointer" }}>
						<input
							type="checkbox"
							checked={psoPhenolphthaleinNegative}
							onChange={(e) => onPsoPhenolphthaleinChange(e.target.checked)}
						/>
						<span>Фенолфталеин: {psoPhenolphthaleinNegative ? "Отрицательно (норма)" : "Положительно (брак!)"}</span>
					</label>
					<div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
						<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Выборка:</span>
						<input
							type="number"
							min={3}
							value={psoSampleSize}
							onChange={(e) => onPsoSampleSizeChange(parseInt(e.target.value, 10) || 3)}
							className="sanpin-input"
							style={{ minHeight: "30px", width: "60px", padding: "0.2rem 0.4rem", fontSize: "0.78rem", fontWeight: 700 }}
						/>
						<span style={{ fontSize: "0.72rem", color: "var(--muted, #64748b)" }}>шт. (≥1%)</span>
					</div>
				</div>
			</div>

			{/* Chemical indicators: Outside and 5 Chamber Points */}
			<div
				style={{
					padding: "0.75rem",
					borderRadius: "8px",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "0.5rem",
					}}
				>
					<div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
						Химический термоконтроль (Индикаторы 4-го и 5-го классов)
					</div>
					<span style={{ fontSize: "0.75rem", color: "var(--brand-primary, #0284c7)" }}>
						{recommendedIndicatorName}
					</span>
				</div>

				<div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
					<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer" }}>
						<input
							type="checkbox"
							checked={indicatorExternalPassed}
							onChange={(e) => onIndicatorExternalPassedChange(e.target.checked)}
						/>
						<span>Индикатор снаружи крафт-пакета (Класс 1/4): изменение цвета подтверждено</span>
					</label>
				</div>

				{/* Optional Bowie-Dick / Helix selector */}
				{onSteamPenetrationTestChange && (
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
						<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Тест пара:</span>
						<select
							value={steamPenetrationTest}
							onChange={(e) => onSteamPenetrationTestChange(e.target.value as SteamPenetrationTestType)}
							className="sanpin-select"
							style={{ minHeight: "30px", fontSize: "0.75rem", padding: "0.2rem 0.4rem", flex: 1 }}
						>
							{STEAM_PENETRATION_TEST_OPTIONS.map((opt) => (
								<option key={opt.id} value={opt.id}>
									{opt.nameRu}
								</option>
							))}
						</select>
					</div>
				)}

				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginBottom: "0.4rem" }}>
					Контроль 5 критических точек камеры (КТ-1..КТ-5, индикаторы 5 класса):
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.4rem" }}>
					{chamberPoints.map((pt) => (
						<button
							key={pt.pointIndex}
							type="button"
							onClick={() => onToggleChamberPoint(pt.pointIndex)}
							title={pt.labelRu}
							style={{
								padding: "0.4rem 0.2rem",
								fontSize: "0.75rem",
								fontWeight: 700,
								borderRadius: "6px",
								border: pt.passed ? "1.5px solid #16a34a" : "1.5px solid #dc2626",
								background: pt.passed ? "rgba(22, 163, 74, 0.1)" : "rgba(220, 38, 38, 0.1)",
								color: pt.passed ? "#166534" : "#991b1b",
								cursor: "pointer",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "2px",
							}}
						>
							<span>{pt.code}</span>
							<span style={{ fontSize: "0.65rem", fontWeight: "normal" }}>
								{pt.passed ? "Норма" : "Брак"}
							</span>
						</button>
					))}
				</div>
			</div>

			{/* Compliance banner */}
			<div
				style={{
					padding: "0.6rem 0.75rem",
					borderRadius: "6px",
					background: isCycleSterileCompliant ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
					border: `1px solid ${isCycleSterileCompliant ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
				}}
			>
				{isCycleSterileCompliant ? (
					<CheckCircle2 size={18} color="#059669" />
				) : (
					<AlertTriangle size={18} color="#dc2626" />
				)}
				<div style={{ fontSize: "0.8rem", fontWeight: 700, color: isCycleSterileCompliant ? "#059669" : "#dc2626" }}>
					{isCycleSterileCompliant
						? "Все параметры цикла, термоиндикаторы и контроль предстерилизационной очистки соответствуют норме СанПиН. Партия стерильна."
						: "ВНИМАНИЕ: Нарушение параметров цикла, термоиндикаторов или контроля очистки! Инструменты подлежат браковке и повторной стерилизации."}
				</div>
			</div>
		</div>
	);
}
