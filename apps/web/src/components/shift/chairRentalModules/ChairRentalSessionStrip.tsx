import React from "react";
import { Stethoscope } from "lucide-react";

export interface ChairRentalSessionStripProps {
	readonly isRentalActive?: boolean;
	readonly selectedChairId?: string;
	readonly onSelectChairId?: (id: string) => void;
	readonly sessionElapsedMinutes?: number;
	readonly onStartRentalSession?: () => void;
	readonly onStopRentalSession?: () => void;
	readonly widgetId?: string;
}

export const ChairRentalSessionStrip: React.FC<ChairRentalSessionStripProps> = ({
	selectedChairId = "chair-01",
	onSelectChairId,
	widgetId = "strip",
}) => (
	<div
		className="chair-rental-session-strip"
		style={{
			margin: "12px 0 6px 0",
			padding: "10px 14px",
			borderRadius: "14px",
			background: "var(--paper-soft)",
			border: "1px solid var(--line)",
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			flexWrap: "wrap",
			gap: "10px",
		}}
		data-testid="autonomous-chair-rental-strip"
	>
		<div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
			<Stethoscope size={16} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
			<label htmlFor={`chair-select-${widgetId}`} style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>
				Рабочее место:
			</label>
			{onSelectChairId ? (
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
			) : (
				<span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--ink)" }}>
					{selectedChairId === "chair-02" ? "Кресло №2 (Planmeca)" : selectedChairId === "chair-03" ? "Кресло №3 (Sirona)" : "Кресло №1 (Anthos)"}
				</span>
			)}
		</div>
	</div>
);
