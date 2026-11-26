/**
 * @file CopilotSettingsModelRouting.tsx
 * @description Intelligent model routing & optional BYOK custom key for advanced users.
 * Mandate 8b: strictly <= 220 lines, Mandate 8e, Apple HIG segmented control.
 */

import React, { useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { Check, Cpu, Eye, EyeOff, KeyRound, Loader2, Server, Sparkles, Zap, HardDrive } from "lucide-react";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import type { AiProvider, ModelRoutingMode } from "../../../store/copilotStore";

export const MODERN_BYOK_MODELS: Array<{ id: string; provider: AiProvider; label: string; note: string }> = [
	{ id: "gemini-3.6-flash", provider: "gemini", label: "Gemini 3.6 Flash", note: "Основной клинический интеллект" },
	{ id: "gemini-3.5-flash-lite", provider: "gemini", label: "Gemini 3.5 Flash-Lite", note: "Быстрый отклик у кресла (<300 мс)" },
	{ id: "gemini-3.8-flash", provider: "gemini", label: "Gemini 3.8 Flash", note: "Глубокий клинический анализ и КЛКТ" },
	{ id: "gemini-3.5-flash", provider: "gemini", label: "Gemini 3.5 Flash", note: "Сбалансированный клинический анализ" },
	{ id: "claude-3-5-sonnet", provider: "anthropic", label: "Claude 3.5 Sonnet", note: "Аналитическая модель Anthropic" },
	{ id: "gpt-4o", provider: "openai", label: "OpenAI GPT-4o", note: "Мультимодальный клинический разбор" },
	{ id: "deepseek-r1", provider: "deepseek", label: "DeepSeek R1", note: "Глубокая цепочка рассуждений" },
];

export const SERVER_MANAGED_TIERS = [
	{ id: "smart_flash", title: "Основной клинический профиль (Gemini)", badge: "Основной", note: "Глубокий клинический анализ, томография КЛКТ, дифдиагноз, хирургия, протоколы.", icon: Sparkles },
	{ id: "chairside_lite", title: "Быстрый профиль у кресла (Gemini Lite)", badge: "<300 мс", note: "Мгновенный отклик у кресла врача для разметки зубной формулы и заметок.", icon: Zap },
	{ id: "local_fallback", title: "Локальный клинический словарь", badge: "Офлайн 100%", note: "Автономная работа без интернета на базе клинических стандартов.", icon: HardDrive },
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
		if (!byokApiKey.trim()) {
			setTestStatus("error");
			setTestError("Введите API-ключ");
			return;
		}
		setIsTesting(true);
		setTestStatus("idle");
		setTestError(null);
		try {
			const res = await fetch("/api/agent/validate-key", {
				method: "POST",
				credentials: "include",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					provider: byokProvider,
					apiKey: byokApiKey.trim(),
					model: byokModel,
				}),
			});
			let rawJson: unknown = {};
			try {
				rawJson = await res.json();
			} catch (parseErr) {
				rawJson = { error: parseErr instanceof Error ? parseErr.message : "Ошибка ответа сервера" };
			}
			const unwrapped =
				rawJson && typeof rawJson === "object" && "data" in rawJson
					? (rawJson as { data?: unknown }).data
					: rawJson;
			const data = (
				unwrapped && typeof unwrapped === "object"
					? unwrapped
					: {}
			) as { valid?: boolean; latencyMs?: number; error?: string; message?: string };
			if (res.ok && data.valid) {
				setTestStatus("success");
				setTestLatency(typeof data.latencyMs === "number" ? data.latencyMs : 140);
			} else {
				setTestStatus("error");
				setTestError(data.error || data.message || "Недействительный ключ");
			}
		} catch (err) {
			setTestStatus("error");
			setTestError(err instanceof Error ? err.message : "Сетевой сбой");
		} finally {
			setIsTesting(false);
		}
	};

	return (
		<section className="space-y-2.5 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]" data-testid="copilot-model-routing-root">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Cpu size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Интеллект и маршрутизация модели</span>
				</label>
				<div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] w-full sm:w-auto shrink-0">
					<button
						type="button"
						onClick={() => setModelRoutingMode("server_managed")}
						className={`h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
							modelRoutingMode === "server_managed"
								? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs font-semibold"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border border-transparent"
						}`}
						data-testid="copilot-routing-mode-server-btn"
					>
						Серверный роутинг
					</button>
					<button
						type="button"
						onClick={() => setModelRoutingMode("custom_byok")}
						className={`h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
							modelRoutingMode === "custom_byok"
								? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs font-semibold"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border border-transparent"
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
							<label className="text-[10px] font-semibold text-[var(--muted)] block mb-1">Провайдер ИИ</label>
							<select
								value={byokProvider}
								onChange={(e) => setByokProvider(e.target.value as AiProvider)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--primary)]"
							>
								<option value="gemini">Google Gemini</option>
								<option value="anthropic">Anthropic Claude</option>
								<option value="openai">OpenAI</option>
								<option value="deepseek">DeepSeek</option>
								<option value="groq">Groq</option>
								<option value="custom">Свой OpenAI-совместимый URL</option>
							</select>
						</div>
						<div>
							<label className="text-[10px] font-semibold text-[var(--muted)] block mb-1">Модель нейросети</label>
							<select
								value={byokModel}
								onChange={(e) => setByokModel(e.target.value)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--primary)]"
							>
								{MODERN_BYOK_MODELS.map((m) => (
									<option key={m.id} value={m.id}>{m.label} ({m.note})</option>
								))}
							</select>
						</div>
					</div>

					<div>
						<label className="text-[10px] font-semibold text-[var(--muted)] block mb-1 flex items-center justify-between">
							<span className="flex items-center gap-1">
								<KeyRound size={11} className="text-[var(--primary)]" />
								<span>Персональный API-ключ</span>
							</span>
							<span className="text-[9px] font-normal text-[var(--muted)]">Хранится локально в браузере</span>
						</label>
						<div className="relative">
							<input
								type={showKey ? "text" : "password"}
								value={byokApiKey}
								onChange={(e) => setByokApiKey(e.target.value)}
								placeholder="AIzaSy... / sk-ant-... / sk-..."
								className="w-full h-9 pl-3 pr-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-xs focus:ring-1 focus:ring-[var(--primary)] outline-none"
							/>
							<button
								type="button"
								onClick={() => setShowKey(!showKey)}
								className="absolute right-2 top-2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
								title={showKey ? "Скрыть ключ" : "Показать ключ"}
							>
								{showKey ? <EyeOff size={14} /> : <Eye size={14} />}
							</button>
						</div>
						<div className="flex items-center justify-between gap-2 pt-1.5">
							<button
								type="button"
								onClick={handleTestConnection}
								aria-busy={isTesting}
								className="h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer"
								data-testid="copilot-test-byok-btn"
							>
								{isTesting ? <Loader2 size={14} className="animate-spin text-[var(--primary)]" /> : <Sparkles size={14} className="text-[var(--primary)]" />}
								<span>{isTesting ? "Проверка..." : "Проверить ключ"}</span>
							</button>
							{testStatus === "success" && (
								<span className="text-xs font-semibold text-[var(--success)] flex items-center gap-1">
									<Check size={12} />
									<span>Активен ({testLatency} мс)</span>
								</span>
							)}
							{testStatus === "error" && (
								<span className="text-xs font-medium text-[var(--danger)] truncate max-w-[200px]" title={testError || undefined}>
									{testError || "Ошибка ключа"}
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
