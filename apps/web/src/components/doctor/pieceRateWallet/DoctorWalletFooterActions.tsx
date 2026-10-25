/**
 * DoctorWalletFooterActions.tsx — Нижняя панель действий сдельной оплаты врача.
 * Mandate 8x: полное исключение канцелярита Т-51.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { ArrowLeft, FileSpreadsheet, Printer } from "lucide-react";

export interface DoctorWalletFooterActionsProps {
	readonly onReconcile: () => void;
	readonly onPrintSlip: () => void;
	readonly onClose?: (() => void) | undefined;
}

export const DoctorWalletFooterActions: React.FC<DoctorWalletFooterActionsProps> = ({
	onReconcile,
	onPrintSlip,
	onClose,
}) => {
	return (
		<div className="dpr-footer-actions">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onReconcile}
					className="dpr-action-btn-primary whitespace-nowrap"
					data-testid="dpr-reconcile-btn"
				>
					<FileSpreadsheet size={15} />
					<span className="hidden md:inline">Сверить с бухгалтерией</span>
					<span className="md:hidden">Сверить</span>
				</button>

				<button
					type="button"
					onClick={onPrintSlip}
					className="dpr-action-btn-secondary whitespace-nowrap"
					data-testid="dpr-print-slip-btn"
					title="Распечатать ведомость сдельного расчёта и начислений"
				>
					<Printer size={15} />
					<span className="hidden md:inline">
						Сдельный расчёт и зарплата
					</span>
					<span className="md:hidden">Ведомость зарплаты</span>
				</button>
			</div>

			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="dpr-action-btn-secondary whitespace-nowrap"
					data-testid="dpr-back-to-shift-btn"
				>
					<ArrowLeft size={15} />
					<span className="hidden md:inline">Вернуться к смене</span>
					<span className="md:hidden">К смене</span>
				</button>
			)}
		</div>
	);
};
