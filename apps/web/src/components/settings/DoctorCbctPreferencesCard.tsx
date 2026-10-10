/**
 * apps/web/src/components/settings/DoctorCbctPreferencesCard.tsx
 *
 * Dedicated UI card for doctor's default CBCT reconstruction parameters.
 * Subscribes to 'dente:cbct-defaults-updated' for reactive UI sync and launches
 * DoctorCbctSettingsModal for interactive preview tuning.
 *
 * Mandate 8b (< 800 lines), Mandate 8e (clinical desktop density).
 */

import {
	Activity,
	BatteryLow,
	Check,
	Cpu,
	Info,
	Layers,
	RotateCcw,
	RotateCw,
	Scan,
	ShieldCheck,
	Sliders,
	Sparkles,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	CANONICAL_CBCT_SETTINGS,
	CBCT_INTERPOLATION_METHODS,
	type CbctInterpolationMethod,
	type DoctorCbctDefaultSettings,
	loadDoctorCbctSettings,
	resetDoctorCbctSettings,
	saveDoctorCbctSettings,
} from "../radiology/cbctLutMath";
import { DoctorCbctSettingsModal } from "./DoctorCbctSettingsModal";
import {
	useHardwareProfile,
	useHardwareAdaptiveSettings,
	getHardwareTierOverride,
	setHardwareTierOverride,
	reevaluateHardwareProfile,
} from "../../lib/hardwareCapabilities";
import type { HardwareTier } from "@dental/shared";

