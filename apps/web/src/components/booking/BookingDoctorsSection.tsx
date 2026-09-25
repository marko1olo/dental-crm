/**
 * DENTE Dental CRM — Booking Doctors Section (Solo Doctor Banner / Doctor List)
 *
 * Mandate 8s & Mandate 8n (Solo Doctor Scale Sovereignty)
 */

import type React from "react";
import { Sparkles, Star, UserCheck } from "lucide-react";
import {
	BookingAnyDoctorCard,
	BookingDoctorCard,
	type BookingDoctorData,
} from "./BookingDoctorCard";

export interface BookingDoctorsSectionProps {
	isSoloDoctor: boolean;
	selectedDoctor: BookingDoctorData;
	activeDoctors: BookingDoctorData[];
	selectedDoctorId: string | null;
	onSelectDoctorId: (id: string | null) => void;
}

export const BookingDoctorsSection: React.FC<BookingDoctorsSectionProps> = ({
	isSoloDoctor,
	selectedDoctor,
	activeDoctors,
	selectedDoctorId,
	onSelectDoctorId,
}) => {
	if (isSoloDoctor) {
		return (
			<div
				className="dbw-solo-doctor-banner mb-4"
				data-testid="solo-doctor-banner"
			>
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<div className="dbw-solo-avatar w-10 h-10 rounded-full overflow-hidden bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center shrink-0 border border-teal-500/30">
						{selectedDoctor.avatarUrl ? (
							<img
								src={selectedDoctor.avatarUrl}
								alt={selectedDoctor.fullName}
								className="w-full h-full object-cover"
								loading="lazy"
								decoding="async"
							/>
						) : (
							<UserCheck size={20} />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								Ваш доктор:
							</span>
							<span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
								{selectedDoctor.fullName}
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap mt-0.5">
							<span className="truncate">
								{selectedDoctor.specialties.join(", ")} • Стаж {selectedDoctor.experienceYears} лет (Опыт {selectedDoctor.experienceYears} лет)
							</span>
							<span className="dbw-badge-rating text-[11px] font-bold py-0.5 px-1.5 rounded inline-flex items-center gap-0.5 shrink-0">
								<Star size={11} fill="#b45309" aria-hidden="true" />
								{selectedDoctor.rating.toFixed(1)}
							</span>
						</div>
					</div>
				</div>
				<span className="dbw-solo-tag shrink-0">
					<Sparkles size={12} /> Соло-доктор
				</span>
			</div>
		);
	}

	if (activeDoctors.length > 1) {
		return (
			<div className="mb-4">
				<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
					Лечащий врач:
				</div>
				<div className="dbw-doctors-list">
					<BookingAnyDoctorCard
						isSelected={selectedDoctorId === null}
						onSelect={() => onSelectDoctorId(null)}
					/>
					{activeDoctors.map((doc) => (
						<BookingDoctorCard
							key={doc.id}
							doctor={doc}
							isSelected={selectedDoctorId === doc.id}
							onSelect={(d) => onSelectDoctorId(d.id)}
						/>
					))}
				</div>
			</div>
		);
	}

	return null;
};
