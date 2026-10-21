import type React from "react";
import {
	DURATION_OPTIONS,
	type PricelistServiceFormPriceFieldsProps,
} from "./PricelistServiceFormPriceFieldsProps";

export type { PricelistServiceFormPriceFieldsProps };

export const PricelistServiceFormPriceFields: React.FC<
	PricelistServiceFormPriceFieldsProps
> = ({
	priceRub,
	materialCostRub,
	labCostRub,
	durationMin,
	onPriceChange,
	onMaterialCostChange,
	onLabCostChange,
	onDurationChange,
}) => {
	const priceVal = parseFloat(priceRub.replace(",", ".")) || 0;
	const matVal = parseFloat(materialCostRub.replace(",", ".")) || 0;
	const labVal = parseFloat(labCostRub.replace(",", ".")) || 0;
	const net = priceVal - matVal - labVal;
	const marginPct = priceVal > 0 ? Math.round((net / priceVal) * 100) : 0;

	return (
		<>
			<div
				className="pricelist-form-row"
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(4, 1fr)",
					gap: "0.75rem",
				}}
			>
				<div>
					<label htmlFor="price-field-base" className="pricelist-form-label">
						Базовая цена (₽) *
					</label>
					<input
						id="price-field-base"
						type="text"
						inputMode="numeric"
						className="pricelist-search-input"
						style={{ height: "36px", fontWeight: 700 }}
						placeholder="4500"
						required
						value={priceRub}
						onChange={(e) => onPriceChange(e.target.value)}
					/>
				</div>
				<div>
					<label
						htmlFor="price-field-material"
						className="pricelist-form-label"
					>
						Расходники (₽)
					</label>
					<input
						id="price-field-material"
						type="text"
						inputMode="numeric"
						className="pricelist-search-input"
						style={{ height: "36px" }}
						placeholder="500"
						value={materialCostRub}
						onChange={(e) => onMaterialCostChange(e.target.value)}
					/>
				</div>
				<div>
					<label htmlFor="price-field-lab" className="pricelist-form-label">
						Лаборатория (₽)
					</label>
					<input
						id="price-field-lab"
						type="text"
						inputMode="numeric"
						className="pricelist-search-input"
						style={{ height: "36px" }}
						placeholder="0"
						value={labCostRub}
						onChange={(e) => onLabCostChange(e.target.value)}
					/>
				</div>
				<div>
					<label
						htmlFor="price-field-duration"
						className="pricelist-form-label"
					>
						Длительность
					</label>
					<select
						id="price-field-duration"
						className="pricelist-search-input"
						style={{ height: "36px" }}
						value={durationMin}
						onChange={(e) => onDurationChange(parseInt(e.target.value, 10))}
					>
						{DURATION_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div
				style={{
					fontSize: "0.75rem",
					color: "var(--muted)",
					display: "flex",
					gap: "1rem",
					marginTop: "-0.25rem",
				}}
			>
				<span>
					Чистая маржа: <b>{net > 0 ? `${net} ₽` : "0 ₽"}</b> ({marginPct}%)
				</span>
				<span>
					Себестоимость: <b>{matVal + labVal} ₽</b>
				</span>
			</div>
		</>
	);
};
