import React from "react";
import { HeartPulse, ZapOff } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";

export interface AnamnesisCardioAndHemostasisSectionProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly onUpdateField: <K extends keyof PatientClinicalSafetyProfile>(key: K, value: PatientClinicalSafetyProfile[K]) => void;
}

export const AnamnesisCardioAndHemostasisSection: React.FC<AnamnesisCardioAndHemostasisSectionProps> = React.memo(({ profile, onUpdateField }) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
			<div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
				<HeartPulse size={16} className="text-rose-500" />
				<span>Кардиология, гемостаз и стоп-факторы</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
				<label className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasPacemakerExs)}
						onChange={(e) => onUpdateField("hasPacemakerExs", e.target.checked)}
						className="mt-0.5 rounded text-[var(--teal)]"
					/>
					<div>
						<div className={`font-bold ${profile.hasPacemakerExs ? "text-rose-600" : ""}`}>Имплантированный кардиостимулятор (ЭКС)</div>
						<div className="text-[11px] text-[var(--muted)]">Запрет УЗ-скейлинга и монополярной электрокоагуляции</div>
					</div>
				</label>
				<label className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.takesBisphosphonates)}
						onChange={(e) => onUpdateField("takesBisphosphonates", e.target.checked)}
						className="mt-0.5 rounded text-[var(--teal)]"
					/>
					<div>
						<div className={`font-bold ${profile.takesBisphosphonates ? "text-rose-600" : ""}`}>Бисфосфонатная терапия (MRONJ)</div>
						<div className="text-[11px] text-[var(--muted)]">Зомета, Акласта, Бонвива, Пролиа: риск остеонекроза челюсти</div>
					</div>
				</label>
				<label className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.takesAnticoagulants)}
						onChange={(e) => onUpdateField("takesAnticoagulants", e.target.checked)}
						className="mt-0.5 rounded text-[var(--teal)]"
					/>
					<div>
						<div className={`font-bold ${profile.takesAnticoagulants ? "text-rose-600" : ""}`}>Антикоагулянтная терапия</div>
						<div className="text-[11px] text-[var(--muted)]">Варфарин, Ксарелто, Эликвис, Плавикс: риск кровотечения</div>
					</div>
				</label>
				<label className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasHypertension)}
						onChange={(e) => onUpdateField("hasHypertension", e.target.checked)}
						className="mt-0.5 rounded text-[var(--teal)]"
					/>
					<div>
						<div className={`font-bold ${profile.hasHypertension ? "text-amber-600" : ""}`}>Артериальная гипертензия / ИБС</div>
						<div className="text-[11px] text-[var(--muted)]">Ограничение адреналина (до 1:200 000), контроль АД</div>
					</div>
				</label>
			</div>
		</div>
	);
});
