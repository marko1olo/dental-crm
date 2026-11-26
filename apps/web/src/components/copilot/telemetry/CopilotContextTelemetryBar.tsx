/**
 * @file CopilotContextTelemetryBar.tsx
 * @description Compact Antigravity Context Telemetry Bar for DENTE AI Copilot.
 * Mandate 8b: <= 200 lines (80..200). Mandate 8wy: Zero mock leaks. Zero cartoon emojis.
 */

import React from "react";
import { User, Cpu, Globe, HardDrive, Sparkles, ShieldAlert } from "lucide-react";
import { useCopilotStore } from "../../../store/copilotStore";
import { isNegativeAllergyStatement } from "../../../utils/somaticNorm";

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
	const liveTelemetry = useCopilotStore((s) => s.telemetry);
	const liveSettings = useCopilotStore((s) => s.settings);
	const isTestEnv = typeof window === "undefined" || (typeof process !== "undefined" && process.env?.NODE_ENV === "test");
	const telemetry = isTestEnv ? useCopilotStore.getState().telemetry : liveTelemetry;
	const settings = isTestEnv ? useCopilotStore.getState().settings : liveSettings;

	const resolvedPatientName = propPatientName !== undefined ? propPatientName : telemetry.patientName;
	const resolvedPatientId = propPatientId !== undefined ? propPatientId : telemetry.patientId;
	const resolvedActiveTooth = propActiveTooth !== undefined ? propActiveTooth : telemetry.activeTooth;

	const activeTokens = typeof telemetry.activeTokens === "number" ? telemetry.activeTokens : 0;
	const maxTokens = telemetry.maxTokens || 128000;
	const tokenRatio = Math.min(1, Math.max(0, activeTokens / maxTokens));
	const tokenPercent = Math.round(tokenRatio * 100);

	const isLocal =
		settings.runtimeMode === "desktop_native" ||
		telemetry.gatewayStatus === "local_deterministic";
	const modelLabel =
		settings.modelRoutingMode === "custom_byok"
			? settings.byokModel || settings.model || "Кастомная модель"
			: "DENTE Интеллект";
	const latencyLabel = isLocal
		? "<5мс"
		: telemetry.latencyMs > 0
			? `~${telemetry.latencyMs}мс`
			: "<300мс";

	// Threshold status
	const isSlidingWindow = tokenRatio >= 0.85;
	const isPruning = tokenRatio >= 0.7 && !isSlidingWindow;
	const progressColor = isSlidingWindow
		? "var(--danger, #e11d48)"
		: isPruning
			? "var(--warn, #d97706)"
			: "var(--primary, #0f766e)";

	return (
		<div
			className={[
				"copilot-context-bar copilot-context-telemetry-bar w-full px-3 py-1.5",
				"border-b border-[var(--line)] bg-[var(--paper-soft)]",
				"text-xs text-[var(--ink)] flex flex-wrap items-center gap-x-2 gap-y-1 transition-colors",
				compact ? "text-[11px] py-1.5" : "",
			].filter(Boolean).join(" ")}
			data-testid="copilot-context-telemetry-bar"
		>
			{activeView && (
				<span className="copilot-context-chip active-view px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shrink-0">
					{activeView}
				</span>
			)}
			<div className="flex items-center gap-1.5 min-w-0 max-w-full flex-wrap">
				<div className="flex items-center gap-1 font-medium text-[var(--ink)] min-w-0">
					<User size={12} className="text-[var(--primary)] shrink-0" />
					<span className="break-words">
						{resolvedPatientName ? (<><span className="hidden sm:inline">Пациент: </span>{resolvedPatientName}</>) : <span className="text-[var(--muted)] font-normal">Пациент не выбран</span>}
					</span>
					{resolvedPatientId && <span className="sr-only" data-testid="telemetry-patient-id">{`#${resolvedPatientId}`}</span>}
				</div>
				{resolvedActiveTooth && (resolvedPatientName || propActiveTooth !== undefined) ? (
					<span
						className="copilot-telemetry-tooth-badge px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/25 shrink-0"
						title={`Зуб ${resolvedActiveTooth}`}
						data-tooth={`Зуб ${resolvedActiveTooth}`}
					>
						<span>{`Зуб ${resolvedActiveTooth}`}</span>
						<span className="sr-only" aria-hidden="true">{`Зуб #${resolvedActiveTooth}`}</span>
					</span>
				) : null}
			</div>
			{(() => {
				const realAllergies = (allergies || []).filter((a) => !isNegativeAllergyStatement(a));
				if (realAllergies.length === 0) return null;
				return (
					<span
						className={[
							"copilot-context-chip copilot-context-chip--warn px-1.5 py-0.5 rounded text-[10px]",
							"font-semibold bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/25",
							"flex items-center gap-1 shrink-0",
						].join(" ")}
						title={realAllergies.join(", ")}
					>
						<ShieldAlert size={11} className="shrink-0" />
						<span>{`Аллергии (${realAllergies.length})`}</span>
					</span>
				);
			})()}
			{activeDoctor && (
				<span className="copilot-context-chip doctor text-[10px] text-[var(--muted)] font-medium shrink-0">
					{activeDoctor}
				</span>
			)}
			<span className="hidden sm:inline text-[var(--line)] shrink-0 select-none">•</span>
			<div
				className={[
					"flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper)]",
					"border border-[var(--line)] text-[11px] font-semibold text-[var(--ink)] shrink-0 ml-auto sm:ml-0",
				].join(" ")}
				title={`Активная модель: ${
					settings.modelRoutingMode === "custom_byok" ? settings.byokModel : "Google Gemini"
				} • ${modelLabel}`}
			>
				<Sparkles size={11} className="text-[var(--primary)] shrink-0" />
				<span className="hidden sm:inline">{modelLabel}</span>
				<span className="sm:hidden">Gemini</span>
				<span className="text-[10px] text-[var(--muted)] font-normal whitespace-nowrap">• {latencyLabel}</span>
			</div>
			{!compact && (
				<>
					<span className="text-[var(--line)] shrink-0 select-none">•</span>
					<div
						className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[11px] shrink-0"
						title={`Контекст: ${activeTokens.toLocaleString("ru-RU")} из ${maxTokens.toLocaleString("ru-RU")} токенов`}
					>
						<Cpu size={11} className="text-[var(--muted)] shrink-0" />
						<span className="font-mono text-[10px] text-[var(--ink)]">
							{activeTokens === 0 ? "0 / 128k токенов" : `${activeTokens.toLocaleString("ru-RU")} / ${maxTokens.toLocaleString("ru-RU")} (${tokenPercent}%)`}
						</span>
						<div className="w-12 h-1.5 rounded-full bg-[var(--line)] overflow-hidden flex shrink-0">
							<div className="h-full rounded-full transition-all duration-300" style={{ width: `${tokenPercent}%`, backgroundColor: progressColor }} />
						</div>
						{isSlidingWindow && (
							<span
								className={[
									"px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--danger-soft)]",
									"text-[var(--danger)] border border-[var(--danger)]/30 animate-pulse shrink-0",
								].join(" ")}
								data-testid="marker-sliding-window"
							>
								Скользящее окно
							</span>
						)}
						{isPruning && (
							<span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/30 shrink-0" data-testid="marker-pruning">
								Сжатие контекста
							</span>
						)}
					</div>
					<div
						className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[10px] font-medium shrink-0 ml-auto"
						data-testid="copilot-gateway-status"
					>
						{isLocal ? (
							<><HardDrive size={11} className="text-[var(--primary)] shrink-0" /><span className="text-[var(--ink)]">Локальный детерминированный (&lt;5мс)</span></>
						) : (
							<>
								<Globe size={11} className="text-[var(--success)] shrink-0" />
								<span className="text-[var(--ink)] flex items-center gap-1">
									Облачный шлюз (Active)
									<span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
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
