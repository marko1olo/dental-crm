/**
 * HygieneIndicesPanel.tsx — Экспресс-расчет клинических индексов гигиены полости рта (OHI-S, PMA, КПИ Леуса).
 *
 * (DOMAIN: CLINICAL HYGIENE INDICES & PERIODONTAL ASSESSMENT)
 *
 * Возможности:
 * 1. OHI-S (Грин-Вермиллион): расчет налета DI-S и зубного камня CI-S по 6 индексным зубам (16, 11, 26, 36, 31, 46).
 * 2. PMA (Парма): оценка степени воспаления десны (сосочек P=1, маргинальная M=2, альвеолярная A=3) в %.
 * 3. КПИ (Леус): комплексный периодонтальный индекс (0=здоров, 1=кровь, 2=камень, 3=карман 4-5мм, 4=карман >=6мм).
 * 4. 1-Клик «Физиологическая норма (все 0 / Здоров)» (Мандат 8e / Раздел VII).
 * 5. 1-Клик синхронизация с данными интерактивной перио-карты Florida Probe.
 * 6. 1-Клик экспорт стандартизированного протокола в дневник приёма 043/у.
 * 7. Не требует обязательного заполнения всех зубов — расчет работает от 1 до 6 зубов мгновенно.
 */

import {
	calculateCombinedHygieneReport,
	calculateKpiScore,
	calculateOhiSScore,
	calculatePmaScore,
	createHealthyHygieneAssessment,
	deriveHygieneFromPerioTeeth,
	HYGIENE_INDEX_TEETH_CONFIG,
	HYGIENE_INDEX_TEETH_NUMBERS,
	type CombinedHygieneReport,
	type HygieneIndexToothNumber,
	type HygieneToothAssessment,
	type PerioToothRecord,
} from "@dental/shared";
import {
	Activity,
	Check,
	Clipboard,
	FileText,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";

export interface HygieneIndicesPanelProps {
	/** Optional existing perio dentition for 1-click auto-sync */
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	/** Callback when assessments change */
	readonly onChange?: ((report: CombinedHygieneReport) => void) | undefined;
	/** 1-click insertion into 043/u visit diary */
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
}

export const HygieneIndicesPanel: React.FC<HygieneIndicesPanelProps> = ({
	perioTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	compactMode = false,
}) => {
	// Active assessment state for 6 index teeth
	const [assessments, setAssessments] = useState<Record<number, HygieneToothAssessment>>(() => {
		if (perioTeeth && perioTeeth.length > 0) {
			return deriveHygieneFromPerioTeeth(perioTeeth);
		}
		return createHealthyHygieneAssessment();
	});

	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	// Calculate live report via @dental/shared pure engine
	const report: CombinedHygieneReport = useMemo(() => {
		return calculateCombinedHygieneReport(assessments);
	}, [assessments]);

	// Broadcast change upward
	useEffect(() => {
		if (onChange) {
			onChange(report);
		}
	}, [report, onChange]);

	// ─── Mutations ───────────────────────────────────────────────────────────
	const updateToothScore = useCallback(
		(
			toothNumber: number,
			field: "debrisScore" | "calculusScore" | "pmaScore" | "kpiScore",
			value: number,
		) => {
			if (readOnly) return;
			setAssessments((prev) => {
				const current = prev[toothNumber] ?? { toothNumber };
				return {
					...prev,
					[toothNumber]: {
						...current,
						[field]: value,
					},
				};
			});
		},
		[readOnly],
	);

	// 1-Click Fast Presets
	const handleSetAllHealthy = useCallback(() => {
		if (readOnly) return;
		setAssessments(createHealthyHygieneAssessment());
		showToast("Индексы гигиены установлены в физиологическую норму (OHI-S 0, PMA 0%, КПИ 0)", "success", 3500);
	}, [readOnly]);

	const handleSyncFromPerio = useCallback(() => {
		if (readOnly || !perioTeeth || perioTeeth.length === 0) return;
		const derived = deriveHygieneFromPerioTeeth(perioTeeth);
		setAssessments(derived);
		showToast("Индексы синхронизированы с текущей пародонтограммой", "info", 3500);
	}, [readOnly, perioTeeth]);

	// 1-Click Insert into Visit Diary 043/u
	const handleInsertTo043 = useCallback(() => {
		if (onInsertToProtocol) {
			onInsertToProtocol(report.summaryText043);
			setInsertStatus(true);
			setTimeout(() => setInsertStatus(false), 2500);
			showToast("Индексы гигиены успешно внесены в дневник 043/у", "success", 4000);
		} else {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				void navigator.clipboard.writeText(report.summaryText043);
				showToast("Текст индексов скопирован в буфер обмена", "success", 3000);
			}
		}
	}, [report.summaryText043, onInsertToProtocol]);

	const handleCopyText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(report.summaryText043);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Протокол индексов гигиены скопирован", "success", 3000);
		}
	}, [report.summaryText043]);

	// Split 6 index teeth into Upper (16, 11, 26) and Lower (46, 31, 36)
	const upperTeethConfigs = HYGIENE_INDEX_TEETH_CONFIG.filter((c) => c.toothNumber < 30);
	const lowerTeethConfigs = HYGIENE_INDEX_TEETH_CONFIG.filter((c) => c.toothNumber >= 30);

	return (
		<div className="w-full flex flex-col gap-4 p-4 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] shadow-xs">
			{/* ─── Header & Action Presets ───────────────────────────────────── */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line,#334155)]">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
						<ShieldCheck size={20} />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink,#f8fafc)]">
							Индексы гигиены полости рта (OHI-S, PMA, КПИ Леуса)
						</h4>
						<p className="text-xs text-[var(--muted,#94a3b8)]">
							Быстрый клинический замер по 6 индексным зубам без требования заполнять всю челюсть
						</p>
					</div>
				</div>

				{!readOnly && (
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={handleSetAllHealthy}
							className="px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft,#1e293b)] hover:bg-emerald-500/15 hover:text-emerald-300 border border-[var(--line,#334155)] text-xs font-semibold text-[var(--ink,#f8fafc)] flex items-center gap-1.5 transition-all cursor-pointer"
							title="Установить все индексы в физиологическую норму (Здоров / Интактен)"
						>
							<Sparkles size={14} className="text-emerald-400" />
							<span>Норма в 1 клик</span>
						</button>

						{perioTeeth && perioTeeth.length > 0 && (
							<button
								type="button"
								onClick={handleSyncFromPerio}
								className="px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft,#1e293b)] hover:bg-teal-500/15 hover:text-teal-300 border border-[var(--line,#334155)] text-xs font-semibold text-[var(--ink,#f8fafc)] flex items-center gap-1.5 transition-all cursor-pointer"
								title="Импортировать налет и кровоточивость из пародонтограммы"
							>
								<RotateCcw size={14} className="text-teal-400" />
								<span>Из перио-карты</span>
							</button>
						)}

						{onInsertToProtocol && (
							<button
								type="button"
								onClick={handleInsertTo043}
								className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
								title="Вставить сводку индексов в дневник 043/у"
							>
								{insertStatus ? <Check size={14} /> : <FileText size={14} />}
								<span>{insertStatus ? "Вставлено!" : "В 043/у"}</span>
							</button>
						)}

						<button
							type="button"
							onClick={handleCopyText}
							className="p-1.5 rounded-lg bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--line,#334155)] border border-[var(--line,#334155)] text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] transition-all cursor-pointer"
							title="Скопировать протокол в буфер обмена"
							aria-label="Скопировать протокол в буфер"
						>
							{copyStatus ? <Check size={16} className="text-emerald-400" /> : <Clipboard size={16} />}
						</button>
					</div>
				)}
			</div>

			{/* ─── Real-Time Index Telemetry Cards (3-Indices Strip) ─────────── */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{/* 1. OHI-S / Green-Vermillion */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--muted,#94a3b8)]">
							Индекс OHI-S (Грин-Вермиллион)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
								report.ohiS.totalScore <= 0.6
									? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
									: report.ohiS.totalScore <= 1.6
										? "bg-teal-500/10 text-teal-300 border-teal-500/30"
										: report.ohiS.totalScore <= 2.5
											? "bg-amber-500/10 text-amber-400 border-amber-500/30"
											: "bg-rose-500/15 text-rose-400 border-rose-500/30"
							}`}
						>
							{report.ohiS.clinicalEvaluation === "excellent"
								? "Отличная"
								: report.ohiS.clinicalEvaluation === "good"
									? "Хорошая"
									: report.ohiS.clinicalEvaluation === "moderate"
										? "Удовлетворит."
										: report.ohiS.clinicalEvaluation === "poor"
											? "Неудовлетворит."
											: "Плохая"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1">
						<span
							className={`text-2xl font-black ${
								report.ohiS.totalScore <= 0.6
									? "text-emerald-400"
									: report.ohiS.totalScore <= 1.6
										? "text-teal-300"
										: report.ohiS.totalScore <= 2.5
											? "text-amber-400"
											: "text-rose-400"
							}`}
						>
							{report.ohiS.totalScore.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted,#94a3b8)]">
							налет DI-S: <strong>{report.ohiS.debrisScore}</strong> • камень CI-S:{" "}
							<strong>{report.ohiS.calculusScore}</strong>
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted,#94a3b8)]">
						Норма: ≤ 0.6 (отл.) / ≤ 1.6 (хор.)
					</span>
				</div>

				{/* 2. PMA / Parma Index */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--muted,#94a3b8)]">
							Индекс PMA (Парма / воспаление)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
								report.pma.severity === "intact"
									? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
									: report.pma.severity === "mild"
										? "bg-amber-500/10 text-amber-400 border-amber-500/30"
										: report.pma.severity === "moderate"
											? "bg-orange-500/10 text-orange-400 border-orange-500/30"
											: "bg-rose-500/15 text-rose-400 border-rose-500/30"
							}`}
						>
							{report.pma.severity === "intact"
								? "Норма 0%"
								: report.pma.severity === "mild"
									? "Легкий"
									: report.pma.severity === "moderate"
										? "Средний"
										: "Тяжелый"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1">
						<span
							className={`text-2xl font-black ${
								report.pma.pmaPercent === 0
									? "text-emerald-400"
									: report.pma.pmaPercent <= 25
										? "text-amber-400"
										: "text-rose-400"
							}`}
						>
							{report.pma.pmaPercent}%
						</span>
						<span className="text-xs text-[var(--muted,#94a3b8)]">
							баллы: <strong>{report.pma.totalPoints}</strong> из {report.pma.maxPossiblePoints}
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted,#94a3b8)]">
						Норма: 0% (воспаление десны отсутствует)
					</span>
				</div>

				{/* 3. KPI / Leus Complex Index */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--muted,#94a3b8)]">
							КПИ Леуса (состояние пародонта)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
								report.kpi.severity === "healthy"
									? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
									: report.kpi.severity === "risk"
										? "bg-teal-500/10 text-teal-300 border-teal-500/30"
										: report.kpi.severity === "mild"
											? "bg-amber-500/10 text-amber-400 border-amber-500/30"
											: "bg-rose-500/15 text-rose-400 border-rose-500/30"
							}`}
						>
							{report.kpi.severity === "healthy"
								? "Здоров 0.0"
								: report.kpi.severity === "risk"
									? "Риск"
									: report.kpi.severity === "mild"
										? "Легкая"
										: report.kpi.severity === "moderate"
											? "Средняя"
											: "Тяжелая"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1">
						<span
							className={`text-2xl font-black ${
								report.kpi.kpiScore === 0
									? "text-emerald-400"
									: report.kpi.kpiScore <= 1.0
										? "text-teal-300"
										: report.kpi.kpiScore <= 2.0
											? "text-amber-400"
											: "text-rose-400"
							}`}
						>
							{report.kpi.kpiScore.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted,#94a3b8)]">
							обследовано: <strong>{report.kpi.assessedTeethCount}</strong> зубов
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted,#94a3b8)]">
						Норма: 0.0 (здоровый периодонт)
					</span>
				</div>
			</div>

			{/* ─── 6 Index Teeth Grid Matrix ─────────────────────────────────── */}
			<div className="flex flex-col gap-3">
				<div className="text-xs font-bold text-teal-400 flex items-center justify-between">
					<span>СЕТКА 6 ИНДЕКСНЫХ ЗУБОВ (16, 11, 26 • 46, 31, 36):</span>
					<span className="text-[11px] text-[var(--muted,#94a3b8)] font-normal">
						Кликните на цифру для выбора балла (0..3 или 0..4)
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
					{HYGIENE_INDEX_TEETH_CONFIG.map((cfg) => {
						const item = assessments[cfg.toothNumber] ?? { toothNumber: cfg.toothNumber };
						const debris = item.debrisScore ?? 0;
						const calculus = item.calculusScore ?? 0;
						const pma = item.pmaScore ?? 0;
						const kpi = item.kpiScore ?? 0;

						return (
							<div
								key={cfg.toothNumber}
								className="p-3 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col gap-2.5"
							>
								{/* Tooth Header */}
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 font-mono font-black text-sm flex items-center justify-center border border-teal-500/30">
											{cfg.toothNumber}
										</span>
										<div>
											<div className="text-xs font-bold text-[var(--ink,#f8fafc)]">
												{cfg.anatomicalNameRu}
											</div>
											<div className="text-[10px] text-teal-400 font-medium">
												{cfg.surfaceLabelRu}
											</div>
										</div>
									</div>
								</div>

								{/* Row 1: DI-S Debris (Налёт 0..3) */}
								<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line,#334155)]/60">
									<span className="text-[11px] text-[var(--muted,#94a3b8)] font-medium">
										Налёт (DI-S):
									</span>
									<div className="flex items-center gap-1">
										{[0, 1, 2, 3].map((val) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() => updateToothScore(cfg.toothNumber, "debrisScore", val)}
												className={`w-6 h-6 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
													debris === val
														? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300"
														: "bg-[var(--paper,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-white border border-[var(--line,#334155)]"
												}`}
												title={
													val === 0
														? "0: Зубной налет отсутствует"
														: val === 1
															? "1: Налет покрывает до 1/3 поверхности"
															: val === 2
																? "2: Налет покрывает от 1/3 до 2/3"
																: "3: Налет покрывает более 2/3 поверхности"
												}
											>
												{val}
											</button>
										))}
									</div>
								</div>

								{/* Row 2: CI-S Calculus (Камень 0..3) */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[11px] text-[var(--muted,#94a3b8)] font-medium">
										Камень (CI-S):
									</span>
									<div className="flex items-center gap-1">
										{[0, 1, 2, 3].map((val) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() => updateToothScore(cfg.toothNumber, "calculusScore", val)}
												className={`w-6 h-6 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
													calculus === val
														? "bg-orange-500 text-white font-black shadow-xs ring-1 ring-orange-300"
														: "bg-[var(--paper,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-white border border-[var(--line,#334155)]"
												}`}
												title={
													val === 0
														? "0: Зубной камень отсутствует"
														: val === 1
															? "1: Наддесневой камень до 1/3 коронки"
															: val === 2
																? "2: Наддесневой 1/3..2/3 или отдельные очаги поддесневого"
																: "3: Наддесневой >2/3 или сплошной поддесневой валик"
												}
											>
												{val}
											</button>
										))}
									</div>
								</div>

								{/* Row 3: PMA (Десна 0..3: P, M, A) */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[11px] text-[var(--muted,#94a3b8)] font-medium">
										Воспаление (PMA):
									</span>
									<div className="flex items-center gap-1">
										{[
											{ val: 0, label: "0", hint: "0: Десна здорова" },
											{ val: 1, label: "P", hint: "1: Сосочек (P - Papillary)" },
											{ val: 2, label: "M", hint: "2: Маргинальная десна (M)" },
											{ val: 3, label: "A", hint: "3: Альвеолярная десна (A)" },
										].map(({ val, label, hint }) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() => updateToothScore(cfg.toothNumber, "pmaScore", val)}
												className={`w-6 h-6 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
													pma === val
														? val === 0
															? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
															: "bg-rose-500 text-white font-black shadow-xs ring-1 ring-rose-300"
														: "bg-[var(--paper,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-white border border-[var(--line,#334155)]"
												}`}
												title={hint}
											>
												{label}
											</button>
										))}
									</div>
								</div>

								{/* Row 4: KPI (КПИ 0..4) */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[11px] text-[var(--muted,#94a3b8)] font-medium">
										Периодонт (КПИ):
									</span>
									<div className="flex items-center gap-1">
										{[
											{ val: 0, label: "0", hint: "0: Здоровый периодонт" },
											{ val: 1, label: "1", hint: "1: Кровоточивость (BOP)" },
											{ val: 2, label: "2", hint: "2: Зубной камень" },
											{ val: 3, label: "3", hint: "3: Карман 4-5 мм" },
											{ val: 4, label: "4", hint: "4: Карман ≥ 6 мм или подвижность" },
										].map(({ val, label, hint }) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() => updateToothScore(cfg.toothNumber, "kpiScore", val)}
												className={`w-6 h-6 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
													kpi === val
														? val === 0
															? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
															: val <= 2
																? "bg-amber-500 text-slate-950 font-black ring-1 ring-amber-300"
																: "bg-rose-600 text-white font-black ring-1 ring-rose-300"
														: "bg-[var(--paper,#0f172a)] text-[var(--muted,#94a3b8)] hover:text-white border border-[var(--line,#334155)]"
												}`}
												title={hint}
											>
												{label}
											</button>
										))}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
