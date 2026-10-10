import React from "react";
import { Check, Download, Send } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { HotFolderIntakeFooterActionsProps } from "./types";

export const HotFolderIntakeFooterActions: React.FC<HotFolderIntakeFooterActionsProps> = ({
	activeItem,
	protocolNote,
	onAttachToEmr,
	onExportDicom,
	onSendToLab,
}) => {
	const handleExport = () => {
		if (activeItem) {
			onExportDicom?.(activeItem);
			showToast(`Экспорт DICOM (${activeItem.filename}) выполнен`, "info");
		} else {
			showToast("Выберите снимок для экспорта", "info");
		}
	};

	const handleSendLab = () => {
		if (activeItem) {
			onSendToLab?.(activeItem, protocolNote);
			showToast("Снимок отправлен в зуботехническую лабораторию", "info");
		} else {
			showToast("Выберите снимок для отправки", "info");
		}
	};

	return (
		<div className="hfi-right-footer">
			<button
				type="button"
				onClick={onAttachToEmr}
				disabled={!activeItem}
				className={`hfi-primary-attach-btn ${!activeItem ? "opacity-50 cursor-not-allowed" : ""}`}
				data-testid="hfi-primary-attach-btn"
				title={!activeItem ? "Выберите или загрузите снимок для прикрепления" : undefined}
			>
				<Check className="w-4 h-4" />
				<span>Принять снимок в медицинскую карту</span>
			</button>

			<div className="hfi-secondary-actions-row">
				<button
					type="button"
					onClick={handleExport}
					className="hfi-secondary-btn"
					data-testid="hfi-export-dicom-btn"
				>
					<Download className="w-3.5 h-3.5" />
					<span>Экспорт DICOM</span>
				</button>
				<button
					type="button"
					onClick={handleSendLab}
					className="hfi-secondary-btn"
					data-testid="hfi-send-lab-btn"
				>
					<Send className="w-3.5 h-3.5" />
					<span>В лабораторию</span>
				</button>
			</div>
		</div>
	);
};
