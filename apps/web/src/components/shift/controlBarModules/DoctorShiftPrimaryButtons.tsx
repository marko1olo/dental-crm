import React from "react";
import { Calculator, Zap } from "lucide-react";

export interface DoctorShiftPrimaryButtonsProps {
	readonly isShiftOpen: boolean;
	readonly onToggleShift: () => void;
	readonly isChairRental: boolean;
	readonly onOpenPayrollModal: () => void;
}

export const DoctorShiftPrimaryButtons: React.FC<DoctorShiftPrimaryButtonsProps> = React.memo(({
	isShiftOpen,
	onToggleShift,
	isChairRental,
	onOpenPayrollModal,
}) => {
	return (
		<>
			<button
				type="button"
				onClick={onToggleShift}
				style={{
					height: "32px",
					borderRadius: "8px",
					padding: "0 14px",
					fontSize: "12px",
					fontWeight: 600,
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					cursor: "pointer",
					whiteSpace: "nowrap",
					transition: "all 0.15s ease",
					background: isShiftOpen ? "var(--paper-soft)" : "var(--teal)",
					border: isShiftOpen ? "1px solid var(--line)" : "1px solid transparent",
					color: isShiftOpen ? "var(--ink)" : "#ffffff",
					boxShadow: isShiftOpen ? "none" : "0 1px 2px rgba(13, 148, 136, 0.25)",
				}}
				title={isShiftOpen ? "Завершить рабочую смену врача" : "Открыть рабочую смену врача"}
				data-testid="shift-toggle-btn"
			>
				<Zap size={14} style={{ flexShrink: 0 }} />
				<span>{isShiftOpen ? "Завершить смену" : "Открыть смену"}</span>
			</button>

			{isChairRental ? (
				<button
					type="button"
					onClick={() => {
						const el = document.querySelector<HTMLElement>(
							'[data-testid="input-hourly-rate"], [data-testid="chair-rental-shift-widget"]',
						);
						el?.focus();
						el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
					}}
					style={{
						height: "32px",
						borderRadius: "8px",
						padding: "0 12px",
						fontSize: "12px",
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						cursor: "pointer",
						whiteSpace: "nowrap",
						transition: "all 0.15s ease",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						color: "var(--ink)",
					}}
					title="Перейти к настройке тарифа и условий субаренды кресла"
					data-testid="btn-shift-rental-terms"
				>
					<Calculator size={14} style={{ flexShrink: 0 }} />
					<span>Условия аренды</span>
				</button>
			) : (
				<button
					type="button"
					onClick={onOpenPayrollModal}
					style={{
						height: "32px",
						borderRadius: "8px",
						padding: "0 12px",
						fontSize: "12px",
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						cursor: "pointer",
						transition: "all 0.15s ease",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						color: "var(--ink)",
					}}
					title="Расчет зарплаты врачей (Зарплатная ведомость): детализированный расчет за смену"
					data-testid="btn-shift-open-payroll"
				>
					<Calculator size={14} />
					<span>Расчет зарплаты</span>
				</button>
			)}
		</>
	);
});

DoctorShiftPrimaryButtons.displayName = "DoctorShiftPrimaryButtons";
