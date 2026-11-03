/**
 * @file CopilotThinkingIndicator.tsx
 * @description Animated thinking process, typewriter pulse, EBM clinical radar & expandable CoT (Mandate 8b <= 120 lines).
 */

import React, { useEffect, useState } from "react";
import { Brain, Check, ChevronDown, Sparkles } from "lucide-react";

export interface CopilotThinkingIndicatorProps {
	isThinking: boolean;
	activeTooth?: number | null;
	thoughtProcess?: string;
	speedMode?: "turbo" | "deep_reasoning";
	showThinkingProcess?: boolean;
}

export function CopilotThinkingIndicator({
	isThinking,
	activeTooth = 36,
	thoughtProcess = "Анализ клинической картины: жалобы на температурные раздражители. Проверка одонтограммы зуба 36, сопоставление со стандартами СтАР по глубокому кариесу (K02.1). Формирование плана препарирования и выбора нанокомпозита.",
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
		<div className="copilot-thinking-card my-2 p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] animate-in fade-in duration-200 text-xs">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<div className="w-5 h-5 rounded-full bg-[var(--teal,#0d9488)]/20 flex items-center justify-center text-[var(--teal,#0d9488)] animate-pulse">
						<Brain size={12} className="animate-spin" style={{ animationDuration: "3s" }} />
					</div>
					<div className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
						<span>Обдумывание клинического решения</span>
						<span className="font-mono text-[10px] text-[var(--muted)]">({elapsedSeconds}с)</span>
					</div>
				</div>
				<span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
					{speedMode === "turbo" ? "Турбо-поток" : "Консилиум CoT"}
				</span>
			</div>

			{/* Клинический радар шагов и индикатор набора текста */}
			<div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
				<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap flex items-center gap-1">
					<Check size={10} className="stroke-[2.5]" />
					<span>FDI {activeTooth || 36}</span>
				</span>
				<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap flex items-center gap-1">
					<Check size={10} className="stroke-[2.5]" />
					<span>МКБ-10 K02.1</span>
				</span>
				<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--teal,#0d9488)]/40 text-[var(--teal,#0d9488)] font-semibold whitespace-nowrap flex items-center gap-1 animate-pulse">
					<Sparkles size={9} />
					<span>Сверка со стандартами СтАР</span>
				</span>
				<span className="ml-auto inline-flex items-center gap-0.5 text-[var(--teal,#0d9488)] shrink-0 font-medium">
					<span>Печатает</span>
					<span className="w-1 h-1 rounded-full bg-[var(--teal,#0d9488)] animate-pulse" />
					<span className="w-1 h-1 rounded-full bg-[var(--teal,#0d9488)] animate-pulse [animation-delay:150ms]" />
					<span className="w-1 h-1 rounded-full bg-[var(--teal,#0d9488)] animate-pulse [animation-delay:300ms]" />
				</span>
			</div>

			{/* Разворачиваемый ход мыслей (Chain-of-Thought) */}
			{showThinkingProcess && (
				<div className="mt-2 pt-2 border-t border-[var(--teal,#0d9488)]/15">
					<button
						type="button"
						onClick={() => setIsExpanded((prev) => !prev)}
						className="flex items-center gap-1 text-[11px] font-medium text-[var(--teal,#0d9488)] hover:underline cursor-pointer select-none"
					>
						<span>{isExpanded ? "Скрыть ход мыслей" : "Показать ход мыслей (CoT)"}</span>
						<ChevronDown size={11} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
					</button>
					{isExpanded && (
						<p className="mt-1.5 p-2 rounded bg-[var(--paper)] text-[11px] leading-relaxed text-[var(--ink)] border border-[var(--line)] font-mono whitespace-pre-wrap">
							{thoughtProcess}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
