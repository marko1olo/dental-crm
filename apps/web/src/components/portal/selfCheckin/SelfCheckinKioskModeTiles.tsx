/**
 * SelfCheckinKioskModeTiles.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * 3 High-contrast Kiosk Mode Selection Tiles:
 * 1. «Я по записи» (scheduled visit)
 * 2. «Первичный визит» (first-time patient)
 * 3. «Острая боль / Экстренно» (emergency triage)
 */

import React, { memo } from "react";
import { AlertCircle, Calendar, UserPlus } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";

export type KioskSelectionMode = "scheduled" | "first_time" | "emergency";

export interface SelfCheckinKioskModeTilesProps {
	readonly activeMode: KioskSelectionMode;
	readonly onSelectMode: (mode: KioskSelectionMode) => void;
}

export const SelfCheckinKioskModeTiles: React.FC<SelfCheckinKioskModeTilesProps> = memo(({
	activeMode,
	onSelectMode,
}) => {
	const handleSelect = (mode: KioskSelectionMode) => {
		triggerHaptic("selection");
		onSelectMode(mode);
	};

	return (
		<div
			className="kiosk-mode-tiles-grid"
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
				gap: "10px",
				marginTop: "12px",
				marginBottom: "12px",
			}}
		>
			{/* Tile 1: Я по записи */}
			<button
				type="button"
				onClick={() => handleSelect("scheduled")}
				data-testid="kiosk-tile-scheduled"
				style={{
					padding: "12px 8px",
					minHeight: "72px",
					borderRadius: "14px",
					border: `2px solid ${activeMode === "scheduled" ? "var(--teal)" : "var(--line)"}`,
					backgroundColor: activeMode === "scheduled" ? "var(--teal-soft, rgba(13, 148, 136, 0.12))" : "var(--paper-card, var(--paper))",
					color: activeMode === "scheduled" ? "var(--teal)" : "var(--ink)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: "6px",
					cursor: "pointer",
					touchAction: "manipulation",
					transition: "all 0.15s ease",
				}}
			>
				<Calendar size={22} />
				<span style={{ fontSize: "14px", fontWeight: 700 }}>Я по записи</span>
			</button>

			{/* Tile 2: Первичный визит */}
			<button
				type="button"
				onClick={() => handleSelect("first_time")}
				data-testid="kiosk-tile-first-time"
				style={{
					padding: "12px 8px",
					minHeight: "72px",
					borderRadius: "14px",
					border: `2px solid ${activeMode === "first_time" ? "var(--teal)" : "var(--line)"}`,
					backgroundColor: activeMode === "first_time" ? "var(--teal-soft, rgba(13, 148, 136, 0.12))" : "var(--paper-card, var(--paper))",
					color: activeMode === "first_time" ? "var(--teal)" : "var(--ink)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: "6px",
					cursor: "pointer",
					touchAction: "manipulation",
					transition: "all 0.15s ease",
				}}
			>
				<UserPlus size={22} />
				<span style={{ fontSize: "14px", fontWeight: 700 }}>Первичный</span>
			</button>

			{/* Tile 3: Острая боль / Экстренно */}
			<button
				type="button"
				onClick={() => handleSelect("emergency")}
				data-testid="kiosk-tile-emergency"
				style={{
					padding: "12px 8px",
					minHeight: "72px",
					borderRadius: "14px",
					border: `2px solid ${activeMode === "emergency" ? "var(--amber, #f59e0b)" : "var(--line)"}`,
					backgroundColor: activeMode === "emergency" ? "var(--amber-soft, rgba(245, 158, 11, 0.15))" : "var(--paper-card, var(--paper))",
					color: activeMode === "emergency" ? "var(--amber, #d97706)" : "var(--ink)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: "6px",
					cursor: "pointer",
					touchAction: "manipulation",
					transition: "all 0.15s ease",
				}}
			>
				<AlertCircle size={22} />
				<span style={{ fontSize: "14px", fontWeight: 700 }}>Острая боль</span>
			</button>
		</div>
	);
});

SelfCheckinKioskModeTiles.displayName = "SelfCheckinKioskModeTiles";
