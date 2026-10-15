import React from "react";
import { ChevronDown, FileText } from "lucide-react";
import { SpecialtyFocusBarCompact } from "./SpecialtyFocusBarCompact";

export interface SpecialtyFocusBarProps {
	compact?: boolean;
	isChildDentition: boolean;
	isSurgery: boolean;
	activeTooth: number | null;
	isProtocolDrawerOpen: boolean;
	setIsProtocolDrawerOpen: (valOrFn: any) => void;
	currentSpecialtyLabel: string;
	activeDoctor?: any;
	activeChair?: any;
	focusOptions: any[];
	selectedSpecialty: string;
	setSelectedSpecialty?: (spec: string) => void;
	setSelectedProtocolId?: (id: any) => void;
}

export function SpecialtyFocusBar({
	compact = false, isChildDentition, isSurgery, activeTooth,
	isProtocolDrawerOpen, setIsProtocolDrawerOpen, currentSpecialtyLabel,
	activeDoctor, activeChair, focusOptions, selectedSpecialty,
	setSelectedSpecialty, setSelectedProtocolId,
}: SpecialtyFocusBarProps) {
	const specialtyName = isChildDentition ? "Детство" : isSurgery ? "Хирургия" : "Терапия";

	if (compact) {
		return (
			<SpecialtyFocusBarCompact
				specialtyName={specialtyName}
				activeTooth={activeTooth}
				isProtocolDrawerOpen={isProtocolDrawerOpen}
				setIsProtocolDrawerOpen={setIsProtocolDrawerOpen}
			/>
		);
	}

	return (
		<section
			data-testid="visit-specialty-focus"
			className="specialty-focus-bar bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-between gap-1.5 shrink-0 select-none rounded-lg px-2.5 min-h-[30px] h-[30px] text-xs shadow-2xs"
			aria-label="Фокус специальности приема"
		>
			<div className="flex items-center gap-1.5 min-w-0">
				<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] shrink-0 hidden sm:inline">Фокус:</span>
				<strong className="font-semibold text-xs text-[var(--ink)] whitespace-nowrap shrink-0">{currentSpecialtyLabel}</strong>
				<span className="text-xs text-[var(--muted)] hidden lg:inline shrink-0">
					({activeDoctor?.fullName?.split(" ")[0] ?? "Врач"} · {activeChair?.name ?? "кресло"})
				</span>
			</div>
			<div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
				{focusOptions.length > 0 && (
					<div
						className="inline-flex items-center p-[2px] rounded-[7px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-[2px] shadow-2xs shrink-0"
						role="tablist"
						aria-label="Направления специализаций"
					>
						{focusOptions.map((option: any) => {
							const isActive = selectedSpecialty === option.specialty;
							return (
								<button
									className={`h-6 px-2 rounded-[5px] text-[11px] transition-all cursor-pointer select-none whitespace-nowrap ${
										isActive ? "bg-[var(--teal)] text-white font-semibold shadow-xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
									}`}
									type="button"
									role="tab"
									key={option.specialty}
									aria-selected={isActive}
									onClick={() => {
										if (setSelectedSpecialty) setSelectedSpecialty(option.specialty);
										if (setSelectedProtocolId) setSelectedProtocolId(null);
									}}
									title={option.hint}
								>
									<span>{option.title}</span>
								</button>
							);
						})}
					</div>
				)}

				<button
					type="button"
					onClick={() => setIsProtocolDrawerOpen((prev: boolean) => !prev)}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
					title="Развернуть специализированный бланк приема"
					data-testid="toggle-specialty-protocol-drawer"
				>
					<FileText size={12} className="shrink-0 text-[var(--teal)]" />
					<span className="hidden sm:inline">Бланк:</span>
					<span>{specialtyName}</span>
					<ChevronDown size={11} className={`shrink-0 transform transition-transform ${isProtocolDrawerOpen ? "rotate-180" : ""}`} />
				</button>
			</div>
		</section>
	);
}
