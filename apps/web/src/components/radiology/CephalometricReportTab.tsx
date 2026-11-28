/**
 * DENTE CRM — Cephalometric Analysis Report Tab & Categorized Measurements View
 * Standards: Medical Record, Steiner, Tweed, Downs, Jacobson Wits, Ricketts, McNamara
 * Mandate 8b: Monolith extraction (<= 800 lines).
 */

import {
	Activity,
	Check,
	CheckCircle2,
	Clipboard,
	FileText,
	Layers,
	Printer,
	Save,
	Sparkles,
	Trash2,
} from "lucide-react";
import React from "react";
import {
	CEPHALOMETRIC_LANDMARKS,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
	type CephalometricAnalysisResult,
	type LandmarkKey,
	type LandmarkMap,
	getRequiredLandmarksForMeasurement,
} from "../orthodontics/cephalometricMath";

export interface CephalometricReportTabProps {
	readonly currentEffectiveProtocolText: string;
	readonly onInsertToChart: () => void;
	readonly onSaveConsultationWithoutCeph: () => void;
	readonly onCopyText: () => void;
	readonly copied: boolean;
}

export function CephalometricReportTab({
	currentEffectiveProtocolText,
	onInsertToChart,
	onSaveConsultationWithoutCeph,
	onCopyText,
	copied,
}: CephalometricReportTabProps) {
	return (
		<div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-[var(--paper)]">
			<div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
				<div className="flex items-center gap-2 min-w-0">
					<FileText size={20} className="text-[var(--primary)] shrink-0" />
					<span className="text-sm font-bold text-[var(--ink)] min-w-0 break-words">
						Предпросмотр протокола для карты
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							if (typeof window !== "undefined") {
								window.print();
							}
						}}
						data-testid="btn-print-ceph-protocol"
						className="h-8 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[13px] font-medium text-[var(--ink)] flex items-center gap-1.5 transition-colors border border-[var(--line)] cursor-pointer shadow-xs"
						title="Распечатать протокол ТРГ для медицинской карты"
					>
						<Printer size={14} />
						<span>Печать заключения</span>
					</button>
					<button
						type="button"
						onClick={onCopyText}
						className="h-8 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[13px] font-medium text-[var(--ink)] flex items-center gap-1.5 transition-colors border border-[var(--line)] cursor-pointer shadow-xs"
					>
						{copied ? <Check size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
						<span>{copied ? "Скопировано" : "Копировать"}</span>
					</button>
				</div>
			</div>

			<textarea
				readOnly
				value={currentEffectiveProtocolText}
				aria-label="Текст протокола ТРГ для медицинской карты"
				className="flex-1 min-h-[320px] p-4 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl font-mono text-xs sm:text-sm text-[var(--ink)] resize-none outline-none focus:border-[var(--primary)] leading-relaxed shadow-inner"
			/>

			<div className="mt-3 pt-3 border-t border-[var(--line)] flex flex-col gap-2">
				<button
					type="button"
					onClick={onInsertToChart}
					className="w-full h-10 py-2 px-4 rounded-lg bg-[var(--primary)] hover:brightness-105 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
				>
					<Sparkles size={16} />
					<span>Вставить в ортодонтическую карту</span>
				</button>
				<button
					type="button"
					onClick={onSaveConsultationWithoutCeph}
					data-testid="tab3-save-consultation-without-ceph-btn"
					className="w-full h-9 py-1.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
				>
					<Save size={15} />
					<span>Сохранить консультацию без полного ТРГ-расчета</span>
				</button>
				<p className="text-xs text-slate-400 text-center m-0 min-w-0 break-words">
					Текст и угловые расчеты будут добавлены в дневник приёма и историю болезни пациента
				</p>
			</div>
		</div>
	);
}

export interface CephalometricMeasurementsCategoriesProps {
	readonly analysis: CephalometricAnalysisResult;
	readonly landmarks: LandmarkMap;
}

