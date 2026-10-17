import React, { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { AppointmentCardContextMenuProps } from "./types";
import { SuggestionsMenuSection } from "./SuggestionsMenuSection";
import { CommunicationMenuSection } from "./CommunicationMenuSection";
import { ShiftTimeMenuSection } from "./ShiftTimeMenuSection";
import { OperationsMenuSection } from "./OperationsMenuSection";
import { DiagnosticsMenuSection } from "./DiagnosticsMenuSection";
import { CancellationMenuSection } from "./CancellationMenuSection";

export type { AppointmentCardContextMenuProps } from "./types";

export function AppointmentCardContextMenu(props: AppointmentCardContextMenuProps) {
	const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
	const cardMenuRef = useRef<HTMLDivElement>(null);

	const closeMenu = () => setIsCardMenuOpen(false);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
				setIsCardMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsCardMenuOpen(false);
			}
		};
		if (isCardMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isCardMenuOpen]);

	return (
		<div className="relative inline-flex items-center shrink-0" ref={cardMenuRef}>
			<button
				type="button"
				className="icon-button appointment-context-menu-btn"
				data-testid="appointment-context-menu-btn"
				onClick={(e) => {
					e.stopPropagation();
					setIsCardMenuOpen((prev) => !prev);
				}}
				title="Все действия с записью (напоминания, опоздание, повтор, буфер, редактор)"
				aria-label="Меню действий записи"
				aria-expanded={isCardMenuOpen}
			>
				<MoreVertical size={14} className="text-[var(--teal)]" />
			</button>

			{isCardMenuOpen && (
				<div
					className="appointment-card-context-menu absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[240px] animate-in fade-in zoom-in-95 duration-100 text-xs"
					role="menu"
					onClick={(e) => e.stopPropagation()}
				>
					<SuggestionsMenuSection
						suggestions={props.appointmentSuggestions}
						onSelect={(sec) => {
							closeMenu();
							props.openScheduleSuggestion(sec);
						}}
					/>
					<CommunicationMenuSection {...props} onClose={closeMenu} />
					<ShiftTimeMenuSection
						isQuickStatusUpdating={props.isQuickStatusUpdating}
						handleShiftAppointmentTime={props.handleShiftAppointmentTime}
						onClose={closeMenu}
					/>
					<OperationsMenuSection {...props} onClose={closeMenu} />
					<DiagnosticsMenuSection
						appointmentPatient={props.appointmentPatient}
						appointmentPatientName={props.appointmentPatientName}
						onClose={closeMenu}
					/>
					<CancellationMenuSection
						appointment={props.appointment}
						isQuickStatusUpdating={props.isQuickStatusUpdating}
						handleQuickStatusChange={props.handleQuickStatusChange}
						onFreeSlotToWaitlist={props.onFreeSlotToWaitlist}
						onClose={closeMenu}
					/>
				</div>
			)}
		</div>
	);
}
