import React from "react";
import { Printer, Receipt, ShieldCheck } from "lucide-react";

export interface DoctorShiftCashHeaderProps {
	readonly onPrintStatement: () => void;
}

export const DoctorShiftCashHeader: React.FC<DoctorShiftCashHeaderProps> = ({
	onPrintStatement,
}) => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "10px",
			flexWrap: "wrap",
		}}
	>
		<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
			<div
				style={{
					width: "34px",
					height: "34px",
					borderRadius: "8px",
					background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
					color: "var(--teal-dark, #0f766e)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<Receipt size={17} aria-hidden="true" />
			</div>
			<div style={{ minWidth: 0 }}>
				<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
					Касса смены и инкассация
				</h3>
				<p style={{ margin: "1px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.35 }}>
					Сверка выручки по способам оплаты, выемка наличности в сейф и отчёт за смену
				</p>
			</div>
		</div>

		<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
			<span
				className="status-pill status-in_treatment"
				style={{
					fontSize: "11px",
					fontWeight: 700,
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
				}}
			>
				<ShieldCheck size={12} aria-hidden="true" />
				Касса онлайн
			</span>
			<button
				type="button"
				onClick={onPrintStatement}
				className="secondary-button"
				style={{
					fontSize: "13px",
					fontWeight: 600,
					padding: "0 14px",
					height: "36px",
					borderRadius: "8px",
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					color: "var(--ink)",
					cursor: "pointer",
				}}
				title="Распечатать сменную ведомость инкассации"
				data-testid="btn-print-cash-statement"
			>
				<Printer size={14} aria-hidden="true" />
				Ведомость смены
			</button>
		</div>
	</div>
);
