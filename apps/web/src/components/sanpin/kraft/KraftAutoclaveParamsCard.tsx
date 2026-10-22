import React from "react";
import { CLINIC_AUTOCLAVE_UNITS } from "./kraftPackagePresets.js";

export interface KraftAutoclaveParamsCardProps {
	readonly selectedAutoclaveId: string;
	readonly onAutoclaveChange: (id: string) => void;
	readonly cycleNumber: number;
	readonly onCycleNumberChange: (cycle: number) => void;
	readonly packQuantity: number;
	readonly onPackQuantityChange: (qty: number) => void;
}

export const KraftAutoclaveParamsCard: React.FC<KraftAutoclaveParamsCardProps> = ({
	selectedAutoclaveId,
	onAutoclaveChange,
	cycleNumber,
	onCycleNumberChange,
	packQuantity,
	onPackQuantityChange,
}) => {
	return (
		<div className="kraft-panel-card">
			<div className="kraft-panel-title">
				<span>3. Параметры стерилизатора и объем партии</span>
			</div>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
						Аппарат автоклава:
					</label>
					<select
						value={selectedAutoclaveId}
						onChange={(e) => onAutoclaveChange(e.target.value)}
						style={{
							width: "100%",
							minHeight: "44px",
							padding: "0.5rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper, #fff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.85rem",
						}}
					>
						{CLINIC_AUTOCLAVE_UNITS.map((u) => (
							<option key={u.id} value={u.id}>
								{u.id} — {u.brandModelRu} ({u.chamberVolumeLiters} л)
							</option>
						))}
					</select>
				</div>

				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
						Номер цикла автоклава:
					</label>
					<input
						type="number"
						min={1}
						max={99}
						value={cycleNumber}
						onChange={(e) => onCycleNumberChange(Math.max(1, Number.parseInt(e.target.value) || 1))}
						style={{
							width: "100%",
							minHeight: "44px",
							padding: "0.5rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper, #fff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.95rem",
							fontWeight: 700,
						}}
					/>
				</div>
			</div>

			<div style={{ marginTop: "0.5rem" }}>
				<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
					Количество упаковываемых пакетов (шт.):
				</label>
				<div className="kraft-stepper-container">
					{[1, 5, 10, 25, 50].map((q) => (
						<button
							key={q}
							type="button"
							onClick={() => onPackQuantityChange(q)}
							className={`kraft-pill-btn ${packQuantity === q ? "active" : ""}`}
						>
							{q} шт.
						</button>
					))}
					<input
						type="number"
						min={1}
						max={100}
						value={packQuantity}
						onChange={(e) => onPackQuantityChange(Math.max(1, Math.min(100, Number.parseInt(e.target.value) || 1)))}
						className="kraft-number-input"
					/>
				</div>
			</div>
		</div>
	);
};