export function DoctorCbctPreferencesCard() {
	const [settings, setSettings] = useState<DoctorCbctDefaultSettings>(() =>
		loadDoctorCbctSettings(),
	);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const hwProfile = useHardwareProfile();
	const hwAdaptive = useHardwareAdaptiveSettings();
	const [overrideTier, setOverrideTierState] = useState<HardwareTier | null>(() =>
		getHardwareTierOverride(),
	);

	const handleTierSelect = useCallback((tier: HardwareTier | null) => {
		setHardwareTierOverride(tier);
		setOverrideTierState(tier);
		showToast(
			tier
				? `Профиль железа переключен: ${tier.toUpperCase()}`
				: "Автоадаптация производительности включена",
			"info",
		);
	}, []);

	const [isReevaluating, setIsReevaluating] = useState(false);

	const handleReevaluate = useCallback(() => {
		setIsReevaluating(true);
		try {
			const fresh = reevaluateHardwareProfile();
			showToast(
				`Железо переоценено: ${fresh.tier.toUpperCase()} (${fresh.score}/100, ${fresh.gpuRenderer || fresh.gpuType})`,
				"success",
			);
		} catch {
			showToast("Ошибка при переоценке оборудования", "error");
		} finally {
			setTimeout(() => setIsReevaluating(false), 300);
		}
	}, []);

	const handleInterpolationSelect = useCallback(
		(method: CbctInterpolationMethod) => {
			const updated = saveDoctorCbctSettings({ interpolationMethod: method });
			setSettings(updated);
			const meta = CBCT_INTERPOLATION_METHODS.find((m) => m.id === method);
			showToast(
				`Метод 2D-интерполяции КТ: ${meta?.shortLabel ?? method}`,
				"info",
			);
		},
		[],
	);

	// Reactive sync across tabs / modals
	useEffect(() => {
		const handleUpdated = (e: Event) => {
			const detail = (e as CustomEvent<DoctorCbctDefaultSettings>).detail;
			if (detail) {
				setSettings(detail);
			} else {
				setSettings(loadDoctorCbctSettings());
			}
		};

		if (typeof window !== "undefined") {
			window.addEventListener("dente:cbct-defaults-updated", handleUpdated);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("dente:cbct-defaults-updated", handleUpdated);
			}
		};
	}, []);

	const activeInterpolation = settings.interpolationMethod ?? "bilinear";
	const activeInterpMeta =
		CBCT_INTERPOLATION_METHODS.find((m) => m.id === activeInterpolation) ??
		CBCT_INTERPOLATION_METHODS[1];

	const isCanonical =
		settings.windowWidth === CANONICAL_CBCT_SETTINGS.windowWidth &&
		settings.windowLevel === CANONICAL_CBCT_SETTINGS.windowLevel &&
		Math.abs(settings.gamma - CANONICAL_CBCT_SETTINGS.gamma) < 0.001 &&
		settings.airCutoffHU === CANONICAL_CBCT_SETTINGS.airCutoffHU &&
		Math.abs(settings.mprThicknessMm - CANONICAL_CBCT_SETTINGS.mprThicknessMm) < 0.001 &&
		Math.abs(settings.panoThicknessMm - CANONICAL_CBCT_SETTINGS.panoThicknessMm) < 0.001 &&
		activeInterpolation === (CANONICAL_CBCT_SETTINGS.interpolationMethod ?? "bilinear");

	const handleReset = useCallback(() => {
		const canon = resetDoctorCbctSettings();
		setSettings(canon);
		showToast("Параметры КЛКТ сброшены на канон (4025 HU / 525 HU / Bilinear)", "info");
	}, []);

	return (
		<article
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4"
			data-testid="doctor-cbct-preferences-card"
		>
			{/* Card Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Scan size={18} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h4 className="m-0 text-sm font-bold text-[var(--ink)]">
								Параметры КЛКТ по умолчанию
							</h4>
							{isCanonical ? (
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
									Канон (4025/525)
								</span>
							) : (
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
									Персональный дефолт
								</span>
							)}
						</div>
						<p className="m-0 text-xs text-[var(--muted)]">
							Базовый контраст, гамма-кривая, толщина срезов и метод интерполяции при открытии КЛКТ пациента
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					{!isCanonical && (
						<button
							type="button"
							onClick={handleReset}
							className="secondary-button compact-button px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center gap-1.5"
							title="Сбросить все параметры на канон"
						>
							<RotateCcw size={13} />
							<span>Сброс на канон</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="primary-button compact-button px-3.5 h-8 min-h-[32px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
						data-testid="button-open-cbct-tuner"
					>
						<Sliders size={14} />
						<span>Настроить в интерактивном окне</span>
					</button>
				</div>
			</div>

			{/* Metric Chips Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						Ширина окна (WW)
					</span>
					<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
						{settings.windowWidth} HU
					</span>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						Уровень окна (WL)
					</span>
					<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
						{settings.windowLevel} HU
					</span>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						Гамма-кривая
					</span>
					<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
						{settings.gamma.toFixed(2)}
					</span>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						Отсечение воздуха
					</span>
					<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
						{settings.airCutoffHU} HU
					</span>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						Толщина MPR
					</span>
					<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
						{settings.mprThicknessMm.toFixed(1)} мм
					</span>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						Слой ОПТГ
					</span>
					<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
						{settings.panoThicknessMm.toFixed(1)} мм
					</span>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between" data-testid="cbct-metric-interpolation">
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						2D-Интерполяция
					</span>
					<span className="text-xs font-semibold text-[var(--teal)] mt-0.5" title={activeInterpMeta?.labelRu}>
						{(activeInterpMeta?.shortLabel ?? "Bilinear").replace(/\s*\(.*\)/, "")}
					</span>
				</div>
			</div>

			{/* 2D Interpolation Method Selector */}
			<div
				className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2.5"
				data-testid="cbct-interpolation-selector-section"
			>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded-md bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0">
							<Layers size={13} />
						</div>
						<span className="text-xs font-bold text-[var(--ink)]">
							Метод 2D-интерполяции срезов КТ
						</span>
						<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] font-mono">
							GPU Shader ES 3.00
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)]">
						Рекомендовано: <strong className="text-[var(--ink)]">{activeInterpMeta?.recommendedFor}</strong>
					</span>
				</div>

				{/* Apple HIG Segmented Bar — 3 Pure Clinical Methods */}
				<div
					className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
					role="radiogroup"
					aria-label="Выбор алгоритма 2D-интерполяции срезов КТ"
					data-testid="cbct-interpolation-segmented-control"
				>
					{CBCT_INTERPOLATION_METHODS.map((method) => {
						const isSelected = activeInterpolation === method.id;
						return (
							<button
								key={method.id}
								type="button"
								onClick={() => handleInterpolationSelect(method.id)}
								className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-0.5 ${
									isSelected
										? "bg-[var(--teal)] text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
								data-testid={`cbct-interp-btn-${method.id}`}
								role="radio"
								aria-checked={isSelected}
								title={method.descriptionRu}
							>
								<span className="font-bold text-xs">{method.shortLabel}</span>
								<span className={`text-[10px] truncate max-w-full ${isSelected ? "text-teal-100" : "text-[var(--muted)]"}`}>
									{method.id === "catmull_rom"
										? "Дефолт • Максимум деталей"
										: method.id === "b_spline"
											? "Шумоподавление • Импланты"
											: "Базовый • 120+ FPS"}
								</span>
							</button>
						);
					})}
				</div>

				{/* Active Method Descriptive Legend */}
				<div className="flex items-start gap-2 pt-1 text-[11px] text-[var(--muted)] border-t border-[var(--line)]">
					<Info size={13} className="shrink-0 mt-0.5 text-[var(--teal)]" />
					<div className="leading-tight">
						<strong className="text-[var(--ink)] font-semibold">{activeInterpMeta?.labelRu}:</strong>{" "}
						<span>{activeInterpMeta?.descriptionRu}</span>
					</div>
				</div>
			</div>

			{/* Hardware Auto-Adaptation Sub-Bar */}
			<div
				className="pt-3 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs"
				data-testid="cbct-hardware-auto-adaptation-bar"
			>
				<div className="flex items-center gap-2.5">
					<div className="w-7 h-7 rounded-lg bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0 border border-teal-500/30">
						<Cpu size={15} />
					</div>
					<div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="font-semibold text-[var(--ink)]">
								Аппаратная адаптация КТ:
							</span>
							<span
								className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${
									hwProfile.tier === "ultra"
										? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
										: hwProfile.tier === "balanced"
											? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
											: hwProfile.tier === "low"
												? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
												: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
								}`}
								data-testid="cbct-hardware-tier-badge"
							>
								{hwProfile.tier} ({hwProfile.score}/100)
							</span>

							{/* Hybrid Dual-GPU Badge (NVIDIA Optimus / Intel + dGPU) */}
							{hwProfile.isHybridGraphics ? (
								<span
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
									data-testid="cbct-hybrid-gpu-badge"
									title={`Гибридная графика активна: ${hwProfile.discreteGpuRenderer || "NVIDIA dGPU"} задействован через WebGPU DXGI`}
								>
									<Sparkles size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
									<span>Гибридная графика: {hwProfile.discreteGpuRenderer || "NVIDIA dGPU"}</span>
								</span>
							) : hwProfile.gpuType === "discrete" ? (
								<span
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30"
									data-testid="cbct-discrete-gpu-badge"
								>
									<Zap size={11} className="shrink-0 text-purple-600 dark:text-purple-400" />
									<span>Дискретный GPU: {hwProfile.gpuRenderer || "dGPU"}</span>
								</span>
							) : (
								<span
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30"
									data-testid="cbct-integrated-gpu-badge"
								>
									<Cpu size={11} className="shrink-0 text-slate-500" />
									<span>{hwProfile.gpuRenderer || "Базовый iGPU (Intel)"}</span>
								</span>
							)}

							{hwProfile.isBatterySaving && (
								<span
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
									data-testid="cbct-battery-saving-badge"
									title="Уровень заряда батареи ≤ 20%: активен энергосберегающий режим (30 FPS, даунскейл 3D) для защиты от перегрева"
								>
									<BatteryLow size={12} className="shrink-0" />
									<span>Батарея ≤ 20% (30 FPS)</span>
								</span>
							)}
							<span className="text-[11px] text-[var(--muted)] hidden lg:inline">
								{hwProfile.cpuCores ?? "?"} ядер • {hwProfile.deviceMemoryGb ?? "?"} ГБ RAM
							</span>
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Даунскейл 3D: <strong className="font-mono text-[var(--ink)]">{hwAdaptive.ctDownsampleFactor}x</strong> • Пакет срезов: <strong className="font-mono text-[var(--ink)]">{hwAdaptive.ctSliceBatchSize}</strong> • Автосохранение: <strong className="font-mono text-[var(--ink)]">{hwAdaptive.autosaveDebounceMs}мс</strong>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleReevaluate}
						disabled={isReevaluating}
						className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
						title="Сбросить кэш и перепроверить производительность GPU, CPU и памяти"
						data-testid="button-reevaluate-hardware"
					>
						<RotateCw size={12} className={isReevaluating ? "animate-spin" : ""} />
						<span>Переоценить</span>
					</button>

					<div className="flex items-center gap-1.5">
						<span className="text-[11px] text-[var(--muted)] font-medium">Режим:</span>
						<div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0.5 text-[11px] gap-0.5">
							{(
								[
									{ key: null, label: "Авто" },
									{ key: "potato", label: "Potato" },
									{ key: "low", label: "Low" },
									{ key: "balanced", label: "Balanced" },
									{ key: "ultra", label: "Ultra" },
								] as const
							).map((item) => {
								const isSelected =
									item.key === null
										? overrideTier === null
										: overrideTier === item.key;
								return (
									<button
										key={item.label}
										type="button"
										onClick={() => handleTierSelect(item.key)}
										className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
											isSelected
												? "bg-[var(--teal)] text-white shadow-2xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
										data-testid={`cbct-tier-btn-${item.label.toLowerCase()}`}
									>
										{item.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Modal launcher */}
			<DoctorCbctSettingsModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSaved={(updated) => setSettings(updated)}
			/>
		</article>
	);
}

export default DoctorCbctPreferencesCard;
