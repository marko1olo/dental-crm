import { Check, ChevronRight, Sparkles, Star } from "lucide-react";
import type React from "react";

export interface BookingDoctorData {
	id: string;
	fullName: string;
	specialties: string[];
	experienceYears: number;
	rating: number;
	reviewsCount: number;
	avatarUrl?: string | undefined;
	categoryIds: string[];
	bio?: string | undefined;
	workDays?: number[] | undefined; // 0 = Sun, 1 = Mon, ..., 6 = Sat
	workHours?: { startHour: number; endHour: number } | undefined;
}

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
					<div className="dbw-doctor-badges flex-wrap">
						<span className="dbw-badge-rating text-xs font-bold">
							<Star size={13} fill="#b45309" aria-hidden="true" />{" "}
							{doctor.rating.toFixed(2)}
						</span>
						<span className="dbw-badge-exp text-xs font-semibold">
							Стаж {doctor.experienceYears} лет
						</span>
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

export interface BookingAnyDoctorCardProps {
	readonly isSelected: boolean;
	readonly onSelect: () => void;
	readonly className?: string;
}

export const BookingAnyDoctorCard: React.FC<BookingAnyDoctorCardProps> = ({
	isSelected,
	onSelect,
	className = "",
}) => {
	return (
		<button
			type="button"
			className={`dbw-doctor-card ${isSelected ? "selected" : ""} ${className}`}
			onClick={onSelect}
			aria-pressed={isSelected}
		>
			<div className="dbw-doctor-main min-w-0">
				<div className="dbw-doctor-avatar any-specialist flex-shrink-0" aria-hidden="true">
					<Sparkles size={24} />
				</div>
				<div className="dbw-doctor-meta min-w-0 flex-1">
					<div className="dbw-doctor-name min-w-0 break-words text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
						<span>Любой свободный специалист</span>
						{isSelected && (
							<span className="dbw-doctor-selected-badge inline-flex items-center gap-0.5 text-xs text-teal-600 dark:text-teal-400 font-semibold">
								<Check size={14} />
							</span>
						)}
					</div>
					<div className="dbw-doctor-specialties min-w-0 break-words text-sm font-medium text-slate-600 dark:text-slate-300">
						Самая быстрая запись на ближайшее удобное время
					</div>
					<div className="dbw-doctor-badges flex-wrap">
						<span className="dbw-badge-rating text-xs font-bold">
							<Star size={13} fill="#b45309" aria-hidden="true" /> Рекомендуем
						</span>
						<span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
							Автоматический подбор
						</span>
					</div>
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
