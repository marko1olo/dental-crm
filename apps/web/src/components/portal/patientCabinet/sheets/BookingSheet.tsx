import React from "react";
import { Calendar, X } from "lucide-react";
import { PublicBookingWidget } from "../../../booking/PublicBookingWidget";
import type { PatientPersonalCabinetData } from "../engine/patientCabinetProfileTypes";

export interface BookingSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly curatingDoctor?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctors?: readonly { id: string; fullName: string; specialties?: string[] | null }[] | undefined;
	readonly onBookAppointment?: ((req: {
		specialty: string;
		preferredDate: string;
		note: string;
		doctorName?: string;
		doctorId?: string;
	}) => void | Promise<void>) | undefined;
	readonly onShowToast?: ((msg: string) => void) | undefined;
	readonly data?: PatientPersonalCabinetData | undefined;
	readonly onSubmit?: ((req: {
		goalId: string;
		doctorId: string;
		doctorName?: string;
		date: string;
		time: string;
		comment: string;
	}) => void | Promise<void>) | undefined;
}

export const BookingSheet: React.FC<BookingSheetProps> = ({
	isOpen,
	onClose,
	patientName,
	patientPhone,
	onBookAppointment,
	onShowToast,
	data,
	onSubmit,
}) => {
	if (!isOpen) return null;

	const resolvedName = patientName || data?.fullName || "Пациент";
	const resolvedPhone = patientPhone || data?.phone || undefined;
	const effectiveOrgId = data?.organizationId || undefined;

	return (
		<div
			className="pc-sheet-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Онлайн-запись на приём"
		>
			<div
				className="pc-sheet-window"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", overflowX: "clip" }}
				data-testid="patient-booking-sheet"
			>
				{/* Top Drag Handle (Apple HIG) */}
				<div className="pc-sheet-handle-bar">
					<div className="pc-sheet-handle" />
				</div>

				{/* Header */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Calendar size={20} style={{ color: "var(--pc-primary, var(--primary))" }} />
						<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "var(--pc-text-main, var(--ink))" }}>
							Онлайн-запись на приём
						</h3>
					</div>
					<button
						type="button"
						className="pc-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Canonical Booking Widget with real live backend slots */}
				<PublicBookingWidget
					compact={true}
					embedMode="modal"
					theme="auto"
					organizationId={effectiveOrgId}
					patientId={data?.patientId || undefined}
					initialPatientName={resolvedName}
					initialPatientPhone={resolvedPhone}
					requireSmsVerification={false}
					showToast={(msg) => onShowToast?.(msg)}
					onSuccess={(booking) => {
						const selectedGoal = booking.service?.title || booking.category?.title || "Консультация стоматолога";
						if (onSubmit) {
							onSubmit({
								goalId: selectedGoal,
								doctorId: booking.doctor?.id || "",
								date: booking.date,
								time: booking.time,
								comment: booking.comment || "",
								...(booking.doctor?.fullName ? { doctorName: booking.doctor.fullName } : {}),
							});
						}
						if (onBookAppointment) {
							onBookAppointment({
								specialty: selectedGoal,
								preferredDate: `${booking.date} ${booking.time}`,
								doctorName: booking.doctor?.fullName || "Лечащий врач",
								note: booking.comment || selectedGoal,
								...(booking.doctor?.id ? { doctorId: booking.doctor.id } : {}),
							});
						}
						onShowToast?.(`Запись подтверждена на ${booking.date} в ${booking.time}!`);
						onClose();
					}}
				/>
			</div>
		</div>
	);
};

export default BookingSheet;
