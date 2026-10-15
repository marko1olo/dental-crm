import React from "react";
import { Check, Clock } from "lucide-react";
import type { AppointmentStatusMarkerProps } from "./appointmentCardTypes";
import {
	getNormalizedAppointmentStatusLabel,
	getAppointmentStatusBadgeClasses,
	isAppointmentInChair,
	getAppointmentElapsedMinutes,
} from "../appointmentCardHelpers";
import { GridAppointmentStatusPopover } from "../GridAppointmentStatusPopover";

export const AppointmentStatusMarker: React.FC<AppointmentStatusMarkerProps> = ({
	appointment: a,
	appointmentLabels,
	isStatusPickerOpen,
	pName,
	onToggleStatusPicker,
	onCloseStatusPicker,
	onQuickStatusChange,
}) => {
	const normalizedLabel = getNormalizedAppointmentStatusLabel(a.status, appointmentLabels);
	const inChair = isAppointmentInChair(a.status);
	const elapsedMinutes = getAppointmentElapsedMinutes(a);
	const isCompleted = String(a.status).toLowerCase() === "completed";
	const isWaitingOrArrived =
		a.status === "arrived" ||
		(a.status as string) === "in_clinic" ||
		(a.status as string) === "waiting";

	return (
		<div className="flex items-center gap-1 shrink-0 relative">
			{/* Live Status Elapsed Badge for arrived in hall */}
			{isWaitingOrArrived && (
				<span
					className={
						elapsedMinutes <= 180
							? "text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shrink-0 hidden sm:inline-flex items-center gap-0.5"
							: "sr-only"
					}
					title="Пациент в холле: время ожидания с момента отметки"
					data-testid={`appointment-live-timer-arrived-${a.id}`}
				>
					<Clock size={10} className="shrink-0" />
					<span>{elapsedMinutes}м</span>
				</span>
			)}

			{/* Live Status Elapsed Badge for patient in dental chair */}
			{inChair && (
				<span
					className={
						elapsedMinutes <= 180
							? "text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 shrink-0 hidden sm:inline-flex items-center gap-1"
							: "sr-only"
					}
					title="Пациент у кресла: время текущего приёма"
					data-testid={`appointment-live-timer-chair-${a.id}`}
				>
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
					<span>{elapsedMinutes}м</span>
				</span>
			)}

			{/* Status Button with touch target safety */}
			<div className="relative shrink-0">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						if (onQuickStatusChange) {
							onToggleStatusPicker(a.id);
						}
					}}
					className={`h-[22px] min-h-[22px] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 transition-all cursor-pointer hover:opacity-90 active:scale-95 touch-manipulation sm:h-[22px] sm:min-h-[22px] relative before:absolute before:-inset-2 before:content-[''] before:z-10 sm:before:hidden ${getAppointmentStatusBadgeClasses(
						a.status,
					)}`}
					title={`Статус: ${normalizedLabel}. Нажмите для смены`}
					aria-label={`Сменить статус визита, текущий: ${normalizedLabel}`}
					data-testid={`appointment-card-status-badge-${a.id}`}
				>
					{inChair && (
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
					)}
					{isCompleted && (
						<Check size={10} className="shrink-0 text-current stroke-[2.5]" />
					)}
					<span className="whitespace-nowrap shrink-0">{normalizedLabel}</span>
				</button>

				{/* Status Picker Popover */}
				{onQuickStatusChange && (
					<GridAppointmentStatusPopover
						appointmentId={a.id}
						currentStatus={a.status}
						patientId={a.patientId}
						patientName={pName}
						isOpen={isStatusPickerOpen}
						onClose={onCloseStatusPicker}
						onQuickStatusChange={onQuickStatusChange}
					/>
				)}
			</div>
		</div>
	);
};
