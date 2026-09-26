/**
 * SelfCheckinTicketSection.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Renders the completed check-in pass: animated success badge,
 * electronic queue ticket number, doctor & cabinet waiting status,
 * reception / assistant notification alert, and verification QR code.
 */

import React, { memo } from "react";
import { CheckCircle2, HeartPulse, Ticket } from "lucide-react";

export interface SelfCheckinTicketSectionProps {
	readonly displayQueueTicket: string;
	readonly patientName: string;
	readonly appointmentTime: string;
	readonly doctorWaitMessage: string;
	readonly checkinQrSvg: string;
	readonly checkinCode: string;
	readonly onClose: () => void;
}

export const SelfCheckinTicketSection: React.FC<SelfCheckinTicketSectionProps> = memo(({
	displayQueueTicket,
	patientName,
	appointmentTime,
	doctorWaitMessage,
	checkinQrSvg,
	checkinCode,
	onClose,
}) => {
	return (
		<div className="selfcheckin-step-box selfcheckin-completed-box">
			{/* Green Animated Success Badge */}
			<div
				className="selfcheckin-animated-success-badge"
				data-testid="selfcheckin-animated-success-badge"
			>
				<div className="selfcheckin-success-ring">
					<CheckCircle2 size={48} className="selfcheckin-success-check-icon" />
				</div>
			</div>

			<h3 className="selfcheckin-completed-title">
				Самочекин успешно завершен!
			</h3>
			<p className="selfcheckin-completed-desc">
				Все согласия подтверждены, данные переданы лечащему врачу
			</p>

			{/* Queue Ticket Card */}
			<div className="selfcheckin-ticket-card" data-testid="queue-ticket-card">
				<div className="selfcheckin-ticket-header">
					<Ticket size={20} className="selfcheckin-ticket-icon shrink-0" />
					<span className="selfcheckin-ticket-header-label">
						Электронная очередь клиники
					</span>
				</div>

				{/* Prominent Large Queue Ticket Number */}
				<div
					className="selfcheckin-ticket-number-display"
					data-testid="queue-ticket-number"
				>
					{displayQueueTicket}
				</div>

				<div className="selfcheckin-ticket-divider" />

				<div className="selfcheckin-ticket-details w-full space-y-2">
					<div className="selfcheckin-ticket-patient-name text-center font-bold text-base text-slate-900 dark:text-slate-100">
						{patientName}
					</div>
					<div className="selfcheckin-ticket-time text-center text-xs text-slate-500 dark:text-slate-400">
						Время записи: {appointmentTime}
					</div>

					{/* Doctor & Cabinet Waiting Status */}
					<div
						className="selfcheckin-ticket-doctor-status"
						data-testid="doctor-wait-status"
					>
						<HeartPulse size={20} className="selfcheckin-ticket-doc-icon text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="selfcheckin-ticket-doc-text font-bold text-sm sm:text-base">
							{doctorWaitMessage}
						</span>
					</div>
				</div>

				{/* Reception & Assistant Schedule Notification Alert */}
				<div
					className="selfcheckin-reception-alert-badge"
					data-testid="reception-alert-badge"
				>
					<div className="selfcheckin-reception-alert-title flex items-center gap-2 font-bold text-xs sm:text-sm text-teal-800 dark:text-teal-200">
						<span className="selfcheckin-status-dot-pulse" />
						<span>
							Статус визита: <strong>В холле / Ожидает приёма</strong>
						</span>
					</div>
					<div className="selfcheckin-reception-alert-sub text-xs text-teal-700 dark:text-teal-300 mt-1">
						Оповещение передано на стойку регистрации и ассистенту в кабинет врача
					</div>
				</div>

				{/* QR Code Verification for Turnstile / Reception Desk */}
				<div className="selfcheckin-ticket-qr-section flex flex-col items-center gap-1 pt-2">
					<div
						className="selfcheckin-ticket-qr-svg"
						dangerouslySetInnerHTML={{ __html: checkinQrSvg }}
					/>
					<div className="selfcheckin-ticket-qr-caption text-xs font-semibold text-slate-500 dark:text-slate-400">
						Код талона: #{checkinCode}
					</div>
				</div>
			</div>

			<button
				type="button"
				className="selfcheckin-btn-primary w-full py-3.5 text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
				onClick={onClose}
				data-testid="selfcheckin-final-close-btn"
			>
				<span>Готово / Закрыть талон</span>
			</button>
		</div>
	);
});

SelfCheckinTicketSection.displayName = "SelfCheckinTicketSection";
