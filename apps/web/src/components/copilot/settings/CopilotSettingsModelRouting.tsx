/**
 * @file CopilotSettingsModelRouting.tsx
 * @description Intelligent model routing & optional BYOK custom key for advanced users.
 * Mandate 8b: strictly <= 220 lines, Mandate 8e, Apple HIG segmented control.
 */

import React, { useState } from "react";
import { Check, Cpu, Eye, EyeOff, KeyRound, Loader2, Server, Sparkles, Zap, HardDrive } from "lucide-react";
import type { AiProvider, ModelRoutingMode } from "../../../store/copilotStore";

export const MODERN_BYOK_MODELS: Array<{ id: string; provider: AiProvider; label: string; note: string }> = [
	{ id: "gemini-2.5-flash", provider: "gemini", label: "Gemini 2.5 Flash", note: "Основная рабочая модель" },
	{ id: "gemini-2.0-flash-lite", provider: "gemini", label: "Gemini 2.0 Flash-Lite", note: "Сверхбыстрый chairside-отклик (<300 мс)" },
	{ id: "gemini-2.5-pro", provider: "gemini", label: "Gemini 2.5 Pro", note: "Сбалансированный клинический анализ" },
	{ id: "claude-3-5-sonnet", provider: "anthropic", label: "Claude 3.5 Sonnet", note: "Флагман Anthropic (CoT Reasoner)" },
	{ id: "gpt-4o", provider: "openai", label: "OpenAI GPT-4o", note: "Мультимодальный клинический разбор" },
	{ id: "deepseek-r1", provider: "deepseek", label: "DeepSeek R1", note: "Глубокая цепочка рассуждений" },
];

export const SERVER_MANAGED_TIERS = [
	{ id: "smart_flash", title: "Smart Flash Tier (Gemini 2.5 Flash)", badge: "Основной", note: "Максимальный интеллект, томография КЛКТ, дифдиагноз, протоколы.", icon: Sparkles },
	{ id: "chairside_lite", title: "Lite Fast Tier (Gemini 2.0 Flash-Lite)", badge: "<300 мс", note: "Сверхбыстрый отклик у кресла врача для разметки зубной формулы FDI и заметок.", icon: Zap },
	{ id: "local_fallback", title: "Локальный детерминированный роутер", badge: "Офлайн 100%", note: "Автономная работа без интернета и облака на базе стандартов СтАР.", icon: HardDrive },
];

export interface CopilotSettingsModelRoutingProps {
	modelRoutingMode: ModelRoutingMode;
	setModelRoutingMode: (mode: ModelRoutingMode) => void;
	byokProvider: AiProvider;
	setByokProvider: (p: AiProvider) => void;
	byokApiKey: string;
	setByokApiKey: (key: string) => void;
	byokModel: string;
	setByokModel: (m: string) => void;
}

