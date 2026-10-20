/**
 * apps/web/src/components/visit/intakeCockpitModules/IntakeSomaticCheckboxesGrid.tsx
 *
 * Сетка быстрых переключателей соматических патологий, стоп-факторов и аллергий
 * из @dental/shared (somaticCatalog.ts) с тач-таргетами >= 44x44px и 1-клик нормой.
 * Строго 0 мультяшных эмодзи (Мандат 8d, Грех №7).
 */

import React from "react";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import {
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	DENTAL_ALLERGEN_CATALOG,
	DENTAL_SOMATIC_STOP_FACTOR_CATALOG,
	SOMATIC_QUICK_CHIPS,
} from "@dental/shared";
import type {
	IntakeSomaticCheckboxesGridProps,
	IntakeSomaticQuestionnaireState,
} from "./intakeCockpitTypes";

/**
 * Создаёт начальное состояние анкеты здоровья по умолчанию (физиологическая норма).
 */
export function createDefaultHealthyIntakeSomaticState(): IntakeSomaticQuestionnaireState {
	return {
		isHealthyNorm: true,
		selectedAllergenIds: [],
		selectedStopFactorIds: [],
		selectedQuickChipIds: [],
		customAllergyNote: "",
		summaryAnamnesisTextRu: CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	};
}

/**
 * Собирает сводный клинический текст анамнеза по отмеченным аллергенам, стоп-факторам и быстрым чипам.
 */
export function buildIntakeSomaticSummaryText(
	selectedAllergenIds: readonly string[],
	selectedStopFactorIds: readonly string[],
	selectedQuickChipIds: readonly string[],
	customAllergyNote = "",
): string {
	const parts: string[] = [];

	for (const allergenId of selectedAllergenIds) {
		const found = DENTAL_ALLERGEN_CATALOG.find((a) => a.id === allergenId);
		if (found) {
			const detail = found.tradeNamesHint ? ` (${found.tradeNamesHint})` : "";
			parts.push(`Аллергия на ${found.name}${detail}`);
		}
	}

	for (const factorId of selectedStopFactorIds) {
		const found = DENTAL_SOMATIC_STOP_FACTOR_CATALOG.find(
			(f) => f.id === factorId,
		);
		if (found) {
			const detail = found.shortBadge ? ` [${found.shortBadge}]` : "";
			parts.push(`${found.label}${detail}`);
		}
	}

	for (const chipId of selectedQuickChipIds) {
		const found = SOMATIC_QUICK_CHIPS.find((c) => c.id === chipId);
		if (
			found &&
			!parts.some((p) =>
				p.toLowerCase().includes(found.label.toLowerCase()),
			)
		) {
			parts.push(found.label);
		}
	}

	if (customAllergyNote.trim()) {
		parts.push(customAllergyNote.trim());
	}

	return parts.length > 0
		? `${parts.join(". ")}.`
		: CANONICAL_SOMATIC_HEALTHY_NORM_TEXT;
}

/**
 * Переключает соматический чип из SOMATIC_QUICK_CHIPS и пересчитывает состояние анкеты.
 */
export function toggleIntakeSomaticChip(
	state: IntakeSomaticQuestionnaireState,
	chipId: string,
): IntakeSomaticQuestionnaireState {
	const exists = state.selectedQuickChipIds.includes(chipId);
	const nextQuickChipIds = exists
		? state.selectedQuickChipIds.filter((id) => id !== chipId)
		: [...state.selectedQuickChipIds, chipId];

	const hasAnyPathology =
		state.selectedAllergenIds.length > 0 ||
		state.selectedStopFactorIds.length > 0 ||
		nextQuickChipIds.length > 0 ||
		Boolean(state.customAllergyNote.trim());

	return {
		...state,
		isHealthyNorm: !hasAnyPathology,
		selectedQuickChipIds: nextQuickChipIds,
		summaryAnamnesisTextRu: buildIntakeSomaticSummaryText(
			state.selectedAllergenIds,
			state.selectedStopFactorIds,
			nextQuickChipIds,
			state.customAllergyNote,
		),
	};
}

/**
 * Переключает стоматологический аллерген из DENTAL_ALLERGEN_CATALOG.
 */
export function toggleIntakeAllergen(
	state: IntakeSomaticQuestionnaireState,
	allergenId: string,
): IntakeSomaticQuestionnaireState {
	const exists = state.selectedAllergenIds.includes(allergenId);
	const nextAllergenIds = exists
		? state.selectedAllergenIds.filter((id) => id !== allergenId)
		: [...state.selectedAllergenIds, allergenId];

	const hasAnyPathology =
		nextAllergenIds.length > 0 ||
		state.selectedStopFactorIds.length > 0 ||
		state.selectedQuickChipIds.length > 0 ||
		Boolean(state.customAllergyNote.trim());

	return {
		...state,
		isHealthyNorm: !hasAnyPathology,
		selectedAllergenIds: nextAllergenIds,
		summaryAnamnesisTextRu: buildIntakeSomaticSummaryText(
			nextAllergenIds,
			state.selectedStopFactorIds,
			state.selectedQuickChipIds,
			state.customAllergyNote,
		),
	};
}

