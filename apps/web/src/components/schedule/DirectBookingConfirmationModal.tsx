/**
 * DirectBookingConfirmationModal.tsx
 * Canonical Direct Booking Confirmation Modal for DENTE Dental CRM.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8b (Clean Decomposition).
 */

import React from "react";
import { CheckCircle2, Copy, Printer, Share2, X } from "lucide-react";
import { showToast } from "../GlobalToast";

export interface DirectBookingConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName: string;
	patientPhone?: string;
	startsAtLocal: string;
	durationMinutes: number;
	doctorName?: string;
	chairName?: string;
	onPrintTicket?: () => void;
}

export const DirectBookingConfirmationModal: React.FC<DirectBookingConfirmationModalProps> = ({
	isOpen,
	onClose,
	patientName,
	patientPhone,
	startsAtLocal,
	durationMinutes,
	doctorName,
	chairName,
	onPrintTicket,
}) => {
	if (!isOpen) return null;

	const handleCopyConfirmation = async () => {
		const text = [
			`Здравствуйте, ${patientName}!`,
			`Вы записаны на приём в клинику.`,
			`Дата и время: ${startsAtLocal.replace("T", " ")} (${durationMinutes} мин)`,
			doctorName ? `Врач: ${doctorName}` : null,
			chairName ? `Кабинет: ${chairName}` : null,
			`Пожалуйста, сообщите нам при необходимости изменить время.`,
		]
			.filter(Boolean)
			.join("\n");

		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(text);
				showToast("Детали записи скопированы для WhatsApp/Telegram", "success");
			}
		} catch {
			showToast("Не удалось скопировать в буфер", "error");
		}
	};

	return (
		<div
			className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Подтверждение записи на приём"
			data-testid="direct-booking-confirmation-modal"
		>
			<div className="relative w-full max-w-md bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-2xl p-6 flex flex-col gap-5 text-[var(--ink)]">
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)]">
							<CheckCircle2 size={24} className="stroke-[2.5]" />
						</div>
						<div>
							<h3 className="text-base font-bold text-[var(--ink)] m-0">Пациент успешно записан</h3>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">Визит зафиксирован в расписании</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						aria-label="Закрыть"
						data-testid="confirmation-modal-close-btn"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-sm">
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted)]">Пациент:</span>
						<span className="font-semibold text-[var(--ink)]" data-testid="confirmation-patient-name">{patientName}</span>
					</div>
					{patientPhone && (
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Телефон:</span>
							<span className="font-mono text-xs text-[var(--ink)]">{patientPhone}</span>
						</div>
					)}
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted)]">Время приёма:</span>
						<span className="font-semibold text-[var(--ink)] font-mono">{startsAtLocal.replace("T", " ")}</span>
					</div>
					{doctorName && (
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Врач:</span>
							<span className="text-[var(--ink)]">{doctorName}</span>
						</div>
					)}
					{chairName && (
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Кабинет:</span>
							<span className="text-[var(--ink)]">{chairName}</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopyConfirmation}
						className="secondary-button flex-1 min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)]/40 text-[var(--ink)] font-semibold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
						data-testid="confirmation-copy-whatsapp-btn"
					>
						<Share2 size={16} className="text-[var(--teal,#0d9488)]" />
						<span>WhatsApp / Telegram</span>
					</button>
					{onPrintTicket && (
						<button
							type="button"
							onClick={onPrintTicket}
							className="secondary-button min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)]/40 text-[var(--ink)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
							data-testid="confirmation-print-ticket-btn"
							title="Распечатать талон записи"
						>
							<Printer size={16} />
							<span>Печать талона</span>
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={onClose}
					className="primary-button w-full min-h-[44px] h-[48px] rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-sm shadow-xs hover:bg-[var(--teal-dark,#0f766e)] transition-all cursor-pointer"
					data-testid="confirmation-done-btn"
				>
					Готово
				</button>
			</div>
		</div>
	);
};

export default DirectBookingConfirmationModal;
