import React from "react";
import { Check, X } from "lucide-react";
import { money } from "../../../AppHelpers";

export interface MobileShiftCashInSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly cashInAmount: number;
	readonly setCashInAmount: (val: number) => void;
	readonly cashInReason: string;
	readonly setCashInReason: (val: string) => void;
	readonly isSubmittingCashIn: boolean;
	readonly handleConfirmCashIn: () => void;
}

export const MobileShiftCashInSheet: React.FC<MobileShiftCashInSheetProps> = ({
	isOpen,
	onClose,
	cashInAmount,
	setCashInAmount,
	cashInReason,
	setCashInReason,
	isSubmittingCashIn,
	handleConfirmCashIn,
}) => {
	if (!isOpen) return null;

	return (
		<div className="mobile-shift-sheet-overlay" role="dialog" aria-modal="true" data-testid="sheet-cash-in">
			<div className="mobile-shift-sheet-backdrop" onClick={onClose} aria-hidden="true" />
			<div className="mobile-shift-sheet-container">
				<div className="mobile-shift-sheet-handle" />
				<div className="mobile-shift-sheet-header">
					<h3 className="mobile-shift-sheet-title">Внесение наличных (Размен)</h3>
					<button type="button" className="mobile-shift-sheet-close-btn" onClick={onClose} aria-label="Закрыть">
						<X size={16} />
					</button>
				</div>

				<div className="mobile-shift-sheet-body">
					<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
						Внесение разменного фонда в денежный ящик кассы перед началом приема.
					</p>

					<div>
						<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "8px" }}>
							Быстрый выбор суммы:
						</span>
						<div className="mobile-shift-chip-row">
							{[1000, 3000, 5000, 10000].map((amt) => (
								<button
									key={amt}
									type="button"
									className={`mobile-shift-chip ${cashInAmount === amt ? "active" : ""}`}
									onClick={() => setCashInAmount(amt)}
								>
									{money(amt)}
								</button>
							))}
						</div>
					</div>

					<div>
						<label htmlFor="custom-cash-in-input" style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
							Сумма внесения в рублях:
						</label>
						<input
							id="custom-cash-in-input"
							type="number"
							min="0"
							step="100"
							value={cashInAmount}
							onChange={(e) => setCashInAmount(Number(e.target.value) || 0)}
							className="w-full h-12 px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-lg font-bold text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500"
						/>
					</div>

					<div>
						<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
							Основание внесения:
						</span>
						<select
							value={cashInReason}
							onChange={(e) => setCashInReason(e.target.value)}
							className="w-full h-11 px-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm text-[var(--ink)] focus:outline-none"
						>
							<option value="Разменная монета на начало смены">Разменная монета на начало смены</option>
							<option value="Пополнение кассового ящика">Пополнение кассового ящика</option>
							<option value="Возврат подотчетных сумм">Возврат подотчетных сумм</option>
						</select>
					</div>
				</div>

				<div className="mobile-shift-sheet-footer">
					<button
						type="button"
						className="mobile-shift-btn-primary-cta"
						onClick={handleConfirmCashIn}
						disabled={isSubmittingCashIn}
						data-testid="btn-confirm-cash-in"
					>
						<Check size={18} />
						<span>Внести {money(cashInAmount)} в кассу</span>
					</button>
				</div>
			</div>
		</div>
	);
};
