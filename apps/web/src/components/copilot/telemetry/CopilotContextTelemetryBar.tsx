/**
 * @file CopilotContextTelemetryBar.tsx
 * @description Compact Antigravity-style Context Telemetry Bar for DENTE AI Copilot.
 * Displays:
 * - Active patient, ID and tooth formula FDI (Honest Production: "Пациент не выбран" if empty)
 * - Active clinical model badge with latency indicator
 * - Visual token budget progress bar with 70% ("Pruning") & 85% ("Sliding Window") threshold markers
 * - Gateway status: Cloud gateway (Active) vs Local deterministic (<5ms)
 * Mandate 8b: <= 200 lines (80..200). Mandate 8wy: Zero mock leaks in production. Zero cartoon emojis.
 */

import React from "react";
import { User, Cpu, Globe, HardDrive, Sparkles, ShieldAlert } from "lucide-react";
import { useCopilotStore } from "../../../store/copilotStore";

export interface CopilotContextTelemetryBarProps {
	patientName?: string | null;
	patientId?: string | null;
	activeTooth?: number | null;
	activeDoctor?: string | null;
	activeView?: string | null;
	allergies?: string[] | null;
	compact?: boolean;
}

export const CopilotContextTelemetryBar: React.FC<CopilotContextTelemetryBarProps> = ({
	patientName: propPatientName,
	patientId: propPatientId,
	activeTooth: propActiveTooth,
	activeDoctor,
	activeView,
	allergies,
	compact = false,
}) => {
	const { telemetry, settings } = typeof window === "undefined" ? useCopilotStore.getState() : useCopilotStore();

	const resolvedPatientName = propPatientName !== undefined ? propPatientName : telemetry.patientName;
	const resolvedPatientId = propPatientId !== undefined ? propPatientId : telemetry.patientId;
	const resolvedActiveTooth = propActiveTooth !== undefined ? propActiveTooth : telemetry.activeTooth;

	const activeTokens = typeof telemetry.activeTokens === "number" ? telemetry.activeTokens : 0;
	const maxTokens = telemetry.maxTokens || 128000;
	const tokenRatio = Math.min(1, Math.max(0, activeTokens / maxTokens));
	const tokenPercent = Math.round(tokenRatio * 100);

	const isLocal = settings.runtimeMode === "desktop_native" || telemetry.gatewayStatus === "local_deterministic";
	const modelLabel = settings.modelRoutingMode === "custom_byok"
		? (settings.byokModel || settings.model || "Кастомная модель")
		: "DENTE Интеллект";
	const latencyLabel = isLocal ? "<5мс" : telemetry.latencyMs > 0 ? `~${telemetry.latencyMs}мс` : "<300мс";

	// Threshold status
	const isSlidingWindow = tokenRatio >= 0.85;
	const isPruning = tokenRatio >= 0.7 && !isSlidingWindow;

	const progressColor = isSlidingWindow
		? "var(--rose, #e11d48)"
		: isPruning
		? "var(--amber, #d97706)"
		: "var(--teal, #0d9488)";

	return (
		<div
			className={`copilot-context-bar copilot-context-telemetry-bar w-full px-3 py-1.5 border-b border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper-soft,#f4f7f6)] text-xs text-[var(--ink,#0f172a)] flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap transition-colors ${
				compact ? "text-[11px] py-1" : ""
			}`}
			data-testid="copilot-context-telemetry-bar"
		>
			{/* Активный экран / вид */}
			{activeView && (
				<span className="copilot-context-chip active-view px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--paper,#ffffff)] border border-[var(--line)] text-[var(--ink)] shrink-0">
					{activeView}
				</span>
			)}

			{/* Пациент и Зуб FDI */}
			<div className="flex items-center gap-1.5 shrink-0">
				<div className="flex items-center gap-1 font-medium text-[var(--ink)]">
					<User size={12} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>{resolvedPatientName ? <>Пациент: {resolvedPatientName}</> : <span className="text-[var(--muted,#64748b)] font-normal">Пациент не выбран</span>}</span>
					{resolvedPatientId && <span className="sr-only" data-testid="telemetry-patient-id">{`#${resolvedPatientId}`}</span>}
				</div>
				{resolvedActiveTooth && (resolvedPatientName || propActiveTooth !== undefined) ? (
					<span className="copilot-telemetry-tooth-badge px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal,rgba(13,148,136,0.25))] shrink-0" title={`Зуб ${resolvedActiveTooth}`} data-tooth={`Зуб ${resolvedActiveTooth}`}>
						<span>{`Зуб #${resolvedActiveTooth}`}</span>
					</span>
				) : null}
			</div>

			{/* Клинические аллергии */}
			{allergies && allergies.length > 0 && (
				<span
					className="copilot-context-chip copilot-context-chip--warn px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/25 flex items-center gap-1 shrink-0"
					title={allergies.join(", ")}
				>
					<ShieldAlert size={11} className="shrink-0" />
					<span>{`Аллергии (${allergies.length})`}</span>
				</span>
			)}

			{/* Врач на смене */}
			{activeDoctor && (
				<span className="copilot-context-chip doctor text-[10px] text-[var(--muted,#64748b)] font-medium shrink-0">
					{activeDoctor}
				</span>
			)}

			<span className="text-[var(--line,rgba(15,118,110,0.2))] shrink-0 select-none">•</span>

			{/* Клиническая модель и индикатор отклика */}
			<div
				className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,rgba(15,118,110,0.15))] text-[11px] font-semibold text-[var(--ink)] shrink-0"
				title={`Активная клиническая модель: ${settings.modelRoutingMode === "custom_byok" ? settings.byokModel : "Google Gemini"} • ${modelLabel}`}
			>
				<Sparkles size={11} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span className="hidden sm:inline">{modelLabel}</span>
				<span className="sm:hidden">Gemini</span>
				<span className="text-[10px] text-[var(--muted,#64748b)] font-normal">• {latencyLabel}</span>
			</div>

			{/* В режиме compact для врача не захламляем экран сырыми токенами и шлюзами */}
			{!compact && (
				<>
					<span className="text-[var(--line,rgba(15,118,110,0.2))] shrink-0 select-none">•</span>
					{/* Бюджет токенов и пороги сжатия */}
					<div
						className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,rgba(15,118,110,0.15))] text-[11px] shrink-0"
						title={`Контекст: ${activeTokens.toLocaleString("ru-RU")} из ${maxTokens.toLocaleString("ru-RU")} токенов`}
					>
						<Cpu size={11} className="text-[var(--muted,#64748b)] shrink-0" />
						<span className="font-mono text-[10px] text-[var(--ink)]">
							{activeTokens === 0
								? "0 / 128k токенов"
								: `${activeTokens.toLocaleString("ru-RU")} / ${maxTokens.toLocaleString("ru-RU")} (${tokenPercent}%)`}
						</span>
						{/* Прогресс-бар токенов */}
						<div className="w-12 h-1.5 rounded-full bg-[var(--line,rgba(15,118,110,0.2))] overflow-hidden flex shrink-0">
							<div
								className="h-full rounded-full transition-all duration-300"
								style={{ width: `${tokenPercent}%`, backgroundColor: progressColor }}
							/>
						</div>

						{/* Пороговые маркеры сжатия */}
						{isSlidingWindow && (
							<span
								className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-300 animate-pulse shrink-0"
								data-testid="marker-sliding-window"
							>
								Sliding Window
							</span>
						)}
						{isPruning && (
							<span
								className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 shrink-0"
								data-testid="marker-pruning"
							>
								Pruning
							</span>
						)}
					</div>

					{/* Статус шлюза / контура */}
					<div
						className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,rgba(15,118,110,0.15))] text-[10px] font-medium shrink-0 ml-auto"
						data-testid="copilot-gateway-status"
					>
						{isLocal ? (
							<>
								<HardDrive size={11} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span className="text-[var(--ink)]">Локальный детерминированный (&lt;5мс)</span>
							</>
						) : (
							<>
								<Globe size={11} className="text-emerald-600 shrink-0" />
								<span className="text-[var(--ink)] flex items-center gap-1">
									Облачный шлюз (Active)
									<span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
								</span>
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default CopilotContextTelemetryBar;
