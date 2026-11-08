/**
 * @file CopilotThinkingIndicator.tsx
 * @description Real-time CoT stream with milestones, timer & monospace accents (Mandate 8b <= 140 lines).
 */

import React, { useEffect, useState } from "react";
import { Brain, Check, ChevronDown, Sparkles, Terminal, Wrench } from "lucide-react";

export type ClinicalPhaseType = "thinking" | "tool_call" | "synthesis";

export interface CopilotThinkingIndicatorProps {
	isThinking: boolean;
	activeTooth?: number | null | undefined;
	icd10Code?: string | null | undefined;
	thoughtProcess?: string | undefined;
	thoughtLog?: string | undefined;
	speedMode?: "turbo" | "deep_reasoning" | undefined;
	showThinkingProcess?: boolean | undefined;
	currentToolName?: string | null | undefined;
	phaseOverride?: string | null | undefined;
}

export function getClinicalThinkingPhase(elapsed: number, includeSeconds = false): string {
	let p = "Синтез рекомендаций и сметы...";
	if (elapsed < 0.8) p = "ИИ формирует клинический протокол...";
	else if (elapsed < 1.8) p = "Дифференциальный диагноз по МКБ-10...";
	else if (elapsed < 2.8) p = "Проверка противопоказаний и СтАР...";
	return includeSeconds ? `${p} (${elapsed.toFixed(1)}с)` : p;
}

export function CopilotThinkingIndicator({
	isThinking,
	activeTooth,
	icd10Code,
	thoughtProcess = "Анализ клинического контекста...",
	thoughtLog,
	speedMode = "turbo",
	showThinkingProcess = true,
	currentToolName,
	phaseOverride,
}: CopilotThinkingIndicatorProps) {
	const resolvedThought = thoughtLog || thoughtProcess;
	const [elapsedMs, setElapsedMs] = useState(0);
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		if (!isThinking) { setElapsedMs(0); return; }
		const start = performance.now();
		const t = setInterval(() => setElapsedMs(Math.round(performance.now() - start)), 50);
		return () => clearInterval(t);
	}, [isThinking]);

	if (!isThinking) return null;

	const elapsedSec = Number((elapsedMs / 1000).toFixed(1));
	const durationText = elapsedMs < 1000 ? `${elapsedMs} мс` : `${elapsedSec} с`;
	const phaseType: ClinicalPhaseType = currentToolName || (phaseOverride && phaseOverride.includes("инструмент"))
		? "tool_call"
		: elapsedMs < 800 ? "thinking" : "synthesis";
	const phaseLabel = phaseOverride || (currentToolName ? `Вызов инструмента: ${currentToolName}` : getClinicalThinkingPhase(elapsedSec, true));

	return (
		<div className="copilot-thinking-card my-2 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] text-xs overflow-hidden shadow-xs" data-testid="copilot-thinking-indicator">
			<button
				type="button"
				onClick={() => setIsExpanded((p) => !p)}
				className="w-full p-2.5 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-[var(--teal,#0d9488)]/5 transition-colors select-none"
				aria-expanded={isExpanded}
			>
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-5 h-5 rounded-md bg-[var(--teal,#0d9488)]/20 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0 animate-pulse">
						<Brain size={12} className="animate-spin" style={{ animationDuration: "3.5s" }} />
					</div>
					<div className="min-w-0">
						<div className="font-semibold text-[var(--ink)] flex items-center gap-1.5 truncate">
							<span>{`Мышление модели (${durationText}) • Ход клинических рассуждений • ${isExpanded ? "Свернуть" : "Раскрыть"}`}</span>
						</div>
						<div className="flex items-center gap-1 text-[10px] text-[var(--teal,#0d9488)] font-medium truncate">
							<span>{phaseLabel}</span>
							<span className="inline-block w-1.5 h-3 bg-[var(--teal,#0d9488)] animate-pulse rounded-[1px] ml-0.5 align-middle" data-testid="copilot-thinking-cursor" />
						</div>
					</div>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
						{speedMode === "turbo" ? "Турбо-поток" : "Консилиум CoT"}
					</span>
					<ChevronDown size={13} className={`text-[var(--muted)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
				</div>
			</button>

			<div className="px-2.5 py-1 border-t border-[var(--line)]/40 bg-[var(--paper)]/60 flex items-center gap-1.5 text-[10px]">
				<span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${phaseType === "thinking" ? "bg-[var(--teal,#0d9488)] text-white font-bold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}`}>
					{phaseType !== "thinking" ? <Check size={10} className="stroke-[2.5]" /> : <Brain size={10} />}
					<span>Размышление</span>
				</span>
				<span className="text-[var(--muted)]">›</span>
				<span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${phaseType === "tool_call" ? "bg-[var(--teal,#0d9488)] text-white font-bold animate-pulse" : "text-emerald-600 dark:text-emerald-400 font-semibold"}`}>
					<Wrench size={10} />
					<span>Инструменты</span>
				</span>
				<span className="text-[var(--muted)]">›</span>
				<span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${phaseType === "synthesis" ? "bg-[var(--teal,#0d9488)] text-white font-bold animate-pulse" : "text-[var(--muted)]"}`}>
					<Sparkles size={10} />
					<span>Синтез</span>
				</span>
				<span className="ml-auto font-mono text-[9px] text-[var(--muted)] flex items-center gap-1">
					<Terminal size={9} />
					<span>{durationText}</span>
				</span>
			</div>

			<div className="px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px] border-t border-[var(--line)]/30">
				{activeTooth ? (
					<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap flex items-center gap-1">
						<Check size={9} className="stroke-[2.5]" />
						<span>{`FDI ${activeTooth}`}</span>
					</span>
				) : null}
				{icd10Code ? (
					<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap flex items-center gap-1">
						<Check size={9} className="stroke-[2.5]" />
						<span>{`МКБ-10 ${icd10Code}`}</span>
					</span>
				) : null}
				<span className="ml-auto inline-flex items-center gap-1 text-[var(--teal,#0d9488)] shrink-0 font-medium text-[10px]">
					<span>Печатает</span>
					<span className="inline-flex gap-0.5 items-center">
						<span className="w-1 h-1 rounded-full bg-[var(--teal,#0d9488)] animate-pulse" />
						<span className="w-1 h-1 rounded-full bg-[var(--teal,#0d9488)] animate-pulse [animation-delay:150ms]" />
						<span className="w-1 h-1 rounded-full bg-[var(--teal,#0d9488)] animate-pulse [animation-delay:300ms]" />
					</span>
				</span>
			</div>

			<div className="sr-only" data-testid="copilot-thought-log">{resolvedThought}</div>
			{showThinkingProcess && isExpanded && (
				<div className="p-2.5 pt-2 border-t border-[var(--teal,#0d9488)]/15 bg-[var(--paper,#ffffff)]/80">
					<div className="p-2 rounded bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line)] text-[11px] font-mono leading-relaxed text-[var(--ink)] whitespace-pre-wrap max-h-40 overflow-y-auto">
						{resolvedThought}
					</div>
				</div>
			)}
		</div>
	);
}
