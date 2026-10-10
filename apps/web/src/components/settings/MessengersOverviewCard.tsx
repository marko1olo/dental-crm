import React, { useCallback, useEffect, useState } from "react";
import {
	AlertCircle,
	ArrowRight,
	Bot,
	CheckCircle2,
	Clock,
	MessageSquare,
	Radio,
	RefreshCw,
	Settings,
	ShieldCheck,
	Smartphone,
	Sparkles,
	User,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";

export type MessengerChannelStatus = "connected" | "pending_qr" | "unconfigured";

export interface MessengerChannelItem {
	id: string; // "tg_bot" | "tg_account" | "vk_group" | "vk_account" | "wa_phone" | "wa_waba" | "max_bot"
	title: string;
	shortBadge: string;
	channel: "telegram" | "vk" | "whatsapp" | "max";
	type: "bot" | "account" | "group" | "phone" | "waba";
	status: MessengerChannelStatus;
	statusText: string;
	statusColor: "green" | "yellow" | "gray";
	details?: string;
	tokenMasked?: string;
	configTab: string;
	updatedAt?: string | null;
}

export interface MessengersOverviewSummary {
	total: number;
	connectedCount: number;
	pendingCount: number;
	unconfiguredCount: number;
	healthStatus: string;
}

export interface MessengersOverviewCardProps {
	onSelectTab: (tabId: string) => void;
	onOpenOperatorDesk?: () => void;
	onOpenBotStudio?: () => void;
	className?: string;
}

const CHANNEL_THEMES: Record<
	string,
	{ iconColor: string; bgSoft: string; borderAccent: string; defaultIcon: "bot" | "user" | "phone" }
> = {
	tg_bot: {
		iconColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.1)",
		borderAccent: "rgba(13, 148, 136, 0.3)",
		defaultIcon: "bot",
	},
	tg_account: {
		iconColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.1)",
		borderAccent: "rgba(13, 148, 136, 0.3)",
		defaultIcon: "user",
	},
	vk_group: {
		iconColor: "#0284c7",
		bgSoft: "rgba(2, 132, 199, 0.1)",
		borderAccent: "rgba(2, 132, 199, 0.3)",
		defaultIcon: "bot",
	},
	vk_account: {
		iconColor: "#0284c7",
		bgSoft: "rgba(2, 132, 199, 0.1)",
		borderAccent: "rgba(2, 132, 199, 0.3)",
		defaultIcon: "user",
	},
	wa_phone: {
		iconColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.1)",
		borderAccent: "rgba(13, 148, 136, 0.3)",
		defaultIcon: "phone",
	},
	wa_waba: {
		iconColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.1)",
		borderAccent: "rgba(13, 148, 136, 0.3)",
		defaultIcon: "bot",
	},
	max_bot: {
		iconColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.1)",
		borderAccent: "rgba(13, 148, 136, 0.3)",
		defaultIcon: "bot",
	},
};

export const DEFAULT_OVERVIEW_CHANNELS: MessengerChannelItem[] = [
	{
		id: "tg_bot",
		title: "Telegram Бот",
		shortBadge: "TG Бот",
		channel: "telegram",
		type: "bot",
		status: "unconfigured",
		statusText: "Не настроен",
		statusColor: "gray",
		details: "Ожидает токен BotFather",
		configTab: "telegram",
	},
	{
		id: "tg_account",
		title: "Telegram Аккаунт",
		shortBadge: "TG Аккаунт",
		channel: "telegram",
		type: "account",
		status: "unconfigured",
		statusText: "Не настроен",
		statusColor: "gray",
		details: "Подключение по номеру телефона / QR",
		configTab: "telegram",
	},
	{
		id: "vk_group",
		title: "VK Сообщество",
		shortBadge: "VK Группа",
		channel: "vk",
		type: "group",
		status: "unconfigured",
		statusText: "Не настроен",
		statusColor: "gray",
		details: "Ожидает токен группы",
		configTab: "vk",
	},
	{
		id: "vk_account",
		title: "VK Личный аккаунт",
		shortBadge: "VK Аккаунт",
		channel: "vk",
		type: "account",
		status: "unconfigured",
		statusText: "Не настроен",
		statusColor: "gray",
		details: "Личный диалог врача/администратора",
		configTab: "vk",
	},
	{
		id: "wa_phone",
		title: "WhatsApp Телефон",
		shortBadge: "WA Телефон",
		channel: "whatsapp",
		type: "phone",
		status: "unconfigured",
		statusText: "Не настроен",
		statusColor: "gray",
		details: "Прямой номер WhatsApp через QR",
		configTab: "whatsapp",
	},
	{
		id: "wa_waba",
		title: "WhatsApp Business API",
		shortBadge: "WA WABA",
		channel: "whatsapp",
		type: "waba",
		status: "unconfigured",
		statusText: "Не настроен",
		statusColor: "gray",
		details: "Meta Cloud API / Номер WABA",
		configTab: "whatsapp",
	},
	{
		id: "max_bot",
		title: "1C:MAX Мессенджер",
		shortBadge: "MAX",
		channel: "max",
		type: "bot",
		status: "unconfigured",
		statusText: "Не настроен",
		statusColor: "gray",
		details: "Корпоративный мессенджер MAX",
		configTab: "max",
	},
];

