import React from "react";
import type { ToothData } from "../../odontogram/ToothChart";
import { getToothStateLabelRu } from "../../odontogram/chart/toothChartTypes";

interface ToothDrawerFooterProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	onClose: () => void;
}

export const ToothDrawerFooter: React.FC<ToothDrawerFooterProps> = ({
	toothNumber,
	toothData,
	onClose,
}) => {
	const stateLabel = toothData?.state ? getToothStateLabelRu(toothData.state) : "Здоров";

	return (
		<footer className="dente-tooth-drawer-footer">
			<div className="footer-left">
				<span className="status-note">
					Зуб #{toothNumber} • {stateLabel}
				</span>
			</div>
			<div className="footer-actions flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="dente-drawer-btn-secondary"
					data-testid="tooth-drawer-cancel-btn"
				>
					Закрыть
				</button>
				<button
					type="button"
					onClick={onClose}
					className="dente-drawer-btn-primary"
					data-testid="tooth-drawer-primary-cta-btn"
				>
					Готово
				</button>
			</div>
		</footer>
	);
};
