import React from "react";
import { Calendar, Phone, User } from "lucide-react";
import { formatPhoneNumber } from "../../../../utils/inputSanitation";
import { PatientSafetyBanner } from "./PatientSafetyBanner";
import { PatientRepresentativesSection } from "./PatientRepresentativesSection";
import type { PatientDemographicsBasicCardProps } from "./types";

export const PatientDemographicsBasicCard: React.FC<PatientDemographicsBasicCardProps> = React.memo(
	function PatientDemographicsBasicCard({
		patient,
		currentProfile,
		disabled = false,
		onUpdatePatient,
		onToggleAllergy,
		onApplySomaticNorm,
		onUpdateSafetyProfile,
	}) {
		return (
			<div className="flex flex-col gap-4 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] shadow-xs">
				{/* Шапка базовой карточки */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
					<div className="flex items-center gap-2.5">
						<div className="w-7 h-7 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
							<User className="w-4 h-4" />
						</div>
						<div>
							<h3 className="text-sm font-black m-0 text-[var(--ink)]">
								Основные сведения пациента
							</h3>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Базовые данные, экспресс-соматика и законный представитель
							</p>
						</div>
					</div>
					<span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-teal-50 dark:bg-teal-950/50 text-[var(--teal)] border border-teal-200 dark:border-teal-800 shrink-0">
						Быстрое заполнение
					</span>
				</div>

				{/* Основные поля ввода: ФИО, Телефон, Дата рождения */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
					<div className="flex flex-col gap-1 md:col-span-2">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<User className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>ФИО Пациента *</span>
						</label>
						<input
							type="text"
							className="min-h-[44px] sm:min-h-[32px] h-8 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
							value={patient?.fullName ?? ""}
							onChange={(e) => onUpdatePatient?.("fullName", e.target.value)}
							placeholder="Фамилия Имя Отчество"
							disabled={disabled}
							data-testid="input-patient-fullname"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Phone className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Телефон *</span>
						</label>
						<input
							type="tel"
							className="min-h-[44px] sm:min-h-[32px] h-8 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
							value={patient?.phone ?? ""}
							onChange={(e) => onUpdatePatient?.("phone", formatPhoneNumber(e.target.value))}
							placeholder="+7 (___) ___-__-__"
							disabled={disabled}
							data-testid="input-patient-phone"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>Дата рождения</span>
						</label>
						<input
							type="date"
							className="min-h-[44px] sm:min-h-[32px] h-8 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
							value={patient?.birthDate ?? ""}
							onChange={(e) => onUpdatePatient?.("birthDate", e.target.value)}
							disabled={disabled}
							data-testid="input-patient-birthdate"
						/>
					</div>
				</div>

				{/* Экспресс-соматика и аллергии */}
				<PatientSafetyBanner
					currentProfile={currentProfile}
					disabled={disabled}
					mode="compact"
					onToggleAllergy={onToggleAllergy}
					onApplySomaticNorm={onApplySomaticNorm}
					onUpdateSafetyProfile={onUpdateSafetyProfile}
				/>

				{/* Законный представитель / Член семьи */}
				<PatientRepresentativesSection
					patient={patient}
					onUpdatePatient={onUpdatePatient}
					disabled={disabled}
					mode="compact"
				/>
			</div>
		);
	},
);

export default PatientDemographicsBasicCard;
