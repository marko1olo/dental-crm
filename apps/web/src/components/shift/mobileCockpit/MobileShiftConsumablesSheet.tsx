import React from "react";
import { Package, Minus, Plus, X } from "lucide-react";
import type { MobileShiftConsumableItem } from "./types";

export interface MobileShiftConsumablesSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly consumables: readonly MobileShiftConsumableItem[];
	readonly handleAdjustConsumable: (id: string, delta: number) => void;
}

export const MobileShiftConsumablesSheet: React.FC<MobileShiftConsumablesSheetProps> = ({
	isOpen,
	onClose,
	consumables,
	handleAdjustConsumable,
}) => {
	if (!isOpen) return null;

	return (
		<div className="mobile-shift-sheet-overlay" role="dialog" aria-modal="true" data-testid="sheet-shift-consumables">
			<div className="mobile-shift-sheet-backdrop" onClick={onClose} aria-hidden="true" />
			<div className="mobile-shift-sheet-container">
				<div className="mobile-shift-sheet-handle" />
				<div className="mobile-shift-sheet-header">
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Package size={18} className="text-teal-600" />
						<h3 className="mobile-shift-sheet-title">Расходные материалы смены</h3>
					</div>
					<button type="button" className="mobile-shift-sheet-close-btn" onClick={onClose} aria-label="Закрыть">
						<X size={16} />
					</button>
				</div>

				<div className="mobile-shift-sheet-body">
					<p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.4 }}>
						Учёт списания расходников у кресла. Списание в ЕМИАС и СанПиН журнал происходит автоматически в фоне.
					</p>

					<div className="mobile-shift-consumables-card" data-testid="mobile-shift-consumables-list">
						{consumables.map((item) => (
							<div key={item.id} className="mobile-shift-consumable-item" data-testid={`consumable-item-${item.id}`}>
								<div className="mobile-shift-consumable-left">
									<div className="mobile-shift-consumable-icon">
										<Package size={16} />
									</div>
									<div className="mobile-shift-consumable-text">
										<span className="mobile-shift-consumable-name">{item.name}</span>
										<span className="mobile-shift-consumable-sub">
											{item.category} · остаток {item.stockRemaining} {item.unitName}
										</span>
									</div>
								</div>

								<div className="mobile-shift-stepper">
									<button
										type="button"
										className="mobile-shift-step-btn"
										onClick={() => handleAdjustConsumable(item.id, -1)}
										aria-label={`Уменьшить ${item.name}`}
										data-testid={`btn-dec-${item.id}`}
										style={{
											width: "32px",
											height: "32px",
											borderRadius: "8px",
											border: "none",
											background: "var(--paper)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
										}}
									>
										<Minus size={14} />
									</button>
									<span
										style={{
											minWidth: "28px",
											textAlign: "center",
											fontSize: "13px",
											fontWeight: 700,
											color: "var(--ink)",
										}}
										data-testid={`count-${item.id}`}
									>
										{item.deductedCount}
									</span>
									<button
										type="button"
										className="mobile-shift-step-btn"
										onClick={() => handleAdjustConsumable(item.id, 1)}
										aria-label={`Увеличить ${item.name}`}
										data-testid={`btn-inc-${item.id}`}
										style={{
											width: "32px",
											height: "32px",
											borderRadius: "8px",
											border: "none",
											background: "var(--paper)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
										}}
									>
										<Plus size={14} />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="mobile-shift-sheet-footer" style={{ padding: "12px 18px", borderTop: "1px solid var(--line-subtle)" }}>
					<button
						type="button"
						className="mobile-shift-btn-primary-cta"
						onClick={onClose}
						data-testid="btn-close-consumables-sheet"
					>
						<span>Готово</span>
					</button>
				</div>
			</div>
		</div>
	);
};
