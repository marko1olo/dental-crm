/**
 * PassportModalHeader.tsx — Шапка модального окна протокола и паспорта имплантата (DENTE CRM).
 * Реализует Apple HIG drag handle для мобильного Bottom Sheet, индикацию зуба FDI,
 * быстрые действия печати и переключения вида (Мандаты 8e, 8am, 8ze).
 */

import React from "react";
import { Printer, Sliders, X } from "lucide-react";
import { DentalImplant } from "../../icons/DentalIcons";
import type { ImplantModalTab } from "../ImplantPassportModal";

export interface PassportModalHeaderProps {
	readonly titleId: string;
	readonly toothFdi: number;
	readonly patientName: string;
	readonly doctorName: string;
	readonly activeTab: ImplantModalTab;
	readonly onTogglePassportView: () => void;
	readonly onPrintPassport: () => void;
	readonly onClose: () => void;
}

export const PassportModalHeader: React.FC<PassportModalHeaderProps> = ({
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
			{/* Apple HIG Drag Handle для мобильного Bottom Sheet */}
			<div className="implant-sheet-drag-handle" aria-hidden="true" />

			<header className="implant-passport-header-bar shrink-0">
				<div className="implant-passport-header-title">
					<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))] shadow-xs">
						<DentalImplant size={18} />
					</div>
					<div className="min-w-0 flex-1 overflow-hidden">
						<h2 id={titleId} className="flex items-center gap-1.5 flex-wrap">
							<span className="title-text implant-title-desktop">Протокол &amp; Паспорт имплантата</span>
							<span className="title-text implant-title-mobile">Имплантация</span>
							<span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-xl font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shrink-0 whitespace-nowrap">
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
						className="secondary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
						data-testid="btn-print-implant-passport"
						title="Распечатать паспорт имплантата / гарантийный сертификат А5"
					>
						<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="implant-btn-text-hide-mobile">Печать</span>
					</button>
					<button
						type="button"
						onClick={onTogglePassportView}
						className="secondary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer implant-desktop-only"
						data-testid="btn-toggle-passport-view"
					>
						<Sliders size={15} className="shrink-0" />
						<span>{activeTab === "passport" ? "Параметры" : "Паспорт"}</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="icon-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 w-11 sm:w-9 rounded-xl flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
						aria-label="Закрыть протокол имплантации"
						data-testid="btn-close-implant-passport"
					>
						<X size={18} />
					</button>
				</div>
			</header>
		</>
	);
};

export default PassportModalHeader;
