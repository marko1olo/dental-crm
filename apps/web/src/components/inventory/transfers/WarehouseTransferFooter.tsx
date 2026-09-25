import { FileText, PackageCheck, Printer, Zap } from "lucide-react";
import type React from "react";

export interface WarehouseTransferFooterProps {
	readonly hasDiscrepancy: boolean;
	readonly onPrintTorg13: () => void;
	readonly onPrintTorg2: () => void;
	readonly onOneClickWriteOff: () => void;
	readonly onClose: () => void;
	readonly onSaveDocument: () => void;
}

export const WarehouseTransferFooter: React.FC<
	WarehouseTransferFooterProps
> = ({
	hasDiscrepancy,
	onPrintTorg13,
	onPrintTorg2,
	onOneClickWriteOff,
	onClose,
	onSaveDocument,
}) => {
	return (
		<footer className="wh-transfer-footer !py-2.5">
			<button
				type="button"
				className="wh-btn wh-btn-secondary !min-h-[36px] sm:min-h-[36px] h-9 sm:h-9 py-1.5 px-3 text-xs"
				onClick={onPrintTorg13}
				title="Печать официальной накладной ТОРГ-13"
			>
				<Printer size={15} /> Накладная ТОРГ-13 (А4)
			</button>

			{hasDiscrepancy && (
				<button
					type="button"
					className="wh-btn wh-btn-secondary text-bad-fg !min-h-[36px] sm:min-h-[36px] h-9 sm:h-9 py-1.5 px-3 text-xs"
					onClick={onPrintTorg2}
					title="Печать акта об установленном расхождении ТОРГ-2"
				>
					<FileText size={15} /> Акт расхождений ТОРГ-2
				</button>
			)}

			<button
				type="button"
				className="wh-btn wh-btn-secondary text-teal-800 dark:text-teal-200 border-teal-500/30 hover:bg-teal-500/10 !min-h-[36px] sm:min-h-[36px] h-9 sm:h-9 py-1.5 px-3 text-xs font-semibold"
				onClick={onOneClickWriteOff}
				title="Списать ТМЦ в 1 клик"
				data-testid="btn-one-click-warehouse-writeoff"
			>
				<Zap size={15} className="text-teal-600 shrink-0" />
				<span>1-Клик списание</span>
			</button>

			<button
				type="button"
				className="wh-btn wh-btn-secondary !min-h-[36px] sm:min-h-[36px] h-9 sm:h-9 py-1.5 px-3 text-xs"
				onClick={onClose}
			>
				Отмена
			</button>

			<button
				type="button"
				className="wh-btn wh-btn-primary !min-h-[36px] sm:min-h-[36px] h-9 sm:h-9 py-1.5 px-4 text-xs font-bold"
				onClick={onSaveDocument}
			>
				<PackageCheck size={16} /> Сохранить перемещение
			</button>
		</footer>
	);
};
