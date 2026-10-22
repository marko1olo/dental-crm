/**
 * FnsTaxpayerPatientSection.tsx — Taxpayer and patient information with relationship codes
 */

import React from "react";

export interface FnsTaxpayerPatientSectionProps {
	readonly taxpayerName: string;
	readonly onTaxpayerNameChange: (val: string) => void;
	readonly taxpayerInn: string;
	readonly onTaxpayerInnChange: (val: string) => void;
	readonly taxpayerSnils: string;
	readonly onTaxpayerSnilsChange: (val: string) => void;
	readonly taxPatientName: string;
	readonly onTaxPatientNameChange: (val: string) => void;
	readonly taxRelCode: "1" | "2" | "3" | "4";
	readonly onTaxRelCodeChange: (val: "1" | "2" | "3" | "4") => void;
	readonly taxPatientSnils: string;
	readonly onTaxPatientSnilsChange: (val: string) => void;
}

const boxStyle: React.CSSProperties = {
	border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)",
};
const inputStyle: React.CSSProperties = {
	width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)",
};
const labelStyle: React.CSSProperties = { fontSize: "0.75rem", color: "var(--muted)" };

export const FnsTaxpayerPatientSection: React.FC<FnsTaxpayerPatientSectionProps> = ({
	taxpayerName,
	onTaxpayerNameChange,
	taxpayerInn,
	onTaxpayerInnChange,
	taxpayerSnils,
	onTaxpayerSnilsChange,
	taxPatientName,
	onTaxPatientNameChange,
	taxRelCode,
	onTaxRelCodeChange,
	taxPatientSnils,
	onTaxPatientSnilsChange,
}) => {
	return (
		<div className="egisz-fns-parties-grid">
			<div style={boxStyle}>
				<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem" }}>
					1. Налогоплательщик (Получатель вычета)
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
					<div>
						<label style={labelStyle}>ФИО налогоплательщика</label>
						<input type="text" value={taxpayerName} onChange={(e) => onTaxpayerNameChange(e.target.value)} style={inputStyle} />
					</div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
						<div>
							<label style={labelStyle}>ИНН</label>
							<input type="text" value={taxpayerInn} onChange={(e) => onTaxpayerInnChange(e.target.value)} style={inputStyle} />
						</div>
						<div>
							<label style={labelStyle}>СНИЛС</label>
							<input type="text" value={taxpayerSnils} onChange={(e) => onTaxpayerSnilsChange(e.target.value)} style={inputStyle} />
						</div>
					</div>
				</div>
			</div>

			<div style={boxStyle}>
				<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem" }}>
					2. Пациент и степень родства
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
					<div>
						<label style={labelStyle}>ФИО пациента</label>
						<input type="text" value={taxPatientName} onChange={(e) => onTaxPatientNameChange(e.target.value)} style={inputStyle} />
					</div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
						<div>
							<label style={labelStyle}>Степень родства</label>
							<select value={taxRelCode} onChange={(e) => onTaxRelCodeChange(e.target.value as "1" | "2" | "3" | "4")} style={inputStyle}>
								<option value="1">1 — Сам налогоплательщик</option>
								<option value="2">2 — Супруг (супруга)</option>
								<option value="3">3 — Родитель</option>
								<option value="4">4 — Ребенок / Подопечный</option>
							</select>
						</div>
						<div>
							<label style={labelStyle}>СНИЛС пациента</label>
							<input type="text" value={taxPatientSnils} onChange={(e) => onTaxPatientSnilsChange(e.target.value)} style={inputStyle} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
