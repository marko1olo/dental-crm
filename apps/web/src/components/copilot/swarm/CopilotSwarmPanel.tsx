/**
 * @file CopilotSwarmPanel.tsx
 * @description In-App Multi-Agent Swarm Inspector for DENTE AI Copilot (.agents/AI_ASSISTANT_SUBAGENT_SWARM.md).
 * Displays status and audits of the 4 canonical L2 subagent roles:
 * 1. Triage Agent (Маршрутизация обращений и звонков)
 * 2. Odontogram & Diary Inquisitor (Авто-аудит ЭМК и K02-K08 перед проверками)
 * 3. Billing & Fiscal Sentinel (Сверка копеек, прейскуранта услуг и чеков кассы)
 * 4. Vision & DICOM Specialist (Анализ RVG и КЛКТ срезов)
 * Mandate 8b: <= 250 lines. Mandate 8am: 1 Primary CTA. Mandate 8e: 0 disabled buttons. Zero cartoon emojis.
 */

import React, { useState } from "react";
import {
	Phone,
	FileText,
	Calculator,
	Scan,
	CheckCircle2,
	Clock,
	RefreshCw,
	Play,
	Bot,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useCopilotStore } from "../../../store/copilotStore";
import { showToast } from "../../GlobalToast";
import type { SwarmAgentCard, SwarmAgentRole } from "./swarmTypes";

export const CopilotSwarmPanel: React.FC = () => {
	const { swarmAgents, triggerSwarmAudit } = typeof window === "undefined" ? useCopilotStore.getState() : useCopilotStore();
	const [activeRunningId, setActiveRunningId] = useState<SwarmAgentRole | "all" | null>(null);

	const handleRunAllAudit = () => {
		setActiveRunningId("all");
		triggerSwarmAudit();
		showToast("Запущен полный сквозной аудит всех 4 ролей клинического роя", "success");
		setTimeout(() => setActiveRunningId(null), 800);
	};

	const handleRunAgentAudit = (agent: SwarmAgentCard) => {
		setActiveRunningId(agent.id);
		triggerSwarmAudit(agent.id);
		showToast(`Аудит завершён: ${agent.name} проверил новые записи`, "info");
		setTimeout(() => setActiveRunningId(null), 600);
	};

	const getAgentIcon = (id: SwarmAgentRole) => {
		switch (id) {
			case "triage":
				return <Phone size={18} className="text-[var(--teal,#0d9488)] shrink-0" />;
			case "emr_inquisitor":
				return <FileText size={18} className="text-blue-600 shrink-0" />;
			case "billing_sentinel":
				return <Calculator size={18} className="text-emerald-600 shrink-0" />;
			case "vision_specialist":
				return <Scan size={18} className="text-indigo-600 shrink-0" />;
		}
	};

	const renderStatusBadge = (agent: SwarmAgentCard) => {
		const isCurrentlyRunning = activeRunningId === "all" || activeRunningId === agent.id || agent.status === "running";
		if (isCurrentlyRunning) {
			return (
				<span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-300">
					<RefreshCw size={11} className="animate-spin" />
					<span>В работе</span>
				</span>
			);
		}
		if (agent.status === "completed") {
			return (
				<span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-300">
					<CheckCircle2 size={11} />
					<span>Готово</span>
				</span>
			);
		}
		return (
			<span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--paper-soft,#f4f7f6)] text-[var(--muted,#64748b)] border border-[var(--line,rgba(15,118,110,0.2))]">
				<Clock size={11} />
				<span>Ожидание</span>
			</span>
		);
	};

	return (
		<div
			className="copilot-swarm-panel flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-[var(--ink,#0f172a)]"
			data-testid="copilot-swarm-panel"
		>
			{/* Шапка модуля роя */}
			<div className="copilot-swarm-header p-4 rounded-xl border border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper-soft,#f4f7f6)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-start gap-3 min-w-0">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,rgba(13,148,136,0.3))] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
						<Bot size={20} />
					</div>
					<div>
						<h3 className="text-sm font-bold m-0 flex items-center gap-1.5 text-[var(--ink)]">
							<span>Клинический мультиагентный рой DENTE</span>
							<ShieldCheck size={14} className="text-emerald-600" />
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
							4 автономных L2-субагента под управлением L1 Chairside Orchestrator
						</p>
					</div>
				</div>

				{/* Единственная Primary CTA кнопка на видимый контекст (Мандат 8am) */}
				<button
					type="button"
					onClick={handleRunAllAudit}
					className="copilot-primary-cta shrink-0 h-11 min-h-[44px] px-4 rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 cursor-pointer"
					data-testid="swarm-run-all-cta"
				>
					<Play size={14} />
					<span>Запустить полный аудит роя</span>
				</button>
			</div>

			{/* Карточки 4 специализированных ролей субагентов */}
			<div className="copilot-swarm-grid grid grid-cols-1 gap-3">
				{swarmAgents.map((agent) => (
					<div
						key={agent.id}
						className="copilot-swarm-card p-4 rounded-xl border border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper,#ffffff)] shadow-sm space-y-2.5 transition-shadow hover:shadow"
						data-testid={`swarm-agent-card-${agent.id}`}
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="w-8 h-8 rounded-lg bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line,rgba(15,118,110,0.15))] flex items-center justify-center">
									{getAgentIcon(agent.id)}
								</div>
								<div>
									<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
										<span>{agent.name}</span>
										<span className="text-[10px] font-normal text-[var(--muted)]">({agent.roleTitle})</span>
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] leading-snug">
										{agent.description}
									</div>
								</div>
							</div>
							<div className="shrink-0">{renderStatusBadge(agent)}</div>
						</div>

						{/* Метрики и результаты аудита */}
						<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,rgba(15,118,110,0.1))] text-[11px]">
							<div className="flex items-center gap-3 text-[var(--muted,#64748b)]">
								<span>
									Проверено записей:{" "}
									<strong className="text-[var(--ink)] font-semibold">
										{agent.inspectedRecordsCount} {agent.metricLabel}
									</strong>
								</span>
								<span>•</span>
								<span>
									Последний аудит:{" "}
									<strong className="text-[var(--ink)] font-semibold">{agent.lastAuditAt}</strong>
								</span>
							</div>

							{/* Вторичная кнопка одиночной проверки (Мандат 8e: не disabled) */}
							<button
								type="button"
								onClick={() => handleRunAgentAudit(agent)}
								className="h-9 min-h-[36px] px-3 rounded-lg border border-[var(--line,rgba(15,118,110,0.2))] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line,rgba(15,118,110,0.15))] text-xs font-medium text-[var(--ink)] flex items-center gap-1.5 cursor-pointer"
								title={`Запустить проверку: ${agent.name}`}
							>
								<Sparkles size={12} className="text-[var(--teal,#0d9488)]" />
								<span>Проверить</span>
							</button>
						</div>

						{/* Нормативная ссылка */}
						<div className="text-[10px] text-[var(--teal,#0d9488)] font-mono">
							Стандарт: {agent.referenceStandard}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default CopilotSwarmPanel;
