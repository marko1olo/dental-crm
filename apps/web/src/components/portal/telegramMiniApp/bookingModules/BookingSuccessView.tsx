/**
 * TELEGRAM MINI APP BOOKING — SUCCESS CONFIRMATION VIEW
 * (DOMAIN: Booking Success Receipt, Appointment Summary & Clinical Guide)
 */

import React from "react";
import { CheckCircle2, Info } from "lucide-react";
import type { BookingSuccessResult } from "./bookingTypes";

export interface BookingSuccessViewProps {
	bookingSuccessResult: BookingSuccessResult;
	patientFullName: string;
	onBackToTeeth?: (() => void) | undefined;
	onResetResult: () => void;
}

export const BookingSuccessView: React.FC<BookingSuccessViewProps> = ({
	bookingSuccessResult,
	patientFullName,
	onBackToTeeth,
	onResetResult,
}) => {
	return (
		<div className="tg-booking-success-card" data-testid="booking-success-card">
			<div className="w-16 h-16 rounded-full bg-[var(--tg-accent)]/20 text-[var(--tg-accent)] flex items-center justify-center mb-3">
				<CheckCircle2 size={36} />
			</div>

			<h3 className="text-lg font-bold text-[var(--tg-text)] text-center">
				Запись успешно оформлена!
			</h3>
			<p className="text-xs text-[var(--tg-text-muted)] text-center mt-1">
				Информация внесена в расписание клиники DENTE и привязана к вашей карте.
			</p>

			{/* Карточка детальных параметров визита */}
			<div className="w-full bg-[var(--tg-card-inner)] border border-[var(--tg-accent)]/30 rounded-2xl p-4 my-4 space-y-2.5 text-xs">
				<div className="flex justify-between items-center pb-2 border-b border-[var(--tg-border)]">
					<span className="text-[var(--tg-text-muted)]">Врач-стоматолог:</span>
					<span className="font-bold text-[var(--tg-text)]">
						{bookingSuccessResult.doctorName}
					</span>
				</div>
				<div className="flex justify-between items-center pb-2 border-b border-[var(--tg-border)]">
					<span className="text-[var(--tg-text-muted)]">Дата и время:</span>
					<span className="font-bold text-[var(--tg-accent)]">
						{bookingSuccessResult.dateString} в {bookingSuccessResult.time}
					</span>
				</div>
				<div className="flex justify-between items-center pb-2 border-b border-[var(--tg-border)]">
					<span className="text-[var(--tg-text-muted)]">Пациент:</span>
					<span className="font-bold text-[var(--tg-text)]">{patientFullName}</span>
				</div>

				{bookingSuccessResult.teethSummary && (
					<div className="pt-1">
						<span className="text-[var(--tg-text-muted)] block mb-1">
							Прикрепленные зубы и жалобы:
						</span>
						<div className="bg-[var(--tg-card-bg)] p-2 rounded-xl text-[var(--tg-accent)] font-semibold text-[11px] leading-relaxed border border-[var(--tg-accent)]/20">
							{bookingSuccessResult.teethSummary}
						</div>
					</div>
				)}
			</div>

			{/* Клиническая памятка */}
			<div className="w-full bg-[var(--tg-card-inner)] border border-[var(--tg-border)] rounded-xl p-3 text-xs text-[var(--tg-text-muted)] space-y-1.5 mb-4">
				<div className="flex items-center gap-1.5 font-bold text-amber-500">
					<Info size={14} />
					<span>Памятка перед приёмом:</span>
				</div>
				<p>• Не принимайте анальгетики за 3 часа до осмотра, чтобы не маскировать симптомы.</p>
				<p>• Приезжайте за 5–10 минут до приёма для спокойного оформления карты.</p>
			</div>

			<button
				type="button"
				className="tg-cta-button cursor-pointer"
				onClick={() => {
					onResetResult();
					onBackToTeeth?.();
				}}
				data-testid="booking-back-to-teeth-btn"
			>
				<span>Вернуться к зубной формуле</span>
			</button>
		</div>
	);
};
