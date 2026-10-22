import React from "react";
import { ApexLocator, EndoFileCanal } from "../../icons/DentalIcons";

export interface ToothEndoHeaderProps {
	canalCount: number;
	showEndoTable: boolean;
	onToggleShowEndoTable: () => void;
	onApplyExpressProTaper: () => void;
}

export const ToothEndoHeader: React.FC<ToothEndoHeaderProps> = ({
	canalCount,
	showEndoTable,
	onToggleShowEndoTable,
	onApplyExpressProTaper,
}) => {
	return (
		<div className="dente-endo-header" onClick={onToggleShowEndoTable}>
			<div className="dente-endo-title">
				<ApexLocator size={16} style={{ color: "var(--bad-fg)" }} />
				<span>Эндодонтия & Апекслокация каналов ({canalCount})</span>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				{!showEndoTable && (
					<button
						type="button"
						className="dente-quick-endo-trigger-btn"
						onClick={(e) => {
							e.stopPropagation();
							onApplyExpressProTaper();
						}}
						title="Быстрый протокол ProTaper 25.06"
					>
						<EndoFileCanal size={12} />
						<span>Экспресс ProTaper</span>
					</button>
				)}
				<button
					type="button"
					className="dente-text-action-btn"
					onClick={(e) => {
						e.stopPropagation();
						onToggleShowEndoTable();
					}}
				>
					{showEndoTable ? "Свернуть" : "Развернуть..."}
				</button>
			</div>
		</div>
	);
};
