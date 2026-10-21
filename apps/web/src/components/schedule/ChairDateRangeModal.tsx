import { CalendarRange } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { ChairDateRangeFormFields } from "./chairDateRange/ChairDateRangeFormFields";
import { ChairDateRangeHeader } from "./chairDateRange/ChairDateRangeHeader";
import { ChairDateRangePresets } from "./chairDateRange/ChairDateRangePresets";
import type { DateRangeShiftPreset } from "./roster/DoctorShiftRosterModal";
import type { ScheduleChair } from "./ScheduleFilterStrip";

export interface ChairDateRangeModalProps {
	isOpen: boolean;
	onClose: () => void;
	doctors: Array<{ id: string; fullName: string; specialty?: any }>;
	chairs: Array<ScheduleChair>;
	rangeDoctorId: string;
	setRangeDoctorId: (id: string) => void;
	rangeChairId: string;
	setRangeChairId: (id: string) => void;
	rangeStartDate: string;
	setRangeStartDate: (date: string) => void;
	rangeEndDate: string;
	setRangeEndDate: (date: string) => void;
	rangePreset: DateRangeShiftPreset;
	setRangePreset: (preset: DateRangeShiftPreset) => void;
	onApply: () => void;
}

export function ChairDateRangeModal({
	isOpen,
	onClose,
	doctors,
	chairs,
	rangeDoctorId,
	setRangeDoctorId,
	rangeChairId,
	setRangeChairId,
	rangeStartDate,
	setRangeStartDate,
	rangeEndDate,
	setRangeEndDate,
	rangePreset,
	setRangePreset,
	onApply,
}: ChairDateRangeModalProps) {
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault?.();
				e.stopPropagation?.();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	if (!isOpen) return null;

	const modalNode = (
		<div
			className="chair-range-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 bg-black/50 backdrop-blur-xs"
			data-testid="chair-schedule-date-range-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="chair-date-range-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-lg rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl p-4 sm:p-5 flex flex-col gap-4 text-[var(--ink,#0f172a)] animate-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				<ChairDateRangeHeader onClose={onClose} />

				<ChairDateRangeFormFields
					doctors={doctors}
					chairs={chairs}
					rangeDoctorId={rangeDoctorId}
					setRangeDoctorId={setRangeDoctorId}
					rangeChairId={rangeChairId}
					setRangeChairId={setRangeChairId}
					rangeStartDate={rangeStartDate}
					setRangeStartDate={setRangeStartDate}
					rangeEndDate={rangeEndDate}
					setRangeEndDate={setRangeEndDate}
				/>

				<ChairDateRangePresets
					rangePreset={rangePreset}
					setRangePreset={setRangePreset}
				/>

				<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						data-testid="chair-range-modal-apply-btn"
						onClick={onApply}
						className="min-h-[44px] px-5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
					>
						<CalendarRange size={15} />
						<span>Назначить график</span>
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalNode, document.body);
	}
	return null;
}
