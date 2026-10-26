import React from "react";
import { Contrast, Paperclip, RefreshCw, ZoomIn } from "lucide-react";
import { DentalPanoramicArch, DentalForm043 } from "../../icons/DentalIcons";
import { ToothRvgSliders } from "./ToothRvgSliders";

interface ToothRvgControlsProps {
	toothNumber: number;
	isInverted: boolean;
	contrast: number;
	brightness: number;
	isZoomedApex: boolean;
	onToggleInverted: () => void;
	onToggleZoomApex: () => void;
	onResetFilters: () => void;
	onChangeBrightness: (val: number) => void;
	onChangeContrast: (val: number) => void;
	onOpenFilePicker: () => void;
	onCopyXrayReport: () => void;
	onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
}

export const ToothRvgControls: React.FC<ToothRvgControlsProps> = ({
	toothNumber,
	isInverted,
	contrast,
	brightness,
	isZoomedApex,
	onToggleInverted,
	onToggleZoomApex,
	onResetFilters,
	onChangeBrightness,
	onChangeContrast,
	onOpenFilePicker,
	onCopyXrayReport,
	onOpenFullRadiology,
}) => {
	return (
		<div className="dente-rvg-controls-col">
			<div className="dente-rvg-btn-group">
				<button
					type="button"
					onClick={onToggleInverted}
					className={`dente-rvg-ctrl-btn ${isInverted ? "active" : ""}`}
					title="Инвертировать цвета (негатив для костных балок)"
				>
					<Contrast size={14} />
					<span>Негатив</span>
				</button>

				<button
					type="button"
					onClick={onToggleZoomApex}
					className={`dente-rvg-ctrl-btn ${isZoomedApex ? "active" : ""}`}
					title="Увеличение апекса (лупа корня)"
				>
					<ZoomIn size={14} />
					<span>Зум апекса</span>
				</button>

				<button
					type="button"
					onClick={onResetFilters}
					className="dente-rvg-ctrl-btn"
					title="Сбросить фильтры"
				>
					<RefreshCw size={14} />
					<span>Сброс</span>
				</button>
			</div>

			<ToothRvgSliders
				brightness={brightness}
				contrast={contrast}
				onChangeBrightness={onChangeBrightness}
				onChangeContrast={onChangeContrast}
			/>

			<div className="dente-rvg-actions-row">
				<button
					type="button"
					onClick={onOpenFilePicker}
					className="dente-primary-action-btn"
					data-testid="attach-rvg-scan-btn"
					style={{ fontSize: 11, minHeight: 36, gap: 4 }}
					title="Прикрепить прицельный снимок к зубу"
				>
					<Paperclip size={13} />
					<span>Прикрепить снимок</span>
				</button>

				<button
					type="button"
					onClick={onCopyXrayReport}
					className="dente-secondary-btn"
					style={{ fontSize: 11, minHeight: 36, gap: 4 }}
				>
					<DentalForm043 size={13} />
					<span>Вставить в карту</span>
				</button>

				<button
					type="button"
					onClick={() => onOpenFullRadiology?.(toothNumber)}
					className="dente-secondary-btn"
					style={{ fontSize: 11, minHeight: 36, gap: 4 }}
				>
					<DentalPanoramicArch size={13} />
					<span>Студия снимков...</span>
				</button>
			</div>
		</div>
	);
};
