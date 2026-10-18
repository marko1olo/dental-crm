import React from "react";
import { Monitor, X } from "lucide-react";
import { TodayQueueBoard } from "../components/schedule/TodayQueueBoard";

export interface QueueBoardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: appointments
	readonly todayAppointments: readonly any[];
	readonly onUpdateAppointmentStatus?: ((appointmentId: string, newStatus: string) => void) | undefined;
	readonly onSelectAppointment?: ((appId: string) => void) | undefined;
}

export const QueueBoardModal: React.FC<QueueBoardModalProps> = ({
	isOpen,
	onClose,
	todayAppointments,
	onUpdateAppointmentStatus,
	onSelectAppointment,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
			role="dialog"
			aria-modal="true"
			data-testid="today-queue-board-modal"
		>
			<div className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] w-full max-w-5xl max-h-[92vh] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3 overflow-hidden">
				<div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-2.5">
					<h3 className="m-0 font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-2">
						<Monitor size={18} className="text-teal-600" />
						<span>Оперативная доска смены & ТВ-табло холла</span>
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
						aria-label="Закрыть доску очереди"
						data-testid="btn-close-queue-board-modal"
					>
						<X size={18} />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto">
					<TodayQueueBoard
						appointments={todayAppointments as any}
						onStatusChange={(appointmentId, newStatus) => {
							onUpdateAppointmentStatus?.(appointmentId, newStatus);
						}}
						onOpenAppointment={(appId) => {
							onClose();
							onSelectAppointment?.(appId);
						}}
					/>
				</div>
			</div>
		</div>
	);
};
