/**
 * AnamnesisRiskFactorsGrid.tsx — Сетка соматических факторов риска и сопутствующих препаратов.
 */

import React from "react";
import { Check, HeartPulse } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface AnamnesisRiskFactorsGridProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly anticoagulantInputId: string;
	readonly bisphosphonateInputId: string;
	readonly onToggleField: (key: keyof PatientClinicalSafetyProfile) => void;
	readonly onUpdateField: <K extends keyof PatientClinicalSafetyProfile>(
		key: K,
		value: PatientClinicalSafetyProfile[K],
	) => void;
}

export const AnamnesisRiskFactorsGrid: React.FC<AnamnesisRiskFactorsGridProps> =
	({
		profile,
		anticoagulantInputId,
		bisphosphonateInputId,
		onToggleField,
		onUpdateField,
	}) => {
		return (
			<div className="space-y-2">
				<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
					<HeartPulse className="w-3.5 h-3.5 text-blue-500" />
					2. Соматические факторы риска и препараты
				</span>

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
					{/* Гипертония */}
					<button
						type="button"
						data-testid="toggle-hypertension"
						onClick={() => onToggleField("hasHypertension")}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.hasHypertension
								? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
						}`}
						title="Гипертоническая болезнь / ИБС (лимит адреналина 0.04 мг)"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.hasHypertension
									? "bg-amber-600 border-amber-600 text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.hasHypertension ? <Check className="w-3 h-3" /> : null}
						</div>
						<span className="truncate min-w-0">Гипертония (АД)</span>
					</button>

					{/* Кардиостимулятор / ЭКС */}
					<button
						type="button"
						data-testid="toggle-pacemaker"
						onClick={() => onToggleField("hasPacemakerExs")}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.hasPacemakerExs
								? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
						}`}
						title="Имплантированный кардиостимулятор — абсолютный запрет УЗ-скейлеров"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.hasPacemakerExs
									? "bg-[#ef4444] border-[#ef4444] text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.hasPacemakerExs ? <Check className="w-3 h-3" /> : null}
						</div>
						<span className="truncate min-w-0">ЭКС (Запрет УЗ)</span>
					</button>

					{/* Антикоагулянты */}
					<button
						type="button"
						data-testid="toggle-anticoagulants"
						onClick={() => onToggleField("takesAnticoagulants")}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.takesAnticoagulants
								? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
						}`}
						title="Антикоагулянты (Ксарелто, Варфарин, Эликвис) — контроль гемостаза"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.takesAnticoagulants
									? "bg-[#ef4444] border-[#ef4444] text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.takesAnticoagulants ? (
								<Check className="w-3 h-3" />
							) : null}
						</div>
						<span className="truncate min-w-0">Антикоагулянты</span>
					</button>

					{/* Бисфосфонаты */}
					<button
						type="button"
						data-testid="toggle-bisphosphonates"
						onClick={() => onToggleField("takesBisphosphonates")}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.takesBisphosphonates
								? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-purple-50/50"
						}`}
						title="Бисфосфонатная терапия — риск медикаментозного остеонекроза челюсти (MRONJ)"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.takesBisphosphonates
									? "bg-[#ef4444] border-[#ef4444] text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.takesBisphosphonates ? (
								<Check className="w-3 h-3" />
							) : null}
						</div>
						<span className="truncate min-w-0">Бисфосфонаты (MRONJ)</span>
					</button>

					{/* Сахарный диабет */}
					<button
						type="button"
						data-testid="toggle-diabetes"
						onClick={() => onToggleField("hasDiabetesMellitus")}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.hasDiabetesMellitus
								? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
						}`}
						title="Сахарный диабет (риск гипогликемии и замедленной регенерации)"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.hasDiabetesMellitus
									? "bg-amber-600 border-amber-600 text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.hasDiabetesMellitus ? (
								<Check className="w-3 h-3" />
							) : null}
						</div>
						<span className="truncate min-w-0">Сахарный диабет</span>
					</button>

					{/* Бронхиальная астма */}
					<button
						type="button"
						data-testid="toggle-asthma"
						onClick={() => onToggleField("hasBronchialAsthma")}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.hasBronchialAsthma
								? "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
						}`}
						title="Бронхиальная астма (ингалятор пациента должен быть на манипуляционном столике)"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.hasBronchialAsthma
									? "bg-amber-600 border-amber-600 text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.hasBronchialAsthma ? (
								<Check className="w-3 h-3" />
							) : null}
						</div>
						<span className="truncate min-w-0">Бронхиальная астма</span>
					</button>

					{/* Беременность */}
					<button
						type="button"
						data-testid="toggle-pregnancy"
						onClick={() => {
							onUpdateField(
								"pregnancyTrimester",
								profile.pregnancyTrimester === "none"
									? "trimester_2"
									: "none",
							);
						}}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.pregnancyTrimester !== "none"
								? "bg-pink-50 dark:bg-pink-950/50 border-pink-400 text-pink-900 dark:text-pink-200 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-pink-50/50"
						}`}
						title="Беременность (2-й триместр — безопасное окно, анестетики без адреналина)"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.pregnancyTrimester !== "none"
									? "bg-pink-600 border-pink-600 text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.pregnancyTrimester !== "none" ? (
								<Check className="w-3 h-3" />
							) : null}
						</div>
						<span className="truncate min-w-0">Беременность (2 трим)</span>
					</button>

					{/* НПВП / Аспириновая триада */}
					<button
						type="button"
						data-testid="toggle-nsaid"
						onClick={() => onToggleField("hasNsaidAllergy")}
						className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
							profile.hasNsaidAllergy
								? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50"
						}`}
						title="Непереносимость НПВП (Аспирин, Кеторол, Ибупрофен)"
					>
						<div
							className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
								profile.hasNsaidAllergy
									? "bg-[#ef4444] border-[#ef4444] text-white"
									: "border-slate-300 dark:border-slate-600"
							}`}
						>
							{profile.hasNsaidAllergy ? <Check className="w-3 h-3" /> : null}
						</div>
						<span className="truncate min-w-0">НПВП / Аспирин</span>
					</button>
				</div>

				{/* Уточнение антикоагулянтов / бисфосфонатов */}
				{(profile.takesAnticoagulants || profile.takesBisphosphonates) && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 mt-2">
						{profile.takesAnticoagulants && (
							<div className="flex flex-col gap-1">
								<label
									htmlFor={anticoagulantInputId}
									className="text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200"
								>
									Препарат антикоагулянта и МНО (INR):
								</label>
								<input
									id={anticoagulantInputId}
									type="text"
									value={profile.anticoagulantName || ""}
									onChange={(e) =>
										onUpdateField("anticoagulantName", e.target.value)
									}
									placeholder="Варфарин (МНО 2.1), Ксарелто 20 мг..."
									className="h-8 px-2.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
								/>
							</div>
						)}
						{profile.takesBisphosphonates && (
							<div className="flex flex-col gap-1">
								<label
									htmlFor={bisphosphonateInputId}
									className="text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200"
								>
									Препарат бисфосфонатной терапии (MRONJ):
								</label>
								<input
									id={bisphosphonateInputId}
									type="text"
									value={profile.bisphosphonateName || ""}
									onChange={(e) =>
										onUpdateField("bisphosphonateName", e.target.value)
									}
									placeholder="Акласта 5 мг/год, Пролиа, Фосамакс..."
									className="h-8 px-2.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
								/>
							</div>
						)}
					</div>
				)}
			</div>
		);
	};
