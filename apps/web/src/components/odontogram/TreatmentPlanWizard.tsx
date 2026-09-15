import React, { useMemo, useState, useCallback } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	Coins,
	FileText,
	Layers,
	Printer,
	Receipt,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { kopecksToNumericString } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import type { ToothData } from "./ToothChart";
import {
	calculateLiveInvoiceItems,
	type LiveInvoiceItem,
	ORDER_804N_PROCEDURES,
} from "./OdontogramLiveInvoice";
import { isDeciduousTooth } from "../treatment-plans/treatmentPlanStagesEngine";

export interface TreatmentPlanWizardProps {
	isOpen: boolean;
	onClose: () => void;
	teethData: readonly ToothData[];
	patientId?: string | undefined;
	patientName?: string | undefined;
	onPlanCreated?: ((planId: string, totalRub: number) => void) | undefined;
	initialDiscountPercent?: number | undefined;
	className?: string | undefined;
}

export interface WizardStageGroup {
	stageNumber: 1 | 2 | 3;
	stageTitle: string;
	stageKind: "therapy" | "surgery" | "orthopedics";
	items: LiveInvoiceItem[];
	totalRub: number;
	totalKopecks: number;
}

export const TreatmentPlanWizard: React.FC<TreatmentPlanWizardProps> = ({
	isOpen,
	onClose,
	teethData,
	patientId,
	patientName,
	onPlanCreated,
	initialDiscountPercent = 0,
	className = "",
}) => {
	const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [planTitle, setPlanTitle] = useState("План санации полости рта (из одонтограммы)");
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(initialDiscountPercent);

	// Extract all live invoice items from pathologies
	const rawItems = useMemo(() => {
		return calculateLiveInvoiceItems(teethData);
	}, [teethData]);

	// Filter out dismissed items
	const activeItems = useMemo(() => {
		return rawItems.filter((it) => !excludedKeys.has(`${it.toothNumber}-${it.code}`));
	}, [rawItems, excludedKeys]);

	// Group into clinical 3 stages (Therapy / Surgery / Orthopedics)
	const stageGroups: WizardStageGroup[] = useMemo(() => {
		const therapyItems: LiveInvoiceItem[] = [];
		const surgeryItems: LiveInvoiceItem[] = [];
		const orthoItems: LiveInvoiceItem[] = [];

		for (const it of activeItems) {
			const cat = it.category.toLowerCase();
			if (cat.includes("ортопед") || cat.includes("протез") || it.code.startsWith("A16.07.004")) {
				orthoItems.push(it);
			} else if (
				cat.includes("хирург") ||
				cat.includes("имплант") ||
				it.code.startsWith("A16.07.001") ||
				it.code.startsWith("A16.07.006")
			) {
				surgeryItems.push(it);
			} else {
				therapyItems.push(it);
			}
		}

		const calcStageTotalKopecks = (items: LiveInvoiceItem[]) =>
			items.reduce((acc, it) => {
				const grossKop = Math.round(it.price * it.quantity * 100);
				const discKop = Math.round((grossKop * doctorDiscountPercent) / 100);
				return acc + Math.max(0, grossKop - discKop);
			}, 0);

		const g1Kop = calcStageTotalKopecks(therapyItems);
		const g2Kop = calcStageTotalKopecks(surgeryItems);
		const g3Kop = calcStageTotalKopecks(orthoItems);

		return [
			{
				stageNumber: 1,
				stageTitle: "Этап I: Терапевтическая санация и эндодонтия",
				stageKind: "therapy",
				items: therapyItems,
				totalKopecks: g1Kop,
				totalRub: Math.round(g1Kop / 100),
			},
			{
				stageNumber: 2,
				stageTitle: "Этап II: Хирургия и дентальная имплантация",
				stageKind: "surgery",
				items: surgeryItems,
				totalKopecks: g2Kop,
				totalRub: Math.round(g2Kop / 100),
			},
			{
				stageNumber: 3,
				stageTitle: "Этап III: Ортопедическая реабилитация",
				stageKind: "orthopedics",
				items: orthoItems,
				totalKopecks: g3Kop,
				totalRub: Math.round(g3Kop / 100),
			},
		];
	}, [activeItems, doctorDiscountPercent]);

	// Calculate total price in whole kopecks (Mandate 8b)
	const totalKopecks = useMemo(() => {
		return activeItems.reduce((acc, it) => {
			const grossKop = Math.round(it.price * it.quantity * 100);
			const discKop = Math.round((grossKop * doctorDiscountPercent) / 100);
			return acc + Math.max(0, grossKop - discKop);
		}, 0);
	}, [activeItems, doctorDiscountPercent]);

	const totalRub = Math.round(totalKopecks / 100);

	const handleToggleExclude = (itemKey: string) => {
		setExcludedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(itemKey)) next.delete(itemKey);
			else next.add(itemKey);
			return next;
		});
	};

	const handleCreateDraftPlan = useCallback(async () => {
		setIsSubmitting(true);
		try {
			// Mandate 8e: if no items are selected from pathologies, automatically include
			// standard initial consultation service (0 руб. / 100% скидка) so the doctor is never blocked
			const effectiveItems: LiveInvoiceItem[] =
				activeItems.length > 0
					? activeItems
					: [
							{
								toothNumber: 0,
								code: "A01.07.001",
								title: "Первичный осмотр и консультация врача-стоматолога",
								category: "Терапия",
								price: 0,
								quantity: 1,
							},
						];

			const planItemsForApi = effectiveItems.map((item, idx) => {
				const lineGrossRub = item.price * item.quantity;
				const lineDiscRub = Math.round((lineGrossRub * doctorDiscountPercent) / 100);
				return {
					id: `auto_${item.toothNumber}_${item.code}_${idx}`,
					toothNumber: item.toothNumber,
					priceId: item.code,
					name: item.title,
					quantity: item.quantity,
					price: item.price,
					discount: lineDiscRub,
					phase:
						item.category.toLowerCase().includes("ортопед") || item.code.startsWith("A16.07.004")
							? 3
							: item.category.toLowerCase().includes("хирург") ||
								  item.category.toLowerCase().includes("имплант") ||
								  item.code.startsWith("A16.07.001") ||
								  item.code.startsWith("A16.07.006")
								? 2
								: 1,
					isAuto: true,
				};
			});

			const effectiveTotalKopecks = effectiveItems.reduce((acc, it) => {
				const grossKop = Math.round(it.price * it.quantity * 100);
				const discKop = Math.round((grossKop * doctorDiscountPercent) / 100);
				return acc + Math.max(0, grossKop - discKop);
			}, 0);
			const effectiveTotalRub = Math.round(effectiveTotalKopecks / 100);

			if (patientId) {
				const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						name: planTitle,
						patientSignature: null,
						items: planItemsForApi,
					}),
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Ошибка сохранения плана на сервере");
				}

				const result = await res.json().catch(() => null);
				const createdId = result?.planId || result?.plan?.id || `plan_${Date.now()}`;
				onPlanCreated?.(createdId, effectiveTotalRub);
			}

			// Play audio feedback & show success toast
			SoundFeedbackService.getInstance().playActionSuccess();
			if (activeItems.length === 0) {
				showToast(
					"Создан базовый план лечения с первичным осмотром и консультацией врача-стоматолога (0 ₽)",
					"success",
					5000,
				);
			} else {
				showToast(
					`Черновик плана лечения успешно создан: ${activeItems.length} услуг на сумму ${effectiveTotalRub.toLocaleString("ru-RU")} ₽`,
					"success",
					5000,
				);
			}

			// Dispatch reload event for connected modules
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-treatment-plans-reload", {
						detail: { patientId },
					}),
				);
			}

			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось создать план";
			showToast(msg, "error", 5000);
		} finally {
			setIsSubmitting(false);
		}
	}, [activeItems, doctorDiscountPercent, patientId, planTitle, onPlanCreated, onClose]);

	const handlePrintEstimate = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-plan-wizard-title"
			data-testid="treatment-plan-wizard-modal"
		>
			<div
				className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 shadow-2xl overflow-hidden text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-100 ${className}`.trim()}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-950">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/25">
							<Sparkles size={20} />
						</div>
						<div>
							<h2
								id="treatment-plan-wizard-title"
								className="text-base font-black tracking-tight"
							>
								Смета плана лечения по патологиям (804н)
							</h2>
							<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
								{patientName ? `Пациент: ${patientName} • ` : ""}
								Автоматический сбор всех выявленных кариозных и эндодонтических находок в 1 клик
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-w-[44px] min-h-[44px] sm:min-h-[32px] flex items-center justify-center rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="wizard-close-btn"
					>
						<X size={18} />
					</button>
				</div>

				{/* Summary Overview Bar */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-indigo-500/5 dark:bg-indigo-950/20 border-b border-indigo-500/15 text-xs">
					<div>
						<span className="text-[var(--odontogram-ink-muted,#64748b)] font-bold block">
							Позиций к лечению
						</span>
						<span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
							{activeItems.length} услуг ({activeItems.reduce((acc, it) => acc + it.quantity, 0)} ед.)
						</span>
					</div>
					<div>
						<span className="text-[var(--odontogram-ink-muted,#64748b)] font-bold block">
							Зубов в плане
						</span>
						<span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
							{new Set(activeItems.map((it) => it.toothNumber)).size} зубов
						</span>
					</div>
					<div>
						<span className="text-[var(--odontogram-ink-muted,#64748b)] font-bold block">
							Этапов плана
						</span>
						<span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
							{stageGroups.filter((g) => g.items.length > 0).length} из 3 этапов
						</span>
					</div>
					<div>
						<span className="text-[var(--odontogram-ink-muted,#64748b)] font-bold block">
							Предварительный итог
						</span>
						<span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
							{totalRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* Plan Title & Doctor Discount Bar (Mandate 8e: Doctor Autonomy) */}
				<div className="px-5 py-2.5 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
					<div className="flex-1 flex items-center gap-2 min-w-[240px]">
						<span className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] shrink-0">
							Название плана:
						</span>
						<input
							type="text"
							value={planTitle}
							onChange={(e) => setPlanTitle(e.target.value)}
							className="flex-1 min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-zinc-800 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
							placeholder="Название плана лечения..."
						/>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<label htmlFor="wizard-doctor-discount" className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] shrink-0 flex items-center gap-1">
							<Coins size={14} className="text-amber-500" />
							<span>Скидка врача:</span>
						</label>
						<div className="flex items-center gap-1">
							<input
								id="wizard-doctor-discount"
								type="number"
								min={0}
								max={100}
								value={doctorDiscountPercent === 0 ? "" : doctorDiscountPercent}
								onChange={(e) => {
									const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
									setDoctorDiscountPercent(val);
								}}
								placeholder="0"
								className="w-16 min-h-[36px] px-2 py-1 text-center font-mono font-black text-xs rounded-lg bg-[var(--paper,#ffffff)] dark:bg-zinc-800 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/50 outline-none"
								data-testid="wizard-doctor-discount-input"
							/>
							<span className="text-xs font-bold text-zinc-500">%</span>
							<button
								type="button"
								onClick={() => setDoctorDiscountPercent(100)}
								className="min-h-[32px] px-2 py-1 text-[10px] font-black rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer"
								title="Гарантийная переделка 100%"
								data-testid="wizard-discount-100-btn"
							>
								100% (Гарантия)
							</button>
						</div>
					</div>
				</div>

				{/* Body Content: Staged Breakdown Tables */}
				<div className="flex-1 overflow-y-auto p-5 space-y-5">
					{activeItems.length === 0 ? (
						<div className="py-12 text-center text-[var(--odontogram-ink-muted,#64748b)] space-y-2">
							<Activity size={32} className="mx-auto text-zinc-400 opacity-60" />
							<p className="font-bold text-sm">В зубной формуле нет активных патологий</p>
							<p className="text-xs max-w-md mx-auto">
								Все зубы отмечены как интактные или санированные. Если у пациента есть кариес или пульпит, отметьте их штампом или через контекстное меню зуба.
							</p>
						</div>
					) : (
						stageGroups
							.filter((group) => group.items.length > 0)
							.map((group) => (
								<div
									key={group.stageNumber}
									className="rounded-xl border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 overflow-hidden shadow-2xs"
								>
									{/* Stage Header */}
									<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-950 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800">
										<div className="flex items-center gap-2">
											<Layers size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
											<span className="text-xs font-black tracking-wide">
												{group.stageTitle}
											</span>
											<span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-bold">
												{group.items.length} услуг
											</span>
										</div>
										<span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
											{group.totalRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>

									{/* Table of Items wrapped in overflow-x-auto for mobile responsiveness (390px) */}
									<div className="w-full overflow-x-auto">
										<table className="w-full text-left text-xs border-collapse min-w-[540px]">
											<thead>
												<tr className="border-b border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 bg-[var(--paper,#ffffff)] dark:bg-zinc-900 text-[10px] uppercase font-bold text-[var(--odontogram-ink-muted,#64748b)]">
													<th className="py-2 px-3 w-14">Зуб</th>
													<th className="py-2 px-3 w-28">Код 804н</th>
													<th className="py-2 px-3">Наименование услуги</th>
													<th className="py-2 px-3 w-16 text-center">Кол-во</th>
													<th className="py-2 px-3 w-24 text-right">Цена</th>
													<th className="py-2 px-3 w-28 text-right">Сумма</th>
													<th className="py-2 px-2 w-10 text-center"></th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--odontogram-border-subtle,#e2e8f0)] dark:divide-zinc-800">
												{group.items.map((item, idx) => {
													const itemKey = `${item.toothNumber}-${item.code}`;
													const lineGrossRub = item.price * item.quantity;
													const lineDiscRub = Math.round((lineGrossRub * doctorDiscountPercent) / 100);
													const lineTotalRub = Math.max(0, lineGrossRub - lineDiscRub);
													return (
														<tr
															key={`${itemKey}-${idx}`}
															className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
														>
															<td className="py-2 px-3 font-mono font-black text-indigo-700 dark:text-indigo-400">
																#{item.toothNumber}
															</td>
															<td className="py-2 px-3 font-mono text-[11px] text-[var(--odontogram-ink-muted,#64748b)]">
																{item.code}
															</td>
															<td className="py-2 px-3 font-semibold text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-200">
																{item.title}
															</td>
															<td className="py-2 px-3 text-center font-mono font-bold">
																{item.quantity}
															</td>
															<td className="py-2 px-3 text-right font-mono text-[var(--odontogram-ink-muted,#64748b)]">
																{item.price.toLocaleString("ru-RU")} ₽
															</td>
															<td className="py-2 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400">
																{lineTotalRub.toLocaleString("ru-RU")} ₽
																{doctorDiscountPercent > 0 && (
																	<span className="block text-[10px] text-zinc-400 line-through font-normal">
																		{lineGrossRub.toLocaleString("ru-RU")} ₽
																	</span>
																)}
															</td>
															<td className="py-2 px-2 text-center">
																<button
																	type="button"
																	onClick={() => handleToggleExclude(itemKey)}
																	className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
																	title="Исключить строку из плана"
																	data-testid={`exclude-item-${item.toothNumber}`}
																>
																	<Trash2 size={13} />
																</button>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>
							))
					)}
				</div>

				{/* Footer Controls */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-950">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrintEstimate}
							className="min-h-[44px] sm:min-h-[32px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
							data-testid="wizard-print-estimate-btn"
						>
							<Printer size={14} />
							<span>Печать сметы</span>
						</button>
					</div>

					<div className="flex items-center gap-3 w-full sm:w-auto justify-end">
						<div className="text-right mr-2 hidden sm:block">
							<span className="text-[11px] text-[var(--odontogram-ink-muted,#64748b)] block font-bold">
								Итого к согласованию:
							</span>
							<span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
								{totalRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<button
							type="button"
							onClick={handleCreateDraftPlan}
							disabled={isSubmitting}
							title="Создать черновик комплексного плана лечения"
							className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[32px] sm:min-h-[38px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
							data-testid="btn-create-treatment-plan"
						>
							<Check size={16} />
							<span>{isSubmitting ? "Сохранение..." : "Создать черновик плана"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
