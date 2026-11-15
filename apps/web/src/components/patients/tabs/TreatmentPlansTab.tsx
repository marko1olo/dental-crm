/**
 * TreatmentPlansTab.tsx — Интерактивная вкладка планов лечения и 3-уровневых смет в карточке пациента
 *
 * Архитектурные инварианты:
 * 1. 3-Tier альтернативы: «Эконом», «Оптимум» (рекомендация клиники), «Премиум» с мгновенным переключением.
 * 2. Честный Empty State при отсутствии планов: «У пациента нет сохраненных планов лечения» с Primary CTA «+ Составить план лечения».
 * 3. Мандат 8e: Автономия врача — скидки от 0% до 100% без паролей, печать в любой момент (Черновик/Утверждено).
 * 4. Мандат 8x & 8ap: Ноль бюрократического канцелярита и советских приказов.
 * 5. Apple HIG: Сенсорная зона >= 44px, форматирование копеек в рубли, ровно 1 Primary CTA.
 * 6. Мандат 8b: Золотой стандарт размера файла (200-300 строк).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	Plus,
	Printer,
	Sparkles,
	CheckCircle2,
	ChevronRight,
	Percent,
	Calendar,
	CreditCard,
	Copy,
	ClipboardList,
	RefreshCw,
	AlertCircle,
	FolderArchive,
} from "lucide-react";
import type { TreatmentPlanItem } from "@dental/shared";
import { TreatmentPlansList } from "../TreatmentPlansList";
import type { PatientGeneralInfo } from "./PatientGeneralInfoTab";

export type TierCategory = "economy" | "optimum" | "premium";

export interface TreatmentTierOption {
	id: TierCategory;
	title: string;
	tagline: string;
	totalRub: number;
	warrantyYears: number;
	isRecommended?: boolean;
	accentClass: string;
	badgeText: string;
}

export interface PatientTreatmentPlanStageDto {
	id?: string;
	stageOrder: number;
	stageName: string;
	completionPercentage?: number;
}

export interface PatientTreatmentPlanItemDto {
	id: string;
	toothNumber?: number | null;
	priceId?: string;
	name?: string;
	quantity?: number;
	price?: number;
	discount?: number;
	phase?: number;
	status?: string;
	isCompleted?: boolean;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
}

export interface PatientTreatmentPlanDto {
	id: string;
	patientId: string;
	name: string;
	status: string;
	totalPrice: number;
	createdAt: string;
	updatedAt?: string;
	stages?: PatientTreatmentPlanStageDto[];
	items?: PatientTreatmentPlanItemDto[];
	isAlternative?: boolean;
	alternativeTier?: string | null;
	alternativeStatus?: string;
}

export interface TreatmentPlansTabProps {
	patient?: PatientGeneralInfo | null | undefined;
	patientId?: string | undefined;
	items?: TreatmentPlanItem[] | undefined;
	plans?: PatientTreatmentPlanDto[] | undefined;
	tiers?: TreatmentTierOption[] | undefined;
	onOpenPlanPresenter?: ((planId?: string | undefined) => void) | undefined;
	onSendToCheckout?: ((tierId: string, amountRub: number) => void) | undefined;
	onPrintPlan?: ((isDraft: boolean) => void) | undefined;
	className?: string | undefined;
}

export const TreatmentPlansTab: React.FC<TreatmentPlansTabProps> = React.memo(
	function TreatmentPlansTab({
		patient,
		patientId: propPatientId,
		items: propItems = [],
		plans: propPlans = [],
		tiers: propTiers,
		onOpenPlanPresenter,
		onSendToCheckout,
		onPrintPlan,
		className = "",
	}) {
		const effectivePatientId = propPatientId || patient?.id;
		const [loadedPlans, setLoadedPlans] = useState<PatientTreatmentPlanDto[]>(propPlans);
		const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
		const [isLoading, setIsLoading] = useState<boolean>(false);
		const [fetchError, setFetchError] = useState<string | null>(null);
		const [reloadTrigger, setReloadTrigger] = useState<number>(0);

		const [selectedTier, setSelectedTier] = useState<TierCategory>("optimum");
		const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
		const [bonusPointsToUseRub, setBonusPointsToUseRub] = useState<number>(0);
		const [copiedFeedback, setCopiedFeedback] = useState(false);

		// Асинхронная гидратация планов лечения пациента из PostgreSQL 18
		useEffect(() => {
			if (propPlans && propPlans.length > 0) {
				setLoadedPlans(propPlans);
				setSelectedPlanId((prev) => prev ?? propPlans[0]?.id ?? null);
				return;
			}
			if (!effectivePatientId) {
				setIsLoading(false);
				return;
			}

			let isMounted = true;
			setIsLoading(true);
			setFetchError(null);

			fetch(`/api/patients/${effectivePatientId}/treatment-plans`)
				.then(async (res) => {
					if (!res.ok) {
						const altRes = await fetch(`/api/treatment-plans/patient/${effectivePatientId}`);
						if (!altRes.ok) {
							throw new Error(`Ошибка загрузки планов лечения: HTTP ${res.status}`);
						}
						return altRes.json();
					}
					return res.json();
				})
				.then((data: { success?: boolean; plans?: PatientTreatmentPlanDto[] } | PatientTreatmentPlanDto[]) => {
					if (!isMounted) return;
					const fetchedPlans: PatientTreatmentPlanDto[] = Array.isArray((data as { plans?: PatientTreatmentPlanDto[] })?.plans)
						? (data as { plans: PatientTreatmentPlanDto[] }).plans
						: (Array.isArray(data) ? data : []);
					setLoadedPlans(fetchedPlans);
					if (fetchedPlans.length > 0) {
						setSelectedPlanId((prev) => {
							if (prev && fetchedPlans.some((p) => p.id === prev)) return prev;
							return fetchedPlans[0]?.id ?? null;
						});
					}
				})
				.catch((err: unknown) => {
					if (!isMounted) return;
					setFetchError(err instanceof Error ? err.message : "Не удалось загрузить планы лечения");
				})
				.finally(() => {
					if (isMounted) setIsLoading(false);
				});

			return () => {
				isMounted = false;
			};
		}, [effectivePatientId, propPlans, reloadTrigger]);

		const activePlan = useMemo(() => {
			if (loadedPlans.length === 0) return null;
			return loadedPlans.find((p) => p.id === selectedPlanId) || loadedPlans[0] || null;
		}, [loadedPlans, selectedPlanId]);

		// Динамические позиции плана лечения
		const effectiveItems: TreatmentPlanItem[] = useMemo(() => {
			if (propItems && propItems.length > 0) {
				return propItems;
			}
			if (!activePlan || !activePlan.items) return [];

			return activePlan.items.map((it) => {
				const unitPrice = it.price !== undefined ? Number(it.price) : 0;
				const discount = it.discount !== undefined ? Number(it.discount) : 0;
				const quantity = it.quantity || 1;
				const grossCostKopecks = Math.round(unitPrice * quantity * 100);
				const discountKopecks = Math.round(discount * quantity * 100);
				const netCostKopecks = Math.max(0, grossCostKopecks - discountKopecks);

				const itemRecord: unknown = {
					id: it.id,
					planId: activePlan.id,
					toothNumber: it.toothNumber ?? null,
					surfaces: [],
					code804n: it.priceId || "A16.07",
					serviceCode: it.priceId || "A16.07",
					nameRu: it.name || "Услуга плана лечения",
					snapshotServiceName: it.name || "Услуга плана лечения",
					toothCode: it.toothNumber,
					categoryRu: "Терапевтический протокол",
					stageKind: "stage_1_therapy" as const,
					stageNumber: (it.phase as 1 | 2 | 3) || 1,
					tierKey: "optimum" as const,
					unitPriceKopecks: Math.round(unitPrice * 100),
					unitPriceRub: unitPrice,
					quantity,
					grossCostKopecks,
					discountKopecks,
					discountRub: discount,
					netCostKopecks,
					laborKopecks: Math.round(netCostKopecks * 0.6),
					materialsKopecks: Math.round(netCostKopecks * 0.4),
					totalCostKopecks: netCostKopecks,
					status: it.status || (it.isCompleted ? "completed" : "proposed"),
					doctorName: it.doctorName || null,
					doctorSpecialty: it.doctorSpecialty || null,
				};
				return itemRecord as TreatmentPlanItem;
			});
		}, [propItems, activePlan]);

		// Динамический расчет тарифов на основе реальных позиций или переданных тарифов
		const effectiveTiers: TreatmentTierOption[] = useMemo(() => {
			if (propTiers && propTiers.length > 0) {
				return propTiers.map((t) => ({
					...t,
					tagline: t.tagline.replace(/E\.max/gi, "Премиальная безметалловая керамика"),
				}));
			}
			if (effectiveItems && effectiveItems.length > 0) {
				const baseTotal = effectiveItems.reduce(
					(sum, it) => {
						const itAny = it as unknown as { priceRub?: number; unitPriceRub?: number; unitPriceKopecks?: number; quantity?: number };
						const price = itAny.priceRub || itAny.unitPriceRub || (itAny.unitPriceKopecks ? itAny.unitPriceKopecks / 100 : 0);
						return sum + price * (itAny.quantity || 1);
					},
					0,
				);
				const planTitle = activePlan?.name || "Утверждённый план";
				return [
					{
						id: "economy",
						title: "Базовый вариант",
						tagline: "Качественная санация и сертифицированные композитные реставрации",
						totalRub: Math.round(baseTotal * 0.85),
						warrantyYears: 1,
						isRecommended: false,
						accentClass: "border-[var(--line)] bg-[var(--paper-soft)]",
						badgeText: "Эконом",
					},
					{
						id: "optimum",
						title: planTitle,
						tagline: "Согласованный комплекс процедур: цельная пресс-керамика и прецизионный протокол",
						totalRub: baseTotal,
						warrantyYears: 3,
						isRecommended: true,
						accentClass: "border-[var(--teal,var(--brand-primary))] bg-[var(--teal)]/5 ring-1 ring-[var(--teal)]/30",
						badgeText: "Рекомендация клиники",
					},
					{
						id: "premium",
						title: "Премиум VIP",
						tagline: "CAD/CAM индивидуализация, микроскопное лечение и пожизненная остеоинтеграция",
						totalRub: Math.round(baseTotal * 1.35),
						warrantyYears: 10,
						isRecommended: false,
						accentClass: "border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/20",
						badgeText: "Премиум",
					},
				];
			}
			return [];
		}, [propTiers, effectiveItems, activePlan]);

		const hasActivePlans = effectiveTiers.length > 0 || loadedPlans.length > 0;

		const activeTierData = useMemo(() => {
			if (effectiveTiers.length === 0) return null;
			return effectiveTiers.find((t) => t.id === selectedTier) || effectiveTiers[0]!;
		}, [effectiveTiers, selectedTier]);

		const discountedTotalRub = useMemo(() => {
			if (!activeTierData) return 0;
			const base = activeTierData.totalRub;
			const withDiscount = Math.round(base * (1 - doctorDiscountPercent / 100));
			return Math.max(0, withDiscount - bonusPointsToUseRub);
		}, [activeTierData, doctorDiscountPercent, bonusPointsToUseRub]);

		const handleCopyTierSummary = useCallback(() => {
			if (!activeTierData) return;
			const text = `План лечения: «${activeTierData.title}»\nСтоимость: ${discountedTotalRub.toLocaleString("ru-RU")} ₽\nГарантия: ${activeTierData.warrantyYears} года\nКлиника DENTE`;
			if (navigator.clipboard) {
				navigator.clipboard.writeText(text);
				setCopiedFeedback(true);
				setTimeout(() => setCopiedFeedback(false), 2000);
			}
		}, [activeTierData, discountedTotalRub]);

		const handlePrint = useCallback(
			(isDraft: boolean) => {
				if (onPrintPlan) {
					onPrintPlan(isDraft);
				} else {
					window.print();
				}
			},
			[onPrintPlan],
		);

		// Индикатор загрузки планов лечения
		if (isLoading) {
			return (
				<div
					className={`treatment-plans-tab flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--line)] bg-[var(--paper)] ${className}`}
					data-testid="treatment-plans-tab-loading"
				>
					<div className="w-12 h-12 rounded-2xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))] flex items-center justify-center mb-3">
						<RefreshCw className="w-6 h-6 animate-spin text-[var(--teal)]" />
					</div>
					<h3 className="text-sm font-bold text-[var(--ink)] mb-1">
						Загрузка планов лечения...
					</h3>
					<p className="text-xs text-[var(--muted)]">
						Синхронизация с историей приёма и базой данных
					</p>
				</div>
			);
		}

		// Состояние ошибки загрузки с кнопкой повтора
		if (fetchError && loadedPlans.length === 0) {
			return (
				<div
					className={`treatment-plans-tab flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 ${className}`}
					data-testid="treatment-plans-tab-error"
				>
					<div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
						<AlertCircle className="w-6 h-6" />
					</div>
					<h3 className="text-sm font-bold text-[var(--ink)] mb-1">
						Не удалось загрузить планы лечения
					</h3>
					<p className="text-xs text-[var(--muted)] max-w-sm mb-4">
						{fetchError}
					</p>
					<button
						type="button"
						onClick={() => setReloadTrigger((n) => n + 1)}
						className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2 cursor-pointer shadow-xs"
					>
						<RefreshCw className="w-3.5 h-3.5" />
						<span>Повторить попытку</span>
					</button>
				</div>
			);
		}

		// Честный Empty State при отсутствии сохраненных планов
		if (!hasActivePlans) {
			return (
				<div
					className={`treatment-plans-tab flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--line)] bg-[var(--paper)] ${className}`}
					data-testid="treatment-plans-tab-empty"
				>
					<div className="w-14 h-14 rounded-2xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))] flex items-center justify-center mb-4">
						<ClipboardList className="w-7 h-7" />
					</div>
					<h3 className="text-base sm:text-lg font-bold text-[var(--ink)] mb-1">
						У пациента нет сохраненных планов лечения
					</h3>
					<p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mb-6">
						Составьте комплексный план терапии, хирургии или ортопедии с 3 альтернативными сметами для пациента
					</p>
					<button
						type="button"
						onClick={() => {
							if (onOpenPlanPresenter) {
								onOpenPlanPresenter();
							} else if (typeof window !== "undefined") {
								window.location.hash = "#treatment-plan";
							}
						}}
						className="primary-button min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
						data-testid="btn-create-treatment-plan"
					>
						<Plus className="w-4 h-4" />
						<span>+ Составить план лечения</span>
					</button>
				</div>
			);
		}

		return (
			<div
				className={`treatment-plans-tab flex flex-col gap-4 w-full text-[var(--ink)] ${className}`}
				data-testid="treatment-plans-tab"
			>
				{/* 0. СЕЛЕКТОР СОХРАНЕННЫХ ПЛАНОВ ПАЦИЕНТА */}
				{loadedPlans.length > 1 && (
					<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-3 shadow-xs space-y-2">
						<div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium px-1">
							<span>Сохраненные планы пациента ({loadedPlans.length}):</span>
							<button
								type="button"
								onClick={() => {
									if (onOpenPlanPresenter) {
										onOpenPlanPresenter();
									} else if (typeof window !== "undefined") {
										window.location.hash = "#treatment-plan";
									}
								}}
								className="text-[var(--teal)] hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer border-0 bg-transparent text-xs"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>Новый план</span>
							</button>
						</div>
						<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
							{loadedPlans.map((pl) => {
								const isCurrent = pl.id === selectedPlanId;
								const statusMap: Record<string, { label: string; badgeClass: string }> = {
									Approved: { label: "Утверждён", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
									Active: { label: "Активный", badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300" },
									Draft: { label: "Черновик", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
									Completed: { label: "Завершён", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" },
								};
								const currentStatus = statusMap[pl.status] ?? { label: pl.status, badgeClass: "bg-slate-100 text-slate-700" };
								return (
									<button
										key={pl.id}
										type="button"
										onClick={() => setSelectedPlanId(pl.id)}
										className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border text-left shrink-0 transition-all cursor-pointer flex items-center gap-2.5 ${
											isCurrent
												? "border-[var(--teal,var(--brand-primary))] bg-[var(--teal)]/10 text-[var(--ink)] ring-1 ring-[var(--teal)]/40 shadow-xs"
												: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										<div className="flex flex-col">
											<span className="font-bold text-xs truncate max-w-[200px] text-[var(--ink)]">
												{pl.name || "План лечения"}
											</span>
											<span className="text-[10px] text-[var(--muted)]">
												{Number(pl.totalPrice || 0).toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentStatus.badgeClass}`}>
											{currentStatus.label}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				)}
				{/* 1. ВЕРХНИЙ БЛОК: 3-TIER ВЫБОР АЛЬТЕРНАТИВ В 1 КЛИК */}
				{activeTierData && (
					<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 shadow-sm space-y-3">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))]">
									<Sparkles className="w-4 h-4" />
								</div>
								<div>
									<h3 className="text-sm font-bold m-0 text-[var(--ink)]">
										{effectiveTiers.length > 1
											? `Комплексные планы лечения (${effectiveTiers.length} альтернативы)`
											: "План лечения пациента"}
									</h3>
									<p className="text-xs text-[var(--muted)] m-0">
										{effectiveTiers.length > 1
											? "Выбор варианта реабилитации для пациента у кресла"
											: "Согласованная смета этапов лечения"}
									</p>
								</div>
							</div>

							{/* Вспомогательные действия: скидки и копирование */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setIsDiscountsModalOpen(true)}
									className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
									data-testid="btn-open-doctor-discounts"
									title="Скидка врача от 0% до 100%"
								>
									<Percent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
									<span>
										{doctorDiscountPercent > 0 ? `Скидка ${doctorDiscountPercent}%` : "Скидка врача"}
									</span>
								</button>

								<button
									type="button"
									onClick={handleCopyTierSummary}
									className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
									data-testid="btn-copy-plan-summary"
									title="Скопировать смету для мессенджера"
								>
									<Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>{copiedFeedback ? "Скопировано!" : "В мессенджер"}</span>
								</button>
							</div>
						</div>

						{/* Карточки 3-Tier */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="tier-cards-selector">
							{effectiveTiers.map((tier) => {
								const isSelected = selectedTier === tier.id;
								return (
									<div
										key={tier.id}
										onClick={() => setSelectedTier(tier.id)}
										className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${tier.accentClass} ${
											isSelected
												? "ring-2 ring-[var(--teal,var(--brand-primary))] shadow-md"
												: "opacity-80 hover:opacity-100"
										}`}
										data-testid={`tier-option-${tier.id}`}
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<div className="flex items-center gap-1.5">
													<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
														{tier.badgeText}
													</span>
													{tier.isRecommended && (
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--teal)]/15 text-[var(--teal,var(--brand-primary))]">
															Выбор клиники
														</span>
													)}
												</div>
												<h4 className="text-base font-black text-[var(--ink)] m-0 mt-0.5">
													{tier.title}
												</h4>
											</div>
											{isSelected && (
												<CheckCircle2 className="w-5 h-5 text-[var(--teal,var(--brand-primary))] shrink-0" />
											)}
										</div>

										<p className="text-[11px] text-[var(--muted)] m-0 leading-relaxed">
											{tier.tagline}
										</p>

										<div className="pt-2 border-t border-[var(--line)]/50 flex items-baseline justify-between">
											<div className="text-lg font-black text-[var(--ink)]">
												{tier.totalRub.toLocaleString("ru-RU")} ₽
											</div>
											<div className="text-[11px] text-[var(--muted)] font-medium">
												Гарантия {tier.warrantyYears} г.
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* ПАНЕЛЬ ВЫБРАННОГО ПЛАНА С 1 PRIMARY CTA КНОПКОЙ */}
						<div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-[var(--line)]">
							<div className="flex items-center gap-3">
								<div className="text-xs">
									<span className="text-[var(--muted)]">Итоговая смета («{activeTierData.title}»): </span>
									<strong className="text-base text-[var(--ink)] font-black">
										{discountedTotalRub.toLocaleString("ru-RU")} ₽
									</strong>
									{doctorDiscountPercent > 0 && (
										<span className="ml-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
											(-{doctorDiscountPercent}%)
										</span>
									)}
								</div>
							</div>

							{/* Кнопки действий: ровно 1 Primary CTA */}
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => handlePrint(false)}
									className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
									data-testid="btn-print-treatment-plan"
									title="Печать плана лечения в любой момент"
								>
									<Printer className="w-4 h-4 text-[var(--muted)]" />
									<span>Печать сметы</span>
								</button>

								<button
									type="button"
									onClick={() => handlePrint(true)}
									className="min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1 transition-all cursor-pointer"
									data-testid="btn-print-draft-plan"
									title="Печать со штампом ЧЕРНОВИК"
								>
									<span>Черновик</span>
								</button>

								{onSendToCheckout && (
									<button
										type="button"
										onClick={() => onSendToCheckout(selectedTier, discountedTotalRub)}
										className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
										data-testid="btn-send-to-checkout"
										title="Передать смету в кассу для формирования чека"
									>
										<CreditCard className="w-4 h-4 text-[var(--muted)]" />
										<span>В кассу</span>
									</button>
								)}

								{/* ЕДИНСТВЕННЫЙ PRIMARY CTA НА ВИДИМЫЙ КОНТЕКСТ */}
								<button
									type="button"
									onClick={() => {
										if (onOpenPlanPresenter) {
											onOpenPlanPresenter(selectedTier);
										}
									}}
									className="primary-button min-h-[44px] px-5 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
									data-testid="btn-primary-plan-action"
								>
									<Calendar className="w-4 h-4" />
									<span>Открыть презентацию</span>
									<ChevronRight className="w-3.5 h-3.5 opacity-80" />
								</button>
							</div>
						</div>
					</div>
				)}

				{/* 2. НИЖНИЙ БЛОК: ДЕТАЛИЗАЦИЯ ПОЗИЦИЙ ПЛАНА ЛЕЧЕНИЯ */}
				<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 shadow-sm">
					<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
						<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
							Позиции процедур ({effectiveItems.length})
						</h4>
						<button
							type="button"
							onClick={() => onOpenPlanPresenter && onOpenPlanPresenter()}
							className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--teal)]/10 text-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal)]/20 inline-flex items-center gap-1.5 border-0 cursor-pointer"
							data-testid="btn-open-interactive-presenter"
						>
							<Calendar className="w-3.5 h-3.5" />
							<span>Интерактивная студия планов</span>
						</button>
					</div>

					<TreatmentPlansList
						items={effectiveItems}
						onOpenPlan={(planId) => onOpenPlanPresenter && onOpenPlanPresenter(planId)}
						onNewPlanItem={() => onOpenPlanPresenter && onOpenPlanPresenter()}
					/>
				</div>
			</div>
		);
	},
);

TreatmentPlansTab.displayName = "TreatmentPlansTab";
export default TreatmentPlansTab;
