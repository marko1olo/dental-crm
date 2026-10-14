import React, { useState, useRef, useEffect } from "react";
import {
	ArrowRightLeft,
	Bell,
	Calendar,
	ChevronDown,
	FileText,
	MoreHorizontal,
	Printer,
} from "lucide-react";

export interface DoctorShiftActionsMenuProps {
	readonly onHandoverShift?: (() => void) | undefined;
	readonly onPrintPreliminaryReport?: (() => void) | undefined;
	readonly onCallAssistant?: (() => void) | undefined;
	readonly onOpenT13Timesheet?: (() => void) | undefined;
	readonly onOpenChairRentalAct?: (() => void) | undefined;
	readonly isChairRental?: boolean | undefined;
	readonly className?: string | undefined;
}

export const DoctorShiftActionsMenu: React.FC<DoctorShiftActionsMenuProps> = React.memo(
	({
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
				if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
					setIsOpen(false);
				}
			};

			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					setIsOpen(false);
				}
			};

			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				document.removeEventListener("keydown", handleKeyDown);
			};
		}, [isOpen]);

		const hasActions =
			Boolean(onHandoverShift) ||
			Boolean(onPrintPreliminaryReport) ||
			Boolean(onCallAssistant) ||
			Boolean(onOpenT13Timesheet) ||
			Boolean(onOpenChairRentalAct);

		if (!hasActions) {
			return null;
		}

		return (
			<div
				ref={menuRef}
				className={`doctor-shift-actions-menu relative ${className}`.trim()}
				style={{ position: "relative", display: "inline-block" }}
			>
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
					<ChevronDown
						size={12}
						style={{
							flexShrink: 0,
							transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
							transition: "transform 0.15s ease",
						}}
					/>
				</button>

				{isOpen && (
					<div
						role="menu"
						aria-orientation="vertical"
						style={{
							position: "absolute",
							top: "calc(100% + 4px)",
							right: 0,
							zIndex: 40,
							minWidth: "210px",
							background: "var(--paper)",
							border: "1px solid var(--line)",
							borderRadius: "10px",
							boxShadow: "var(--shadow-2, 0 8px 24px rgba(0,0,0,0.12))",
							padding: "4px",
							display: "flex",
							flexDirection: "column",
							gap: "2px",
						}}
						data-testid="shift-actions-menu-dropdown"
					>
						{onHandoverShift && (
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsOpen(false);
									onHandoverShift();
								}}
								style={{
									width: "100%",
									textAlign: "left",
									padding: "7px 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									color: "var(--ink)",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
								className="hover:bg-[var(--paper-soft)]"
								data-testid="shift-action-handover"
							>
								<ArrowRightLeft size={13} className="text-[var(--teal)]" />
								<span>Передать смену врачу</span>
							</button>
						)}

						{onPrintPreliminaryReport && (
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsOpen(false);
									onPrintPreliminaryReport();
								}}
								style={{
									width: "100%",
									textAlign: "left",
									padding: "7px 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									color: "var(--ink)",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
								className="hover:bg-[var(--paper-soft)]"
								data-testid="shift-action-print-report"
							>
								<Printer size={13} className="text-[var(--muted)]" />
								<span>Печать отчета смены</span>
							</button>
						)}

						{onCallAssistant && (
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsOpen(false);
									onCallAssistant();
								}}
								style={{
									width: "100%",
									textAlign: "left",
									padding: "7px 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									color: "var(--ink)",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
								className="hover:bg-[var(--paper-soft)]"
								data-testid="shift-action-call-assistant"
							>
								<Bell size={13} className="text-[var(--warn-fg, #c2410c)]" />
								<span>Вызов ассистента</span>
							</button>
						)}

						{onOpenT13Timesheet && !isChairRental && (
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsOpen(false);
									onOpenT13Timesheet();
								}}
								style={{
									width: "100%",
									textAlign: "left",
									padding: "7px 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									color: "var(--ink)",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
								className="hover:bg-[var(--paper-soft)]"
								data-testid="shift-action-t13"
							>
								<Calendar size={13} className="text-[var(--teal)]" />
								<span>Табель учета времени</span>
							</button>
						)}

						{onOpenChairRentalAct && isChairRental && (
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsOpen(false);
									onOpenChairRentalAct();
								}}
								style={{
									width: "100%",
									textAlign: "left",
									padding: "7px 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									color: "var(--ink)",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
								className="hover:bg-[var(--paper-soft)]"
								data-testid="shift-action-rental-act"
							>
								<FileText size={13} className="text-[var(--teal)]" />
								<span>Акт сверки субаренды</span>
							</button>
						)}
					</div>
				)}
			</div>
		);
	},
);

DoctorShiftActionsMenu.displayName = "DoctorShiftActionsMenu";
