/**
 * apps/web/src/components/clinical/SomaticSafetyAlertWidget.tsx
 *
 * Canonical Chairside Somatic Safety Alerts & Dental Stop-Factors Widget.
 *
 * CONSTITUTIONAL MANDATES:
 * - Mandate 8e: Doctor Autonomy (0-click physiological norm by default, 0 disabled buttons, doctor edits pathology only).
 * - Mandate 8i: Ambulatory Dental Context (5 critical dental stop-factors:
 *   1. Local anesthetics (Articaine, Lidocaine) & antibiotics (Penicillins) allergy
 *   2. Cardiovascular risks (hypertensive crisis in anamnesis, infarct < 6 mo -> strict ban on Epinephrine 1:100 000, Mepivacaine 3% plain rec)
 *   3. Anticoagulants & antiplatelets (Warfarin, Xarelto, Eliquis, Thrombo ASS -> profuse bleeding risk, hemostatic sponge & sutures rec)
 *   4. Bisphosphonates (Zometa, Fosamax -> osteonecrosis MRONJ / БОНЧ risk during extraction/implants)
 *   5. Decompensated diabetes / Pregnancy (trimester-specific guidance, gentle anesthesia)
 * - Mandate 8k: Friction-Killer Law (0-click norm by default, 1-click sync to Form 043/u).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis, strictly Lucide vector icons).
 */

import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Baby,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Copy,
	FileText,
	HeartPulse,
	Pill,
	ShieldAlert,
	ShieldCheck,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	type SomaticSafetyEvaluation,
	type SomaticSafetyInput,
	type SomaticStopFactor,
	applySomaticNorm,
	evaluateSomaticSafety,
} from "@dental/shared";

export interface SomaticSafetyAlertWidgetProps {
	/** Patient record or safety profile input */
	readonly patient?: SomaticSafetyInput | string | null | undefined;
	/** Optional allergy text override (e.g. from activePatientAllergyText) */
	readonly allergyText?: string | null | undefined;
	/** Callback when doctor applies/confirms 1-click physiological norm */
	readonly onApplyNorm?: ((updatedDiarySnippet: string) => void) | undefined;
	/** Callback when doctor syncs stop-factors warning snippet into Form 043/u diary */
	readonly onSyncToDiary?: ((diarySnippet: string) => void) | undefined;
	/** Callback to open full anamnesis modal */
	readonly onOpenAnamnesisModal?: (() => void) | undefined;
	/** Presentation variant */
	readonly variant?: "header" | "card" | "inline";
	/** Additional styling classes */
	readonly className?: string;
}

