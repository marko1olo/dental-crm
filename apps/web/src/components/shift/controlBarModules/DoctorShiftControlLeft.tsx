import React from "react";
import { Radio, Stethoscope } from "lucide-react";
import { ShiftTimerDisplay } from "./ShiftTimerDisplay";
import type { DoctorShiftStats } from "./shiftControlBarTypes";

export interface DoctorShiftControlLeftProps {
	readonly isShiftOpen: boolean;
	readonly cleanDocName: string;
	readonly cabinetName: string;
	readonly shiftStats: DoctorShiftStats;
	readonly isOffline: boolean;
}

export const DoctorShiftControlLeft: React.FC<DoctorShiftControlLeftProps> = ({
	isShiftOpen,
	cleanDocName,
	cabinetName,
	shiftStats,
	isOffline,
}) => (
	<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
		<div
			style={{
				width: "30px",
				height: "30px",
				borderRadius: "8px",
				background: isShiftOpen ? "var(--ok-bg, rgba(21, 128, 61, 0.1))" : "var(--warn-bg, rgba(234, 88, 12, 0.1))",
				color: isShiftOpen ? "var(--ok-fg, #15803d)" : "var(--warn-fg, #c2410c)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
			}}
			aria-hidden="true"
		>
			<Stethoscope size={15} />
		</div>

		<div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0, flexWrap: "nowrap" }}>
			<h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25, whiteSpace: "nowrap" }}>
				Д-р {cleanDocName} · {cabinetName}
			</h3>

			<span
				className={`status-pill ${isShiftOpen ? "status-in_treatment" : "status-pending"}`}
				style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}
			>
				{isShiftOpen ? "Рабочая смена врача открыта" : "Рабочая смена врача закрыта"}
			</span>

			{isShiftOpen && (
				<ShiftTimerDisplay
					isShiftOpen={isShiftOpen}
					startTimeIso={shiftStats.shiftStartTimeIso}
					initialSeconds={shiftStats.shiftDurationSeconds}
				/>
			)}

			{isOffline && (
				<span
					style={{
						fontSize: "10.5px",
						fontWeight: 600,
						color: "var(--muted)",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						background: "var(--paper-soft)",
						padding: "2px 6px",
						borderRadius: "6px",
						border: "1px solid var(--line)",
						whiteSpace: "nowrap",
						flexShrink: 0,
					}}
				>
					<Radio size={11} aria-hidden="true" />
					<span>Офлайн</span>
				</span>
			)}
		</div>
	</div>
);
