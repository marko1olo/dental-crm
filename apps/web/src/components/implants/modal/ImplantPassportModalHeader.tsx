import React from "react";
import { Printer, Sliders, X } from "lucide-react";
import { DentalImplant } from "../../icons/DentalIcons";
import type { ImplantModalTab } from "./useImplantPassportLogic";

export interface ImplantPassportModalHeaderProps {
	readonly titleId: string;
	readonly toothFdi: number;
	readonly patientName: string;
	readonly doctorName: string;
	readonly activeTab: ImplantModalTab;
	readonly onTogglePassportView: () => void;
	readonly onPrintPassport: () => void;
	readonly onClose: () => void;
}

export const ImplantPassportModalHeader: React.FC<ImplantPassportModalHeaderProps> = ({
	titleId,
	toothFdi,
	patientName,
	doctorName,
	activeTab,
	onTogglePassportView,
	onPrintPassport,
	onClose,
}) => {
	return (
		<>
			<div className="implant-sheet-drag-handle" aria-hidden="true" />
			<header className="implant-passport-header-bar">
				<div className="implant-passport-header-title">
					<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
						<DentalImplant size={18} />
					</div>
					<div className="min-w-0 flex-1 overflow-hidden">
						<h2 id={titleId}>
							<span className="title-text hidden sm:inline">Протокол & Паспорт имплантата</span>
							<span className="title-text sm:hidden">Имплантация</span>
							<span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-md font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shrink-0 whitespace-nowrap ml-2">
								#{toothFdi}
							</span>
						</h2>
						<p className="text-[11px] sm:text-xs text-[var(--muted)] truncate" title={`${patientName} · ${doctorName}`}>
							{patientName} · {doctorName}
						</p>
					</div>
				</div>

				<div className="implant-passport-header-actions">
					<button
						type="button"
						onClick={onPrintPassport}
						className="secondary-button"
						data-testid="btn-print-implant-passport"
						title="Распечатать паспорт имплантата / гарантийный сертификат"
					>
						<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="implant-btn-text-hide-mobile">Печать</span>
					</button>

					<button
						type="button"
						onClick={onTogglePassportView}
						className="secondary-button implant-desktop-only"
						data-testid="btn-toggle-passport-view"
					>
						<Sliders size={15} className="shrink-0" />
						<span>{activeTab === "passport" ? "Параметры" : "Паспорт"}</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="icon-button"
						aria-label="Закрыть окно паспорта"
						data-testid="btn-close-implant-passport implant-passport-close-btn"
					>
						<X size={18} />
					</button>
				</div>
			</header>
		</>
	);
};

export default ImplantPassportModalHeader;
