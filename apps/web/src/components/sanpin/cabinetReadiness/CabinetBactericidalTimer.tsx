/**
 * @file CabinetBactericidalTimer.tsx
 * @description Layer 4: Bactericidal irradiator & Dezar timer tracking lamp operating hours (Р 3.5.1904-04 & СанПиН 3.3686-21).
 */

import { calculateLampOperatingHours } from "@dental/shared";
import { AlertTriangle, CheckCircle2, Sparkles, Wind } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import type { BactericidalExposureLog, CabinetBactericidalTimerProps } from "./types";

export function CabinetBactericidalTimer({
	selectedCabinet,
	nurseName,
	lampModel = "Дезар-7 (ОРУБн-3-5-«КРОНТ»)",
	initialOperatingHours = 1420,
	maxLampHours = 8000,
	onExposureLogged,
}: CabinetBactericidalTimerProps) {
	const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(30);
	const [operatingHours, setOperatingHours] = useState<number>(initialOperatingHours);
	const [mode, setMode] = useState<"closed_recirculator" | "open_uv">("closed_recirculator");
	const [lastLoggedAt, setLastLoggedAt] = useState<string | null>(null);

	// Calculate statutory lamp lifecycle
	const lampCalc = useMemo(() => {
		return calculateLampOperatingHours(operatingHours, 0, maxLampHours);
	}, [operatingHours, maxLampHours]);

	const handleLogExposureToSanpin = () => {
		const sessionHours = Math.round((selectedDurationMinutes / 60) * 100) / 100;
		const nextHours = Math.round((operatingHours + sessionHours) * 100) / 100;
		setOperatingHours(nextHours);
		setLastLoggedAt(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));

		const logEntry: BactericidalExposureLog = {
			id: `bac-${Date.now()}`,
			cabinetNumber: selectedCabinet,
			timestamp: new Date().toISOString(),
			durationMinutes: selectedDurationMinutes,
			operatorFullName: nurseName.trim() || "Ассистент стоматолога",
			lampModel,
			lampHoursBefore: operatingHours,
			lampHoursAfter: nextHours,
			mode,
		};

		if (onExposureLogged) {
			onExposureLogged(logEntry);
		}

		showToast(
			`Зафиксировано в журнале: ${selectedCabinet}, ${lampModel}, +${selectedDurationMinutes} мин (наработка ${nextHours}/${maxLampHours} ч)`,
			"success",
		);
	};

	return (
		<div
			className="cabinet-bactericidal-timer-card"
			style={{
				marginTop: "0.75rem",
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--paper-border, #e2e8f0)",
				borderRadius: "0.75rem",
				padding: "0.85rem 1.1rem",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "1rem",
					flexWrap: "wrap",
					marginBottom: "0.5rem",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Wind size={19} color="var(--brand-primary, #2563eb)" />
					<div>
						<h3 style={{ fontSize: "0.92rem", fontWeight: 700, margin: 0, color: "var(--ink, #1e293b)" }}>
							Обеззараживание воздуха и контроль ресурса ламп (Дезар)
						</h3>
						<span style={{ fontSize: "0.76rem", color: "var(--muted, #64748b)" }}>
							{lampModel} • {selectedCabinet}
						</span>
					</div>
				</div>

				{/* Lamp Hours Badge */}
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<span
						style={{
							padding: "0.2rem 0.55rem",
							borderRadius: "0.375rem",
							fontSize: "0.75rem",
							fontWeight: 700,
							background:
								lampCalc.lampStatus === "expired_replace_now"
									? "rgba(239, 68, 68, 0.15)"
									: lampCalc.lampStatus === "warning_replace_soon"
										? "rgba(245, 158, 11, 0.15)"
										: "rgba(16, 185, 129, 0.15)",
							color:
								lampCalc.lampStatus === "expired_replace_now"
									? "var(--bad-fg, #ef4444)"
									: lampCalc.lampStatus === "warning_replace_soon"
										? "var(--warn-fg, #b45309)"
										: "var(--ok-fg, #059669)",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.3rem",
						}}
					>
						{lampCalc.lampStatus === "normal" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
						<span>Наработка: {operatingHours} / {maxLampHours} ч ({lampCalc.remainingPercent}% остаток)</span>
					</span>
				</div>
			</div>

			{/* Mode & 1-Click Batch Controls */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: "1rem",
					alignItems: "center",
				}}
			>
				{/* Preset selection */}
				<div>
					<label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted, #64748b)", display: "block", marginBottom: "0.35rem" }}>
						Режим экспозиции:
					</label>
					<div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
						{[15, 30, 60].map((mins) => (
							<button
								key={mins}
								type="button"
								onClick={() => setSelectedDurationMinutes(mins)}
								className="secondary-button"
								style={{
									minHeight: "40px",
									padding: "0.35rem 0.75rem",
									borderRadius: "0.5rem",
									fontSize: "0.82rem",
									fontWeight: selectedDurationMinutes === mins ? 800 : 600,
									border: selectedDurationMinutes === mins ? "2px solid var(--teal, #0d9488)" : "1px solid var(--paper-border, #cbd5e1)",
									background: selectedDurationMinutes === mins ? "rgba(13, 148, 136, 0.1)" : "var(--paper-subtle, #f8fafc)",
									color: selectedDurationMinutes === mins ? "var(--teal, #0d9488)" : "inherit",
									cursor: "pointer",
								}}
							>
								{mins} минут
							</button>
						))}
					</div>
				</div>

				{/* 1-Click Action Button */}
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
					{lastLoggedAt && (
						<div style={{ fontSize: "0.78rem", color: "var(--ok-fg, #059669)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
							<CheckCircle2 size={13} />
							<span>Зафиксировано в {lastLoggedAt}</span>
						</div>
					)}

					<button
						type="button"
						onClick={handleLogExposureToSanpin}
						className="primary-button sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.15rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							cursor: "pointer",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							borderRadius: "0.5rem",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.4rem",
							boxShadow: "0 1px 3px rgba(13, 148, 136, 0.2)",
						}}
						data-testid="bactericidal-log-cycle-btn"
						title="Зафиксировать цикл работы рециркулятора в журнале в 1 клик"
					>
						<Sparkles size={16} />
						<span>Зафиксировать цикл ({selectedDurationMinutes} мин)</span>
					</button>
				</div>
			</div>
		</div>
	);
}