export function MessengersOverviewCard({
	onSelectTab,
	onOpenOperatorDesk,
	onOpenBotStudio,
	className = "",
}: MessengersOverviewCardProps) {
	const [channels, setChannels] = useState<MessengerChannelItem[]>(DEFAULT_OVERVIEW_CHANNELS);
	const [summary, setSummary] = useState<MessengersOverviewSummary | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
	const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs?: number; message: string }>>({});

	const fetchOverview = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/messengers/overview", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.channels)) {
					setChannels(data.channels);
				}
				if (data.summary) {
					setSummary(data.summary);
				}
			}
		} catch (err) {
			console.warn("[MessengersOverviewCard] Error fetching overview:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchOverview();
	}, [fetchOverview]);

	const handleTestConnection = async (channel: MessengerChannelItem) => {
		setTestingChannelId(channel.id);
		try {
			const res = await fetch("/api/messengers/test-connection", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ channelId: channel.id }),
			});
			if (!res.ok) {
				throw new Error(`HTTP error ${res.status}`);
			}
			const data = await res.json();
			setTestResults((prev) => ({
				...prev,
				[channel.id]: {
					ok: Boolean(data.ok),
					latencyMs: data.latencyMs ?? undefined,
					message: data.message || (data.ok ? "Связь стабильна" : "Канал не отвечает"),
				},
			}));

			if (data.ok) {
				showToast(`${channel.title}: связь стабильна (${data.latencyMs ?? 25}мс)`, "success");
			} else {
				showToast(`${channel.title}: ${data.message || "Канал не настроен"}`, "info");
			}
		} catch {
			showToast(`Ошибка проверки связи с ${channel.title}`, "error");
		} finally {
			setTestingChannelId(null);
		}
	};

	const connectedCount = summary?.connectedCount ?? channels.filter((c) => c.status === "connected").length;
	const pendingCount = summary?.pendingCount ?? channels.filter((c) => c.status === "pending_qr").length;
	const unconfiguredCount = summary?.unconfiguredCount ?? channels.filter((c) => c.status === "unconfigured").length;

	return (
		<div
			className={`w-full rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-xs p-5 flex flex-col gap-4 text-[var(--ink,#0f172a)] transition-all ${className}`}
			data-testid="messengers-overview-card"
		>
			{/* Top Header & Status Overview Pills */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300 flex items-center justify-center shrink-0">
						<Radio size={20} />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="font-bold text-base leading-tight">
								Омниканальный центр мессенджеров
							</h3>
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-[var(--line,#e2e8f0)]">
								<ShieldCheck size={12} className="text-emerald-500" />
								<span>AES-256-GCM Vault</span>
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
							7 каналов связи в режиме единого окна: боты, личные аккаунты, группы, WABA и 1C:MAX
						</p>
					</div>
				</div>

				{/* Global Quick Action & Indicators */}
				<div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
					<div className="flex items-center gap-1.5 text-xs font-semibold">
						<span
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
							title="Каналы онлайн и готовые к приему сообщений"
						>
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
							<span>{connectedCount} Онлайн</span>
						</span>

						{pendingCount > 0 && (
							<span
								className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
								title="Ожидают сканирования QR или подтверждения"
							>
								<span className="w-2 h-2 rounded-full bg-amber-500" />
								<span>{pendingCount} Ожидает</span>
							</span>
						)}

						<span
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
							title="Каналы без введенного токена"
						>
							<span className="w-2 h-2 rounded-full bg-slate-400" />
							<span>{unconfiguredCount} Откл.</span>
						</span>
					</div>

					<button
						type="button"
						onClick={fetchOverview}
						className="p-2 rounded-lg border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
						title="Обновить статусы каналов"
					>
						<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
					</button>

					{onOpenOperatorDesk && (
						<button
							type="button"
							onClick={onOpenOperatorDesk}
							className="primary-button min-h-[32px] h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
							title="Открыть пульт оператора всех ботов"
						>
							<MessageSquare size={13} />
							<span>Диалоги оператора</span>
						</button>
					)}
				</div>
			</div>

			{/* 6 Channels Status Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{channels.map((ch) => {
					const defaultTheme = { iconColor: "#0284c7", bgSoft: "rgba(2, 132, 199, 0.08)", borderAccent: "rgba(2, 132, 199, 0.25)", defaultIcon: "bot" as const };
					const theme = CHANNEL_THEMES[ch.id] ?? CHANNEL_THEMES.tg_bot ?? defaultTheme;
					const isTesting = testingChannelId === ch.id;
					const testRes = testResults[ch.id];

					return (
						<div
							key={ch.id}
							className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 flex flex-col justify-between gap-3 hover:border-[var(--line-strong)] transition-all shadow-xs"
							data-testid={`channel-card-${ch.id}`}
						>
							{/* Top info row */}
							<div>
								<div className="flex items-start justify-between gap-2 mb-1.5">
									<div className="flex items-center gap-2">
										<div
											className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
											style={{ backgroundColor: theme.bgSoft, color: theme.iconColor }}
										>
											{ch.type === "account" ? (
												<User size={15} />
											) : ch.type === "phone" ? (
												<Smartphone size={15} />
											) : (
												<Bot size={15} />
											)}
										</div>
										<div>
											<h4 className="text-xs font-bold leading-tight">{ch.title}</h4>
											<span
												className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase text-white mt-0.5"
												style={{ backgroundColor: theme.iconColor }}
											>
												{ch.shortBadge}
											</span>
										</div>
									</div>

									{/* 1-Line Color Indicator */}
									<div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold">
										{ch.status === "connected" && (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
												<CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
												<span>{ch.statusText}</span>
											</span>
										)}
										{ch.status === "pending_qr" && (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
												<Clock size={11} className="text-amber-600 dark:text-amber-400" />
												<span>{ch.statusText}</span>
											</span>
										)}
										{ch.status === "unconfigured" && (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
												<AlertCircle size={11} className="text-slate-500" />
												<span>{ch.statusText}</span>
											</span>
										)}
									</div>
								</div>

								{/* Channel details & masked token */}
								<div className="text-[11px] text-[var(--muted,#64748b)] flex flex-col gap-0.5 mt-2">
									<p className="truncate font-medium text-[var(--ink,#0f172a)]">
										{ch.details || "Готов к подключению"}
									</p>
									{ch.tokenMasked ? (
										<p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
											Ключ: {ch.tokenMasked}
										</p>
									) : (
										<p className="text-[10px] text-slate-400 italic">
											Токен не задан
										</p>
									)}
									{testRes && (
										<p
											className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${
												testRes.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
											}`}
										>
											{testRes.ok ? (
												<CheckCircle2 size={11} className="inline shrink-0" />
											) : (
												<AlertCircle size={11} className="inline shrink-0" />
											)}
											<span>{testRes.message}</span>
										</p>
									)}
								</div>
							</div>

							{/* Action Footer: «Настроить» and «Проверить связь» */}
							<div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[var(--line,#e2e8f0)]">
								<button
									type="button"
									onClick={() => onSelectTab(ch.configTab)}
									className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--line,#e2e8f0)] transition-colors flex items-center gap-1 cursor-pointer"
									title={`Перейти к настройкам ${ch.title}`}
								>
									<Settings size={12} />
									<span>Настроить</span>
								</button>

								<button
									type="button"
									disabled={isTesting}
									onClick={() => handleTestConnection(ch)}
									className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
									title="Отправить проверочный ping в шлюз мессенджера"
								>
									<Radio size={12} className={isTesting ? "animate-spin" : ""} />
									<span>{isTesting ? "Проверка..." : "Связь"}</span>
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Footer bar with quick wizard launch */}
			{onOpenBotStudio && (
				<div className="mt-1 p-3 rounded-xl bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-indigo-500/10 border border-teal-500/20 flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-2">
						<Sparkles size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-semibold text-[var(--ink,#0f172a)]">
							Быстрый мастер подключения любого канала без программистов
						</span>
					</div>
					<button
						type="button"
						onClick={onOpenBotStudio}
						className="px-3 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
					>
						<Bot size={13} />
						<span>Запустить мастер ботов</span>
						<ArrowRight size={12} />
					</button>
				</div>
			)}
		</div>
	);
}