export function CopilotSettingsModelRouting({
	modelRoutingMode, setModelRoutingMode, byokProvider, setByokProvider, byokApiKey, setByokApiKey, byokModel, setByokModel,
}: CopilotSettingsModelRoutingProps) {
	const [showKey, setShowKey] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
	const [testLatency, setTestLatency] = useState<number | null>(null);
	const [testError, setTestError] = useState<string | null>(null);

	const handleTestConnection = async () => {
		if (!byokApiKey.trim()) { setTestStatus("error"); setTestError("Введите API-ключ"); return; }
		setIsTesting(true); setTestStatus("idle"); setTestError(null);
		try {
			const res = await fetch("/api/agent/validate-key", {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ provider: byokProvider, apiKey: byokApiKey.trim(), model: byokModel }),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.valid) { setTestStatus("success"); setTestLatency(typeof data.latencyMs === "number" ? data.latencyMs : 140); }
			else { setTestStatus("error"); setTestError(data.error || data.message || "Недействительный ключ"); }
		} catch (err) {
			setTestStatus("error"); setTestError(err instanceof Error ? err.message : "Сетевой сбой");
		} finally { setIsTesting(false); }
	};

	return (
		<section className="space-y-2.5 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]" data-testid="copilot-model-routing-root">
			<div className="flex items-center justify-between gap-2">
				<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Cpu size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Интеллект и маршрутизация модели</span>
				</label>
				<div className="flex items-center p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<button
						type="button"
						onClick={() => setModelRoutingMode("server_managed")}
						className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
							modelRoutingMode === "server_managed" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
						}`}
						data-testid="copilot-routing-mode-server-btn"
					>
						Серверный роутинг
					</button>
					<button
						type="button"
						onClick={() => setModelRoutingMode("custom_byok")}
						className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
							modelRoutingMode === "custom_byok" ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
						}`}
						data-testid="copilot-routing-mode-byok-btn"
					>
						Свой ключ (BYOK)
					</button>
				</div>
			</div>

			{modelRoutingMode === "server_managed" ? (
				<div className="space-y-2 pt-1" data-testid="copilot-server-cascade-info">
					<div className="p-2.5 rounded-lg border border-[var(--teal,#0d9488)]/20 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-2.5">
						<Server size={15} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
						<div className="text-[11px] text-[var(--ink)] leading-relaxed">
							<strong>Умный серверный роутер DENTE активен.</strong> Система автоматически распределяет запросы между моделями с кулдауном 429 и мгновенным локальным фолбеком при сетевых сбоях.
						</div>
					</div>
					<div className="grid grid-cols-1 gap-1.5 pt-0.5">
						{SERVER_MANAGED_TIERS.map((tier) => {
							const Icon = tier.icon;
							return (
								<div key={tier.id} className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-start gap-2">
									<div className="w-5 h-5 rounded flex items-center justify-center bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] shrink-0 mt-0.5"><Icon size={12} /></div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-1">
											<span className="font-semibold text-[11px] text-[var(--ink)]">{tier.title}</span>
											<span className="text-[9px] px-1 rounded bg-[var(--paper-soft)] font-bold text-[var(--teal,#0d9488)] border border-[var(--line)]">{tier.badge}</span>
										</div>
										<p className="text-[10px] text-[var(--muted)] leading-tight m-0 mt-0.5">{tier.note}</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			) : (
				<div className="space-y-2.5 pt-1" data-testid="copilot-byok-controls">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label className="text-[10px] font-bold text-[var(--muted)] uppercase block mb-1">Провайдер ИИ</label>
							<select value={byokProvider} onChange={(e) => setByokProvider(e.target.value as AiProvider)} className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]">
								<option value="gemini">Google Gemini</option>
								<option value="anthropic">Anthropic Claude</option>
								<option value="openai">OpenAI</option>
								<option value="deepseek">DeepSeek</option>
							</select>
						</div>
						<div>
							<label className="text-[10px] font-bold text-[var(--muted)] uppercase block mb-1">Модель</label>
							<select value={byokModel} onChange={(e) => setByokModel(e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]">
								{MODERN_BYOK_MODELS.map((m) => (<option key={m.id} value={m.id}>{m.label} ({m.note})</option>))}
							</select>
						</div>
					</div>

					<div>
						<label className="text-[10px] font-bold text-[var(--muted)] uppercase block mb-1 flex items-center justify-between">
							<span className="flex items-center gap-1"><KeyRound size={11} className="text-[var(--teal,#0d9488)]" /><span>Персональный API-ключ</span></span>
							<span className="text-[9px] font-normal text-[var(--muted)]">Хранится локально в браузере</span>
						</label>
						<div className="relative">
							<input type={showKey ? "text" : "password"} value={byokApiKey} onChange={(e) => setByokApiKey(e.target.value)} placeholder="AIzaSy... / sk-ant-... / sk-..." className="w-full h-8 pl-2.5 pr-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-[11px] focus:ring-1 focus:ring-[var(--teal,#0d9488)] outline-none" />
							<button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer" title={showKey ? "Скрыть ключ" : "Показать ключ"}>
								{showKey ? <EyeOff size={13} /> : <Eye size={13} />}
							</button>
						</div>
						<div className="flex items-center justify-between gap-2 pt-1.5">
							<button type="button" onClick={handleTestConnection} aria-busy={isTesting} className="h-7 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer" data-testid="copilot-test-byok-btn">
								{isTesting ? <Loader2 size={12} className="animate-spin text-[var(--teal,#0d9488)]" /> : <Sparkles size={12} className="text-[var(--teal,#0d9488)]" />}
								<span>{isTesting ? "Проверка..." : "Проверить ключ"}</span>
							</button>
							{testStatus === "success" && (<span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check size={12} /><span>Активен ({testLatency} мс)</span></span>)}
							{testStatus === "error" && (<span className="text-[10px] font-medium text-rose-500 truncate max-w-[200px]" title={testError || undefined}>{testError || "Ошибка ключа"}</span>)}
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
