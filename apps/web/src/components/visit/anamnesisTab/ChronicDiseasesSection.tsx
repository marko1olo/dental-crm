/**
 * apps/web/src/components/visit/anamnesisTab/ChronicDiseasesSection.tsx
 *
 * Layer 2: Клинические соматические стоп-факторы и стоматологический анамнез:
 * инфаркт, ЭКС/кардиостимулятор, антикоагулянты, бисфосфонаты (MRONJ), диабет,
 * беременность с триместром, опыт анестезии и дентофобия.
 */

import React, { useId } from "react";
import { Activity, Check, HeartPulse, Plus } from "lucide-react";
import {
	DENTAL_HISTORY_ITEMS,
	type PregnancyTrimester,
	SOMATIC_STOP_FACTORS,
} from "./types";

export interface ChronicDiseasesSectionProps {
	readonly selectedRisks: readonly string[];
	readonly toggleRisk: (label: string) => void;
	readonly anticoagulantName: string;
	readonly setAnticoagulantName: (value: string) => void;
	readonly bisphosphonateName: string;
	readonly setBisphosphonateName: (value: string) => void;
	readonly pregnancyTrimester: PregnancyTrimester;
	readonly setPregnancyTrimester: (value: PregnancyTrimester) => void;
	readonly selectedHistory: readonly string[];
	readonly toggleHistory: (label: string) => void;
}

export const ChronicDiseasesSection: React.FC<ChronicDiseasesSectionProps> = ({
	selectedRisks,
	toggleRisk,
	anticoagulantName,
	setAnticoagulantName,
	bisphosphonateName,
	setBisphosphonateName,
	pregnancyTrimester,
	setPregnancyTrimester,
	selectedHistory,
	toggleHistory,
}) => {
	const anticoagulantInputId = useId();
	const bisphosphonateInputId = useId();

	return (
		<>
			{/* ═══ БЛОК 2: КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ И СОМАТИКА ═══ */}
			<div className="space-y-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
						<HeartPulse className="w-4 h-4 text-amber-500" />
						<span>2. Клинические стоп-факторы и соматический статус</span>
					</label>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Инфаркт, ЭКС, антикоагулянты, бисфосфонаты, диабет
					</span>
				</div>

				<div className="flex flex-wrap gap-2">
					{SOMATIC_STOP_FACTORS.map((item) => {
						const isSelected = selectedRisks.includes(item.label);
						const activeClass = item.isCritical
							? "anamnesis-chip--active-danger"
							: "anamnesis-chip--active-warning";
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => toggleRisk(item.label)}
								data-testid={`toggle-stop-${item.id}`}
								title={item.hint}
								className={`anamnesis-chip ${isSelected ? activeClass : ""}`}
							>
								{isSelected ? (
									<Check
										className={`w-3.5 h-3.5 ${
											item.isCritical ? "text-[#ef4444]" : "text-amber-600 dark:text-amber-400"
										}`}
									/>
								) : (
									<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
								)}
								<span>{item.label}</span>
							</button>
						);
					})}
				</div>

				{/* Уточняющие инпуты для антикоагулянтов, бисфосфонатов и триместра беременности */}
				{(selectedRisks.includes("Приём антикоагулянтов") ||
					selectedRisks.includes("Приём бисфосфонатов") ||
					selectedRisks.includes("Беременность / Лактация")) && (
					<div className="anamnesis-clarify-card">
						{selectedRisks.includes("Приём антикоагулянтов") && (
							<div className="flex flex-col gap-1">
								<label
									htmlFor={anticoagulantInputId}
									className="text-[11px] font-bold text-rose-800 dark:text-rose-300"
								>
									Препарат антикоагулянта и МНО:
								</label>
								<input
									id={anticoagulantInputId}
									type="text"
									value={anticoagulantName}
									onChange={(e) => setAnticoagulantName(e.target.value)}
									placeholder="Варфарин (МНО 2.1), Ксарелто 20 мг..."
									className="anamnesis-input"
								/>
							</div>
						)}

						{selectedRisks.includes("Приём бисфосфонатов") && (
							<div className="flex flex-col gap-1">
								<label
									htmlFor={bisphosphonateInputId}
									className="text-[11px] font-bold text-rose-800 dark:text-rose-300"
								>
									Препарат бисфосфонатов (MRONJ):
								</label>
								<input
									id={bisphosphonateInputId}
									type="text"
									value={bisphosphonateName}
									onChange={(e) => setBisphosphonateName(e.target.value)}
									placeholder="Акласта 5 мг/год, Пролиа, Зомета..."
									className="anamnesis-input"
								/>
							</div>
						)}

						{selectedRisks.includes("Беременность / Лактация") && (
							<div className="flex flex-col gap-1">
								<span className="text-[11px] font-bold text-pink-800 dark:text-pink-300">
									Срок / Период лактации:
								</span>
								<select
									value={pregnancyTrimester}
									onChange={(e) =>
										setPregnancyTrimester(
											e.target.value as PregnancyTrimester,
										)
									}
									className="anamnesis-input"
									aria-label="Срок беременности или период лактации"
								>
									<option value="trimester_1">1-й триместр (неотложка, без адреналина)</option>
									<option value="trimester_2">2-й триместр (безопасное окно)</option>
									<option value="trimester_3">3-й триместр</option>
									<option value="lactation">Период лактации / ГВ</option>
								</select>
							</div>
						)}
					</div>
				)}
			</div>

			{/* ═══ БЛОК 3: СТОМАТОЛОГИЧЕСКИЙ АНАМНЕЗ И ОПЫТ АНЕСТЕЗИИ ═══ */}
			<div className="space-y-2.5">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
					<Activity className="w-4 h-4 text-purple-500" />
					<span>3. Стоматологический анамнез (Опыт анестезии, дентофобия, кровоточивость)</span>
				</label>
				<div className="flex flex-wrap gap-2">
					{DENTAL_HISTORY_ITEMS.map((item) => {
						const isSelected = selectedHistory.includes(item.label);
						const activeClass = item.isAlert
							? "anamnesis-chip--active-purple-alert"
							: "anamnesis-chip--active-purple";
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => toggleHistory(item.label)}
								data-testid={`toggle-history-${item.id}`}
								className={`anamnesis-chip ${isSelected ? activeClass : ""}`}
							>
								{isSelected ? (
									<Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
								) : (
									<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
								)}
								<span>{item.label}</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
};