export function CephalometricMeasurementsCategories({
	analysis,
	landmarks,
}: CephalometricMeasurementsCategoriesProps) {
	const renderCategorySection = (
		title: string,
		category: "sagittal" | "vertical" | "dental",
	) => {
		const items = analysis.measurements.filter((m) => {
			if (category === "sagittal") return m.category === "skeletal_sagittal";
			if (category === "vertical") return m.category === "skeletal_vertical";
			return (
				m.category === "dental_upper" ||
				m.category === "dental_lower" ||
				m.category === "interincisal"
			);
		});
		return (
			<div>
				<div className="text-xs font-semibold text-slate-400 mb-2.5">
					{title}
				</div>
				<div className="space-y-2">
					{items.map((m) => {
						const isValValid = m.value !== null && Number.isFinite(m.value);
						const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
						const normText = `${m.normMin}–${m.normMax} ${m.unit}`;
						return (
							<div
								key={m.id}
								className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 min-h-[52px]"
							>
								<div className="min-w-0">
									<div className="text-sm font-bold text-white min-w-0 break-words">
										{m.nameRu}
									</div>
									<div className="text-xs text-slate-400 mt-0.5 min-w-0 break-words">
										{m.clinicalInterpretation} · Норма: <span className="font-bold text-slate-200">{normText}</span>
									</div>
								</div>
								<div className="text-right shrink-0 flex flex-col items-end gap-1">
									<div
										className={`text-base font-black ${
											isValValid
												? m.status === "normal"
													? "text-emerald-400"
													: m.status === "deviation_high"
														? "text-rose-400"
														: m.status === "deviation_low"
															? "text-cyan-400"
															: "text-slate-400"
												: "text-slate-500"
										}`}
									>
										{isValValid ? `${m.value}${m.unit}` : "—"}
									</div>
									<span
										className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
											isValValid
												? m.status === "normal"
													? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
													: m.status === "deviation_high"
														? "bg-rose-950 text-rose-300 border-rose-500/40"
														: m.status === "deviation_low"
															? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
															: "bg-slate-800 text-slate-400 border-slate-700"
												: "bg-slate-800 text-amber-300 border border-amber-500/30"
										}`}
									>
										{isValValid
											? m.status === "normal"
												? "Норма"
												: m.status === "deviation_high"
													? "Увеличен"
													: m.status === "deviation_low"
														? "Уменьшен"
														: "Нет данных"
											: missingKeys.length > 0
												? `Ожидает: ${missingKeys.join(", ")}`
												: "Нет данных"}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-4 flex-1 overflow-y-auto pr-1">
			{renderCategorySection("1. Сагиттальные параметры (Steiner, Downs, Jacobson, McNamara)", "sagittal")}
			{renderCategorySection("2. Вертикальные параметры и тип роста (Tweed, Steiner, Downs, Ricketts)", "vertical")}
			{renderCategorySection("3. Дентальные параметры резцов (Steiner, Tweed)", "dental")}
		</div>
	);
}

export interface CephalometricMobileAccordionProps {
	readonly analysis: CephalometricAnalysisResult;
	readonly landmarks: LandmarkMap;
	readonly activeTargetKey: LandmarkKey | null;
	readonly onSelectTargetKey: (key: LandmarkKey) => void;
}

export function CephalometricMobileAccordion({
	analysis,
	landmarks,
	activeTargetKey,
	onSelectTargetKey,
}: CephalometricMobileAccordionProps) {
	return (
		<details className="lg:hidden mt-2.5 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-100 overflow-hidden group shrink-0">
			<summary className="px-3.5 py-2.5 bg-slate-800/90 font-bold text-xs flex items-center justify-between cursor-pointer select-none text-slate-200 hover:text-white transition-colors">
				<div className="flex items-center gap-2">
					<Activity size={14} className="text-teal-400" />
					<span>Таблица расчетов углов (Steiner, Tweed, Downs, McNamara) & 16 точек</span>
				</div>
				<span className="text-[11px] font-mono font-bold text-teal-400 group-open:rotate-180 transition-transform duration-200">
					▼
				</span>
			</summary>
			<div className="p-3 space-y-3 max-h-[320px] overflow-y-auto">
				<div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-500/30 text-xs">
					<div className="font-bold text-teal-300">{analysis.diagnosis.skeletalClassRu}</div>
					<div className="text-[11px] text-slate-300 mt-0.5">{analysis.diagnosis.summaryRu}</div>
				</div>

				<div className="space-y-1.5">
					<div className="text-[11px] font-bold text-slate-400">
						Основные углы и параметры
					</div>
					<div className="grid grid-cols-1 gap-1.5">
						{analysis.measurements.map((m) => {
							const isValValid = m.value !== null && Number.isFinite(m.value);
							const missingKeys = getRequiredLandmarksForMeasurement(m.id).filter((k) => !landmarks[k]);
							const normText = `${m.normMin}–${m.normMax} ${m.unit}`;
							return (
								<div
									key={m.id}
									className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
								>
									<div className="min-w-0 pr-2">
										<div className="font-bold text-white truncate">{m.nameRu}</div>
										<div className="text-[10px] text-slate-400 truncate">
											{m.clinicalInterpretation} · Норма: {normText}
										</div>
									</div>
									<div className="text-right shrink-0 flex items-center gap-1.5">
										<span className="font-mono font-black text-xs text-white">
											{isValValid ? `${m.value}${m.unit}` : "—"}
										</span>
										<span
											className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
												isValValid
													? m.status === "normal"
														? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
														: m.status === "deviation_high"
															? "bg-rose-950 text-rose-300 border border-rose-500/40"
															: m.status === "deviation_low"
																? "bg-sky-950 text-sky-300 border border-sky-500/40"
																: "bg-slate-800 text-slate-400"
													: "bg-slate-800 text-amber-300 border border-amber-500/30"
											}`}
										>
											{isValValid
												? m.status === "normal"
													? "Норма"
													: m.status === "deviation_high"
														? "Увелич."
														: m.status === "deviation_low"
															? "Уменьш."
															: "—"
												: missingKeys.length > 0
													? `Ждёт: ${missingKeys.join(",")}`
													: "—"}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="space-y-1.5 pt-1 border-t border-slate-800">
					<div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
						<span>16 анатомических ориентиров</span>
						<span className="text-teal-400 font-mono font-black">
							{analysis.placedCount}/16
						</span>
					</div>
					<div className="grid grid-cols-2 gap-1">
						{CEPHALOMETRIC_LANDMARKS.map((lm) => {
							const isPlaced = landmarks[lm.key] !== undefined;
							const isTarget = activeTargetKey === lm.key;
							return (
								<button
									key={lm.key}
									type="button"
									onClick={() => onSelectTargetKey(lm.key)}
									className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all text-[11px] min-h-[36px] ${
										isTarget
											? "bg-teal-900/50 border-teal-400 text-teal-200 ring-1 ring-teal-400"
											: isPlaced
												? "bg-slate-800/80 border-slate-700 text-slate-200"
												: "bg-slate-900/40 border-dashed border-slate-700 text-slate-400"
									}`}
								>
									<span
										className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] shrink-0 text-white"
										style={{ backgroundColor: lm.color }}
									>
										{lm.code}
									</span>
									<span className="truncate flex-1 font-semibold">{lm.nameRu}</span>
									{isPlaced && <Check size={11} className="text-emerald-400 shrink-0" />}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</details>
	);
}

export interface CephalometricPresetsBarProps {
	readonly onApplyPreset: (preset: LandmarkMap, label: string) => void;
	readonly onResetLandmarks: () => void;
	readonly variant: "header" | "tab1" | "tab2";
}

export function CephalometricPresetsBar({
	onApplyPreset,
	onResetLandmarks,
	variant,
}: CephalometricPresetsBarProps) {
	if (variant === "header") {
		return (
			<div
				className="hidden md:flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] shrink-0 mr-1"
				data-testid="header-ceph-presets-bar"
			>
				<span className="text-[11px] font-bold text-[var(--ink-muted)] px-1.5 whitespace-nowrap">
					Пресеты:
				</span>
				<button
					type="button"
					onClick={() => onApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "★ I Класс (Норма)")}
					data-testid="header-preset-class-1"
					className="h-8 px-2.5 rounded-lg bg-[var(--success-soft)] hover:bg-[var(--success-soft)]/80 text-[var(--success)] border border-[var(--success-line)] text-[12.5px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs"
					title="★ I Класс (Норма) — выставляет все 16 ориентиров по анатомической норме I класса"
				>
					<Sparkles size={13} className="text-[var(--success)] shrink-0" />
					<span>★ I Класс (Норма)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")}
					data-testid="header-preset-class-2"
					className="h-8 px-2.5 rounded-lg bg-[var(--warning-soft)] hover:bg-[var(--warning-soft)]/80 text-[var(--warning)] border border-[var(--warning-line)] text-[12.5px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs"
					title="II Класс (Дистальный) — выставляет ориентиры дистального прикуса"
				>
					<span>II Класс (Дистальный)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")}
					data-testid="header-preset-class-3"
					className="h-8 px-2.5 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 text-[12.5px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs"
					title="III Класс (Мезиальный) — выставляет ориентиры мезиального прикуса"
				>
					<span>III Класс (Мезиальный)</span>
				</button>
				<button
					type="button"
					onClick={onResetLandmarks}
					data-testid="header-preset-clear"
					className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--danger-soft)] text-[var(--ink-muted)] hover:text-[var(--danger)] border border-[var(--line)] hover:border-[var(--danger-soft)] text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-2xs"
					title="Очистить разметку ориентиров для ручной укладки"
				>
					<Trash2 size={12} className="text-[var(--ink-muted)] shrink-0" />
					<span>Очистить разметку</span>
				</button>
			</div>
		);
	}

	if (variant === "tab1") {
		return (
			<div
				className="mb-3.5 p-3 rounded-xl bg-slate-900/95 border border-slate-800 shrink-0 flex flex-col gap-2"
				style={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
				data-testid="tab1-ceph-presets-toolbar"
			>
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<Sparkles size={14} className="text-teal-400 shrink-0" />
						<span className="text-xs font-semibold text-teal-300 truncate">
							Клинические пресеты:
						</span>
					</div>
					<span className="text-[11.5px] text-slate-400 shrink-0 hidden sm:inline">
						Норма и патология
					</span>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => onApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "I Класс (Норма)")}
						data-testid="tab1-preset-class-1"
						className="h-8 px-2.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
						title="I Класс (Норма) — выставляет все 16 ориентиров по анатомической норме I класса"
					>
						<Sparkles size={13} className="text-emerald-400 shrink-0" />
						<span>I Класс (Норма)</span>
					</button>

					<button
						type="button"
						onClick={() => onApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")}
						data-testid="tab1-preset-class-2"
						className="h-8 px-2.5 rounded-lg bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-500/50 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
						title="II Класс (Дистальный) — выставляет ориентиры дистального прикуса"
					>
						<span>II Класс (Дистальный)</span>
					</button>

					<button
						type="button"
						onClick={() => onApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")}
						data-testid="tab1-preset-class-3"
						className="h-8 px-2.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
						title="III Класс (Мезиальный) — выставляет ориентиры мезиального прикуса"
					>
						<span>III Класс (Мезиальный)</span>
					</button>

					<button
						type="button"
						onClick={onResetLandmarks}
						data-testid="tab1-preset-clear"
						className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-rose-500/10 hover:border-rose-500/50 text-[var(--ink-muted)] hover:text-rose-500 border border-[var(--line)] text-[12.5px] font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
						title="Очистить разметку ориентиров для ручной укладки"
					>
						<Trash2 size={13} className="shrink-0 text-[var(--ink-muted)]" />
						<span>Очистить разметку</span>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="mb-3 p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2 shrink-0">
			<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
				<span>Ввод по протоколу лаборатории:</span>
				<span className="text-[11.5px] text-[var(--ink-muted)]">Пикассо / Золотое Сечение / КЛКТ</span>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={() => onApplyPreset(CLASS_I_NORMAL_LANDMARKS_PRESET, "I Класс (Норма)")}
					className="h-8 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
					data-testid="btn-ceph-preset-class-1"
					title="I Класс (Норма) — выставляет все 16 ориентиров по анатомической норме I класса"
				>
					<Sparkles size={12} className="text-emerald-500 shrink-0" />
					<span>I Класс (Норма)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset(CLASS_II_DISTAL_LANDMARKS_PRESET, "II Класс (Дистальный)")}
					className="h-8 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
					data-testid="btn-ceph-preset-class-2"
					title="II Класс (Дистальный) — выставляет ориентиры дистального прикуса"
				>
					<span>II Класс (Дистальный)</span>
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset(CLASS_III_MESIAL_LANDMARKS_PRESET, "III Класс (Мезиальный)")}
					className="h-8 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 text-[12.5px] font-semibold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
					data-testid="btn-ceph-preset-class-3"
					title="III Класс (Мезиальный) — выставляет ориентиры мезиального прикуса"
				>
					<span>III Класс (Мезиальный)</span>
				</button>
				<button
					type="button"
					onClick={onResetLandmarks}
					className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-rose-500/10 hover:border-rose-500/50 text-[var(--ink-muted)] hover:text-rose-500 border border-[var(--line)] text-[12.5px] font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
					data-testid="btn-ceph-preset-clear"
					title="Очистить разметку ориентиров для ручной укладки"
				>
					<Trash2 size={12} className="text-[var(--ink-muted)] shrink-0" />
					<span>Очистить разметку</span>
				</button>
			</div>
		</div>
	);
}

export interface CephalometricLandmarksListProps {
	readonly landmarks: LandmarkMap;
	readonly isImageLoaded: boolean;
	readonly activeTargetKey: LandmarkKey | null;
	readonly onSelectLandmark: (key: LandmarkKey) => void;
}

export function CephalometricLandmarksList({
	landmarks,
	isImageLoaded,
	activeTargetKey,
	onSelectLandmark,
}: CephalometricLandmarksListProps) {
	return (
		<div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-4">
			{CEPHALOMETRIC_LANDMARKS.map((lm) => {
				const isPlaced = isImageLoaded && landmarks[lm.key] !== undefined;
				const isTarget = isImageLoaded && activeTargetKey === lm.key;

				return (
					<button
						key={lm.key}
						type="button"
						onClick={() => onSelectLandmark(lm.key)}
						className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[52px] ${
							isTarget
								? "bg-[var(--teal-surface)] border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/30"
								: isPlaced
									? "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--primary)]"
									: "bg-[var(--paper)] border-[var(--line)] opacity-90 hover:opacity-100"
						}`}
					>
						<div className="flex items-center gap-3 min-w-0">
							<div
								className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 text-white shadow-sm"
								style={{ backgroundColor: isImageLoaded ? lm.color : "#475569" }}
							>
								{lm.code}
							</div>
							<div className="min-w-0">
								<div className="text-sm font-bold text-[var(--ink)] min-w-0 break-words">
									{lm.nameRu}
								</div>
								<div className="text-xs font-medium text-[var(--ink-muted)] min-w-0 break-words leading-snug">
									{lm.anatomicalDescription}
								</div>
							</div>
						</div>

						<div className="shrink-0 flex items-center gap-1.5">
							{isPlaced ? (
								<span className="text-xs font-bold text-[var(--primary)] bg-[var(--teal-surface)] px-2.5 py-1 rounded-lg border border-[var(--primary)]/40 flex items-center gap-1">
									<Check size={13} /> Задана
								</span>
							) : (
								<span className="text-xs font-semibold text-[var(--ink-muted)] bg-[var(--paper-soft)] px-2.5 py-1 rounded-lg border border-[var(--line)]">
									Не задана
								</span>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
}

export interface CephalometricMobileNavProps {
	readonly mobileView: "canvas" | "landmarks" | "metrics" | "report";
	readonly onSelectView: (view: "canvas" | "landmarks" | "metrics" | "report") => void;
	readonly placedCount: number;
	readonly isImageLoaded: boolean;
	readonly isComplete: boolean;
}

export function CephalometricMobileNav({
	mobileView,
	onSelectView,
	placedCount,
	isImageLoaded,
	isComplete,
}: CephalometricMobileNavProps) {
	return (
		<div className="lg:hidden flex items-center gap-1 bg-[var(--paper)] border-b border-[var(--line)] p-1.5 shrink-0 overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none">
			<button
				type="button"
				onClick={() => onSelectView("canvas")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "canvas"
						? "bg-[var(--primary)] text-white shadow-md font-extrabold"
						: "bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)]"
				}`}
				data-testid="ceph-mobile-tab-canvas"
			>
				<Layers size={14} />
				<span>Снимок / Разметка</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectView("landmarks")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "landmarks"
						? "bg-teal-600 text-white shadow-md font-extrabold"
						: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
				}`}
				data-testid="ceph-mobile-tab-landmarks"
			>
				<span>16 ориентиров (Точки: {isImageLoaded ? placedCount : 0}/16)</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectView("metrics")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "metrics"
						? "bg-teal-600 text-white shadow-md font-extrabold"
						: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
				} ${!isImageLoaded ? "opacity-60 cursor-not-allowed" : ""}`}
				data-testid="ceph-mobile-tab-metrics"
			>
				<span>Расчет углов (Анализ)</span>
				{isImageLoaded && isComplete && (
					<CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
				)}
			</button>

			<button
				type="button"
				onClick={() => onSelectView("report")}
				className={`min-h-[44px] min-w-max px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
					mobileView === "report"
						? "bg-teal-600 text-white shadow-md font-extrabold"
						: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
				}`}
				data-testid="ceph-mobile-tab-report"
			>
				<FileText size={14} />
				<span>Медицинская карта</span>
			</button>
		</div>
	);
}
