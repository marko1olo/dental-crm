import React from "react";
import { Printer, Sparkles, X } from "lucide-react";

export interface ComparatorHeaderProps {
	patientName: string;
	doctorName: string;
	clinicName: string;
	onPrintBrochure: () => void;
	onClose?: (() => void) | undefined;
}

export const ComparatorHeader: React.FC<ComparatorHeaderProps> = ({
	patientName,
	doctorName,
	clinicName,
	onPrintBrochure,
	onClose,
}) => {
	return (
		<header className="plan-comparator-header">
			<div className="plan-comparator-header-info">
				<div className="plan-header-icon" aria-hidden="true">
					<Sparkles size={20} />
				</div>
				<div className="min-w-0 flex-1">
					<h2 id="plan-comparator-title" className="plan-header-title text-sm sm:text-lg font-bold break-words leading-snug">
						Студия сравнения планов лечения &mdash; {patientName}
					</h2>
					<p className="plan-header-subtitle text-xs sm:text-sm text-[var(--muted,#64748b)] break-words mt-0.5">
						Врач: {doctorName} | {clinicName}
					</p>
				</div>
			</div>

			<div className="plan-header-actions">
				<button
					type="button"
					className="plan-btn-icon"
					onClick={onPrintBrochure}
					title="Распечатать брошюру для пациента"
					aria-label="Печать брошюры"
				>
					<Printer size={16} />
				</button>
				{onClose ? (
					<button
						type="button"
						className="plan-btn-icon"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				) : null}
			</div>
		</header>
	);
};
