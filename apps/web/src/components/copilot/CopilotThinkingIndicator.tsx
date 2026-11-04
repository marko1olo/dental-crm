/**
 * @file CopilotThinkingIndicator.tsx
 * @description Extended Thinking (CoT) Stream with smooth accordion & monospace accents (Mandate 8b <= 120 lines).
 */

import React, { useEffect, useState } from "react";
import { Brain, Check, ChevronDown, Sparkles } from "lucide-react";

export interface CopilotThinkingIndicatorProps {
	isThinking: boolean;
	activeTooth?: number | null | undefined;
	icd10Code?: string | null | undefined;
	thoughtProcess?: string | undefined;
	speedMode?: "turbo" | "deep_reasoning" | undefined;
	showThinkingProcess?: boolean | undefined;
}

export function CopilotThinkingIndicator({
	isThinking,
	activeTooth,
	icd10Code,
	thoughtProcess = "Анализ клинического контекста...",
	speedMode = "turbo",
	showThinkingProcess = true,
}: CopilotThinkingIndicatorProps) {
	const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	useEffect(() => {
		if (!isThinking) {
			setElapsedSeconds(0);
			return;
		}
		const timer = setInterval(() => {
			setElapsedSeconds((prev) => Number((prev + 0.1).toFixed(1)));
		}, 100);
		return () => clearInterval(timer);
	}, [isThinking]);

	if (!isThinking) return null;

	return (
		<div className="copilot-thinking-card my-2 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] transition-all duration-200 text-xs overflow-hidden">
			{/* Аккордеон рассуждений модели (Antigravity & language_server CoT) */}
			<button
				type="button"
				onClick={() => setIsExpanded((prev) => !prev)}
				className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-[var(--teal,#0d9488)]/5 transition-colors select-none"
				aria-expanded={isExpanded}
			>
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-5 h-5 rounded-full bg-[var(--teal,#0d9488)]/20 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0 animate-pulse">
						<Brain size={12} className={isThinking ? "animate-spin" : ""} style={{ animationDuration: "3s" }} />
					</div>
					<div className="font-semibold text-[var(--ink)] flex items-center gap-1.5 truncate">
						<span>{`Мышление модели (${elapsedSeconds}с) • ${isExpanded ? "Свернуть" : "Раскрыть"}`}</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
						{speedMode === "turbo" ? "Турбо-поток" : "Консилиум CoT"}
					</span>
					<ChevronDown size={14} className={`text-[var(--muted)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
				</div>
			</button>

			{/* Клинический радар шагов */}
			<div className="px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
				<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap flex items-center gap-1">
					<Check size={10} className="stroke-[2.5]" />
					<span>{`FDI ${activeTooth || 36}`}</span>
				</span>
				<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap flex items-center gap-1">
					<Check size={10} className="stroke-[2.5]" />
					<span>{icd10Code ? `МКБ-10 ${icd10Code}` : "МКБ-10 K02.1"}</span>
				</span>
				<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--teal,#0d9488)]/40 text-[var(--teal,#0d9488)] font-semibold whitespace-nowrap flex items-center gap-1 animate-pulse">
					<Sparkles size={9} />
					<span>EBM Решение</span>
				</span>
				<span className="ml-auto inline-flex items-center gap-1 text-[var(--teal,#0d9488)] shrink-0 font-medium">
					<span>Печатает</span>
					<span className="inline-flex gap-0.5 items-center">
						<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal,#0d9488)] animate-pulse" />
						<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal,#0d9488)] animate-pulse [animation-delay:150ms]" />
						<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal,#0d9488)] animate-pulse [animation-delay:300ms]" />
					</span>
				</span>
			</div>

			{/* Развернутый блок рассуждений CoT с моноширинными акцентами */}
			{showThinkingProcess && isExpanded && (
				<div className="p-3 pt-2.5 border-t border-[var(--teal,#0d9488)]/15 bg-[var(--paper,#ffffff)]/80">
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line)] text-[11px] font-mono leading-relaxed text-[var(--ink)] whitespace-pre-wrap selection:bg-[var(--teal,#0d9488)]/20">
						{thoughtProcess}
					</div>
				</div>
			)}
		</div>
	);
}
