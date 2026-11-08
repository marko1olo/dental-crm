/**
 * TELEGRAM MINI APP BOOKING (DENTE POCKET CLINIC) — UNIFIED CANONICAL FACADE
 * Unified onto PublicBookingWidget (SSOT) per Mandate 8s & Mandate 8bd.
 * (Apple HIG & Clinical Ergonomics: Thumb Zone, Touch Targets >= 44x44px, Zero Overflow)
 */

import React, { memo } from "react";
import { PublicBookingWidget } from "../../booking/PublicBookingWidget";
import type { ToothComplaint } from "./TelegramInteractiveToothPicker";

export type SpecialistCategory = "therapist" | "surgeon" | "orthodontist" | "hygienist";

export interface DoctorProfile {
	id: string;
	name: string;
	specialty: string;
	category: SpecialistCategory;
	experience: string;
	initials: string;
	rating: number;
}

export const SPECIALIST_CATEGORIES: Array<{
	id: SpecialistCategory;
	title: string;
	subtitle: string;
}> = [
	{ id: "therapist", title: "Терапевт", subtitle: "Кариес, пломбы, каналы" },
	{ id: "surgeon", title: "Хирург / Имплантолог", subtitle: "Удаление, имплантация" },
	{ id: "orthodontist", title: "Ортодонт", subtitle: "Прикус, брекеты, элайнеры" },
	{ id: "hygienist", title: "Гигиенист", subtitle: "Чистка Air-Flow, дёсны" },
];

export interface TelegramMiniAppBookingProps {
	readonly organizationId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly attachedComplaints?: readonly ToothComplaint[] | undefined;
	readonly onBackToTeeth?: () => void;
	readonly onBookingComplete?: (
		appointmentId: string,
		createdAppointment?: {
			id: string;
			dateStr: string;
			timeStr: string;
			doctorName: string;
			doctorRole: string;
			cabinet: string;
			procedureTitle: string;
			durationMinutes: number;
			isConfirmed: boolean;
			isPast: boolean;
			toothNumber?: number | undefined;
		},
	) => void;
}

export const TelegramMiniAppBooking: React.FC<TelegramMiniAppBookingProps> = memo(({
	organizationId,
	patientId,
	attachedComplaints = [],
	onBackToTeeth,
	onBookingComplete,
}) => {
	const complaintsCount = attachedComplaints?.length || 0;
	const toothWord = complaintsCount === 1 ? "зуб" : complaintsCount < 5 ? "зуба" : "зубов";

	return (
		<div
			className="tg-booking-container"
			data-testid="tg-booking-container"
			style={{ overflowX: "clip", maxWidth: "100vw" }}
		>
			{complaintsCount > 0 && (
				<div
					className="tg-attached-teeth-card p-3 mb-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]"
					data-testid="tg-attached-teeth-banner"
				>
					<div className="flex items-center justify-between gap-2">
						<span className="font-semibold text-xs text-[var(--ink)]">
							Выбрано для осмотра: {complaintsCount} {toothWord}
						</span>
						{onBackToTeeth && (
							<button
								type="button"
								onClick={onBackToTeeth}
								data-testid="booking-back-to-teeth-btn"
								className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
							>
								<span>К зубной формуле</span>
							</button>
						)}
					</div>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{attachedComplaints.map((c) => (
							<span
								key={c.toothNumber}
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)]"
							>
								<strong>{`#${c.toothNumber}`}</strong>
								<span>{c.symptomLabel}</span>
								{c.cito && <span className="text-rose-500 font-bold text-[10px]">CITO</span>}
							</span>
						))}
					</div>
				</div>
			)}

			<PublicBookingWidget
				organizationId={organizationId}
				patientId={patientId ?? undefined}
				embedMode="telegram"
				compact={true}
				theme="auto"
				onSuccess={(booking) => {
					onBookingComplete?.(booking.referenceNumber, {
						id: booking.referenceNumber,
						dateStr: booking.date,
						timeStr: booking.time,
						doctorName: booking.doctor?.fullName || "Врач клиники",
						doctorRole: booking.doctor?.specialties?.[0] || "Врач-стоматолог",
						cabinet: booking.cabinetNumber || "Кабинет клиники",
						procedureTitle: booking.category?.title || "Стоматологический приём",
						durationMinutes: booking.category?.durationMinutes || 30,
						isConfirmed: booking.status === "confirmed",
						isPast: false,
					});
				}}
			/>
		</div>
	);
});

TelegramMiniAppBooking.displayName = "TelegramMiniAppBooking";
export default TelegramMiniAppBooking;
