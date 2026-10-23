/**
 * PerioToolbarActions.tsx — Кнопки действий тулбара (пресеты, экспорт в карту, Primary CTA сохранение).
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { Check, Clipboard, FileText, HelpCircle, Save } from "lucide-react";
import React from "react";
import type { PerioExpressPresetId } from "../perioMath";
import { PerioToolbarPresets } from "./PerioToolbarPresets";

export interface PerioToolbarActionsProps {
	readonly readOnly?: boolean | undefined;
	readonly insertStatus: boolean;
	readonly copyStatus: boolean;
	readonly syncStatus?: string | undefined;
	readonly onSaveDraft?: (() => void) | undefined;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onSetAllIntact: () => void;
	readonly onMarkBopOnDeepPockets: () => void;
	readonly onClearPlaque: () => void;
	readonly onInsertToProtocol: () => void;
	readonly onCopyProtocol: () => void;
	readonly onToggleHelp: () => void;
}

export const PerioToolbarActions: React.FC<PerioToolbarActionsProps> = React.memo(({
	readOnly = false, insertStatus, copyStatus, syncStatus = "idle",
	onSaveDraft, onApplyExpressPreset, onSetAllIntact, onMarkBopOnDeepPockets,
	onClearPlaque, onInsertToProtocol, onCopyProtocol, onToggleHelp,
}) => {
	if (readOnly) return null;

	return (
		<div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5 shrink-0 h-9 min-h-[36px]">
			<PerioToolbarPresets
				onApplyExpressPreset={onApplyExpressPreset}
				onSetAllIntact={onSetAllIntact}
				onMarkBopOnDeepPockets={onMarkBopOnDeepPockets}
				onClearPlaque={onClearPlaque}
			/>

			{/* Внести в дневник */}
			<button
				type="button"
				onClick={onInsertToProtocol}
				className="secondary-button shrink-0 !h-9 !min-h-[36px]"
				title="Перенести протокол периодонтограммы в медицинскую карту"
				data-testid="perio-insert-protocol-btn"
			>
				{insertStatus ? <Check size={14} className="text-emerald-500" /> : <FileText size={14} className="text-teal-600 dark:text-teal-400" />}
				<span>{insertStatus ? "Внесено в дневник!" : "Внести в дневник"}</span>
			</button>

			{/* Скопировать */}
			<button
				type="button"
				onClick={onCopyProtocol}
				className="secondary-button hidden sm:inline-flex shrink-0 !h-9 !min-h-[36px]"
				title="Скопировать текстовое заключение пародонтограммы в буфер обмена"
			>
				{copyStatus ? <Check size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
				<span>{copyStatus ? "Скопировано!" : "Копировать"}</span>
			</button>

			{/* ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА (МАНДАТ 8am): «Сохранить периодонтограмму» */}
			{onSaveDraft && (
				<button
					type="button"
					onClick={onSaveDraft}
					disabled={syncStatus === "saving"}
					className="primary-button shrink-0 font-bold !h-9 !min-h-[36px]"
					title="Сохранить карту пародонта в электронную медицинскую карту"
					data-testid="perio-save-draft-btn"
				>
					<Save size={15} className={syncStatus === "saving" ? "animate-spin text-white" : "text-white"} />
					<span>Сохранить периодонтограмму</span>
				</button>
			)}

			{/* Справка */}
			<button
				type="button"
				onClick={onToggleHelp}
				className="icon-button shrink-0 text-[var(--muted)] hover:text-[var(--ink)] !h-9 !w-9 !min-h-[36px]"
				title="Справка по горячим клавишам электронного зонда"
			>
				<HelpCircle size={15} />
			</button>
		</div>
	);
});

PerioToolbarActions.displayName = "PerioToolbarActions";
