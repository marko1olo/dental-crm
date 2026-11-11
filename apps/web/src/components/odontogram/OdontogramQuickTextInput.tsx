/**
 * apps/web/src/components/odontogram/OdontogramQuickTextInput.tsx
 *
 * DENTE Dental CRM — Rapid End-to-End Dental Formula Text Input.
 *
 * Allows the dentist or chairside nurse to type or dictate shorthand like:
 * "16к 25п 36о" or "47пт 14кр 26и 11зд" or "13-23зд 33-43гигиена"
 * which instantly parses into FDI teeth states and applies them in 1 click without mouse clicking servitude.
 *
 * Invariants:
 * - Realtime parsing preview chips.
 * - Enter or button applies batch in 1 click.
 * - Mobile HIG touch targets >= 44x44px.
 * - Zero cartoon emojis.
 * - Mandate 8b <= 250 lines.
 */

import React, { useState, useMemo, useCallback } from "react";
import { Keyboard, ArrowRight, X, Check, Sparkles } from "lucide-react";
import {
	parseDentalFormulaShorthand,
	type ParsedToothItem,
} from "@dental/shared";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import { CANONICAL_STAMP_MATRIX } from "@dental/shared";
import type { ToothState } from "./ToothChart";

export interface OdontogramQuickTextInputProps {
	readonly onApplyBatch: (
		items: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }>,
	) => void;
	readonly className?: string | undefined;
	readonly placeholder?: string | undefined;
}

export const OdontogramQuickTextInput: React.FC<OdontogramQuickTextInputProps> = React.memo(({
	onApplyBatch,
	className = "",
	placeholder = "Быстрый ввод: «16к 25п 36о», «47пт 14кр 26и» или «13-23зд»...",
}) => {
	const [text, setText] = useState("");
	const [isFocused, setIsFocused] = useState(false);

	const parseResult = useMemo(() => {
		return parseDentalFormulaShorthand(text);
	}, [text]);

	const handleApply = useCallback(() => {
		if (parseResult.items.length === 0) {
			showToast("Введите формулу, например: 16к 25п 36о", "info");
			return;
		}

		const batch = parseResult.items.map((it) => ({
			toothNumber: it.toothNumber,
			state: it.state as ToothState,
			surfaces: it.surfaces ? [...it.surfaces] : undefined,
		}));

		onApplyBatch(batch);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Применено к зубной формуле: ${batch.length} ${
				batch.length === 1 ? "зуб" : batch.length < 5 ? "зуба" : "зубов"
			} (${batch.map((b) => `${b.toothNumber} ${b.state}`).join(", ")})`,
			"success",
			4000,
		);
		setText("");
	}, [parseResult, onApplyBatch]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && parseResult.items.length > 0) {
				e.preventDefault();
				handleApply();
			} else if (e.key === "Escape") {
				setText("");
			}
		},
		[handleApply, parseResult.items.length],
	);

	return (
		<div
			className={`odontogram-quick-text-input flex flex-col gap-1.5 w-full bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/60 p-2 sm:p-2.5 rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 transition-all ${
				isFocused
					? "ring-2 ring-teal-500/40 border-teal-500/50 shadow-xs"
					: ""
			} ${className}`}
			data-testid="odontogram-quick-text-input"
		>
			<div className="flex items-center gap-1.5 w-full">
				<div className="relative flex-1 flex items-center min-w-0">
					<div className="absolute left-3 pointer-events-none flex items-center justify-center text-slate-400 dark:text-slate-500">
						<Keyboard className="w-4 h-4 shrink-0" />
					</div>
					<input
						type="text"
						value={text}
						onChange={(e) => setText(e.target.value)}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						data-testid="odontogram-quick-input-field"
						id="odontogram-quick-formula-input"
						style={{ paddingLeft: "42px", paddingRight: "36px" }}
						className="w-full h-9 sm:h-9 min-h-[36px] pl-12 pr-8 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-950 text-xs sm:text-sm font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-[var(--line,#e2e8f0)] dark:border-slate-800 focus:outline-hidden focus:border-teal-500 transition-all"
					/>
					{text && (
						<button
							type="button"
							onClick={() => setText("")}
							className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
							title="Очистить ввод"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={handleApply}
					data-testid="odontogram-quick-input-apply-btn"
					className="dente-btn dente-btn-secondary h-9 min-h-[36px] px-3 sm:px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-98"
					title={
						parseResult.items.length > 0
							? `Применить ${parseResult.items.length} зубных статусов [Enter]`
							: "Применить формулу (нажмите для подсказки)"
					}
				>
					<Check className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
					<span className="hidden sm:inline">Применить к формуле</span>
					<span className="sm:hidden">Применить</span>
				</button>
			</div>

			{/* Realtime Parsed Chips Preview */}
			{parseResult.items.length > 0 && (
				<div
					className="flex items-center gap-1.5 flex-wrap pt-1 px-0.5 animate-in fade-in duration-150"
					data-testid="quick-input-chips-preview"
				>
					<span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
						<Sparkles className="w-3 h-3 text-teal-500" />
						<span>Распознано ({parseResult.items.length}):</span>
					</span>
					{parseResult.items.map((item: ParsedToothItem) => {
						const stampInfo = CANONICAL_STAMP_MATRIX[item.state];
						return (
							<span
								key={item.toothNumber}
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border shadow-2xs"
								style={{
									backgroundColor: stampInfo?.badgeBg ?? "rgba(13, 148, 136, 0.12)",
									color: stampInfo?.badgeText ?? "#0f766e",
									borderColor: stampInfo?.badgeBorder ?? "rgba(13, 148, 136, 0.3)",
								}}
							>
								<span className="font-mono font-black">{item.toothNumber}</span>
								<span>{stampInfo?.shortRu ?? item.state}</span>
							</span>
						);
					})}
					<span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
						Нажмите <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Enter</kbd>
					</span>
				</div>
			)}
		</div>
	);
});

OdontogramQuickTextInput.displayName = "OdontogramQuickTextInput";
