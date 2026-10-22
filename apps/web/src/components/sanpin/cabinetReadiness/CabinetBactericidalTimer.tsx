/**
 * @file CabinetBactericidalTimer.tsx
 * @description Layer 4: Bactericidal irradiator & Dezar timer tracking lamp operating hours (Р 3.5.1904-04 & СанПиН 3.3686-21).
 */

import { calculateLampOperatingHours } from "@dental/shared";
import { CheckCircle2, Sparkles } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { CabinetLampDurationSelector } from "./CabinetLampDurationSelector.js";
import { CabinetLampStatusBadge } from "./CabinetLampStatusBadge.js";
import type { BactericidalExposureLog, CabinetBactericidalTimerProps } from "./types.js";

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
	const [mode] = useState<"closed_recirculator" | "open_uv">("closed_recirculator");
	const [lastLoggedAt, setLastLoggedAt] = useState<string | null>(null);

	const lampCalc = useMemo(() => calculateLampOperatingHours(operatingHours, 0, maxLampHours), [operatingHours, maxLampHours]);

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
		if (onExposureLogged) onExposureLogged(logEntry);
		showToast(`Зафиксировано в журнале: ${selectedCabinet}, ${lampModel}, +${selectedDurationMinutes} мин (наработка ${nextHours}/${maxLampHours} ч)`, "success");
	};

	return (
		<div
			className="cabinet-bactericidal-timer-card"
			style={{
				marginTop: "0.75rem", background: "var(--paper, #ffffff)",
				border: "1px solid var(--paper-border, #e2e8f0)", borderRadius: "0.75rem", padding: "0.85rem 1.1rem",
			}}
		>
			<CabinetLampStatusBadge
				lampModel={lampModel} selectedCabinet={selectedCabinet} operatingHours={operatingHours}
				maxLampHours={maxLampHours} lampStatus={lampCalc.lampStatus} remainingPercent={lampCalc.remainingPercent}
			/>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", alignItems: "center" }}>
				<CabinetLampDurationSelector
					selectedDurationMinutes={selectedDurationMinutes}
					setSelectedDurationMinutes={setSelectedDurationMinutes}
				/>

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
							minHeight: "44px", padding: "0.5rem 1.15rem", fontSize: "0.85rem", fontWeight: 700,
							cursor: "pointer", background: "var(--teal, #0d9488)", color: "#ffffff", borderRadius: "0.5rem",
							display: "inline-flex", alignItems: "center", gap: "0.4rem", boxShadow: "0 1px 3px rgba(13, 148, 136, 0.2)",
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
