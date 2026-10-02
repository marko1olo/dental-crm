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
	Check,
	RotateCcw,
	Scan,
	Sliders,
	Sparkles,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	CANONICAL_CBCT_SETTINGS,
	type DoctorCbctDefaultSettings,
	loadDoctorCbctSettings,
	resetDoctorCbctSettings,
} from "../radiology/cbctLutMath";
import { DoctorCbctSettingsModal } from "./DoctorCbctSettingsModal";

export function DoctorCbctPreferencesCard() {
	const [settings, setSettings] = useState<DoctorCbctDefaultSettings>(() =>
		loadDoctorCbctSettings(),
	);
	const [isModalOpen, setIsModalOpen] = useState(false);

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

	const isCanonical =
		settings.windowWidth === CANONICAL_CBCT_SETTINGS.windowWidth &&
		settings.windowLevel === CANONICAL_CBCT_SETTINGS.windowLevel &&
		Math.abs(settings.gamma - CANONICAL_CBCT_SETTINGS.gamma) < 0.001 &&
		settings.airCutoffHU === CANONICAL_CBCT_SETTINGS.airCutoffHU &&
		Math.abs(settings.mprThicknessMm - CANONICAL_CBCT_SETTINGS.mprThicknessMm) < 0.001 &&
		Math.abs(settings.panoThicknessMm - CANONICAL_CBCT_SETTINGS.panoThicknessMm) < 0.001;

	const handleReset = useCallback(() => {
		const canon = resetDoctorCbctSettings();
		setSettings(canon);
		showToast("Параметры КЛКТ сброшены на канон (4025 HU / 525 HU)", "info");
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
							Базовый контраст, гамма-кривая и толщина срезов при открытии 3D томографии пациента
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
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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
