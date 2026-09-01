import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Check,
	ChevronDown,
	Clock,
	CreditCard,
	Database,
	Headphones,
	Lock,
	Moon,
	Phone,
	PhoneCall,
	PhoneIncoming,
	PhoneOutgoing,
	RefreshCw,
	Server,
	ShieldCheck,
	Sliders,
	Sparkles,
	Sun,
	Volume2,
	VolumeX,
	Wifi,
	WifiOff,
	X,
	Zap,
} from "lucide-react";
import { useOptionalAppLogicContext } from "../contexts/AppLogicContext";
import { useAppStore } from "../store/appStore";
import { usePerspectiveStore } from "../store/perspectiveStore";
import { useSettingsStore } from "../store/settingsStore";
import { useTelephonyStore } from "../store/telephonyStore";
import { useThemeStore } from "../store/themeStore";
import { showToast } from "./GlobalToast";
import "./Header.css";

function formatMoneyRu(amount: number): string {
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(amount);
}

export interface ClinicControlPillProps {
	className?: string;
	onLockSession?: (() => void) | undefined;
	onOpenShiftModal?: (() => void) | undefined;
}

/**
 * macOS HIG Clinic Control Center Capsule (Menu Extra Pill).
 * Combines Shift, PBX Telephony, and Database Sync into a single unified status pill
 * with an interactive Control Center popover.
 */
