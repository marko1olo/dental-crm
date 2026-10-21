import type { MdlpCarpuleQueueItem } from "@dental/shared";
import { ArrowUpDown, Layers, Trash2 } from "lucide-react";
import type React from "react";
import { MdlpDisposalQueueTableRow } from "./MdlpDisposalQueueTableRow.js";

export interface MdlpDisposalQueueTableProps {
	readonly items: readonly MdlpCarpuleQueueItem[];
	readonly onSortFefo: () => void;
	readonly onClearQueue: () => void;
	readonly onRemoveItem: (id: string) => void;
}

export const MdlpDisposalQueueTable: React.FC<MdlpDisposalQueueTableProps> = ({
	items,
	onSortFefo,
	onClearQueue,
	onRemoveItem,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<div className="font-bold text-sm flex items-center gap-2">
					<Layers size={18} className="text-teal-600" />
					<span>Очередь карпул на списание ({items.length})</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="mdlp-btn mdlp-btn-secondary min-h-[44px] text-xs px-2.5"
						style={{ minHeight: "44px" }}
						onClick={onSortFefo}
						title="Сортировать по сроку годности (FEFO)"
						data-testid="sort-fefo-btn"
					>
						<ArrowUpDown size={14} /> Сортировка FEFO
					</button>
					<button
						type="button"
						className="mdlp-btn mdlp-btn-ghost min-h-[44px] text-xs px-2 text-bad-fg hover:bg-red-50 dark:hover:bg-red-950/40"
						style={{ minHeight: "44px" }}
						onClick={onClearQueue}
						title="Очистить всю очередь"
						data-testid="clear-queue-btn"
					>
						<Trash2 size={14} /> Очистить
					</button>
				</div>
			</div>

			<div className="mdlp-table-wrap">
				<table className="mdlp-table">
					<thead>
						<tr>
							<th style={{ width: "30px" }}>№</th>
							<th>Препарат / МНН</th>
							<th>Серия (LOT)</th>
							<th>Срок годности</th>
							<th>SGTIN (Маркировка)</th>
							<th style={{ textAlign: "right" }}>Цена, ₽</th>
							<th>Пациент / Визит</th>
							<th style={{ width: "40px" }}></th>
						</tr>
					</thead>
					<tbody>
						{items.length === 0 ? (
							<tr>
								<td
									colSpan={8}
									style={{
										textAlign: "center",
										padding: "2rem",
										color: "var(--muted)",
									}}
								>
									Очередь списания пуста. Отсканируйте DataMatrix код карпулы 2D-сканером.
								</td>
							</tr>
						) : (
							items.map((it, idx) => (
								<MdlpDisposalQueueTableRow
									key={it.id}
									item={it}
									index={idx}
									onRemoveItem={onRemoveItem}
								/>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default MdlpDisposalQueueTable;
