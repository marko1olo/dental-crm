import { HelpCircle } from "lucide-react";
import type React from "react";

export interface PricelistServiceFormIcdFieldsProps {
	readonly icd10: string;
	readonly onIcd10Change: (val: string) => void;
}

export const PricelistServiceFormIcdFields: React.FC<
	PricelistServiceFormIcdFieldsProps
> = ({ icd10, onIcd10Change }) => {
	return (
		<div className="pricelist-form-row" style={{ marginTop: "0.75rem" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.375rem",
					marginBottom: "0.25rem",
				}}
			>
				<label
					htmlFor="pricelist-service-icd10"
					className="pricelist-form-label"
					style={{ margin: 0 }}
				>
					Показания по МКБ-10 (через запятую)
				</label>
				<span
					title="Коды МКБ-10 используются для автоподбора услуг в протоколе приёма и ЭМК (например: K02.1, K04.0)"
					style={{ cursor: "pointer", color: "var(--muted)" }}
				>
					<HelpCircle size={12} />
				</span>
			</div>
			<input
				id="pricelist-service-icd10"
				type="text"
				className="pricelist-search-input"
				style={{ height: "36px", fontSize: "0.8125rem" }}
				placeholder="K02.0, K02.1, K04.0"
				value={icd10}
				onChange={(e) => onIcd10Change(e.target.value)}
			/>
		</div>
	);
};
