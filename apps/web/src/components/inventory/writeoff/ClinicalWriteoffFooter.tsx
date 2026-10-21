import { AlertTriangle, MoreVertical, PackageCheck, Printer, RefreshCw } from "lucide-react";
import React, { useState } from "react";
import type { ClinicalWriteoffTotals } from "./clinicalWriteoffEngine.js";
import { ClinicalWriteoffExtraFormsMenu } from "./ClinicalWriteoffExtraFormsMenu.js";

export interface ClinicalWriteoffFooterProps {
	readonly totals: ClinicalWriteoffTotals;
	readonly isValid: boolean;
	readonly validationError?: string | undefined;
	readonly isDeducting: boolean;
	readonly onClose: () => void;
	readonly onConfirm: () => void;
	readonly onPrintAct: (formType: "0504230" | "M11" | "TORG16") => void;
	readonly onExportCsv: () => void;
}

export const ClinicalWriteoffFooter: React.FC<ClinicalWriteoffFooterProps> = ({
	totals,
	isValid,
	validationError,
	isDeducting,
	onClose,
	onConfirm,
	onPrintAct,
	onExportCsv,
}) => {
	const [showExtraForms, setShowExtraForms] = useState(false);

	return (
		<footer className="cw-modal-footer">
			<div className="flex items-center gap-2 relative">
				<button
					type="button"
					className="cw-btn cw-btn-secondary"
					onClick={() => onPrintAct("0504230")}
					title="Печать акта о списании материальных запасов (форма 0504230)"
				>
					<Printer size={16} /> Акт списания материалов
				</button>

				<div className="relative">
					<button
						type="button"
						className="cw-btn cw-btn-secondary p-2"
						onClick={() => setShowExtraForms((v) => !v)}
						title="Другие бланки и экспорт..."
						aria-label="Другие бланки и экспорт"
					>
						<MoreVertical size={16} />
					</button>

					{showExtraForms && (
						<ClinicalWriteoffExtraFormsMenu
							onPrintAct={(form) => {
								setShowExtraForms(false);
								onPrintAct(form);
							}}
							onExportCsv={() => {
								setShowExtraForms(false);
								onExportCsv();
							}}
						/>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button type="button" className="cw-btn cw-btn-secondary" onClick={onClose}>
					Отмена
				</button>

				<button
					type="button"
					className={`cw-btn ${
						!isValid
							? "cw-btn-secondary border-amber-500/50 text-amber-700 dark:text-amber-300"
							: totals.hasDeficit
								? "cw-btn-primary bg-amber-600 hover:bg-amber-500 border-amber-400/50 text-white"
								: "cw-btn-primary"
					}`}
					onClick={onConfirm}
					disabled={isDeducting}
					title={
						!isValid
							? `Внимание: ${validationError || "Требуется заполнить обязательные поля"}`
							: totals.hasDeficit
								? "Позиции будут списаны с отрицательным остатком до оприходования накладной (Мягкий овердрафт)"
								: "Списать материалы со склада в наряд визита"
					}
				>
					{isDeducting ? (
						<>
							<RefreshCw size={18} className="animate-spin" /> Списание со склада...
						</>
					) : totals.hasDeficit ? (
						<>
							<AlertTriangle size={18} /> Списать (с дефицитом: {totals.deficitItemsCount} поз.)
						</>
					) : (
						<>
							<PackageCheck size={18} /> Списать материалы в наряд
						</>
					)}
				</button>
			</div>
		</footer>
	);
};
