/**
 * ============================================================================
 * AUTOCLAVE LOG 257/U — CSO STERILIZATION ANALYTICS TAB
 * Сводная статистика работы стерилизационного отделения (ЦСО), загрузка аппаратов,
 * процент брака, расход упаковок и график технического обслуживания.
 * ============================================================================
 */

import {
	Activity,
	AlertTriangle,
	Award,
	Calendar,
	CheckCircle2,
	Clock,
	Flame,
	Layers,
	PackageCheck,
	ShieldCheck,
	Wrench,
	Zap,
} from "lucide-react";
import React from "react";
import {
	calculateSterilizerStatistics,
	type BiologicalControlTestRecord,
	type Form257Record,
} from "./autoclaveLogEngine.js";
import {
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
} from "./autoclaveLogPresets.js";

export interface AutoclaveAnalyticsTabProps {
	readonly records: readonly Form257Record[];
	readonly bioRecords?: readonly BiologicalControlTestRecord[];
}

export function AutoclaveAnalyticsTab({ records, bioRecords = [] }: AutoclaveAnalyticsTabProps) {
	const stats = calculateSterilizerStatistics(records, bioRecords);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			{/* Top KPI Cards */}
			<div className="autoclave-stats-grid">
				<div className="autoclave-stat-card">
					<div className="autoclave-stat-icon">
						<Activity size={22} />
					</div>
					<div>
						<div className="autoclave-stat-number">{stats.totalCycles}</div>
						<div className="autoclave-stat-label">Всего циклов в Форме 257/у</div>
					</div>
				</div>

				<div className="autoclave-stat-card">
					<div
						className="autoclave-stat-icon"
						style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}
					>
						<CheckCircle2 size={22} />
					</div>
					<div>
						<div className="autoclave-stat-number">{stats.successRatePercent}%</div>
						<div className="autoclave-stat-label">
							Успешных циклов ({stats.successfulCycles} из {stats.totalCycles})
						</div>
					</div>
				</div>

				<div className="autoclave-stat-card">
					<div
						className="autoclave-stat-icon"
						style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}
					>
						<PackageCheck size={22} />
					</div>
					<div>
						<div className="autoclave-stat-number">{stats.totalPacksProcessed}</div>
						<div className="autoclave-stat-label">Обработано крафт-пакетов / наборов</div>
					</div>
				</div>

				<div className="autoclave-stat-card">
					<div
						className="autoclave-stat-icon"
						style={{
							background: stats.failedCycles > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
							color: stats.failedCycles > 0 ? "#ef4444" : "#10b981",
						}}
					>
						<AlertTriangle size={22} />
					</div>
					<div>
						<div className="autoclave-stat-number">{stats.failedCycles}</div>
						<div className="autoclave-stat-label">Брак стерилизации (0% допущено к пациентам)</div>
					</div>
				</div>
			</div>

			{/* Distribution by Regimes & Sterilizer Units */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
				{/* Cycles by Regime */}
				<div
					style={{
						background: "var(--paper-strong, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "10px",
						padding: "1.25rem",
						display: "flex",
						flexDirection: "column",
						gap: "0.75rem",
					}}
				>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						Распределение циклов по режимам СанПиН
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						{STATUTORY_STERILIZATION_REGIMES.map((reg) => {
							const count = stats.cyclesByRegime[reg.id] ?? 0;
							const percent = stats.totalCycles > 0 ? Math.round((count / stats.totalCycles) * 100) : 0;
							return (
								<div key={reg.id} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
									<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
										<span style={{ fontWeight: 600 }}>{reg.shortLabelRu}</span>
										<span style={{ color: "var(--muted, #64748b)" }}>
											{count} циклов ({percent}%)
										</span>
									</div>
									<div
										style={{
											height: "6px",
											width: "100%",
											background: "var(--line, #e2e8f0)",
											borderRadius: "3px",
											overflow: "hidden",
										}}
									>
										<div
											style={{
												height: "100%",
												width: `${percent}%`,
												background: "var(--teal, #0d9488)",
												borderRadius: "3px",
											}}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Maintenance Schedule & Apparatus Fleet */}
				<div
					style={{
						background: "var(--paper-strong, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "10px",
						padding: "1.25rem",
						display: "flex",
						flexDirection: "column",
						gap: "0.75rem",
					}}
				>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						Парк стерилизаторов и график планового ТО
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
						{STATUTORY_STERILIZERS_CATALOG.map((st) => {
							const count = stats.cyclesBySterilizer[st.code] ?? 0;
							return (
								<div
									key={st.id}
									style={{
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: "8px",
										padding: "0.625rem",
										background: "var(--paper, #ffffff)",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										fontSize: "0.75rem",
									}}
								>
									<div>
										<div style={{ fontWeight: 700 }}>
											{st.code} — {st.brand} {st.model}
										</div>
										<div style={{ color: "var(--muted, #64748b)", fontSize: "0.6875rem" }}>
											Зав. № {st.serialNumber} • Выполнено: {count} циклов
										</div>
									</div>
									<div style={{ textAlign: "right" }}>
										<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>Следующее ТО:</div>
										<div style={{ fontWeight: 600, color: "#059669" }}>{st.nextMaintenanceDate}</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
