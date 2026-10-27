import type { CSSProperties } from "react";

export interface CardStyleParams {
	isMicroDensity: boolean;
	isTwoLineMode: boolean;
	patientBalance: number | null;
	isCito: boolean;
	displayStatus: string;
	readinessState?: string;
	proportionalHeight: number;
}

export function getAppointmentCardClassName({
	isMicroDensity,
	isTwoLineMode,
	patientBalance,
	isCito,
	displayStatus,
	readinessState,
}: CardStyleParams): string {
	const paddingCls = isMicroDensity
		? "p-1.5 sm:p-1 mb-1"
		: isTwoLineMode
			? "p-2 sm:p-1.5 mb-1.5"
			: "p-2.5 sm:p-2 mb-2 sm:mb-1.5";
	const debtBorder = patientBalance !== null && patientBalance < 0 ? "border-l-4 border-l-rose-500" : "";
	const statusBorder = isCito
		? "border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5"
		: displayStatus === "confirmed"
			? "border-emerald-500/50"
			: displayStatus === "in_treatment"
				? "border-[var(--teal,var(--brand-primary))]/60"
				: displayStatus === "arrived"
					? "border-amber-500/50"
					: displayStatus === "completed"
						? "border-[var(--line)] opacity-95"
						: "border-[var(--line)]";
	const readinessCls = readinessState ? `readiness-${readinessState}` : "";

	return `appointment-card mode-fit-card glass-panel rounded-xl shadow-xs transition-all focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-w-0 max-w-full relative select-none ${paddingCls} ${debtBorder} ${statusBorder} ${readinessCls}`;
}

export function getAppointmentCardStyle({
	isMicroDensity,
	proportionalHeight,
}: CardStyleParams): CSSProperties {
	return {
		display: "flex",
		flexDirection: "column",
		gap: isMicroDensity ? "2px" : "6px",
		background: "var(--paper)",
		color: "var(--ink)",
		minWidth: 0,
		maxWidth: "100%",
		minHeight: `${proportionalHeight}px`,
		boxSizing: "border-box",
		contentVisibility: "auto",
		containIntrinsicSize: isMicroDensity ? "1px 32px" : "1px 48px",
	};
}
