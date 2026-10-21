import type React from "react";
import { PricelistSortableTh } from "./PricelistSortableTh";
import type { PricelistSortField } from "./servicePricelistEngine";
import type { PriceTierKind } from "./servicePricelistPresets";

export interface PricelistDataTableHeaderProps {
	readonly allSelected: boolean;
	readonly sortField: PricelistSortField;
	readonly activeTier: PriceTierKind;
	readonly onToggleSelectAll: (checked: boolean) => void;
	readonly onToggleSort: (field: PricelistSortField) => void;
}

export const PricelistDataTableHeader: React.FC<
	PricelistDataTableHeaderProps
> = ({
	allSelected,
	sortField,
	activeTier,
	onToggleSelectAll,
	onToggleSort,
}) => {
	const tierLabel =
		activeTier === "standard" ? "Руб." : activeTier.toUpperCase();

	return (
		<thead>
			<tr>
				<th style={{ width: "44px", minWidth: "44px", textAlign: "center" }}>
					<input
						type="checkbox"
						checked={allSelected}
						aria-label="Выбрать все услуги"
						onChange={(e) => onToggleSelectAll(e.target.checked)}
						style={{ cursor: "pointer", width: "18px", height: "18px" }}
					/>
				</th>
				<PricelistSortableTh
					width="130px"
					field="code"
					currentField={sortField}
					label="Код услуги"
					onSort={onToggleSort}
				/>
				<PricelistSortableTh
					field="title"
					currentField={sortField}
					label="Наименование услуги"
					onSort={onToggleSort}
				/>
				<th style={{ width: "130px" }}>Специальность</th>
				<PricelistSortableTh
					width="140px"
					align="right"
					field="price"
					currentField={sortField}
					label={`Цена (${tierLabel})`}
					onSort={onToggleSort}
				/>
				<PricelistSortableTh
					width="90px"
					align="center"
					field="margin"
					currentField={sortField}
					label="Маржа %"
					onSort={onToggleSort}
				/>
				<PricelistSortableTh
					width="90px"
					align="center"
					field="duration"
					currentField={sortField}
					label="Время"
					onSort={onToggleSort}
				/>
				<th style={{ width: "100px", textAlign: "center" }}>Действия</th>
			</tr>
		</thead>
	);
};
