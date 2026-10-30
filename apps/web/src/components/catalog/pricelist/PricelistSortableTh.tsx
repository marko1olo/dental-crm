import { ArrowUpDown } from "lucide-react";
import React from "react";
import type { PricelistSortField } from "./servicePricelistEngine";

export interface PricelistSortableThProps {
	readonly width?: string;
	readonly align?: "left" | "center" | "right";
	readonly field: PricelistSortField;
	readonly currentField: PricelistSortField;
	readonly label: string;
	readonly onSort: (field: PricelistSortField) => void;
}

export const PricelistSortableTh: React.FC<PricelistSortableThProps> = ({
	width,
	align = "left",
	field,
	currentField,
	label,
	onSort,
}) => {
	const justify =
		align === "right"
			? "flex-end"
			: align === "center"
				? "center"
				: "flex-start";
	return (
		<th
			style={{ width, textAlign: align, cursor: "pointer" }}
			onClick={() => onSort(field)}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: justify,
					gap: "4px",
				}}
			>
				<span>{label}</span>
				<ArrowUpDown
					size={12}
					style={{ opacity: currentField === field ? 1 : 0.35 }}
				/>
			</div>
		</th>
	);
};
