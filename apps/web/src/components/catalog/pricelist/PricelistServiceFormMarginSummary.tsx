import type React from "react";

export interface PricelistServiceFormMarginSummaryProps {
	readonly net: number;
	readonly marginPct: number;
	readonly costTotal: number;
}

export const PricelistServiceFormMarginSummary: React.FC<
	PricelistServiceFormMarginSummaryProps
> = ({ net, marginPct, costTotal }) => {
	return (
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
				Себестоимость: <b>{costTotal} ₽</b>
			</span>
		</div>
	);
};