/**
 * Переключает соматический стоп-фактор из DENTAL_SOMATIC_STOP_FACTOR_CATALOG.
 */
export function toggleIntakeStopFactor(
	state: IntakeSomaticQuestionnaireState,
	factorId: string,
): IntakeSomaticQuestionnaireState {
	const exists = state.selectedStopFactorIds.includes(factorId);
	const nextStopFactorIds = exists
		? state.selectedStopFactorIds.filter((id) => id !== factorId)
		: [...state.selectedStopFactorIds, factorId];

	const hasAnyPathology =
		state.selectedAllergenIds.length > 0 ||
		nextStopFactorIds.length > 0 ||
		state.selectedQuickChipIds.length > 0 ||
		Boolean(state.customAllergyNote.trim());

	return {
		...state,
		isHealthyNorm: !hasAnyPathology,
		selectedStopFactorIds: nextStopFactorIds,
		summaryAnamnesisTextRu: buildIntakeSomaticSummaryText(
			state.selectedAllergenIds,
			nextStopFactorIds,
			state.selectedQuickChipIds,
			state.customAllergyNote,
		),
	};
}

export function IntakeSomaticCheckboxesGrid({
	state,
	onToggleQuickChip,
	onToggleAllergen,
	onToggleStopFactor,
	onApplyHealthyNorm,
}: IntakeSomaticCheckboxesGridProps) {
	return (
		<div
			className="space-y-2.5 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]"
			data-testid="intake-somatic-checkboxes-grid"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<ShieldCheck
						size={16}
						className={
							state.isHealthyNorm
								? "text-emerald-600 dark:text-emerald-400 shrink-0"
								: "text-amber-600 dark:text-amber-400 shrink-0"
						}
					/>
					<span className="text-xs font-bold text-[var(--ink)]">
						Экспресс-анкета здоровья и аллергостатус:
					</span>
				</div>

				<button
					type="button"
					onClick={onApplyHealthyNorm}
					className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
						state.isHealthyNorm
							? "bg-emerald-600 text-white border-emerald-700"
							: "bg-[var(--paper-soft)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
					}`}
					data-testid="btn-intake-somatic-norm-one-click"
				>
					<Check size={14} className="shrink-0" />
					<span>Соматически здоров / Норма</span>
				</button>
			</div>

			{/* Сетка быстрых переключателей соматических рисков и аллергий (>= 44x44px) */}
			<div
				className="grid grid-cols-2 sm:grid-cols-4 gap-2"
				role="group"
				aria-label="Переключатели соматических патологий и аллергий"
			>
				{SOMATIC_QUICK_CHIPS.map((chip) => {
					const isSelected = state.selectedQuickChipIds.includes(chip.id);
					return (
						<button
							key={chip.id}
							type="button"
							onClick={() => onToggleQuickChip(chip.id)}
							className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
								isSelected
									? chip.riskLevel === "critical"
										? "bg-rose-600 text-white border-rose-700"
										: "bg-amber-600 text-white border-amber-700"
									: "bg-[var(--paper-soft)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border-[var(--line)]"
							}`}
							data-testid={`intake-somatic-toggle-${chip.id}`}
							title={chip.label}
						>
							<span className="leading-tight">{chip.label}</span>
							{isSelected ? (
								<AlertTriangle size={14} className="shrink-0" />
							) : (
								<span className="w-3.5 h-3.5 rounded border border-[var(--line)] shrink-0" />
							)}
						</button>
					);
				})}
			</div>

			{/* Дополнительные критические аллергены и стоп-факторы */}
			<div className="flex flex-wrap items-center gap-1.5 pt-1">
				{DENTAL_ALLERGEN_CATALOG.slice(0, 3).map((allergen) => {
					const isSelected = state.selectedAllergenIds.includes(allergen.id);
					return (
						<button
							key={allergen.id}
							type="button"
							onClick={() => onToggleAllergen(allergen.id)}
							className={`min-h-[44px] px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
								isSelected
									? "bg-rose-600 text-white border-rose-700"
									: "bg-[var(--paper-soft)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"
							}`}
							data-testid={`intake-allergen-toggle-${allergen.id}`}
							title={allergen.tradeNamesHint || allergen.name}
						>
							{isSelected && <AlertTriangle size={12} className="shrink-0" />}
							<span>{allergen.name}</span>
						</button>
					);
				})}

				{DENTAL_SOMATIC_STOP_FACTOR_CATALOG.slice(0, 3).map((factor) => {
					const isSelected = state.selectedStopFactorIds.includes(factor.id);
					return (
						<button
							key={factor.id}
							type="button"
							onClick={() => onToggleStopFactor(factor.id)}
							className={`min-h-[44px] px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
								isSelected
									? "bg-amber-600 text-white border-amber-700"
									: "bg-[var(--paper-soft)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"
							}`}
							data-testid={`intake-stop-factor-toggle-${factor.id}`}
							title={factor.hint || factor.label}
						>
							{isSelected && <AlertTriangle size={12} className="shrink-0" />}
							<span>{factor.shortBadge || factor.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