export const SomaticSafetyAlertWidget: React.FC<SomaticSafetyAlertWidgetProps> = React.memo(
	({
		patient,
		allergyText,
		onApplyNorm,
		onSyncToDiary,
		onOpenAnamnesisModal,
		variant = "header",
		className = "",
	}) => {
		const [isPopoverOpen, setIsPopoverOpen] = useState(false);
		const popoverRef = useRef<HTMLDivElement | null>(null);
		const triggerRef = useRef<HTMLButtonElement | null>(null);

		// Evaluate safety through canonical engine
		const evaluation: SomaticSafetyEvaluation = useMemo(() => {
			return evaluateSomaticSafety(patient, allergyText);
		}, [patient, allergyText]);

		// Close popover on outside click or Esc
		useEffect(() => {
			if (!isPopoverOpen) return;

			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					setIsPopoverOpen(false);
					triggerRef.current?.focus();
				}
			};

			const handleClickOutside = (e: MouseEvent) => {
				if (
					popoverRef.current &&
					!popoverRef.current.contains(e.target as Node) &&
					triggerRef.current &&
					!triggerRef.current.contains(e.target as Node)
				) {
					setIsPopoverOpen(false);
				}
			};

			document.addEventListener("keydown", handleKeyDown);
			document.addEventListener("mousedown", handleClickOutside);

			return () => {
				document.removeEventListener("keydown", handleKeyDown);
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}, [isPopoverOpen]);

		// 1-Click Physiological Norm Handler (Mandates 8e, 8k)
		const handleApplyNormClick = useCallback(
			(e?: React.MouseEvent) => {
				e?.stopPropagation();
				setIsPopoverOpen(false);
				const normProfile = applySomaticNorm(
					typeof patient === "object" ? patient : null,
				);
				const evalNorm = evaluateSomaticSafety(normProfile);
				if (onApplyNorm) {
					onApplyNorm(evalNorm.diary043uSnippet);
				}
				showToast(
					"Применена норма: соматически здоров (1 клик)",
					"success",
					3000,
				);
			},
			[patient, onApplyNorm],
		);

		// 1-Click Sync to Form 043/u Diary
		const handleSyncToDiaryClick = useCallback(
			(e?: React.MouseEvent) => {
				e?.stopPropagation();
				const snippet = evaluation.diary043uSnippet;
				if (onSyncToDiary) {
					onSyncToDiary(snippet);
				}
				if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
					navigator.clipboard.writeText(snippet).catch(() => {});
				}
				showToast(
					"Стоп-факторы и рекомендации скопированы для Формы 043/у",
					"success",
					3000,
				);
			},
			[evaluation.diary043uSnippet, onSyncToDiary],
		);

		// Render icon based on stop factor category
		const renderFactorCategoryIcon = (category: SomaticStopFactor["category"]) => {
			switch (category) {
				case "allergy":
					return <Pill size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />;
				case "cardiovascular":
					return <HeartPulse size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />;
				case "anticoagulants":
					return <Activity size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />;
				case "bisphosphonates":
					return <AlertTriangle size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />;
				case "diabetes_pregnancy":
					return <Baby size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />;
				default:
					return <ShieldAlert size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />;
			}
		};

		// =====================================================================================================
		// 1. ПОЛОЖЕНИЕ НОРМЫ (0-КЛИК «СОМАТИЧЕСКИ ЗДОРОВ / НОРМА») — ПО УМОЛЧАНИЮ БЕЗ ШУМА
		// =====================================================================================================
		if (evaluation.isHealthyNorm) {
			return (
				<button
					type="button"
					ref={triggerRef}
					onClick={handleApplyNormClick}
					data-testid="btn-somatic-norm-one-click"
					className={`secondary-button h-7 min-h-[28px] sm:min-h-0 sm:h-7 px-2 sm:px-2.5 py-0 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg select-none ${className}`}
					title="Соматически здоров / норма (1-клик): зафиксировать норму во всех показателях и перенести в дневник 043/у"
					aria-label="Соматически здоров / норма (1-клик)"
				>
					<Check
						className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
						aria-hidden="true"
					/>
					<span className="hidden 2xl:inline">Соматически здоров / норма</span>
					<span className="hidden sm:inline 2xl:hidden">Норма 043/у</span>
					<span className="sm:hidden">Норма</span>
				</button>
			);
		}

		// =====================================================================================================
		// 2. АКТИВНЫЕ СТОП-ФАКТОРЫ: СПОКОЙНЫЙ ЗАМЕТНЫЙ БЕЙДЖ + РАЗВОРАЧИВАЕМАЯ ПОДСКАЗКА ДЛЯ ВРАЧА
		// =====================================================================================================
		const hasAllergy = evaluation.stopFactors.some((f) => f.category === "allergy");
		const hasCvd = evaluation.stopFactors.some((f) => f.category === "cardiovascular");
		const hasAnticoagulant = evaluation.stopFactors.some(
			(f) => f.category === "anticoagulants",
		);
		const hasBisphosphonates = evaluation.stopFactors.some(
			(f) => f.category === "bisphosphonates",
		);
		const hasPregnancy = evaluation.stopFactors.some(
			(f) => f.category === "diabetes_pregnancy" && f.testId.includes("pregnancy"),
		);
		const hasDiabetes = evaluation.stopFactors.some(
			(f) => f.category === "diabetes_pregnancy" && f.testId.includes("diabetes"),
		);

		return (
			<div className={`relative inline-flex items-center shrink-0 ${className}`}>
				{/* Основной спокойный бейдж в шапке */}
				<button
					type="button"
					ref={triggerRef}
					onClick={() => setIsPopoverOpen((prev) => !prev)}
					data-testid="somatic-safety-alert-badge"
					className="inline-flex items-center gap-1 sm:gap-1.5 h-7 min-h-[28px] sm:min-h-0 sm:h-7 px-2 sm:px-2.5 py-0 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-100 font-semibold text-xs shadow-xs hover:bg-rose-100/90 dark:hover:bg-rose-900/60 transition-all cursor-pointer select-none shrink-0"
					aria-expanded={isPopoverOpen}
					aria-haspopup="dialog"
					title={evaluation.primaryAlertBadge.title}
				>
					<AlertOctagon
						size={14}
						className="text-rose-600 dark:text-rose-400 shrink-0"
						aria-hidden="true"
					/>

					{/* Маркировка ключевых тестовых идентификаторов для обратной совместимости тестов */}
					{hasAllergy && (
						<span
							data-testid="visit-focus-allergy-alert"
							className="sr-only"
							aria-hidden="true"
						>
							visit-focus-allergy-alert
						</span>
					)}
					{hasCvd && (
						<span
							data-testid="visit-focus-cvd-alert"
							className="sr-only"
							aria-hidden="true"
						>
							visit-focus-cvd-alert
						</span>
					)}
					{hasAnticoagulant && (
						<span
							data-testid="visit-focus-anticoagulant-alert"
							className="sr-only"
							aria-hidden="true"
						>
							visit-focus-anticoagulant-alert
						</span>
					)}
					{hasBisphosphonates && (
						<span
							data-testid="visit-focus-bisphosphonates-alert"
							className="sr-only"
							aria-hidden="true"
						>
							visit-focus-bisphosphonates-alert
						</span>
					)}
					{hasPregnancy && (
						<span
							data-testid="visit-focus-pregnancy-alert"
							className="sr-only"
							aria-hidden="true"
						>
							visit-focus-pregnancy-alert
						</span>
					)}
					{hasDiabetes && (
						<span
							data-testid="visit-focus-diabetes-alert"
							className="sr-only"
							aria-hidden="true"
						>
							visit-focus-diabetes-alert
						</span>
					)}

					{/* Текст бейджа */}
					<span className="sm:hidden font-bold text-[11px] whitespace-nowrap">
						{evaluation.primaryAlertBadge.shortLabel}
					</span>
					<span className="hidden sm:inline font-bold whitespace-nowrap truncate max-w-[280px] xl:max-w-[420px]">
						{evaluation.primaryAlertBadge.fullLabel}
					</span>

					{/* Индикатор раскрытия */}
					{isPopoverOpen ? (
						<ChevronUp size={13} className="text-rose-700 dark:text-rose-300 shrink-0" />
					) : (
						<ChevronDown size={13} className="text-rose-700 dark:text-rose-300 shrink-0" />
					)}
				</button>

				{/* 1-клик кнопка нормы рядом с бейджем (для автономии врача у кресла) */}
				<button
					type="button"
					onClick={handleApplyNormClick}
					data-testid="btn-somatic-norm-one-click"
					className="secondary-button h-7 min-h-[28px] sm:min-h-0 sm:h-7 px-1.5 sm:px-2 py-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 ml-1 items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg hidden md:inline-flex"
					title="Снять стоп-факторы и подтвердить норму (1-клик)"
					aria-label="Подтвердить норму"
				>
					<Check size={13} className="text-emerald-600 dark:text-emerald-400" />
					<span className="hidden xl:inline">Норма</span>
				</button>

				{/* Разворачиваемая подсказка для врача (Chairside Guidance Popover / Drawer) */}
				{isPopoverOpen && (
					<div
						ref={popoverRef}
						data-testid="somatic-safety-alert-popover"
						role="dialog"
						aria-label="Стоматологические стоп-факторы у кресла"
						className="absolute left-0 top-full mt-1.5 w-[360px] sm:w-[460px] max-w-[95vw] rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-[var(--ink)] shadow-2xl z-50 flex flex-col gap-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
					>
						{/* Заголовок панели подсказки */}
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
							<div className="flex items-center gap-1.5">
								<ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
								<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
									Стоп-факторы у кресла ({evaluation.stopFactors.length})
								</span>
							</div>
							<button
								type="button"
								onClick={() => setIsPopoverOpen(false)}
								className="text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-md p-1 transition-colors cursor-pointer"
								aria-label="Закрыть подсказку"
							>
								<X size={14} />
							</button>
						</div>

						{/* Список активных стоп-факторов с четкими запретами и рекомендациями */}
						<div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-0.5">
							{evaluation.stopFactors.map((factor) => (
								<div
									key={factor.id}
									className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]"
								>
									{/* Шапка фактора */}
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
											{renderFactorCategoryIcon(factor.category)}
											<span>{factor.title}</span>
										</div>
										<span
											className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
												factor.severity === "critical"
													? "bg-rose-600/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
													: "bg-amber-600/15 text-amber-700 dark:text-amber-300 border border-amber-500/40"
											}`}
										>
											{factor.severity === "critical" ? "КРИТИЧНО" : "ВНИМАНИЕ"}
										</span>
									</div>

									{/* Выявленные элементы */}
									{factor.detectedItems.length > 0 && (
										<div className="text-[11px] text-[var(--ink-muted)] font-medium">
											Выявлено: <span className="text-[var(--ink)] font-semibold">{factor.detectedItems.join(", ")}</span>
										</div>
									)}

									{/* Жесткие запреты */}
									{factor.prohibitions.length > 0 && (
										<div className="flex flex-col gap-0.5 mt-0.5">
											<span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
												Запрещено:
											</span>
											<ul className="list-disc list-inside text-xs text-rose-900 dark:text-rose-200 space-y-0.5 pl-0.5">
												{factor.prohibitions.map((p, idx) => (
													// biome-ignore lint/suspicious/noArrayIndexKey: fixed prohibition item
													<li key={idx} className="leading-tight">
														{p}
													</li>
												))}
											</ul>
										</div>
									)}

									{/* Клинические рекомендации у кресла */}
									{factor.recommendations.length > 0 && (
										<div className="flex flex-col gap-0.5 mt-0.5">
											<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
												Рекомендация у кресла:
											</span>
											<ul className="list-disc list-inside text-xs text-[var(--ink)] space-y-0.5 pl-0.5">
												{factor.recommendations.map((r, idx) => (
													// biome-ignore lint/suspicious/noArrayIndexKey: fixed recommendation item
													<li key={idx} className="leading-tight">
														{r}
													</li>
												))}
											</ul>
										</div>
									)}
								</div>
							))}
						</div>

						{/* Панель быстрых действий (1-клик в дневник, подтвердить норму, анкета) */}
						<div className="flex items-center justify-between gap-1.5 border-t border-[var(--line)] pt-2 flex-wrap">
							<div className="flex items-center gap-1.5">
								{/* В дневник 043/у */}
								<button
									type="button"
									onClick={handleSyncToDiaryClick}
									data-testid="btn-somatic-copy-diary"
									className="secondary-button h-7 px-2 text-xs font-medium flex items-center gap-1 cursor-pointer rounded-md text-sky-700 dark:text-sky-300 border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-950/30"
									title="Скопировать предупреждения и рекомендации в дневник 043/у"
								>
									<Copy size={12} className="shrink-0" />
									<span>В дневник 043/у</span>
								</button>

								{/* Анкета здоровья */}
								{onOpenAnamnesisModal && (
									<button
										type="button"
										onClick={() => {
											setIsPopoverOpen(false);
											onOpenAnamnesisModal();
										}}
										data-testid="btn-somatic-open-modal"
										className="secondary-button h-7 px-2 text-xs font-medium flex items-center gap-1 cursor-pointer rounded-md text-[var(--ink)]"
										title="Редактировать анкету здоровья пациента"
									>
										<FileText size={12} className="shrink-0" />
										<span>Анкета</span>
									</button>
								)}
							</div>

							{/* Подтвердить норму (0-клик) */}
							<button
								type="button"
								onClick={handleApplyNormClick}
								data-testid="btn-somatic-confirm-norm"
								className="secondary-button h-7 px-2 text-xs font-bold flex items-center gap-1 cursor-pointer rounded-md text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
								title="Патология исключена: зафиксировать норму"
							>
								<CheckCircle2 size={12} className="shrink-0" />
								<span>Норма (патология исключена)</span>
							</button>
						</div>
					</div>
				)}
			</div>
		);
	},
);

SomaticSafetyAlertWidget.displayName = "SomaticSafetyAlertWidget";
export default SomaticSafetyAlertWidget;
