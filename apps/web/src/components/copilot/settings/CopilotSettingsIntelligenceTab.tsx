/**
 * @file CopilotSettingsIntelligenceTab.tsx
 * @description Intelligence & Model settings tab: Server-managed vs BYOK,
 * CoT reasoning mode, temperature slider, and thinking process visibility.
 * (Mandate 8b <= 200 lines, Mandate 8e, Mandate 8x).
 */

import React from "react";
import { Brain, Cpu, Layers, Sparkles, Zap } from "lucide-react";
import type { AiProvider, AiSpeedMode, ModelRoutingMode } from "../../../store/copilotStore";
import { CopilotSettingsModelRouting } from "./CopilotSettingsModelRouting";

export interface CopilotSettingsIntelligenceTabProps {
	modelRoutingMode: ModelRoutingMode;
	setModelRoutingMode: (mode: ModelRoutingMode) => void;
	byokProvider: AiProvider;
	setByokProvider: (p: AiProvider) => void;
	byokApiKey: string;
	setByokApiKey: (k: string) => void;
	byokModel: string;
	setByokModel: (m: string) => void;
	speedMode: AiSpeedMode;
	setSpeedMode: (mode: AiSpeedMode) => void;
	showThinkingProcess: boolean;
	setShowThinkingProcess: (val: boolean) => void;
	showTypingAnimation?: boolean;
	setShowTypingAnimation?: (val: boolean) => void;
	temperature: number;
	setTemperature: (val: number) => void;
	contextLimitTokens?: number;
	setContextLimitTokens?: (val: number) => void;
}

export function CopilotSettingsIntelligenceTab({
	modelRoutingMode,
	setModelRoutingMode,
	byokProvider,
	setByokProvider,
	byokApiKey,
	setByokApiKey,
	byokModel,
	setByokModel,
	speedMode,
	setSpeedMode,
	showThinkingProcess,
	setShowThinkingProcess,
	showTypingAnimation = true,
	setShowTypingAnimation,
	temperature,
	setTemperature,
	contextLimitTokens = 32768,
	setContextLimitTokens,
}: CopilotSettingsIntelligenceTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-intelligence-tab" data-legacy-tab="copilot-settings-general-tab">
			<CopilotSettingsModelRouting
				modelRoutingMode={modelRoutingMode}
				setModelRoutingMode={setModelRoutingMode}
				byokProvider={byokProvider}
				setByokProvider={setByokProvider}
				byokApiKey={byokApiKey}
				setByokApiKey={setByokApiKey}
				byokModel={byokModel}
				setByokModel={setByokModel}
			/>

			{/* Режим скорости и консилиума: Chairside Flash (<300 мс) vs CoT Reasoning */}
			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
				<div className="flex items-center justify-between gap-2">
					<div>
						<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Brain size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Режим клинического консилиума и скорость отклика</span>
						</span>
						<p className="text-[10px] text-[var(--muted)]">Быстрый Chairside Flash (&lt;300 мс) или глубокий CoT Reasoning</p>
					</div>
					<div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<button
							type="button"
							onClick={() => setSpeedMode("turbo")}
							className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
								speedMode === "turbo" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
							}`}
							title="Chairside Flash <300 мс"
						>
							Турбо (&lt;300 мс)
						</button>
						<button
							type="button"
							onClick={() => setSpeedMode("deep_reasoning")}
							className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
								speedMode === "deep_reasoning" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
							}`}
							title="Экспертный CoT Reasoning"
						>
							Консилиум CoT
						</button>
					</div>
				</div>
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-[var(--ink)]">
					<input
						type="checkbox"
						checked={showThinkingProcess}
						onChange={(e) => setShowThinkingProcess(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span>Показывать блок цепочки рассуждений (CoT) при формировании ответа</span>
				</label>
				{setShowTypingAnimation && (
					<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-[var(--ink)]">
						<input
							type="checkbox"
							checked={showTypingAnimation}
							onChange={(e) => setShowTypingAnimation(e.target.checked)}
							className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
						/>
						<span>Анимация набора текста (печатания) и фаз размышлений в реальном времени</span>
					</label>
				)}
			</section>

			{/* Лимиты контекстного окна (Мандат 8ab & Token Budget Law) */}
			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Layers size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Лимит контекстного окна (Token Budget)</span>
					</span>
					<span className="text-[10px] text-[var(--teal,#0d9488)] font-semibold">
						{contextLimitTokens <= 8192 ? "8k (Быстрый)" : contextLimitTokens <= 32768 ? "32k" : "128k"}
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					{[
						{ val: 8192, label: "8k", sub: "Быстрый Chairside" },
						{ val: 32768, label: "32k", sub: "Стандарт визита" },
						{ val: 131072, label: "128k", sub: "Архив и КЛКТ 3D" },
					].map((tier) => (
						<button
							key={tier.val}
							type="button"
							onClick={() => setContextLimitTokens?.(tier.val)}
							className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
								contextLimitTokens === tier.val
									? "border-[var(--teal,#0d9488)] bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold"
									: "border-[var(--line)] bg-[var(--paper)]/50 text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1"><div className="text-[11px] font-semibold">{tier.label}</div><div className="text-[10px] sm:text-[9px] text-[var(--muted)]">{tier.sub}</div></div>
						</button>
					))}
				</div>
			</section>

			{/* Температура и клиническая строгость инференса */}
			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Sparkles size={14} className="text-[var(--teal,#0d9488)]" />
						<span>{`Клиническая строгость ответа (Температура: ${temperature})`}</span>
					</span>
					<span className="text-[10px] text-[var(--teal,#0d9488)] font-semibold">
						{temperature <= 0.1 ? "Строгий EBM протокол" : temperature <= 0.3 ? "Оптимальный баланс" : "Клинический синтез"}
					</span>
				</div>
				<input
					type="range"
					min={0}
					max={0.7}
					step={0.1}
					value={temperature}
					onChange={(e) => setTemperature(parseFloat(e.target.value))}
					className="w-full accent-[var(--teal,#0d9488)] cursor-pointer"
				/>
				<div className="flex justify-between text-[10px] text-[var(--muted)]">
					<span>0.0 (Строгий регламент)</span>
					<span>0.2 (Рекомендуемый)</span>
					<span>0.7 (Творческий поиск)</span>
				</div>
			</section>
		</div>
	);
}
