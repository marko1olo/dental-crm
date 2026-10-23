import type { Appointment, Dashboard } from "@dental/shared";
import { Copy, CreditCard, FileText, Printer, Repeat } from "lucide-react";
import React from "react";
import { usePatientStore } from "../../../store/patientStore";
import {
	handlePrintBlankConsent,
	handlePrintBlankContract,
} from "./headerPrintActions";

export interface AppointmentModalHeaderMoreMenuProps {
	isOpen: boolean;
	onClose: () => void;
	patientId: string;
	currentPatientName: string;
	isNewAppointment: boolean;
	dashboard: Dashboard;
	appointment: Appointment;
	onModalClose: () => void;
	repeatAppointment?: ((appointment: Appointment) => void) | undefined;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
}

export function AppointmentModalHeaderMoreMenu({
	isOpen,
	onClose,
	patientId,
	currentPatientName,
	isNewAppointment,
	dashboard,
	appointment,
	onModalClose,
	repeatAppointment,
	copyAppointmentToBuffer,
}: AppointmentModalHeaderMoreMenuProps) {
	if (!isOpen) {
		return (
			<div className="hidden" aria-hidden="true">
				{patientId && !isNewAppointment && (
					<button
						type="button"
						data-testid="appointment-modal-menu-pay-btn"
					>
						<span>Принять оплату</span>
					</button>
				)}
				<button
					type="button"
					data-testid="appointment-modal-menu-print-blank-contract-btn"
				>
					<span>Бланк договора</span>
				</button>
				<button
					type="button"
					data-testid="appointment-modal-print-blank-consent-btn"
				>
					<span>Бланк ИДС</span>
				</button>
				{repeatAppointment && (
					<button
						type="button"
						data-testid="appointment-modal-repeat-btn"
					>
						<span>Повторить</span>
					</button>
				)}
				{copyAppointmentToBuffer && (
					<button
						type="button"
						data-testid="appointment-modal-copy-btn"
					>
						<span>В буфер</span>
					</button>
				)}
			</div>
		);
	}

	return (
		<>
			<div
				className="fixed inset-0 z-20 cursor-default"
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl z-30 py-1"
				data-testid="appointment-modal-more-menu"
			>
				{patientId && !isNewAppointment && (
					<button
						type="button"
						onClick={() => {
							onClose();
							onModalClose();
							usePatientStore.getState().setSelectedPatientId(patientId);
							window.dispatchEvent(
								new CustomEvent("dente:open-payment-modal", {
									detail: {
										patientId,
										patientName: currentPatientName,
									},
								}),
							);
						}}
						className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
						data-testid="appointment-modal-menu-pay-btn"
					>
						<CreditCard
							size={14}
							className="text-emerald-600 dark:text-emerald-400 shrink-0"
						/>
						<span className="truncate">Касса / Оплата</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => {
						onClose();
						handlePrintBlankContract(dashboard, patientId, currentPatientName);
					}}
					className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
					data-testid="appointment-modal-menu-print-blank-contract-btn"
				>
					<Printer
						size={14}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
					<span className="truncate">Бланк договора (_______)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onClose();
						handlePrintBlankConsent(dashboard, patientId, currentPatientName);
					}}
					className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
					data-testid="appointment-modal-print-blank-consent-btn"
				>
					<FileText
						size={14}
						className="text-cyan-600 dark:text-cyan-400 shrink-0"
					/>
					<span className="truncate">Бланк ИДС</span>
				</button>
				{repeatAppointment && !isNewAppointment && (
					<button
						type="button"
						onClick={() => {
							onClose();
							repeatAppointment(appointment);
						}}
						className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors border-t border-[var(--line)]/50"
						data-testid="appointment-modal-repeat-btn"
					>
						<Repeat size={14} className="text-[var(--muted)] shrink-0" />
						<span>Повторить</span>
					</button>
				)}
				{copyAppointmentToBuffer && !isNewAppointment && (
					<button
						type="button"
						onClick={() => {
							onClose();
							copyAppointmentToBuffer(appointment);
						}}
						className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
						data-testid="appointment-modal-copy-btn"
					>
						<Copy size={14} className="text-[var(--muted)] shrink-0" />
						<span>В буфер</span>
					</button>
				)}
			</div>
		</>
	);
}