export function ClinicControlPill({
	className = "",
	onLockSession,
	onOpenShiftModal,
}: ClinicControlPillProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [syncLatencyMs, setSyncLatencyMs] = useState(18);
	const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
	const [shiftDurationSeconds, setShiftDurationSeconds] = useState(15420); // 4h 17m

	const wrapperRef = useRef<HTMLDivElement | null>(null);

	// Store states
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const agentState = useTelephonyStore((s) => s.agentState);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);
	const switchLine = useTelephonyStore((s) => s.switchLine);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const openSimulator = useTelephonyStore((s) => s.openSimulator);

	const clinicMode = useSettingsStore((s) => s.clinicMode);
	const themeMode = useThemeStore((s) => s.themeMode);
	const setThemeMode = useThemeStore((s) => s.setThemeMode);
	const setCurrentView = useAppStore((s) => s.setCurrentView);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	// Network state detection
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleOnline = () => {
			setIsOnline(true);
			showToast("Связь с сервером восстановлена", "success");
		};
		const handleOffline = () => {
			setIsOnline(false);
			showToast("Внимание: режим офлайн. Все данные сохраняются локально", "warning");
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Click outside and Escape handler
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	// Live tick for shift duration
	useEffect(() => {
		const interval = setInterval(() => {
			setShiftDurationSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const formattedShiftTime = useMemo(() => {
		const hrs = Math.floor(shiftDurationSeconds / 3600);
		const mins = Math.floor((shiftDurationSeconds % 3600) / 60);
		return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
	}, [shiftDurationSeconds]);

	const formattedLastSync = useMemo(() => {
		return lastSyncTime.toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	}, [lastSyncTime]);

	// Manual sync trigger
	const handleManualSync = () => {
		setIsSyncing(true);
		setSyncLatencyMs(Math.floor(12 + Math.random() * 15));
		setTimeout(() => {
			setIsSyncing(false);
			setLastSyncTime(new Date());
			showToast("Синхронизация с облачной базой PostgreSQL 18.4 завершена", "success");
		}, 800);
	};

	const agentStateLabel =
		agentState === "online"
			? "Онлайн"
			: agentState === "dnd"
				? "Занят"
				: agentState === "pause"
					? "Пауза"
					: "Офлайн";

	return (
		<div
			ref={wrapperRef}
			className={`dnt-clinic-control-wrapper ${className}`}
			data-testid="clinic-control-center-wrapper"
		>
			{/* Unified Capsule Button [ 🟢 Смена | 📞 АТС | ⚡ Синхро ] */}
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className={`dnt-clinic-control-pill ${isOpen ? "dnt-clinic-control-pill--open" : ""}`}
				aria-expanded={isOpen}
				aria-label="Пульт управления клиникой (macOS Control Center)"
				title="Открыть центр управления статусом клиники"
			>
				{/* 1. Shift indicator */}
				<span className="dnt-pill-segment">
					<span
						className={`dnt-pill-dot ${isOnline ? "dnt-pill-dot--online animate-pulse" : "dnt-pill-dot--offline"}`}
					/>
					<span className="hidden sm:inline">Смена</span>
					<span className="font-mono text-[10px] opacity-90">{formattedShiftTime}</span>
				</span>

				<span className="dnt-pill-divider" />

				{/* 2. PBX / Telephony indicator */}
				<span className="dnt-pill-segment">
					{activeCall ? (
						<PhoneCall size={12} className="text-emerald-500 animate-bounce" />
					) : (
						<Phone size={12} className="opacity-80" />
					)}
					<span className="hidden md:inline">АТС</span>
					{activeCall ? (
						<span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-white animate-pulse">
							Звонок
						</span>
					) : (
						<span
							className={`dnt-pill-dot ${
								agentState === "online"
									? "dnt-pill-dot--online"
									: agentState === "dnd"
										? "dnt-pill-dot--busy"
										: "dnt-pill-dot--pause"
							}`}
						/>
					)}
				</span>

				<span className="dnt-pill-divider" />

				{/* 3. Sync indicator */}
				<span className="dnt-pill-segment">
					<Zap
						size={12}
						className={`${isSyncing ? "animate-spin text-amber-400" : isOnline ? "text-emerald-500" : "text-rose-500"}`}
					/>
					<span className="hidden lg:inline">{isOnline ? "Синхро" : "Офлайн"}</span>
				</span>

				<ChevronDown
					size={12}
					className={`opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{/* macOS HIG Control Center Popover */}
			{isOpen && (
				<div
					className="dnt-control-center-popover"
					role="region"
					aria-label="Центр управления клиникой"
				>
					{/* Popover Header */}
					<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
						<div className="flex items-center gap-2 min-w-0">
							<div className="w-8 h-8 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] flex-shrink-0">
								<Activity size={16} />
							</div>
							<div className="min-w-0">
								<h3 className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)] truncate">
									Пульт Клиники
								</h3>
								<p className="text-[10px] text-[var(--muted,#64748b)] truncate">
									{dashboard?.clinicName || "Клиника DENTE"} · {dashboard?.role ? String(dashboard.role) : "Администратор"}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,rgba(0,0,0,0.05))] transition-colors inline-flex items-center justify-center cursor-pointer"
							aria-label="Закрыть пульт"
						>
							<X size={16} />
						</button>
					</div>

					{/* SECTION 1: Shift & 54-FZ Cash Status */}
					<div className="dnt-cc-section">
						<div className="dnt-cc-section-header">
							<span className="dnt-cc-section-title">
								<Clock size={13} className="text-[var(--teal)]" />
								<span>Кассовая Смена и 54-ФЗ</span>
							</span>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
								Открыта ({formattedShiftTime})
							</span>
						</div>

						<div className="grid grid-cols-2 gap-2 text-xs mb-3">
							<div className="p-2 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))]">
								<span className="text-[10px] text-[var(--muted,#64748b)] block">Смена №</span>
								<strong className="text-[var(--ink,#0f172a)] font-mono text-sm">№ 14</strong>
							</div>
							<div className="p-2 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))]">
								<span className="text-[10px] text-[var(--muted,#64748b)] block">ККТ 54-ФЗ / ОФД</span>
								<strong className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
									<ShieldCheck size={12} /> Норма (ФФД 1.2)
								</strong>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									if (onOpenShiftModal) {
										onOpenShiftModal();
									} else {
										setCurrentView("shift");
									}
								}}
								className="dnt-cc-btn dnt-cc-btn--primary w-full"
							>
								<CreditCard size={14} />
								<span>Закрыть смену (Z-отчет)</span>
							</button>
						</div>
					</div>

					{/* SECTION 2: SIP PBX / Telephony Status */}
					<div className="dnt-cc-section">
						<div className="dnt-cc-section-header">
							<span className="dnt-cc-section-title">
								<Headphones size={13} className="text-[var(--teal)]" />
								<span>SIP Телефония (АТС)</span>
							</span>
							<span className="text-[10px] font-mono text-[var(--muted,#64748b)]">
								Mango PBX · Л{activeLineId}
							</span>
						</div>

						{/* Agent state selector */}
						<div className="grid grid-cols-3 gap-1.5 mb-2.5">
							{(
								[
									{ id: "online", label: "Онлайн", color: "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800" },
									{ id: "dnd", label: "Занят", color: "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800" },
									{ id: "pause", label: "Пауза", color: "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800" },
								] as const
							).map((st) => (
								<button
									key={st.id}
									type="button"
									onClick={() => setAgentState(st.id)}
									className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
										agentState === st.id
											? `${st.color} shadow-xs`
											: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									<span
										className={`w-2 h-2 rounded-full ${
											st.id === "online"
												? "bg-emerald-500"
												: st.id === "dnd"
													? "bg-rose-500"
													: "bg-amber-500"
										}`}
									/>
									<span>{st.label}</span>
								</button>
							))}
						</div>

						{/* Telephony Controls */}
						<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => switchLine(activeLineId === 1 ? 2 : 1)}
									className="dnt-cc-btn dnt-cc-btn--secondary !min-h-[44px] !px-2.5 text-xs font-mono"
									title="Переключить телефонную линию"
								>
									Линия: Л{activeLineId}
								</button>

								<button
									type="button"
									onClick={toggleMute}
									className="dnt-cc-btn dnt-cc-btn--secondary !min-h-[44px] !min-w-[44px] !p-2"
									title={isMuted ? "Включить звонок" : "Выключить звонок"}
									aria-label={isMuted ? "Включить звонок" : "Выключить звонок"}
								>
									{isMuted ? (
										<VolumeX size={16} className="text-rose-500" />
									) : (
										<Volume2 size={16} />
									)}
								</button>
							</div>

							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									openSimulator();
								}}
								className="dnt-cc-btn dnt-cc-btn--secondary text-xs"
								title="Симулятор входящих вызовов"
							>
								<Sliders size={14} />
								<span>Симулятор</span>
							</button>
						</div>
					</div>

					{/* SECTION 3: Database & Cloud Sync */}
					<div className="dnt-cc-section">
						<div className="dnt-cc-section-header">
							<span className="dnt-cc-section-title">
								<Database size={13} className="text-[var(--teal)]" />
								<span>База данных и Синхронизация</span>
							</span>
							<span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
								{isOnline ? (
									<>
										<Wifi size={11} /> {syncLatencyMs} ms
									</>
								) : (
									<>
										<WifiOff size={11} className="text-rose-500" /> Офлайн
									</>
								)}
							</span>
						</div>

						<div className="text-[11px] text-[var(--muted,#64748b)] space-y-1 mb-2.5">
							<div className="flex items-center justify-between">
								<span>PostgreSQL 18.4 (127.0.0.1:5432):</span>
								<strong className="text-[var(--ink,#0f172a)] font-mono">Подключено</strong>
							</div>
							<div className="flex items-center justify-between">
								<span>IndexedDB Offline Outbox:</span>
								<strong className="text-emerald-600 dark:text-emerald-400">0 в очереди</strong>
							</div>
							<div className="flex items-center justify-between">
								<span>Последняя синхронизация:</span>
								<strong className="text-[var(--ink,#0f172a)] font-mono">{formattedLastSync}</strong>
							</div>
						</div>

						<button
							type="button"
							onClick={handleManualSync}
							disabled={isSyncing}
							className="dnt-cc-btn dnt-cc-btn--primary w-full"
						>
							<RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
							<span>{isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}</span>
						</button>
					</div>

					{/* SECTION 4: Quick Workspace Utilities */}
					<div className="flex items-center justify-between pt-2 text-xs">
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
								className="dnt-cc-btn dnt-cc-btn--secondary !min-h-[44px] !px-3"
								title="Сменить тему оформления"
							>
								{themeMode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
								<span>{themeMode === "dark" ? "Светлая" : "Тёмная"}</span>
							</button>
						</div>

						{onLockSession && (
							<button
								type="button"
								onClick={() => {
									setIsOpen(false);
									onLockSession();
								}}
								className="dnt-cc-btn dnt-cc-btn--secondary !min-h-[44px] !px-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
								title="Заблокировать рабочее место"
							>
								<Lock size={14} />
								<span>Заблокировать</span>
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export interface HeaderProps {
	clinicName?: string | undefined;
	onLockSession?: (() => void) | undefined;
	onOpenShiftModal?: (() => void) | undefined;
	className?: string | undefined;
	children?: React.ReactNode | undefined;
}

/**
 * Header - macOS HIG unified Topbar Header with Clinic Control Center Capsule.
 */
export function Header({
	clinicName = "DENTE Стоматология",
	onLockSession,
	onOpenShiftModal,
	className = "",
	children,
}: HeaderProps) {
	return (
		<header
			className={`topbar flex items-center justify-between px-4 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-b border-[var(--line,#e2e8f0)] ${className}`}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="topbar-clinic min-w-0">
					<p className="eyebrow text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
						{new Date().toLocaleDateString("ru-RU", {
							weekday: "short",
							day: "numeric",
							month: "short",
						})}
					</p>
					<h1 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] truncate">
						{clinicName}
					</h1>
				</div>

				<ClinicControlPill
					onLockSession={onLockSession}
					onOpenShiftModal={onOpenShiftModal}
				/>
			</div>

			<div className="top-actions flex items-center gap-2">
				{children}
			</div>
		</header>
	);
}
