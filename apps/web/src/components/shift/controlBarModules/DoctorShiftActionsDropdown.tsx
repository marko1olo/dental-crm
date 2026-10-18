import React from "react";
import { ArrowRightLeft, Bell, Calendar, FileText, Printer } from "lucide-react";

export interface DoctorShiftActionsDropdownProps {
	readonly onHandoverShift?: (() => void) | undefined;
	readonly onPrintPreliminaryReport?: (() => void) | undefined;
	readonly onCallAssistant?: (() => void) | undefined;
	readonly onOpenT13Timesheet?: (() => void) | undefined;
	readonly onOpenChairRentalAct?: (() => void) | undefined;
	readonly isChairRental?: boolean | undefined;
	readonly onClose: () => void;
}

const itemStyle: React.CSSProperties = {
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
};

export const DoctorShiftActionsDropdown: React.FC<DoctorShiftActionsDropdownProps> = ({
	onHandoverShift,
	onPrintPreliminaryReport,
	onCallAssistant,
	onOpenT13Timesheet,
	onOpenChairRentalAct,
	isChairRental = false,
	onClose,
}) => (
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
			<button type="button" role="menuitem" onClick={() => { onClose(); onHandoverShift(); }} style={itemStyle} className="hover:bg-[var(--paper-soft)]" data-testid="shift-action-handover">
				<ArrowRightLeft size={13} className="text-[var(--teal)]" />
				<span>Передать смену врачу</span>
			</button>
		)}
		{onPrintPreliminaryReport && (
			<button type="button" role="menuitem" onClick={() => { onClose(); onPrintPreliminaryReport(); }} style={itemStyle} className="hover:bg-[var(--paper-soft)]" data-testid="shift-action-print-report">
				<Printer size={13} className="text-[var(--muted)]" />
				<span>Печать отчета смены</span>
			</button>
		)}
		{onCallAssistant && (
			<button type="button" role="menuitem" onClick={() => { onClose(); onCallAssistant(); }} style={itemStyle} className="hover:bg-[var(--paper-soft)]" data-testid="shift-action-call-assistant">
				<Bell size={13} className="text-[var(--warn-fg, #c2410c)]" />
				<span>Вызов ассистента</span>
			</button>
		)}
		{onOpenT13Timesheet && !isChairRental && (
			<button type="button" role="menuitem" onClick={() => { onClose(); onOpenT13Timesheet(); }} style={itemStyle} className="hover:bg-[var(--paper-soft)]" data-testid="shift-action-t13">
				<Calendar size={13} className="text-[var(--teal)]" />
				<span>Учёт отработанного времени и часов</span>
			</button>
		)}
		{onOpenChairRentalAct && isChairRental && (
			<button type="button" role="menuitem" onClick={() => { onClose(); onOpenChairRentalAct(); }} style={itemStyle} className="hover:bg-[var(--paper-soft)]" data-testid="shift-action-rental-act">
				<FileText size={13} className="text-[var(--teal)]" />
				<span>Акт сверки субаренды</span>
			</button>
		)}
	</div>
);
