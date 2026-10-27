import type React from "react";
import { type AcceptanceWaybillItem } from "../acceptanceWaybillsEngine.js";
import { AcceptanceWaybillTableRow } from "./AcceptanceWaybillTableRow.js";
import { AcceptanceWaybillsMobileCards } from "./AcceptanceWaybillsMobileCards.js";

export interface AcceptanceWaybillsItemsTableProps {
	readonly items: readonly AcceptanceWaybillItem[];
	readonly receiptDate: string;
	readonly overdraftItemIds: Map<string, number>;
	readonly onUpdateItem: (index: number, patch: Partial<AcceptanceWaybillItem>) => void;
	readonly onRemoveItem: (index: number) => void;
}

export const AcceptanceWaybillsItemsTable: React.FC<AcceptanceWaybillsItemsTableProps> = ({
	items,
	receiptDate,
	overdraftItemIds,
	onUpdateItem,
	onRemoveItem,
}) => {
	return (
		<main className="acceptance-table-container">
			<div className="acceptance-desktop-table-wrap">
				<table className="acceptance-table">
					<thead>
						<tr>
							<th style={{ width: "32px", textAlign: "center" }}>№</th>
							<th style={{ width: "28%" }}>Наименование материала</th>
							<th style={{ width: "13%" }}>Серия / Партия</th>
							<th style={{ width: "14%" }}>Срок годности (FEFO)</th>
							<th style={{ width: "7%", textAlign: "center" }}>Ед.</th>
							<th style={{ width: "7%", textAlign: "right" }}>Кол-во</th>
							<th style={{ width: "10%", textAlign: "right" }}>Закупка, ₽</th>
							<th style={{ width: "8%", textAlign: "center" }}>НДС</th>
							<th style={{ width: "10%", textAlign: "right" }}>Сумма, ₽</th>
							<th style={{ width: "36px", textAlign: "center" }}></th>
						</tr>
					</thead>
					<tbody>
						{items.map((item, idx) => (
							<AcceptanceWaybillTableRow
								key={item.id}
								item={item}
								idx={idx}
								receiptDate={receiptDate}
								overdraftItemIds={overdraftItemIds}
								onUpdateItem={onUpdateItem}
								onRemoveItem={onRemoveItem}
							/>
						))}
						{items.length === 0 && (
							<tr>
								<td colSpan={10} style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)" }}>
									Позиции отсутствуют. Нажмите кнопку <strong>«Образец (Стомторг)»</strong> или добавьте материалы кнопками быстрого выбора.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="acceptance-mobile-cards-wrap">
				<AcceptanceWaybillsMobileCards
					items={items}
					receiptDate={receiptDate}
					overdraftItemIds={overdraftItemIds}
					onUpdateItem={onUpdateItem}
					onRemoveItem={onRemoveItem}
				/>
			</div>
		</main>
	);
};

export default AcceptanceWaybillsItemsTable;
