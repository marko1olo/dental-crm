import React from "react";
import { Plus, Banknote, CheckCircle2, Unlock } from "lucide-react";

export interface MobileShiftBottomBarProps {
	readonly isShiftOpen: boolean;
	readonly onToggleShift: () => void;
	readonly onOpenCashInSheet: () => void;
	readonly onOpenCashOutSheet: () => void;
	readonly onOpenHandoverSheet: () => void;
}

export const MobileShiftBottomBar: React.FC<MobileShiftBottomBarProps> = ({
	isShiftOpen,
	onToggleShift,
	onOpenCashInSheet,
	onOpenCashOutSheet,
	onOpenHandoverSheet,
}) => (
	<footer className="mobile-shift-bottom-bar" data-testid="mobile-shift-bottom-bar">
		<div className="mobile-shift-quick-actions-row">
			<button
				type="button"
				className="mobile-shift-btn-secondary cash-in"
				onClick={onOpenCashInSheet}
				data-testid="btn-mobile-cash-in"
			>
				<Plus size={15} />
				<span>Внесение размена</span>
			</button>

			<button
				type="button"
				className="mobile-shift-btn-secondary cash-out"
				onClick={onOpenCashOutSheet}
				data-testid="btn-mobile-cash-out"
			>
				<Banknote size={15} />
				<span>Инкассация & Z-отчёт</span>
			</button>
		</div>

		<button
			type="button"
			className="mobile-shift-btn-primary-cta"
			onClick={() => {
				if (isShiftOpen) {
					onOpenHandoverSheet();
				} else {
					onToggleShift();
				}
			}}
			data-testid="btn-mobile-primary-shift-toggle"
		>
			{isShiftOpen ? (
				<>
					<CheckCircle2 size={19} />
					<span>Сдать смену и кассу</span>
				</>
			) : (
				<>
					<Unlock size={19} />
					<span>Открыть рабочую смену врача</span>
				</>
			)}
		</button>
	</footer>
);
