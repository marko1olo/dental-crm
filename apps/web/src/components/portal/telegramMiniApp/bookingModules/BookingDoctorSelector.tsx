/**
 * TELEGRAM MINI APP BOOKING — DOCTOR & CATEGORY SELECTOR
 * (DOMAIN: Medical Category Chips, Doctor Cards with Rating and Experience)
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
	type DoctorProfile,
	type SpecialistCategory,
	SPECIALIST_CATEGORIES,
} from "./bookingTypes";

export interface BookingDoctorSelectorProps {
	activeCategory: SpecialistCategory;
	filteredDoctors: DoctorProfile[];
	selectedDoctorId: string;
	onSelectCategory: (category: SpecialistCategory) => void;
	onSelectDoctor: (doctorId: string) => void;
}

export const BookingDoctorSelector: React.FC<BookingDoctorSelectorProps> = ({
	activeCategory,
	filteredDoctors,
	selectedDoctorId,
	onSelectCategory,
	onSelectDoctor,
}) => {
	return (
		<div className="space-y-3">
			{/* 1. ВЫБОР СПЕЦИАЛИСТА / НАПРАВЛЕНИЯ */}
			<div>
				<div className="text-xs font-bold text-[var(--tg-text)] mb-1.5 flex items-center gap-1.5">
					<span>1. Выберите направление приёма</span>
				</div>

				<div className="grid grid-cols-2 gap-1.5">
					{SPECIALIST_CATEGORIES.map((cat) => {
						const isSel = activeCategory === cat.id;
						const Icon = cat.icon;
						return (
							<button
								key={cat.id}
								type="button"
								className={`tg-specialist-chip ${isSel ? "selected" : ""}`}
								onClick={() => onSelectCategory(cat.id)}
							>
								<div className="flex items-center gap-2 mb-0.5">
									<div
										className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
											isSel
												? "bg-[var(--tg-accent)] text-white"
												: "bg-[var(--tg-border)] text-[var(--tg-text-muted)]"
										}`}
									>
										<Icon size={14} />
									</div>
									<span className="text-xs font-bold text-[var(--tg-text)] truncate">
										{cat.title}
									</span>
								</div>
								<div className="text-[10px] text-[var(--tg-text-muted)] truncate leading-tight">
									{cat.subtitle}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. ВЫБОР ВРАЧА */}
			<div>
				<div className="text-xs font-bold text-[var(--tg-text)] mb-1.5 flex items-center justify-between">
					<span>2. Лечащий врач</span>
					<span className="text-[11px] text-[var(--tg-accent)] font-medium">
						Специалисты клиники
					</span>
				</div>

				<div className="space-y-1.5">
					{filteredDoctors.length === 0 ? (
						<div className="tg-empty-card py-3 text-center text-xs text-[var(--tg-text-muted)]">
							Нет доступных специалистов в данной категории
						</div>
					) : (
						filteredDoctors.map((doc) => {
							const isSel = selectedDoctorId === doc.id;
							return (
								<div
									key={doc.id}
									className={`tg-doctor-card ${isSel ? "selected" : ""}`}
									onClick={() => onSelectDoctor(doc.id)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											onSelectDoctor(doc.id);
										}
									}}
								>
									<div className="tg-doctor-avatar">{doc.initials}</div>
									<div className="flex-1 min-w-0">
										<div className="text-xs font-bold text-[var(--tg-text)] flex items-center gap-1.5">
											<span>{doc.name}</span>
											<span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
												★ {doc.rating}
											</span>
										</div>
										<div className="text-[11px] text-[var(--tg-text-muted)] truncate">
											{doc.specialty}
										</div>
										<div className="text-[10px] text-[var(--tg-accent)] font-semibold">
											Стаж практики: {doc.experience}
										</div>
									</div>
									{isSel && (
										<CheckCircle2
											size={18}
											className="text-[var(--tg-accent)] flex-shrink-0"
										/>
									)}
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
};
