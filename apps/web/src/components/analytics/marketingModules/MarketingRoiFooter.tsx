import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface MarketingRoiFooterProps {
	readonly onClose: () => void;
}

export const MarketingRoiFooter: React.FC<MarketingRoiFooterProps> = ({ onClose }) => {
	return (
		<footer className="marketing-roi-footer">
			<div className="text-xs text-[var(--muted,#94a3b8)] flex items-center gap-2">
				<CheckCircle2 className="w-4 h-4 text-teal-400" />
				<span>
					Все расчеты ведутся в целочисленных копейках (Kopecks) без float-погрешностей по кассовому регламенту и клиническим стандартам.
				</span>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="dente-btn dente-btn-primary marketing-roi-action-btn primary"
					data-testid="close-marketing-roi-btn"
				>
					<span>Закрыть аналитику</span>
				</button>
			</div>
		</footer>
	);
};
