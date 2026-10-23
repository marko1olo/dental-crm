import { Check, ChevronRight, Star } from "lucide-react";
import type React from "react";
import {
	BookingAnyDoctorCard,
	type BookingAnyDoctorCardProps,
} from "./BookingAnyDoctorCard";
import type { BookingDoctorData } from "./contracts/bookingContracts";

export type { BookingDoctorData, BookingAnyDoctorCardProps };
export { BookingAnyDoctorCard };

export interface BookingDoctorCardProps {
	readonly doctor: BookingDoctorData;
	readonly isSelected: boolean;
	readonly onSelect: (doctor: BookingDoctorData) => void;
	readonly className?: string;
}

export const BookingDoctorCard: React.FC<BookingDoctorCardProps> = ({
	doctor,
	isSelected,
	onSelect,
	className = "",
}) => {
	const initial = doctor.fullName.replace("Д-р ", "").trim()[0] || "В";
	const nextSlot = doctor.nextAvailableSlot;

	return (
		<button
			type="button"
			className={`dbw-doctor-card ${isSelected ? "selected" : ""} ${className}`}
			onClick={() => onSelect(doctor)}
			aria-pressed={isSelected}
		>
			<div className="dbw-doctor-main min-w-0">
				<div className="dbw-doctor-avatar flex-shrink-0" aria-hidden="true">
					{doctor.avatarUrl ? (
						<img
							src={doctor.avatarUrl}
							alt={doctor.fullName}
							loading="lazy"
							decoding="async"
						/>
					) : (
						<span>{initial}</span>
					)}
					<span className="dbw-doctor-status-dot" />
				</div>
				<div className="dbw-doctor-meta min-w-0 flex-1">
					<div className="dbw-doctor-name min-w-0 break-words text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
						<span>{doctor.fullName}</span>
						{isSelected && (
							<span className="dbw-doctor-selected-badge inline-flex items-center gap-0.5 text-xs text-teal-600 dark:text-teal-400 font-semibold">
								<Check size={14} />
							</span>
						)}
					</div>
					<div className="dbw-doctor-specialties min-w-0 break-words text-sm font-medium text-slate-600 dark:text-slate-300">
						{doctor.specialties.join(" • ")}
					</div>
					<div className="dbw-doctor-badges flex-wrap gap-1.5">
						<span className="dbw-badge-rating text-xs font-bold">
							<Star size={13} fill="#b45309" aria-hidden="true" />{" "}
							{doctor.rating.toFixed(2)}
						</span>
						<span className="dbw-badge-exp text-xs font-semibold">
							Стаж {doctor.experienceYears} лет
						</span>
						{nextSlot && (
							<span className="dbw-badge-slot text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-500/20">
								{nextSlot}
							</span>
						)}
						<span className="text-xs font-medium text-slate-500 dark:text-slate-400">
							({doctor.reviewsCount} отзывов)
						</span>
					</div>
					{doctor.bio && (
						<p className="dbw-doctor-bio min-w-0 break-words text-xs text-slate-600 dark:text-slate-300 mt-1.5">
							{doctor.bio}
						</p>
					)}
				</div>
			</div>
			<ChevronRight
				size={22}
				className="dbw-doctor-chevron text-slate-400 flex-shrink-0"
				aria-hidden="true"
			/>
		</button>
	);
};
