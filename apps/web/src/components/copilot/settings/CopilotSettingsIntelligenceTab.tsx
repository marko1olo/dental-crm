/**
 * @file CopilotSettingsIntelligenceTab.tsx
 * @description Intelligence & Model settings tab: Server-managed vs BYOK,
 * CoT reasoning mode, temperature slider, and thinking process visibility.
 * (Mandate 8b <= 200 lines, Mandate 8e, Mandate 8x).
 */

import React from "react";
import { Brain, Cpu, Sparkles } from "lucide-react";
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
	temperature: number;
	setTemperature: (val: number) => void;
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
	temperature,
	setTemperature,
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

			{/* Режим клинического консилиума и цепочка рассуждений */}
			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
				<div className="flex items-center justify-between gap-2">
					<div>
						<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Brain size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Режим клинического консилиума</span>
						</span>
						<p className="text-[10px] text-[var(--muted)]">Глубокое EBM рассуждение со скрытой цепочкой мыслей (CoT)</p>
					</div>
					<div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<button
							type="button"
							onClick={() => setSpeedMode("turbo")}
							className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
								speedMode === "turbo" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
							}`}
						>
							Турбо
						</button>
						<button
							type="button"
							onClick={() => setSpeedMode("deep_reasoning")}
							className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
								speedMode === "deep_reasoning" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
							}`}
						>
							Консилиум
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
