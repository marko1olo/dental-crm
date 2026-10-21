import type { Appointment } from "@dental/shared";
import { CreditCard } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import { GridAppointmentStatusPopoverItems } from "./GridAppointmentStatusPopoverItems";

export interface GridAppointmentStatusPopoverProps {
	appointmentId: string;
	currentStatus: Appointment["status"];
	patientId?: string | null | undefined;
	patientName: string;
	isOpen: boolean;
	onClose: () => void;
	onQuickStatusChange: (id: string, status: Appointment["status"]) => void;
}

export function GridAppointmentStatusPopover({
	appointmentId,
	currentStatus,
	patientId,
	patientName,
	isOpen,
	onClose,
	onQuickStatusChange,
}: GridAppointmentStatusPopoverProps) {
	if (!isOpen) return null;

	const handlePayClick = () => {
		onClose();
		if (patientId) {
			usePatientStore.getState().setSelectedPatientId(patientId);
		}
		useAppStore.getState().setCurrentView("finance");
		showToast(`Касса: расчёт ${patientName}`, "info");
	};

	return (
		<div
			className="absolute right-0 top-full mt-1 z-50 p-1.5 rounded-xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[190px] max-w-[240px] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					e.stopPropagation();
					onClose();
				} else {
					e.stopPropagation();
				}
			}}
			role="dialog"
			aria-label="Статус визита"
			tabIndex={-1}
			data-testid={`appointment-status-picker-popover-${appointmentId}`}
		>
			<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
				Статус визита
			</div>
			<GridAppointmentStatusPopoverItems
				appointmentId={appointmentId}
				currentStatus={currentStatus}
				patientId={patientId}
				patientName={patientName}
				onClose={onClose}
				onQuickStatusChange={onQuickStatusChange}
			/>
			<button
				type="button"
				onClick={handlePayClick}
				className="w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-bold transition-colors cursor-pointer border-t border-[var(--line)] pt-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
				data-testid={`quick-status-picker-pay-${appointmentId}`}
				title="Перейти к приёму оплаты на кассе"
			>
				<CreditCard
					size={13}
					className="text-emerald-600 dark:text-emerald-400"
				/>
				<span>Оплата на кассе</span>
			</button>
		</div>
	);
}
export { GridAppointmentStatusPopoverItems };
