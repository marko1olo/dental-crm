import React from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import {
	CLINICAL_FAST_PRESETS,
	PERIO_PATHOLOGY_PRESETS,
	type PerioPathologyPreset,
	mergeSoapDiaryState,
} from "../../../lib/clinicalProtocols043";
import { ClinicalQuickPresetsBar } from "../ClinicalQuickPresetsBar";
import type { DiaryState } from "../../useVisitDiaryLogic";

export interface VisitDiaryPerioPediatricPresetsProps {
	readonly perioMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly showPerioPathologyMenu: boolean;
	readonly setShowPerioPathologyMenu: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleInsertPerioStatus: () => void;
	readonly handleApplyPerioPathology: (preset: PerioPathologyPreset) => void;
	readonly handleInsertPediatricStatus: () => void;
	readonly applyClinicalPreset: (presetId: string) => void;
	readonly onOpenTemplatesModal: () => void;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly setIcdSearch: (val: string) => void;
	readonly scheduleDebouncedSave: () => void;
}

export function VisitDiaryPerioPediatricPresets({
	perioMenuRef,
	showPerioPathologyMenu,
	setShowPerioPathologyMenu,
	handleInsertPerioStatus,
	handleApplyPerioPathology,
	handleInsertPediatricStatus,
	applyClinicalPreset,
	onOpenTemplatesModal,
	isLocked,
	isRevising,
	beginRevise,
	setDiary,
	setIcdSearch,
	scheduleDebouncedSave,
}: VisitDiaryPerioPediatricPresetsProps) {
	return (
		<div className="flex flex-col gap-2 min-w-0">
			<div className="dente-filter-chips">
				{/* Unified Perio Assessment Pill (Norm + Pathology Dropdown) */}
				<div
					className="relative inline-flex items-center rounded-lg bg-[var(--paper)] border border-[var(--line)] shadow-xs shrink-0"
					ref={perioMenuRef}
				>
					<button
						type="button"
						onClick={handleInsertPerioStatus}
						className="vde-043__btn vde-043__btn--norm"
						title="Вставить физиологическую норму пародонта (десна бледно-розовая, плотная, карманов нет)"
						data-testid="insert-perio-043-btn"
					>
						<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="whitespace-nowrap">Пародонт в норме</span>
					</button>
					<button
						type="button"
						onClick={() => setShowPerioPathologyMenu((v) => !v)}
						className="vde-043__btn"
						title="Выбрать протокол патологии пародонта (гингивит, пародонтит K05.3, абсцесс, рецессия)"
						data-testid="perio-pathology-menu-btn"
						aria-expanded={showPerioPathologyMenu}
					>
						<span className="whitespace-nowrap">Патология</span>
						<ChevronDown
							className={`w-3.5 h-3.5 transition-transform ${showPerioPathologyMenu ? "rotate-180" : ""}`}
						/>
					</button>

					{/* Dropdown Menu for Perio Pathologies */}
					{showPerioPathologyMenu && (
						<div
							className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-[var(--line-strong,#334155)] shadow-2xl z-[100] py-1.5 overflow-hidden backdrop-blur-xl"
							role="menu"
							aria-label="Пресеты патологий пародонта"
						>
							<div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[var(--line,#334155)] flex items-center justify-between">
								<span>Патологии пародонта (МКБ-10)</span>
								<span className="text-[10px] text-teal-400">В дневник</span>
							</div>
							<div className="max-h-80 overflow-y-auto py-1 divide-y divide-[var(--line-subtle,#1e293b)]">
								{PERIO_PATHOLOGY_PRESETS.map((preset) => (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleApplyPerioPathology(preset)}
										className="w-full text-left px-3 py-2 hover:bg-rose-500/10 text-[var(--ink,#f8fafc)] hover:text-rose-200 transition-colors flex flex-col gap-0.5 group cursor-pointer"
										role="menuitem"
										data-testid={`perio-preset-${preset.id}`}
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
												{preset.label}
											</span>
											<span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
												{preset.badge}
											</span>
										</div>
										<p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
											{preset.statusLocalis}
										</p>
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Pediatric Button */}
				<button
					type="button"
					onClick={handleInsertPediatricStatus}
					className="dente-filter-chip"
					title="Вставить протокол сменного прикуса, физиологической резорбции корней и Кариограммы Bratthall"
					data-testid="insert-pediatric-cariogram-btn"
				>
					<span className="font-mono text-[10px] font-bold text-[var(--teal)]">
						ДЕТИ
					</span>
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="whitespace-nowrap shrink-0">Сменный прикус (резорбция + кариограмма)</span>
				</button>

				{/* Clinical Fast Presets */}
				{CLINICAL_FAST_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => applyClinicalPreset(preset.id)}
						className="dente-filter-chip"
						title={preset.description}
						data-testid={`preset-btn-${preset.id}`}
					>
						<span className="font-mono text-[10px] font-bold text-[var(--teal)] shrink-0">
							{preset.badge}
						</span>
						<span className="whitespace-nowrap shrink-0">{preset.label}</span>
					</button>
				))}
			</div>

			{/* ClinicalQuickPresetsBar */}
			<div className="pt-1">
				<ClinicalQuickPresetsBar
					isLocked={false}
					onOpenTemplatesModal={onOpenTemplatesModal}
					onSelectPreset={(preset) => {
						if (isLocked && !isRevising) {
							beginRevise();
						}
						setDiary((prev) =>
							mergeSoapDiaryState(
								prev,
								{
									anamnesis: preset.anamnesis,
									statusLocalis: preset.statusLocalis,
									diagnosisIcd10: preset.icd10,
									treatmentDescription: preset.treatmentDescription,
								},
								{ strategy: "smart_append" },
							),
						);
						if (preset.icd10) setIcdSearch(preset.icd10);
						scheduleDebouncedSave();
					}}
				/>
			</div>
		</div>
	);
}
