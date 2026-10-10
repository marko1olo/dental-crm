/**
 * apps/web/src/components/settings/doctor/DoctorSpecialtyPresetsCard.tsx
 *
 * Пресеты по специальности врача.
 * Калибрует длительность приёма, препараты, иглы и материалы по умолчанию.
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8c: плотные отграниченные карточки bg-[var(--paper)], border border-[var(--line)].
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (мгновенное применение).
 */

import React from "react";
import { Check, Stethoscope } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	useDoctorPreferencesStore,
	type DoctorSpecialtyKey,
} from "../../../store/doctorPreferencesStore";
import { SPECIALTY_PRESET_ITEMS } from "../doctorClinicalPreferencesConstants";

export interface DoctorSpecialtyPresetsCardProps {
	readonly className?: string | undefined;
}

export function DoctorSpecialtyPresetsCard({ className = "" }: DoctorSpecialtyPresetsCardProps) {
	const specialty = useDoctorPreferencesStore((s) => s.preferences.specialty);
	const applySpecialtyPreset = useDoctorPreferencesStore((s) => s.applySpecialtyPreset);

	const handleSelectPreset = (key: DoctorSpecialtyKey, label: string) => {
		applySpecialtyPreset(key);
		showToast(`Профиль врача «${label}» активирован (кабинет перенастроен)`, "success");
	};

	return (
		<div
			className={`p-3.5 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2.5 shadow-xs ${className}`}
			data-testid="doctor-specialty-presets-card"
		>
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0">
						<Stethoscope size={15} />
					</div>
					<span className="text-xs font-bold text-[var(--ink)]">
						Специализация врача (калибровка профиля кабинета)
					</span>
				</div>
				<span className="text-[11px] text-[var(--muted)]">
					Мгновенная калибровка длительности, анестетиков и материалов
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
				{SPECIALTY_PRESET_ITEMS.map((spec) => {
					const isSelected = specialty === spec.key;
					const displayText = spec.shortLabel || spec.label;
					return (
						<button
							key={spec.key}
							type="button"
							onClick={() => handleSelectPreset(spec.key, spec.label)}
							className={`h-9 min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border select-none whitespace-nowrap ${
								isSelected
									? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs font-bold"
									: "bg-[var(--paper-card)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)]"
							}`}
							title={spec.title || spec.label}
							data-testid={`doctor-specialty-preset-${spec.key}`}
						>
							<span className="whitespace-nowrap">{displayText}</span>
							{isSelected && <Check size={13} className="stroke-[3] shrink-0" />}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export default DoctorSpecialtyPresetsCard;
