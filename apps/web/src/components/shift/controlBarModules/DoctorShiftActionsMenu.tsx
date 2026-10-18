import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { DoctorShiftActionsDropdown } from "./DoctorShiftActionsDropdown";

export interface DoctorShiftActionsMenuProps {
	readonly onHandoverShift?: (() => void) | undefined;
	readonly onPrintPreliminaryReport?: (() => void) | undefined;
	readonly onCallAssistant?: (() => void) | undefined;
	readonly onOpenT13Timesheet?: (() => void) | undefined;
	readonly onOpenChairRentalAct?: (() => void) | undefined;
	readonly isChairRental?: boolean | undefined;
	readonly className?: string | undefined;
}

export const DoctorShiftActionsMenu: React.FC<DoctorShiftActionsMenuProps> = React.memo(({
	onHandoverShift,
	onPrintPreliminaryReport,
	onCallAssistant,
	onOpenT13Timesheet,
	onOpenChairRentalAct,
	isChairRental = false,
	className = "",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const hasActions = Boolean(onHandoverShift || onPrintPreliminaryReport || onCallAssistant || onOpenT13Timesheet || onOpenChairRentalAct);
	if (!hasActions) return null;

	return (
		<div ref={menuRef} className={`doctor-shift-actions-menu relative ${className}`.trim()} style={{ position: "relative", display: "inline-block" }}>
			<button
				type="button"
				aria-haspopup="menu"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((prev) => !prev)}
				title="Дополнительные действия смены"
				data-testid="shift-actions-menu-trigger"
				style={{
					height: "32px",
					borderRadius: "8px",
					padding: "0 10px",
					fontSize: "11.5px",
					fontWeight: 600,
					display: "inline-flex",
					alignItems: "center",
					gap: "5px",
					cursor: "pointer",
					whiteSpace: "nowrap",
					transition: "all 0.15s ease",
					background: isOpen ? "var(--paper-card)" : "var(--paper-soft)",
					border: "1px solid var(--line)",
					color: "var(--ink)",
				}}
			>
				<MoreHorizontal size={14} style={{ flexShrink: 0 }} />
				<span>Ещё</span>
				<ChevronDown size={12} style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
			</button>

			{isOpen && (
				<DoctorShiftActionsDropdown
					onHandoverShift={onHandoverShift}
					onPrintPreliminaryReport={onPrintPreliminaryReport}
					onCallAssistant={onCallAssistant}
					onOpenT13Timesheet={onOpenT13Timesheet}
					onOpenChairRentalAct={onOpenChairRentalAct}
					isChairRental={isChairRental}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</div>
	);
});

DoctorShiftActionsMenu.displayName = "DoctorShiftActionsMenu";
