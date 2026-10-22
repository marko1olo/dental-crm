/**
 * FnsTaxMetaSection.tsx — Document number, tax year, and signer name
 */

import React from "react";

export interface FnsTaxMetaSectionProps {
	readonly taxDocNumber: string;
	readonly onTaxDocNumberChange: (val: string) => void;
	readonly taxYear: number;
	readonly onTaxYearChange: (val: number) => void;
	readonly taxSignerName: string;
	readonly onTaxSignerNameChange: (val: string) => void;
}

const inputStyle: React.CSSProperties = {
	width: "100%", padding: "0.5rem", marginTop: "0.35rem", borderRadius: "6px",
	border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontSize: "0.875rem",
};

const labelStyle: React.CSSProperties = {
	fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase",
};

export const FnsTaxMetaSection: React.FC<FnsTaxMetaSectionProps> = ({
	taxDocNumber,
	onTaxDocNumberChange,
	taxYear,
	onTaxYearChange,
	taxSignerName,
	onTaxSignerNameChange,
}) => {
	return (
		<div className="egisz-fns-meta-grid">
			<div>
				<label style={labelStyle}>Номер справки</label>
				<input
					type="text"
					value={taxDocNumber}
					onChange={(e) => onTaxDocNumberChange(e.target.value)}
					style={inputStyle}
				/>
			</div>

			<div>
				<label style={labelStyle}>Налоговый период (Год)</label>
				<input
					type="number"
					value={taxYear}
					onChange={(e) => onTaxYearChange(Number(e.target.value) || 2026)}
					style={inputStyle}
				/>
			</div>

			<div>
				<label style={labelStyle}>Подписант (Руководитель)</label>
				<input
					type="text"
					value={taxSignerName}
					onChange={(e) => onTaxSignerNameChange(e.target.value)}
					style={inputStyle}
				/>
			</div>
		</div>
	);
};
