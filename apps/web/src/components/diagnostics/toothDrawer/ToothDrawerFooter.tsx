import React from "react";
import type { ToothData } from "../../odontogram/ToothChart";

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
	return (
		<footer className="dente-tooth-drawer-footer">
			<div className="footer-left">
				<span className="status-note">
					Зуб #{toothNumber} • {toothData?.state ?? "Healthy"}
				</span>
			</div>
			<div className="footer-actions">
				<button type="button" onClick={onClose} className="dente-drawer-btn-secondary">
					Закрыть
				</button>
			</div>
		</footer>
	);
};
