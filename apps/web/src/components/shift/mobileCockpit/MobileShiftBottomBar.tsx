import React from "react";
import { Banknote, Package, CheckCircle2, Unlock } from "lucide-react";

export interface MobileShiftBottomBarProps {
	readonly isShiftOpen: boolean;
	readonly onToggleShift: () => void;
	readonly onOpenCashOpsSheet?: (() => void) | undefined;
	readonly onOpenCashInSheet?: (() => void) | undefined;
	readonly onOpenCashOutSheet?: (() => void) | undefined;
	readonly onOpenConsumablesSheet?: (() => void) | undefined;
	readonly userRole?: string | undefined;
}

export const MobileShiftBottomBar: React.FC<MobileShiftBottomBarProps> = ({
	isShiftOpen,
	onToggleShift,
	onOpenCashOpsSheet,
	onOpenCashInSheet,
	onOpenCashOutSheet,
	onOpenConsumablesSheet,
	userRole,
}) => {
	const isDoctor = userRole === "doctor";

	const handleCashOpsClick = () => {
		if (onOpenCashOpsSheet) {
			onOpenCashOpsSheet();
		} else if (onOpenCashInSheet) {
			onOpenCashInSheet();
		}
	};

	return (
		<footer className="mobile-shift-bottom-bar" data-testid="mobile-shift-bottom-bar">
			<div className="mobile-shift-quick-actions-row">
				{!isDoctor && (
					<button
						type="button"
						className="mobile-shift-btn-secondary cash-ops"
						onClick={handleCashOpsClick}
						data-testid="btn-mobile-cash-ops"
					>
						<Banknote size={15} />
						<span>Касса</span>
					</button>
				)}

				<button
					type="button"
					className="mobile-shift-btn-secondary consumables"
					onClick={onOpenConsumablesSheet}
					data-testid="btn-mobile-consumables"
				>
					<Package size={15} />
					<span>Расходники</span>
				</button>
			</div>

			<button
				type="button"
				className="mobile-shift-btn-primary-cta"
				onClick={onToggleShift}
				data-testid="btn-mobile-primary-shift-toggle"
			>
				{isShiftOpen ? (
					<>
						<CheckCircle2 size={19} />
						<span>Закрыть смену</span>
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
};
