import React from "react";
import type { AppointmentCardContextMenuProps } from "./types";

interface ScheduleOpsProps {
	readonly appointment: AppointmentCardContextMenuProps["appointment"];
	readonly repeatAppointment: AppointmentCardContextMenuProps["repeatAppointment"];
	readonly copyAppointmentToBuffer?: AppointmentCardContextMenuProps["copyAppointmentToBuffer"];
	readonly openAppointmentEditor: AppointmentCardContextMenuProps["openAppointmentEditor"];
	readonly onClose: () => void;
}

const secBtn =
	"secondary-button w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer";

export const AppointmentScheduleOpsButtons: React.FC<ScheduleOpsProps> = ({
	appointment,
	repeatAppointment,
	copyAppointmentToBuffer,
	openAppointmentEditor,
	onClose,
}) => {
	return (
		<>
			<button
				type="button"
				className={`${secBtn} appointment-repeat-button`}
				role="menuitem"
				onClick={() => {
					onClose();
					repeatAppointment(appointment);
				}}
				title="Повторить запись (Клавиша R)"
			>
				<span>Повторить запись</span>
				<span className="text-[10px] font-mono opacity-70">R</span>
			</button>
			{copyAppointmentToBuffer && (
				<button
					type="button"
					className={`${secBtn} appointment-buffer-button`}
					role="menuitem"
					onClick={() => {
						onClose();
						copyAppointmentToBuffer(appointment);
					}}
					title="Скопировать в буфер (Клавиша B)"
				>
					<span>Скопировать в буфер</span>
					<span className="text-[10px] font-mono opacity-70">B</span>
				</button>
			)}
			<button
				type="button"
				className={`${secBtn} appointment-edit-button`}
				role="menuitem"
				onClick={() => {
					onClose();
					openAppointmentEditor(appointment);
				}}
				title="Настроить запись в редакторе (Клавиша Enter)"
			>
				<span>Настроить запись</span>
				<span className="text-[10px] font-mono opacity-70">Enter</span>
			</button>
		</>
	);
};

export default AppointmentScheduleOpsButtons;
