import React from "react";
import { Play, StopCircle } from "lucide-react";

export interface ChairRentalSessionStripProps {
	readonly isRentalActive: boolean;
	readonly selectedChairId: string;
	readonly onSelectChairId: (id: string) => void;
	readonly sessionElapsedMinutes: number;
	readonly onStartRentalSession: () => void;
	readonly onStopRentalSession: () => void;
	readonly widgetId: string;
}

export const ChairRentalSessionStrip: React.FC<ChairRentalSessionStripProps> = ({
	isRentalActive,
	selectedChairId,
	onSelectChairId,
	sessionElapsedMinutes,
	onStartRentalSession,
	onStopRentalSession,
	widgetId,
}) => (
	<div
		className="chair-rental-session-strip"
		style={{
			margin: "12px 0 6px 0",
			padding: "10px 14px",
			borderRadius: "14px",
			background: isRentalActive
				? "color-mix(in srgb, var(--ok-fg, #15803d) 8%, var(--paper))"
				: "var(--paper-soft)",
			border: isRentalActive
				? "1px solid color-mix(in srgb, var(--ok-fg, #15803d) 30%, transparent)"
				: "1px solid var(--line)",
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			flexWrap: "wrap",
			gap: "10px",
		}}
		data-testid="autonomous-chair-rental-strip"
	>
		{!isRentalActive ? (
			<>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
					<label htmlFor={`chair-select-${widgetId}`} style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>
						Рабочее место:
					</label>
					<select
						id={`chair-select-${widgetId}`}
						value={selectedChairId}
						onChange={(e) => onSelectChairId(e.target.value)}
						style={{ minHeight: "44px", height: "44px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontSize: "12.5px", fontWeight: 600, flex: 1 }}
					>
						<option value="chair-01">Кресло №1 (Anthos A5)</option>
						<option value="chair-02">Кресло №2 (Planmeca Compact)</option>
						<option value="chair-03">Кресло №3 (Sirona Intego)</option>
					</select>
				</div>

				<button
					type="button"
					onClick={onStartRentalSession}
					data-testid="btn-start-chair-rental"
					style={{ minHeight: "44px", height: "44px", padding: "0 16px", borderRadius: "10px", background: "var(--teal, #0d9488)", color: "#ffffff", border: "none", fontSize: "13px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap" }}
				>
					<Play size={15} />
					<span>Арендовать кресло и начать приём</span>
				</button>
			</>
		) : (
			<>
				<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "220px" }}>
					<span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--ok-fg, #15803d)", flexShrink: 0 }} aria-hidden="true" />
					<div>
						<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ok-fg, #15803d)" }}>
							Кресло арендовано · Приём открыт
						</div>
						<div style={{ fontSize: "11.5px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
							<span>{selectedChairId === "chair-02" ? "Кресло №2 (Planmeca)" : selectedChairId === "chair-03" ? "Кресло №3 (Sirona)" : "Кресло №1 (Anthos)"}</span>
							<span>•</span>
							<span style={{ fontFamily: "monospace", fontWeight: 600 }}>
								Время: {String(Math.floor(sessionElapsedMinutes / 60)).padStart(2, "0")}:{String(sessionElapsedMinutes % 60).padStart(2, "0")}
							</span>
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={onStopRentalSession}
					data-testid="btn-stop-chair-rental"
					style={{ minHeight: "44px", height: "44px", padding: "0 14px", borderRadius: "10px", background: "var(--paper)", color: "var(--warn-fg, #c2410c)", border: "1px solid color-mix(in srgb, var(--warn-fg, #c2410c) 30%, transparent)", fontSize: "12.5px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", whiteSpace: "nowrap" }}
				>
					<StopCircle size={15} />
					<span>Завершить аренду кресла</span>
				</button>
			</>
		)}
	</div>
);
