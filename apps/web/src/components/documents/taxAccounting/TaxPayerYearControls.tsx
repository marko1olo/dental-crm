import React from "react";
import type { Patient } from "@dental/shared";
import { money } from "../../../AppHelpers";
import type { TaxDocumentPayerOption } from "./types";

export interface TaxPayerYearControlsProps {
	taxYear: number;
	setTaxYear: (year: number) => void;
	payerOptions: TaxDocumentPayerOption[];
	selectedPayerKey: string;
	onSelectPayerKey: (payerKey: string) => void;
	patient: Patient | null;
}

export const TaxPayerYearControls: React.FC<TaxPayerYearControlsProps> = ({
	taxYear,
	setTaxYear,
	payerOptions,
	selectedPayerKey,
	onSelectPayerKey,
	patient,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				gap: "12px",
				padding: "12px 16px",
				background: "var(--surface-100, #f8fafc)",
				borderRadius: "8px",
				border: "1px solid var(--line, #e2e8f0)",
			}}
		>
			<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
				Налоговый год
				<select
					value={taxYear}
					onChange={(e) => setTaxYear(Number(e.target.value))}
					style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line, #cbd5e1)" }}
				>
					<option value={2026}>2026 (вычет 13% НДФЛ)</option>
					<option value={2025}>2025 (вычет 13% НДФЛ)</option>
					<option value={2024}>2024 (вычет 13% НДФЛ)</option>
					<option value={2023}>2023 (архивная справка)</option>
					<option value={2022}>2022 (архивная справка)</option>
					<option value={2021}>2021 (архивная справка)</option>
				</select>
			</label>

			{(payerOptions ?? []).length > 0 ? (
				<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600 }}>
					Плательщик (ИНН / Пациент)
					<select
						value={selectedPayerKey}
						onChange={(e) => onSelectPayerKey(e.target.value)}
						style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line, #cbd5e1)" }}
					>
						{payerOptions.map((opt) => (
							<option key={opt.key} value={opt.key}>
								{opt.label} · {money(opt.amountRub)} ({opt.paymentCount} чеков)
							</option>
						))}
					</select>
				</label>
			) : (
				<div style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "var(--muted, #64748b)" }}>
					Пациент: {patient?.fullName || "Не выбран"}
				</div>
			)}
		</div>
	);
};
