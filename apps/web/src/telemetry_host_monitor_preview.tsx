import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/components.css";
import "./styles.css";

import {
	Activity,
	Cpu,
	Zap,
	AlertTriangle,
	ShieldCheck,
	Gauge,
	Layers,
	RefreshCw,
	Eye,
	HardDrive,
	Monitor,
	CheckCircle2,
	SlidersHorizontal,
	Sun,
	Moon,
} from "lucide-react";
import {
	useDynamicPerformanceState,
	getRuntimePerformanceMonitor,
	type DynamicLoadState,
} from "./utils/telemetry/runtimePerformanceMonitor";
import {
	getDeviceDiagnosticReport,
	isHostUnderHeavyLoad,
	getAdaptiveDicomDownscaleFactor,
	getHardwareResourceTier,
} from "./utils/deviceDetection";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

export function TelemetryHostMonitorPreview() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") || "light") as ThemeMode;
	const [theme, setTheme] = useState<ThemeMode>(initialTheme);

	const snapshot = useDynamicPerformanceState();
	const [diagnosticReport, setDiagnosticReport] = useState<Record<string, unknown>>({});

	useEffect(() => {
		const resolved = resolveTheme(theme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.documentElement.classList.toggle("dark", resolved.theme === "dark");
		document.body.className = `theme-${resolved.theme} ${resolved.theme === "dark" ? "dark" : ""} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [theme]);

	useEffect(() => {
		setDiagnosticReport(getDeviceDiagnosticReport());
		const timer = setInterval(() => {
			setDiagnosticReport(getDeviceDiagnosticReport());
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	const monitor = getRuntimePerformanceMonitor();

	const handleSimulateLoad = (state: DynamicLoadState) => {
		if (state === "WARNING") {
			monitor.recordLongTask(70, performance.now());
		} else if (state === "DEGRADED") {
			monitor.recordLongTask(180, performance.now());
			monitor.recordLongTask(160, performance.now() + 50);
		} else if (state === "CRITICAL") {
			monitor.recordLongTask(320, performance.now());
			monitor.recordLongTask(290, performance.now() + 100);
		}
	};

	const isHeavy = isHostUnderHeavyLoad();
	const downscale = getAdaptiveDicomDownscaleFactor();
	const tier = getHardwareResourceTier();

	const stateColors: Record<DynamicLoadState, { badge: string; bg: string; border: string; text: string }> = {
		HEALTHY: {
			badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
			bg: "from-emerald-500/10 to-transparent",
			border: "border-emerald-500/30",
			text: "text-emerald-600 dark:text-emerald-400",
		},
		WARNING: {
			badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
			bg: "from-amber-500/10 to-transparent",
			border: "border-amber-500/30",
			text: "text-amber-600 dark:text-amber-400",
		},
		DEGRADED: {
			badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
			bg: "from-orange-500/10 to-transparent",
			border: "border-orange-500/30",
			text: "text-orange-600 dark:text-orange-400",
		},
		CRITICAL: {
			badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
			bg: "from-rose-500/10 to-transparent",
			border: "border-rose-500/30",
			text: "text-rose-600 dark:text-rose-400",
		},
	};

	const activeStyle = stateColors[snapshot.state];

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col gap-6 select-none font-sans">
			{/* 1. Header Toolbar */}
			<header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
						<Activity size={22} className="animate-pulse" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-lg font-bold text-[var(--ink)] tracking-tight">
								Телеметрия хоста & Адаптивный рендеринг КТ
							</h1>
							<span
								data-testid="header-perf-state-badge"
								className={`px-2.5 py-0.5 text-xs font-black rounded-full border tracking-wide uppercase ${activeStyle.badge}`}
							>
								{snapshot.state}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Wave 338 • Zero-GC Burst Sampling • Long Task Detector (&gt;50ms) • Hysteresis Gate (10s)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setTheme(theme === "light" ? "dark" : "light")}
						className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line,#e2e8f0)] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
						data-testid="theme-toggle-btn"
					>
						{theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
						<span>{theme === "light" ? "Темная тема" : "Светлая тема"}</span>
					</button>
				</div>
			</header>

			{/* 2. Key Telemetry Metrics Grid */}
			<section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
				{/* Card 1: FPS */}
				<div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span className="font-medium">Частота кадров</span>
						<Gauge size={14} />
					</div>
					<div className="my-2">
						<span
							data-testid="telemetry-instant-fps"
							className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${activeStyle.text}`}
						>
							{snapshot.metrics.instantFps}
						</span>
						<span className="text-xs text-[var(--muted)] ml-1 font-semibold">FPS</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] flex items-center justify-between border-t border-[var(--line-subtle,#f1f5f9)] pt-1.5">
						<span>Мин / Макс:</span>
						<span className="font-mono font-medium">{snapshot.metrics.minFps} / {snapshot.metrics.maxFps}</span>
					</div>
				</div>

				{/* Card 2: Jitter */}
				<div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span className="font-medium">Джиттер кадров</span>
						<SlidersHorizontal size={14} />
					</div>
					<div className="my-2">
						<span
							data-testid="telemetry-jitter-ms"
							className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[var(--ink)]"
						>
							{snapshot.metrics.jitterMs}
						</span>
						<span className="text-xs text-[var(--muted)] ml-1 font-semibold">мс</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] flex items-center justify-between border-t border-[var(--line-subtle,#f1f5f9)] pt-1.5">
						<span>P95 времени кадра:</span>
						<span className="font-mono font-medium">{snapshot.metrics.p95FrameTimeMs} мс</span>
					</div>
				</div>

				{/* Card 3: Long Tasks */}
				<div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span className="font-medium">Длинные задачи (&gt;50мс)</span>
						<AlertTriangle size={14} />
					</div>
					<div className="my-2">
						<span
							data-testid="telemetry-long-tasks-count"
							className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
								snapshot.metrics.longTaskCount > 0 ? "text-amber-500" : "text-[var(--ink)]"
							}`}
						>
							{snapshot.metrics.longTaskCount}
						</span>
						<span className="text-xs text-[var(--muted)] ml-1 font-semibold">событий</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] flex items-center justify-between border-t border-[var(--line-subtle,#f1f5f9)] pt-1.5">
						<span>Макс задержка:</span>
						<span className="font-mono font-medium">{snapshot.metrics.maxLongTaskDurationMs} мс</span>
					</div>
				</div>

				{/* Card 4: Memory Pressure */}
				<div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span className="font-medium">Куча Chromium</span>
						<Cpu size={14} />
					</div>
					<div className="my-2">
						<span
							data-testid="telemetry-memory-ratio"
							className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[var(--ink)]"
						>
							{snapshot.metrics.memoryPressureRatio !== null
								? `${Math.round(snapshot.metrics.memoryPressureRatio * 100)}%`
								: "N/A"}
						</span>
						<span className="text-xs text-[var(--muted)] ml-1 font-semibold">занято</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] flex items-center justify-between border-t border-[var(--line-subtle,#f1f5f9)] pt-1.5">
						<span>Куча / Лимит:</span>
						<span className="font-mono font-medium">
							{snapshot.metrics.usedHeapMb !== null ? `${snapshot.metrics.usedHeapMb} МБ` : "ОК"}
						</span>
					</div>
				</div>
			</section>

			{/* 3. Adaptive Pipeline: CT/DICOM Reaction */}
			<section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<Layers size={18} className="text-teal-600 dark:text-teal-400" />
						<h2 className="text-sm font-bold text-[var(--ink)]">
							Адаптивный конвейер рендеринга КТ / DICOM (Mandates 8c, 8e, 8k, 8n)
						</h2>
					</div>
					<span
						data-testid="adaptive-heavy-load-flag"
						className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${
							isHeavy
								? "bg-rose-500/10 text-rose-600 border-rose-500/30"
								: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
						}`}
					>
						{isHeavy ? "Перегрузка активна: даунскейл включен" : "Штатный режим: 100% разрешение"}
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 flex flex-col gap-1.5">
						<span className="text-xs font-semibold text-[var(--muted)]">Буфер DicomViewport</span>
						<div className="flex items-baseline gap-2">
							<span className="text-xl font-bold font-mono text-[var(--ink)]">
								{isHeavy ? "768×768" : "2048×2048"}
							</span>
							<span className="text-xs text-[var(--muted)]">
								({Math.round(downscale * 100)}% масшт.)
							</span>
						</div>
						<p className="text-[11px] text-[var(--muted)]">
							Сглаживание: <strong className="text-[var(--ink)]">{isHeavy ? "low (fast)" : "high (bicubic)"}</strong>
						</p>
					</div>

					<div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 flex flex-col gap-1.5">
						<span className="text-xs font-semibold text-[var(--muted)]">Панорамный воркер</span>
						<div className="flex items-baseline gap-2">
							<span className="text-xl font-bold font-mono text-[var(--ink)]">
								{isHeavy ? "1.5 мм (шаг Z)" : "0.5 мм (шаг Z)"}
							</span>
						</div>
						<p className="text-[11px] text-[var(--muted)]">
							Защита потока: <strong className="text-[var(--ink)]">{isHeavy ? "Агрессивная" : "Базовая"}</strong>
						</p>
					</div>

					<div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 flex flex-col gap-1.5">
						<span className="text-xs font-semibold text-[var(--muted)]">Эффекты интерфейса</span>
						<div className="flex items-baseline gap-2">
							<span className="text-xl font-bold font-mono text-[var(--ink)]">
								{snapshot.recommendedBlurDisabled ? "Блюр отключен" : "Блюр активен"}
							</span>
						</div>
						<p className="text-[11px] text-[var(--muted)]">
							GPU профиль: <strong className="text-[var(--ink)]">{String(tier).toUpperCase()}</strong>
						</p>
					</div>
				</div>
			</section>

			{/* 4. Interactive Simulation & Hysteresis Demonstration */}
			<section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<Zap size={18} className="text-amber-500" />
						<h2 className="text-sm font-bold text-[var(--ink)]">
							Тест автомата состояний & 10-секундного анти-дёргающего гистерезиса
						</h2>
					</div>
					<span className="text-xs text-[var(--muted)] font-mono">
						Смена состояния: {snapshot.previousState} → {snapshot.state}
					</span>
				</div>

				<p className="text-xs text-[var(--muted)] leading-relaxed">
					При просадке FPS или появлении Long Task &gt;50мс автомат <strong>мгновенно деградирует</strong> в WARNING/DEGRADED/CRITICAL, защищая врача от зависания интерфейса. Однако возврат в более легкий режим происходит строго после <strong>10 секунд стабильности</strong> (Anti-Thrashing Invariant).
				</p>

				<div className="flex flex-wrap gap-2.5 pt-1">
					<button
						type="button"
						onClick={() => handleSimulateLoad("WARNING")}
						className="min-h-[40px] px-3.5 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
						data-testid="simulate-warning-btn"
					>
						⚡ Вызвать микро-статтер (WARNING)
					</button>

					<button
						type="button"
						onClick={() => handleSimulateLoad("DEGRADED")}
						className="min-h-[40px] px-3.5 py-2 rounded-lg border border-orange-500/40 bg-orange-500/10 text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-all cursor-pointer shadow-sm"
						data-testid="simulate-degraded-btn"
					>
						🔥 Симулировать нагрузку КТ (DEGRADED)
					</button>

					<button
						type="button"
						onClick={() => handleSimulateLoad("CRITICAL")}
						className="min-h-[40px] px-3.5 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer shadow-sm"
						data-testid="simulate-critical-btn"
					>
						🚨 Симулировать тяжелый лаг (CRITICAL)
					</button>
				</div>
			</section>

			{/* 5. Live Diagnostics Footer */}
			<footer className="text-xs text-[var(--muted)] flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
				<div className="flex items-center gap-2">
					<ShieldCheck size={14} className="text-emerald-500" />
					<span>DENTE Clinical OS • Мониторинг загрузки хоста активен (&lt;0.2% CPU overhead)</span>
				</div>
				<div className="font-mono text-[11px]">
					Вкладка: {snapshot.metrics.isTabVisible ? "Видна (Активна)" : "Скрыта (Заморожена)"}
				</div>
			</footer>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TelemetryHostMonitorPreview />);
}
