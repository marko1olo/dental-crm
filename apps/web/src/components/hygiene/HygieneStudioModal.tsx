/**
 * @dental/web/components/hygiene/HygieneStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия профессиональной гигиены, индекса OHI-S и домашнего ухода.
 * Соответствует Мандатам: 8b (380–480 строк), 8e (Автономия врача), 8am (Ровно 1 Primary CTA), 8ze (Apple HIG).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	OHI_S_PRESETS,
	CLEANING_PROTOCOLS,
	HOME_CARE_PLANS,
	type OhiSPreset,
	type CleaningProtocol,
	type HomeCarePlan,
	commitHygieneVisitProtocol,
	printHygieneHomeCareMemo,
} from "./hygieneCatalogData";
import { showToast } from "../GlobalToast";

export interface HygieneStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly doctorName?: string;
	readonly previousOhiS?: { ohi_s: number; date?: string } | number | null;
}

export const HygieneStudioModal: React.FC<HygieneStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент приёма",
	doctorName = "Д-р Смирнова А.В.",
	previousOhiS = 2.4,
}) => {
	const [selectedOhiS, setSelectedOhiS] = useState<OhiSPreset>(OHI_S_PRESETS[1]);
	const [selectedProtocol, setSelectedProtocol] = useState<CleaningProtocol>(CLEANING_PROTOCOLS[0]);
	const [selectedCarePlan, setSelectedCarePlan] = useState<HomeCarePlan>(HOME_CARE_PLANS[0]);
	const [activeSection, setActiveSection] = useState<"protocol" | "homecare">("protocol");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const previousScore = useMemo<number | null>(() => {
		if (previousOhiS === null || previousOhiS === undefined) return null;
		if (typeof previousOhiS === "number") return previousOhiS;
		return typeof previousOhiS.ohi_s === "number" ? previousOhiS.ohi_s : null;
	}, [previousOhiS]);

	const dynamicsInfo = useMemo(() => {
		if (previousScore === null) return null;
		const diff = previousScore - selectedOhiS.score;
		if (diff > 0) {
			const pct = Math.round((diff / previousScore) * 100);
			return { text: `Было: ${previousScore} ➔ Стало: ${selectedOhiS.score} (Улучшение на ${pct}% 🟢)`, isPositive: true };
		}
		if (diff < 0) {
			return { text: `Было: ${previousScore} ➔ Стало: ${selectedOhiS.score} (Ухудшение гигиены ⚠️)`, isPositive: false };
		}
		return { text: `Было: ${previousScore} ➔ Стало: ${selectedOhiS.score} (Без изменений)`, isPositive: true };
	}, [previousScore, selectedOhiS.score]);

	const handleCommit = useCallback(() => {
		setIsSubmitting(true);
		try {
			commitHygieneVisitProtocol({
				ohiS: selectedOhiS,
				protocol: selectedProtocol,
				carePlan: selectedCarePlan,
				patientName,
				doctorName,
			});
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	}, [selectedOhiS, selectedProtocol, selectedCarePlan, patientName, doctorName, onClose]);

	const handlePrint = useCallback(() => {
		printHygieneHomeCareMemo({
			patientName,
			doctorName,
			carePlan: selectedCarePlan,
			ohiS: selectedOhiS,
		});
	}, [patientName, doctorName, selectedCarePlan, selectedOhiS]);

	const handleCopyMemo = useCallback(() => {
		const text = [
			`РЕКОМЕНДАЦИИ ПО ДОМАШНЕМУ УХОДУ — ${patientName}`,
			`Индекс гигиены OHI-S: ${selectedOhiS.score} (${selectedOhiS.label})`,
			`1. Основная щетка: ${selectedCarePlan.toothbrush}`,
			`2. Монопучковая: ${selectedCarePlan.monotuft}`,
			`3. Ершики: ${selectedCarePlan.interdental}`,
			`4. Паста: ${selectedCarePlan.toothpaste}`,
			`5. Ирригатор: ${selectedCarePlan.irrigator}`,
			`Контрольный осмотр через ${selectedCarePlan.recallMonths} месяцев.`,
		].join("\n");

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
			showToast("Памятка домашнего ухода скопирована в буфер", "success", 2500);
		}
	}, [patientName, selectedOhiS, selectedCarePlan]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
			data-testid="hygiene-studio-modal"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden">
				{/* Apple HIG Drag Handle for Mobile */}
				<div className="flex sm:hidden justify-center pt-2.5 pb-1 w-full bg-[var(--paper-soft)] cursor-grab">
					<div
						className="w-9 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"
						data-testid="hygiene-drag-handle"
					/>
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper)]">
					<div className="min-w-0 pr-3">
						<div className="flex items-center gap-2">
							<span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink)] truncate">
								Профессиональная гигиена и профилактика
							</h2>
						</div>
						<p className="text-xs text-[var(--ink-muted)] truncate">
							Индекс OHI-S • Экспресс-протоколы чистки • Памятка домашнего ухода • {patientName}
						</p>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
						aria-label="Закрыть студию гигиены"
					>
						✕
					</button>
				</div>

				{/* Dynamics Banner */}
				{dynamicsInfo && (
					<div
						className="px-4 sm:px-6 py-2 bg-teal-50/70 dark:bg-teal-950/30 border-b border-teal-200/50 dark:border-teal-900/50 flex items-center justify-between text-xs"
						data-testid="ohi-s-dynamics-banner"
					>
						<span className="font-medium text-teal-950 dark:text-teal-200">
							Динамика гигиены между приёмами: {dynamicsInfo.text}
						</span>
						<span className="text-teal-700 dark:text-teal-400 hidden sm:inline">
							Предыдущий замер сохранён в ЭМК
						</span>
					</div>
				)}

				{/* Sub-navigation tabs */}
				<div className="flex border-b border-[var(--line)] px-4 sm:px-6 bg-[var(--paper)] gap-2">
					<button
						type="button"
						onClick={() => setActiveSection("protocol")}
						className={`py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
							activeSection === "protocol"
								? "border-teal-600 text-teal-900 dark:text-teal-300"
								: "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						Протокол чистки у кресла
					</button>
					<button
						type="button"
						onClick={() => setActiveSection("homecare")}
						className={`py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
							activeSection === "homecare"
								? "border-teal-600 text-teal-900 dark:text-teal-300"
								: "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						Памятка домашнего ухода
					</button>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
					{/* 1. OHI-S Quick Selector (Available in both tabs for chairside speed) */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
								Индекс гигиены Грина-Вермиллиона (OHI-S)
							</span>
							<span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${selectedOhiS.badgeClass}`}>
								{selectedOhiS.ratingText}
							</span>
						</div>

						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{OHI_S_PRESETS.map((preset) => {
								const isSelected = selectedOhiS.id === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										data-testid={`hygiene-preset-${preset.id}`}
										onClick={() => setSelectedOhiS(preset)}
										className={`p-2.5 sm:p-3 text-left rounded-xl border transition-all min-h-[48px] flex flex-col justify-between ${
											isSelected
												? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20"
												: "border-[var(--line)] bg-[var(--paper)] hover:border-slate-300 dark:hover:border-slate-600"
										}`}
									>
										<div className="flex items-center justify-between w-full">
											<span className="text-xs sm:text-sm font-bold text-[var(--ink)]">
												{preset.label}
											</span>
											<span
												className="w-3 h-3 rounded-full"
												style={{ backgroundColor: preset.colorHex }}
											/>
										</div>
										<p className="text-[11px] text-[var(--ink-muted)] line-clamp-2 mt-1">
											{preset.statusDescription}
										</p>
									</button>
								);
							})}
						</div>
					</div>

					{activeSection === "protocol" ? (
						<>
							{/* 2. Express Cleaning Protocols */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
										Экспресс-протокол чистки у кресла
									</span>
									<span className="text-xs text-[var(--ink-muted)]">
										Автоматическое добавление услуги и списание расходников
									</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{CLEANING_PROTOCOLS.map((proto) => {
										const isSelected = selectedProtocol.id === proto.id;
										return (
											<button
												key={proto.id}
												type="button"
												data-testid={`hygiene-protocol-${proto.id}`}
												onClick={() => setSelectedProtocol(proto)}
												className={`p-3.5 text-left rounded-xl border transition-all flex flex-col justify-between min-h-[110px] ${
													isSelected
														? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20"
														: "border-[var(--line)] bg-[var(--paper)] hover:border-slate-300 dark:hover:border-slate-600"
												}`}
											>
												<div>
													<div className="flex items-center justify-between">
														<span className="text-sm font-bold text-[var(--ink)]">
															{proto.title}
														</span>
														<span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--ink)]">
															{proto.primaryService.priceRub.toLocaleString("ru-RU")} ₽
														</span>
													</div>
													<p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-relaxed">
														{proto.description}
													</p>
												</div>

												<div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] pt-2 border-t border-[var(--line-subtle)] mt-2">
													<span>Код: {proto.primaryService.code}</span>
													<span>{proto.durationMinutes} мин</span>
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Consumables Summary */}
							<div className="p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs space-y-1">
								<div className="font-semibold text-[var(--ink)] flex items-center justify-between">
									<span>Пакетное списание расходников (Soft Negative Stock):</span>
									<span className="text-emerald-700 dark:text-emerald-400 font-medium">100% автономия</span>
								</div>
								<div className="flex flex-wrap gap-1.5 pt-1">
									{selectedProtocol.consumables.map((item, idx) => (
										<span
											key={idx}
											className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-[var(--ink-muted)] text-[11px]"
										>
											{item}
										</span>
									))}
								</div>
							</div>
						</>
					) : (
						<>
							{/* Home Care Section */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
										Профиль пациента
									</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
									{HOME_CARE_PLANS.map((plan) => {
										const isSelected = selectedCarePlan.id === plan.id;
										return (
											<button
												key={plan.id}
												type="button"
												data-testid={`hygiene-homecare-tab-${plan.id}`}
												onClick={() => setSelectedCarePlan(plan)}
												className={`p-3 text-left rounded-xl border transition-all ${
													isSelected
														? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20"
														: "border-[var(--line)] bg-[var(--paper)]"
												}`}
											>
												<div className="font-bold text-xs sm:text-sm text-[var(--ink)]">
													{plan.label}
												</div>
												<p className="text-[11px] text-[var(--ink-muted)] mt-1 line-clamp-2">
													{plan.description}
												</p>
											</button>
										);
									})}
								</div>
							</div>

							{/* Prescribed Items Details */}
							<div className="space-y-2.5 bg-[var(--paper)] p-4 rounded-xl border border-[var(--line)] text-xs">
								<div className="flex justify-between items-start pb-2 border-b border-[var(--line-subtle)]">
									<span className="font-bold text-[var(--ink)] text-sm">Индивидуальный набор средств:</span>
									<span className="text-teal-700 dark:text-teal-400 font-semibold">
										Контрольный осмотр: через {selectedCarePlan.recallMonths} мес.
									</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
									<div>
										<span className="font-semibold text-teal-800 dark:text-teal-300">1. Зубная щетка:</span>
										<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.toothbrush}</p>
									</div>
									<div>
										<span className="font-semibold text-teal-800 dark:text-teal-300">2. Монопучковая щетка:</span>
										<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.monotuft}</p>
									</div>
									<div>
										<span className="font-semibold text-teal-800 dark:text-teal-300">3. Ершики и флосс:</span>
										<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.interdental}</p>
									</div>
									<div>
										<span className="font-semibold text-teal-800 dark:text-teal-300">4. Зубная паста:</span>
										<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.toothpaste}</p>
									</div>
									<div className="sm:col-span-2">
										<span className="font-semibold text-teal-800 dark:text-teal-300">5. Ирригатор:</span>
										<p className="text-[var(--ink-muted)] mt-0.5">{selectedCarePlan.irrigator}</p>
									</div>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Floating Bottom Bar / Actions (Mandate 8am: Exactly ONE Primary CTA) */}
				<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-2.5">
					<div className="flex items-center gap-2">
						<button
							type="button"
							data-testid="hygiene-print-memo-btn"
							onClick={handlePrint}
							className="px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--line)] text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors min-h-[44px]"
						>
							Печать памятки А4
						</button>
						<button
							type="button"
							data-testid="hygiene-copy-memo-btn"
							onClick={handleCopyMemo}
							className="px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--line)] text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors min-h-[44px] hidden sm:inline-flex"
						>
							Копировать текст
						</button>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors min-h-[44px]"
						>
							Отмена
						</button>

						{/* Primary CTA (Exactly ONE, color #0d9488, NEVER disabled) */}
						<button
							type="button"
							data-testid="hygiene-commit-protocol-btn"
							onClick={handleCommit}
							className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-sm transition-all min-h-[44px] flex items-center justify-center gap-1.5"
						>
							{isSubmitting ? "Фиксация..." : "✓ Зафиксировать протокол гигиены"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

HygieneStudioModal.displayName = "HygieneStudioModal";
export default HygieneStudioModal;
