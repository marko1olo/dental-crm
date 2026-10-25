/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaTopHeaderRow.tsx
 * Anesthesia Header, Passive Allergy Badges & Tooth Context (Mandates 8e, 8y, <= 120 lines)
 */

import { ShieldAlert, Syringe } from "lucide-react";
import React from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import type { InjectionTechniqueId } from "../anesthesiaCatalog";

const PASSIVE_WARN_ICON = String.fromCodePoint(0x26a0, 0xfe0f);

export interface AnesthesiaTopHeaderRowProps {
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly weight: number;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly isCardioRisk: boolean;
	readonly techniqueId: InjectionTechniqueId;
	readonly setTechniqueId: (t: InjectionTechniqueId) => void;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaTopHeaderRow({
	targetToothNumberFdi,
	weight,
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	isCardioRisk,
	techniqueId: _techniqueId,
	setTechniqueId: _setTechniqueId,
	onOpenEmergencyProtocol,
	disabled = false,
}: AnesthesiaTopHeaderRowProps) {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap min-w-0" data-testid="anesthesia-top-header-row">
			<div className="flex items-center gap-1.5 flex-wrap min-w-0">
				<span className="flex items-center gap-1 font-bold text-xs text-[var(--ink)] shrink-0">
					<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
					<span>Обезболивание</span>
				</span>
				{targetToothNumberFdi && (
					<span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shrink-0">
						Зуб {targetToothNumberFdi}
					</span>
				)}
				<span className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0" title="Вес пациента из карты">
					{`Вес пациента: ${weight} кг`}
				</span>
				{hasLidocaineAllergy && (
					<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge" title="Аллергия на лидокаин. Рекомендован Скандонест 3%">
						<span>{`${PASSIVE_WARN_ICON} Аллергия: Лидокаин`}</span>
					</span>
				)}
				{hasArticaineAllergy && (
					<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0" data-testid="allergy-passive-badge-articaine" title="Аллергия на артикаин. Рекомендован Скандонест 3%">
						<span>{`${PASSIVE_WARN_ICON} Аллергия: Артикаин`}</span>
					</span>
				)}
				{(hasSulfiteAllergy || hasBronchialAsthma) && (
					<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" data-testid="anesthesia-passive-allergy-alert" title="Рекомендован Скандонест 3% без вазоконстриктора">
						<span>{`${PASSIVE_WARN_ICON} Аллергия на сульфиты/бронхиальная астма (рекомендуется Скандонест 3% без вазоконстриктора)`}</span>
					</span>
				)}
				{isCardioRisk && (
					<span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0" title="Кардио-профиль: лимит адреналина 0.04 мг">
						<span>{`${PASSIVE_WARN_ICON} Кардио-контроль`}</span>
					</span>
				)}
			</div>
			<button
				type="button"
				disabled={disabled}
				onClick={onOpenEmergencyProtocol || (() => useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue"))}
				className="px-2.5 py-1 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-auto"
				title="Экстренная аптечка «Антишок»"
				data-testid="btn-anesthesia-quick-emergency"
			>
				<ShieldAlert size={14} className="shrink-0" />
				<span>Аптечка</span>
			</button>
		</div>
	);
}
