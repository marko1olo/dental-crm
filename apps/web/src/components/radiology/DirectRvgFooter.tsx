import React from "react";
import { CheckCircle2, Download, Truck } from "lucide-react";

export interface DirectRvgFooterProps {
	selectedTeeth: string[];
	calculatedDoseMicrosv: number;
	isSaving: boolean;
	onExportDicom: () => void;
	onSendToLab: () => void;
	onSaveToEmr: () => void;
}

export const DirectRvgFooter: React.FC<DirectRvgFooterProps> = ({
	selectedTeeth,
	calculatedDoseMicrosv,
	isSaving,
	onExportDicom,
	onSendToLab,
	onSaveToEmr,
}) => {
	return (
		<div className="rvg-capture-footer">
			<div className="rvg-footer-left-info">
				<span className="font-mono">
					Безопасная доза · FDI #{selectedTeeth.join(", ")} · {calculatedDoseMicrosv} мкЗв
				</span>
			</div>

			<div className="rvg-footer-actions-group">
				{/* Action 1: Export DICOM */}
				<button
					type="button"
					onClick={onExportDicom}
					className="rvg-action-btn-secondary"
					title="Экспортировать снимок в DICOM 3.0 / TIFF высокой четкости"
					data-testid="rvg-export-dicom-btn"
				>
					<Download className="w-4 h-4 text-teal-400" />
					<span>Экспорт DICOM</span>
				</button>

				{/* Action 2: Send to Dental Lab */}
				<button
					type="button"
					onClick={onSendToLab}
					className="rvg-action-btn-secondary"
					title="Прикрепить снимок к текущему заказу зуботехнической лаборатории"
					data-testid="rvg-send-lab-btn"
				>
					<Truck className="w-4 h-4 text-teal-400" />
					<span>Отправить в ЗТЛ</span>
				</button>

				{/* Action 3: Save to EMR 043/u (Primary) */}
				<button
					type="button"
					onClick={onSaveToEmr}
					disabled={isSaving}
					className="rvg-action-btn-primary"
					title={
						isSaving
							? "Сохранение снимка и протокола исследования в карту 043/у..."
							: "Сохранить исследование в медицинскую карту пациента 043/у"
					}
					data-testid="rvg-save-emr-btn"
				>
					<CheckCircle2 className="w-4 h-4" />
					<span>{isSaving ? "Сохранение..." : "Сохранить в карту 043/у"}</span>
				</button>
			</div>
		</div>
	);
};
