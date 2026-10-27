import { Trash2 } from "lucide-react";
import type React from "react";
import { type AcceptanceWaybillItem, formatRubCurrency } from "../acceptanceWaybillsEngine.js";

export interface AcceptanceWaybillsMobileCardsProps {
	readonly items: readonly AcceptanceWaybillItem[];
	readonly receiptDate: string;
	readonly overdraftItemIds: Map<string, number>;
	readonly onUpdateItem: (index: number, patch: Partial<AcceptanceWaybillItem>) => void;
	readonly onRemoveItem: (index: number) => void;
}

export const AcceptanceWaybillsMobileCards: React.FC<AcceptanceWaybillsMobileCardsProps> = ({
	items,
	overdraftItemIds,
	onUpdateItem,
	onRemoveItem,
}) => {
	if (items.length === 0) {
		return (
			<div className="acceptance-mobile-empty">
				Позиции отсутствуют. Добавьте материалы кнопками пресетов.
			</div>
		);
	}

	return (
		<div className="acceptance-mobile-cards-list">
			{items.map((item, idx) => {
				const lineTotal = item.lineTotalKopecks ?? Math.round(item.quantity * item.unitPriceKopecks);
				const deficit = item.inventoryItemId ? overdraftItemIds.get(item.inventoryItemId) : undefined;

				return (
					<div key={item.id} className="acceptance-mobile-card" data-testid={`acceptance-card-${idx}`}>
						<div className="acceptance-card-header">
							<span className="acceptance-card-num">#{idx + 1}</span>
							<strong className="acceptance-card-title">{item.name}</strong>
							<button
								type="button"
								className="acceptance-card-remove"
								onClick={() => onRemoveItem(idx)}
								title="Удалить позицию"
								aria-label="Удалить позицию"
							>
								<Trash2 size={16} />
							</button>
						</div>

						{deficit !== undefined && deficit < 0 && (
							<div className="acceptance-card-overdraft-badge">
								<span>⚠️ Дефицит у кресла: {deficit} шт. (погашается накладной)</span>
							</div>
						)}

						<div className="acceptance-card-grid">
							<div className="acceptance-card-field">
								<label>Партия (LOT)</label>
								<input
									type="text"
									className="acceptance-input"
									value={item.batchNumber}
									onChange={(e) => onUpdateItem(idx, { batchNumber: e.target.value })}
									placeholder="LOT-..."
								/>
							</div>

							<div className="acceptance-card-field">
								<label>Годен до (FEFO)</label>
								<input
									type="date"
									className="acceptance-input"
									value={item.expirationDate}
									onChange={(e) => onUpdateItem(idx, { expirationDate: e.target.value })}
								/>
							</div>

							<div className="acceptance-card-field">
								<label>Кол-во ({item.unit})</label>
								<input
									type="number"
									min="0.001"
									step="any"
									className="acceptance-input"
									value={item.quantity}
									onChange={(e) => onUpdateItem(idx, { quantity: Math.max(0, Number(e.target.value)) })}
								/>
							</div>

							<div className="acceptance-card-field">
								<label>Цена за ед. (₽)</label>
								<input
									type="number"
									min="0"
									step="1"
									className="acceptance-input"
									value={Math.round(item.unitPriceKopecks / 100)}
									onChange={(e) => onUpdateItem(idx, { unitPriceKopecks: Math.round(Number(e.target.value) * 100) })}
								/>
							</div>
						</div>

						<div className="acceptance-card-footer">
							<span className="text-[var(--muted)] text-xs">Итого по позиции:</span>
							<strong className="acceptance-card-sum">{formatRubCurrency(lineTotal)}</strong>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default AcceptanceWaybillsMobileCards;