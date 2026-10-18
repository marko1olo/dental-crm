import React from "react";
import { Printer, X } from "lucide-react";
import { money } from "../../../AppHelpers";

export type CashOutMode = "full" | "keep_float" | "z_only";

export interface MobileShiftCashOutSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly cashOutMode: CashOutMode;
	readonly setCashOutMode: (val: CashOutMode) => void;
	readonly isSubmittingCashOut: boolean;
	readonly handleConfirmCashOutAndZReport: () => void;
}

const scenarioOptions: Array<{ mode: CashOutMode; title: string; desc: (cash: number) => string }> = [
	{ mode: "keep_float", title: "Оставить размен 3 000 ₽, остальное изъять", desc: (c) => `Инкассировать ${money(Math.max(0, c - 3000))} в сейф клиники` },
	{ mode: "full", title: "Полная инкассация (изъять 100% наличности)", desc: (c) => `Инкассировать всю сумму ${money(c)}` },
	{ mode: "z_only", title: "Только Z-отчет без изъятия наличных", desc: () => "Гашение смены на ККТ без формирования РКО" },
];

export const MobileShiftCashOutSheet: React.FC<MobileShiftCashOutSheetProps> = ({
	isOpen, onClose, cashInDrawerRub, cardSumRub, sbpSumRub, cashOutMode,
	setCashOutMode, isSubmittingCashOut, handleConfirmCashOutAndZReport,
}) => {
	if (!isOpen) return null;

	return (
		<div className="mobile-shift-sheet-overlay" role="dialog" aria-modal="true" data-testid="sheet-cash-out">
			<div className="mobile-shift-sheet-backdrop" onClick={onClose} aria-hidden="true" />
			<div className="mobile-shift-sheet-container">
				<div className="mobile-shift-sheet-handle" />
				<div className="mobile-shift-sheet-header">
					<h3 className="mobile-shift-sheet-title">Инкассация и Z-отчёт</h3>
					<button type="button" className="mobile-shift-sheet-close-btn" onClick={onClose} aria-label="Закрыть"><X size={16} /></button>
				</div>

				<div className="mobile-shift-sheet-body">
					<div style={{ padding: "12px 14px", borderRadius: "12px", background: "var(--paper-soft)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>Наличных в ящике сейчас:</span>
						<strong style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>{money(cashInDrawerRub)}</strong>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>Сценарий закрытия смены:</span>
						{scenarioOptions.map((opt) => (
							<label
								key={opt.mode}
								style={{
									display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px",
									background: cashOutMode === opt.mode ? "var(--teal-surface)" : "var(--paper)",
									border: `1px solid ${cashOutMode === opt.mode ? "var(--teal-dark)" : "var(--line)"}`, cursor: "pointer",
								}}
							>
								<input type="radio" name="cashOutMode" checked={cashOutMode === opt.mode} onChange={() => setCashOutMode(opt.mode)} />
								<div style={{ minWidth: 0 }}>
									<strong style={{ display: "block", fontSize: "13.5px", color: "var(--ink)" }}>{opt.title}</strong>
									<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>{opt.desc(cashInDrawerRub)}</span>
								</div>
							</label>
						))}
					</div>

					<div style={{ fontSize: "12px", color: "var(--muted)", padding: "8px 10px", borderRadius: "8px", background: "var(--paper-soft)", border: "1px solid var(--line-subtle)" }}>
						Сверка эквайринга: Терминал {money(cardSumRub)} · СБП {money(sbpSumRub)}. Суммы сверены и готовы к закрытию.
					</div>
				</div>

				<div className="mobile-shift-sheet-footer">
					<button type="button" className="mobile-shift-btn-primary-cta" onClick={handleConfirmCashOutAndZReport} disabled={isSubmittingCashOut} data-testid="btn-confirm-cash-out-z">
						<Printer size={18} /><span>Снять Z-отчет & закрыть смену</span>
					</button>
				</div>
			</div>
		</div>
	);
};
