import type React from "react";
import { Scan } from "lucide-react";
import type { ChestnyZnakScannedItem } from "@dental/shared";
import { MdlpScannedTableRow } from "./MdlpScannedTableRow.js";
import { MdlpScannedMobileCards } from "./MdlpScannedMobileCards.js";

export interface MdlpScannedItemsTableProps {
	readonly scannedItems: readonly ChestnyZnakScannedItem[];
	readonly onRemoveItem: (id: string) => void;
}

export const MdlpScannedItemsTable: React.FC<MdlpScannedItemsTableProps> = ({
	scannedItems,
	onRemoveItem,
}) => {
	if (scannedItems.length === 0) {
		return (
			<div className="mdlp-table-container">
				<div className="mdlp-empty-table" data-testid="mdlp-empty-state">
					<Scan className="w-8 h-8 text-[var(--muted)] opacity-50" />
					<p className="font-semibold text-sm text-[var(--ink)]">
						Нет отсканированных упаковок
					</p>
					<p className="text-xs text-[var(--muted)]">
						Поднесите 2D-сканер к коду DataMatrix на упаковке
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mdlp-table-container">
			<div className="hidden sm:block overflow-x-auto">
				<table className="mdlp-table" data-testid="mdlp-scanned-table">
					<thead>
						<tr>
							<th>№</th>
							<th>Препарат / Номенклатура</th>
							<th>GTIN / SGTIN</th>
							<th>Серия</th>
							<th>Срок годности</th>
							<th>Статус маркировки</th>
							<th>Сумма</th>
							<th style={{ textAlign: "center" }}>Действия</th>
						</tr>
					</thead>
					<tbody>
						{scannedItems.map((item, index) => (
							<MdlpScannedTableRow
								key={item.id}
								item={item}
								displayIndex={scannedItems.length - index}
								onRemoveItem={onRemoveItem}
							/>
						))}
					</tbody>
				</table>
			</div>

			<div className="sm:hidden p-2">
				<MdlpScannedMobileCards
					scannedItems={scannedItems}
					onRemoveItem={onRemoveItem}
				/>
			</div>
		</div>
	);
};
