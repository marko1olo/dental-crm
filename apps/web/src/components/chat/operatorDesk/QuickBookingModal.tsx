import React from "react";
import { Calendar, Check, RefreshCw, User, X } from "lucide-react";
import { formatPhoneDisplay } from "../../../store/telephonyStore";
import type { DoctorOption, InboxConversation } from "./types";

export interface QuickBookingModalProps {
	isOpen: boolean;
	activeConv: InboxConversation | null;
	bookingDate: string;
	bookingTime: string;
	bookingReason: string;
	bookingDoctorId: string;
	bookingSendConfirmation: boolean;
	isBookingSubmitting: boolean;
	doctorsList: DoctorOption[];
	onClose: () => void;
	onDateChange: (date: string) => void;
	onTimeChange: (time: string) => void;
	onReasonChange: (reason: string) => void;
	onDoctorIdChange: (doctorId: string) => void;
	onSendConfirmationChange: (send: boolean) => void;
	onSubmit: (e: React.FormEvent) => void;
}

export function QuickBookingModal({
	isOpen,
	activeConv,
	bookingDate,
	bookingTime,
	bookingReason,
	bookingDoctorId,
	bookingSendConfirmation,
	isBookingSubmitting,
	doctorsList,
	onClose,
	onDateChange,
	onTimeChange,
	onReasonChange,
	onDoctorIdChange,
	onSendConfirmationChange,
	onSubmit,
}: QuickBookingModalProps) {
	if (!isOpen || !activeConv) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
			data-testid="quick-booking-modal"
		>
			<div className="w-full max-w-lg rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl p-5 text-[var(--ink,#0f172a)] my-auto animate-in fade-in zoom-in-95 duration-150">
				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
							<Calendar size={18} />
						</div>
						<div>
							<h3 className="font-bold text-base leading-tight">
								Быстрая запись на приём из чата
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{activeConv.channel.toUpperCase()} • Пациент: {activeConv.patientName}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
						title="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3.5">
					{/* Patient Info Banner */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs">
						<div className="flex items-center gap-2">
							<User size={15} className="text-teal-600" />
							<span className="font-bold">{activeConv.patientName}</span>
						</div>
						{activeConv.phone && (
							<span className="font-mono text-[var(--muted,#64748b)]">
								{formatPhoneDisplay(activeConv.phone)}
							</span>
						)}
					</div>

					{/* Date & Time Row */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="flex flex-col gap-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-date">
								Дата приёма:
							</label>
							<input
								id="booking-date"
								type="date"
								value={bookingDate}
								onChange={(e) => onDateChange(e.target.value)}
								className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
								required
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-time">
								Время начала:
							</label>
							<input
								id="booking-time"
								type="time"
								value={bookingTime}
								onChange={(e) => onTimeChange(e.target.value)}
								className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
								required
							/>
						</div>
					</div>

					{/* Quick Time Chips */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[10px] text-[var(--muted,#64748b)] uppercase font-bold mr-1">
							Слоты:
						</span>
						{["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => onTimeChange(t)}
								className={`px-2.5 py-1 rounded-md text-[12px] font-medium border transition-colors cursor-pointer min-w-max ${
									bookingTime === t
										? "bg-teal-600 text-white border-teal-600 shadow-xs"
										: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
								}`}
							>
								{t}
							</button>
						))}
					</div>

					{/* Doctor Select */}
					<div className="flex flex-col gap-1">
						<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-doctor">
							Лечащий врач:
						</label>
						<select
							id="booking-doctor"
							value={bookingDoctorId}
							onChange={(e) => onDoctorIdChange(e.target.value)}
							className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
						>
							<option value="">Дежурный врач (первый доступный)</option>
							{doctorsList.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.fullName}
								</option>
							))}
						</select>
					</div>

					{/* Reason / Notes */}
					<div className="flex flex-col gap-1">
						<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-reason">
							Причина обращения / услуга:
						</label>
						<input
							id="booking-reason"
							type="text"
							value={bookingReason}
							onChange={(e) => onReasonChange(e.target.value)}
							placeholder="Консультация, осмотр, острая боль..."
							className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
						/>
						{/* Quick Reason Chips */}
						<div className="flex items-center gap-1.5 flex-wrap mt-1">
							{[
								"Консультация и осмотр",
								"Острая зубная боль",
								"Профгигиена полости рта",
								"Лечение кариеса",
								"Удаление зуба",
							].map((r) => (
								<button
									key={r}
									type="button"
									onClick={() => onReasonChange(r)}
									className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink)] cursor-pointer"
								>
									{r}
								</button>
							))}
						</div>
					</div>

					{/* Confirmation in Chat Checkbox */}
					<label className="flex items-center gap-2 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-xs cursor-pointer select-none">
						<input
							type="checkbox"
							checked={bookingSendConfirmation}
							onChange={(e) => onSendConfirmationChange(e.target.checked)}
							className="rounded text-teal-600 focus:ring-teal-500"
						/>
						<span className="font-semibold text-teal-900 dark:text-teal-200">
							Отправить красивое подтверждение визита пациенту в {activeConv.channel.toUpperCase()}
						</span>
					</label>

					{/* Modal Footer Buttons */}
					<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] mt-1">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							disabled={isBookingSubmitting}
							className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
							data-testid="submit-quick-booking-btn"
						>
							{isBookingSubmitting ? (
								<RefreshCw size={15} className="animate-spin" />
							) : (
								<Check size={15} />
							)}
							<span>Забронировать визит</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
