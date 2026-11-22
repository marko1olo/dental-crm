/**
 * SurgeryHubHeader.tsx — Шапка хирургического хаба у кресла (DENTE CRM).
 * Мандаты 8d, 8am, 8ze (Apple HIG, Zero-Clipping, доступность).
 */

import React from "react";
import { Printer, X } from "lucide-react";
import { DentalImplant } from "../../icons/DentalIcons";

export interface SurgeryHubHeaderProps {
	readonly titleId: string;
	readonly toothBadge: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export const SurgeryHubHeader: React.FC<SurgeryHubHeaderProps> = ({
	titleId,
	toothBadge,
	patientName,
	doctorName,
	onPrint,
	onClose,
}) => {
	return (
		<>
			<div className="surgery-hub-drag-handle" aria-hidden="true" />
			<header className="surgery-hub-header-bar">
				<div className="surgery-hub-header-title">
					<div className="w-9 h-9 rounded-xl bg-[var(--primary-soft,rgba(var(--primary-rgb),0.12))] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary-soft,rgba(var(--primary-rgb),0.3))]">
						<DentalImplant size={19} />
					</div>
					<div className="min-w-0 flex-1 overflow-hidden">
						<h2 id={titleId}>
							<span>Хирургический хаб &amp; Паспорт имплантации</span>
							<span className="text-xs px-2 py-0.5 rounded-lg font-mono font-bold bg-[var(--primary)] text-white shrink-0">
								{toothBadge}
							</span>
						</h2>
						<p
							className="text-[11px] sm:text-xs text-[var(--muted)] leading-tight"
							title={`${patientName} · ${doctorName}`}
						>
							{patientName} · {doctorName}
						</p>
					</div>
				</div>
				<div className="surgery-hub-header-actions">
					<button
						type="button"
						onClick={onPrint}
						className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center gap-1.5"
						data-testid="btn-print-surgery-hub"
						title="Распечатать медицинскую документацию"
					>
						<Printer size={15} className="text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Печать</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] h-11 w-11 rounded-xl flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
						aria-label="Закрыть хирургический хаб"
						data-testid="btn-close-surgery-hub"
					>
						<X size={18} />
					</button>
				</div>
			</header>
		</>
	);
};
