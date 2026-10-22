import React from "react";
import { BellPlus, X } from "lucide-react";
import type { ToothState } from "../../odontogram/ToothChart";
import { getToothStateLabelRu } from "../../odontogram/chart/toothChartTypes";
import { getLocusTransitionDescription } from "../../odontogram/treatmentEstimatorPricing";
import type { SuggestedRecall } from "./toothDrawerTypes";

interface ToothDrawerHeaderProps {
	toothNumber: number;
	currentState: ToothState;
	anatomicalName: string;
	folkAndAnatomical: string;
	suggestedRecall: SuggestedRecall;
	onTriggerRecall: () => void;
	onClose: () => void;
}

export const ToothDrawerHeader: React.FC<ToothDrawerHeaderProps> = ({
	toothNumber,
	currentState,
	anatomicalName,
	folkAndAnatomical,
	suggestedRecall,
	onTriggerRecall,
	onClose,
}) => {
	const locusDesc = getLocusTransitionDescription(toothNumber);

	return (
		<header className="dente-tooth-drawer-header">
			<div className="dente-drawer-header-left">
				<div className="dente-tooth-fdi-badge">
					<span className="fdi-label">FDI</span>
					<span className="fdi-num">{toothNumber}</span>
				</div>
				<div className="dente-tooth-title-block min-w-0">
					<div className="dente-tooth-title-row min-w-0">
						<h2 className="dente-tooth-title truncate min-w-0" title={anatomicalName}>{anatomicalName}</h2>
						<span className={`dente-tooth-state-pill shrink-0 state-${currentState.toLowerCase()}`}>
							{getToothStateLabelRu(currentState)}
						</span>
					</div>
					<p className="dente-tooth-folk-name truncate min-w-0" title={folkAndAnatomical}>{folkAndAnatomical}</p>
					{locusDesc && (
						<p
							className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded mt-1 truncate min-w-0"
							data-testid="tooth-locus-transition-badge"
							title={locusDesc}
						>
							{locusDesc}
						</p>
					)}
				</div>
			</div>

			<div className="dente-drawer-header-actions">
				<button
					type="button"
					onClick={onTriggerRecall}
					className="dente-recall-quick-btn"
					data-testid="tooth-card-set-recall-btn"
					title={`Назначить вызов: ${suggestedRecall.label}`}
				>
					<BellPlus size={14} className="shrink-0" />
					<span>Вызов ({suggestedRecall.label})</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="dente-drawer-close-btn"
					title="Закрыть (Esc)"
					aria-label="Закрыть контекстную шторку зуба"
					data-testid="tooth-drawer-close-btn"
				>
					<X size={20} />
				</button>
			</div>
		</header>
	);
};
